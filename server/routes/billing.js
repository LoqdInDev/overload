const express = require('express');
const {
  stripe,
  PLANS,
  TRIAL_DAYS,
  createCheckoutSession,
  createBillingPortalSession,
  getSubscription,
  handleWebhookEvent,
} = require('../services/stripe');

const router = express.Router();

// POST /api/billing/create-checkout — creates Stripe checkout session for a plan
router.post('/create-checkout', async (req, res, next) => {
  try {
    const { plan, successUrl, cancelUrl } = req.body;

    if (!plan || !PLANS[plan]) {
      return res.status(400).json({
        error: `Invalid plan. Must be one of: ${Object.keys(PLANS).join(', ')}`,
        code: 'VALIDATION_ERROR',
      });
    }

    const session = await createCheckoutSession({
      userId: req.user.id,
      email: req.user.email,
      displayName: req.user.displayName,
      plan,
      workspaceId: req.workspace?.id,
      successUrl,
      cancelUrl,
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/portal — creates billing portal session
router.post('/portal', async (req, res, next) => {
  try {
    const sub = getSubscription(req.user.id, req.workspace?.id);

    if (!sub?.stripe_customer_id) {
      return res.status(404).json({
        error: 'No billing account found. Please subscribe to a plan first.',
        code: 'NO_SUBSCRIPTION',
      });
    }

    const session = await createBillingPortalSession(
      sub.stripe_customer_id,
      req.body.returnUrl
    );

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

// GET /api/billing/subscription — get current subscription status
router.get('/subscription', (req, res) => {
  const sub = getSubscription(req.user.id, req.workspace?.id);

  if (!sub) {
    return res.json({
      plan: 'free',
      status: 'none',
      trialEndsAt: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      plans: PLANS,
      trialDays: TRIAL_DAYS,
    });
  }

  res.json({
    plan: sub.plan,
    status: sub.status,
    trialEndsAt: sub.trial_ends_at,
    currentPeriodEnd: sub.current_period_end,
    cancelAtPeriodEnd: !!sub.cancel_at_period_end,
    plans: PLANS,
    trialDays: TRIAL_DAYS,
  });
});

// POST /api/billing/cancel — cancel subscription at period end
router.post('/cancel', async (req, res, next) => {
  try {
    const sub = getSubscription(req.user.id, req.workspace?.id);

    if (!sub?.stripe_subscription_id) {
      return res.status(404).json({
        error: 'No active subscription found.',
        code: 'NO_SUBSCRIPTION',
      });
    }

    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // Update local record
    const { db } = require('../db/database');
    db.prepare(`
      UPDATE subscriptions SET cancel_at_period_end = 1, updated_at = datetime('now')
      WHERE stripe_subscription_id = ?
    `).run(sub.stripe_subscription_id);

    res.json({ success: true, cancelAtPeriodEnd: true });
  } catch (err) {
    next(err);
  }
});

// ── Webhook handler (mounted separately with raw body parsing) ──────
async function webhookHandler(req, res) {
  const sig = req.headers['stripe-signature'];

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET is not set — cannot verify webhook');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    await handleWebhookEvent(event);
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

module.exports = { router, webhookHandler };
