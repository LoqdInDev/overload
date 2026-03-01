const Stripe = require('stripe');
const crypto = require('crypto');
const { db } = require('../db/database');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ── Plan definitions ────────────────────────────────────────────────
const PLANS = {
  manual: {
    name: 'Manual',
    priceMonthly: 4900, // $49/mo in cents
    description: 'For hands-on marketers who want full control',
  },
  copilot: {
    name: 'Copilot',
    priceMonthly: 14900, // $149/mo in cents
    description: 'AI-assisted marketing with smart recommendations',
  },
  autopilot: {
    name: 'Autopilot',
    priceMonthly: 29900, // $299/mo in cents
    description: 'Fully automated marketing on autopilot',
  },
};

const TRIAL_DAYS = 14;

// ── Database initialization ─────────────────────────────────────────
function initBillingTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      workspace_id TEXT,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      plan TEXT NOT NULL DEFAULT 'free',
      status TEXT NOT NULL DEFAULT 'trialing',
      trial_ends_at TEXT,
      current_period_end TEXT,
      cancel_at_period_end INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

// ── Customer management ─────────────────────────────────────────────
async function createCustomer(userId, email, name) {
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: { userId },
  });
  return customer;
}

async function getOrCreateCustomer(userId, email, name) {
  // Check if we already have a Stripe customer for this user
  const existing = db.prepare(
    'SELECT stripe_customer_id FROM subscriptions WHERE user_id = ? AND stripe_customer_id IS NOT NULL LIMIT 1'
  ).get(userId);

  if (existing?.stripe_customer_id) {
    return existing.stripe_customer_id;
  }

  const customer = await createCustomer(userId, email, name);
  return customer.id;
}

// ── Checkout session ────────────────────────────────────────────────
async function createCheckoutSession({ userId, email, displayName, plan, workspaceId, successUrl, cancelUrl }) {
  if (!PLANS[plan]) {
    throw new Error(`Invalid plan: ${plan}`);
  }

  const customerId = await getOrCreateCustomer(userId, email, displayName);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Overload ${PLANS[plan].name}`,
            description: PLANS[plan].description,
          },
          unit_amount: PLANS[plan].priceMonthly,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: { userId, workspaceId: workspaceId || '', plan },
    },
    success_url: successUrl || `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/billing?success=true`,
    cancel_url: cancelUrl || `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/billing?canceled=true`,
    metadata: { userId, workspaceId: workspaceId || '', plan },
  });

  return session;
}

// ── Billing portal ──────────────────────────────────────────────────
async function createBillingPortalSession(customerId, returnUrl) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl || `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/billing`,
  });
  return session;
}

// ── Subscription helpers ────────────────────────────────────────────
function upsertSubscription({ userId, workspaceId, stripeCustomerId, stripeSubscriptionId, plan, status, trialEndsAt, currentPeriodEnd, cancelAtPeriodEnd }) {
  const existing = db.prepare(
    'SELECT id FROM subscriptions WHERE stripe_subscription_id = ?'
  ).get(stripeSubscriptionId);

  if (existing) {
    db.prepare(`
      UPDATE subscriptions SET
        plan = ?, status = ?, trial_ends_at = ?, current_period_end = ?,
        cancel_at_period_end = ?, updated_at = datetime('now')
      WHERE stripe_subscription_id = ?
    `).run(plan, status, trialEndsAt || null, currentPeriodEnd || null, cancelAtPeriodEnd ? 1 : 0, stripeSubscriptionId);
    return existing.id;
  }

  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO subscriptions (id, user_id, workspace_id, stripe_customer_id, stripe_subscription_id, plan, status, trial_ends_at, current_period_end, cancel_at_period_end)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, workspaceId || null, stripeCustomerId, stripeSubscriptionId, plan, status, trialEndsAt || null, currentPeriodEnd || null, cancelAtPeriodEnd ? 1 : 0);
  return id;
}

function getSubscription(userId, workspaceId) {
  if (workspaceId) {
    return db.prepare(
      'SELECT * FROM subscriptions WHERE user_id = ? AND workspace_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(userId, workspaceId);
  }
  return db.prepare(
    'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
  ).get(userId);
}

// ── Webhook event handling ──────────────────────────────────────────
async function handleWebhookEvent(event) {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { userId, workspaceId, plan } = session.metadata;
      if (!userId || !plan) break;

      const subscription = await stripe.subscriptions.retrieve(session.subscription);

      upsertSubscription({
        userId,
        workspaceId: workspaceId || null,
        stripeCustomerId: session.customer,
        stripeSubscriptionId: subscription.id,
        plan,
        status: subscription.status,
        trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const { userId, workspaceId, plan } = subscription.metadata;
      if (!userId) break;

      upsertSubscription({
        userId,
        workspaceId: workspaceId || null,
        stripeCustomerId: subscription.customer,
        stripeSubscriptionId: subscription.id,
        plan: plan || 'unknown',
        status: subscription.status,
        trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const existing = db.prepare(
        'SELECT id FROM subscriptions WHERE stripe_subscription_id = ?'
      ).get(subscription.id);

      if (existing) {
        db.prepare(`
          UPDATE subscriptions SET status = 'canceled', cancel_at_period_end = 0, updated_at = datetime('now')
          WHERE stripe_subscription_id = ?
        `).run(subscription.id);
      }
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      if (invoice.subscription) {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const sub = db.prepare(
          'SELECT id FROM subscriptions WHERE stripe_subscription_id = ?'
        ).get(subscription.id);

        if (sub) {
          db.prepare(`
            UPDATE subscriptions SET status = 'active', current_period_end = ?, updated_at = datetime('now')
            WHERE stripe_subscription_id = ?
          `).run(new Date(subscription.current_period_end * 1000).toISOString(), subscription.id);
        }
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      if (invoice.subscription) {
        db.prepare(`
          UPDATE subscriptions SET status = 'past_due', updated_at = datetime('now')
          WHERE stripe_subscription_id = ?
        `).run(invoice.subscription);
      }
      break;
    }

    default:
      // Unhandled event type — no action needed
      break;
  }
}

module.exports = {
  stripe,
  PLANS,
  TRIAL_DAYS,
  initBillingTables,
  createCustomer,
  getOrCreateCustomer,
  createCheckoutSession,
  createBillingPortalSession,
  upsertSubscription,
  getSubscription,
  handleWebhookEvent,
};
