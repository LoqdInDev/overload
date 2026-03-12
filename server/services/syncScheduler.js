/**
 * Sync Scheduler
 *
 * Runs periodic syncs for connected integrations (Shopify products/orders, etc.)
 * Interval: every 30 minutes for connected platforms.
 * Also provides a manual `syncAll()` function.
 */

const { db, logActivity } = require('../db/database');

const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
let syncTimer = null;

async function syncShopify(pm, wsId, store) {
  const results = { products: 0, orders: 0 };

  try {
    // Sync products
    const products = await pm.ecommerceProducts('shopify', { limit: 50 });
    for (const p of products) {
      const existing = await db.prepare('SELECT id FROM eh_products WHERE store_id = ? AND sku = ? AND workspace_id = ?')
        .get(store.id, String(p.id), wsId);
      if (existing) {
        await db.prepare('UPDATE eh_products SET name = ?, price = ?, stock = ?, status = ? WHERE id = ? AND workspace_id = ?')
          .run(p.title, p.price || 0, p.inventory || 0, p.status || 'active', existing.id, wsId);
      } else {
        await db.prepare('INSERT INTO eh_products (store_id, name, sku, price, stock, status, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(store.id, p.title, String(p.id), p.price || 0, p.inventory || 0, p.status || 'active', wsId);
      }
      results.products++;
    }

    // Sync orders
    const orders = await pm.ecommerceOrders('shopify', { limit: 50 });
    for (const o of orders) {
      const existing = await db.prepare('SELECT id FROM eh_orders WHERE store_id = ? AND order_number = ? AND workspace_id = ?')
        .get(store.id, String(o.orderNumber), wsId);
      if (existing) {
        await db.prepare('UPDATE eh_orders SET customer = ?, total = ?, status = ? WHERE id = ? AND workspace_id = ?')
          .run(o.customerName, o.totalPrice, o.financialStatus || 'pending', existing.id, wsId);
      } else {
        await db.prepare('INSERT INTO eh_orders (store_id, order_number, customer, total, status, platform, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(store.id, String(o.orderNumber), o.customerName, o.totalPrice, o.financialStatus || 'pending', 'shopify', wsId);
      }
      results.orders++;
    }

    await db.prepare("UPDATE eh_stores SET last_sync = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?")
      .run(store.id, wsId);

    // Log sync to integration sync logs
    try {
      const conn = await db.prepare("SELECT id FROM int_connections WHERE provider_id = 'shopify'").get();
      if (conn) {
        await db.prepare(
          'INSERT INTO int_sync_logs (workspace_id, connection_id, provider_id, action, status, details) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(wsId, conn.id, 'shopify', 'auto_sync', 'success', JSON.stringify(results));
      }
    } catch { /* int_sync_logs may not exist */ }
  } catch (err) {
    console.error(`[SyncScheduler] Shopify sync error for workspace ${wsId}:`, err.message);
    try {
      const conn = await db.prepare("SELECT id FROM int_connections WHERE provider_id = 'shopify'").get();
      if (conn) {
        await db.prepare(
          'INSERT INTO int_sync_logs (workspace_id, connection_id, provider_id, action, status, details) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(wsId, conn.id, 'shopify', 'auto_sync', 'failed', JSON.stringify({ error: err.message }));
      }
    } catch { /* ignore */ }
  }

  return results;
}

async function runScheduledSync() {
  try {
    const pm = require('./platformManager');

    // Check if Shopify is connected
    if (!pm.isConnected('shopify')) return;

    // Get all workspaces that have stores
    const stores = await db.prepare("SELECT * FROM eh_stores WHERE platform = 'shopify' AND status = 'connected'").all();
    if (!stores || stores.length === 0) return;

    for (const store of stores) {
      const wsId = store.workspace_id;
      if (!wsId) continue;

      const results = await syncShopify(pm, wsId, store);
      if (results.products > 0 || results.orders > 0) {
        console.log(`[SyncScheduler] Shopify sync: ${results.products} products, ${results.orders} orders (workspace: ${wsId})`);
        await logActivity('ecommerce-hub', 'auto_sync', `Auto-synced ${results.products} products, ${results.orders} orders`, 'Shopify', null, wsId);
      }
    }
  } catch (err) {
    console.error('[SyncScheduler] Scheduled sync error:', err.message);
  }
}

function startSyncScheduler() {
  if (syncTimer) return;
  console.log(`[SyncScheduler] Starting — sync every ${SYNC_INTERVAL_MS / 60000} minutes`);

  // Run first sync 2 minutes after startup (give time for connections to initialize)
  setTimeout(() => {
    runScheduledSync().catch(err => console.error('[SyncScheduler] Initial sync error:', err.message));
  }, 2 * 60 * 1000);

  syncTimer = setInterval(() => {
    runScheduledSync().catch(err => console.error('[SyncScheduler] Sync error:', err.message));
  }, SYNC_INTERVAL_MS);
  syncTimer.unref();
}

function stopSyncScheduler() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}

module.exports = { startSyncScheduler, stopSyncScheduler, runScheduledSync };
