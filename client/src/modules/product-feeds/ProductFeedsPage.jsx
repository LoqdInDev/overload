import { useState, useEffect } from 'react';
import { fetchJSON, connectSSE, deleteJSON, putJSON, postJSON } from '../../lib/api';
import { usePageTitle } from '../../hooks/usePageTitle';
import AIInsightsPanel from '../../components/shared/AIInsightsPanel';

const CHANNELS = [
  { id: 'google', name: 'Google Shopping', color: '#4285F4' },
  { id: 'meta', name: 'Meta Catalog', color: '#0668E1' },
  { id: 'tiktok', name: 'TikTok Shop', color: '#ff0050' },
  { id: 'amazon', name: 'Amazon', color: '#FF9900' },
  { id: 'shopify', name: 'Shopify', color: '#96bf48' },
];

const AI_TOOLS = [
  { name: 'Optimize Titles', prompt: 'Optimize these product titles for search visibility and click-through rate across shopping channels' },
  { name: 'Generate Descriptions', prompt: 'Write compelling, SEO-optimized product descriptions for shopping feed listings' },
  { name: 'Keyword Enhancement', prompt: 'Suggest high-converting search terms and keywords for product feed optimization' },
  { name: 'Feed Audit', prompt: 'Audit this product feed for common issues: missing fields, poor titles, low-quality descriptions, policy violations' },
];

const FEED_FORMATS = ['CSV', 'XML', 'JSON'];

