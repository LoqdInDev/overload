function baseUrl(shop) {
  return `https://${shop}.myshopify.com/admin/api/2024-01`;
}

function headers(token) {
  return { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' };
}

async function getShop(token, shop) {
  const res = await fetch(`${baseUrl(shop)}/shop.json`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Shopify shop failed: ${res.status}`);
  const { shop: data } = await res.json();
  return { id: data.id, name: data.name, email: data.email, domain: data.domain, currency: data.currency, plan: data.plan_name };
}

async function getProducts(token, shop, { limit = 50, sinceId, collectionId } = {}) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (sinceId) params.set('since_id', sinceId);
  if (collectionId) params.set('collection_id', collectionId);
  const res = await fetch(`${baseUrl(shop)}/products.json?${params}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Shopify products failed: ${res.status}`);
  const { products } = await res.json();
  return products.map(p => ({
    id: p.id, title: p.title, status: p.status, vendor: p.vendor,
    variants: p.variants?.length || 0, image: p.image?.src,
    price: p.variants?.[0]?.price, inventory: p.variants?.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0),
  }));
}

async function getOrders(token, shop, { limit = 50, status = 'any', sinceId, createdAtMin, createdAtMax } = {}) {
  const params = new URLSearchParams({ limit: String(limit), status });
  if (sinceId) params.set('since_id', sinceId);
  if (createdAtMin) params.set('created_at_min', createdAtMin);
  if (createdAtMax) params.set('created_at_max', createdAtMax);
  const res = await fetch(`${baseUrl(shop)}/orders.json?${params}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Shopify orders failed: ${res.status}`);
  const { orders } = await res.json();
  return orders.map(o => ({
    id: o.id, orderNumber: o.order_number, email: o.email,
    totalPrice: o.total_price, currency: o.currency,
    financialStatus: o.financial_status, fulfillmentStatus: o.fulfillment_status,
    itemCount: o.line_items?.length || 0, createdAt: o.created_at, customerName: `${o.customer?.first_name || ''} ${o.customer?.last_name || ''}`.trim(),
  }));
}

async function getOrderCount(token, shop, { status = 'any', createdAtMin, createdAtMax } = {}) {
  const params = new URLSearchParams({ status });
  if (createdAtMin) params.set('created_at_min', createdAtMin);
  if (createdAtMax) params.set('created_at_max', createdAtMax);
  const res = await fetch(`${baseUrl(shop)}/orders/count.json?${params}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Shopify order count failed: ${res.status}`);
  const { count } = await res.json();
  return count;
}

async function getInventoryLevels(token, shop, locationId) {
  const res = await fetch(`${baseUrl(shop)}/inventory_levels.json?location_ids=${locationId}`, { headers: headers(token) });
  if (!res.ok) throw new Error(`Shopify inventory failed: ${res.status}`);
  return res.json();
}

async function fulfillOrder(token, shop, orderId, { trackingNumber, trackingCompany, trackingUrl } = {}) {
  const body = {
    fulfillment: {
      tracking_number: trackingNumber, tracking_company: trackingCompany, tracking_url: trackingUrl,
    },
  };
  const res = await fetch(`${baseUrl(shop)}/orders/${orderId}/fulfillments.json`, {
    method: 'POST', headers: headers(token), body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Shopify fulfillment failed: ${res.status} ${await res.text()}`);
  return res.json();
}

module.exports = { getShop, getProducts, getOrders, getOrderCount, getInventoryLevels, fulfillOrder, providerId: 'shopify' };
