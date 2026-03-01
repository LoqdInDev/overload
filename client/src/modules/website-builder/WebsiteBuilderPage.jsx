import { useState, useEffect } from 'react';
import { fetchJSON, postJSON, putJSON, connectSSE } from '../../lib/api';
import { usePageTitle } from '../../hooks/usePageTitle';
import AIInsightsPanel from '../../components/shared/AIInsightsPanel';

const PAGE_TYPES = [
  { id: 'landing', name: 'Landing Page', desc: 'High-converting landing page with hero, features, CTA' },
  { id: 'product', name: 'Product Page', desc: 'Showcase product with gallery, specs, reviews, buy button' },
  { id: 'about', name: 'About Page', desc: 'Company story, team, mission, values' },
  { id: 'pricing', name: 'Pricing Page', desc: 'Pricing tiers with feature comparison table' },
  { id: 'blog', name: 'Blog Layout', desc: 'Blog listing with featured posts and categories' },
  { id: 'contact', name: 'Contact Page', desc: 'Contact form, map, office info, FAQ' },
];

const STYLES = ['Minimal', 'Bold', 'Corporate', 'Playful', 'Luxury', 'Tech'];
const FRAMEWORKS = ['HTML/CSS', 'React', 'Tailwind', 'Next.js'];

const TEMPLATES = [
  { name: 'SaaS Landing', type: 'landing', style: 'Tech', prompt: 'Generate a modern SaaS landing page with hero section, feature grid, testimonials, pricing, and CTA' },
  { name: 'E-commerce Product', type: 'product', style: 'Minimal', prompt: 'Generate a clean e-commerce product page with image gallery, size selector, add to cart, and reviews section' },
  { name: 'Agency Portfolio', type: 'landing', style: 'Bold', prompt: 'Generate a creative agency portfolio landing page with case studies, services, and contact form' },
  { name: 'Startup Pricing', type: 'pricing', style: 'Tech', prompt: 'Generate a startup pricing page with 3 tiers, feature comparison, FAQ, and enterprise CTA' },
];

const SECTIONS = [
  { id: 'hero', name: 'Hero Section' },
  { id: 'features', name: 'Features Grid' },
  { id: 'testimonials', name: 'Testimonials' },
  { id: 'pricing', name: 'Pricing Table' },
  { id: 'cta', name: 'Call to Action' },
  { id: 'faq', name: 'FAQ Accordion' },
  { id: 'footer', name: 'Footer' },
  { id: 'gallery', name: 'Image Gallery' },
];

const extractHTML = (code) => {
  const fenceMatch = code.match(/```(?:html)?\s*\n([\s\S]*?)```/);
  return fenceMatch ? fenceMatch[1] : code;
};

