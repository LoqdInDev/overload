import { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchJSON, postJSON, connectSSE, deleteJSON, putJSON } from '../../lib/api';
import AIInsightsPanel from '../../components/shared/AIInsightsPanel';

const PLATFORM_ICONS = { facebook: '📘', instagram: '📸', audience_network: '📡', messenger: '💬' };

const TOOLS = [
  { id: 'comprehensive', label: 'Overview',  icon: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z', color: '#a78bfa' },
  { id: 'ad-spy',       label: 'Ad Spy',    icon: 'M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z', color: '#ef4444' },
  { id: 'seo',          label: 'SEO',       icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z M9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625z M16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z', color: '#34d399' },
  { id: 'content',      label: 'Content',   icon: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z', color: '#fbbf24' },
  { id: 'pricing',      label: 'Pricing',   icon: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: '#f97316' },
  { id: 'swot',         label: 'SWOT',      icon: 'M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 010 1.45c0 1.268-.63 2.39-1.593 3.068-.94.677-2.203.677-3.332 0a3.745 3.745 0 01-1.45 0c-1.268 0-2.39-.63-3.068-1.593a3.745 3.745 0 01-1.45 0c-1.268 0-2.39-.63-3.068-1.593C3.63 14.39 3 13.268 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 010-1.45c0-1.268.63-2.39 1.593-3.068.94-.677 2.203-.677 3.332 0a3.745 3.745 0 011.45 0c1.268 0 2.39.63 3.068 1.593a3.745 3.745 0 011.45 0c1.268 0 2.39.63 3.068 1.593C20.37 9.61 21 10.732 21 12z', color: '#60a5fa' },
];

const DEPTHS = ['Quick Scan', 'Standard', 'Deep Dive'];

// Initials avatar for a competitor name
function Avatar({ name, size = 9, color = '#ef4444' }) {
  const bg = color + '18';
  return (
    <div
      className={`w-${size} h-${size} rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0`}
      style={{ background: bg, color, border: `1px solid ${color}22` }}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function CompetitorsPage() {
  usePageTitle('Competitor Intel');

  // View
  const [view, setView] = useState('home');
  const [selectedTool, setSelectedTool] = useState('comprehensive');
  const [depth, setDepth] = useState('Standard');

  // Competitor context
  const [competitorName, setCompetitorName] = useState('');
  const [competitorUrl, setCompetitorUrl] = useState('');
  const [savedId, setSavedId] = useState(null);

  // Data
  const [competitors, setCompetitors] = useState([]);
  const [stats, setStats] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Analysis
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');

  // Meta Ads
  const [liveAds, setLiveAds] = useState(null);
  const [loadingAds, setLoadingAds] = useState(false);
  const [adsError, setAdsError] = useState(null);

  // Google Ads
  const [googleAdsOutput, setGoogleAdsOutput] = useState('');
  const [loadingGoogleAds, setLoadingGoogleAds] = useState(false);

  // Content Gap
  const [gapCompetitor, setGapCompetitor] = useState('');
  const [gapTopics, setGapTopics] = useState('');
  const [gapOutput, setGapOutput] = useState('');
  const [gapLoading, setGapLoading] = useState(false);

  useEffect(() => {
    fetchJSON('/api/competitors/stats').then(setStats).catch(() => {});
    fetchJSON('/api/competitors').then(setCompetitors).catch(() => {});
  }, []);

  const refreshData = () => {
    fetchJSON('/api/competitors/stats').then(setStats).catch(() => {});
    fetchJSON('/api/competitors').then(setCompetitors).catch(() => {});
  };

  const openAnalyze = (name, url = '', id = null) => {
    setCompetitorName(name);
    setCompetitorUrl(url);
    setSavedId(id);
    setOutput('');
    setLiveAds(null);
    setAdsError(null);
    setGoogleAdsOutput('');
    setSelectedTool('comprehensive');
    setView('analyze');
  };

  const trackCompetitor = async () => {
    if (!competitorName.trim()) return;
    try {
      const result = await postJSON('/api/competitors', { name: competitorName, website: competitorUrl });
      setCompetitors(prev => [result, ...prev]);
      setSavedId(result.id);
      refreshData();
    } catch (_) {}
  };

  const deleteCompetitor = async (id) => {
    await deleteJSON(`/api/competitors/${id}`);
    setCompetitors(prev => prev.filter(c => c.id !== id));
    refreshData();
  };

  const saveEdit = async (id) => {
    await putJSON(`/api/competitors/${id}`, editForm);
    setCompetitors(prev => prev.map(c => c.id === id ? { ...c, ...editForm } : c));
    setEditingId(null);
  };

  const analyze = () => {
    if (!competitorName.trim()) return;
    setGenerating(true);
    setOutput('');
    connectSSE('/api/competitors/analyze', {
      competitorId: savedId,
      competitorName,
      website: competitorUrl,
      analysisType: selectedTool,
    }, {
      onChunk: (text) => setOutput(p => p + text),
      onResult: (data) => { setOutput(data.content); setGenerating(false); },
      onError: () => setGenerating(false),
    });
  };

  const fetchLiveAds = () => {
    if (!competitorName.trim()) return;
    setLoadingAds(true); setLiveAds(null); setAdsError(null);
    fetchJSON(`/api/competitors/ads?name=${encodeURIComponent(competitorName)}`)
      .then(data => setLiveAds(data.data || []))
      .catch(err => setAdsError(err?.message || 'Failed to fetch ads'))
      .finally(() => setLoadingAds(false));
  };

  const fetchGoogleAdsIntel = () => {
    if (!competitorName.trim()) return;
    setLoadingGoogleAds(true);
    setGoogleAdsOutput('');
    connectSSE('/api/competitors/analyze', {
      analysisType: 'google-ads',
      competitorName,
      website: competitorUrl,
    }, {
      onChunk: (text) => setGoogleAdsOutput(p => p + text),
      onResult: (data) => { setGoogleAdsOutput(data.content); setLoadingGoogleAds(false); },
      onError: () => setLoadingGoogleAds(false),
      onDone: () => setLoadingGoogleAds(false),
    });
  };

  const activeTool = TOOLS.find(t => t.id === selectedTool);

  // ─── HOME ─────────────────────────────────────────────────────────────────
  if (view === 'home') {
    return (
      <div className="p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto">

        {/* Page header */}
        <div className="mb-8 animate-fade-in">
          <p className="hud-label text-[11px] mb-1.5" style={{ color: '#ef4444' }}>COMPETITOR INTEL</p>
          <h1 className="text-3xl font-bold text-white">Intelligence Hub</h1>
          <p className="text-sm text-gray-500 mt-1">AI-powered research across ads, SEO, content, pricing &amp; more</p>
        </div>

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: 'TRACKED', value: stats.totalCompetitors, color: '#ef4444' },
              { label: 'REPORTS',  value: stats.totalReports,     color: '#a78bfa' },
              { label: 'THIS MONTH', value: stats.recentReports,  color: '#34d399' },
            ].map(s => (
              <div key={s.label} className="panel rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="hud-label text-[10px] mt-1" style={{ color: s.color }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Quick Analyze */}
        <div className="panel rounded-2xl p-5 mb-8">
          <p className="hud-label text-[11px] mb-3" style={{ color: '#ef4444' }}>QUICK ANALYZE</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={competitorName}
              onChange={e => setCompetitorName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && competitorName.trim() && openAnalyze(competitorName, competitorUrl)}
              placeholder="Competitor name (e.g. Nike, Shopify...)"
              className="flex-1 input-field rounded-xl px-4 py-3 text-sm"
            />
            <input
              value={competitorUrl}
              onChange={e => setCompetitorUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && competitorName.trim() && openAnalyze(competitorName, competitorUrl)}
              placeholder="Website URL (optional)"
              className="w-full sm:w-56 input-field rounded-xl px-4 py-3 text-sm"
            />
            <button
              onClick={() => competitorName.trim() && openAnalyze(competitorName, competitorUrl)}
              disabled={!competitorName.trim()}
              className="px-6 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all"
              style={{ background: competitorName.trim() ? '#ef4444' : 'rgba(239,68,68,0.1)', color: competitorName.trim() ? 'white' : '#6b7280' }}
            >
              Analyze →
            </button>
          </div>
        </div>

        {/* Tracked competitors */}
        {competitors.length > 0 ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <p className="hud-label text-[11px]" style={{ color: '#ef4444' }}>TRACKED COMPETITORS</p>
              <div className="flex-1 hud-line" />
              <span className="text-[11px] text-gray-600">{competitors.length} saved</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger">
              {competitors.map(c => (
                <div key={c.id} className="panel rounded-2xl p-4 group relative">
                  {editingId === c.id ? (
                    <div className="space-y-2">
                      <input value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Name" className="w-full input-field rounded-lg px-3 py-1.5 text-xs" />
                      <input value={editForm.website || ''} onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))} placeholder="Website" className="w-full input-field rounded-lg px-3 py-1.5 text-xs" />
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => saveEdit(c.id)} className="chip text-[10px]" style={{ background: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)', color: '#f87171' }}>Save</button>
                        <button onClick={() => setEditingId(null)} className="chip text-[10px]">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Actions — appear on hover */}
                      <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditingId(c.id); setEditForm({ name: c.name, website: c.website || '' }); }}
                          className="p-1 rounded text-gray-600 hover:text-gray-300 transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                        </button>
                        <button onClick={() => deleteCompetitor(c.id)} className="p-1 rounded text-gray-600 hover:text-red-400 transition-colors text-sm leading-none">×</button>
                      </div>

                      <div className="flex items-center gap-3 mb-3">
                        <Avatar name={c.name} size={9} color="#ef4444" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{c.name}</p>
                          <p className="text-[11px] text-gray-500 truncate">{c.website || c.industry || 'No details'}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => openAnalyze(c.name, c.website || '', c.id)}
                        className="w-full chip text-[10px] justify-center"
                        style={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}
                      >
                        Analyze →
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="panel rounded-2xl p-10 text-center">
            <p className="text-gray-500 text-sm mb-1">No competitors tracked yet</p>
            <p className="text-gray-600 text-xs">Use Quick Analyze above to start researching, then save competitors you want to track</p>
          </div>
        )}
      </div>
    );
  }

  // ─── ANALYZE VIEW ─────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto animate-fade-in">

      {/* Competitor header bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          onClick={() => setView('home')}
          className="p-2 rounded-lg text-gray-500 hover:text-white transition-colors flex-shrink-0"
          style={{ border: '1px solid rgba(99,102,241,0.12)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        </button>

        <Avatar name={competitorName} size={9} color="#ef4444" />

        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-white leading-tight truncate">{competitorName}</h2>
          {competitorUrl && <p className="text-[11px] text-gray-500 truncate">{competitorUrl}</p>}
        </div>

        {/* URL quick-add if missing */}
        {!competitorUrl && (
          <input
            value={competitorUrl}
            onChange={e => setCompetitorUrl(e.target.value)}
            placeholder="+ Add website URL"
            className="w-44 input-field rounded-lg px-3 py-1.5 text-xs"
          />
        )}

        {savedId ? (
          <span className="chip text-[10px]" style={{ color: '#34d399', borderColor: 'rgba(52,211,153,0.25)', background: 'rgba(52,211,153,0.06)' }}>
            ✓ Tracked
          </span>
        ) : (
          <button
            onClick={trackCompetitor}
            className="chip text-[10px]"
            style={{ color: '#34d399', borderColor: 'rgba(52,211,153,0.3)' }}
          >
            + Track
          </button>
        )}
      </div>

      {/* Tool tab bar */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl overflow-x-auto" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(99,102,241,0.08)' }}>
        {TOOLS.map(t => (
          <button
            key={t.id}
            onClick={() => { setSelectedTool(t.id); setOutput(''); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0"
            style={selectedTool === t.id
              ? { background: `${t.color}18`, color: t.color, border: `1px solid ${t.color}33` }
              : { color: '#6b7280', border: '1px solid transparent' }
            }
          >
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
            </svg>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

        {/* ── Main column ── */}
        <div className="lg:col-span-3 space-y-5">

          {/* Run analysis button */}
          <button
            onClick={analyze}
            disabled={generating}
            className="w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
            style={{
              background: generating ? 'rgba(255,255,255,0.02)' : `${activeTool?.color ?? '#ef4444'}dd`,
              color: generating ? '#4b5563' : 'white',
              border: `1px solid ${activeTool?.color ?? '#ef4444'}33`,
            }}
          >
            {generating ? (
              <><span className="w-3.5 h-3.5 border-2 border-gray-700 border-t-current rounded-full animate-spin" />Analyzing {activeTool?.label}...</>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={activeTool?.icon} /></svg>
                Run {activeTool?.label} Analysis
              </>
            )}
          </button>

          {/* Analysis output */}
          {output && (
            <div className="panel rounded-2xl p-5 sm:p-7 animate-fade-up">
              <div className="flex items-center gap-2 mb-5">
                <div className={`w-1.5 h-1.5 rounded-full ${generating ? 'animate-pulse' : ''}`} style={{ background: generating ? activeTool?.color : '#34d399' }} />
                <span className="hud-label text-[10px]" style={{ color: generating ? activeTool?.color : '#34d399' }}>
                  {generating ? `ANALYZING ${activeTool?.label?.toUpperCase()}...` : 'ANALYSIS COMPLETE'}
                </span>
              </div>
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                {output}
                {generating && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse rounded-sm" style={{ background: activeTool?.color }} />}
              </pre>
            </div>
          )}

          {/* ── Ad Spy live data panels ── */}
          {selectedTool === 'ad-spy' && (
            <div className="space-y-4">

              {/* Meta Live Ads */}
              <div className="panel rounded-2xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="hud-label text-[11px]" style={{ color: '#ef4444' }}>LIVE META ADS</p>
                    <p className="text-xs text-gray-600 mt-0.5">Facebook &amp; Instagram ads running now</p>
                  </div>
                  <button
                    onClick={fetchLiveAds}
                    disabled={loadingAds}
                    className="chip text-[10px] flex-shrink-0"
                    style={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}
                  >
                    {loadingAds ? (
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 border border-gray-600 border-t-red-400 rounded-full animate-spin" />Fetching</span>
                    ) : '⚡ Fetch Ads'}
                  </button>
                </div>

                {adsError && (
                  <div className="rounded-lg px-4 py-3 text-xs text-red-400" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                    {adsError}
                  </div>
                )}
                {!adsError && !liveAds && !loadingAds && (
                  <p className="text-xs text-gray-600 text-center py-3">Click "Fetch Ads" to pull live Meta ads for {competitorName}</p>
                )}
                {liveAds?.length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-3">No active Meta ads found for "{competitorName}"</p>
                )}
                {liveAds?.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    {liveAds.slice(0, 10).map(ad => {
                      const body = (ad.ad_creative_bodies || [])[0] || '';
                      const headline = (ad.ad_creative_link_titles || [])[0] || '';
                      const desc = (ad.ad_creative_link_descriptions || [])[0] || '';
                      const platforms = ad.publisher_platforms || [];
                      const startDate = ad.ad_delivery_start_time?.slice(0, 10);
                      const stopDate = ad.ad_delivery_stop_time?.slice(0, 10);
                      return (
                        <div key={ad.id} className="rounded-xl p-3.5 space-y-1.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(99,102,241,0.08)' }}>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-bold text-gray-300 truncate">{ad.page_name || ad.funding_entity || 'Unknown page'}</p>
                            <div className="flex gap-0.5 text-xs flex-shrink-0">{platforms.map(p => <span key={p} title={p}>{PLATFORM_ICONS[p] || '📢'}</span>)}</div>
                          </div>
                          {headline && <p className="text-xs font-semibold text-white">{headline}</p>}
                          {body && <p className="text-[11px] text-gray-400 line-clamp-3">{body}</p>}
                          {desc && <p className="text-[11px] text-gray-500 italic">{desc}</p>}
                          <p className="text-[10px] text-gray-600 pt-0.5">
                            {startDate && `Started ${startDate}`}
                            {stopDate ? ` · Ended ${stopDate}` : startDate ? ' · Still running' : ''}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Google Ads Intelligence */}
              <div className="panel rounded-2xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="hud-label text-[11px]" style={{ color: '#60a5fa' }}>GOOGLE ADS INTELLIGENCE</p>
                    <p className="text-xs text-gray-600 mt-0.5">AI-powered analysis of their Google Ads strategy</p>
                  </div>
                  <button
                    onClick={fetchGoogleAdsIntel}
                    disabled={loadingGoogleAds}
                    className="chip text-[10px] flex-shrink-0"
                    style={{ color: '#60a5fa', borderColor: 'rgba(96,165,250,0.3)' }}
                  >
                    {loadingGoogleAds ? (
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 border border-gray-600 border-t-blue-400 rounded-full animate-spin" />Analyzing</span>
                    ) : '🔍 Analyze'}
                  </button>
                </div>

                {!googleAdsOutput && !loadingGoogleAds && (
                  <p className="text-xs text-gray-600 text-center py-3">Click "Analyze" to get Google Ads intelligence — keywords, copy angles, bidding strategy &amp; more</p>
                )}
                {googleAdsOutput && (
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                    {googleAdsOutput}
                    {loadingGoogleAds && <span className="inline-block w-1.5 h-4 bg-blue-400 ml-0.5 animate-pulse rounded-sm" />}
                  </pre>
                )}
              </div>

            </div>
          )}

          {/* ── Content Gap Panel ── */}
          <div className="panel rounded-2xl p-5 animate-fade-in">
            <p className="hud-label text-[11px] mb-3" style={{ color: '#fbbf24' }}>CONTENT GAP ANALYSIS</p>
            <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
              <input className="input-field rounded-xl px-4 py-3 text-sm w-full"
                placeholder="Competitor name or domain"
                value={gapCompetitor}
                onChange={e => setGapCompetitor(e.target.value)}
                defaultValue={competitorName}
              />
              <input className="input-field rounded-xl px-4 py-3 text-sm w-full"
                placeholder="Your current content topics (comma-separated)"
                value={gapTopics}
                onChange={e => setGapTopics(e.target.value)}
              />
            </div>
            <button
              className="chip text-[10px]"
              style={{ color: '#fbbf24', borderColor: 'rgba(251,191,36,0.3)' }}
              disabled={(!gapCompetitor && !competitorName) || gapLoading}
              onClick={() => {
                setGapOutput('');
                setGapLoading(true);
                connectSSE('/api/competitors/content-gap',
                  { competitor_name: gapCompetitor || competitorName, your_topics: gapTopics.split(',').map(t => t.trim()).filter(Boolean) },
                  {
                    onChunk: (text) => setGapOutput(prev => prev + text),
                    onResult: () => setGapLoading(false),
                    onError: () => setGapLoading(false),
                    onDone: () => setGapLoading(false),
                  }
                );
              }}>{gapLoading ? 'Analyzing...' : 'Analyze Content Gap'}</button>
            {gapOutput && <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed mt-4">{gapOutput}{gapLoading && <span className="inline-block w-1.5 h-4 bg-yellow-400 ml-0.5 animate-pulse rounded-sm" />}</pre>}
          </div>

        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4">

          {/* Depth */}
          <div className="panel rounded-2xl p-4">
            <p className="hud-label text-[11px] mb-3">DEPTH</p>
            <div className="space-y-1.5">
              {DEPTHS.map(d => (
                <button
                  key={d}
                  onClick={() => setDepth(d)}
                  className="w-full chip text-xs justify-center"
                  style={depth === d ? { background: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.3)', color: '#f87171' } : {}}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* All analysis types as quick-nav */}
          <div className="panel rounded-2xl p-4">
            <p className="hud-label text-[11px] mb-3">ANALYSIS TYPES</p>
            <div className="space-y-0.5">
              {TOOLS.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setSelectedTool(t.id); setOutput(''); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all text-left"
                  style={selectedTool === t.id
                    ? { background: `${t.color}14`, color: t.color }
                    : { color: '#6b7280' }
                  }
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                  </svg>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Other tracked competitors quick-switch */}
          {competitors.length > 0 && (
            <div className="panel rounded-2xl p-4">
              <p className="hud-label text-[11px] mb-3">TRACKED</p>
              <div className="space-y-1">
                {competitors.map(c => (
                  <button
                    key={c.id}
                    onClick={() => openAnalyze(c.name, c.website || '', c.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all text-left"
                    style={savedId === c.id
                      ? { background: 'rgba(239,68,68,0.1)', color: '#f87171' }
                      : { color: '#6b7280' }
                    }
                  >
                    <div className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      <AIInsightsPanel moduleId="competitors" />
    </div>
  );
}
