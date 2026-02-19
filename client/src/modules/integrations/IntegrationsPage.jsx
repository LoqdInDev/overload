import { useState } from 'react';

const MOCK_CONNECTIONS = [
  { id: 1, name: 'Shopify', status: 'connected', lastSync: '2 min ago', type: 'ecommerce' },
  { id: 2, name: 'Google Ads', status: 'connected', lastSync: '5 min ago', type: 'ads' },
  { id: 3, name: 'Meta Ads', status: 'connected', lastSync: '5 min ago', type: 'ads' },
  { id: 4, name: 'Klaviyo', status: 'connected', lastSync: '12 min ago', type: 'email' },
  { id: 5, name: 'TikTok', status: 'connected', lastSync: '8 min ago', type: 'social' },
  { id: 6, name: 'Google Analytics', status: 'connected', lastSync: '3 min ago', type: 'analytics' },
  { id: 7, name: 'Stripe', status: 'connected', lastSync: '1 min ago', type: 'payments' },
  { id: 8, name: 'Slack', status: 'connected', lastSync: '15 min ago', type: 'messaging' },
];

const MOCK_AVAILABLE = [
  { name: 'HubSpot', description: 'CRM and marketing automation platform', category: 'CRM' },
  { name: 'Mailchimp', description: 'Email marketing and automation', category: 'Email' },
  { name: 'Zapier', description: 'Workflow automation across 5,000+ apps', category: 'Automation' },
  { name: 'Intercom', description: 'Customer messaging and support', category: 'Messaging' },
  { name: 'Segment', description: 'Customer data platform', category: 'Data' },
  { name: 'Mixpanel', description: 'Product analytics and tracking', category: 'Analytics' },
  { name: 'Airtable', description: 'Flexible database and project management', category: 'Productivity' },
  { name: 'Notion', description: 'Workspace for notes, docs, and projects', category: 'Productivity' },
  { name: 'Pinterest Ads', description: 'Visual discovery and advertising', category: 'Ads' },
  { name: 'Snapchat Ads', description: 'Social advertising for younger audiences', category: 'Ads' },
  { name: 'Twilio', description: 'SMS and communication APIs', category: 'Messaging' },
  { name: 'BigCommerce', description: 'Ecommerce platform for growing brands', category: 'Ecommerce' },
];

const AI_TEMPLATES = [
  { name: 'Integration Setup Guide', prompt: 'Create a step-by-step integration setup guide with data mapping recommendations and best practices' },
  { name: 'Data Mapping Helper', prompt: 'Generate a data mapping plan between connected platforms with field matching and transformation rules' },
  { name: 'Sync Troubleshooting', prompt: 'Diagnose common sync issues and provide troubleshooting steps for data integration problems' },
  { name: 'Automation Suggestions', prompt: 'Suggest automation workflows between connected integrations to streamline marketing operations' },
];

export default function IntegrationsPage() {
  const [tab, setTab] = useState('connected');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const generate = async (template) => {
    setSelectedTemplate(template); setGenerating(true); setOutput('');
    try {
      const res = await fetch('/api/integrations/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'content', prompt: template.prompt }) });
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) { const { done, value } = await reader.read(); if (done) break; const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { try { const d = JSON.parse(line.slice(6)); if (d.type === 'chunk') setOutput(p => p + d.text); else if (d.type === 'result') setOutput(d.data.content); } catch {} } }
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  const typeColors = { ecommerce: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', ads: 'text-orange-400 bg-orange-500/10 border-orange-500/20', email: 'text-violet-400 bg-violet-500/10 border-violet-500/20', social: 'text-pink-400 bg-pink-500/10 border-pink-500/20', analytics: 'text-blue-400 bg-blue-500/10 border-blue-500/20', payments: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', messaging: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6 animate-fade-in"><p className="hud-label mb-2" style={{ color: '#6366f1' }}>INTEGRATIONS</p><h1 className="text-2xl font-bold text-white mb-1">Integrations</h1><p className="text-sm text-gray-500">Connect your tools and sync data across platforms</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 stagger">
        {[{ l: 'CONNECTED', v: '8' }, { l: 'AVAILABLE', v: '24' }, { l: 'SYNCS TODAY', v: '156' }, { l: 'ERRORS', v: '0' }].map((s, i) => (<div key={i} className="panel rounded-xl p-4"><p className="hud-label mb-1">{s.l}</p><p className="text-2xl font-bold text-white font-mono">{s.v}</p></div>))}
      </div>
      <div className="flex gap-1 mb-4">
        {['connected', 'available', 'ai-tools'].map(t => (<button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.3)', color: '#818cf8' } : {}}>{t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1)}</button>))}
      </div>
      {tab === 'connected' && (<div className="space-y-2 animate-fade-in">{MOCK_CONNECTIONS.map(c => (<div key={c.id} className="panel rounded-xl p-4 flex items-center gap-4"><div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-xs font-bold text-indigo-400 flex-shrink-0">{c.name.charAt(0)}</div><div className="flex-1"><p className="text-sm font-semibold text-gray-200">{c.name}</p><p className="text-[10px] text-gray-500 mt-0.5">Last sync: {c.lastSync}</p></div><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${typeColors[c.type]}`}>{c.type}</span><span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{c.status}</span></div>))}</div>)}
      {tab === 'available' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-2 animate-fade-in">{MOCK_AVAILABLE.map((p, i) => (<div key={i} className="panel rounded-xl p-4 flex items-center gap-4"><div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-xs font-bold text-indigo-400 flex-shrink-0">{p.name.charAt(0)}</div><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-200">{p.name}</p><p className="text-[10px] text-gray-500 mt-0.5 truncate">{p.description}</p></div><span className="text-[9px] text-gray-500 font-mono">{p.category}</span><button className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10 transition-colors">Connect</button></div>))}</div>)}
      {tab === 'ai-tools' && (<div className="space-y-4 animate-fade-in"><div className="grid grid-cols-2 gap-2">{AI_TEMPLATES.map(t => (<button key={t.name} onClick={() => generate(t)} disabled={generating} className={`panel-interactive rounded-xl p-4 text-left ${selectedTemplate?.name === t.name ? 'border-indigo-500/20' : ''}`}><p className="text-xs font-bold text-gray-300">{t.name}</p><p className="text-[10px] text-gray-600 mt-1 line-clamp-2">{t.prompt}</p></button>))}</div>{(generating || output) && <div className="panel rounded-xl p-5"><div className="flex items-center gap-2 mb-3"><div className={`w-2 h-2 rounded-full ${generating ? 'bg-indigo-400 animate-pulse' : 'bg-indigo-400'}`} /><span className="hud-label" style={{ color: '#818cf8' }}>{generating ? 'GENERATING...' : 'READY'}</span></div><pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 bg-indigo-400 ml-0.5 animate-pulse" />}</pre></div>}</div>)}
    </div>
  );
}
