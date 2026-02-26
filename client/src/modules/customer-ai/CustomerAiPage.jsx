import { useState, useRef, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { connectSSE } from '../../lib/api';
import ModuleWrapper from '../../components/shared/ModuleWrapper';

/* ─── constants ─────────────────────────────────────────────────────── */

const MODULE_COLOR = '#0ea5e9';

const BOT_PERSONAS = [
  { id: 'support', name: 'Customer Support', desc: 'Helpful, empathetic support agent', color: '#0ea5e9' },
  { id: 'sales', name: 'Sales Assistant', desc: 'Persuasive, knowledgeable sales rep', color: '#22c55e' },
  { id: 'onboarding', name: 'Onboarding Guide', desc: 'Friendly product walkthrough assistant', color: '#a855f7' },
  { id: 'faq', name: 'FAQ Bot', desc: 'Quick answers to common questions', color: '#f59e0b' },
];

const MOCK_TICKETS = [
  { id: 'TK-2847', subject: 'Unable to process payment', customer: 'John Miller', priority: 'critical', status: 'open', created: '15 min ago', assignee: 'Sarah K.' },
  { id: 'TK-2846', subject: 'Feature request: Export to CSV', customer: 'Lisa Park', priority: 'low', status: 'open', created: '1 hour ago', assignee: 'Unassigned' },
  { id: 'TK-2845', subject: 'Dashboard loading slowly', customer: 'Mike Chen', priority: 'high', status: 'in-progress', created: '2 hours ago', assignee: 'David R.' },
  { id: 'TK-2844', subject: 'Account access issue after password reset', customer: 'Emma Wilson', priority: 'high', status: 'in-progress', created: '3 hours ago', assignee: 'Sarah K.' },
  { id: 'TK-2843', subject: 'Billing discrepancy on invoice #4521', customer: 'Alex Thompson', priority: 'medium', status: 'waiting', created: '5 hours ago', assignee: 'Maria L.' },
  { id: 'TK-2842', subject: 'Integration webhook not firing', customer: 'Jordan Lee', priority: 'medium', status: 'open', created: '6 hours ago', assignee: 'David R.' },
  { id: 'TK-2841', subject: 'How to set up automated reports?', customer: 'Rachel Kim', priority: 'low', status: 'resolved', created: '1 day ago', assignee: 'Sarah K.' },
  { id: 'TK-2840', subject: 'API rate limit exceeded', customer: 'Tom Brown', priority: 'high', status: 'resolved', created: '1 day ago', assignee: 'David R.' },
];

/* Combined templates from Chatbot + Support Center */
const UNIFIED_TEMPLATES = [
  /* Chatbot templates */
  { id: 'cb-1', name: 'Welcome Message', category: 'Chatbot', prompt: 'Write a friendly chatbot welcome message that greets visitors and offers help', source: 'chatbot' },
  { id: 'cb-2', name: 'Product Inquiry', category: 'Chatbot', prompt: 'Generate a chatbot response template for product feature inquiries', source: 'chatbot' },
  { id: 'cb-3', name: 'Pricing Question', category: 'Chatbot', prompt: 'Generate a chatbot response for pricing and plan comparison questions', source: 'chatbot' },
  { id: 'cb-4', name: 'Objection Handler', category: 'Chatbot', prompt: 'Generate chatbot responses for common sales objections (too expensive, not ready, using competitor)', source: 'chatbot' },
  { id: 'cb-5', name: 'Escalation Flow', category: 'Chatbot', prompt: 'Write a chatbot escalation message that smoothly transfers to a human agent', source: 'chatbot' },
  { id: 'cb-6', name: 'After-Hours', category: 'Chatbot', prompt: 'Write an after-hours auto-response that captures lead info and sets expectations', source: 'chatbot' },
  /* Support Center templates */
  { id: 'sc-1', name: 'Auto-Response', category: 'Support', prompt: 'Create intelligent auto-response templates for common support tickets including acknowledgment, troubleshooting steps, and escalation triggers', source: 'support' },
  { id: 'sc-2', name: 'FAQ Entry', category: 'Support', prompt: 'Write a comprehensive FAQ entry with a clear question, detailed answer, related links, and troubleshooting steps for common customer issues', source: 'support' },
  { id: 'sc-3', name: 'Escalation Template', category: 'Support', prompt: 'Draft professional escalation email templates for different severity levels including context summary, impact assessment, and resolution timeline', source: 'support' },
  { id: 'sc-4', name: 'Customer Survey', category: 'Support', prompt: 'Design a post-support customer satisfaction survey with NPS question, experience rating, and open-ended feedback prompts', source: 'support' },
];

/* AI Tools – combined generation templates from both modules */
const AI_TOOLS = [
  { name: 'Generate Auto-Response', prompt: 'Create intelligent auto-response templates for common support tickets including acknowledgment, troubleshooting steps, and escalation triggers', source: 'support' },
  { name: 'Create FAQ Entry', prompt: 'Write a comprehensive FAQ entry with a clear question, detailed answer, related links, and troubleshooting steps for common customer issues', source: 'support' },
  { name: 'Write Escalation Template', prompt: 'Draft professional escalation email templates for different severity levels including context summary, impact assessment, and resolution timeline', source: 'support' },
  { name: 'Draft Customer Survey', prompt: 'Design a post-support customer satisfaction survey with NPS question, experience rating, and open-ended feedback prompts', source: 'support' },
  { name: 'Welcome Message Builder', prompt: 'Write a friendly chatbot welcome message that greets visitors and offers help with product selection, support, and account management', source: 'chatbot' },
  { name: 'Objection Handler Script', prompt: 'Generate chatbot responses for common sales objections (too expensive, not ready, using competitor) with empathetic rebuttals', source: 'chatbot' },
  { name: 'Onboarding Flow Script', prompt: 'Write a multi-step chatbot onboarding conversation that walks new users through setup, key features, and getting started tips', source: 'chatbot' },
  { name: 'Knowledge Base Generator', prompt: 'Create a structured knowledge base article with sections for overview, step-by-step instructions, troubleshooting, and related resources', source: 'support' },
];

/* ─── helpers ───────────────────────────────────────────────────────── */

const priorityColor = (p) =>
  p === 'critical' ? '#ef4444' : p === 'high' ? '#f97316' : p === 'medium' ? '#f59e0b' : '#6b7280';

const statusColor = (s) =>
  s === 'open' ? '#3b82f6' : s === 'in-progress' ? '#f59e0b' : s === 'waiting' ? '#8b5cf6' : '#22c55e';

/* ─── component ─────────────────────────────────────────────────────── */

export default function CustomerAiPage() {
  usePageTitle('Customer AI');

  /* --- shared state --- */
  const [tab, setTab] = useState('bots');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [selectedTool, setSelectedTool] = useState(null);

  /* --- bots state --- */
  const [persona, setPersona] = useState(BOT_PERSONAS[0]);
  const [botName, setBotName] = useState('Overload Bot');
  const [messages, setMessages] = useState([{ role: 'bot', text: 'Hello! How can I help you today?' }]);
  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);
  const cancelRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* clean up any in-flight SSE on unmount */
  useEffect(() => () => cancelRef.current?.(), []);

  /* --- bots: send message via SSE --- */
  const sendMessage = () => {
    if (!input.trim() || generating) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: userMsg }]);
    setGenerating(true);

    let botReply = '';
    setMessages((m) => [...m, { role: 'bot', text: '' }]);

    const cancel = connectSSE(
      '/api/chatbot/generate',
      {
        type: 'chat',
        prompt: `[Persona: ${persona.name} - ${persona.desc}] [Bot Name: ${botName}]\n\nUser: ${userMsg}\n\nRespond as the ${persona.name} chatbot. Be concise and helpful.`,
      },
      {
        onChunk(text) {
          botReply += text;
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = { role: 'bot', text: botReply };
            return copy;
          });
        },
        onResult(data) {
          botReply = data.content;
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = { role: 'bot', text: botReply };
            return copy;
          });
          setGenerating(false);
        },
        onError() {
          setMessages((m) => [...m.slice(0, -1), { role: 'bot', text: 'Sorry, something went wrong. Please try again.' }]);
          setGenerating(false);
        },
      },
    );
    cancelRef.current = cancel;
  };

  /* --- templates: generate from template --- */
  const generateFromTemplate = (template) => {
    if (generating) return;
    setOutput('');
    setGenerating(true);

    const endpoint = template.source === 'chatbot' ? '/api/chatbot/generate' : '/api/support-center/generate';
    const payload =
      template.source === 'chatbot'
        ? { type: 'template', prompt: `[Persona: ${persona.name}] [Bot Name: ${botName}]\n\n${template.prompt}` }
        : { type: 'content', prompt: template.prompt };

    const cancel = connectSSE(endpoint, payload, {
      onChunk(text) {
        setOutput((p) => p + text);
      },
      onResult(data) {
        setOutput(data.content);
        setGenerating(false);
      },
      onError() {
        setOutput('Generation failed. Please try again.');
        setGenerating(false);
      },
    });
    cancelRef.current = cancel;
  };

  /* --- AI tools: generate via SSE --- */
  const generateTool = (tool) => {
    if (generating) return;
    setSelectedTool(tool);
    setOutput('');
    setGenerating(true);

    const endpoint = tool.source === 'chatbot' ? '/api/chatbot/generate' : '/api/support-center/generate';
    const payload =
      tool.source === 'chatbot'
        ? { type: 'template', prompt: tool.prompt }
        : { type: 'content', prompt: tool.prompt };

    const cancel = connectSSE(endpoint, payload, {
      onChunk(text) {
        setOutput((p) => p + text);
      },
      onResult(data) {
        setOutput(data.content);
        setGenerating(false);
      },
      onError() {
        setOutput('Generation failed. Please try again.');
        setGenerating(false);
      },
    });
    cancelRef.current = cancel;
  };

  /* ─── render ──────────────────────────────────────────────────────── */

  const TABS = ['bots', 'tickets', 'templates', 'ai-tools'];

  return (
    <div className="p-4 sm:p-6 lg:p-12">
      <ModuleWrapper moduleId="customer-ai">
      {/* ── Header ── */}
      <div className="mb-6 sm:mb-8 animate-fade-in flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="hud-label text-[11px] mb-2" style={{ color: MODULE_COLOR }}>
            CUSTOMER AI
          </p>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">Customer AI</h1>
          <p className="text-base text-gray-500 mt-1">Chatbots, tickets, templates &amp; AI-powered support</p>
        </div>
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`chip text-[10px] ${tab === t ? 'active' : ''}`}
              style={
                tab === t
                  ? { background: 'rgba(14,165,233,0.15)', borderColor: 'rgba(14,165,233,0.3)', color: '#38bdf8' }
                  : {}
              }
            >
              {t === 'ai-tools' ? 'AI Tools' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-6 sm:mb-8 stagger">
        {[
          { label: 'CHAT SESSIONS', value: '1,248', sub: '+18% this week' },
          { label: 'OPEN TICKETS', value: '24', sub: '3 critical priority' },
          { label: 'AVG RESPONSE', value: '14m', sub: '-3m vs last week' },
          { label: 'SATISFACTION', value: '94%', sub: 'Based on 847 ratings' },
        ].map((s, i) => (
          <div key={i} className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-1">{s.label}</p>
            <p className="text-xl sm:text-2xl font-bold text-white font-mono">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  TAB: BOTS                                                    */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {tab === 'bots' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 animate-fade-in">
          {/* Chat area */}
          <div className="lg:col-span-3">
            <div
              className="panel rounded-2xl overflow-hidden flex flex-col"
              style={{ height: '560px', maxHeight: '70vh' }}
            >
              {/* Chat header */}
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-indigo-500/[0.06] flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: `${persona.color}20`, color: persona.color }}
                >
                  {botName[0]}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-200">{botName}</p>
                  <p className="text-xs text-gray-500">
                    {persona.name} &bull; {generating ? 'Typing...' : 'Online'}
                  </p>
                </div>
                <div
                  className={`w-2 h-2 rounded-full ml-auto ${generating ? 'bg-sky-400 animate-pulse' : 'bg-emerald-400'}`}
                />
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] px-4 py-3 rounded-xl text-sm leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-sky-500/15 text-sky-100 rounded-br-sm'
                          : 'bg-white/[0.03] text-gray-300 rounded-bl-sm border border-indigo-500/[0.06]'
                      }`}
                    >
                      {m.text}
                      {generating && i === messages.length - 1 && m.role === 'bot' && (
                        <span className="inline-block w-1 h-3 bg-sky-400 ml-0.5 animate-pulse" />
                      )}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 sm:p-4 border-t border-indigo-500/[0.06] flex gap-2 sm:gap-3">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 min-w-0 input-field rounded-xl px-3 py-2.5 sm:px-5 sm:py-4 text-sm sm:text-base"
                />
                <button
                  onClick={sendMessage}
                  disabled={generating || !input.trim()}
                  className="btn-accent px-4 sm:px-5 rounded-xl text-sm sm:text-base flex-shrink-0"
                  style={{ background: MODULE_COLOR }}
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Bot name */}
            <div className="panel rounded-2xl p-4 sm:p-6">
              <p className="hud-label text-[11px] mb-3">BOT NAME</p>
              <input
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                className="w-full input-field rounded-xl px-4 py-3 text-sm"
              />
            </div>

            {/* Persona picker */}
            <div className="panel rounded-2xl p-4 sm:p-6">
              <p className="hud-label text-[11px] mb-3">PERSONA</p>
              <div className="space-y-1.5">
                {BOT_PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPersona(p)}
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                      persona.id === p.id
                        ? 'border-sky-500/30 bg-sky-500/8'
                        : 'border-indigo-500/[0.06] hover:border-indigo-500/10'
                    }`}
                  >
                    <p className="font-bold" style={{ color: persona.id === p.id ? p.color : '#d1d5db' }}>
                      {p.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Clear chat */}
            <button
              onClick={() => setMessages([{ role: 'bot', text: 'Hello! How can I help you today?' }])}
              className="chip text-[10px] w-full justify-center"
            >
              Clear Chat
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  TAB: TICKETS                                                 */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {tab === 'tickets' && (
        <div className="animate-fade-in">
          <p className="text-xs text-gray-600 mb-4 italic">
            Showing sample ticket data. Connect your helpdesk to see live tickets.
          </p>

          <div className="panel rounded-2xl overflow-hidden">
            <div className="divide-y divide-indigo-500/[0.04]">
              {MOCK_TICKETS.map((t) => (
                <div key={t.id} className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-white/[0.01] transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="text-xs font-mono text-gray-500">{t.id}</span>
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: `${priorityColor(t.priority)}15`,
                          color: priorityColor(t.priority),
                          border: `1px solid ${priorityColor(t.priority)}25`,
                        }}
                      >
                        {t.priority}
                      </span>
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: `${statusColor(t.status)}15`,
                          color: statusColor(t.status),
                          border: `1px solid ${statusColor(t.status)}25`,
                        }}
                      >
                        {t.status}
                      </span>
                    </div>
                    <span className="text-xs text-gray-600">{t.created}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-300">{t.subject}</p>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 mt-1 text-xs text-gray-500">
                    <span>{t.customer}</span>
                    <span>&middot;</span>
                    <span>{t.assignee}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  TAB: TEMPLATES                                               */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {tab === 'templates' && (
        <div className="space-y-4 sm:space-y-6 animate-fade-in">
          {/* Category labels */}
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${MODULE_COLOR}15`, color: MODULE_COLOR, border: `1px solid ${MODULE_COLOR}30` }}>
              Chatbot
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#f9731615', color: '#f97316', border: '1px solid #f9731630' }}>
              Support
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
            {UNIFIED_TEMPLATES.map((t) => {
              const catColor = t.source === 'chatbot' ? MODULE_COLOR : '#f97316';
              return (
                <button
                  key={t.id}
                  onClick={() => generateFromTemplate(t)}
                  disabled={generating}
                  className="panel-interactive rounded-2xl p-4 sm:p-6 text-left"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: `${catColor}15`, color: catColor, border: `1px solid ${catColor}30` }}
                    >
                      {t.category}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-gray-200">{t.name}</p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.prompt}</p>
                </button>
              );
            })}
          </div>

          {/* Generation output */}
          {(generating || output) && (
            <div className="panel rounded-2xl p-4 sm:p-7">
              <div className="flex items-center gap-2 mb-3">
                <div
                  className={`w-2 h-2 rounded-full ${generating ? 'animate-pulse' : ''}`}
                  style={{ background: generating ? MODULE_COLOR : '#4ade80' }}
                />
                <span
                  className="hud-label text-[11px]"
                  style={{ color: generating ? '#38bdf8' : '#4ade80' }}
                >
                  {generating ? 'GENERATING...' : 'TEMPLATE READY'}
                </span>
              </div>
              <pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                {output}
                {generating && <span className="inline-block w-1.5 h-4 bg-sky-400 ml-0.5 animate-pulse" />}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  TAB: AI TOOLS                                                */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {tab === 'ai-tools' && (
        <div className="animate-fade-in space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {AI_TOOLS.map((tool) => {
              const isActive = selectedTool?.name === tool.name;
              const sourceColor = tool.source === 'chatbot' ? MODULE_COLOR : '#f97316';
              return (
                <button
                  key={tool.name}
                  onClick={() => generateTool(tool)}
                  disabled={generating}
                  className={`panel-interactive rounded-xl p-4 sm:p-6 text-left ${isActive ? 'border-sky-500/30' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: `${sourceColor}15`, color: sourceColor, border: `1px solid ${sourceColor}30` }}
                    >
                      {tool.source === 'chatbot' ? 'Chatbot' : 'Support'}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-gray-300">{tool.name}</p>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{tool.prompt}</p>
                </button>
              );
            })}
          </div>

          {/* Generation output */}
          {(generating || output) && (
            <div className="panel rounded-2xl p-4 sm:p-7">
              <div className="flex items-center gap-2 mb-3">
                <div
                  className={`w-2 h-2 rounded-full ${generating ? 'animate-pulse' : ''}`}
                  style={{ background: generating ? MODULE_COLOR : '#4ade80' }}
                />
                <span
                  className="hud-label text-[11px]"
                  style={{ color: generating ? '#38bdf8' : '#4ade80' }}
                >
                  {generating ? 'GENERATING...' : 'READY'}
                </span>
              </div>
              <pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                {output}
                {generating && <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse" style={{ background: MODULE_COLOR }} />}
              </pre>
            </div>
          )}
        </div>
      )}
      </ModuleWrapper>
    </div>
  );
}
