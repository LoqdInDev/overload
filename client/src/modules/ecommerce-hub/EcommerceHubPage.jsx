import { useState } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';

const MODULE_COLOR = '#8b5cf6';

const MOCK_STORES = [
  { id: 1, name: 'Main Shopify Store', platform: 'Shopify', status: 'connected', products: 248, orders: 1420, revenue: '$124,500', sync: '2 min ago' },
  { id: 2, name: 'WooCommerce Site', platform: 'WooCommerce', status: 'connected', products: 86, orders: 340, revenue: '$28,900', sync: '15 min ago' },
  { id: 3, name: 'Amazon Seller', platform: 'Amazon', status: 'connected', products: 42, orders: 890, revenue: '$67,200', sync: '5 min ago' },
  { id: 4, name: 'Etsy Storefront', platform: 'Etsy', status: 'disconnected', products: 34, orders: 0, revenue: '$0', sync: 'Not synced' },
];

const MOCK_ORDERS = [
  { id: 'ORD-4821', customer: 'Emily Davis', total: 149.99, items: 3, status: 'fulfilled', store: 'Shopify', date: '2026-02-19' },
  { id: 'ORD-4820', customer: 'Michael Brown', total: 89.50, items: 1, status: 'processing', store: 'Shopify', date: '2026-02-19' },
  { id: 'ORD-4819', customer: 'Sarah Johnson', total: 234.00, items: 5, status: 'shipped', store: 'Amazon', date: '2026-02-18' },
  { id: 'ORD-4818', customer: 'James Wilson', total: 45.99, items: 2, status: 'fulfilled', store: 'WooCommerce', date: '2026-02-18' },
  { id: 'ORD-4817', customer: 'Olivia Martinez', total: 312.50, items: 4, status: 'processing', store: 'Shopify', date: '2026-02-18' },
  { id: 'ORD-4816', customer: 'Daniel Lee', total: 67.00, items: 1, status: 'refunded', store: 'Amazon', date: '2026-02-17' },
  { id: 'ORD-4815', customer: 'Sophia Clark', total: 198.75, items: 3, status: 'shipped', store: 'Shopify', date: '2026-02-17' },
];

const MOCK_PRODUCTS = [
  { id: 1, name: 'Premium Wireless Headphones', sku: 'WH-PRO-001', price: 149.99, stock: 284, sold: 1240, store: 'Shopify' },
  { id: 2, name: 'Organic Cotton T-Shirt', sku: 'OCT-BLK-M', price: 34.99, stock: 520, sold: 3420, store: 'Shopify' },
  { id: 3, name: 'Smart Home Hub', sku: 'SH-HUB-V2', price: 89.99, stock: 42, sold: 890, store: 'Amazon' },
  { id: 4, name: 'Leather Laptop Sleeve', sku: 'LLS-13-BR', price: 59.99, stock: 168, sold: 756, store: 'WooCommerce' },
  { id: 5, name: 'Stainless Steel Water Bottle', sku: 'WB-SS-32', price: 24.99, stock: 890, sold: 4200, store: 'Amazon' },
  { id: 6, name: 'Bamboo Phone Stand', sku: 'BPS-NAT-01', price: 19.99, stock: 15, sold: 1890, store: 'Shopify' },
];

