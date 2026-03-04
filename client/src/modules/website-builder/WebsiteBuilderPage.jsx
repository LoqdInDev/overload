import { useState, useEffect } from 'react';
import { fetchJSON, postJSON, putJSON, connectSSE } from '../../lib/api';
import { usePageTitle } from '../../hooks/usePageTitle';
import AIInsightsPanel from '../../components/shared/AIInsightsPanel';

/* ─── constants ─────────────────────────────────────────────────── */

const C = '#d946ef'; // module accent color

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

const VARIANT_STYLES = [
  { label: 'Bold', desc: 'Bold and attention-grabbing with strong typography and high contrast' },
  { label: 'Minimal', desc: 'Clean and minimal with lots of whitespace and subtle colors' },
  { label: 'Corporate', desc: 'Professional and trustworthy with conservative corporate design' },
];

const PREVIEW_WIDTHS = { mobile: '375px', tablet: '768px', desktop: '100%' };

/* ─── helpers ────────────────────────────────────────────────────── */

const extractHTML = (code) => {
  const m = code.match(/```(?:html)?\s*\n([\s\S]*?)```/);
  return m ? m[1] : code;
};

const injectSection = (html, sectionHtml) => {
  const idx = html.lastIndexOf('</body>');
  if (idx !== -1) return html.slice(0, idx) + '\n' + sectionHtml + '\n' + html.slice(idx);
  return html + '\n' + sectionHtml;
};

/* ─── chip button helper ─────────────────────────────────────────── */

const Chip = ({ active, onClick, children, className = '' }) => (
  <button
    onClick={onClick}
    className={`chip text-[10px] ${active ? 'active' : ''} ${className}`}
    style={active ? { background: `rgba(217,70,239,0.15)`, borderColor: `rgba(217,70,239,0.3)`, color: '#e879f9' } : {}}
  >
    {children}
  </button>
);

/* ─── component ──────────────────────────────────────────────────── */

