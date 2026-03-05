import { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchJSON, deleteJSON, connectSSE } from '../../lib/api';
import ModuleWrapper from '../../components/shared/ModuleWrapper';

const API_BASE = import.meta.env.VITE_API_URL || '';

const TOOLS = [
  { id: 'keywords', name: 'Keyword Research', icon: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z' },
  { id: 'meta', name: 'Meta Tag Generator', icon: 'M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5' },
  { id: 'optimize', name: 'Content Optimizer', icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id: 'titles', name: 'Blog Title Generator', icon: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z' },
  { id: 'schema', name: 'Schema Markup', icon: 'M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z' },
  { id: 'content-brief', name: 'Content Brief', icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z' },
];

// SERP Snippet Preview component
function SerpPreview({ title, description, url }) {
  const MAX_TITLE = 60;
  const MAX_DESC = 155;
  const titleLen = (title || '').length;
  const descLen = (description || '').length;

  return (
    <div className="panel rounded-xl p-4 mt-3">
      <p className="hud-label text-[10px] mb-3">SERP SNIPPET PREVIEW</p>
      <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: 600 }}>
        <p className="text-sm" style={{ color: '#1a0dab', marginBottom: 2 }}>{title || 'Your Page Title'}</p>
        <p className="text-xs" style={{ color: '#006621', marginBottom: 2 }}>{url || 'https://yoursite.com/page'}</p>
        <p className="text-xs" style={{ color: '#545454' }}>{description || 'Your meta description will appear here...'}</p>
      </div>
      <div className="flex gap-4 mt-2">
        <span className={`text-[10px] ${titleLen > MAX_TITLE ? 'text-red-400' : titleLen > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
          Title: {titleLen}/{MAX_TITLE}
        </span>
        <span className={`text-[10px] ${descLen > MAX_DESC ? 'text-red-400' : descLen > 140 ? 'text-amber-400' : 'text-emerald-400'}`}>
          Description: {descLen}/{MAX_DESC}
        </span>
      </div>
    </div>
  );
}

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
  const [audits, setAudits] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [gapYourKeywords, setGapYourKeywords] = useState('');
  const [gapCompetitor, setGapCompetitor] = useState('');
  const [gapOutput, setGapOutput] = useState('');
  const [gapLoading, setGapLoading] = useState(false);

  // Content Brief state
  const [briefKeyword, setBriefKeyword] = useState('');
  const [briefNiche, setBriefNiche] = useState('');
  const [briefOutput, setBriefOutput] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);
  const [briefCopied, setBriefCopied] = useState(false);
  const [briefCancelSSE, setBriefCancelSSE] = useState(null);

  // SERP Preview state
  const [serpTitle, setSerpTitle] = useState('');
  const [serpDescription, setSerpDescription] = useState('');
  const [serpUrl, setSerpUrl] = useState('');

  useEffect(() => {
    fetchJSON('/api/seo/audits').then(setAudits).catch(() => {});
    fetchJSON('/api/seo/keywords').then(setKeywords).catch(() => {});
  }, []);

  const deleteAudit = async (id) => {
    try {
      await deleteJSON(`/api/seo/audits/${id}`);
      setAudits(prev => prev.filter(a => a.id !== id));
    } catch (err) { console.error(err); }
  };

  const deleteKeyword = async (id) => {
    try {
      await deleteJSON(`/api/seo/keywords/${id}`);
      setKeywords(prev => prev.filter(k => k.id !== id));
    } catch (err) { console.error(err); }
  };

  const generate = () => {
    if (!prompt.trim()) return;
    setGenerating(true); setOutput('');
    connectSSE('/api/seo/generate', { type: activeTool, prompt: `[Tool: ${activeTool}] [Country: ${country}] [Intent: ${intent}]\n\n${prompt}` }, {
      onChunk: (t) => setOutput(p => p + t),
      onResult: (d) => { setOutput(d.content || ''); setGenerating(false); },
      onError: (e) => { console.error(e); setGenerating(false); },
      onDone: () => setGenerating(false),
    });
  };

  const copy = () => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  if (!activeTool) return (
    <div className="p-4 sm:p-6 lg:p-12">
      <ModuleWrapper moduleId="seo">
      <div className="mb-6 sm:mb-8 animate-fade-in">
        <p className="hud-label text-[11px] mb-2" style={{ color: '#14b8a6' }}>SEO SUITE</p>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Choose an SEO tool</h1>
        <p className="text-base text-gray-500">AI-powered SEO analysis, keyword research, and content optimization</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 stagger">
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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 stagger">
          {Object.entries(TEMPLATES).flatMap(([tool, tmpls]) => tmpls.slice(0, 1).map(t => (
            <button key={`${tool}-${t.name}`} onClick={() => { setActiveTool(tool); setPrompt(t.prompt); }} className="panel-interactive rounded-lg p-4 sm:p-6 text-left group">
              <p className="hud-label text-[11px] mb-1" style={{ color: '#14b8a6' }}>{TOOLS.find(x => x.id === tool)?.name}</p>
              <p className="text-xs font-semibold text-gray-300">{t.name}</p>
              <p className="text-xs text-gray-600 mt-1 line-clamp-1">{t.prompt}</p>
            </button>
          )))}
        </div>
      </div>
      {(audits.length > 0 || keywords.length > 0) && (
        <div className="mt-10 space-y-6">
          {audits.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3"><p className="hud-label text-[11px]">SAVED AUDITS</p><div className="flex-1 hud-line" /></div>
              <div className="panel rounded-2xl divide-y divide-indigo-500/[0.04]">
                {audits.map(a => (
                  <div key={a.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.01] transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-200 truncate">{a.url}</p>
                      {a.score != null && <p className="text-xs text-gray-500 mt-0.5">Score: {a.score}</p>}
                    </div>
                    <button onClick={() => deleteAudit(a.id)} className="ml-4 text-gray-600 hover:text-red-400 transition-colors text-lg leading-none flex-shrink-0" title="Delete audit">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {keywords.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3"><p className="hud-label text-[11px]">SAVED KEYWORDS</p><div className="flex-1 hud-line" /></div>
              <div className="panel rounded-2xl divide-y divide-indigo-500/[0.04]">
                {keywords.map(k => (
                  <div key={k.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.01] transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-200 truncate">{k.keyword}</p>
                      {k.intent && <p className="text-xs text-gray-500 mt-0.5">{k.intent}</p>}
                    </div>
                    <button onClick={() => deleteKeyword(k.id)} className="ml-4 text-gray-600 hover:text-red-400 transition-colors text-lg leading-none flex-shrink-0" title="Delete keyword">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <div className="rounded-2xl overflow-hidden mt-4 animate-fade-in" style={{ background: 'rgba(20,184,166,0.04)', border: '1px solid rgba(20,184,166,0.14)' }}>
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(20,184,166,0.08)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(20,184,166,0.12)' }}>
            <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" /></svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Keyword Gap Analysis</p>
            <p className="text-xs text-gray-500">Find keywords your competitors rank for that you don't</p>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <p className="hud-label text-[10px] mb-1.5">YOUR CURRENT KEYWORDS</p>
            <input className="input-field rounded-xl px-4 py-2.5 w-full text-sm" placeholder="e.g. digital marketing, email campaigns, social media" value={gapYourKeywords} onChange={e => setGapYourKeywords(e.target.value)} />
          </div>
          <div>
            <p className="hud-label text-[10px] mb-1.5">COMPETITOR DOMAIN</p>
            <input className="input-field rounded-xl px-4 py-2.5 w-full text-sm" placeholder="e.g. competitor.com" value={gapCompetitor} onChange={e => setGapCompetitor(e.target.value)} />
          </div>
          <button className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(20,184,166,0.12)', color: gapCompetitor ? '#2dd4bf' : 'rgba(45,212,191,0.35)', border: '1px solid rgba(20,184,166,0.2)' }}
            disabled={!gapCompetitor || gapLoading}
            onClick={() => {
              setGapOutput('');
              setGapLoading(true);
              connectSSE('/api/seo/keyword-gap',
                { your_keywords: gapYourKeywords.split(',').map(k => k.trim()).filter(Boolean), competitor_domain: gapCompetitor },
                {
                  onChunk: (text) => setGapOutput(prev => prev + text),
                  onResult: () => setGapLoading(false),
                  onError: () => setGapLoading(false),
                  onDone: () => setGapLoading(false),
                }
              );
            }}>{gapLoading ? 'Analyzing...' : 'Analyze Keyword Gap'}</button>
          {gapOutput && (
            <div className="rounded-xl p-4 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)' }}>
              {gapOutput}
              {gapLoading && <span className="inline-block w-1.5 h-4 bg-teal-400 ml-0.5 animate-pulse rounded-sm" />}
            </div>
          )}
        </div>
      </div>
      </ModuleWrapper>
    </div>
  );

  const tool = TOOLS.find(t => t.id === activeTool);
  const templates = TEMPLATES[activeTool] || [];

  // ─── CONTENT BRIEF VIEW ───
  if (activeTool === 'content-brief') {
    return (
      <div className="p-4 sm:p-6 lg:p-12 animate-fade-in">
        <ModuleWrapper moduleId="seo">
        <div className="flex items-center gap-3 sm:gap-5 mb-6 sm:mb-8">
          <button onClick={() => { setActiveTool(null); setBriefOutput(''); }} className="p-2 rounded-md border border-indigo-500/10 text-gray-500 hover:text-white transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
          </button>
          <div><p className="hud-label text-[11px]" style={{ color: '#14b8a6' }}>CONTENT BRIEF</p><h2 className="text-lg font-bold text-white">AI Content Brief Generator</h2></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Inputs */}
            <div className="panel rounded-2xl p-4 sm:p-6 space-y-4">
              <div>
                <label className="hud-label text-[10px] mb-2 block">TARGET KEYWORD <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. best project management software"
                  value={briefKeyword}
                  onChange={(e) => setBriefKeyword(e.target.value)}
                  className="w-full input-field rounded-xl px-4 py-3"
                />
              </div>
              <div>
                <label className="hud-label text-[10px] mb-2 block">NICHE (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. fitness, SaaS, e-commerce"
                  value={briefNiche}
                  onChange={(e) => setBriefNiche(e.target.value)}
                  className="w-full input-field rounded-xl px-4 py-3"
                />
              </div>
              <button
                className="btn-accent w-full py-3 rounded-lg"
                style={{ background: briefLoading ? '#1e1e2e' : '#14b8a6', boxShadow: briefLoading ? 'none' : '0 4px 20px -4px rgba(20,184,166,0.4)' }}
                disabled={briefLoading || !briefKeyword.trim()}
                onClick={() => {
                  if (briefLoading && briefCancelSSE) { briefCancelSSE(); return; }
                  setBriefOutput('');
                  setBriefLoading(true);
                  const cancel = connectSSE('/api/seo/generate-brief',
                    { keyword: briefKeyword.trim(), niche: briefNiche.trim() || undefined },
                    {
                      onChunk: (text) => setBriefOutput(prev => prev + text),
                      onResult: (data) => { if (data.content) setBriefOutput(data.content); setBriefLoading(false); },
                      onDone: () => setBriefLoading(false),
                      onError: () => setBriefLoading(false),
                    }
                  );
                  setBriefCancelSSE(() => cancel);
                }}
              >
                {briefLoading
                  ? <span className="flex items-center justify-center gap-2"><span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />GENERATING BRIEF...</span>
                  : 'GENERATE CONTENT BRIEF'}
              </button>
            </div>

            {/* Brief output */}
            {(briefLoading || briefOutput) && (
              <div className="panel rounded-2xl p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${briefLoading ? 'animate-pulse bg-teal-400' : 'bg-emerald-400'}`} />
                    <span className="hud-label text-[11px]" style={{ color: briefLoading ? '#2dd4bf' : '#4ade80' }}>
                      {briefLoading ? 'GENERATING...' : 'CONTENT BRIEF READY'}
                    </span>
                  </div>
                  {!briefLoading && briefOutput && (
                    <button
                      onClick={() => { navigator.clipboard.writeText(briefOutput); setBriefCopied(true); setTimeout(() => setBriefCopied(false), 2000); }}
                      className="chip text-[10px]"
                    >
                      {briefCopied ? 'Copied!' : 'Copy Brief'}
                    </button>
                  )}
                </div>
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed max-h-[600px] overflow-y-auto">
                  {briefOutput}
                  {briefLoading && <span className="inline-block w-1.5 h-4 bg-teal-400 ml-0.5 animate-pulse" />}
                </pre>
              </div>
            )}
          </div>

          {/* SERP Preview sidebar */}
          <div className="space-y-4">
            <div className="panel rounded-2xl p-4 sm:p-6 space-y-3">
              <p className="hud-label text-[10px]">SERP SNIPPET PREVIEW</p>
              <p className="text-[10px] text-gray-600">Preview how your page might appear in Google search results</p>
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">Page Title</label>
                <input
                  type="text"
                  placeholder="Your Page Title"
                  value={serpTitle}
                  onChange={(e) => setSerpTitle(e.target.value)}
                  className="w-full input-field rounded-lg px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">Meta Description</label>
                <textarea
                  placeholder="Your meta description..."
                  value={serpDescription}
                  onChange={(e) => setSerpDescription(e.target.value)}
                  rows={3}
                  className="w-full input-field rounded-lg px-3 py-2 text-xs resize-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">URL</label>
                <input
                  type="text"
                  placeholder="https://yoursite.com/page"
                  value={serpUrl}
                  onChange={(e) => setSerpUrl(e.target.value)}
                  className="w-full input-field rounded-lg px-3 py-2 text-xs"
                />
              </div>
              {(serpTitle || serpDescription || serpUrl) && (
                <SerpPreview title={serpTitle} description={serpDescription} url={serpUrl} />
              )}
            </div>
          </div>
        </div>
        </ModuleWrapper>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-12 animate-fade-in">
      <ModuleWrapper moduleId="seo">
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
      </ModuleWrapper>
    </div>
  );
}