function FeedHealthBar({ label, pct }) {
  const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#eab308' : '#ef4444';
  return (
    <div className="flex-1 min-w-[120px]">
      <div className="flex items-center justify-between mb-1">
        <span className="hud-label text-[9px]" style={{ color: '#64748b' }}>{label}</span>
        <span className="text-[10px] font-bold font-mono" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function ProductFeedsPage() {
  usePageTitle('Product Feeds');
  const [tab, setTab] = useState('products');
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [search, setSearch] = useState('');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [products, setProducts] = useState([]);
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProductId, setEditingProductId] = useState(null);
  const [editProduct, setEditProduct] = useState({});
  const [feedAudit, setFeedAudit] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);

  // New states
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [expandedProductId, setExpandedProductId] = useState(null);
  const [showImportForm, setShowImportForm] = useState(false);
  const [importForm, setImportForm] = useState({ name: '', url: '', channel: 'google', format: 'CSV' });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [productsData, feedsData] = await Promise.all([
          fetchJSON('/api/product-feeds/products'),
          fetchJSON('/api/product-feeds/feeds'),
        ]);
        if (!cancelled) {
          setProducts(Array.isArray(productsData) ? productsData : []);
          setFeeds(Array.isArray(feedsData) ? feedsData : []);
        }
      } catch (err) {
        console.error('Failed to load product feeds data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = products.filter(p => {
    const name = (p.title || '').toLowerCase();
    const sku = (p.sku || '').toLowerCase();
    const q = search.toLowerCase();
    if (search && !name.includes(q) && !sku.includes(q)) return false;
    if (selectedChannel && (p.channel || '').toLowerCase() !== selectedChannel) return false;
    return true;
  });

  const totalActive = products.filter(p => (p.availability || '').toLowerCase() === 'in_stock' || (p.availability || '').toLowerCase() === 'in stock' || (p.availability || '').toLowerCase() === 'active').length;
  const totalChannels = new Set(products.map(p => p.channel).filter(Boolean)).size;
  const totalOutOfStock = products.filter(p => (p.availability || '').toLowerCase() === 'out_of_stock' || (p.availability || '').toLowerCase() === 'out of stock').length;

  // Feed health metrics
  const healthMetrics = (() => {
    const total = products.length || 1;
    const titleQuality = Math.round((products.filter(p => (p.title || '').length > 20).length / total) * 100);
    const priceCoverage = Math.round((products.filter(p => parseFloat(p.price) > 0).length / total) * 100);
    const imageReady = Math.round((products.filter(p => !!(p.image_url || p.image)).length / total) * 100);
    const descScore = Math.round((products.filter(p => (p.description || '').length > 30).length / total) * 100);
    return { titleQuality, priceCoverage, imageReady, descScore };
  })();

  const deleteProduct = async (id) => {
    await deleteJSON(`/api/product-feeds/products/${id}`);
    setProducts(prev => prev.filter(p => p.id !== id));
    setSelectedProducts(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const saveProductEdit = async (id) => {
    await putJSON(`/api/product-feeds/products/${id}`, editProduct);
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...editProduct } : p));
    setEditingProductId(null);
    setEditProduct({});
  };

  const deleteFeed = async (id) => {
    await deleteJSON(`/api/product-feeds/feeds/${id}`);
    setFeeds(prev => prev.filter(f => f.id !== id));
    setProducts(prev => prev.filter(p => p.feed_id !== id));
  };

  const generate = async (tool) => {
    setGenerating(true); setOutput('');
    const productList = filtered.slice(0, 5).map(p => `${p.title} (${p.sku}) - $${p.price}`).join('\n');
    const cancel = connectSSE('/api/product-feeds/generate', { type: 'optimize', prompt: `${tool.prompt}\n\nProducts:\n${productList}` }, {
      onChunk: (text) => setOutput(prev => prev + text),
      onResult: (data) => { setOutput(data.content); setGenerating(false); },
      onError: (err) => { console.error(err); setGenerating(false); }
    });
    return cancel;
  };

  const mapAvailabilityToStatus = (availability) => {
    const a = (availability || '').toLowerCase().replace(/\s+/g, '_');
    if (a === 'in_stock' || a === 'active') return 'active';
    if (a === 'out_of_stock') return 'out_of_stock';
    if (a === 'low_stock') return 'low_stock';
    return 'active';
  };

  const statusBadge = (status) => {
    const styles = { active: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' }, out_of_stock: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' }, low_stock: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' } };
    const s = styles[status] || styles.active;
    return <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.text} border ${s.border}`}>{status.replace('_', ' ')}</span>;
  };

  // Bulk actions
  const toggleSelectProduct = (id) => {
    setSelectedProducts(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === filtered.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filtered.map(p => p.id)));
    }
  };

  const bulkSetAvailability = async (availability) => {
    const ids = [...selectedProducts];
    await Promise.all(ids.map(id => putJSON(`/api/product-feeds/products/${id}`, { availability })));
    setProducts(prev => prev.map(p => selectedProducts.has(p.id) ? { ...p, availability } : p));
    setSelectedProducts(new Set());
  };

  const bulkDelete = async () => {
    const ids = [...selectedProducts];
    await Promise.all(ids.map(id => deleteJSON(`/api/product-feeds/products/${id}`)));
    setProducts(prev => prev.filter(p => !selectedProducts.has(p.id)));
    setSelectedProducts(new Set());
  };

  const bulkEditPrice = async () => {
    const newPrice = prompt('Enter new price for selected products:');
    if (newPrice === null || newPrice === '') return;
    const price = parseFloat(newPrice);
    if (isNaN(price)) return;
    const ids = [...selectedProducts];
    await Promise.all(ids.map(id => putJSON(`/api/product-feeds/products/${id}`, { price })));
    setProducts(prev => prev.map(p => selectedProducts.has(p.id) ? { ...p, price } : p));
    setSelectedProducts(new Set());
  };

  const submitImportFeed = async () => {
    if (!importForm.name || !importForm.url) return;
    try {
      await postJSON('/api/product-feeds/feeds', {
        name: importForm.name,
        url: importForm.url,
        channel: importForm.channel,
        format: importForm.format,
      });
      const feedsData = await fetchJSON('/api/product-feeds/feeds');
      setFeeds(Array.isArray(feedsData) ? feedsData : []);
      setShowImportForm(false);
      setImportForm({ name: '', url: '', channel: 'google', format: 'CSV' });
    } catch (err) {
      console.error('Failed to import feed:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-12">
        <div className="mb-6 sm:mb-8 animate-fade-in"><p className="hud-label text-[11px] mb-2" style={{ color: '#64748b' }}>PRODUCT FEEDS</p><h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Product Feed Manager</h1></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="panel rounded-2xl p-4 sm:p-6 animate-pulse"><div className="h-3 w-20 bg-white/5 rounded mb-2" /><div className="h-7 w-12 bg-white/5 rounded" /></div>
          ))}
        </div>
        <div className="text-center text-gray-500 py-12">Loading product feeds...</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-12">
      <div className="mb-6 sm:mb-8 animate-fade-in"><p className="hud-label text-[11px] mb-2" style={{ color: '#64748b' }}>PRODUCT FEEDS</p><h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Product Feed Manager</h1></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[{ l: 'TOTAL PRODUCTS', v: products.length }, { l: 'ACTIVE', v: totalActive }, { l: 'CHANNELS', v: totalChannels }, { l: 'OUT OF STOCK', v: totalOutOfStock }].map((s, i) => (
          <div key={i} className="panel stat-card rounded-2xl p-4 sm:p-6"><p className="hud-label text-[10px] mb-2">{s.l}</p><p className="text-2xl sm:text-3xl font-bold text-white font-mono tabular-nums leading-none">{s.v}</p></div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 mb-6">
        {['products', 'channels', 'ai-optimize'].map(t => (<button key={t} onClick={() => setTab(t)} className={`chip text-[10px] ${tab === t ? 'active' : ''}`} style={tab === t ? { background: 'rgba(100,116,139,0.15)', borderColor: 'rgba(100,116,139,0.3)', color: '#94a3b8' } : {}}>{t === 'ai-optimize' ? 'AI Optimize' : t.charAt(0).toUpperCase() + t.slice(1)}</button>))}
      </div>

      {tab === 'products' && (
        <div className="animate-fade-in">
          {/* Feed Health Dashboard */}
          {products.length > 0 && (
            <div className="panel rounded-2xl p-4 sm:p-5 mb-5 animate-fade-in">
              <p className="hud-label text-[10px] mb-3" style={{ color: '#64748b' }}>FEED HEALTH</p>
              <div className="flex flex-wrap gap-4 sm:gap-6">
                <FeedHealthBar label="TITLE QUALITY" pct={healthMetrics.titleQuality} />
                <FeedHealthBar label="PRICE COVERAGE" pct={healthMetrics.priceCoverage} />
                <FeedHealthBar label="IMAGE READY" pct={healthMetrics.imageReady} />
                <FeedHealthBar label="DESCRIPTION SCORE" pct={healthMetrics.descScore} />
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 mb-6">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="input-field rounded-xl px-5 py-3 text-base flex-1" />
            <div className="flex flex-wrap gap-1">
              <button onClick={() => setSelectedChannel(null)} className={`chip text-[9px] ${!selectedChannel ? 'active' : ''}`} style={!selectedChannel ? { background: 'rgba(100,116,139,0.15)', borderColor: 'rgba(100,116,139,0.3)', color: '#94a3b8' } : {}}>All</button>
              {CHANNELS.map(c => (<button key={c.id} onClick={() => setSelectedChannel(selectedChannel === c.id ? null : c.id)} className={`chip text-[9px] ${selectedChannel === c.id ? 'active' : ''}`} style={selectedChannel === c.id ? { background: `${c.color}15`, borderColor: `${c.color}30`, color: c.color } : {}}>{c.name.split(' ')[0]}</button>))}
            </div>
          </div>
          {products.length === 0 ? (
            <div className="panel rounded-2xl p-12 text-center">
              <p className="text-gray-500 text-base">No products yet</p>
              <p className="text-gray-600 text-sm mt-1">Products will appear here once feeds are synced.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="panel rounded-2xl p-12 text-center">
              <p className="text-gray-500 text-base">No products match your filters</p>
            </div>
          ) : (
            <div className="panel rounded-2xl overflow-hidden overflow-x-auto">
              <div className="min-w-[640px]">
                <div className="grid grid-cols-[32px_1fr_80px_80px_auto_80px_32px_32px] px-4 sm:px-6 py-3 border-b border-indigo-500/[0.06] text-xs font-bold text-gray-500">
                  <span className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedProducts.size === filtered.length}
                      onChange={toggleSelectAll}
                      className="accent-slate-500 w-3.5 h-3.5 cursor-pointer"
                    />
                  </span>
                  <span>PRODUCT</span><span>SKU</span><span className="text-right">PRICE</span><span className="text-center">CHANNEL</span><span className="text-center">STATUS</span><span /><span />
                </div>
                {filtered.map((p, idx) => {
                  const status = mapAvailabilityToStatus(p.availability);
                  const ch = CHANNELS.find(x => x.id === (p.channel || '').toLowerCase());
                  const isEditing = editingProductId === p.id;
                  const isExpanded = expandedProductId === p.id;
                  const isSelected = selectedProducts.has(p.id);
                  return (
                    <div key={p.id || idx} className="border-b border-indigo-500/[0.03]">
                      {isEditing ? (
                        <div className="flex flex-wrap items-center gap-2 px-4 sm:px-6 py-3 hover:bg-white/[0.01] transition-colors">
                          <span className="text-sm font-semibold text-gray-200 flex-1 truncate">{p.title}</span>
                          <input
                            type="number"
                            step="0.01"
                            className="input-field rounded-lg px-3 py-1.5 text-sm w-28 font-mono"
                            value={editProduct.price ?? p.price ?? ''}
                            onChange={e => setEditProduct(prev => ({ ...prev, price: e.target.value }))}
                            placeholder="Price"
                          />
                          <select
                            className="input-field rounded-lg px-3 py-1.5 text-sm"
                            value={editProduct.availability ?? p.availability ?? 'in_stock'}
                            onChange={e => setEditProduct(prev => ({ ...prev, availability: e.target.value }))}
                          >
                            <option value="in_stock">In Stock</option>
                            <option value="out_of_stock">Out of Stock</option>
                            <option value="preorder">Preorder</option>
                          </select>
                          <button
                            onClick={() => saveProductEdit(p.id)}
                            className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                            style={{ background: 'rgba(100,116,139,0.15)', border: '1px solid rgba(100,116,139,0.3)', color: '#94a3b8' }}
                          >Save</button>
                          <button
                            onClick={() => { setEditingProductId(null); setEditProduct({}); }}
                            className="text-xs px-3 py-1.5 rounded-lg font-semibold text-gray-500 hover:text-gray-300 transition-colors"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                          >Cancel</button>
                        </div>
                      ) : (
                        <div
                          className="grid grid-cols-[32px_1fr_80px_80px_auto_80px_32px_32px] items-center px-4 sm:px-6 py-4 hover:bg-white/[0.01] transition-colors cursor-pointer"
                          onClick={(e) => {
                            // Don't expand if clicking checkbox, edit, or delete buttons
                            if (e.target.closest('input[type="checkbox"]') || e.target.closest('button')) return;
                            setExpandedProductId(isExpanded ? null : p.id);
                          }}
                        >
                          <span className="flex items-center justify-center" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectProduct(p.id)}
                              className="accent-slate-500 w-3.5 h-3.5 cursor-pointer"
                            />
                          </span>
                          <span className="text-sm font-semibold text-gray-200 truncate">{p.title}</span>
                          <span className="text-xs text-gray-500 font-mono">{p.sku}</span>
                          <span className="text-sm text-gray-300 font-mono text-right">${p.price}</span>
                          <div className="flex gap-1 justify-center">
                            {ch ? <div className="w-2 h-2 rounded-full" title={ch.name} style={{ background: ch.color }} /> : p.channel ? <span className="text-[9px] text-gray-500">{p.channel}</span> : null}
                          </div>
                          <div className="text-center">{statusBadge(status)}</div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingProductId(p.id); setEditProduct({ price: p.price, availability: p.availability }); }}
                            className="text-gray-500 hover:text-slate-300 transition-colors text-xs leading-none text-center px-1 py-0.5 rounded"
                            title="Edit product"
                          >✎</button>
                          <button onClick={(e) => { e.stopPropagation(); deleteProduct(p.id); }} className="text-gray-600 hover:text-red-400 transition-colors text-lg leading-none text-center" title="Delete product">×</button>
                        </div>
                      )}

                      {/* Expanded product detail row */}
                      {isExpanded && !isEditing && (
                        <div className="px-4 sm:px-6 pb-4 pt-1 animate-fade-in" style={{ background: 'rgba(255,255,255,0.01)' }}>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pl-8">
                            {p.description && (
                              <div className="sm:col-span-2 lg:col-span-3">
                                <p className="hud-label text-[9px] mb-1" style={{ color: '#64748b' }}>DESCRIPTION</p>
                                <p className="text-xs text-gray-400 leading-relaxed">{p.description}</p>
                              </div>
                            )}
                            {(p.image_url || p.image) && (
                              <div>
                                <p className="hud-label text-[9px] mb-1" style={{ color: '#64748b' }}>IMAGE URL</p>
                                <p className="text-xs text-gray-500 font-mono truncate">{p.image_url || p.image}</p>
                              </div>
                            )}
                            {p.category && (
                              <div>
                                <p className="hud-label text-[9px] mb-1" style={{ color: '#64748b' }}>CATEGORY</p>
                                <p className="text-xs text-gray-400">{p.category}</p>
                              </div>
                            )}
                            {p.brand && (
                              <div>
                                <p className="hud-label text-[9px] mb-1" style={{ color: '#64748b' }}>BRAND</p>
                                <p className="text-xs text-gray-400">{p.brand}</p>
                              </div>
                            )}
                            {p.gtin && (
                              <div>
                                <p className="hud-label text-[9px] mb-1" style={{ color: '#64748b' }}>GTIN</p>
                                <p className="text-xs text-gray-400 font-mono">{p.gtin}</p>
                              </div>
                            )}
                            {p.channel && (
                              <div>
                                <p className="hud-label text-[9px] mb-1" style={{ color: '#64748b' }}>CHANNEL</p>
                                <p className="text-xs text-gray-400">{ch ? ch.name : p.channel}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bulk Actions Bar */}
          {selectedProducts.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
              <div className="panel rounded-2xl px-5 py-3 flex items-center gap-3 shadow-2xl" style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(100,116,139,0.25)', backdropFilter: 'blur(12px)' }}>
                <span className="text-sm font-semibold text-gray-300 whitespace-nowrap">{selectedProducts.size} selected</span>
                <div className="w-px h-5 bg-white/10" />
                <button
                  onClick={bulkEditPrice}
                  className="chip text-[10px] whitespace-nowrap"
                  style={{ background: 'rgba(100,116,139,0.15)', borderColor: 'rgba(100,116,139,0.3)', color: '#94a3b8' }}
                >Bulk Edit Price</button>
                <button
                  onClick={() => bulkSetAvailability('in_stock')}
                  className="chip text-[10px] whitespace-nowrap"
                  style={{ background: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.25)', color: '#4ade80' }}
                >Set In Stock</button>
                <button
                  onClick={() => bulkSetAvailability('out_of_stock')}
                  className="chip text-[10px] whitespace-nowrap"
                  style={{ background: 'rgba(234,179,8,0.1)', borderColor: 'rgba(234,179,8,0.25)', color: '#eab308' }}
                >Set Out of Stock</button>
                <button
                  onClick={bulkDelete}
                  className="chip text-[10px] whitespace-nowrap"
                  style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.25)', color: '#ef4444' }}
                >Delete Selected</button>
                <button
                  onClick={() => setSelectedProducts(new Set())}
                  className="text-gray-500 hover:text-gray-300 transition-colors text-lg leading-none ml-1"
                  title="Clear selection"
                >×</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'channels' && (
        <div className="space-y-6 animate-fade-in">
          {feeds.length > 0 && (
            <div>
              <p className="hud-label text-[11px] mb-3">FEEDS</p>
              <div className="panel rounded-2xl divide-y divide-indigo-500/[0.04]">
                {feeds.map(f => (
                  <div key={f.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.01] transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-200 truncate">{f.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{f.channel} &mdash; {f.format || 'csv'} &mdash; {f.product_count || 0} products</p>
                    </div>
                    <button onClick={() => deleteFeed(f.id)} className="ml-4 text-gray-600 hover:text-red-400 transition-colors text-lg leading-none flex-shrink-0" title="Delete feed">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 stagger">
            {CHANNELS.map(c => {
              const count = products.filter(p => (p.channel || '').toLowerCase() === c.id).length;
              return (
                <div key={c.id} className="panel rounded-2xl p-4 sm:p-6">
                  <div className="flex items-center gap-3 sm:gap-5 mb-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${c.color}15`, border: `1px solid ${c.color}25` }}><span className="text-sm font-bold" style={{ color: c.color }}>{c.name[0]}</span></div><div><p className="text-base font-bold text-gray-200">{c.name}</p><p className="text-xs text-gray-500">{count} products synced</p></div></div>
                  <div className="h-1.5 rounded-full bg-white/[0.03] overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${products.length > 0 ? (count / products.length) * 100 : 0}%`, background: c.color }} /></div>
                </div>
              );
            })}

            {/* Import Feed Card */}
            <div
              className={`panel rounded-2xl p-4 sm:p-6 ${showImportForm ? '' : 'panel-interactive cursor-pointer'} transition-all`}
              onClick={() => { if (!showImportForm) setShowImportForm(true); }}
            >
              {!showImportForm ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[100px] gap-2">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)' }}>
                    <svg className="w-5 h-5" style={{ color: '#94a3b8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: '#94a3b8' }}>Import Feed</p>
                </div>
              ) : (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between mb-1">
                    <p className="hud-label text-[10px]" style={{ color: '#64748b' }}>IMPORT FEED</p>
                    <button onClick={(e) => { e.stopPropagation(); setShowImportForm(false); }} className="text-gray-500 hover:text-gray-300 transition-colors text-lg leading-none">×</button>
                  </div>
                  <input
                    value={importForm.name}
                    onChange={e => setImportForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Feed Name"
                    className="input-field rounded-lg px-3 py-2 text-sm w-full"
                    onClick={e => e.stopPropagation()}
                  />
                  <input
                    value={importForm.url}
                    onChange={e => setImportForm(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="Feed URL"
                    className="input-field rounded-lg px-3 py-2 text-sm w-full"
                    onClick={e => e.stopPropagation()}
                  />
                  <select
                    value={importForm.channel}
                    onChange={e => setImportForm(prev => ({ ...prev, channel: e.target.value }))}
                    className="input-field rounded-lg px-3 py-2 text-sm w-full"
                    onClick={e => e.stopPropagation()}
                  >
                    {CHANNELS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select
                    value={importForm.format}
                    onChange={e => setImportForm(prev => ({ ...prev, format: e.target.value }))}
                    className="input-field rounded-lg px-3 py-2 text-sm w-full"
                    onClick={e => e.stopPropagation()}
                  >
                    {FEED_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <button
                    onClick={(e) => { e.stopPropagation(); submitImportFeed(); }}
                    className="w-full text-xs py-2 rounded-lg font-semibold transition-colors"
                    style={{ background: 'rgba(100,116,139,0.15)', border: '1px solid rgba(100,116,139,0.3)', color: '#94a3b8' }}
                    disabled={!importForm.name || !importForm.url}
                  >Import</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'ai-optimize' && (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
          {/* Feed Health Audit */}
          <div className="rounded-2xl overflow-hidden animate-fade-in" style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.14)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: feedAudit ? '1px solid rgba(99,102,241,0.08)' : 'none' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.12)' }}>
                  <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Feed Health Audit</p>
                  <p className="text-xs text-gray-500">AI-powered analysis of your product feed quality</p>
                </div>
              </div>
              <button className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.22)' }}
                disabled={auditLoading}
                onClick={async () => {
                  setAuditLoading(true);
                  try {
                    const result = await postJSON('/api/product-feeds/audit-feed', {
                      product_count: products.length,
                      sample_product: products[0] || {}
                    });
                    setFeedAudit(result);
                  } catch {}
                  setAuditLoading(false);
                }}>{auditLoading ? 'Auditing...' : 'Run Audit'}</button>
            </div>
            {feedAudit && (
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-4xl font-black" style={{ color: feedAudit.health_score >= 80 ? '#22c55e' : feedAudit.health_score >= 60 ? '#818cf8' : '#ef4444' }}>{feedAudit.health_score}</div>
                    <p className="hud-label text-[10px]">HEALTH SCORE</p>
                  </div>
                  {feedAudit.estimated_reach_improvement && (
                    <div className="chip" style={{ color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)' }}>
                      {feedAudit.estimated_reach_improvement}
                    </div>
                  )}
                </div>
                {feedAudit.checks?.length > 0 && (
                  <div>
                    <p className="hud-label text-[10px] mb-2">CHECKS</p>
                    <div className="space-y-1.5">
                      {feedAudit.checks.map((check, i) => (
                        <div key={i} className="flex items-start gap-3 py-2 px-3 rounded-lg text-sm" style={{ background: 'rgba(255,255,255,0.02)' }}>
                          <span>{check.status === 'pass' ? '✅' : check.status === 'warning' ? '⚠️' : '❌'}</span>
                          <div className="flex-1">
                            <span className="font-medium text-gray-200">{check.name}</span>
                            {check.issue && <p className="text-xs text-red-400 mt-0.5">{check.issue}</p>}
                            {check.fix && check.status !== 'pass' && <p className="text-xs text-emerald-400 mt-0.5">Fix: {check.fix}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {feedAudit.critical_fixes?.length > 0 && (
                  <div>
                    <p className="hud-label text-[10px] mb-2">CRITICAL FIXES</p>
                    <div className="space-y-1">
                      {feedAudit.critical_fixes.map((fix, i) => (
                        <p key={i} className="text-xs text-red-400">• {fix}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">{AI_TOOLS.map(t => (<button key={t.name} onClick={() => generate(t)} disabled={generating} className="panel-interactive rounded-2xl p-4 sm:p-6 text-left"><p className="text-sm font-bold text-gray-200">{t.name}</p><p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.prompt}</p></button>))}</div>
          {(generating || output) && <div className="panel rounded-2xl p-4 sm:p-7"><div className="flex items-center gap-2 mb-3"><div className={`w-2 h-2 rounded-full ${generating ? 'bg-slate-400 animate-pulse' : 'bg-emerald-400'}`} /><span className="hud-label text-[11px]" style={{ color: generating ? '#94a3b8' : '#4ade80' }}>{generating ? 'OPTIMIZING...' : 'OPTIMIZATION READY'}</span></div><pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 bg-slate-400 ml-0.5 animate-pulse" />}</pre></div>}
        </div>
      )}
      <AIInsightsPanel moduleId="product-feeds" />
    </div>
  );
}
