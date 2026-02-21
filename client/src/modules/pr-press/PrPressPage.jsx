import { useState } from 'react';

const MODULE_COLOR = '#be185d';

const AI_TEMPLATES = [
  { name: 'Generate Press Release', prompt: 'Write a professional press release announcing a new product launch with headline, subhead, dateline, body paragraphs, boilerplate, and media contact info' },
  { name: 'Write Media Pitch', prompt: 'Craft a compelling media pitch email to journalists that hooks with a newsworthy angle, includes key stats, and closes with a clear ask' },
  { name: 'Create PR Campaign', prompt: 'Design a full PR campaign strategy including objectives, target media outlets, key messages, timeline, and distribution plan' },
  { name: 'Build Media List', prompt: 'Generate a targeted media list with journalist names, outlets, beats, and personalized pitch angles for each contact' },
];

const MOCK_RELEASES = [
  { id: 1, title: 'Q1 Product Launch Announcement', status: 'published', date: '2026-02-15', outlet: 'PR Newswire', views: 12400 },
  { id: 2, title: 'Strategic Partnership with TechCorp', status: 'draft', date: '2026-02-18', outlet: '--', views: 0 },
  { id: 3, title: 'Annual Revenue Milestone Press Release', status: 'scheduled', date: '2026-02-25', outlet: 'Business Wire', views: 0 },
  { id: 4, title: 'New VP of Marketing Appointment', status: 'published', date: '2026-02-10', outlet: 'GlobeNewswire', views: 8730 },
  { id: 5, title: 'Sustainability Initiative Launch', status: 'review', date: '2026-02-20', outlet: 'PR Newswire', views: 0 },
];

const MOCK_CONTACTS = [
  { id: 1, name: 'Jessica Martinez', outlet: 'TechCrunch', beat: 'Startups & Funding', email: 'jmartinez@techcrunch.com', status: 'active' },
  { id: 2, name: 'David Chen', outlet: 'Forbes', beat: 'Enterprise Tech', email: 'dchen@forbes.com', status: 'active' },
  { id: 3, name: 'Rachel Kim', outlet: 'The Verge', beat: 'Consumer Tech', email: 'rkim@theverge.com', status: 'pitched' },
  { id: 4, name: 'Marcus Johnson', outlet: 'Bloomberg', beat: 'Business & Finance', email: 'mjohnson@bloomberg.com', status: 'responded' },
  { id: 5, name: 'Sarah O\'Brien', outlet: 'Wired', beat: 'Innovation', email: 'sobrien@wired.com', status: 'active' },
  { id: 6, name: 'Tom Nakamura', outlet: 'Reuters', beat: 'Technology', email: 'tnakamura@reuters.com', status: 'pitched' },
];