export default function EcommerceHubPage() {
  usePageTitle('E-commerce Hub');
  const [tab, setTab] = useState('overview');

  const orderStatusColor = (s) => s === 'fulfilled' ? '#22c55e' : s === 'shipped' ? '#3b82f6' : s === 'processing' ? '#f59e0b' : '#ef4444';
  const platformColor = (p) => p === 'Shopify' ? '#95bf47' : p === 'WooCommerce' ? '#9b5c8f' : p === 'Amazon' ? '#ff9900' : '#f2581e';

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
          { label: 'CONNECTED STORES', value: '3', sub: '1 disconnected' },
          { label: 'TOTAL ORDERS', value: '2,650', sub: '+142 this week' },
          { label: 'REVENUE', value: '$220.6K', sub: '+18.3% this month' },
          { label: 'TOP PRODUCT', value: 'Water Bottle', sub: '4,200 units sold' },
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
        {['overview', 'stores', 'orders', 'products'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: `${MODULE_COLOR}20`, borderColor: `${MODULE_COLOR}40`, color: MODULE_COLOR } : {}}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="animate-fade-in space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="panel rounded-2xl p-4 sm:p-6">
              <p className="hud-label text-[11px] mb-4" style={{ color: MODULE_COLOR }}>REVENUE BY STORE</p>
              <div className="space-y-4">
                {MOCK_STORES.filter(s => s.status === 'connected').map(store => {
                  const rev = parseFloat(store.revenue.replace(/[$,]/g, ''));
                  const total = 220600;
                  const pct = ((rev / total) * 100).toFixed(0);
                  return (
                    <div key={store.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold" style={{ color: platformColor(store.platform) }}>{store.platform}</span>
                        <span className="text-gray-500 font-mono">{store.revenue} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-white/[0.03] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: platformColor(store.platform) }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="panel rounded-2xl p-4 sm:p-6">
              <p className="hud-label text-[11px] mb-4" style={{ color: MODULE_COLOR }}>RECENT ORDERS</p>
              <div className="space-y-3">
                {MOCK_ORDERS.slice(0, 5).map(o => (
                  <div key={o.id} className="flex items-center justify-between py-1.5 border-b border-indigo-500/[0.04] last:border-0">
                    <div>
                      <p className="text-sm text-gray-300">{o.id}</p>
                      <p className="text-xs text-gray-600">{o.customer}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono font-bold text-gray-200">${o.total.toFixed(2)}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${orderStatusColor(o.status)}15`, color: orderStatusColor(o.status) }}>
                        {o.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-4" style={{ color: MODULE_COLOR }}>LOW STOCK ALERTS</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {MOCK_PRODUCTS.filter(p => p.stock < 50).map(p => (
                <div key={p.id} className="bg-red-500/[0.05] rounded-lg p-5 border border-red-500/10">
                  <p className="text-sm font-semibold text-gray-300">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.sku}</p>
                  <p className="text-base font-bold font-mono text-red-400 mt-1">{p.stock} left</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stores */}
      {tab === 'stores' && (
        <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
          {MOCK_STORES.map(store => (
            <div key={store.id} className="panel rounded-2xl p-4 sm:p-6 hover:border-violet-500/20 transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: store.status === 'connected' ? '#22c55e' : '#ef4444' }} />
                    <p className="text-base font-bold text-gray-200">{store.name}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 ml-5.5">{store.platform} &middot; Last sync: {store.sync}</p>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${platformColor(store.platform)}15`, color: platformColor(store.platform), border: `1px solid ${platformColor(store.platform)}25` }}>
                  {store.platform}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:gap-5 text-center">
                <div>
                  <p className="text-xl font-bold font-mono text-white">{store.products}</p>
                  <p className="text-xs text-gray-500">Products</p>
                </div>
                <div>
                  <p className="text-xl font-bold font-mono text-white">{store.orders.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Orders</p>
                </div>
                <div>
                  <p className="text-xl font-bold font-mono" style={{ color: MODULE_COLOR }}>{store.revenue}</p>
                  <p className="text-xs text-gray-500">Revenue</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Orders */}
      {tab === 'orders' && (
        <div className="animate-fade-in">
          <div className="panel rounded-2xl overflow-hidden">
            <div className="divide-y divide-indigo-500/[0.04]">
              {MOCK_ORDERS.map(o => (
                <div key={o.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 px-4 sm:px-6 py-4 hover:bg-white/[0.01] transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold text-gray-300">{o.id}</p>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.03] text-gray-500 border border-white/[0.04]">{o.store}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{o.customer} &middot; {o.items} item{o.items > 1 ? 's' : ''} &middot; {o.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono font-bold text-white">${o.total.toFixed(2)}</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${orderStatusColor(o.status)}15`, color: orderStatusColor(o.status), border: `1px solid ${orderStatusColor(o.status)}25` }}>
                      {o.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Products */}
      {tab === 'products' && (
        <div className="animate-fade-in">
          <div className="panel rounded-2xl overflow-hidden">
            <div className="divide-y divide-indigo-500/[0.04]">
              {MOCK_PRODUCTS.map(p => (
                <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 px-4 sm:px-6 py-4 hover:bg-white/[0.01] transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-300">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.sku} &middot; {p.store}</p>
                  </div>
                  <div className="flex items-center gap-4 sm:gap-6">
                    <span className="text-sm font-mono font-bold text-white">${p.price.toFixed(2)}</span>
                    <div className="text-right">
                      <p className="text-sm font-mono" style={{ color: p.stock < 50 ? '#ef4444' : '#22c55e' }}>{p.stock}</p>
                      <p className="text-[10px] text-gray-600">in stock</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono" style={{ color: MODULE_COLOR }}>{p.sold.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-600">sold</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
