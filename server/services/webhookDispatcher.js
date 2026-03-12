/**
 * Webhook Dispatcher Service
 *
 * Fires webhooks when platform events occur. Modules call `dispatchEvent()`
 * and this service delivers payloads to all matching webhook endpoints.
 *
 * Usage:
 *   const { dispatchEvent } = require('../services/webhookDispatcher');
 *   await dispatchEvent('order.created', { orderId: 123, total: 49.99 }, workspaceId);
 */

const crypto = require('crypto');
const { db } = require('../db/database');

const DELIVERY_TIMEOUT_MS = 10000;
const MAX_RETRIES = 2;

/**
 * Dispatch an event to all matching active webhooks for a workspace.
 * Fire-and-forget by default — errors are logged, not thrown.
 */
async function dispatchEvent(eventType, data, workspaceId) {
  if (!eventType || !workspaceId) return;

  try {
    const webhooks = await db.prepare(
      "SELECT * FROM wh_webhooks WHERE workspace_id = ? AND status = 'active'"
    ).all(workspaceId);

    if (!webhooks || webhooks.length === 0) return;

    const matching = webhooks.filter(wh => {
      if (!wh.events) return true; // No event filter = fire on everything
      try {
        const events = typeof wh.events === 'string' ? JSON.parse(wh.events) : wh.events;
        if (!Array.isArray(events) || events.length === 0) return true;
        return events.some(e => {
          // Support wildcards: "order.*" matches "order.created"
          if (e.endsWith('.*')) {
            return eventType.startsWith(e.slice(0, -2));
          }
          return e === eventType || e === '*';
        });
      } catch {
        return false;
      }
    });

    // Deliver to all matching webhooks in parallel
    const deliveries = matching.map(wh => deliverPayload(wh, eventType, data, workspaceId));
    await Promise.allSettled(deliveries);
  } catch (err) {
    console.error('[Webhook Dispatcher] Error dispatching event:', err.message);
  }
}

/**
 * Deliver a payload to a single webhook endpoint with retry.
 */
async function deliverPayload(webhook, eventType, data, workspaceId) {
  const payload = {
    event: eventType,
    timestamp: new Date().toISOString(),
    webhook_id: webhook.id,
    data,
  };

  const body = JSON.stringify(payload);
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Overload-Webhooks/1.0',
    'X-Webhook-Event': eventType,
    'X-Webhook-Id': String(webhook.id),
  };

  // HMAC signature if secret is configured
  if (webhook.secret) {
    const signature = crypto.createHmac('sha256', webhook.secret).update(body).digest('hex');
    headers['X-Webhook-Signature'] = `sha256=${signature}`;
  }

  let lastError = null;
  let responseStatus = null;
  let responseBody = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const startTime = Date.now();
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
      });

      responseStatus = response.status;
      responseBody = await response.text().catch(() => '');

      // Log delivery
      await logDelivery(webhook.id, workspaceId, eventType, body, responseStatus, responseBody.substring(0, 1000));

      // Update last_triggered timestamp
      await db.prepare('UPDATE wh_webhooks SET last_triggered = CURRENT_TIMESTAMP WHERE id = ?').run(webhook.id);

      // 2xx = success, don't retry
      if (response.ok) return;

      // 4xx = client error, don't retry (bad config)
      if (responseStatus >= 400 && responseStatus < 500) {
        console.warn(`[Webhook] ${webhook.name}: ${responseStatus} — not retrying client error`);
        return;
      }

      // 5xx = server error, retry
      lastError = `HTTP ${responseStatus}`;
    } catch (err) {
      lastError = err.message;
      const latency = Date.now() - startTime;
      await logDelivery(webhook.id, workspaceId, eventType, body, 0, `Error: ${err.message} (${latency}ms)`);
    }

    // Wait before retry (exponential backoff: 1s, 2s)
    if (attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, (attempt + 1) * 1000));
    }
  }

  console.error(`[Webhook] ${webhook.name}: Failed after ${MAX_RETRIES + 1} attempts — ${lastError}`);
}

async function logDelivery(webhookId, workspaceId, event, payload, responseStatus, responseBody) {
  try {
    await db.prepare(
      'INSERT INTO wh_webhook_logs (webhook_id, workspace_id, event, payload, response_status, response_body) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(webhookId, workspaceId, event, payload, responseStatus, responseBody);
  } catch (err) {
    console.error('[Webhook] Failed to log delivery:', err.message);
  }
}

module.exports = { dispatchEvent };
