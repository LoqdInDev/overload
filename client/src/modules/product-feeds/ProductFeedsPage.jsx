import { useState } from 'react';

const CHANNELS = [
  { id: 'google', name: 'Google Shopping', color: '#4285F4' },
  { id: 'meta', name: 'Meta Catalog', color: '#0668E1' },
  { id: 'tiktok', name: 'TikTok Shop', color: '#ff0050' },
  { id: 'amazon', name: 'Amazon', color: '#FF9900' },
  { id: 'shopify', name: 'Shopify', color: '#96bf48' },
];

const MOCK_PRODUCTS = [
  { id: 1, name: 'Wireless Earbuds Pro', sku: 'WEP-001', price: 79.99, stock: 234, status: 'active', channels: ['google', 'meta', 'amazon'] },
  { id: 2, name: 'Smart Watch Ultra', sku: 'SWU-002', price: 299.99, stock: 89, status: 'active', channels: ['google', 'meta', 'tiktok', 'amazon'] },
  { id: 3, name: 'Laptop Stand Adjustable', sku: 'LSA-003', price: 49.99, stock: 567, status: 'active', channels: ['google', 'amazon'] },
  { id: 4, name: 'USB-C Hub 7-in-1', sku: 'UCH-004', price: 34.99, stock: 0, status: 'out_of_stock', channels: ['google', 'meta'] },
  { id: 5, name: 'Mechanical Keyboard RGB', sku: 'MKR-005', price: 129.99, stock: 45, status: 'active', channels: ['google', 'meta', 'amazon', 'shopify'] },
  { id: 6, name: 'Noise Cancelling Headphones', sku: 'NCH-006', price: 199.99, stock: 12, status: 'low_stock', channels: ['google', 'amazon'] },
];

const AI_TOOLS = [
  { name: 'Optimize Titles', prompt: 'Optimize these product titles for search visibility and click-through rate across shopping channels' },
  { name: 'Generate Descriptions', prompt: 'Write compelling, SEO-optimized product descriptions for shopping feed listings' },
  { name: 'Keyword Enhancement', prompt: 'Suggest high-converting search terms and keywords for product feed optimization' },
  { name: 'Feed Audit', prompt: 'Audit this product feed for common issues: missing fields, poor titles, low-quality descriptions, policy violations' },
];

