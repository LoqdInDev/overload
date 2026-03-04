import { useState, useEffect, useRef } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import AIInsightsPanel from '../../components/shared/AIInsightsPanel';
import { fetchJSON, putJSON, deleteJSON, postJSON, connectSSE } from '../../lib/api';

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const colors = { success: '#22c55e', error: '#ef4444', info: '#a78bfa' };
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: '#1a1a2e', border: `1px solid ${colors[type] || colors.info}30`, borderLeft: `3px solid ${colors[type] || colors.info}`, borderRadius: 10, padding: '12px 16px', maxWidth: 320, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
      <p style={{ color: colors[type] || colors.info, fontSize: 13, fontWeight: 600, margin: 0 }}>{msg}</p>
    </div>
  );
}

// ── ConfirmDialog ─────────────────────────────────────────────────────────────
function ConfirmDialog({ msg, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="panel rounded-2xl p-6" style={{ width: 320 }}>
        <p className="text-sm text-gray-200 mb-4">{msg}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="chip text-xs px-4 py-2">Cancel</button>
          <button onClick={onConfirm} className="chip text-xs px-4 py-2" style={{ background: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────
const FUNNEL_TYPES = [
  { id: 'product-launch', name: 'Product Launch', icon: 'M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z',
    stages: ['Teaser', 'Sales Page', 'Order Form', 'Upsell', 'Thank You'],
    benchmarks: { teaser: '40-60%', 'sales page': '3-8%', 'order form': '60-80%', upsell: '20-35%', 'thank you': '—' },
  },
  { id: 'lead-magnet', name: 'Lead Magnet', icon: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3',
    stages: ['Landing', 'Opt-in', 'Thank You', 'Nurture', 'Offer'],
    benchmarks: { landing: '25-45%', 'opt-in': '40-70%', 'thank you': '—', nurture: '15-30%', offer: '2-5%' },
  },
  { id: 'webinar', name: 'Webinar', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
    stages: ['Registration', 'Confirmation', 'Live Room', 'Replay', 'Offer'],
    benchmarks: { registration: '20-40%', confirmation: '80-95%', 'live room': '30-50% show rate', replay: '40-60%', offer: '5-15%' },
  },
  { id: 'ecommerce', name: 'E-commerce', icon: 'M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z',
    stages: ['Product', 'Cart', 'Checkout', 'Upsell', 'Confirmation'],
    benchmarks: { product: '60-80%', cart: '40-60%', checkout: '55-75%', upsell: '15-30%', confirmation: '—' },
  },
  { id: 'saas', name: 'SaaS Trial', icon: 'M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z',
    stages: ['Landing', 'Sign Up', 'Onboarding', 'Trial', 'Convert'],
    benchmarks: { landing: '15-30%', 'sign up': '30-50%', onboarding: '60-80%', trial: '20-40%', convert: '15-25%' },
  },
  { id: 'membership', name: 'Membership', icon: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z',
    stages: ['Sales Page', 'Checkout', 'Welcome', 'Content', 'Community'],
    benchmarks: { 'sales page': '4-10%', checkout: '60-80%', welcome: '—', content: '70-90%', community: '40-60%' },
  },
];

const TEMPLATES = {
  'product-launch': [
    { name: 'Digital Product', product: 'Digital course/ebook', audience: 'Entrepreneurs and creators', industry: 'Education' },
    { name: 'Course Launch', product: 'Online training course', audience: 'Professionals seeking to upskill', industry: 'Education' },
    { name: 'App Launch', product: 'SaaS application', audience: 'Small business owners', industry: 'SaaS' },
    { name: 'Physical Product', product: 'Premium physical product', audience: 'Health-conscious consumers', industry: 'E-commerce' },
  ],
  'lead-magnet': [
    { name: 'Ebook Download', product: 'Free ebook guide', audience: 'Beginners in the niche', industry: 'Education' },
    { name: 'Free Tool', product: 'Free calculator/tool', audience: 'Professionals needing quick answers', industry: 'Tech' },
    { name: 'Checklist', product: 'Action checklist/cheatsheet', audience: 'Busy professionals', industry: 'Agency' },
    { name: 'Mini Course', product: '5-day email course', audience: 'Aspiring learners', industry: 'Education' },
  ],
  'webinar': [
    { name: 'Live Training', product: 'Live training webinar', audience: 'Motivated learners', industry: 'Education' },
    { name: 'On-Demand', product: 'Recorded masterclass', audience: 'Busy professionals', industry: 'Finance' },
    { name: 'Challenge', product: '5-day challenge leading to webinar', audience: 'Action-takers', industry: 'Health' },
    { name: 'Masterclass', product: 'Free masterclass (limited seats)', audience: 'Premium audience', industry: 'Agency' },
  ],
  'ecommerce': [
    { name: 'Supplement', product: 'Health supplement', audience: 'Health-conscious 30-55', industry: 'Health' },
    { name: 'Fashion', product: 'Fashion apparel brand', audience: 'Style-conscious millennials', industry: 'E-commerce' },
    { name: 'Home Goods', product: 'Premium home decor', audience: 'Homeowners 25-45', industry: 'E-commerce' },
    { name: 'Electronics', product: 'Consumer electronics', audience: 'Tech enthusiasts', industry: 'Tech' },
  ],
  'saas': [
    { name: 'Productivity Tool', product: 'Productivity SaaS', audience: 'Remote teams and freelancers', industry: 'SaaS' },
    { name: 'Marketing Tool', product: 'Marketing automation platform', audience: 'Marketing managers', industry: 'SaaS' },
    { name: 'Analytics', product: 'Business analytics tool', audience: 'Data-driven executives', industry: 'Finance' },
    { name: 'Design Tool', product: 'Design collaboration tool', audience: 'Creative teams', industry: 'Agency' },
  ],
  'membership': [
    { name: 'Community', product: 'Online community membership', audience: 'Like-minded professionals', industry: 'Education' },
    { name: 'Content Library', product: 'Premium content library', audience: 'Learners and practitioners', industry: 'Education' },
    { name: 'Coaching Program', product: 'Monthly coaching membership', audience: 'Growth-focused entrepreneurs', industry: 'Agency' },
    { name: 'Software Access', product: 'SaaS membership plan', audience: 'Small business owners', industry: 'SaaS' },
  ],
};

const INDUSTRIES = ['Tech', 'Health', 'Finance', 'Education', 'E-commerce', 'Agency', 'Real Estate', 'SaaS'];
const PRICE_POINTS = ['Free', '$1-50', '$50-200', '$200+'];
const URGENCY = ['Low', 'Medium', 'High'];
const FUNNEL_STATUSES = ['draft', 'active', 'paused', 'archived'];

const ROI_BENCHMARKS = {
  'product-launch': { avgConversion: 3.5, avgOrderValue: 197 },
  'lead-magnet': { avgConversion: 2.1, avgOrderValue: 97 },
  'webinar': { avgConversion: 8, avgOrderValue: 497 },
  'ecommerce': { avgConversion: 2.8, avgOrderValue: 85 },
  'saas': { avgConversion: 20, avgOrderValue: 49 },
  'membership': { avgConversion: 5, avgOrderValue: 49 },
};

const statusColor = (s) => s === 'active' ? '#22c55e' : s === 'paused' ? '#f59e0b' : s === 'archived' ? '#ef4444' : '#6b7280';

// ── Main Component ────────────────────────────────────────────────────────────
export default function FunnelsPage() {
  usePageTitle('Funnel Builder');

  // Navigation
  const [activeType, setActiveType] = useState(null);
  const [mainTab, setMainTab] = useState('builder'); // builder | list

  // Builder state
  const [activeStage, setActiveStage] = useState(0);
  const [builderTab, setBuilderTab] = useState('copy'); // copy | ab | email | roi | analyze
  const [product, setProduct] = useState('');
  const [audience, setAudience] = useState('');
  const [industry, setIndustry] = useState('Tech');
  const [price, setPrice] = useState('$50-200');
  const [urgency, setUrgency] = useState('Medium');

  // Per-stage generated content
  const [stageOutputs, setStageOutputs] = useState({}); // { stageName: content }
  const [generating, setGenerating] = useState(false);
  const cancelRef = useRef(null);

  // A/B Variants
  const [abOutput, setAbOutput] = useState(null);
  const [abGenerating, setAbGenerating] = useState(false);

  // Email Sequences
  const [emailOutput, setEmailOutput] = useState(null);
  const [emailGenerating, setEmailGenerating] = useState(false);
  const [emailFromStage, setEmailFromStage] = useState(0);

  // Funnel Analysis
  const [funnelAnalysis, setFunnelAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // ROI Calculator
  const [roiVisitors, setRoiVisitors] = useState(1000);
  const [roiConvRate, setRoiConvRate] = useState('');
  const [roiPrice, setRoiPrice] = useState('');

  // Save funnel
  const [savingFunnel, setSavingFunnel] = useState(false);
  const [savedFunnelId, setSavedFunnelId] = useState(null);

  // Saved funnels list
  const [funnels, setFunnels] = useState([]);
  const [funnelsLoading, setFunnelsLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // Confirm dialog
  const [confirm, setConfirm] = useState(null);

  const showToast = (msg, type = 'info') => {
    clearTimeout(toastTimer.current);
    setToast({ msg, type });
  };

  // Load saved funnels
  useEffect(() => {
    if (mainTab === 'list') {
      setFunnelsLoading(true);
      fetchJSON('/api/funnels/funnels')
        .then(data => setFunnels(Array.isArray(data) ? data : []))
        .catch(err => showToast(err.message || 'Failed to load funnels', 'error'))
        .finally(() => setFunnelsLoading(false));
    }
  }, [mainTab]);

  // Reset stage outputs when switching funnel type
  const selectFunnelType = (id) => {
    setActiveType(id);
    setActiveStage(0);
    setStageOutputs({});
    setAbOutput(null);
    setEmailOutput(null);
    setFunnelAnalysis(null);
    setSavedFunnelId(null);
    setBuilderTab('copy');
    // Pre-fill from template if available
    const tpl = TEMPLATES[id]?.[0];
    if (tpl) {
      setProduct(tpl.product || '');
      setAudience(tpl.audience || '');
      setIndustry(tpl.industry || 'Tech');
    }
  };

  const funnel = FUNNEL_TYPES.find(f => f.id === activeType);
  const currentStage = funnel?.stages[activeStage] || '';
  const templates = TEMPLATES[activeType] || TEMPLATES['product-launch'];

  // ── Generate stage copy ──────────────────────────────────────────────────
  const generateStageCopy = () => {
    if (!activeType) return;
    if (cancelRef.current) cancelRef.current();
    setGenerating(true);
    const stageName = currentStage;
    setStageOutputs(prev => ({ ...prev, [stageName]: '' }));

    cancelRef.current = connectSSE('/api/funnels/generate-stage', {
      funnelType: funnel?.name,
      stageName,
      product: product || funnel?.name + ' funnel',
      audience,
      industry,
      pricePoint: price,
      urgency,
    }, {
      onChunk: (chunk) => setStageOutputs(prev => ({ ...prev, [stageName]: (prev[stageName] || '') + chunk })),
      onResult: () => setGenerating(false),
      onError: (err) => { showToast(err.message || 'Generation failed', 'error'); setGenerating(false); },
      onDone: () => setGenerating(false),
    });
  };

  // ── Generate A/B variants ─────────────────────────────────────────────────
  const generateAbVariants = () => {
    if (!activeType) return;
    setAbGenerating(true);
    setAbOutput(null);
    let buf = '';
    connectSSE('/api/funnels/ab-variants', {
      stageName: currentStage,
      funnelType: funnel?.name,
      product,
      currentHeadline: '',
    }, {
      onChunk: (c) => { buf += c; },
      onResult: (data) => { setAbOutput(data); setAbGenerating(false); },
      onError: (err) => { showToast(err.message || 'A/B generation failed', 'error'); setAbGenerating(false); },
      onDone: () => setAbGenerating(false),
    });
  };

  // ── Generate email sequence ───────────────────────────────────────────────
  const generateEmailSequence = () => {
    if (!activeType) return;
    setEmailGenerating(true);
    setEmailOutput(null);
    let buf = '';
    connectSSE('/api/funnels/email-sequence', {
      funnelType: funnel?.name,
      fromStage: funnel?.stages[emailFromStage],
      toStage: funnel?.stages[emailFromStage + 1] || null,
      product,
      audience,
    }, {
      onChunk: (c) => { buf += c; },
      onResult: (data) => { setEmailOutput(data); setEmailGenerating(false); },
      onError: (err) => { showToast(err.message || 'Email generation failed', 'error'); setEmailGenerating(false); },
      onDone: () => setEmailGenerating(false),
    });
  };

  // ── Analyze funnel ────────────────────────────────────────────────────────
  const analyzeFunnel = async () => {
    if (!funnel) return;
    setAnalysisLoading(true);
    setFunnelAnalysis(null);
    try {
      const result = await postJSON('/api/funnels/analyze-funnel', {
        funnel_name: `${funnel.name} — ${product || 'General'}`,
        steps: funnel.stages.map((s, i) => ({ name: s, position: i + 1 })),
      });
      setFunnelAnalysis(result);
    } catch (err) {
      showToast(err.message || 'Analysis failed', 'error');
    }
    setAnalysisLoading(false);
  };

  // ── Save funnel to DB ─────────────────────────────────────────────────────
  const saveFunnel = async () => {
    if (!activeType || !product) { showToast('Add a product name before saving', 'error'); return; }
    setSavingFunnel(true);
    try {
      const saved = await postJSON('/api/funnels/funnels', {
        name: `${product} — ${funnel?.name}`,
        type: activeType,
        stages: funnel?.stages,
        product,
        audience,
        industry,
        status: 'draft',
      });
      setSavedFunnelId(saved.id);

      // Save each generated stage as a page
      const stageEntries = Object.entries(stageOutputs).filter(([, content]) => content);
      for (let i = 0; i < stageEntries.length; i++) {
        const [stageName, content] = stageEntries[i];
        await postJSON(`/api/funnels/funnels/${saved.id}/pages`, {
          name: stageName,
          stage_name: stageName,
          content,
          position: i,
        });
      }

      showToast(`Funnel saved: ${saved.name}`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save funnel', 'error');
    }
    setSavingFunnel(false);
  };

  // ── ROI calculation ───────────────────────────────────────────────────────
  const roiCalc = () => {
    const bench = ROI_BENCHMARKS[activeType] || { avgConversion: 3, avgOrderValue: 100 };
    const convRate = parseFloat(roiConvRate) || bench.avgConversion;
    const price_ = parseFloat(roiPrice) || bench.avgOrderValue;
    const visitors = parseInt(roiVisitors) || 1000;
    const leads = Math.round(visitors * 0.35);
    const sales = Math.round(visitors * (convRate / 100));
    const revenue = sales * price_;
    const industryBench = bench.avgConversion;
    return { leads, sales, revenue, convRate, price_, industryBench };
  };

  // ── Funnel list actions ───────────────────────────────────────────────────
  const updateFunnelStatus = async (id, status) => {
    try {
      const updated = await putJSON(`/api/funnels/funnels/${id}`, { status });
      setFunnels(prev => prev.map(f => f.id === id ? { ...f, status: updated.status || status } : f));
    } catch (err) { showToast(err.message || 'Update failed', 'error'); }
  };

  const removeFunnel = (id, name) => {
    setConfirm({
      msg: `Delete "${name}"? This cannot be undone.`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await deleteJSON(`/api/funnels/funnels/${id}`);
          setFunnels(prev => prev.filter(f => f.id !== id));
          showToast('Funnel deleted', 'success');
        } catch (err) { showToast(err.message || 'Delete failed', 'error'); }
      },
      onCancel: () => setConfirm(null),
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard', 'success'));
  };

  // ── Selection screen ──────────────────────────────────────────────────────
  if (!activeType) {
    return (
      <div className="p-4 sm:p-6 lg:p-12">
        {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        <div className="mb-6 sm:mb-8 animate-fade-in">
          <p className="hud-label text-[11px] mb-2" style={{ color: '#7c3aed' }}>FUNNEL BUILDER</p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">Funnel Builder</h1>
          <p className="text-base text-gray-500">AI generates high-converting copy for every stage of your funnel</p>
        </div>

        <div className="flex gap-1 mb-6">
          {[{ id: 'builder', label: 'Build New Funnel' }, { id: 'list', label: 'Saved Funnels' }].map(t => (
            <button key={t.id} onClick={() => setMainTab(t.id)}
              className={`chip text-xs ${mainTab === t.id ? 'active' : ''}`}
              style={mainTab === t.id ? { background: 'rgba(124,58,237,0.15)', borderColor: 'rgba(124,58,237,0.3)', color: '#a78bfa' } : {}}>
              {t.label}
            </button>
          ))}
        </div>

        {mainTab === 'builder' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5 stagger">
            {FUNNEL_TYPES.map(f => (
              <button key={f.id} onClick={() => selectFunnelType(f.id)} className="panel-interactive rounded-2xl p-4 sm:p-7 text-left group">
                <div className="w-12 h-12 rounded-lg mb-3 flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.12)' }}>
                  <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={f.icon} /></svg>
                </div>
                <p className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors mb-2">{f.name}</p>
                <div className="flex gap-1 flex-wrap">{f.stages.map((s, i) => (<span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.03] text-gray-600 border border-white/[0.04]">{s}</span>))}</div>
              </button>
            ))}
          </div>
        )}

        {mainTab === 'list' && (
          <div className="animate-fade-in">
            {funnelsLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="panel rounded-2xl p-6 h-16 animate-pulse" />)}</div>
            ) : funnels.length === 0 ? (
              <div className="panel rounded-2xl p-12 text-center">
                <p className="text-sm font-semibold text-gray-400 mb-1">No saved funnels yet</p>
                <p className="text-xs text-gray-600">Build a funnel and save it to see it here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {funnels.map(f => (
                  <div key={f.id} className="panel rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 group hover:border-violet-500/15 transition-all">
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-gray-200">{f.name}</p>
                      {f.product && <p className="text-xs text-gray-500 mt-0.5">{f.product}{f.audience ? ` · ${f.audience}` : ''}</p>}
                      <p className="text-[10px] text-gray-600 mt-0.5">{f.type || 'funnel'} · {f.created_at ? new Date(f.created_at).toLocaleDateString() : ''}</p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <select value={f.status || 'draft'} onChange={e => updateFunnelStatus(f.id, e.target.value)}
                        className="input-field rounded-lg px-2 py-1 text-[10px] font-bold"
                        style={{ color: statusColor(f.status), background: `${statusColor(f.status)}10`, borderColor: `${statusColor(f.status)}30` }}>
                        {FUNNEL_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                      <button onClick={() => removeFunnel(f.id, f.name)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 transition-all">
                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Builder screen ────────────────────────────────────────────────────────
  const roi = roiCalc();
  const currentOutput = stageOutputs[currentStage] || '';

  return (
    <div className="p-4 sm:p-6 lg:p-12 animate-fade-in">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {confirm && <ConfirmDialog msg={confirm.msg} onConfirm={confirm.onConfirm} onCancel={confirm.onCancel} />}

      {/* Header */}
      <div className="flex items-start sm:items-center gap-3 sm:gap-5 mb-6 sm:mb-8">
        <button onClick={() => { setActiveType(null); if (cancelRef.current) cancelRef.current(); }} className="p-2 rounded-md border border-indigo-500/10 text-gray-500 hover:text-white transition-all flex-shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="hud-label text-[11px]" style={{ color: '#7c3aed' }}>{funnel?.name?.toUpperCase()} FUNNEL</p>
          <h2 className="text-base sm:text-lg font-bold text-white">{funnel?.name} Funnel Builder</h2>
        </div>
        <button onClick={saveFunnel} disabled={savingFunnel} className="chip text-xs px-4 py-2 flex-shrink-0"
          style={savedFunnelId ? { borderColor: 'rgba(34,197,94,0.3)', color: '#22c55e', background: 'rgba(34,197,94,0.08)' } : { borderColor: 'rgba(124,58,237,0.3)', color: '#a78bfa', background: 'rgba(124,58,237,0.1)' }}>
          {savingFunnel ? 'Saving...' : savedFunnelId ? '✓ Saved' : 'Save Funnel'}
        </button>
      </div>

      {/* Funnel stages pipeline */}
      <div className="panel rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
        <p className="hud-label text-[11px] mb-3">FUNNEL STAGES</p>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1 sm:overflow-x-auto">
          {funnel?.stages.map((stage, i) => (
            <div key={i} className="flex items-center flex-shrink-0">
              <button onClick={() => setActiveStage(i)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold transition-all relative ${i === activeStage ? 'bg-violet-500/15 border border-violet-500/30 text-violet-300' : 'border border-indigo-500/8 text-gray-500 hover:text-gray-300 hover:border-indigo-500/15'}`}>
                <span className="text-[10px] block opacity-50 mb-0.5">STEP {i + 1}</span>
                {stage}
                {stageOutputs[stage] && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-violet-400" />}
              </button>
              {i < funnel.stages.length - 1 && <svg className="w-5 h-5 text-gray-700 mx-0.5 flex-shrink-0 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>}
            </div>
          ))}
        </div>
        {/* Stage benchmark */}
        {funnel?.benchmarks?.[currentStage.toLowerCase()] && (
          <p className="text-[10px] text-gray-600 mt-3">Industry benchmark for {currentStage}: <span className="text-violet-400">{funnel.benchmarks[currentStage.toLowerCase()]}</span> conversion rate</p>
        )}
      </div>

      {/* Builder tabs */}
      <div className="flex gap-1 mb-5 flex-wrap">
        {[
          { id: 'copy', label: 'Stage Copy' },
          { id: 'ab', label: 'A/B Variants' },
          { id: 'email', label: 'Email Sequence' },
          { id: 'roi', label: 'ROI Calculator' },
          { id: 'analyze', label: 'Funnel Analysis' },
        ].map(t => (
          <button key={t.id} onClick={() => setBuilderTab(t.id)}
            className={`chip text-xs ${builderTab === t.id ? 'active' : ''}`}
            style={builderTab === t.id ? { background: 'rgba(124,58,237,0.15)', borderColor: 'rgba(124,58,237,0.3)', color: '#a78bfa' } : {}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── COPY TAB ── */}
      {builderTab === 'copy' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Product context */}
            <div className="panel rounded-2xl p-4 sm:p-6">
              <p className="hud-label text-[11px] mb-3">PRODUCT DETAILS</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-600 mb-1 block">Product / Service</label>
                  <input value={product} onChange={e => setProduct(e.target.value)} placeholder="e.g. Online course on investing" className="w-full input-field rounded-xl px-4 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-600 mb-1 block">Target Audience</label>
                  <input value={audience} onChange={e => setAudience(e.target.value)} placeholder="e.g. Beginners 25-45, side-hustle seekers" className="w-full input-field rounded-xl px-4 py-2.5 text-sm" />
                </div>
              </div>
            </div>

            {/* Templates */}
            <div className="panel rounded-2xl p-4 sm:p-6">
              <p className="hud-label text-[11px] mb-3">QUICK START TEMPLATES</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {templates.map(t => (
                  <button key={t.name} onClick={() => { setProduct(t.product); setAudience(t.audience); setIndustry(t.industry); }}
                    className={`text-left px-4 py-3 rounded-lg border text-xs transition-all ${product === t.product ? 'border-violet-500/30 bg-violet-500/8 text-violet-300' : 'border-indigo-500/8 bg-white/[0.01] text-gray-400 hover:text-gray-200'}`}>
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5 line-clamp-1">{t.product}</p>
                  </button>
                ))}
              </div>
            </div>

            <button onClick={generateStageCopy} disabled={generating}
              className="btn-accent w-full py-3 rounded-lg text-xs sm:text-sm"
              style={{ background: generating ? '#1e1e2e' : '#7c3aed', boxShadow: generating ? 'none' : '0 4px 20px -4px rgba(124,58,237,0.4)' }}>
              {generating
                ? <span className="flex items-center justify-center gap-2"><span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />GENERATING...</span>
                : `GENERATE ${currentStage.toUpperCase()} COPY`}
            </button>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            <div className="panel rounded-2xl p-4 sm:p-6">
              <p className="hud-label text-[11px] mb-3">INDUSTRY</p>
              <div className="grid grid-cols-2 gap-1.5">
                {INDUSTRIES.map(i => (
                  <button key={i} onClick={() => setIndustry(i)}
                    className={`chip text-[10px] justify-center ${industry === i ? 'active' : ''}`}
                    style={industry === i ? { background: 'rgba(124,58,237,0.15)', borderColor: 'rgba(124,58,237,0.3)', color: '#a78bfa' } : {}}>
                    {i}
                  </button>
                ))}
              </div>
            </div>
            <div className="panel rounded-2xl p-4 sm:p-6">
              <p className="hud-label text-[11px] mb-3">PRICE POINT</p>
              <div className="grid grid-cols-2 gap-1.5">
                {PRICE_POINTS.map(p => (
                  <button key={p} onClick={() => setPrice(p)}
                    className={`chip text-[10px] justify-center ${price === p ? 'active' : ''}`}
                    style={price === p ? { background: 'rgba(124,58,237,0.15)', borderColor: 'rgba(124,58,237,0.3)', color: '#a78bfa' } : {}}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="panel rounded-2xl p-4 sm:p-6">
              <p className="hud-label text-[11px] mb-3">URGENCY LEVEL</p>
              <div className="grid grid-cols-3 gap-1.5">
                {URGENCY.map(u => (
                  <button key={u} onClick={() => setUrgency(u)}
                    className={`chip text-[10px] justify-center ${urgency === u ? 'active' : ''}`}
                    style={urgency === u ? { background: 'rgba(124,58,237,0.15)', borderColor: 'rgba(124,58,237,0.3)', color: '#a78bfa' } : {}}>
                    {u}
                  </button>
                ))}
              </div>
            </div>

            {/* Stage content overview */}
            <div className="panel rounded-2xl p-4 sm:p-6">
              <p className="hud-label text-[11px] mb-3">STAGE PROGRESS</p>
              {funnel?.stages.map(s => (
                <div key={s} className="flex items-center gap-2 py-1">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${stageOutputs[s] ? 'bg-violet-400' : 'bg-gray-700'}`} />
                  <span className="text-xs text-gray-500 flex-1">{s}</span>
                  {stageOutputs[s] && (
                    <button onClick={() => copyToClipboard(stageOutputs[s])} className="text-[10px] text-violet-400 hover:text-violet-300">Copy</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Output */}
      {builderTab === 'copy' && currentOutput && (
        <div className="mt-4 sm:mt-6 animate-fade-up">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-violet-400" />
              <span className="hud-label text-[11px]" style={{ color: '#a78bfa' }}>
                {generating ? 'GENERATING...' : `${currentStage.toUpperCase()} COPY READY`}
              </span>
            </div>
            <button onClick={() => copyToClipboard(currentOutput)} className="chip text-[10px] px-3 py-1.5">Copy</button>
          </div>
          <div className="panel rounded-2xl p-4 sm:p-6 lg:p-7">
            <pre className="text-sm sm:text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
              {currentOutput}{generating && <span className="inline-block w-1.5 h-4 bg-violet-400 ml-0.5 animate-pulse" />}
            </pre>
          </div>
        </div>
      )}

      {/* ── A/B VARIANTS TAB ── */}
      {builderTab === 'ab' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-2">A/B TEST VARIANTS</p>
            <p className="text-xs text-gray-500 mb-4">Generate 3 headline + CTA variant approaches for the <span className="text-violet-300">{currentStage}</span> stage. Switch stages above to test different pages.</p>
            <button onClick={generateAbVariants} disabled={abGenerating}
              className="btn-accent py-2.5 px-6 rounded-lg text-xs"
              style={{ background: abGenerating ? '#1e1e2e' : '#7c3aed', boxShadow: abGenerating ? 'none' : '0 4px 20px -4px rgba(124,58,237,0.4)' }}>
              {abGenerating
                ? <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />Generating variants...</span>
                : `Generate A/B Variants for ${currentStage}`}
            </button>
          </div>

          {abOutput?.variants && (
            <div className="space-y-4 animate-fade-in">
              {abOutput.variants.map((v, i) => (
                <div key={i} className="panel rounded-2xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs font-bold text-violet-300 mb-0.5">{v.label}</p>
                      <p className="text-[10px] text-gray-600">{v.approach}</p>
                    </div>
                    <button onClick={() => copyToClipboard(`${v.headline}\n${v.sub_headline}\nCTA: ${v.cta}`)} className="chip text-[10px] px-3 py-1">Copy</button>
                  </div>
                  <p className="text-base font-semibold text-white mb-1">{v.headline}</p>
                  <p className="text-sm text-gray-400 mb-3">{v.sub_headline}</p>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] text-gray-600">CTA:</span>
                    <span className="px-3 py-1 rounded-lg text-xs font-semibold" style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa' }}>{v.cta}</span>
                  </div>
                  <p className="text-xs text-gray-500 border-t border-white/5 pt-3">{v.why_it_works}</p>
                </div>
              ))}
              {abOutput.testing_tip && (
                <div className="panel rounded-2xl p-4">
                  <p className="hud-label text-[11px] mb-1">TESTING TIP</p>
                  <p className="text-xs text-gray-400">{abOutput.testing_tip}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── EMAIL SEQUENCE TAB ── */}
      {builderTab === 'email' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3">EMAIL SEQUENCE GENERATOR</p>
            <p className="text-xs text-gray-500 mb-4">Generate a 3-email follow-up sequence for a stage transition.</p>
            <div className="mb-4">
              <label className="text-[10px] text-gray-600 mb-2 block">After which stage?</label>
              <div className="flex flex-wrap gap-2">
                {funnel?.stages.map((s, i) => (
                  <button key={i} onClick={() => setEmailFromStage(i)}
                    className={`chip text-xs ${emailFromStage === i ? 'active' : ''}`}
                    style={emailFromStage === i ? { background: 'rgba(124,58,237,0.15)', borderColor: 'rgba(124,58,237,0.3)', color: '#a78bfa' } : {}}>
                    {s} →
                  </button>
                ))}
              </div>
            </div>
            <button onClick={generateEmailSequence} disabled={emailGenerating}
              className="btn-accent py-2.5 px-6 rounded-lg text-xs"
              style={{ background: emailGenerating ? '#1e1e2e' : '#7c3aed', boxShadow: emailGenerating ? 'none' : '0 4px 20px -4px rgba(124,58,237,0.4)' }}>
              {emailGenerating
                ? <span className="flex items-center gap-2"><span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />Writing emails...</span>
                : `Generate 3-Email Sequence after ${funnel?.stages[emailFromStage]}`}
            </button>
          </div>

          {emailOutput?.sequence && (
            <div className="space-y-4 animate-fade-in">
              {emailOutput.sequence.map((email, i) => (
                <div key={i} className="panel rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa' }}>E{email.email_number}</div>
                      <div>
                        <p className="text-[10px] text-gray-600">Send timing</p>
                        <p className="text-xs font-semibold text-gray-300">{email.send_timing}</p>
                      </div>
                    </div>
                    <button onClick={() => copyToClipboard(`Subject: ${email.subject}\nPreview: ${email.preview_text}\n\n${email.opening}\n\n${email.body}\n\nCTA: ${email.cta_text}\n\nP.S. ${email.ps_line || ''}`)} className="chip text-[10px] px-3 py-1">Copy</button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex gap-2"><span className="text-[10px] text-gray-600 w-14 flex-shrink-0">Subject:</span><span className="text-xs font-semibold text-white">{email.subject}</span></div>
                    <div className="flex gap-2"><span className="text-[10px] text-gray-600 w-14 flex-shrink-0">Preview:</span><span className="text-xs text-gray-400">{email.preview_text}</span></div>
                    <div className="border-t border-white/5 pt-2 mt-2">
                      <p className="text-xs text-gray-300 mb-2">{email.opening}</p>
                      <p className="text-xs text-gray-400 mb-3">{email.body}</p>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 rounded-lg text-xs font-semibold" style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa' }}>{email.cta_text}</span>
                        <span className="text-[10px] text-gray-600">{email.cta_purpose}</span>
                      </div>
                      {email.ps_line && <p className="text-[11px] text-gray-500 italic">P.S. {email.ps_line}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ROI CALCULATOR TAB ── */}
      {builderTab === 'roi' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="panel rounded-2xl p-5">
            <p className="hud-label text-[11px] mb-4">ROI CALCULATOR</p>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-gray-600 mb-1 block">Monthly Visitors</label>
                <input type="number" value={roiVisitors} onChange={e => setRoiVisitors(e.target.value)} className="w-full input-field rounded-xl px-4 py-2.5 text-sm" placeholder="1000" />
              </div>
              <div>
                <label className="text-[10px] text-gray-600 mb-1 flex items-center justify-between">
                  <span>Conversion Rate (%)</span>
                  <span className="text-violet-400">Industry avg: {ROI_BENCHMARKS[activeType]?.avgConversion}%</span>
                </label>
                <input type="number" value={roiConvRate} onChange={e => setRoiConvRate(e.target.value)} className="w-full input-field rounded-xl px-4 py-2.5 text-sm" placeholder={`${ROI_BENCHMARKS[activeType]?.avgConversion || 3} (industry avg)`} />
              </div>
              <div>
                <label className="text-[10px] text-gray-600 mb-1 flex items-center justify-between">
                  <span>Average Order Value ($)</span>
                  <span className="text-violet-400">Industry avg: ${ROI_BENCHMARKS[activeType]?.avgOrderValue}</span>
                </label>
                <input type="number" value={roiPrice} onChange={e => setRoiPrice(e.target.value)} className="w-full input-field rounded-xl px-4 py-2.5 text-sm" placeholder={`${ROI_BENCHMARKS[activeType]?.avgOrderValue || 100}`} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Monthly Leads', value: roi.leads.toLocaleString(), color: '#a78bfa' },
                { label: 'Monthly Sales', value: roi.sales.toLocaleString(), color: '#22c55e' },
                { label: 'Monthly Revenue', value: `$${roi.revenue.toLocaleString()}`, color: '#22c55e', big: true },
                { label: 'Annual Revenue', value: `$${(roi.revenue * 12).toLocaleString()}`, color: '#f59e0b', big: true },
              ].map(m => (
                <div key={m.label} className="panel rounded-2xl p-4 text-center">
                  <p className={`font-bold mb-1 ${m.big ? 'text-2xl' : 'text-xl'}`} style={{ color: m.color }}>{m.value}</p>
                  <p className="hud-label text-[10px]">{m.label}</p>
                </div>
              ))}
            </div>
            <div className="panel rounded-2xl p-4">
              <p className="hud-label text-[11px] mb-3">BENCHMARKS FOR {funnel?.name?.toUpperCase()}</p>
              {Object.entries(funnel?.benchmarks || {}).map(([stage, bench]) => (
                <div key={stage} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                  <span className="text-xs text-gray-500 capitalize">{stage}</span>
                  <span className="text-xs font-semibold text-violet-300">{bench}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ANALYZE TAB ── */}
      {builderTab === 'analyze' && (
        <div className="space-y-4 sm:space-y-6">
          <div className="panel rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="hud-label text-[11px] mb-1">FUNNEL LEAKAGE ANALYSIS</p>
                <p className="text-xs text-gray-500">AI analyzes your funnel stages and identifies conversion drop-off points.</p>
              </div>
              <button onClick={analyzeFunnel} disabled={analysisLoading}
                className="chip text-xs px-4 py-2"
                style={{ borderColor: 'rgba(124,58,237,0.3)', color: '#a78bfa', background: 'rgba(124,58,237,0.1)' }}>
                {analysisLoading ? 'Analyzing...' : 'Analyze Funnel'}
              </button>
            </div>
          </div>

          {funnelAnalysis && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-3 gap-4">
                <div className="panel rounded-2xl p-4 text-center">
                  <p className="text-3xl font-bold mb-1" style={{ color: '#a78bfa' }}>{funnelAnalysis.overall_efficiency}</p>
                  <p className="hud-label text-[10px]">Efficiency Score</p>
                </div>
                <div className="panel rounded-2xl p-4 text-center">
                  <p className="text-xl font-bold mb-1 text-white">{funnelAnalysis.estimated_current_conversion}</p>
                  <p className="hud-label text-[10px]">Current CVR</p>
                </div>
                <div className="panel rounded-2xl p-4 text-center">
                  <p className="text-xl font-bold mb-1" style={{ color: '#22c55e' }}>{funnelAnalysis.potential_conversion_with_fixes}</p>
                  <p className="hud-label text-[10px]">Potential CVR</p>
                </div>
              </div>

              {funnelAnalysis.biggest_drop_off_step && (
                <div className="panel rounded-2xl p-4 border-l-2" style={{ borderLeftColor: '#ef4444' }}>
                  <p className="text-xs font-bold text-red-400 mb-1">Biggest Drop-off: {funnelAnalysis.biggest_drop_off_step}</p>
                  <p className="text-xs text-gray-400">{funnelAnalysis.drop_off_reason}</p>
                </div>
              )}

              {funnelAnalysis.step_analysis?.length > 0 && (
                <div className="panel rounded-2xl p-5">
                  <p className="hud-label text-[11px] mb-3">STEP-BY-STEP ANALYSIS</p>
                  {funnelAnalysis.step_analysis.map((step, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: step.rating === 'good' ? '#22c55e' : step.rating === 'ok' ? '#f59e0b' : '#ef4444' }} />
                      <span className="text-sm text-gray-300 flex-1">{step.step}</span>
                      <span className="chip text-[10px] px-2 py-0.5">{step.estimated_conversion}</span>
                      <span className="text-[11px] text-gray-600 hidden sm:block max-w-48 truncate">{step.tip}</span>
                    </div>
                  ))}
                </div>
              )}

              {funnelAnalysis.top_recommendations?.length > 0 && (
                <div className="panel rounded-2xl p-5">
                  <p className="hud-label text-[11px] mb-3">TOP RECOMMENDATIONS</p>
                  {funnelAnalysis.top_recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 py-1.5">
                      <span className="text-violet-400 font-bold text-xs flex-shrink-0">{i + 1}.</span>
                      <p className="text-sm text-gray-300">{rec}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <AIInsightsPanel moduleId="funnels" />
    </div>
  );
}