export default function PrPressPage() {
  const [tab, setTab] = useState('overview');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const generate = async (template) => {
    setSelectedTemplate(template); setGenerating(true); setOutput('');
    try {
      const res = await fetch('/api/pr-press/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'content', prompt: template.prompt }) });
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) { const { done, value } = await reader.read(); if (done) break; const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { try { const d = JSON.parse(line.slice(6)); if (d.type === 'chunk') setOutput(p => p + d.text); else if (d.type === 'result') setOutput(d.data.content); } catch {} } }
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  const statusColor = (s) => s === 'published' ? '#22c55e' : s === 'draft' ? '#6b7280' : s === 'scheduled' ? '#3b82f6' : '#f59e0b';
  const contactStatusColor = (s) => s === 'active' ? '#22c55e' : s === 'pitched' ? '#f59e0b' : '#3b82f6';

  return (
    <div className="p-4 sm:p-6 lg:p-12">
      <div className="mb-6 sm:mb-8 animate-fade-in">
        <p className="hud-label text-[11px] mb-2" style={{ color: MODULE_COLOR }}>PR & PRESS</p>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Public Relations Hub</h1>
        <p className="text-base text-gray-500">Manage press releases, media contacts, and PR campaigns</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[
          { label: 'ACTIVE RELEASES', value: '12', sub: '3 published this month' },
          { label: 'MEDIA CONTACTS', value: '284', sub: '+18 new this week' },
          { label: 'PITCHES SENT', value: '47', sub: '68% open rate' },
          { label: 'COVERAGE SCORE', value: '8.4', sub: '+1.2 vs last month' },
        ].map((s, i) => (
          <div key={i} className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-1">{s.label}</p>
            <p className="text-xl sm:text-2xl font-bold text-white font-mono">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 sm:mb-8">
        {['overview', 'releases', 'contacts', 'ai-tools'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`chip text-xs ${tab === t ? 'active' : ''}`} style={tab === t ? { background: `${MODULE_COLOR}20`, borderColor: `${MODULE_COLOR}40`, color: MODULE_COLOR } : {}}>
            {t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1).replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="animate-fade-in space-y-4 sm:space-y-6">
          <div className="panel rounded-2xl p-4 sm:p-6">
            <div className="flex items-center gap-3 sm:gap-5 mb-4 sm:mb-6">
              <p className="hud-label text-[11px]" style={{ color: MODULE_COLOR }}>RECENT ACTIVITY</p>
              <div className="flex-1 hud-line" />
            </div>
            <div className="space-y-4">
              {[
                { text: 'Press release "Q1 Product Launch" published on PR Newswire', time: '2 hours ago' },
                { text: 'Rachel Kim (The Verge) opened your pitch email', time: '5 hours ago' },
                { text: 'Marcus Johnson (Bloomberg) replied to outreach', time: '1 day ago' },
                { text: 'New media contact added: Tom Nakamura, Reuters', time: '2 days ago' },
              ].map((a, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: MODULE_COLOR }} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-300">{a.text}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="panel rounded-2xl p-4 sm:p-6">
              <p className="hud-label text-[11px] mb-4" style={{ color: MODULE_COLOR }}>TOP PERFORMING RELEASES</p>
              {MOCK_RELEASES.filter(r => r.status === 'published').map(r => (
                <div key={r.id} className="flex items-center justify-between py-3 border-b border-indigo-500/[0.04] last:border-0">
                  <p className="text-sm text-gray-300 truncate flex-1">{r.title}</p>
                  <span className="text-xs font-mono font-bold" style={{ color: MODULE_COLOR }}>{r.views.toLocaleString()} views</span>
                </div>
              ))}
            </div>
            <div className="panel rounded-2xl p-4 sm:p-6">
              <p className="hud-label text-[11px] mb-4" style={{ color: MODULE_COLOR }}>PITCH PIPELINE</p>
              <div className="space-y-3">
                {[{ stage: 'Sent', count: 47, pct: 100 }, { stage: 'Opened', count: 32, pct: 68 }, { stage: 'Replied', count: 14, pct: 30 }, { stage: 'Published', count: 8, pct: 17 }].map((p, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">{p.stage}</span>
                      <span className="text-gray-500 font-mono">{p.count}</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${p.pct}%`, background: MODULE_COLOR }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Releases */}
      {tab === 'releases' && (
        <div className="animate-fade-in">
          <div className="panel rounded-2xl overflow-hidden">
            <div className="divide-y divide-indigo-500/[0.04]">
              {MOCK_RELEASES.map(r => (
                <div key={r.id} className="flex items-center gap-6 px-6 py-4 hover:bg-white/[0.01] transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-300 truncate">{r.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{r.outlet} &middot; {r.date}</p>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${statusColor(r.status)}15`, color: statusColor(r.status), border: `1px solid ${statusColor(r.status)}25` }}>
                    {r.status}
                  </span>
                  {r.views > 0 && <span className="text-xs font-mono text-gray-500">{r.views.toLocaleString()} views</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Contacts */}
      {tab === 'contacts' && (
        <div className="animate-fade-in">
          <div className="panel rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[1fr_120px_120px_100px_60px] gap-3 px-6 py-3 border-b border-indigo-500/[0.06]">
              {['Name', 'Outlet', 'Beat', 'Email', 'Status'].map(h => (
                <p key={h} className="text-[9px] font-bold text-gray-600 uppercase tracking-wider">{h}</p>
              ))}
            </div>
            <div className="divide-y divide-indigo-500/[0.04]">
              {MOCK_CONTACTS.map(c => (
                <div key={c.id} className="grid grid-cols-[1fr_120px_120px_100px_60px] gap-3 items-center px-6 py-4 hover:bg-white/[0.01] transition-colors">
                  <p className="text-sm font-semibold text-gray-300 truncate">{c.name}</p>
                  <p className="text-xs text-gray-400 truncate">{c.outlet}</p>
                  <p className="text-xs text-gray-500 truncate">{c.beat}</p>
                  <p className="text-xs text-gray-600 truncate">{c.email}</p>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-center" style={{ background: `${contactStatusColor(c.status)}15`, color: contactStatusColor(c.status), border: `1px solid ${contactStatusColor(c.status)}25` }}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI Tools */}
      {tab === 'ai-tools' && (
        <div className="animate-fade-in space-y-4 sm:space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {AI_TEMPLATES.map(tool => (
              <button key={tool.name} onClick={() => generate(tool)} disabled={generating} className={`panel-interactive rounded-xl p-4 sm:p-6 text-left ${selectedTemplate?.name === tool.name ? 'border-pink-700/30' : ''}`}>
                <p className="text-sm font-bold text-gray-300">{tool.name}</p>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{tool.prompt}</p>
              </button>
            ))}
          </div>
          {(generating || output) && (
            <div className="panel rounded-2xl p-4 sm:p-7">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-2.5 h-2.5 rounded-full ${generating ? 'animate-pulse' : ''}`} style={{ background: generating ? MODULE_COLOR : '#4ade80' }} />
                <span className="hud-label text-[11px]" style={{ color: generating ? MODULE_COLOR : '#4ade80' }}>{generating ? 'GENERATING...' : 'READY'}</span>
              </div>
              <pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: MODULE_COLOR }} />}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