export default function WebsiteBuilderPage() {
  usePageTitle('Website Builder');
  const [pageType, setPageType] = useState(null);
  const [style, setStyle] = useState('Minimal');
  const [framework, setFramework] = useState('HTML/CSS');
  const [selectedSections, setSelectedSections] = useState(['hero', 'features', 'cta', 'footer']);
  const [brandName, setBrandName] = useState('');
  const [brandDesc, setBrandDesc] = useState('');
  const [colorPrimary, setColorPrimary] = useState('#7c3aed');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [activeTab, setActiveTab] = useState('code');

  const [sites, setSites] = useState([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Refinement
  const [refinePrompt, setRefinePrompt] = useState('');
  const [versions, setVersions] = useState([]);

  // Multi-page management
  const [activeSite, setActiveSite] = useState(null);
  const [sitePages, setSitePages] = useState([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [editingPageId, setEditingPageId] = useState(null);

  useEffect(() => {
    fetchJSON('/api/website-builder/sites')
      .then(data => setSites(data))
      .catch(err => console.error('Failed to fetch sites:', err))
      .finally(() => setLoadingSites(false));
  }, []);

  const toggleSection = (id) => setSelectedSections(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const generate = async (templatePrompt) => {
    setGenerating(true); setOutput(''); setSaved(false); setVersions([]); setEditingPageId(null);
    const sections = selectedSections.map(id => SECTIONS.find(s => s.id === id)?.name).join(', ');
    const prompt = templatePrompt || `Generate a ${style.toLowerCase()} ${PAGE_TYPES.find(p => p.id === pageType)?.name || 'landing page'} using ${framework}.\n\nBrand: ${brandName || 'My Brand'}\nDescription: ${brandDesc || 'A modern business'}\nPrimary Color: ${colorPrimary}\nSections: ${sections}\n\nGenerate clean, production-ready code with responsive design and modern UI patterns. Return only the complete HTML code without markdown code fences.`;
    connectSSE('/api/website-builder/generate', { type: pageType || 'landing', prompt }, {
      onChunk: (text) => setOutput(prev => prev + text),
      onResult: (data) => { setOutput(data.content); setGenerating(false); },
      onError: (err) => { console.error(err); setGenerating(false); }
    });
  };

  const refine = async () => {
    if (!refinePrompt.trim() || generating) return;
    setVersions(prev => [...prev, output]);
    const currentCode = extractHTML(output);
    setGenerating(true); setOutput(''); setSaved(false);
    const prompt = `Here is the current HTML/CSS code for a webpage:\n\n${currentCode}\n\nPlease make the following changes:\n${refinePrompt}\n\nReturn the complete updated HTML code. Do not wrap in markdown code fences. Return only the raw HTML.`;
    setRefinePrompt('');
    connectSSE('/api/website-builder/generate', { type: pageType || 'landing', prompt }, {
      onChunk: (text) => setOutput(prev => prev + text),
      onResult: (data) => { setOutput(data.content); setGenerating(false); },
      onError: (err) => { console.error(err); setGenerating(false); }
    });
  };

  const undo = () => {
    if (versions.length === 0) return;
    setOutput(versions[versions.length - 1]);
    setVersions(prev => prev.slice(0, -1));
    setSaved(false);
  };

  const downloadHTML = () => {
    const html = extractHTML(output);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(brandName || 'page').toLowerCase().replace(/\s+/g, '-')}-${pageType || 'landing'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadSiteDetail = async (site) => {
    setActiveSite(site);
    setLoadingPages(true);
    try {
      const data = await fetchJSON(`/api/website-builder/sites/${site.id}`);
      setSitePages(data.pageList || []);
    } catch (err) {
      console.error('Failed to load site:', err);
    } finally {
      setLoadingPages(false);
    }
  };

  const loadPage = (page) => {
    setPageType(page.slug || 'landing');
    setOutput(page.content || '');
    setEditingPageId(page.id);
    setActiveSite(null);
    setSaved(false);
    setVersions([]);
    setActiveTab('preview');
  };

  const handleSavePage = async () => {
    if (!output || saving) return;
    setSaving(true);
    try {
      if (editingPageId) {
        await putJSON(`/api/website-builder/pages/${editingPageId}`, { content: output });
        setSaved(true);
        return;
      }

      let siteId;
      if (sites.length > 0) {
        siteId = sites[0].id;
      } else {
        const newSite = await postJSON('/api/website-builder/sites', { name: brandName || 'My Site' });
        siteId = newSite.id;
        setSites(prev => [newSite, ...prev]);
      }
      const typeName = PAGE_TYPES.find(p => p.id === pageType)?.name || pageType || 'landing';
      const newPage = await postJSON('/api/website-builder/pages', {
        site_id: siteId,
        name: typeName,
        slug: pageType || 'landing',
        content: output
      });
      setEditingPageId(newPage.id);
      setSaved(true);
    } catch (err) {
      console.error('Failed to save page:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── Site Detail View ──
  if (!pageType && activeSite) return (
    <div className="p-4 sm:p-6 lg:p-12 animate-fade-in">
      <div className="flex items-center gap-3 sm:gap-5 mb-6 sm:mb-8">
        <button onClick={() => setActiveSite(null)} className="p-2 rounded-md border border-indigo-500/10 text-gray-500 hover:text-white transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        </button>
        <div>
          <p className="hud-label text-[11px]" style={{ color: '#d946ef' }}>SITE</p>
          <h2 className="text-lg font-bold text-white">{activeSite.name}</h2>
        </div>
        <button onClick={() => { setActiveSite(null); }} className="ml-auto px-4 py-2 rounded-lg text-xs font-bold" style={{ background: '#d946ef', color: 'white' }}>
          + New Page
        </button>
      </div>

      {loadingPages ? (
        <div className="panel rounded-2xl p-8 text-center">
          <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading pages...</p>
        </div>
      ) : sitePages.length === 0 ? (
        <div className="panel rounded-2xl p-8 text-center">
          <p className="text-sm text-gray-500 mb-4">No pages yet. Create your first page.</p>
          <button onClick={() => setActiveSite(null)} className="px-5 py-2.5 rounded-lg text-sm font-bold" style={{ background: '#d946ef', color: 'white' }}>
            Create Page
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5 stagger">
          {sitePages.map(page => (
            <button key={page.id} onClick={() => loadPage(page)} className="panel-interactive rounded-2xl p-4 sm:p-6 text-left group">
              <p className="text-base font-bold text-gray-200 group-hover:text-white transition-colors mb-1">{page.name}</p>
              <p className="text-xs text-gray-600 font-mono mb-2">/{page.slug}</p>
              {page.content && (
                <div className="rounded-lg overflow-hidden border border-white/5 h-32">
                  <iframe
                    srcDoc={extractHTML(page.content)}
                    title={page.name}
                    className="w-full h-full border-0 bg-white pointer-events-none"
                    style={{ transform: 'scale(0.3)', transformOrigin: 'top left', width: '333%', height: '333%' }}
                  />
                </div>
              )}
              <p className="text-[10px] text-gray-600 mt-2">{page.created_at ? new Date(page.created_at).toLocaleDateString() : ''}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // ── Home View ──
  if (!pageType) return (
    <div className="p-4 sm:p-6 lg:p-12">
      <div className="mb-6 sm:mb-8 animate-fade-in"><p className="hud-label text-[11px] mb-2" style={{ color: '#d946ef' }}>WEBSITE BUILDER</p><h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">AI Website Builder</h1><p className="text-base text-gray-500">Generate production-ready pages, sections, and components with AI</p></div>

      {/* My Sites Section */}
      {loadingSites ? (
        <div className="panel rounded-2xl p-8 mb-6 sm:mb-8 text-center">
          <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading sites...</p>
        </div>
      ) : sites.length > 0 && (
        <div className="mb-6 sm:mb-8">
          <p className="hud-label text-[11px] mb-3" style={{ color: '#d946ef' }}>MY SITES</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5 stagger">
            {sites.map(site => (
              <button key={site.id} onClick={() => loadSiteDetail(site)} className="panel-interactive rounded-2xl p-4 sm:p-6 text-left group">
                <p className="text-base font-bold text-gray-200 group-hover:text-white transition-colors mb-1">{site.name}</p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{site.pages || site.pageList?.length || 0} pages</span>
                  <span>{site.created_at ? new Date(site.created_at).toLocaleDateString() : ''}</span>
                </div>
                {site.domain && <p className="text-xs text-gray-600 mt-1 font-mono">{site.domain}</p>}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="hud-label text-[11px] mb-3" style={{ color: '#d946ef' }}>CHOOSE PAGE TYPE</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {PAGE_TYPES.map(p => (
          <button key={p.id} onClick={() => setPageType(p.id)} className="panel-interactive rounded-2xl p-4 sm:p-7 text-left group">
            <p className="text-base font-bold text-gray-200 group-hover:text-white transition-colors mb-1">{p.name}</p>
            <p className="text-xs text-gray-500 leading-relaxed">{p.desc}</p>
          </button>
        ))}
      </div>
      <p className="hud-label text-[11px] mb-3" style={{ color: '#d946ef' }}>QUICK TEMPLATES</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5 stagger">
        {TEMPLATES.map(t => (
          <button key={t.name} onClick={() => { setPageType(t.type); setStyle(t.style); generate(t.prompt); }} className="panel-interactive rounded-2xl p-4 sm:p-6 text-left group">
            <div className="flex items-center gap-2 mb-1"><span className="text-[9px] font-bold px-2 py-0.5 rounded-full border" style={{ background: 'rgba(217,70,239,0.1)', borderColor: 'rgba(217,70,239,0.2)', color: '#d946ef' }}>{t.style}</span><span className="text-[9px] text-gray-600">{t.type}</span></div>
            <p className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">{t.name}</p>
          </button>
        ))}
      </div>
    </div>
  );

  // ── Editor View ──
  return (
    <div className="p-4 sm:p-6 lg:p-12 animate-fade-in">
      <div className="flex items-center gap-3 sm:gap-5 mb-6 sm:mb-8">
        <button onClick={() => { setPageType(null); setOutput(''); setSaved(false); setVersions([]); setEditingPageId(null); }} className="p-2 rounded-md border border-indigo-500/10 text-gray-500 hover:text-white transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg></button>
        <div>
          <p className="hud-label text-[11px]" style={{ color: '#d946ef' }}>{PAGE_TYPES.find(p => p.id === pageType)?.name?.toUpperCase() || pageType?.toUpperCase()}</p>
          <h2 className="text-lg font-bold text-white">{PAGE_TYPES.find(p => p.id === pageType)?.name || pageType}{editingPageId && <span className="text-xs text-gray-500 font-normal ml-2">(editing)</span>}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="lg:col-span-3 space-y-4 sm:space-y-6">
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3">BRAND INFO</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
              <input value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Brand / Company name" className="input-field rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-base" />
              <div className="flex gap-3 items-center">
                <input type="color" value={colorPrimary} onChange={e => setColorPrimary(e.target.value)} className="w-12 h-12 rounded-lg cursor-pointer border-0 bg-transparent" />
                <input value={colorPrimary} onChange={e => setColorPrimary(e.target.value)} className="input-field rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-base flex-1 font-mono" />
              </div>
            </div>
            <textarea value={brandDesc} onChange={e => setBrandDesc(e.target.value)} rows={2} placeholder="Describe your brand, product, or service..." className="w-full input-field rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-base resize-none mt-5" />
          </div>

          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3">SECTIONS</p>
            <div className="flex flex-wrap gap-3">
              {SECTIONS.map(s => (
                <button key={s.id} onClick={() => toggleSection(s.id)} className={`chip text-xs ${selectedSections.includes(s.id) ? 'active' : ''}`}
                  style={selectedSections.includes(s.id) ? { background: 'rgba(217,70,239,0.15)', borderColor: 'rgba(217,70,239,0.3)', color: '#e879f9' } : {}}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => generate()} disabled={generating} className="btn-accent w-full py-3 sm:py-4 rounded-lg text-sm sm:text-base" style={{ background: generating ? '#1e1e2e' : '#d946ef', boxShadow: generating ? 'none' : '0 4px 20px -4px rgba(217,70,239,0.4)' }}>
            {generating ? <span className="flex items-center justify-center gap-2"><span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />GENERATING CODE...</span> : (editingPageId ? 'REGENERATE PAGE' : 'GENERATE PAGE')}
          </button>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3">STYLE</p>
            <div className="space-y-1.5">{STYLES.map(s => (<button key={s} onClick={() => setStyle(s)} className={`w-full chip text-xs justify-center ${style === s ? 'active' : ''}`} style={style === s ? { background: 'rgba(217,70,239,0.15)', borderColor: 'rgba(217,70,239,0.3)', color: '#e879f9' } : {}}>{s}</button>))}</div>
          </div>
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3">FRAMEWORK</p>
            <div className="space-y-1.5">{FRAMEWORKS.map(f => (<button key={f} onClick={() => setFramework(f)} className={`w-full chip text-xs justify-center ${framework === f ? 'active' : ''}`} style={framework === f ? { background: 'rgba(217,70,239,0.15)', borderColor: 'rgba(217,70,239,0.3)', color: '#e879f9' } : {}}>{f}</button>))}</div>
          </div>
        </div>
      </div>

      {output && (
        <div className="mt-6 animate-fade-up">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${generating ? 'bg-fuchsia-400 animate-pulse' : 'bg-emerald-400'}`} /><span className="hud-label text-[11px]" style={{ color: generating ? '#e879f9' : '#4ade80' }}>{generating ? 'GENERATING...' : 'CODE READY'}</span></div>
            <div className="flex flex-wrap gap-1">
              {['code', 'preview'].map(t => (<button key={t} onClick={() => setActiveTab(t)} className={`chip text-[9px] ${activeTab === t ? 'active' : ''}`} style={activeTab === t ? { background: 'rgba(217,70,239,0.15)', borderColor: 'rgba(217,70,239,0.3)', color: '#e879f9' } : {}}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>))}
            </div>
          </div>
          {activeTab === 'code' ? (
            <div className="panel rounded-2xl p-4 sm:p-7 overflow-x-auto">
              <pre className="text-sm sm:text-base text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 bg-fuchsia-400 ml-0.5 animate-pulse" />}</pre>
            </div>
          ) : (
            <div className="panel rounded-2xl overflow-hidden" style={{ height: '70vh' }}>
              <iframe
                title="Preview"
                srcDoc={extractHTML(output)}
                sandbox="allow-scripts"
                className="w-full h-full border-0 bg-white"
              />
            </div>
          )}

          {/* Refine Bar */}
          {!generating && (
            <div className="mt-4 panel rounded-2xl p-3 sm:p-4">
              <p className="hud-label text-[10px] mb-2" style={{ color: '#d946ef' }}>REFINE</p>
              <div className="flex gap-2">
                <input
                  value={refinePrompt}
                  onChange={e => setRefinePrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && refine()}
                  placeholder="e.g. Make the hero bigger, change colors to blue, add a testimonials section..."
                  className="input-field rounded-xl px-4 py-3 text-sm flex-1"
                />
                <button onClick={refine} disabled={!refinePrompt.trim()} className="px-5 py-3 rounded-xl text-sm font-bold tracking-wide transition-all whitespace-nowrap"
                  style={{ background: refinePrompt.trim() ? '#d946ef' : '#1e1e2e', color: 'white', opacity: refinePrompt.trim() ? 1 : 0.5 }}>
                  Refine
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!generating && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button onClick={handleSavePage} disabled={saving || saved} className="px-6 py-3 rounded-xl text-sm font-bold tracking-wide transition-all"
                style={{
                  background: saved ? '#22c55e' : saving ? '#1e1e2e' : '#d946ef',
                  boxShadow: saved ? '0 4px 20px -4px rgba(34,197,94,0.4)' : saving ? 'none' : '0 4px 20px -4px rgba(217,70,239,0.4)',
                  color: 'white',
                  opacity: saving ? 0.7 : 1,
                }}>
                {saved ? (editingPageId ? 'Page Updated' : 'Page Saved') : saving ? (
                  <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />Saving...</span>
                ) : (editingPageId ? 'Update Page' : 'Save Page')}
              </button>

              <button onClick={downloadHTML} className="px-5 py-3 rounded-xl text-sm font-bold tracking-wide border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-all">
                Download HTML
              </button>

              {versions.length > 0 && (
                <button onClick={undo} className="px-4 py-3 rounded-xl text-sm font-medium border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
                  Undo ({versions.length})
                </button>
              )}

              {saved && <span className="text-xs text-emerald-400">{editingPageId ? 'Page updated successfully.' : 'Page saved to your site.'}</span>}
            </div>
          )}
        </div>
      )}
      <AIInsightsPanel moduleId="website-builder" />
    </div>
  );
}
