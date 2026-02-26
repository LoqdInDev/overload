import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import ModuleWrapper from '../../components/shared/ModuleWrapper';

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

export default function EmailSmsPage() {
  usePageTitle('Email & SMS');
  const { dark } = useTheme();
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

  const generate = async () => {
    if (!prompt.trim() || !activeType) return;
    setGenerating(true);
    setResult('');
    setStreamText('');
    const fullPrompt = `[Type: ${activeType}] [Tone: ${tone}] [Length: ${length}] [Include CTA: ${includeCta ? 'Yes' : 'No'}]${subjectLine ? `\n[Subject Line: ${subjectLine}]` : ''}\n\n${prompt}`;
    try {
      const res = await fetch('/api/email-sms/generate', {
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
            else if (data.type === 'result') { setResult(data.data?.content || fullText); }
          } catch {}
        }
      }
      if (!result && fullText) setResult(fullText);
    } catch (e) { console.error('Generation error:', e); }
    finally { setGenerating(false); }
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

        {/* Popular templates */}
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

        {/* Quick stats */}
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <p className="hud-label text-[11px]">CAPABILITIES</p>
            <div className="flex-1 hud-line" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 stagger">
            {['Subject Lines', 'Body Copy', 'CTAs', 'Drip Flows', 'SMS Copy', 'A/B Variants'].map((cap, i) => (
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

  return (
    <div className="p-4 sm:p-6 lg:p-12 animate-fade-in">
      <ModuleWrapper moduleId="email-sms">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <button onClick={() => { setActiveType(null); setResult(''); setStreamText(''); setPrompt(''); setSubjectLine(''); }}
          className={`p-2 rounded-md border transition-all ${dark ? 'border-indigo-500/10 text-gray-500 hover:text-white hover:border-indigo-500/25' : 'border-gray-300 text-gray-400 hover:text-gray-700 hover:border-gray-400'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <p className="hud-label text-[11px]" style={{ color: MODULE_COLOR }}>{currentType?.name?.toUpperCase()} GENERATOR</p>
          <h2 className={`text-lg font-bold ${dark ? 'text-white' : 'text-gray-900'}`}>Create {currentType?.name}</h2>
        </div>
      </div>

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
              <p className="hud-label text-[11px] mb-3">SUBJECT LINE (OPTIONAL)</p>
              <input type="text" value={subjectLine} onChange={(e) => setSubjectLine(e.target.value)}
                placeholder="Leave blank for AI to generate, or provide your own..."
                className="w-full input-field rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-base" />
            </div>
          )}

          {/* Prompt */}
          <div className={`${dark ? 'panel' : 'bg-white border border-gray-200 shadow-sm'} rounded-2xl p-4 sm:p-6`}>
            <p className="hud-label text-[11px] mb-3">YOUR BRIEF</p>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5}
              placeholder="Describe your product/service, target audience, key message, and any specific requirements..."
              className="w-full input-field rounded-xl px-4 py-3 sm:px-5 sm:py-4 text-base resize-none" />
          </div>

          {/* Generate button */}
          <button onClick={generate} disabled={generating || !prompt.trim()}
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

          {/* Stats */}
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
              <span className="hud-label text-[11px]" style={{ color: '#4ade80' }}>COMPLETE</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={copyToClipboard} className="chip text-[10px]" style={{ color: copied ? '#4ade80' : undefined }}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button onClick={exportAsHtml} className="chip text-[10px]">Export HTML</button>
              <button onClick={generate} className="chip text-[10px]">Regenerate</button>
            </div>
          </div>
          <div className={`${dark ? 'bg-black/50' : 'bg-gray-50'} rounded-lg p-4 sm:p-7 max-h-[60vh] overflow-y-auto text-base whitespace-pre-wrap leading-relaxed ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
            {result}
          </div>
        </div>
      )}
      </ModuleWrapper>
    </div>
  );
}
