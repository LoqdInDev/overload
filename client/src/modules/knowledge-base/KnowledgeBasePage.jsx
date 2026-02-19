import { useState } from 'react';

const MODULE_COLOR = '#3b82f6';

const AI_TEMPLATES = [
  { name: 'Generate Help Article', prompt: 'Write a comprehensive help article with clear title, introduction, step-by-step instructions with screenshots placeholders, tips, and related articles section' },
  { name: 'Create FAQ Section', prompt: 'Generate a FAQ section with 8-10 common questions and detailed answers, organized by topic, with searchable keywords for each entry' },
  { name: 'Write Troubleshooting Guide', prompt: 'Create a troubleshooting guide with problem description, diagnostic steps, common solutions, escalation path, and preventive measures' },
  { name: 'Build Onboarding Guide', prompt: 'Design a comprehensive onboarding guide for new users including getting started steps, key features walkthrough, best practices, and success milestones' },
];

const MOCK_ARTICLES = [
  { id: 1, title: 'Getting Started with Your Dashboard', category: 'Getting Started', status: 'published', views: 8420, helpful: 94, updated: '2026-02-18' },
  { id: 2, title: 'How to Connect Your First Integration', category: 'Integrations', status: 'published', views: 5680, helpful: 91, updated: '2026-02-15' },
  { id: 3, title: 'Understanding Analytics Reports', category: 'Analytics', status: 'published', views: 4320, helpful: 88, updated: '2026-02-12' },
  { id: 4, title: 'Managing Team Members & Permissions', category: 'Account', status: 'published', views: 3190, helpful: 92, updated: '2026-02-10' },
  { id: 5, title: 'Billing & Subscription FAQ', category: 'Billing', status: 'published', views: 6740, helpful: 85, updated: '2026-02-08' },
  { id: 6, title: 'API Authentication Guide', category: 'Developer', status: 'draft', views: 0, helpful: 0, updated: '2026-02-19' },
  { id: 7, title: 'Troubleshooting Common Errors', category: 'Troubleshooting', status: 'published', views: 7890, helpful: 79, updated: '2026-02-05' },
  { id: 8, title: 'Advanced Automation Workflows', category: 'Advanced', status: 'review', views: 0, helpful: 0, updated: '2026-02-17' },
];