export default function ProductFeedsPage() {
  const [tab, setTab] = useState('products');
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [search, setSearch] = useState('');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');

  const filtered = MOCK_PRODUCTS.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.sku.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedChannel && !p.channels.includes(selectedChannel)) return false;
    return true;
  });

  const totalActive = MOCK_PRODUCTS.filter(p => p.status === 'active').length;
  const totalChannels = new Set(MOCK_PRODUCTS.flatMap(p => p.channels)).size;

  const generate = async (tool) => {
    setGenerating(true); setOutput('');
    const productList = filtered.slice(0, 5).map(p => `${p.name} (${p.sku}) - $${p.price}`).join('\n');
    try {
      const res = await fetch('/api/product-feeds/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'optimize', prompt: `${tool.prompt}\n\nProducts:\n${productList}` }) });
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) { const { done, value } = await reader.read(); if (done) break; const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { try { const d = JSON.parse(line.slice(6)); if (d.type === 'chunk') setOutput(p => p + d.text); else if (d.type === 'result') setOutput(d.data.content); } catch {} } }
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  const statusBadge = (status) => {
    const styles = { active: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' }, out_of_stock: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' }, low_stock: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' } };
    const s = styles[status] || styles.active;
    return <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.text} border ${s.border}`}>{status.replace('_', ' ')}</span>;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-12">
      <div className="mb-6 sm:mb-8 animate-fade-in"><p className="hud-label text-[11px] mb-2" style={{ color: '#64748b' }}>PRODUCT FEEDS</p><h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Product Feed Manager</h1></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[{ l: 'TOTAL PRODUCTS', v: MOCK_PRODUCTS.length }, { l: 'ACTIVE', v: totalActive }, { l: 'CHANNELS', v: totalChannels }, { l: 'OUT OF STOCK', v: MOCK_PRODUCTS.filter(p => p.status === 'out_of_stock').length }].map((s, i) => (
          <div key={i} className="panel rounded-2xl p-4 sm:p-6"><p className="hud-label text-[11px] mb-1">{s.l}</p><p className="text-xl sm:text-2xl font-bold text-white font-mono">{s.v}</p></div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 mb-6">
        {['products', 'channels', 'ai-optimize'].map(t => (<button key={t} onClick={() => setTab(t)} className={`chip text-[10px] ${tab === t ? 'active' : ''}`} style={tab === t ? { background: 'rgba(100,116,139,0.15)', borderColor: 'rgba(100,116,139,0.3)', color: '#94a3b8' } : {}}>{t === 'ai-optimize' ? 'AI Optimize' : t.charAt(0).toUpperCase() + t.slice(1)}</button>))}
      </div>

      {tab === 'products' && (
        <div className="animate-fade-in">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 mb-6">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="input-field rounded-xl px-5 py-3 text-base flex-1" />
            <div className="flex flex-wrap gap-1">
              <button onClick={() => setSelectedChannel(null)} className={`chip text-[9px] ${!selectedChannel ? 'active' : ''}`} style={!selectedChannel ? { background: 'rgba(100,116,139,0.15)', borderColor: 'rgba(100,116,139,0.3)', color: '#94a3b8' } : {}}>All</button>
              {CHANNELS.map(c => (<button key={c.id} onClick={() => setSelectedChannel(selectedChannel === c.id ? null : c.id)} className={`chip text-[9px] ${selectedChannel === c.id ? 'active' : ''}`} style={selectedChannel === c.id ? { background: `${c.color}15`, borderColor: `${c.color}30`, color: c.color } : {}}>{c.name.split(' ')[0]}</button>))}
            </div>
          </div>
          <div className="panel rounded-2xl overflow-hidden overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-[1fr_80px_80px_60px_auto_80px] px-4 sm:px-6 py-3 border-b border-indigo-500/[0.06] text-xs font-bold text-gray-500">
                <span>PRODUCT</span><span>SKU</span><span className="text-right">PRICE</span><span className="text-right">STOCK</span><span className="text-center">CHANNELS</span><span className="text-center">STATUS</span>
              </div>
              {filtered.map(p => (
                <div key={p.id} className="grid grid-cols-[1fr_80px_80px_60px_auto_80px] items-center px-4 sm:px-6 py-4 border-b border-indigo-500/[0.03] hover:bg-white/[0.01] transition-colors">
                  <span className="text-sm font-semibold text-gray-200 truncate">{p.name}</span>
                  <span className="text-xs text-gray-500 font-mono">{p.sku}</span>
                  <span className="text-sm text-gray-300 font-mono text-right">${p.price}</span>
                  <span className={`text-sm font-mono text-right ${p.stock === 0 ? 'text-red-400' : p.stock < 20 ? 'text-yellow-400' : 'text-gray-400'}`}>{p.stock}</span>
                  <div className="flex gap-1 justify-center">{p.channels.map(c => { const ch = CHANNELS.find(x => x.id === c); return <div key={c} className="w-2 h-2 rounded-full" title={ch?.name} style={{ background: ch?.color }} />; })}</div>
                  <div className="text-center">{statusBadge(p.status)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'channels' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 animate-fade-in stagger">
          {CHANNELS.map(c => {
            const count = MOCK_PRODUCTS.filter(p => p.channels.includes(c.id)).length;
            return (
              <div key={c.id} className="panel rounded-2xl p-4 sm:p-6">
                <div className="flex items-center gap-3 sm:gap-5 mb-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${c.color}15`, border: `1px solid ${c.color}25` }}><span className="text-sm font-bold" style={{ color: c.color }}>{c.name[0]}</span></div><div><p className="text-base font-bold text-gray-200">{c.name}</p><p className="text-xs text-gray-500">{count} products synced</p></div></div>
                <div className="h-1.5 rounded-full bg-white/[0.03] overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${(count / MOCK_PRODUCTS.length) * 100}%`, background: c.color }} /></div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'ai-optimize' && (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">{AI_TOOLS.map(t => (<button key={t.name} onClick={() => generate(t)} disabled={generating} className="panel-interactive rounded-2xl p-4 sm:p-6 text-left"><p className="text-sm font-bold text-gray-200">{t.name}</p><p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.prompt}</p></button>))}</div>
          {(generating || output) && <div className="panel rounded-2xl p-4 sm:p-7"><div className="flex items-center gap-2 mb-3"><div className={`w-2 h-2 rounded-full ${generating ? 'bg-slate-400 animate-pulse' : 'bg-emerald-400'}`} /><span className="hud-label text-[11px]" style={{ color: generating ? '#94a3b8' : '#4ade80' }}>{generating ? 'OPTIMIZING...' : 'OPTIMIZATION READY'}</span></div><pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 bg-slate-400 ml-0.5 animate-pulse" />}</pre></div>}
        </div>
      )}
    </div>
  );
}
