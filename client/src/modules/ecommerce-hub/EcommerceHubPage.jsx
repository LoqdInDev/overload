import { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchJSON, postJSON, deleteJSON, connectSSE } from '../../lib/api';
import AIInsightsPanel from '../../components/shared/AIInsightsPanel';


const MODULE_COLOR = '#8b5cf6';

const AI_TEMPLATES = [
  { name: 'Product Descriptions', prompt: 'Write compelling, SEO-optimized product descriptions for an e-commerce store. Include persuasive copy, key features, and benefit-driven language that drives conversions.' },
  { name: 'Pricing Strategy', prompt: 'Analyze pricing strategies for an e-commerce business. Cover competitive pricing, psychological pricing tactics, bundle pricing, and margin optimization recommendations.' },
  { name: 'Order Analysis', prompt: 'Analyze order patterns and customer purchasing behavior. Identify trends in order frequency, average order value, top-selling products, and seasonal patterns with actionable insights.' },
  { name: 'Marketing Copy', prompt: 'Generate high-converting marketing copy for e-commerce campaigns. Include email subject lines, ad headlines, social media captions, and promotional banner text.' },
];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function EcommerceHubPage() {
  usePageTitle('E-commerce Hub');
  const [tab, setTab] = useState('stores');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const [stores, setStores] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create store form state
  const [newStoreName, setNewStoreName] = useState('');
  const [newStorePlatform, setNewStorePlatform] = useState('');
  const [newStoreUrl, setNewStoreUrl] = useState('');
  const [creatingStore, setCreatingStore] = useState(false);

  // Create order form state
  const [newOrderNumber, setNewOrderNumber] = useState('');
  const [newOrderCustomer, setNewOrderCustomer] = useState('');
  const [newOrderTotal, setNewOrderTotal] = useState('');
  const [newOrderStatus, setNewOrderStatus] = useState('pending');
  const [newOrderStoreId, setNewOrderStoreId] = useState('');
  const [newOrderPlatform, setNewOrderPlatform] = useState('');
  const [creatingOrder, setCreatingOrder] = useState(false);

  // Create product form state
  const [newProductName, setNewProductName] = useState('');
  const [newProductSku, setNewProductSku] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductStock, setNewProductStock] = useState('');
  const [newProductStoreId, setNewProductStoreId] = useState('');
  const [creatingProduct, setCreatingProduct] = useState(false);

  // Inventory Forecaster state
  const [inventoryInputs, setInventoryInputs] = useState({ product_name: '', current_stock: '', avg_daily_sales: '', lead_time_days: '14' });
  const [inventoryForecast, setInventoryForecast] = useState(null);
  const [bundleData, setBundleData] = useState(null);
  const [bundleLoading, setBundleLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [storesRes, ordersRes, productsRes] = await Promise.all([
        fetchJSON('/api/ecommerce-hub/'),
        fetchJSON('/api/ecommerce-hub/orders/list'),
        fetchJSON('/api/ecommerce-hub/products/list'),
      ]);
      setStores(Array.isArray(storesRes) ? storesRes : []);
      setOrders(Array.isArray(ordersRes) ? ordersRes : []);
      setProducts(Array.isArray(productsRes) ? productsRes : []);
    } catch (e) {
      console.error('Failed to load ecommerce hub data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const orderStatusColor = (s) => s === 'fulfilled' ? '#22c55e' : s === 'shipped' ? '#3b82f6' : s === 'processing' ? '#f59e0b' : s === 'pending' ? '#f59e0b' : '#ef4444';
  const platformColor = (p) => {
    const lp = (p || '').toLowerCase();
    return lp === 'shopify' ? '#95bf47' : lp === 'woocommerce' ? '#9b5c8f' : lp === 'amazon' ? '#ff9900' : lp === 'etsy' ? '#f2581e' : MODULE_COLOR;
  };

  // Compute stats from real data
  const connectedStores = stores.filter(s => s.status === 'connected').length;
  const disconnectedStores = stores.filter(s => s.status !== 'connected').length;
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
  const formatRevenue = (val) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
    return `$${val.toFixed(2)}`;
  };
  const topProduct = products.length > 0
    ? [...products].sort((a, b) => (b.stock || 0) - (a.stock || 0))[0]
    : null;
  const lowStockProducts = products.filter(p => p.stock < 50);

  // Revenue per store
  const revenueByStoreId = {};
  orders.forEach(o => {
    if (o.store_id) {
      revenueByStoreId[o.store_id] = (revenueByStoreId[o.store_id] || 0) + (parseFloat(o.total) || 0);
    }
  });

  const handleCreateStore = async (e) => {
    e.preventDefault();
    setCreatingStore(true);
    try {
      await postJSON('/api/ecommerce-hub/', {
        store_name: newStoreName,
        platform: newStorePlatform || null,
        store_url: newStoreUrl || null,
      });
      setNewStoreName(''); setNewStorePlatform(''); setNewStoreUrl('');
      await loadData();
    } catch (err) { console.error('Failed to create store:', err); }
    finally { setCreatingStore(false); }
  };

  const removeStore = async (id) => {
    try {
      await deleteJSON(`/api/ecommerce-hub/${id}`);
      setStores(prev => prev.filter(s => s.id !== id));
      setOrders(prev => prev.filter(o => o.store_id !== id));
      setProducts(prev => prev.filter(p => p.store_id !== id));
    } catch (err) { console.error(err); }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setCreatingOrder(true);
    try {
      await postJSON('/api/ecommerce-hub/orders', {
        store_id: newOrderStoreId ? parseInt(newOrderStoreId) : null,
        order_number: newOrderNumber || null,
        customer: newOrderCustomer || null,
        total: parseFloat(newOrderTotal) || 0,
        status: newOrderStatus,
        platform: newOrderPlatform || null,
      });
      setNewOrderNumber(''); setNewOrderCustomer(''); setNewOrderTotal('');
      setNewOrderStatus('pending'); setNewOrderStoreId(''); setNewOrderPlatform('');
      await loadData();
    } catch (err) { console.error('Failed to create order:', err); }
    finally { setCreatingOrder(false); }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setCreatingProduct(true);
    try {
      await postJSON('/api/ecommerce-hub/products', {
        store_id: newProductStoreId ? parseInt(newProductStoreId) : null,
        name: newProductName,
        sku: newProductSku || null,
        price: parseFloat(newProductPrice) || 0,
        stock: parseInt(newProductStock) || 0,
      });
      setNewProductName(''); setNewProductSku(''); setNewProductPrice('');
      setNewProductStock(''); setNewProductStoreId('');
      await loadData();
    } catch (err) { console.error('Failed to create product:', err); }
    finally { setCreatingProduct(false); }
  };

  const generate = (template) => {
    setSelectedTemplate(template); setGenerating(true); setOutput('');
    connectSSE('/api/ecommerce-hub/generate', { type: 'content', prompt: template.prompt }, {
      onChunk: (text) => setOutput(p => p + text),
      onResult: (data) => { setOutput(data.content); setGenerating(false); },
      onError: (err) => { console.error(err); setGenerating(false); },
    });
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-12">
        <div className="mb-6 sm:mb-8 animate-fade-in">
          <p className="hud-label text-[11px] mb-2" style={{ color: MODULE_COLOR }}>ECOMMERCE HUB</p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">E-Commerce Command Center</h1>
          <p className="text-base text-gray-500">Manage all your stores, orders, and products in one place</p>
        </div>
        <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-400 rounded-full animate-spin" /></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-12">
      <div className="mb-6 sm:mb-8 animate-fade-in">
        <p className="hud-label text-[11px] mb-2" style={{ color: MODULE_COLOR }}>ECOMMERCE HUB</p>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">E-Commerce Command Center</h1>
        <p className="text-base text-gray-500">Manage all your stores, orders, and products in one place</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[
          { label: 'CONNECTED STORES', value: String(connectedStores), sub: disconnectedStores > 0 ? `${disconnectedStores} disconnected` : 'All connected' },
          { label: 'TOTAL ORDERS', value: String(totalOrders), sub: `${orders.filter(o => o.status === 'pending' || o.status === 'processing').length} pending` },
          { label: 'REVENUE', value: formatRevenue(totalRevenue), sub: `from ${totalOrders} orders` },
          { label: 'PRODUCTS', value: String(products.length), sub: lowStockProducts.length > 0 ? `${lowStockProducts.length} low stock` : 'All stocked' },
        ].map((s, i) => (
          <div key={i} className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-1">{s.label}</p>
            <p className="text-xl sm:text-2xl font-bold text-white font-mono">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 sm:mb-8">
        {['stores', 'products', 'orders', 'ai-tools'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: `${MODULE_COLOR}20`, borderColor: `${MODULE_COLOR}40`, color: MODULE_COLOR } : {}}>
            {t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Stores */}
      {tab === 'stores' && (
        <div className="animate-fade-in space-y-4">
          {/* Create Store Form */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.15)' }}>
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(139,92,246,0.08)' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.12)' }}>
                <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Add Store</p>
                <p className="text-xs text-gray-400">Connect a new store to track orders, products, and revenue</p>
              </div>
            </div>
            <form onSubmit={handleCreateStore} className="p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1.5">Store Name</p>
                  <input type="text" placeholder="e.g. My Shopify Store" value={newStoreName} onChange={e => setNewStoreName(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-transparent border border-gray-200 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-violet-400/60 transition-colors" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1.5">Platform</p>
                  <input type="text" placeholder="e.g. Shopify, WooCommerce" value={newStorePlatform} onChange={e => setNewStorePlatform(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-transparent border border-gray-200 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-violet-400/60 transition-colors" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1.5">Store URL <span className="normal-case font-normal">(optional)</span></p>
                  <input type="url" placeholder="https://yourstore.com" value={newStoreUrl} onChange={e => setNewStoreUrl(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-transparent border border-gray-200 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-violet-400/60 transition-colors" />
                </div>
              </div>
              <button type="submit" disabled={creatingStore} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all" style={{ background: creatingStore ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.75)', boxShadow: creatingStore ? 'none' : '0 4px 20px -4px rgba(139,92,246,0.4)' }}>
                {creatingStore ? 'Adding...' : 'Add Store'}
              </button>
            </form>
          </div>

          {/* Stores List */}
          {stores.length === 0 ? (
            <div className="panel rounded-2xl p-8 text-center"><p className="text-gray-500 text-sm">No stores yet. Add one above to get started.</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
              {stores.map(store => {
                const storeRevenue = revenueByStoreId[store.id] || 0;
                const storeOrders = orders.filter(o => o.store_id === store.id).length;
                const storeProducts = products.filter(p => p.store_id === store.id).length;
                return (
                  <div key={store.id} className="group panel rounded-2xl p-4 sm:p-6 hover:border-violet-500/20 transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: store.status === 'connected' ? '#22c55e' : '#ef4444' }} />
                          <p className="text-base font-bold text-gray-200">{store.store_name}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 ml-5.5">
                          {store.platform || 'No platform'} &middot; {store.last_sync ? `Last sync: ${formatDate(store.last_sync)}` : 'Not synced'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {store.platform && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${platformColor(store.platform)}15`, color: platformColor(store.platform), border: `1px solid ${platformColor(store.platform)}25` }}>
                            {store.platform}
                          </span>
                        )}
                        <button onClick={() => removeStore(store.id)} className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 text-xs transition-all">&times;</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 sm:gap-5 text-center">
                      <div>
                        <p className="text-xl font-bold font-mono text-white">{storeProducts}</p>
                        <p className="text-xs text-gray-500">Products</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold font-mono text-white">{storeOrders.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">Orders</p>
                      </div>
                      <div>
                        <p className="text-xl font-bold font-mono" style={{ color: MODULE_COLOR }}>{formatRevenue(storeRevenue)}</p>
                        <p className="text-xs text-gray-500">Revenue</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Products */}
      {tab === 'products' && (
        <div className="animate-fade-in space-y-4">
          {/* Create Product Form */}
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3" style={{ color: MODULE_COLOR }}>ADD PRODUCT</p>
            <form onSubmit={handleCreateProduct} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <input type="text" placeholder="Product name" value={newProductName} onChange={e => setNewProductName(e.target.value)} required className="w-full px-3 py-2 rounded-lg bg-transparent border border-gray-200 text-sm placeholder-gray-400 focus:outline-none focus:border-violet-400/60" />
              <input type="text" placeholder="SKU" value={newProductSku} onChange={e => setNewProductSku(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-transparent border border-gray-200 text-sm placeholder-gray-400 focus:outline-none focus:border-violet-400/60" />
              <input type="number" step="0.01" placeholder="Price" value={newProductPrice} onChange={e => setNewProductPrice(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-transparent border border-gray-200 text-sm placeholder-gray-400 focus:outline-none focus:border-violet-400/60" />
              <input type="number" placeholder="Stock qty" value={newProductStock} onChange={e => setNewProductStock(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-transparent border border-gray-200 text-sm placeholder-gray-400 focus:outline-none focus:border-violet-400/60" />
              <select value={newProductStoreId} onChange={e => setNewProductStoreId(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-transparent border border-gray-200 text-sm focus:outline-none focus:border-violet-400/60">
                <option value="">No store</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.store_name}</option>)}
              </select>
              <div className="sm:col-span-2 lg:col-span-5">
                <button type="submit" disabled={creatingProduct} className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors" style={{ background: creatingProduct ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.6)' }}>
                  {creatingProduct ? 'Adding...' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>

          {/* Inventory Forecaster */}
          <div className="panel rounded-2xl p-4 sm:p-6 animate-fade-in">
            <p className="hud-label text-[11px] mb-3" style={{ color: MODULE_COLOR }}>INVENTORY FORECASTER</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input className="w-full px-3 py-2 rounded-lg bg-transparent border border-gray-200 text-sm placeholder-gray-400 focus:outline-none focus:border-violet-400/60" placeholder="Product name" value={inventoryInputs.product_name} onChange={e => setInventoryInputs(p => ({ ...p, product_name: e.target.value }))} />
              <input className="w-full px-3 py-2 rounded-lg bg-transparent border border-gray-200 text-sm placeholder-gray-400 focus:outline-none focus:border-violet-400/60" type="number" placeholder="Current stock qty" value={inventoryInputs.current_stock} onChange={e => setInventoryInputs(p => ({ ...p, current_stock: e.target.value }))} />
              <input className="w-full px-3 py-2 rounded-lg bg-transparent border border-gray-200 text-sm placeholder-gray-400 focus:outline-none focus:border-violet-400/60" type="number" placeholder="Avg daily sales" value={inventoryInputs.avg_daily_sales} onChange={e => setInventoryInputs(p => ({ ...p, avg_daily_sales: e.target.value }))} />
              <input className="w-full px-3 py-2 rounded-lg bg-transparent border border-gray-200 text-sm placeholder-gray-400 focus:outline-none focus:border-violet-400/60" type="number" placeholder="Lead time (days)" value={inventoryInputs.lead_time_days} onChange={e => setInventoryInputs(p => ({ ...p, lead_time_days: e.target.value }))} />
            </div>
            <button className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors" style={{ background: 'rgba(139,92,246,0.6)' }} onClick={async () => {
              try { const result = await postJSON('/api/ecommerce-hub/forecast-inventory', inventoryInputs); setInventoryForecast(result); } catch {}
            }}>Forecast Inventory</button>
            {inventoryForecast && (
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-white/[0.04]">
                  <div className="text-xl font-bold" style={{ color: inventoryForecast.urgency === 'critical' ? '#ef4444' : inventoryForecast.urgency === 'warning' ? '#f59e0b' : '#22c55e' }}>{inventoryForecast.days_until_stockout}d</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">Until Stockout</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-white/[0.04]">
                  <div className="text-xl font-bold text-white">{inventoryForecast.reorder_point}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">Reorder Point</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-white/[0.04]">
                  <div className="text-xl font-bold text-white">{inventoryForecast.recommended_order_qty}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-1">Recommended Order</div>
                </div>
              </div>
            )}
            {inventoryForecast?.should_reorder_now && (
              <div className="mt-2 text-xs px-3 py-1.5 rounded-full border inline-block" style={{ borderColor: '#ef4444', color: '#ef4444' }}>
                Reorder NOW — stockout by {inventoryForecast.estimated_stockout_date}
              </div>
            )}
          </div>

          {/* Low Stock Alerts */}
          {lowStockProducts.length > 0 && (
            <div className="panel rounded-2xl p-4 sm:p-6">
              <p className="hud-label text-[11px] mb-4" style={{ color: '#ef4444' }}>LOW STOCK ALERTS</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {lowStockProducts.map(p => (
                  <div key={p.id} className="bg-red-500/[0.05] rounded-lg p-5 border border-red-500/10">
                    <p className="text-sm font-semibold text-gray-300">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.sku || '—'}{p.store_name ? ` · ${p.store_name}` : ''}</p>
                    <p className="text-base font-bold font-mono text-red-400 mt-1">{p.stock} left</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products List */}
          {products.length === 0 ? (
            <div className="panel rounded-2xl p-8 text-center"><p className="text-gray-500 text-sm">No products yet. Add one above to get started.</p></div>
          ) : (
            <div className="panel rounded-2xl overflow-hidden">
              <div className="divide-y divide-indigo-500/[0.04]">
                {products.map(p => (
                  <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 px-4 sm:px-6 py-4 hover:bg-white/[0.01] transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-300">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.sku || '—'}{p.store_name ? ` · ${p.store_name}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-6">
                      <span className="text-sm font-mono font-bold text-white">${(p.price || 0).toFixed(2)}</span>
                      <div className="text-right">
                        <p className="text-sm font-mono" style={{ color: p.stock < 50 ? '#ef4444' : '#22c55e' }}>{p.stock ?? 0}</p>
                        <p className="text-[10px] text-gray-600">in stock</p>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: p.status === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(156,163,175,0.1)', color: p.status === 'active' ? '#22c55e' : '#9ca3af', border: `1px solid ${p.status === 'active' ? 'rgba(34,197,94,0.2)' : 'rgba(156,163,175,0.2)'}` }}>
                        {p.status || 'active'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Orders */}
      {tab === 'orders' && (
        <div className="animate-fade-in space-y-4">
          {/* Create Order Form */}
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3" style={{ color: MODULE_COLOR }}>ADD ORDER</p>
            <form onSubmit={handleCreateOrder} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input type="text" placeholder="Order number" value={newOrderNumber} onChange={e => setNewOrderNumber(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-transparent border border-gray-200 text-sm placeholder-gray-400 focus:outline-none focus:border-violet-400/60" />
              <input type="text" placeholder="Customer name" value={newOrderCustomer} onChange={e => setNewOrderCustomer(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-transparent border border-gray-200 text-sm placeholder-gray-400 focus:outline-none focus:border-violet-400/60" />
              <input type="number" step="0.01" placeholder="Total ($)" value={newOrderTotal} onChange={e => setNewOrderTotal(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-transparent border border-gray-200 text-sm placeholder-gray-400 focus:outline-none focus:border-violet-400/60" />
              <select value={newOrderStatus} onChange={e => setNewOrderStatus(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-transparent border border-gray-200 text-sm focus:outline-none focus:border-violet-400/60">
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="fulfilled">Fulfilled</option>
                <option value="refunded">Refunded</option>
              </select>
              <select value={newOrderStoreId} onChange={e => setNewOrderStoreId(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-transparent border border-gray-200 text-sm focus:outline-none focus:border-violet-400/60">
                <option value="">No store</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.store_name}</option>)}
              </select>
              <input type="text" placeholder="Platform (optional)" value={newOrderPlatform} onChange={e => setNewOrderPlatform(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-transparent border border-gray-200 text-sm placeholder-gray-400 focus:outline-none focus:border-violet-400/60" />
              <div className="sm:col-span-2 lg:col-span-3">
                <button type="submit" disabled={creatingOrder} className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors" style={{ background: creatingOrder ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.6)' }}>
                  {creatingOrder ? 'Adding...' : 'Add Order'}
                </button>
              </div>
            </form>
          </div>

          {/* Orders List */}
          {orders.length === 0 ? (
            <div className="panel rounded-2xl p-8 text-center"><p className="text-gray-500 text-sm">No orders yet. Add one above to get started.</p></div>
          ) : (
            <div className="panel rounded-2xl overflow-hidden">
              <div className="divide-y divide-indigo-500/[0.04]">
                {orders.map(o => (
                  <div key={o.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 px-4 sm:px-6 py-4 hover:bg-white/[0.01] transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-semibold text-gray-300">{o.order_number || `#${o.id}`}</p>
                        {(o.platform || o.store_name) && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.03] text-gray-500 border border-white/[0.04]">{o.store_name || o.platform}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{o.customer || '—'} &middot; {formatDate(o.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono font-bold text-white">${(parseFloat(o.total) || 0).toFixed(2)}</span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${orderStatusColor(o.status)}15`, color: orderStatusColor(o.status), border: `1px solid ${orderStatusColor(o.status)}25` }}>
                        {o.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Tools */}
      {tab === 'ai-tools' && (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AI_TEMPLATES.map(t => (
              <button key={t.name} onClick={() => generate(t)} disabled={generating} className={`panel-interactive rounded-xl p-4 sm:p-6 text-left ${selectedTemplate?.name === t.name ? 'border-violet-500/20' : ''}`}>
                <p className="text-sm font-bold text-gray-300">{t.name}</p>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{t.prompt}</p>
              </button>
            ))}
          </div>
          {(generating || output) && (
            <div className="panel rounded-2xl p-4 sm:p-7">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-2 h-2 rounded-full ${generating ? 'bg-violet-400 animate-pulse' : 'bg-violet-400'}`} />
                <span className="hud-label text-[11px]" style={{ color: MODULE_COLOR }}>{generating ? 'GENERATING...' : 'READY'}</span>
              </div>
              <pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 bg-violet-400 ml-0.5 animate-pulse" />}</pre>
            </div>
          )}
        </div>
      )}
      <AIInsightsPanel moduleId="ecommerce-hub" />
    </div>
  );
}