const MOCK_CATEGORIES = [
  { id: 1, name: 'Getting Started', articles: 12, icon: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z' },
  { id: 2, name: 'Account', articles: 8, icon: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z' },
  { id: 3, name: 'Integrations', articles: 15, icon: 'M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.556a4.5 4.5 0 00-6.364-6.364L4.5 8.257m8.386-.822l4.5 4.5' },
  { id: 4, name: 'Analytics', articles: 10, icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z' },
  { id: 5, name: 'Billing', articles: 6, icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z' },
  { id: 6, name: 'Troubleshooting', articles: 14, icon: 'M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l5.653-4.655m3.586-3.586a2.548 2.548 0 013.586 3.586m-6.586 4.586l4.586-4.586' },
  { id: 7, name: 'Developer', articles: 9, icon: 'M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5' },
  { id: 8, name: 'Advanced', articles: 7, icon: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z' },
];

export default function KnowledgeBasePage() {
  const [tab, setTab] = useState('overview');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const generate = async (template) => {
    setSelectedTemplate(template); setGenerating(true); setOutput('');
    try {
      const res = await fetch('/api/knowledge-base/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'content', prompt: template.prompt }) });
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) { const { done, value } = await reader.read(); if (done) break; const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { try { const d = JSON.parse(line.slice(6)); if (d.type === 'chunk') setOutput(p => p + d.text); else if (d.type === 'result') setOutput(d.data.content); } catch {} } }
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  const statusColor = (s) => s === 'published' ? '#22c55e' : s === 'draft' ? '#6b7280' : '#f59e0b';
  const totalViews = MOCK_ARTICLES.reduce((a, ar) => a + ar.views, 0);
  const avgHelpful = (MOCK_ARTICLES.filter(a => a.helpful > 0).reduce((a, ar) => a + ar.helpful, 0) / MOCK_ARTICLES.filter(a => a.helpful > 0).length).toFixed(0);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6 animate-fade-in">
        <p className="hud-label mb-2" style={{ color: MODULE_COLOR }}>KNOWLEDGE BASE</p>
        <h1 className="text-2xl font-bold text-white mb-1">Knowledge Base</h1>
        <p className="text-sm text-gray-500">Create and manage help articles, guides, and documentation</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 stagger">
        {[
          { label: 'TOTAL ARTICLES', value: MOCK_ARTICLES.length.toString(), sub: `${MOCK_ARTICLES.filter(a => a.status === 'published').length} published` },
          { label: 'CATEGORIES', value: MOCK_CATEGORIES.length.toString(), sub: `${MOCK_CATEGORIES.reduce((a, c) => a + c.articles, 0)} total articles` },
          { label: 'TOTAL VIEWS', value: `${(totalViews / 1000).toFixed(1)}K`, sub: 'Last 30 days' },
          { label: 'HELPFUL RATING', value: `${avgHelpful}%`, sub: 'Average across articles' },
        ].map((s, i) => (
          <div key={i} className="panel rounded-xl p-4">
            <p className="hud-label mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-white font-mono">{s.value}</p>
            <p className="text-[10px] text-gray-500 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        {['overview', 'articles', 'categories', 'ai-tools'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: `${MODULE_COLOR}20`, borderColor: `${MODULE_COLOR}40`, color: MODULE_COLOR } : {}}>
            {t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1).replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="animate-fade-in space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="panel rounded-xl p-4">
              <p className="hud-label mb-3" style={{ color: MODULE_COLOR }}>MOST VIEWED ARTICLES</p>
              <div className="space-y-2">
                {MOCK_ARTICLES.filter(a => a.views > 0).sort((a, b) => b.views - a.views).slice(0, 5).map((a, i) => (
                  <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-indigo-500/[0.04] last:border-0">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-gray-600 w-4">{i + 1}.</span>
                      <span className="text-xs text-gray-300 truncate">{a.title}</span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-500 ml-2">{a.views.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel rounded-xl p-4">
              <p className="hud-label mb-3" style={{ color: MODULE_COLOR }}>ARTICLES BY STATUS</p>
              <div className="space-y-3">
                {[
                  { status: 'Published', count: MOCK_ARTICLES.filter(a => a.status === 'published').length, color: '#22c55e' },
                  { status: 'Draft', count: MOCK_ARTICLES.filter(a => a.status === 'draft').length, color: '#6b7280' },
                  { status: 'In Review', count: MOCK_ARTICLES.filter(a => a.status === 'review').length, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      <span className="text-xs text-gray-300">{s.status}</span>
                    </div>
                    <span className="text-sm font-bold font-mono text-white">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="panel rounded-xl p-4">
            <p className="hud-label mb-3" style={{ color: MODULE_COLOR }}>POPULAR CATEGORIES</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {MOCK_CATEGORIES.slice(0, 4).map(cat => (
                <div key={cat.id} className="bg-white/[0.02] rounded-lg p-3 border border-indigo-500/[0.06] text-center">
                  <svg className="w-5 h-5 mx-auto mb-2" style={{ color: MODULE_COLOR }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={cat.icon} />
                  </svg>
                  <p className="text-xs font-bold text-gray-300">{cat.name}</p>
                  <p className="text-[10px] text-gray-500">{cat.articles} articles</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Articles */}
      {tab === 'articles' && (
        <div className="animate-fade-in">
          <div className="panel rounded-xl overflow-hidden">
            <div className="divide-y divide-indigo-500/[0.04]">
              {MOCK_ARTICLES.map(a => (
                <div key={a.id} className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.01] transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-300">{a.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-500">{a.category}</span>
                      <span className="text-[10px] text-gray-600">&middot; Updated {a.updated}</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${statusColor(a.status)}15`, color: statusColor(a.status), border: `1px solid ${statusColor(a.status)}25` }}>
                    {a.status}
                  </span>
                  {a.views > 0 && (
                    <div className="text-right hidden md:block">
                      <p className="text-[10px] font-mono text-gray-400">{a.views.toLocaleString()}</p>
                      <p className="text-[9px] text-gray-600">views</p>
                    </div>
                  )}
                  {a.helpful > 0 && (
                    <div className="text-right hidden md:block">
                      <p className="text-[10px] font-mono" style={{ color: a.helpful > 85 ? '#22c55e' : '#f59e0b' }}>{a.helpful}%</p>
                      <p className="text-[9px] text-gray-600">helpful</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Categories */}
      {tab === 'categories' && (
        <div className="animate-fade-in grid grid-cols-2 md:grid-cols-4 gap-3">
          {MOCK_CATEGORIES.map(cat => (
            <div key={cat.id} className="panel rounded-xl p-4 hover:border-blue-500/20 transition-all cursor-pointer text-center">
              <div className="w-10 h-10 rounded-lg mx-auto mb-3 flex items-center justify-center" style={{ background: `${MODULE_COLOR}15`, border: `1px solid ${MODULE_COLOR}20` }}>
                <svg className="w-5 h-5" style={{ color: MODULE_COLOR }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={cat.icon} />
                </svg>
              </div>
              <p className="text-sm font-bold text-gray-200">{cat.name}</p>
              <p className="text-[10px] text-gray-500 mt-1">{cat.articles} articles</p>
            </div>
          ))}
        </div>
      )}

      {/* AI Tools */}
      {tab === 'ai-tools' && (
        <div className="animate-fade-in space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {AI_TEMPLATES.map(tool => (
              <button key={tool.name} onClick={() => generate(tool)} disabled={generating} className={`panel-interactive rounded-xl p-4 text-left ${selectedTemplate?.name === tool.name ? 'border-blue-500/30' : ''}`}>
                <p className="text-xs font-bold text-gray-300">{tool.name}</p>
                <p className="text-[10px] text-gray-600 mt-1 line-clamp-2">{tool.prompt}</p>
              </button>
            ))}
          </div>
          {(generating || output) && (
            <div className="panel rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${generating ? 'animate-pulse' : ''}`} style={{ background: generating ? MODULE_COLOR : '#4ade80' }} />
                <span className="hud-label" style={{ color: generating ? MODULE_COLOR : '#4ade80' }}>{generating ? 'GENERATING...' : 'READY'}</span>
              </div>
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: MODULE_COLOR }} />}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
