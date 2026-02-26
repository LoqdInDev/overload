import { useState } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';

const TOOLS = [
  { id: 'keywords', name: 'Keyword Research', icon: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z' },
  { id: 'meta', name: 'Meta Tag Generator', icon: 'M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5' },
  { id: 'optimize', name: 'Content Optimizer', icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'titles', name: 'Blog Title Generator', icon: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z' },
  { id: 'schema', name: 'Schema Markup', icon: 'M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z' },
];

const TEMPLATES = {
  keywords: [
    { name: 'E-commerce Product', prompt: 'Find high-intent buyer keywords for an e-commerce product' },
    { name: 'Blog Content Ideas', prompt: 'Research informational keywords for blog content planning' },
    { name: 'Local Business SEO', prompt: 'Find local search keywords with location modifiers' },
    { name: 'Competitor Gap', prompt: 'Identify keyword gaps between my site and competitors' },
  ],
  meta: [
    { name: 'Product Page', prompt: 'Generate SEO meta tags for a product page' },
    { name: 'Blog Post', prompt: 'Generate meta title, description, and OG tags for a blog post' },
    { name: 'Homepage', prompt: 'Create compelling homepage meta tags optimized for brand + primary keywords' },
    { name: 'Service Page', prompt: 'Generate service page meta tags with local SEO focus' },
  ],
  optimize: [
    { name: 'Blog Post Audit', prompt: 'Audit this blog post for on-page SEO issues and provide fixes' },
    { name: 'Product Description', prompt: 'Optimize this product description for search and conversions' },
    { name: 'Landing Page', prompt: 'Analyze this landing page copy for SEO score and improvements' },
    { name: 'About Page', prompt: 'Review and optimize this about page for E-E-A-T signals' },
  ],
  titles: [
    { name: 'How-To Guide', prompt: 'Generate 10 SEO-optimized how-to blog titles' },
    { name: 'Listicle', prompt: 'Generate 10 numbered listicle titles with power words' },
    { name: 'Comparison', prompt: 'Generate 10 comparison/vs blog titles' },
    { name: 'Ultimate Guide', prompt: 'Generate 10 comprehensive guide titles' },
  ],
  schema: [
    { name: 'Product Schema', prompt: 'Generate Product JSON-LD schema markup' },
    { name: 'Article Schema', prompt: 'Generate Article JSON-LD schema for a blog post' },
    { name: 'FAQ Schema', prompt: 'Generate FAQPage JSON-LD schema' },
    { name: 'Local Business', prompt: 'Generate LocalBusiness JSON-LD schema' },
  ],
};

const COUNTRIES = ['US', 'UK', 'CA', 'AU', 'DE', 'FR', 'IN'];
const INTENTS = ['Informational', 'Commercial', 'Navigational', 'Transactional'];

export default function SeoPage() {
  usePageTitle('SEO Suite');
  const [activeTool, setActiveTool] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [country, setCountry] = useState('US');
  const [intent, setIntent] = useState('Commercial');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true); setOutput('');
    try {
      const res = await fetch('/api/seo/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeTool, prompt: `[Tool: ${activeTool}] [Country: ${country}] [Intent: ${intent}]\n\n${prompt}` }),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          try { const d = JSON.parse(line.slice(6)); if (d.type === 'chunk') setOutput(p => p + d.text); else if (d.type === 'result') setOutput(d.data.content); } catch {}
        }
      }
    } catch (e) { console.error(e); }
    finally { setGenerating(false); }
  };

  const copy = () => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  if (!activeTool) return (
    <div className="p-4 sm:p-6 lg:p-12">
      <div className="mb-6 sm:mb-8 animate-fade-in">
        <p className="hud-label text-[11px] mb-2" style={{ color: '#14b8a6' }}>SEO SUITE</p>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Choose an SEO tool</h1>
        <p className="text-base text-gray-500">AI-powered SEO analysis, keyword research, and content optimization</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 stagger">
        {TOOLS.map(t => (
          <button key={t.id} onClick={() => setActiveTool(t.id)} className="panel-interactive rounded-2xl p-4 sm:p-7 text-center group">
            <div className="w-12 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.12)' }}>
              <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={t.icon} /></svg>
            </div>
            <p className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors">{t.name}</p>
          </button>
        ))}
      </div>
      <div className="mt-10">
        <div className="flex items-center gap-3 sm:gap-5 mb-4"><p className="hud-label text-[11px]">QUICK START</p><div className="flex-1 hud-line" /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 stagger">
          {Object.entries(TEMPLATES).flatMap(([tool, tmpls]) => tmpls.slice(0, 1).map(t => (
            <button key={`${tool}-${t.name}`} onClick={() => { setActiveTool(tool); setPrompt(t.prompt); }} className="panel-interactive rounded-lg p-4 sm:p-6 text-left group">
              <p className="hud-label text-[11px] mb-1" style={{ color: '#14b8a6' }}>{TOOLS.find(x => x.id === tool)?.name}</p>
              <p className="text-xs font-semibold text-gray-300">{t.name}</p>
              <p className="text-xs text-gray-600 mt-1 line-clamp-1">{t.prompt}</p>
            </button>
          )))}
        </div>
      </div>
    </div>
  );

  const tool = TOOLS.find(t => t.id === activeTool);
  const templates = TEMPLATES[activeTool] || [];

  return (
    <div className="p-4 sm:p-6 lg:p-12 animate-fade-in">
      <div className="flex items-center gap-3 sm:gap-5 mb-6 sm:mb-8">
        <button onClick={() => { setActiveTool(null); setOutput(''); setPrompt(''); }} className="p-2 rounded-md border border-indigo-500/10 text-gray-500 hover:text-white transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        </button>
        <div><p className="hud-label text-[11px]" style={{ color: '#14b8a6' }}>{tool?.name?.toUpperCase()}</p><h2 className="text-lg font-bold text-white">{tool?.name}</h2></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3">TEMPLATES</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {templates.map(t => (
                <button key={t.name} onClick={() => setPrompt(t.prompt)} className={`text-left px-4 py-3 rounded-lg border text-xs transition-all ${prompt === t.prompt ? 'border-teal-500/30 bg-teal-500/8 text-teal-300' : 'border-indigo-500/8 bg-white/[0.01] text-gray-400 hover:text-gray-200'}`}>
                  <p className="font-semibold">{t.name}</p><p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{t.prompt}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3">{activeTool === 'optimize' ? 'PASTE CONTENT' : 'DESCRIBE YOUR QUERY'}</p>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={activeTool === 'optimize' ? 6 : 3} placeholder={activeTool === 'optimize' ? 'Paste your content here for SEO analysis...' : 'Enter your topic, URL, or keyword...'} className="w-full input-field rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-base resize-none" />
          </div>
          <button onClick={generate} disabled={generating || !prompt.trim()} className="btn-accent w-full py-3 rounded-lg" style={{ background: generating ? '#1e1e2e' : '#14b8a6', boxShadow: generating ? 'none' : '0 4px 20px -4px rgba(20,184,166,0.4)' }}>
            {generating ? <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />ANALYZING...</span> : 'ANALYZE WITH AI'}
          </button>
        </div>
        <div className="space-y-4 sm:space-y-6">
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3">TARGET COUNTRY</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {COUNTRIES.map(c => (<button key={c} onClick={() => setCountry(c)} className={`chip text-[10px] justify-center ${country === c ? 'active' : ''}`} style={country === c ? { background: 'rgba(20,184,166,0.15)', borderColor: 'rgba(20,184,166,0.3)', color: '#2dd4bf' } : {}}>{c}</button>))}
            </div>
          </div>
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3">SEARCH INTENT</p>
            <div className="grid grid-cols-2 gap-1.5">
              {INTENTS.map(i => (<button key={i} onClick={() => setIntent(i)} className={`chip text-[10px] justify-center ${intent === i ? 'active' : ''}`} style={intent === i ? { background: 'rgba(20,184,166,0.15)', borderColor: 'rgba(20,184,166,0.3)', color: '#2dd4bf' } : {}}>{i}</button>))}
            </div>
          </div>
        </div>
      </div>
      {output && (
        <div className="mt-6 animate-fade-up">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-teal-400" /><span className="hud-label text-[11px]" style={{ color: '#2dd4bf' }}>{generating ? 'ANALYZING...' : 'RESULTS'}</span></div>
            {!generating && <div className="flex flex-wrap gap-2"><button onClick={copy} className="chip text-[10px]">{copied ? 'Copied!' : 'Copy'}</button><button onClick={generate} className="chip text-[10px]">Regenerate</button></div>}
          </div>
          <div className="panel rounded-2xl p-4 sm:p-7"><pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 bg-teal-400 ml-0.5 animate-pulse" />}</pre></div>
        </div>
      )}
    </div>
  );
}
