import { useState, useEffect, useCallback } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchJSON, postJSON, putJSON, deleteJSON, connectSSE } from '../../lib/api';
import AIInsightsPanel from '../../components/shared/AIInsightsPanel';

const MODULE_COLOR = '#3b82f6';

const AI_TEMPLATES = [
  { name: 'Help Article', icon: 'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25', prompt: 'Write a comprehensive help article with clear title, introduction, step-by-step instructions with screenshot placeholders, tips, and related articles section' },
  { name: 'FAQ Section', icon: 'M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z', prompt: 'Generate a FAQ section with 8-10 common questions and detailed answers, organized by topic, with searchable keywords for each entry' },
  { name: 'Troubleshooting', icon: 'M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l5.653-4.655m3.586-3.586a2.548 2.548 0 013.586 3.586m-6.586 4.586l4.586-4.586', prompt: 'Create a troubleshooting guide with problem description, diagnostic steps, common solutions, escalation path, and preventive measures' },
  { name: 'Onboarding Guide', icon: 'M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.58-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z', prompt: 'Design a comprehensive onboarding guide for new users including getting started steps, key features walkthrough, best practices, and success milestones' },
];

const STATUS_COLORS = { published: '#22c55e', draft: '#6b7280', archived: '#ef4444' };

export default function KnowledgeBasePage() {
  usePageTitle('Knowledge Base');

  // Data state
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [tab, setTab] = useState('articles');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editing, setEditing] = useState(null); // article object or 'new'
  const [saving, setSaving] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // AI Writer state
  const [generating, setGenerating] = useState(false);
  const [aiOutput, setAiOutput] = useState('');
  const [cancelSSE, setCancelSSE] = useState(null);

  // Form state
  const [form, setForm] = useState({ title: '', content: '', category: '', status: 'draft' });

  const loadData = useCallback(async () => {
    try {
      const [arts, cats] = await Promise.all([
        fetchJSON('/api/knowledge-base/'),
        fetchJSON('/api/knowledge-base/categories/list'),
      ]);
      setArticles(arts);
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load KB data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Stats
  const published = articles.filter(a => a.status === 'published').length;
  const drafts = articles.filter(a => a.status === 'draft').length;
  const totalViews = articles.reduce((s, a) => s + (a.views || 0), 0);
  const helpfulArts = articles.filter(a => a.helpful_count > 0);
  const avgHelpful = helpfulArts.length > 0
    ? Math.round(helpfulArts.reduce((s, a) => s + a.helpful_count, 0) / helpfulArts.length)
    : 0;

  // Filtered articles
  const filtered = statusFilter === 'all' ? articles : articles.filter(a => a.status === statusFilter);

  // CRUD
  const openEditor = (article) => {
    if (article === 'new') {
      setForm({ title: '', content: '', category: categories[0]?.name || '', status: 'draft' });
      setEditing('new');
    } else {
      setForm({ title: article.title, content: article.content || '', category: article.category || '', status: article.status });
      setEditing(article);
    }
    setAiOutput('');
  };

  const saveArticle = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editing === 'new') {
        await postJSON('/api/knowledge-base/', form);
      } else {
        await putJSON(`/api/knowledge-base/${editing.id}`, form);
      }
      setEditing(null);
      await loadData();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const deleteArticle = async (id) => {
    try {
      await deleteJSON(`/api/knowledge-base/${id}`);
      if (editing?.id === id) setEditing(null);
      await loadData();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const addCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await postJSON('/api/knowledge-base/categories', { name: newCatName.trim() });
      setNewCatName('');
      await loadData();
    } catch (err) {
      console.error('Add category failed:', err);
    }
  };

  const deleteCategory = async (id) => {
    try {
      await deleteJSON(`/api/knowledge-base/categories/${id}`);
      await loadData();
    } catch (err) {
      console.error('Delete category failed:', err);
    }
  };

  // AI generation
  const generateContent = (template) => {
    if (generating && cancelSSE) { cancelSSE(); }
    setGenerating(true);
    setAiOutput('');
    const cancel = connectSSE('/api/knowledge-base/generate', { type: 'content', prompt: template.prompt }, {
      onChunk: (text) => setAiOutput(p => p + text),
      onResult: (data) => setAiOutput(data.content || ''),
      onError: (err) => { console.error(err); setGenerating(false); },
      onDone: () => setGenerating(false),
    });
    setCancelSSE(() => cancel);
  };

  const useAiContent = () => {
    if (!aiOutput) return;
    // Extract title from first line if it looks like a heading
    const lines = aiOutput.trim().split('\n');
    let title = form.title;
    let content = aiOutput;
    if (lines[0] && (lines[0].startsWith('#') || lines[0].startsWith('**'))) {
      title = lines[0].replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
      content = lines.slice(1).join('\n').trim();
    }
    setForm(f => ({ ...f, title: f.title || title, content }));
    setAiOutput('');
  };

  const statusColor = (s) => STATUS_COLORS[s] || '#6b7280';

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-12">
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-12">
      {/* Header */}
      <div className="mb-6 sm:mb-8 animate-fade-in flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="hud-label text-[11px] mb-2" style={{ color: MODULE_COLOR }}>KNOWLEDGE BASE</p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Knowledge Base</h1>
          <p className="text-base text-gray-500">Create and manage help articles, guides, and documentation</p>
        </div>
        <button
          onClick={() => { setTab('articles'); openEditor('new'); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:brightness-110 flex-shrink-0"
          style={{ background: MODULE_COLOR }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Article
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[
          { label: 'PUBLISHED', value: published.toString(), sub: `${articles.length} total` },
          { label: 'DRAFTS', value: drafts.toString(), sub: 'Unpublished' },
          { label: 'TOTAL VIEWS', value: totalViews > 1000 ? `${(totalViews / 1000).toFixed(1)}K` : totalViews.toString(), sub: 'All time' },
          { label: 'CATEGORIES', value: categories.length.toString(), sub: `${articles.length} articles` },
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
        {[
          { id: 'articles', label: 'Articles' },
          { id: 'categories', label: 'Categories' },
          { id: 'ai-writer', label: 'AI Writer' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`chip text-xs ${tab === t.id ? 'active' : ''}`} style={tab === t.id ? { background: `${MODULE_COLOR}20`, borderColor: `${MODULE_COLOR}40`, color: MODULE_COLOR } : {}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── ARTICLES TAB ─── */}
      {tab === 'articles' && (
        <div className="animate-fade-in space-y-4">
          {/* Editor panel */}
          {editing && (
            <div className="panel rounded-2xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="hud-label text-[11px]" style={{ color: MODULE_COLOR }}>
                  {editing === 'new' ? 'NEW ARTICLE' : 'EDIT ARTICLE'}
                </p>
                <button onClick={() => setEditing(null)} className="text-gray-500 hover:text-gray-300 text-xs">Cancel</button>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Article title..."
                  value={form.title}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/40"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={form.category}
                    onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                    className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-blue-500/40"
                  >
                    <option value="">No category</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <select
                    value={form.status}
                    onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}
                    className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-blue-500/40"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <textarea
                  placeholder="Write your article content here... (Markdown supported)"
                  value={form.content}
                  onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
                  rows={12}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500/40 resize-y font-mono leading-relaxed"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600">{form.content.length} characters</p>
                  <div className="flex gap-2">
                    {aiOutput && (
                      <button onClick={useAiContent} className="px-3 py-2 rounded-lg text-xs font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/20 hover:bg-purple-500/25 transition-colors">
                        Use AI Content
                      </button>
                    )}
                    <button
                      onClick={saveArticle}
                      disabled={saving || !form.title.trim()}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40"
                      style={{ background: MODULE_COLOR }}
                    >
                      {saving ? 'Saving...' : editing === 'new' ? 'Create Article' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick AI generate row (visible when editor is open) */}
          {editing && (
            <div className="panel rounded-2xl p-3 sm:p-4">
              <div className="flex items-center gap-3 overflow-x-auto">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex-shrink-0">AI Generate:</span>
                {AI_TEMPLATES.map(t => (
                  <button
                    key={t.name}
                    onClick={() => generateContent(t)}
                    disabled={generating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-white/[0.03] border border-white/[0.06] text-gray-400 hover:text-white hover:border-blue-500/30 hover:bg-blue-500/5 transition-all flex-shrink-0 disabled:opacity-40"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                    </svg>
                    {t.name}
                  </button>
                ))}
              </div>
              {(generating || aiOutput) && (
                <div className="mt-3 pt-3 border-t border-white/[0.04]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${generating ? 'animate-pulse' : ''}`} style={{ background: generating ? MODULE_COLOR : '#4ade80' }} />
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: generating ? MODULE_COLOR : '#4ade80' }}>
                        {generating ? 'Generating...' : 'Ready — click "Use AI Content" above to insert'}
                      </span>
                    </div>
                    {!generating && aiOutput && (
                      <button onClick={() => setAiOutput('')} className="text-[10px] text-gray-600 hover:text-gray-400">Clear</button>
                    )}
                  </div>
                  <pre className="text-xs text-gray-400 whitespace-pre-wrap font-sans leading-relaxed max-h-48 overflow-y-auto">
                    {aiOutput}
                    {generating && <span className="inline-block w-1 h-3.5 ml-0.5 animate-pulse" style={{ background: MODULE_COLOR }} />}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Status filter pills */}
          {!editing && (
            <div className="flex items-center gap-2">
              {[
                { id: 'all', label: 'All', count: articles.length },
                { id: 'published', label: 'Published', count: published },
                { id: 'draft', label: 'Drafts', count: drafts },
                { id: 'archived', label: 'Archived', count: articles.filter(a => a.status === 'archived').length },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${statusFilter === f.id ? 'bg-white/[0.08] text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  {f.label} <span className="font-mono ml-1 opacity-60">{f.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* Article list */}
          {filtered.length === 0 && !editing ? (
            <div className="panel rounded-2xl p-8 sm:p-12 text-center">
              <svg className="w-10 h-10 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p className="text-sm text-gray-400 mb-1">No articles yet</p>
              <p className="text-xs text-gray-600 mb-4">Create your first help article to get started</p>
              <button
                onClick={() => openEditor('new')}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white hover:brightness-110 transition-all"
                style={{ background: MODULE_COLOR }}
              >
                Create First Article
              </button>
            </div>
          ) : (
            <div className="panel rounded-2xl overflow-hidden">
              <div className="divide-y divide-white/[0.04]">
                {filtered.map(a => (
                  <div key={a.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 hover:bg-white/[0.02] transition-colors group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => openEditor(a)} className="text-sm font-semibold text-gray-300 hover:text-white transition-colors text-left truncate">
                          {a.title}
                        </button>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: `${statusColor(a.status)}15`, color: statusColor(a.status), border: `1px solid ${statusColor(a.status)}25` }}>
                          {a.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {a.category && <span className="text-xs text-gray-500">{a.category}</span>}
                        {a.category && <span className="text-xs text-gray-700">&middot;</span>}
                        <span className="text-xs text-gray-600">{new Date(a.updated_at || a.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      {(a.views || 0) > 0 && (
                        <div className="text-right hidden md:block">
                          <p className="text-xs font-mono text-gray-400">{a.views.toLocaleString()}</p>
                          <p className="text-[9px] text-gray-600">views</p>
                        </div>
                      )}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditor(a)} className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/[0.05] transition-colors" title="Edit">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                        <button onClick={() => deleteArticle(a.id)} className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/[0.05] transition-colors" title="Delete">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── CATEGORIES TAB ─── */}
      {tab === 'categories' && (
        <div className="animate-fade-in space-y-4">
          {/* Add category */}
          <div className="panel rounded-2xl p-4 sm:p-5">
            <p className="hud-label text-[11px] mb-3" style={{ color: MODULE_COLOR }}>ADD CATEGORY</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Category name..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/40"
              />
              <button
                onClick={addCategory}
                disabled={!newCatName.trim()}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40"
                style={{ background: MODULE_COLOR }}
              >
                Add
              </button>
            </div>
          </div>

          {/* Category list */}
          {categories.length === 0 ? (
            <div className="panel rounded-2xl p-8 text-center">
              <p className="text-sm text-gray-400 mb-1">No categories yet</p>
              <p className="text-xs text-gray-600">Add your first category above to organize articles</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {categories.map(cat => {
                const catArticles = articles.filter(a => a.category === cat.name).length;
                return (
                  <div key={cat.id} className="panel rounded-2xl p-4 sm:p-5 group">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-base font-semibold text-gray-200">{cat.name}</p>
                        {cat.description && <p className="text-xs text-gray-500 mt-0.5">{cat.description}</p>}
                        <p className="text-xs text-gray-600 mt-1">{catArticles} article{catArticles !== 1 ? 's' : ''}</p>
                      </div>
                      <button
                        onClick={() => deleteCategory(cat.id)}
                        className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/[0.05] opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete category"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── AI WRITER TAB ─── */}
      {tab === 'ai-writer' && (
        <div className="animate-fade-in space-y-4">
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-1" style={{ color: MODULE_COLOR }}>AI ARTICLE WRITER</p>
            <p className="text-xs text-gray-500 mb-4">Choose a template to generate content, then create an article from it</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AI_TEMPLATES.map(t => (
                <button
                  key={t.name}
                  onClick={() => generateContent(t)}
                  disabled={generating}
                  className="panel-interactive rounded-xl p-4 text-left flex items-start gap-3 disabled:opacity-40"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${MODULE_COLOR}12`, border: `1px solid ${MODULE_COLOR}20` }}>
                    <svg className="w-4.5 h-4.5" style={{ color: MODULE_COLOR }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-300">{t.name}</p>
                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{t.prompt}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {(generating || aiOutput) && (
            <div className="panel rounded-2xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${generating ? 'animate-pulse' : ''}`} style={{ background: generating ? MODULE_COLOR : '#4ade80' }} />
                  <span className="hud-label text-[11px]" style={{ color: generating ? MODULE_COLOR : '#4ade80' }}>
                    {generating ? 'GENERATING...' : 'COMPLETE'}
                  </span>
                </div>
                {!generating && aiOutput && (
                  <button
                    onClick={() => {
                      // Parse title from AI output and open editor pre-filled
                      const lines = aiOutput.trim().split('\n');
                      let title = '';
                      let content = aiOutput;
                      if (lines[0] && (lines[0].startsWith('#') || lines[0].startsWith('**'))) {
                        title = lines[0].replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
                        content = lines.slice(1).join('\n').trim();
                      }
                      setForm({ title, content, category: categories[0]?.name || '', status: 'draft' });
                      setEditing('new');
                      setTab('articles');
                      setAiOutput('');
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:brightness-110"
                    style={{ background: MODULE_COLOR }}
                  >
                    Create Article from This
                  </button>
                )}
              </div>
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed max-h-[500px] overflow-y-auto">
                {aiOutput}
                {generating && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: MODULE_COLOR }} />}
              </pre>
            </div>
          )}
        </div>
      )}

      <AIInsightsPanel moduleId="knowledge-base" />
    </div>
  );
}