export default function WebsiteBuilderPage() {
  usePageTitle('Website Builder');

  /* ── generation ── */
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
  const [previewSize, setPreviewSize] = useState('desktop');

  /* ── site management ── */
  const [sites, setSites] = useState([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSite, setActiveSite] = useState(null);
  const [sitePages, setSitePages] = useState([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [editingPageId, setEditingPageId] = useState(null);
  const [editingPageSiteId, setEditingPageSiteId] = useState(null);

  /* ── refinement & versions ── */
  const [refinePrompt, setRefinePrompt] = useState('');
  const [versions, setVersions] = useState([]);

  /* ── SEO audit ── */
  const [seoAudit, setSeoAudit] = useState(null);
  const [seoLoading, setSeoLoading] = useState(false);
  const [seoError, setSeoError] = useState(null);

  /* ── export ── */
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  /* ── A/B variants ── */
  const [variantsOpen, setVariantsOpen] = useState(false);
  const [variantResults, setVariantResults] = useState([null, null, null]);
  const [variantsGenerating, setVariantsGenerating] = useState(false);

  /* ── add section ── */
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [addSectionType, setAddSectionType] = useState(null);
  const [addSectionStream, setAddSectionStream] = useState('');
  const [addSectionGenerating, setAddSectionGenerating] = useState(false);

  /* ── swap copy ── */
  const [swapCopyOpen, setSwapCopyOpen] = useState(false);
  const [swapCopyInstructions, setSwapCopyInstructions] = useState('');
  const [swapCopyGenerating, setSwapCopyGenerating] = useState(false);

  /* ── brand consistency ── */
  const [consistencyResult, setConsistencyResult] = useState(null);
  const [consistencyLoading, setConsistencyLoading] = useState(false);
  const [consistencyError, setConsistencyError] = useState(null);

  /* ── delete confirmation ── */
  const [confirmDelete, setConfirmDelete] = useState(null); // { type, id, name }

  /* ── load sites on mount ── */
  useEffect(() => {
    fetchJSON('/api/website-builder/sites')
      .then((data) => setSites(data))
      .catch((err) => console.error('Failed to fetch sites:', err))
      .finally(() => setLoadingSites(false));
  }, []);

  /* ─── handlers ──────────────────────────────────────────────────── */

  const toggleSection = (id) =>
    setSelectedSections((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const buildPrompt = (extraStyle) => {
    const sections = selectedSections.map((id) => SECTIONS.find((s) => s.id === id)?.name).join(', ');
    return `Generate a ${(extraStyle || style).toLowerCase()} ${PAGE_TYPES.find((p) => p.id === pageType)?.name || 'landing page'} using ${framework}.\n\nBrand: ${brandName || 'My Brand'}\nDescription: ${brandDesc || 'A modern business'}\nPrimary Color: ${colorPrimary}\nSections: ${sections}\n\nGenerate clean, production-ready code with responsive design and modern UI patterns. Return only the complete HTML code without markdown code fences.`;
  };

  const generate = (templatePrompt) => {
    setGenerating(true);
    setOutput('');
    setSaved(false);
    setVersions([]);
    setEditingPageId(null);
    setExportError(null);
    setSeoAudit(null);
    setSeoError(null);
    const prompt = templatePrompt || buildPrompt();
    connectSSE(
      '/api/website-builder/generate',
      { type: pageType || 'landing', prompt },
      {
        onChunk: (text) => setOutput((prev) => prev + text),
        onResult: (data) => { setOutput(data.content); setGenerating(false); },
        onError: (err) => { console.error(err); setGenerating(false); },
      }
    );
  };

  const generateVariants = () => {
    if (variantsGenerating || !pageType) return;
    setVariantsGenerating(true);
    setVariantResults([null, null, null]);
    let done = 0;
    VARIANT_STYLES.forEach(({ desc: variantStyle }, i) => {
      let acc = '';
      connectSSE(
        '/api/website-builder/generate',
        { type: pageType, prompt: `${buildPrompt(variantStyle)}\n\nImportant style note: ${variantStyle}` },
        {
          onChunk: (text) => {
            acc += text;
            setVariantResults((prev) => { const n = [...prev]; n[i] = acc; return n; });
          },
          onResult: (data) => {
            setVariantResults((prev) => { const n = [...prev]; n[i] = data.content; return n; });
            done++;
            if (done === 3) setVariantsGenerating(false);
          },
          onError: () => { done++; if (done === 3) setVariantsGenerating(false); },
        }
      );
    });
  };

  const refine = () => {
    if (!refinePrompt.trim() || generating) return;
    setVersions((prev) => [...prev, output]);
    const prompt = `Here is the current HTML/CSS code:\n\n${extractHTML(output)}\n\nPlease make the following changes:\n${refinePrompt}\n\nReturn the complete updated HTML. Do not wrap in markdown code fences.`;
    setRefinePrompt('');
    setGenerating(true);
    setOutput('');
    setSaved(false);
    connectSSE(
      '/api/website-builder/generate',
      { type: pageType || 'landing', prompt },
      {
        onChunk: (text) => setOutput((prev) => prev + text),
        onResult: (data) => { setOutput(data.content); setGenerating(false); },
        onError: (err) => { console.error(err); setGenerating(false); },
      }
    );
  };

  const addSection = () => {
    if (!addSectionType || addSectionGenerating || !output) return;
    setAddSectionGenerating(true);
    setAddSectionStream('');
    let sectionHtml = '';
    connectSSE(
      '/api/website-builder/add-section',
      { currentHtml: extractHTML(output), sectionType: addSectionType, style, brandName },
      {
        onChunk: (text) => { sectionHtml += text; setAddSectionStream(sectionHtml); },
        onResult: (data) => {
          setVersions((prev) => [...prev, output]);
          setOutput(injectSection(extractHTML(output), data.section || sectionHtml));
          setSaved(false);
          setAddSectionGenerating(false);
          setAddSectionOpen(false);
          setAddSectionType(null);
          setAddSectionStream('');
        },
        onError: () => setAddSectionGenerating(false),
      }
    );
  };

  const swapCopy = () => {
    if (!output || swapCopyGenerating) return;
    setVersions((prev) => [...prev, output]);
    setSwapCopyGenerating(true);
    setOutput('');
    setSaved(false);
    connectSSE(
      '/api/website-builder/swap-copy',
      { currentHtml: extractHTML(output), instructions: swapCopyInstructions, brandName },
      {
        onChunk: (text) => setOutput((prev) => prev + text),
        onResult: (data) => { setOutput(data.content); setSwapCopyGenerating(false); setSwapCopyOpen(false); },
        onError: () => setSwapCopyGenerating(false),
      }
    );
  };

  const undo = () => {
    if (!versions.length) return;
    setOutput(versions[versions.length - 1]);
    setVersions((prev) => prev.slice(0, -1));
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
        setSites((prev) => [newSite, ...prev]);
      }
      setEditingPageSiteId(siteId);
      const typeName = PAGE_TYPES.find((p) => p.id === pageType)?.name || pageType || 'landing';
      const newPage = await postJSON('/api/website-builder/pages', {
        site_id: siteId,
        name: typeName,
        slug: pageType || 'landing',
        content: output,
      });
      setEditingPageId(newPage.id);
      setSaved(true);
    } catch (err) {
      console.error('Failed to save page:', err);
    } finally {
      setSaving(false);
    }
  };

  const exportSite = async () => {
    const siteId = editingPageSiteId || (sites.length > 0 ? sites[0].id : null);
    if (!siteId || exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      const response = await fetch(`/api/website-builder/sites/${siteId}/export`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Export failed');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cd = response.headers.get('Content-Disposition') || '';
      const match = cd.match(/filename="(.+?)"/);
      a.download = match ? match[1] : 'site.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err.message);
      setTimeout(() => setExportError(null), 5000);
    } finally {
      setExporting(false);
    }
  };

  const loadSiteDetail = async (site) => {
    setActiveSite(site);
    setLoadingPages(true);
    setConsistencyResult(null);
    setConsistencyError(null);
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
    setEditingPageSiteId(page.site_id);
    setActiveSite(null);
    setSaved(false);
    setVersions([]);
    setActiveTab('preview');
    setSeoAudit(null);
    setSeoError(null);
    setExportError(null);
  };

  const duplicatePage = async (page) => {
    try {
      const newPage = await postJSON(`/api/website-builder/pages/${page.id}/duplicate`, {});
      setSitePages((prev) => [...prev, newPage]);
    } catch (err) {
      console.error('Failed to duplicate page:', err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    try {
      await fetch(`/api/website-builder/${confirmDelete.type === 'site' ? 'sites' : 'pages'}/${confirmDelete.id}`, { method: 'DELETE' });
      if (confirmDelete.type === 'site') {
        setSites((prev) => prev.filter((s) => s.id !== confirmDelete.id));
      } else {
        setSitePages((prev) => prev.filter((p) => p.id !== confirmDelete.id));
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
    setConfirmDelete(null);
  };

  const checkBrandConsistency = async () => {
    if (!activeSite || consistencyLoading) return;
    setConsistencyLoading(true);
    setConsistencyResult(null);
    setConsistencyError(null);
    try {
      const result = await postJSON('/api/website-builder/brand-consistency', { site_id: activeSite.id });
      setConsistencyResult(result);
    } catch (err) {
      setConsistencyError(err.message || 'Analysis failed');
    } finally {
      setConsistencyLoading(false);
    }
  };

  /* ─── confirm delete dialog ─────────────────────────────────────── */
  const DeleteDialog = () =>
    confirmDelete ? (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setConfirmDelete(null)}>
        <div className="panel rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
          <p className="text-base font-bold text-white mb-1">Delete {confirmDelete.type}?</p>
          <p className="text-sm text-gray-400 mb-5">
            <span className="text-gray-200">"{confirmDelete.name}"</span> will be permanently deleted. This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-lg border border-white/10 text-sm text-gray-400 hover:text-white transition-all">
              Cancel
            </button>
            <button onClick={handleConfirmDelete} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: '#ef4444' }}>
              Delete
            </button>
          </div>
        </div>
      </div>
    ) : null;

  /* ─── site detail view ──────────────────────────────────────────── */
  if (!pageType && activeSite) return (
    <div className="p-4 sm:p-6 lg:p-12 animate-fade-in">
      <DeleteDialog />
      <div className="flex flex-wrap items-center gap-3 sm:gap-5 mb-6 sm:mb-8">
        <button onClick={() => setActiveSite(null)} className="p-2 rounded-md border border-indigo-500/10 text-gray-500 hover:text-white transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="hud-label text-[11px]" style={{ color: C }}>SITE</p>
          <h2 className="text-lg font-bold text-white truncate">{activeSite.name}</h2>
          {activeSite.domain && (
            <a href={activeSite.domain} target="_blank" rel="noopener noreferrer" className="text-xs text-fuchsia-400 font-mono hover:underline truncate block">{activeSite.domain}</a>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={async () => {
              setExporting(true);
              setExportError(null);
              try {
                const response = await fetch(`/api/website-builder/sites/${activeSite.id}/export`);
                if (!response.ok) { const e = await response.json(); throw new Error(e.error || 'Export failed'); }
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const cd = response.headers.get('Content-Disposition') || '';
                const m = cd.match(/filename="(.+?)"/);
                a.download = m ? m[1] : 'site.zip';
                a.click();
                URL.revokeObjectURL(url);
              } catch (err) { setExportError(err.message); }
              setExporting(false);
            }}
            disabled={exporting || sitePages.length < 1}
            className="px-4 py-2 rounded-lg text-xs font-bold border border-indigo-500/10 text-gray-400 hover:text-white hover:border-indigo-500/20 transition-all disabled:opacity-40"
          >
            {exporting ? 'Exporting...' : 'Export ZIP'}
          </button>
          <button
            onClick={checkBrandConsistency}
            disabled={consistencyLoading || sitePages.length < 1}
            className="px-4 py-2 rounded-lg text-xs font-bold border border-indigo-500/10 text-gray-400 hover:text-white hover:border-indigo-500/20 transition-all disabled:opacity-40"
          >
            {consistencyLoading ? 'Analyzing...' : 'Brand Consistency'}
          </button>
          <button
            onClick={() => setConfirmDelete({ type: 'site', id: activeSite.id, name: activeSite.name })}
            className="px-3 py-2 rounded-lg text-xs font-bold border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all"
          >
            Delete Site
          </button>
          <button onClick={() => setActiveSite(null)} className="px-4 py-2 rounded-lg text-xs font-bold text-white" style={{ background: C }}>
            + New Page
          </button>
        </div>
      </div>

      {/* Brand Consistency Result */}
      {(consistencyResult || consistencyError) && (
        <div className="panel rounded-2xl p-4 sm:p-6 mb-6 animate-fade-in">
          {consistencyError ? (
            <p className="text-sm text-red-400">{consistencyError}</p>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-4">
                <div
                  className="text-3xl font-bold font-mono"
                  style={{ color: consistencyResult.score >= 80 ? '#22c55e' : consistencyResult.score >= 60 ? '#f59e0b' : '#ef4444' }}
                >
                  {consistencyResult.score}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Brand Consistency Score</p>
                  <p className="text-xs text-gray-500">{consistencyResult.summary}</p>
                </div>
              </div>
              {consistencyResult.issues?.length > 0 && (
                <div className="space-y-2 mb-3">
                  {consistencyResult.issues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-lg bg-white/[0.02]">
                      <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${issue.severity === 'high' ? 'bg-red-500/10 text-red-400' : issue.severity === 'medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-gray-500/10 text-gray-400'}`}>
                        {issue.severity}
                      </span>
                      <div>
                        <p className="text-gray-300">{issue.message}</p>
                        <p className="text-gray-600 mt-0.5">{issue.fix}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {consistencyResult.strengths?.length > 0 && (
                <div className="space-y-1">
                  {consistencyResult.strengths.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-emerald-400">
                      <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {loadingPages ? (
        <div className="panel rounded-2xl p-8 text-center">
          <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading pages...</p>
        </div>
      ) : sitePages.length === 0 ? (
        <div className="panel rounded-2xl p-8 text-center">
          <p className="text-sm text-gray-500 mb-4">No pages yet. Create your first page.</p>
          <button onClick={() => setActiveSite(null)} className="px-5 py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: C }}>Create Page</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5 stagger">
          {sitePages.map((page) => (
            <div key={page.id} className="panel rounded-2xl overflow-hidden group">
              {/* Page thumbnail */}
              <button onClick={() => loadPage(page)} className="w-full text-left">
                {page.content ? (
                  <div className="border-b border-indigo-500/[0.06] h-32 overflow-hidden bg-white">
                    <iframe
                      srcDoc={extractHTML(page.content)}
                      title={page.name}
                      className="w-full border-0 bg-white pointer-events-none"
                      style={{ transform: 'scale(0.3)', transformOrigin: 'top left', width: '333%', height: '333%' }}
                    />
                  </div>
                ) : (
                  <div className="h-32 border-b border-indigo-500/[0.06] flex items-center justify-center bg-white/[0.01]">
                    <p className="text-xs text-gray-600">No preview</p>
                  </div>
                )}
                <div className="p-4">
                  <p className="text-sm font-bold text-gray-200 group-hover:text-white transition-colors">{page.name}</p>
                  <p className="text-xs text-gray-600 font-mono">/{page.slug}</p>
                  <p className="text-[10px] text-gray-700 mt-1">{page.created_at ? new Date(page.created_at).toLocaleDateString() : ''}</p>
                </div>
              </button>
              {/* Page actions */}
              <div className="px-4 pb-3 flex gap-2">
                <button onClick={() => duplicatePage(page)} className="text-[10px] px-2 py-1 rounded-md border border-indigo-500/10 text-gray-500 hover:text-gray-300 transition-all flex-1">
                  Duplicate
                </button>
                <button
                  onClick={() => setConfirmDelete({ type: 'page', id: page.id, name: page.name })}
                  className="text-[10px] px-2 py-1 rounded-md border border-red-500/10 text-red-500 hover:bg-red-500/10 transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /* ─── home view ─────────────────────────────────────────────────── */
  if (!pageType) return (
    <div className="p-4 sm:p-6 lg:p-12">
      <DeleteDialog />
      <div className="mb-6 sm:mb-8 animate-fade-in">
        <p className="hud-label text-[11px] mb-2" style={{ color: C }}>WEBSITE BUILDER</p>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">AI Website Builder</h1>
        <p className="text-base text-gray-500">Generate production-ready pages with AI — then refine, preview, and deploy</p>
      </div>

      {/* My Sites */}
      {loadingSites ? (
        <div className="panel rounded-2xl p-8 mb-6 text-center">
          <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading sites...</p>
        </div>
      ) : sites.length > 0 && (
        <div className="mb-6 sm:mb-8">
          <p className="hud-label text-[11px] mb-3" style={{ color: C }}>MY SITES</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5 stagger">
            {sites.map((site) => (
              <div key={site.id} className="panel rounded-2xl p-4 sm:p-6 group relative">
                <button onClick={() => loadSiteDetail(site)} className="w-full text-left">
                  <p className="text-base font-bold text-gray-200 group-hover:text-white transition-colors mb-1 pr-6">{site.name}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{site.pages || 0} pages</span>
                    <span>{site.created_at ? new Date(site.created_at).toLocaleDateString() : ''}</span>
                  </div>
                  {site.domain && (
                    <p className="text-xs text-fuchsia-400 mt-1 font-mono truncate">{site.domain}</p>
                  )}
                </button>
                <button
                  onClick={() => setConfirmDelete({ type: 'site', id: site.id, name: site.name })}
                  className="absolute top-3 right-3 w-6 h-6 rounded-md border border-red-500/10 text-red-500/50 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="hud-label text-[11px] mb-3" style={{ color: C }}>CHOOSE PAGE TYPE</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {PAGE_TYPES.map((p) => (
          <button key={p.id} onClick={() => setPageType(p.id)} className="panel-interactive rounded-2xl p-4 sm:p-7 text-left group">
            <p className="text-base font-bold text-gray-200 group-hover:text-white transition-colors mb-1">{p.name}</p>
            <p className="text-xs text-gray-500 leading-relaxed">{p.desc}</p>
          </button>
        ))}
      </div>

      <p className="hud-label text-[11px] mb-3" style={{ color: C }}>QUICK TEMPLATES</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5 stagger">
        {TEMPLATES.map((t) => (
          <button key={t.name} onClick={() => { setPageType(t.type); setStyle(t.style); generate(t.prompt); }} className="panel-interactive rounded-2xl p-4 sm:p-6 text-left group">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border" style={{ background: 'rgba(217,70,239,0.1)', borderColor: 'rgba(217,70,239,0.2)', color: C }}>{t.style}</span>
              <span className="text-[9px] text-gray-600">{t.type}</span>
            </div>
            <p className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">{t.name}</p>
          </button>
        ))}
      </div>
    </div>
  );

  /* ─── editor view ───────────────────────────────────────────────── */
  return (
    <div className="p-4 sm:p-6 lg:p-12 animate-fade-in">
      <DeleteDialog />

      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-5 mb-6 sm:mb-8">
        <button
          onClick={() => { setPageType(null); setOutput(''); setSaved(false); setVersions([]); setEditingPageId(null); setEditingPageSiteId(null); setExportError(null); }}
          className="p-2 rounded-md border border-indigo-500/10 text-gray-500 hover:text-white transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        </button>
        <div>
          <p className="hud-label text-[11px]" style={{ color: C }}>{(PAGE_TYPES.find((p) => p.id === pageType)?.name || pageType || '').toUpperCase()}</p>
          <h2 className="text-lg font-bold text-white">
            {PAGE_TYPES.find((p) => p.id === pageType)?.name || pageType}
            {editingPageId && <span className="text-xs text-gray-500 font-normal ml-2">(editing)</span>}
          </h2>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Left: Brand + Sections + Generate */}
        <div className="lg:col-span-3 space-y-4 sm:space-y-6">
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3">BRAND INFO</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-5">
              <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Brand / Company name" className="input-field rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-base" />
              <div className="flex gap-3 items-center">
                <input type="color" value={colorPrimary} onChange={(e) => setColorPrimary(e.target.value)} className="w-12 h-12 rounded-lg cursor-pointer border-0 bg-transparent" />
                <input value={colorPrimary} onChange={(e) => setColorPrimary(e.target.value)} className="input-field rounded-xl px-4 py-3 text-base flex-1 font-mono" />
              </div>
            </div>
            <textarea value={brandDesc} onChange={(e) => setBrandDesc(e.target.value)} rows={2} placeholder="Describe your brand, product, or service..." className="w-full input-field rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-base resize-none mt-3 sm:mt-5" />
          </div>

          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3">SECTIONS</p>
            <div className="flex flex-wrap gap-3">
              {SECTIONS.map((s) => (
                <Chip key={s.id} active={selectedSections.includes(s.id)} onClick={() => toggleSection(s.id)}>
                  {s.name}
                </Chip>
              ))}
            </div>
          </div>

          <button
            onClick={() => generate()}
            disabled={generating}
            className="btn-accent w-full py-3 sm:py-4 rounded-lg text-sm sm:text-base"
            style={{ background: generating ? '#1e1e2e' : C, boxShadow: generating ? 'none' : `0 4px 20px -4px rgba(217,70,239,0.4)` }}
          >
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
                GENERATING CODE...
              </span>
            ) : editingPageId ? 'REGENERATE PAGE' : 'GENERATE PAGE'}
          </button>
        </div>

        {/* Right: Style + Framework */}
        <div className="space-y-4 sm:space-y-6">
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3">STYLE</p>
            <div className="space-y-1.5">
              {STYLES.map((s) => <Chip key={s} active={style === s} onClick={() => setStyle(s)} className="w-full justify-center">{s}</Chip>)}
            </div>
          </div>
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3">FRAMEWORK</p>
            <div className="space-y-1.5">
              {FRAMEWORKS.map((f) => <Chip key={f} active={framework === f} onClick={() => setFramework(f)} className="w-full justify-center">{f}</Chip>)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Output area ── */}
      {output && (
        <div className="mt-6 animate-fade-up space-y-4">

          {/* Tab bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${generating ? 'bg-fuchsia-400 animate-pulse' : 'bg-emerald-400'}`} />
              <span className="hud-label text-[11px]" style={{ color: generating ? '#e879f9' : '#4ade80' }}>
                {generating ? 'GENERATING...' : 'CODE READY'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {['code', 'preview'].map((t) => (
                <Chip key={t} active={activeTab === t} onClick={() => setActiveTab(t)}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Chip>
              ))}
              {activeTab === 'preview' && (
                <div className="flex gap-1 ml-1 pl-1 border-l border-indigo-500/10">
                  {Object.keys(PREVIEW_WIDTHS).map((size) => (
                    <Chip key={size} active={previewSize === size} onClick={() => setPreviewSize(size)}>
                      {size.charAt(0).toUpperCase() + size.slice(1)}
                    </Chip>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Code / Preview panel */}
          {activeTab === 'code' ? (
            <div className="panel rounded-2xl p-4 sm:p-7 overflow-x-auto">
              <pre className="text-sm sm:text-base text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                {output}
                {generating && <span className="inline-block w-1.5 h-4 bg-fuchsia-400 ml-0.5 animate-pulse" />}
              </pre>
            </div>
          ) : (
            <div className="panel rounded-2xl overflow-hidden flex flex-col items-center" style={{ height: '70vh', background: '#0a0a14' }}>
              <div className="w-full h-full overflow-auto flex justify-center p-2">
                <iframe
                  title="Preview"
                  srcDoc={extractHTML(output)}
                  className="h-full border-0 bg-white transition-all duration-300"
                  style={{ width: PREVIEW_WIDTHS[previewSize] || '100%', flexShrink: 0 }}
                />
              </div>
            </div>
          )}

          {/* Refine / Swap Copy bar */}
          {!generating && (
            swapCopyOpen ? (
              <div className="panel rounded-2xl p-3 sm:p-4">
                <p className="hud-label text-[10px] mb-2" style={{ color: C }}>SWAP COPY — keeps layout, rewrites text only</p>
                <div className="flex gap-2">
                  <input
                    value={swapCopyInstructions}
                    onChange={(e) => setSwapCopyInstructions(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && swapCopy()}
                    placeholder="e.g. Make it more energetic, use benefit-focused language, target developers..."
                    className="input-field rounded-xl px-4 py-3 text-sm flex-1"
                  />
                  <button onClick={swapCopy} disabled={swapCopyGenerating} className="px-4 py-3 rounded-xl text-sm font-bold whitespace-nowrap" style={{ background: C, color: 'white', opacity: swapCopyGenerating ? 0.6 : 1 }}>
                    {swapCopyGenerating ? 'Rewriting...' : 'Swap Copy'}
                  </button>
                  <button onClick={() => setSwapCopyOpen(false)} className="px-3 py-3 rounded-xl text-sm border border-white/10 text-gray-400 hover:text-white transition-all">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="panel rounded-2xl p-3 sm:p-4">
                <p className="hud-label text-[10px] mb-2" style={{ color: C }}>REFINE</p>
                <div className="flex gap-2">
                  <input
                    value={refinePrompt}
                    onChange={(e) => setRefinePrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && refine()}
                    placeholder="e.g. Make the hero bigger, change colors to blue, add an FAQ section..."
                    className="input-field rounded-xl px-4 py-3 text-sm flex-1"
                  />
                  <button onClick={refine} disabled={!refinePrompt.trim()} className="px-5 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all"
                    style={{ background: refinePrompt.trim() ? C : '#1e1e2e', color: 'white', opacity: refinePrompt.trim() ? 1 : 0.5 }}>
                    Refine
                  </button>
                </div>
              </div>
            )
          )}

          {/* Action buttons */}
          {!generating && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Primary: Save */}
              <button onClick={handleSavePage} disabled={saving || saved} className="px-5 py-3 rounded-xl text-sm font-bold tracking-wide transition-all"
                style={{ background: saved ? '#22c55e' : saving ? '#1e1e2e' : C, boxShadow: saved ? '0 4px 20px -4px rgba(34,197,94,0.4)' : saving ? 'none' : `0 4px 20px -4px rgba(217,70,239,0.4)`, color: 'white', opacity: saving ? 0.7 : 1 }}>
                {saved ? (editingPageId ? 'Updated' : 'Saved') : saving ? (
                  <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />Saving...</span>
                ) : editingPageId ? 'Update Page' : 'Save Page'}
              </button>

              {/* Download */}
              <button onClick={downloadHTML} className="px-4 py-3 rounded-xl text-sm font-bold border border-white/10 text-gray-300 hover:text-white hover:border-white/20 transition-all">
                Download
              </button>

              {/* Undo */}
              {versions.length > 0 && (
                <button onClick={undo} className="px-4 py-3 rounded-xl text-sm font-medium border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg>
                  Undo ({versions.length})
                </button>
              )}

              <div className="h-6 w-px bg-white/10 hidden sm:block" />

              {/* Export Site */}
              <button
                onClick={exportSite}
                disabled={exporting || (!saved && !editingPageId)}
                className="px-4 py-3 rounded-xl text-sm font-bold border transition-all flex items-center gap-1.5 disabled:opacity-40"
                style={{ borderColor: 'rgba(217,70,239,0.2)', color: '#e879f9', background: 'rgba(217,70,239,0.08)' }}
                title={!saved && !editingPageId ? 'Save page first to export' : 'Download all pages as ZIP'}
              >
                {exporting ? (
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-fuchsia-600 border-t-fuchsia-300 rounded-full animate-spin" />Exporting...</span>
                ) : 'Export Site (.zip)'}
              </button>

              {/* A/B Variants */}
              <button onClick={() => { setVariantsOpen(!variantsOpen); if (!variantsOpen) setVariantResults([null, null, null]); }}
                className={`px-4 py-3 rounded-xl text-sm font-bold border transition-all ${variantsOpen ? 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300' : 'border-white/10 text-gray-400 hover:text-white hover:border-white/20'}`}>
                A/B Variants
              </button>

              {/* Add Section */}
              <button onClick={() => setAddSectionOpen(!addSectionOpen)}
                className={`px-4 py-3 rounded-xl text-sm font-bold border transition-all ${addSectionOpen ? 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300' : 'border-white/10 text-gray-400 hover:text-white hover:border-white/20'}`}>
                + Add Section
              </button>

              {/* Swap Copy */}
              <button onClick={() => setSwapCopyOpen(!swapCopyOpen)}
                className={`px-4 py-3 rounded-xl text-sm font-bold border transition-all ${swapCopyOpen ? 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300' : 'border-white/10 text-gray-400 hover:text-white hover:border-white/20'}`}>
                Swap Copy
              </button>

              {saved && <span className="text-xs text-emerald-400">{editingPageId ? 'Page updated.' : 'Page saved to your site.'}</span>}
            </div>
          )}

          {/* Export error */}
          {exportError && (
            <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
              <p className="text-sm text-red-400">{exportError}</p>
            </div>
          )}

          {/* Add Section panel */}
          {addSectionOpen && (
            <div className="panel rounded-2xl p-4 sm:p-6">
              <p className="hud-label text-[11px] mb-3" style={{ color: C }}>ADD SECTION — generates and injects into current page</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {SECTIONS.map((s) => (
                  <Chip key={s.id} active={addSectionType === s.id} onClick={() => setAddSectionType(s.id)}>{s.name}</Chip>
                ))}
              </div>
              {addSectionGenerating && addSectionStream && (
                <pre className="text-xs text-gray-500 whitespace-pre-wrap font-mono p-3 rounded-lg bg-black/20 max-h-24 overflow-y-auto mb-3">
                  {addSectionStream}
                  <span className="inline-block w-1 h-3 bg-fuchsia-400 ml-0.5 animate-pulse" />
                </pre>
              )}
              <div className="flex gap-2">
                <button onClick={addSection} disabled={!addSectionType || addSectionGenerating} className="px-5 py-2.5 rounded-lg text-sm font-bold disabled:opacity-40 text-white" style={{ background: C }}>
                  {addSectionGenerating ? 'Generating & Injecting...' : 'Generate & Inject'}
                </button>
                <button onClick={() => { setAddSectionOpen(false); setAddSectionType(null); setAddSectionStream(''); }} className="px-4 py-2.5 rounded-lg text-sm border border-white/10 text-gray-400 hover:text-white transition-all">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* A/B Variants panel */}
          {variantsOpen && (
            <div className="panel rounded-2xl p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <p className="hud-label text-[11px]" style={{ color: C }}>A/B VARIANTS — 3 style directions side by side</p>
                <button
                  onClick={generateVariants}
                  disabled={variantsGenerating}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-60"
                  style={{ background: C }}
                >
                  {variantsGenerating ? 'Generating all 3...' : 'Generate 3 Variants'}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {VARIANT_STYLES.map(({ label }, i) => (
                  <div key={i} className="rounded-xl border border-indigo-500/10 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-indigo-500/[0.06]">
                      <span className="text-xs font-bold text-gray-300">Variant {i + 1}: {label}</span>
                      {variantResults[i] && !variantsGenerating && (
                        <button
                          onClick={() => { setVersions((p) => [...p, output]); setOutput(variantResults[i]); setSaved(false); setVariantsOpen(false); }}
                          className="text-[10px] px-2 py-1 rounded-md border border-fuchsia-500/20 text-fuchsia-400 hover:bg-fuchsia-500/10 transition-all"
                        >
                          Use this
                        </button>
                      )}
                    </div>
                    <div style={{ height: '180px', position: 'relative', overflow: 'hidden', background: '#fff' }}>
                      {variantResults[i] ? (
                        <iframe
                          title={`Variant ${i + 1}`}
                          srcDoc={extractHTML(variantResults[i])}
                          className="border-0 bg-white pointer-events-none"
                          style={{ width: '200%', height: '200%', transform: 'scale(0.5)', transformOrigin: 'top left' }}
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center bg-white/[0.01]">
                          {variantsGenerating ? (
                            <div className="text-center">
                              <div className="w-4 h-4 border-2 border-gray-700 border-t-fuchsia-400 rounded-full animate-spin mx-auto mb-2" />
                              <p className="text-[10px] text-gray-600">Generating...</p>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-600">Click Generate</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEO Audit */}
          <div className="panel rounded-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="hud-label text-[11px]">SEO AUDIT</p>
              <button
                onClick={async () => {
                  setSeoLoading(true);
                  setSeoAudit(null);
                  setSeoError(null);
                  try {
                    const result = await postJSON('/api/website-builder/seo-audit', { html: output, page_title: pageType || '' });
                    setSeoAudit(result);
                  } catch (err) {
                    setSeoError(err.message || 'SEO audit failed');
                  }
                  setSeoLoading(false);
                }}
                disabled={seoLoading}
                className="text-xs px-3 py-1.5 rounded-lg border border-indigo-500/10 text-gray-400 hover:text-white hover:border-indigo-500/20 transition-all disabled:opacity-50"
              >
                {seoLoading ? 'Auditing...' : 'Run SEO Audit'}
              </button>
            </div>

            {seoError && <p className="text-sm text-red-400">{seoError}</p>}

            {seoAudit && (
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-4xl font-bold font-mono" style={{ color: seoAudit.overall_score >= 80 ? '#22c55e' : seoAudit.overall_score >= 60 ? '#f59e0b' : '#ef4444' }}>
                    {seoAudit.overall_score}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">SEO Score</p>
                    {seoAudit.top_fix && <p className="text-xs text-gray-500">Top fix: {seoAudit.top_fix}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  {seoAudit.checks?.map((check, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="flex-shrink-0">{check.status === 'pass' ? '✅' : check.status === 'warning' ? '⚠️' : '❌'}</span>
                      <span className="font-medium text-gray-300 w-40 flex-shrink-0">{check.name}</span>
                      <span className="text-xs text-gray-500">{check.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <AIInsightsPanel moduleId="website-builder" />
    </div>
  );
}
