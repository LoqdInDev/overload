import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import ModuleWrapper from '../../components/shared/ModuleWrapper';
import { fetchJSON, postJSON, deleteJSON } from '../../lib/api';

const API_BASE = import.meta.env.VITE_API_URL || '';
const MODULE_COLOR = '#f59e0b';

const EMAIL_TYPES = [
  { id: 'campaign', name: 'Email Campaign', icon: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75', desc: 'One-off promotional emails' },
  { id: 'sms', name: 'SMS Blast', icon: 'M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3', desc: 'Short text message campaigns' },
  { id: 'drip', name: 'Drip Sequence', icon: 'M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3', desc: 'Automated multi-step flows' },
  { id: 'welcome', name: 'Welcome Series', icon: 'M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z', desc: 'Onboard new subscribers' },
  { id: 'winback', name: 'Win-Back', icon: 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182', desc: 'Re-engage inactive users' },
];

const TEMPLATES = {
  campaign: [
    { name: 'Product Launch', prompt: 'Write a compelling product launch email announcing our new product. Highlight key features and benefits, build excitement, and drive early purchases.' },
    { name: 'Newsletter', prompt: 'Write a monthly newsletter email that curates industry insights, company updates, and valuable tips for our subscribers.' },
    { name: 'Flash Sale', prompt: 'Write an urgency-driven flash sale email with a limited-time discount. Create FOMO and drive immediate action.' },
    { name: 'Event Invite', prompt: 'Write an event invitation email that builds anticipation, highlights speakers/agenda, and drives RSVPs.' },
  ],
  sms: [
    { name: 'Promo Alert', prompt: 'Write a short SMS promo alert with a discount code. Max 160 characters, punchy and direct.' },
    { name: 'Order Update', prompt: 'Write a transactional SMS notifying the customer about their order status with a tracking link.' },
    { name: 'Appointment Reminder', prompt: 'Write a friendly appointment reminder SMS with date, time, and confirmation link.' },
    { name: 'Flash Deal', prompt: 'Write an SMS flash deal notification with extreme urgency. Include code and expiry.' },
  ],
  drip: [
    { name: 'Onboarding Flow', prompt: 'Write a 5-email onboarding drip sequence that guides new users through product setup, key features, and first success milestone.' },
    { name: 'Nurture Sequence', prompt: 'Write a 4-email nurture sequence that educates leads about the problem, builds trust with case studies, and converts to trial.' },
    { name: 'Course Delivery', prompt: 'Write a 7-email educational course delivery sequence with one lesson per email, building to a product pitch.' },
    { name: 'Cart Abandonment', prompt: 'Write a 3-email cart abandonment sequence: gentle reminder, social proof push, final discount offer.' },
  ],
  welcome: [
    { name: 'SaaS Welcome', prompt: 'Write a 3-part SaaS welcome series: warm greeting + quick start guide, feature highlight, success story + upgrade CTA.' },
    { name: 'Ecommerce Welcome', prompt: 'Write a welcome email for new ecommerce subscribers with a first-purchase discount and bestseller showcase.' },
    { name: 'Community Welcome', prompt: 'Write a community welcome email introducing group guidelines, key resources, and how to get the most value.' },
    { name: 'Newsletter Welcome', prompt: 'Write a newsletter welcome email that sets expectations, showcases best past content, and encourages social follows.' },
  ],
  winback: [
    { name: 'We Miss You', prompt: 'Write a warm "we miss you" re-engagement email for subscribers who haven\'t opened in 60 days. Include a special comeback offer.' },
    { name: 'Whats New', prompt: 'Write a "here\'s what you\'ve missed" email highlighting new features and improvements since the user was last active.' },
    { name: 'Feedback Request', prompt: 'Write a sincere email asking why the user left, offering a feedback survey with an incentive for completion.' },
    { name: 'Final Notice', prompt: 'Write a last-chance email before unsubscribing inactive users. Create urgency with an exclusive retention offer.' },
  ],
};

const TONES = ['Professional', 'Friendly', 'Urgent', 'Playful'];
const LENGTHS = ['Short', 'Medium', 'Long'];

const STATUS_COLORS = {
  draft: { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' },
  active: { color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.2)' },
  sent: { color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)' },
  scheduled: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  paused: { color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
};

const GRADE_COLOR = { A: '#4ade80', B: '#86efac', C: '#f59e0b', D: '#fb923c', F: '#f87171' };

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function ScoreCard({ label, score, grade, detail }) {
  const color = GRADE_COLOR[grade] || '#94a3b8';
  return (
    <div className="rounded-xl border p-3 space-y-1.5" style={{ borderColor: `${color}25`, background: `${color}08` }}>
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-bold uppercase tracking-wide opacity-70" style={{ color }}>{label}</span>
        <span className="text-xs font-bold" style={{ color }}>{grade}</span>
      </div>
      <div className="h-1 rounded-full bg-white/5">
        <div className="h-full rounded-full" style={{ width: `${Math.max(2, score || 0)}%`, background: color }} />
      </div>
      {detail && <p className="text-[10px] text-gray-500 truncate">{detail}</p>}
    </div>
  );
}

export default function EmailSmsPage() {
  usePageTitle('Email & SMS');
  const { dark } = useTheme();

  // Core generation state
  const [activeType, setActiveType] = useState(null);
  const [tone, setTone] = useState('Professional');
  const [length, setLength] = useState('Medium');
  const [includeCta, setIncludeCta] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [streamText, setStreamText] = useState('');
  const [copied, setCopied] = useState(false);
  const [subjectLine, setSubjectLine] = useState('');
  const [subjectLines, setSubjectLines] = useState(null);
  const [subjectLoading, setSubjectLoading] = useState(false);

  // Tabs & campaigns
  const [activeTab, setActiveTab] = useState('generate');
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);

  // Sequence planner
  const [sequencePlan, setSequencePlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);

  // Email analyzer
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  // Send to platform
  const [sendFlow, setSendFlow] = useState(false);
  const [sendPlatforms, setSendPlatforms] = useState([]);
  const [sendLists, setSendLists] = useState({});
  const [sendProvider, setSendProvider] = useState(null);
  const [sendListId, setSendListId] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  const loadCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    try {
      const data = await fetchJSON('/api/email-sms/campaigns');
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load campaigns:', e);
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeType && activeTab === 'campaigns') {
      loadCampaigns();
    }
  }, [activeTab, activeType, loadCampaigns]);

  const saveCampaign = useCallback(async (content) => {
    try {
      await postJSON('/api/email-sms/campaigns', {
        name: prompt.slice(0, 80) || 'AI Generated Campaign',
        type: activeType === 'sms' ? 'sms' : 'email',
        subject: subjectLine || '',
        body: content,
        status: 'draft',
      });
    } catch (e) {
      console.error('Failed to auto-save campaign:', e);
    }
  }, [prompt, activeType, subjectLine]);

  const deleteCampaign = async (id) => {
    try {
      await deleteJSON(`/api/email-sms/campaigns/${id}`);
      setCampaigns(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      console.error('Failed to delete campaign:', e);
    }
  };

  const generate = async (overridePrompt) => {
    const finalPrompt = overridePrompt || prompt;
    if (!finalPrompt.trim() || !activeType) return;
    setGenerating(true);
    setResult('');
    setStreamText('');
    setAnalysis(null);
    setSendFlow(false);
    setSendSuccess(false);
    const fullPrompt = `[Type: ${activeType}] [Tone: ${tone}] [Length: ${length}] [Include CTA: ${includeCta ? 'Yes' : 'No'}]${subjectLine ? `\n[Subject Line: ${subjectLine}]` : ''}\n\n${finalPrompt}`;
    try {
      const res = await fetch(`${API_BASE}/api/email-sms/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeType, prompt: fullPrompt, tone, length, includeCta }),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '', fullText = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'chunk') { fullText += data.text; setStreamText(fullText); }
            else if (data.type === 'result') {
              const finalContent = data.data?.content || fullText;
              setResult(finalContent);
              if (!data.data?.id) await saveCampaign(finalContent);
            }
          } catch {}
        }
      }
      if (!result && fullText) setResult(fullText);
    } catch (e) { console.error('Generation error:', e); }
    finally { setGenerating(false); }
  };

  const generateSequencePlan = async () => {
    if (!prompt.trim()) return;
    setPlanLoading(true);
    setSequencePlan(null);
    try {
      const data = await postJSON('/api/email-sms/sequence-plan', {
        brief: prompt,
        sequence_type: activeType,
        count: 5,
      });
      setSequencePlan(data);
    } catch (e) {
      console.error('Sequence plan error:', e);
    }
    setPlanLoading(false);
  };

  const analyzeEmail = async () => {
    const content = result || streamText;
    if (!content) return;
    setAnalyzing(true);
    try {
      const data = await postJSON('/api/email-sms/analyze', {
        content,
        subject: subjectLine,
        type: activeType,
      });
      setAnalysis(data);
    } catch (e) {
      console.error('Analysis error:', e);
    }
    setAnalyzing(false);
  };

  const initSendFlow = async () => {
    setSendFlow(true);
    setSendProvider(null);
    setSendListId(null);
    setSendSuccess(false);
    setSendPlatforms([]);
    setSendLists({});
    try {
      const data = await fetchJSON('/api/email-sms/platforms/connected');
      if (data.success) {
        setSendPlatforms(data.data);
        for (const p of data.data) {
          try {
            const listsData = await fetchJSON(`/api/email-sms/platforms/lists?provider=${p.provider_id}`);
            if (listsData.success && listsData.data[p.provider_id]) {
              setSendLists(prev => ({ ...prev, [p.provider_id]: listsData.data[p.provider_id] }));
            }
          } catch {}
        }
      }
    } catch (e) {
      console.error('Send flow init error:', e);
    }
  };

  const sendCampaign = async () => {
    if (!sendProvider || !sendListId) return;
    setSending(true);
    try {
      const content = result || streamText;
      await postJSON('/api/email-sms/platforms/send', {
        provider: sendProvider,
        listId: sendListId,
        subject: subjectLine || prompt.slice(0, 80),
        html: content.replace(/\n/g, '<br>'),
        name: prompt.slice(0, 80) || 'AI Campaign',
      });
      setSendSuccess(true);
      setSendFlow(false);
    } catch (e) {
      console.error('Send error:', e);
    }
    setSending(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result || streamText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const exportAsHtml = () => {
    const content = result || streamText;
    const blob = new Blob([`<html><body>${content.replace(/\n/g, '<br>')}</body></html>`], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'email-export.html'; a.click();
    URL.revokeObjectURL(url);
  };

  const selectTemplate = (tmpl) => setPrompt(tmpl.prompt);

  /* ---- LANDING SCREEN ---- */
  if (!activeType) {
    return (
      <div className="p-4 sm:p-6 lg:p-12">
        <ModuleWrapper moduleId="email-sms">
        <div className="mb-6 sm:mb-8 animate-fade-in">
          <p className="hud-label text-[11px] mb-2" style={{ color: MODULE_COLOR }}>EMAIL & SMS ENGINE</p>
          <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 ${dark ? 'text-white' : 'text-gray-900'}`}>What do you want to create?</h1>
          <p className={`text-base ${dark ? 'text-gray-500' : 'text-gray-500'}`}>Select a message type to start generating with AI</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 stagger">
          {EMAIL_TYPES.map(type => (
            <button key={type.id} onClick={() => setActiveType(type.id)}
              className={`${dark ? 'panel-interactive' : 'bg-white border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5'} rounded-2xl p-4 sm:p-7 text-center group transition-all`}>
              <div className="w-12 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                style={{ background: `${MODULE_COLOR}15`, border: `1px solid ${MODULE_COLOR}20` }}>
                <svg className="w-6 h-6" style={{ color: MODULE_COLOR }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={type.icon} />
                </svg>
              </div>
              <p className={`text-sm font-bold transition-colors ${dark ? 'text-gray-300 group-hover:text-white' : 'text-gray-700 group-hover:text-gray-900'}`}>{type.name}</p>
              <p className={`text-xs mt-1 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>{type.desc}</p>
            </button>
          ))}
        </div>

        <div className="mt-10">
          <div className="flex items-center gap-3 mb-4">
            <p className="hud-label text-[11px]">POPULAR TEMPLATES</p>
            <div className="flex-1 hud-line" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 stagger">
            {Object.entries(TEMPLATES).flatMap(([type, tmpls]) =>
              tmpls.slice(0, 1).map(t => {
                const ct = EMAIL_TYPES.find(c => c.id === type);
                return (
                  <button key={`${type}-${t.name}`} onClick={() => { setActiveType(type); setPrompt(t.prompt); }}
                    className={`${dark ? 'panel-interactive' : 'bg-white border border-gray-200 shadow-sm hover:shadow-md'} rounded-lg p-4 sm:p-6 text-left group transition-all`}>
                    <p className="hud-label text-[11px] mb-1.5" style={{ color: MODULE_COLOR }}>{ct?.name}</p>
                    <p className={`text-sm font-semibold transition-colors ${dark ? 'text-gray-300 group-hover:text-white' : 'text-gray-700 group-hover:text-gray-900'}`}>{t.name}</p>
                    <p className={`text-xs mt-1 line-clamp-2 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>{t.prompt}</p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <p className="hud-label text-[11px]">CAPABILITIES</p>
            <div className="flex-1 hud-line" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 stagger">
            {['Subject Lines', 'Body Copy', 'CTAs', 'Drip Flows', 'SMS Copy', 'Quality Analysis'].map((cap, i) => (
              <div key={i} className={`${dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm'} rounded-lg p-4 sm:p-5 text-center`}>
                <p className={`text-xs font-semibold ${dark ? 'text-gray-400' : 'text-gray-600'}`}>{cap}</p>
              </div>
            ))}
          </div>
        </div>
        </ModuleWrapper>
      </div>
    );
  }

  /* ---- GENERATOR SCREEN ---- */
  const currentType = EMAIL_TYPES.find(t => t.id === activeType);
  const templates = TEMPLATES[activeType] || [];
  const wordCount = (result || streamText).split(/\s+/).filter(Boolean).length;
  const isSequenceType = ['drip', 'welcome'].includes(activeType);

  return (
    <div className="p-4 sm:p-6 lg:p-12 animate-fade-in">
      <ModuleWrapper moduleId="email-sms">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <button
          onClick={() => {
            setActiveType(null); setResult(''); setStreamText(''); setPrompt('');
            setSubjectLine(''); setActiveTab('generate'); setSequencePlan(null);
            setAnalysis(null); setSendFlow(false); setSendSuccess(false);
          }}
          className={`p-2 rounded-md border transition-all ${dark ? 'border-indigo-500/10 text-gray-500 hover:text-white hover:border-indigo-500/25' : 'border-gray-300 text-gray-400 hover:text-gray-700 hover:border-gray-400'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <p className="hud-label text-[11px]" style={{ color: MODULE_COLOR }}>{currentType?.name?.toUpperCase()} GENERATOR</p>
          <h2 className={`text-lg font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Create {currentType?.name}</h2>
        </div>
        <div className="ml-auto flex gap-1">
          {['generate', 'campaigns'].map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); if (tab === 'campaigns') loadCampaigns(); }}
              className={`chip text-[10px] capitalize ${activeTab === tab ? 'active' : ''}`}
              style={activeTab === tab ? { background: `${MODULE_COLOR}25`, borderColor: `${MODULE_COLOR}50`, color: MODULE_COLOR } : {}}>
              {tab === 'campaigns' ? 'Campaigns' : 'Generate'}
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="animate-fade-in">
          {campaignsLoading ? (
            <div className={`${dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm'} rounded-2xl p-10 text-center`}>
              <div className="flex items-center justify-center gap-3">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: MODULE_COLOR }} />
                <span className="hud-label text-[11px]" style={{ color: MODULE_COLOR }}>LOADING CAMPAIGNS</span>
              </div>
            </div>
          ) : campaigns.length === 0 ? (
            <div className={`${dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm'} rounded-2xl p-10 text-center`}>
              <p className={`text-sm ${dark ? 'text-gray-500' : 'text-gray-400'}`}>No campaigns yet. Generate content to see it here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {campaigns.map(campaign => {
                const statusStyle = STATUS_COLORS[campaign.status] || STATUS_COLORS.draft;
                return (
                  <div key={campaign.id}
                    className={`${dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm'} rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3`}>
                    <span className="chip text-[10px] px-2.5 py-1 flex-shrink-0 self-start"
                      style={{ color: MODULE_COLOR, borderColor: `${MODULE_COLOR}40`, background: `${MODULE_COLOR}12` }}>
                      {campaign.type === 'sms' ? 'SMS' : 'Email'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${dark ? 'text-gray-200' : 'text-gray-800'}`}>{campaign.name || 'Untitled Campaign'}</p>
                      {campaign.subject && <p className={`text-xs truncate mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{campaign.subject}</p>}
                    </div>
                    <span className="chip text-[10px] px-2.5 py-1 flex-shrink-0 self-start sm:self-auto"
                      style={{ color: statusStyle.color, borderColor: statusStyle.border, background: statusStyle.bg }}>
                      {campaign.status || 'draft'}
                    </span>
                    <span className={`text-[10px] flex-shrink-0 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>{formatDate(campaign.created_at)}</span>
                    <button onClick={() => deleteCampaign(campaign.id)}
                      className={`flex-shrink-0 p-1.5 rounded-lg transition-all border border-transparent hover:border-red-400/15 ${dark ? 'text-gray-600 hover:text-red-400 hover:bg-red-400/8' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Generate Tab */}
      {activeTab === 'generate' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Left: Controls */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Templates */}
              <div className={`${dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm'} rounded-2xl p-4 sm:p-6`}>
                <p className="hud-label text-[11px] mb-3">TEMPLATES</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {templates.map(t => (
                    <button key={t.name} onClick={() => selectTemplate(t)}
                      className={`text-left px-4 py-3 rounded-lg border text-xs transition-all ${
                        prompt === t.prompt
                          ? `border-amber-500/30 bg-amber-500/10 ${dark ? 'text-amber-300' : 'text-amber-700'}`
                          : `${dark ? 'border-indigo-500/8 bg-white/[0.01] text-gray-400 hover:text-gray-200 hover:border-indigo-500/15' : 'border-gray-200 bg-gray-50 text-gray-600 hover:text-gray-800 hover:border-gray-300'}`
                      }`}>
                      <p className="font-semibold">{t.name}</p>
                      <p className={`text-[10px] mt-0.5 line-clamp-1 ${dark ? 'text-gray-600' : 'text-gray-400'}`}>{t.prompt}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject line (for email types) */}
              {activeType !== 'sms' && (
                <div className={`${dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm'} rounded-2xl p-4 sm:p-6`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="hud-label text-[11px]">SUBJECT LINE (OPTIONAL)</p>
                    <span className={`text-[10px] font-mono ${subjectLine.length > 60 ? 'text-red-400' : subjectLine.length > 40 ? 'text-amber-400' : dark ? 'text-gray-600' : 'text-gray-400'}`}>
                      {subjectLine.length}/60
                    </span>
                  </div>
                  <input type="text" value={subjectLine} onChange={(e) => setSubjectLine(e.target.value)}
                    placeholder="Leave blank for AI to generate, or provide your own..."
                    className="w-full input-field rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-base" />
                </div>
              )}

              {/* Brief */}
              <div className={`${dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm'} rounded-2xl p-4 sm:p-6`}>
                <p className="hud-label text-[11px] mb-3">YOUR BRIEF</p>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5}
                  placeholder="Describe your product/service, target audience, key message, and any specific requirements..."
                  className="w-full input-field rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-base resize-none" />
              </div>

              {/* Sequence Planner — drip & welcome only */}
              {isSequenceType && (
                <div className={`${dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm'} rounded-2xl p-4 sm:p-6`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="hud-label text-[11px]" style={{ color: MODULE_COLOR }}>SEQUENCE PLANNER</p>
                      <p className={`text-xs mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Map your email journey before writing</p>
                    </div>
                    <button
                      onClick={generateSequencePlan}
                      disabled={planLoading || !prompt.trim()}
                      className={`chip text-[10px] ${!prompt.trim() ? 'opacity-40 cursor-not-allowed' : ''}`}
                      style={sequencePlan ? { color: MODULE_COLOR, borderColor: `${MODULE_COLOR}40`, background: `${MODULE_COLOR}12` } : {}}>
                      {planLoading ? 'Planning...' : sequencePlan ? 'Replan' : 'Plan My Sequence'}
                    </button>
                  </div>

                  {planLoading && (
                    <div className="flex items-center gap-3 py-3">
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: MODULE_COLOR }} />
                      <span className="hud-label text-[11px]" style={{ color: MODULE_COLOR }}>MAPPING SEQUENCE...</span>
                    </div>
                  )}

                  {sequencePlan && !planLoading && (
                    <div className="animate-fade-in">
                      <div className="flex items-center gap-2 mb-3 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span className={`text-xs font-bold ${dark ? 'text-white' : 'text-gray-800'}`}>{sequencePlan.sequence_name}</span>
                        <span className={`text-[10px] ${dark ? 'text-gray-500' : 'text-gray-400'}`}>— {sequencePlan.goal}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                        {sequencePlan.emails?.map((email) => (
                          <div key={email.step} className={`rounded-xl border p-3 space-y-2 ${dark ? 'border-indigo-500/10 bg-white/[0.01]' : 'border-gray-200 bg-gray-50'}`}>
                            <div className="flex items-center gap-1.5">
                              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                                style={{ background: `${MODULE_COLOR}25`, color: MODULE_COLOR }}>{email.step}</span>
                              <span className={`text-[10px] ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{email.timing}</span>
                            </div>
                            <p className={`text-xs font-semibold ${dark ? 'text-gray-300' : 'text-gray-700'}`}>{email.title}</p>
                            {email.subject && (
                              <p className={`text-[10px] italic ${dark ? 'text-gray-500' : 'text-gray-400'}`}>"{email.subject}"</p>
                            )}
                            <ul className="space-y-0.5">
                              {email.key_points?.slice(0, 2).map((pt, i) => (
                                <li key={i} className={`text-[10px] flex items-start gap-1 ${dark ? 'text-gray-500' : 'text-gray-500'}`}>
                                  <span className="mt-0.5 flex-shrink-0" style={{ color: MODULE_COLOR }}>›</span>{pt}
                                </li>
                              ))}
                            </ul>
                            <button
                              onClick={() => {
                                const p = `[Sequence: ${sequencePlan.sequence_name}, Step ${email.step}: ${email.title}]\n[Timing: ${email.timing}]\n[Goal: ${email.goal}]\n[Hook: ${email.hook}]\n[Key Points: ${email.key_points?.join('; ')}]\n\n${prompt}`;
                                if (email.subject) setSubjectLine(email.subject);
                                generate(p);
                              }}
                              className="w-full text-center py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                              style={{ color: MODULE_COLOR, background: `${MODULE_COLOR}12`, border: `1px solid ${MODULE_COLOR}25` }}>
                              Write this email →
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!sequencePlan && !planLoading && (
                    <p className={`text-[11px] ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
                      Fill in your brief then click "Plan My Sequence" for an AI-mapped email roadmap before writing.
                    </p>
                  )}
                </div>
              )}

              {/* Generate button */}
              <button onClick={() => generate()} disabled={generating || !prompt.trim()}
                className="btn-accent w-full py-3 rounded-lg font-bold text-sm tracking-wide"
                style={{ background: generating ? (dark ? '#1e1e2e' : '#e5e7eb') : MODULE_COLOR, boxShadow: generating ? 'none' : `0 4px 20px -4px ${MODULE_COLOR}66` }}>
                {generating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
                    GENERATING...
                  </span>
                ) : `GENERATE ${currentType?.name?.toUpperCase()}`}
              </button>
            </div>

            {/* Right: Settings sidebar */}
            <div className="space-y-4 sm:space-y-6">
              {/* Tone */}
              <div className={`${dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm'} rounded-2xl p-4 sm:p-6`}>
                <p className="hud-label text-[11px] mb-3">TONE</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {TONES.map(t => (
                    <button key={t} onClick={() => setTone(t)}
                      className={`chip text-[10px] justify-center ${tone === t ? 'active' : ''}`}
                      style={tone === t ? { background: `${MODULE_COLOR}25`, borderColor: `${MODULE_COLOR}50`, color: MODULE_COLOR } : {}}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Length */}
              <div className={`${dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm'} rounded-2xl p-4 sm:p-6`}>
                <p className="hud-label text-[11px] mb-3">LENGTH</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {LENGTHS.map(l => (
                    <button key={l} onClick={() => setLength(l)}
                      className={`chip text-[10px] justify-center ${length === l ? 'active' : ''}`}
                      style={length === l ? { background: `${MODULE_COLOR}25`, borderColor: `${MODULE_COLOR}50`, color: MODULE_COLOR } : {}}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* CTA toggle */}
              <div className={`${dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm'} rounded-2xl p-4 sm:p-6`}>
                <p className="hud-label text-[11px] mb-3">OPTIONS</p>
                <button onClick={() => setIncludeCta(!includeCta)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-xs transition-all ${
                    includeCta
                      ? `border-amber-500/30 bg-amber-500/10 ${dark ? 'text-amber-300' : 'text-amber-700'}`
                      : `${dark ? 'border-indigo-500/8 bg-white/[0.01] text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'}`
                  }`}>
                  <span className="font-semibold">Include CTA</span>
                  <div className={`w-8 h-4 rounded-full transition-all flex items-center ${includeCta ? 'justify-end' : 'justify-start'}`}
                    style={{ background: includeCta ? `${MODULE_COLOR}40` : dark ? '#333' : '#d1d5db' }}>
                    <div className="w-3 h-3 rounded-full mx-0.5 transition-all" style={{ background: includeCta ? MODULE_COLOR : dark ? '#666' : '#9ca3af' }} />
                  </div>
                </button>
              </div>

              {/* Output stats */}
              {(streamText || result) && (
                <div className={`${dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm'} rounded-2xl p-4 sm:p-6 animate-fade-up`}>
                  <p className="hud-label text-[11px] mb-3">OUTPUT STATS</p>
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className={dark ? 'text-gray-500' : 'text-gray-400'}>Words</span>
                      <span className={`font-mono font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{wordCount}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className={dark ? 'text-gray-500' : 'text-gray-400'}>Characters</span>
                      <span className={`font-mono font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>{(result || streamText).length}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className={dark ? 'text-gray-500' : 'text-gray-400'}>Tone</span>
                      <span className="font-semibold" style={{ color: MODULE_COLOR }}>{tone}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className={dark ? 'text-gray-500' : 'text-gray-400'}>Length</span>
                      <span className="font-semibold" style={{ color: MODULE_COLOR }}>{length}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Streaming output */}
          {(generating || streamText) && !result && (
            <div className={`${dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm'} rounded-2xl p-4 sm:p-7 mt-6 animate-fade-up`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: MODULE_COLOR }} />
                <span className="hud-label text-[11px]" style={{ color: MODULE_COLOR }}>GENERATING</span>
              </div>
              <div className={`${dark ? 'bg-black/50' : 'bg-gray-50'} rounded-lg p-4 sm:p-7 max-h-[50vh] overflow-y-auto text-base whitespace-pre-wrap leading-relaxed ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                {streamText}<span className="inline-block w-[2px] h-4 ml-0.5 animate-pulse" style={{ background: MODULE_COLOR }} />
              </div>
            </div>
          )}

          {/* Final result */}
          {result && (
            <div className={`${dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm'} rounded-2xl p-4 sm:p-7 mt-6 animate-fade-up`}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="hud-label text-[11px] text-emerald-400">COMPLETE</span>
                  {sendSuccess && (
                    <>
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                      <span className="hud-label text-[11px] text-blue-400">SENT</span>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={copyToClipboard} className="chip text-[10px]" style={{ color: copied ? '#4ade80' : undefined }}>
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={exportAsHtml} className="chip text-[10px]">Export HTML</button>
                  <button onClick={() => generate()} className="chip text-[10px]">Regenerate</button>
                  {activeType !== 'sms' && (
                    <>
                      <button
                        onClick={analyzeEmail}
                        disabled={analyzing}
                        className="chip text-[10px]"
                        style={analysis
                          ? { color: '#4ade80', borderColor: 'rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.08)' }
                          : { color: MODULE_COLOR, borderColor: `${MODULE_COLOR}40`, background: `${MODULE_COLOR}12` }}>
                        {analyzing ? 'Analyzing...' : analysis ? '✓ Analyzed' : 'Analyze Quality'}
                      </button>
                      <button
                        onClick={sendFlow ? () => setSendFlow(false) : initSendFlow}
                        className="chip text-[10px]"
                        style={sendSuccess
                          ? { color: '#4ade80', borderColor: 'rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.08)' }
                          : sendFlow
                            ? { color: '#60a5fa', borderColor: 'rgba(96,165,250,0.3)', background: 'rgba(96,165,250,0.08)' }
                            : {}}>
                        {sendSuccess ? '✓ Sent' : sendFlow ? 'Cancel Send' : 'Send to Platform'}
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className={`${dark ? 'bg-black/50' : 'bg-gray-50'} rounded-lg p-4 sm:p-7 max-h-[60vh] overflow-y-auto text-base whitespace-pre-wrap leading-relaxed ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
                {result}
              </div>
            </div>
          )}

          {/* Email Quality Analyzer */}
          {result && (analysis || analyzing) && activeType !== 'sms' && (
            <div className={`${dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm'} rounded-2xl p-4 sm:p-6 mt-4 animate-fade-up`}>
              <p className="hud-label text-[11px] mb-4">EMAIL QUALITY ANALYSIS</p>
              {analyzing ? (
                <div className="flex items-center gap-3 py-2">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: MODULE_COLOR }} />
                  <span className="hud-label text-[11px]" style={{ color: MODULE_COLOR }}>ANALYZING YOUR EMAIL...</span>
                </div>
              ) : analysis && (
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    {/* Overall score */}
                    <div className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center flex-shrink-0"
                      style={{
                        background: `${analysis.overall_score >= 80 ? '#4ade80' : analysis.overall_score >= 60 ? '#f59e0b' : '#f87171'}12`,
                        border: `1px solid ${analysis.overall_score >= 80 ? '#4ade80' : analysis.overall_score >= 60 ? '#f59e0b' : '#f87171'}25`,
                      }}>
                      <span className="text-2xl font-bold leading-none"
                        style={{ color: analysis.overall_score >= 80 ? '#4ade80' : analysis.overall_score >= 60 ? '#f59e0b' : '#f87171' }}>
                        {analysis.overall_score}
                      </span>
                      <span className="text-[9px] text-gray-500 mt-0.5">SCORE</span>
                    </div>
                    {/* Score cards */}
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <ScoreCard
                        label="Spam Risk"
                        score={100 - (analysis.spam_score?.score || 0)}
                        grade={analysis.spam_score?.grade || 'C'}
                        detail={analysis.spam_score?.issues?.[0]}
                      />
                      <ScoreCard
                        label="Readability"
                        score={analysis.readability?.score || 0}
                        grade={analysis.readability?.grade || 'C'}
                        detail={analysis.readability?.level}
                      />
                      <ScoreCard
                        label="Subject Line"
                        score={analysis.subject_quality?.score || 0}
                        grade={analysis.subject_quality?.grade || 'C'}
                        detail={analysis.subject_quality?.strengths?.[0] || analysis.subject_quality?.issues?.[0]}
                      />
                      <ScoreCard
                        label="CTA Strength"
                        score={analysis.cta_strength?.score || 0}
                        grade={analysis.cta_strength?.grade || 'C'}
                        detail={analysis.cta_strength?.found ? 'CTA found' : 'No CTA detected'}
                      />
                    </div>
                  </div>
                  {analysis.improvements?.length > 0 && (
                    <div>
                      <p className="hud-label text-[11px] mb-2">TOP IMPROVEMENTS</p>
                      <div className="space-y-2">
                        {analysis.improvements.map((imp, i) => (
                          <div key={i} className={`flex items-start gap-2 text-xs p-2.5 rounded-lg ${dark ? 'bg-amber-500/5 text-gray-400' : 'bg-amber-50 text-gray-600'}`}>
                            <span className="text-amber-400 flex-shrink-0 mt-0.5">→</span>{imp}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Send to Platform */}
          {result && sendFlow && activeType !== 'sms' && (
            <div className={`${dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm'} rounded-2xl p-4 sm:p-6 mt-4 animate-fade-up`}>
              <p className="hud-label text-[11px] mb-4">SEND TO PLATFORM</p>
              {sendSuccess ? (
                <div className="flex items-center gap-2 py-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="hud-label text-[11px] text-emerald-400">CAMPAIGN SENT SUCCESSFULLY</span>
                </div>
              ) : sendPlatforms.length === 0 && Object.keys(sendLists).length === 0 ? (
                <div className="flex items-center gap-3 py-2">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: MODULE_COLOR }} />
                  <span className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Checking connected platforms...</span>
                </div>
              ) : sendPlatforms.length === 0 ? (
                <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
                  No email platforms connected. Connect Mailchimp or Klaviyo in Settings → Integrations.
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Platform selection */}
                  <div>
                    <p className="hud-label text-[11px] mb-2">SELECT PLATFORM</p>
                    <div className="flex gap-2">
                      {sendPlatforms.map(p => (
                        <button key={p.provider_id}
                          onClick={() => { setSendProvider(p.provider_id); setSendListId(null); }}
                          className="chip text-[10px] capitalize"
                          style={sendProvider === p.provider_id
                            ? { color: MODULE_COLOR, borderColor: `${MODULE_COLOR}50`, background: `${MODULE_COLOR}20` }
                            : {}}>
                          {p.provider_id}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* List selection */}
                  {sendProvider && (
                    <div>
                      <p className="hud-label text-[11px] mb-2">SELECT LIST</p>
                      {!sendLists[sendProvider] ? (
                        <div className="flex items-center gap-2 py-2">
                          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: MODULE_COLOR }} />
                          <span className="text-xs text-gray-500">Loading lists...</span>
                        </div>
                      ) : !Array.isArray(sendLists[sendProvider]) || sendLists[sendProvider].length === 0 ? (
                        <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>No lists found for {sendProvider}.</p>
                      ) : (
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {sendLists[sendProvider].map(list => {
                            const listId = list.id || list.list_id;
                            const memberCount = list.member_count || list.stats?.member_count;
                            return (
                              <button key={listId} onClick={() => setSendListId(listId)}
                                className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-all ${
                                  sendListId === listId
                                    ? `border-amber-500/30 bg-amber-500/10 ${dark ? 'text-amber-300' : 'text-amber-700'}`
                                    : `${dark ? 'border-indigo-500/8 text-gray-400 hover:text-gray-200 hover:border-indigo-500/15' : 'border-gray-200 text-gray-600 hover:text-gray-800 hover:border-gray-300'}`
                                }`}>
                                <span className="font-medium">{list.name}</span>
                                {memberCount && (
                                  <span className={`ml-2 text-[10px] ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
                                    {memberCount.toLocaleString()} subscribers
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Send button */}
                  {sendProvider && sendListId && (
                    <button onClick={sendCampaign} disabled={sending}
                      className="w-full py-2.5 rounded-lg font-bold text-sm transition-all"
                      style={{
                        color: 'white',
                        background: sending ? (dark ? '#1e1e2e' : '#e5e7eb') : '#4ade80',
                        boxShadow: sending ? 'none' : '0 4px 20px -4px rgba(74,222,128,0.5)',
                      }}>
                      {sending ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-3 h-3 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
                          SENDING...
                        </span>
                      ) : 'SEND CAMPAIGN →'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Subject Line Generator */}
          {result && activeType !== 'sms' && (
            <div className={`${dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm'} rounded-2xl p-4 sm:p-6 mt-4 animate-fade-up`}>
              <div className="flex items-center justify-between mb-3">
                <p className="hud-label text-[11px]">SUBJECT LINE GENERATOR</p>
                <button
                  className="chip text-[10px]"
                  disabled={subjectLoading}
                  style={{ color: MODULE_COLOR, borderColor: `${MODULE_COLOR}40`, background: `${MODULE_COLOR}12` }}
                  onClick={async () => {
                    setSubjectLoading(true);
                    try {
                      const res = await postJSON('/api/email-sms/generate-subject-lines', {
                        topic: activeType,
                        content_snippet: result.substring(0, 300),
                      });
                      setSubjectLines(res.subject_lines);
                    } catch {}
                    setSubjectLoading(false);
                  }}>
                  {subjectLoading ? 'Generating...' : subjectLines ? 'Regenerate' : 'Generate 5 Lines'}
                </button>
              </div>

              {subjectLoading && (
                <div className="flex items-center gap-3 py-2">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: MODULE_COLOR }} />
                  <span className="hud-label text-[11px]" style={{ color: MODULE_COLOR }}>GENERATING OPTIONS...</span>
                </div>
              )}

              {subjectLines && !subjectLoading && (
                <div className="space-y-2">
                  {subjectLines.map((sl, i) => (
                    <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${dark ? 'border-indigo-500/10 bg-white/[0.01] hover:border-indigo-500/20' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}>
                      <span className="text-xl flex-shrink-0">{sl.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${dark ? 'text-gray-200' : 'text-gray-800'}`}>{sl.text}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="chip text-[9px] px-1.5 py-0.5">{sl.trigger}</span>
                          <span className={`text-[10px] ${dark ? 'text-gray-600' : 'text-gray-400'}`}>~{sl.predicted_open_rate} open rate</span>
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => setSubjectLine(sl.text)}
                          className="chip text-[10px] px-2"
                          style={{ color: MODULE_COLOR, borderColor: `${MODULE_COLOR}40`, background: `${MODULE_COLOR}12` }}>
                          Use
                        </button>
                        <button onClick={() => navigator.clipboard.writeText(sl.text)} className="chip text-[10px] px-2">
                          Copy
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!subjectLines && !subjectLoading && (
                <p className={`text-[11px] ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
                  Generate high-converting subject line variations with predicted open rates.
                </p>
              )}
            </div>
          )}
        </>
      )}
      </ModuleWrapper>
    </div>
  );
}
