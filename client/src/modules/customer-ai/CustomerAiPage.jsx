import { useState, useRef, useEffect, useCallback } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchJSON, postJSON, connectSSE } from '../../lib/api';
import ModuleWrapper from '../../components/shared/ModuleWrapper';

/* ─── constants ─────────────────────────────────────────────────────── */

const MODULE_COLOR = '#0ea5e9';

const BOT_PERSONAS = [
  {
    id: 'support',
    name: 'Customer Support',
    desc: 'Helpful, empathetic support agent',
    color: '#0ea5e9',
    systemPrompt: 'You are a customer support agent. Your top priority is resolving the customer\'s issue quickly and empathetically. Always acknowledge the customer\'s frustration before offering solutions. Ask clarifying questions when the issue is ambiguous. Provide step-by-step troubleshooting when applicable. If you cannot resolve the issue, explain that you will escalate it to a specialist and give a timeframe. Never be dismissive. Use a warm, professional tone. Keep responses concise — 2 to 4 sentences unless detailed steps are needed.',
    greeting: "Hi there! I'm here to help resolve any issues you're experiencing. What can I assist you with today?",
    quickReplies: [
      "I can't log into my account",
      'I was charged incorrectly',
      "My order hasn't arrived yet",
      'I need to cancel my subscription',
    ],
  },
  {
    id: 'sales',
    name: 'Sales Assistant',
    desc: 'Persuasive, knowledgeable sales rep',
    color: '#22c55e',
    systemPrompt: 'You are a sales assistant. Your goal is to understand the prospect\'s needs, recommend the right product or plan, and move them toward a purchase decision. Ask discovery questions to understand their budget, team size, and use case. Highlight benefits over features. Handle objections with empathy — reframe concerns as opportunities. Use social proof ("many teams like yours..."). Never be pushy; be consultative. Create urgency only when genuine. Keep responses conversational — 2 to 3 sentences max.',
    greeting: "Welcome! I'd love to help you find the right solution for your needs. Are you exploring options for yourself or your team?",
    quickReplies: [
      'What plans do you offer?',
      'How does pricing work?',
      'Can I get a demo?',
      'How do you compare to competitors?',
    ],
  },
  {
    id: 'onboarding',
    name: 'Onboarding Guide',
    desc: 'Friendly product walkthrough assistant',
    color: '#a855f7',
    systemPrompt: 'You are a product onboarding guide. Your role is to help new users get set up and productive as quickly as possible. Walk them through features one step at a time — never overwhelm with too much information at once. Celebrate small wins ("Great, you\'ve connected your first integration!"). Proactively suggest the next logical step. If the user seems confused, simplify your explanation and offer to break it down further. Use a friendly, encouraging tone. Keep responses to 2 to 3 sentences with one clear action item.',
    greeting: "Welcome aboard! I'm here to help you get set up step by step. Would you like to start with the basics, or do you have a specific feature in mind?",
    quickReplies: [
      'Walk me through the basics',
      'How do I set up integrations?',
      'Where do I invite my team?',
      'What should I do first?',
    ],
  },
  {
    id: 'faq',
    name: 'FAQ Bot',
    desc: 'Quick answers to common questions',
    color: '#f59e0b',
    systemPrompt: 'You are a FAQ bot. Your purpose is to give fast, direct answers to common questions. Lead with the answer, then add a brief explanation if needed. Use bullet points for multi-part answers. If the question is outside your scope, say so plainly and suggest where the user can find help. Do not engage in small talk or lengthy conversation. Prioritize clarity and speed. Keep every response to 1 to 3 sentences.',
    greeting: "Hi! Ask me anything — I'll give you a quick, straight answer. What do you need to know?",
    quickReplies: [
      'What are your business hours?',
      'How do I reset my password?',
      "What's your refund policy?",
      'Do you offer a free trial?',
    ],
  },
];

/* AI Tools – deduplicated, categorized */
const AI_TOOLS = [
  { name: 'Welcome Message Builder', category: 'Chatbot', prompt: 'Write a friendly chatbot welcome message that greets visitors and offers help with product selection, support, and account management', source: 'chatbot' },
  { name: 'Objection Handler Script', category: 'Chatbot', prompt: 'Generate chatbot responses for common sales objections (too expensive, not ready, using competitor) with empathetic rebuttals and reframes', source: 'chatbot' },
  { name: 'Onboarding Flow Script', category: 'Chatbot', prompt: 'Write a multi-step chatbot onboarding conversation that walks new users through setup, key features, and getting started tips', source: 'chatbot' },
  { name: 'Pricing Question Handler', category: 'Chatbot', prompt: 'Generate a chatbot response for pricing and plan comparison questions with a comparison table and recommendation', source: 'chatbot' },
  { name: 'Escalation Flow', category: 'Chatbot', prompt: 'Write a chatbot escalation message that smoothly transfers to a human agent while collecting context', source: 'chatbot' },
  { name: 'After-Hours Message', category: 'Chatbot', prompt: 'Write an after-hours auto-response that captures lead info and sets expectations for follow-up', source: 'chatbot' },
  { name: 'Auto-Response Template', category: 'Support', prompt: 'Create intelligent auto-response templates for common support tickets including acknowledgment, troubleshooting steps, and escalation triggers', source: 'support' },
  { name: 'FAQ Entry Writer', category: 'Support', prompt: 'Write a comprehensive FAQ entry with a clear question, detailed answer, related links, and troubleshooting steps', source: 'support' },
  { name: 'Escalation Email Drafter', category: 'Support', prompt: 'Draft professional escalation email templates for different severity levels including context summary, impact assessment, and resolution timeline', source: 'support' },
  { name: 'Customer Survey Designer', category: 'Support', prompt: 'Design a post-support customer satisfaction survey with NPS question, experience rating, and open-ended feedback prompts', source: 'support' },
  { name: 'Knowledge Base Generator', category: 'Support', prompt: 'Create a structured knowledge base article with sections for overview, step-by-step instructions, troubleshooting, and related resources', source: 'support' },
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
  const [toolFilter, setToolFilter] = useState('all');

  /* --- bots state --- */
  const [persona, setPersona] = useState(BOT_PERSONAS[0]);
  const [botName, setBotName] = useState('Overload Bot');
  const [messages, setMessages] = useState([{ role: 'bot', text: BOT_PERSONAS[0].greeting }]);
  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);
  const cancelRef = useRef(null);

  /* --- tickets state --- */
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: '', description: '', customer_email: '', priority: 'medium' });
  const [ticketAiOutput, setTicketAiOutput] = useState({});
  const [ticketAiGenerating, setTicketAiGenerating] = useState(null);

  /* --- stats state --- */
  const [stats, setStats] = useState({ sessions: null, openTickets: null, totalTickets: null, criticalCount: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* clean up any in-flight SSE on unmount */
  useEffect(() => () => cancelRef.current?.(), []);

  /* reset chat when persona changes */
  useEffect(() => {
    setMessages([{ role: 'bot', text: persona.greeting }]);
  }, [persona]);

  /* load stats on mount */
  useEffect(() => {
    Promise.all([
      fetchJSON('/api/chatbot/conversations').catch(() => []),
      fetchJSON('/api/support-center/').catch(() => []),
    ])
      .then(([conversations, allTickets]) => {
        const openTickets = allTickets.filter((t) => t.status === 'open' || t.status === 'in-progress');
        const criticalCount = allTickets.filter((t) => t.priority === 'critical' && t.status !== 'resolved').length;
        setStats({
          sessions: conversations.length,
          openTickets: openTickets.length,
          totalTickets: allTickets.length,
          criticalCount,
        });
      })
      .finally(() => setStatsLoading(false));
  }, []);

  /* load tickets when switching to tickets tab */
  const loadTickets = useCallback(() => {
    setTicketsLoading(true);
    fetchJSON('/api/support-center/')
      .then((data) => setTickets(Array.isArray(data) ? data : []))
      .catch(() => setTickets([]))
      .finally(() => setTicketsLoading(false));
  }, []);

  useEffect(() => {
    if (tab === 'tickets') loadTickets();
  }, [tab, loadTickets]);

  /* --- bots: send message via SSE --- */
  const sendMessage = (overrideMsg) => {
    const userMsg = (overrideMsg || input).trim();
    if (!userMsg || generating) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: userMsg }]);
    setGenerating(true);

    let botReply = '';
    setMessages((m) => [...m, { role: 'bot', text: '' }]);

    const cancel = connectSSE(
      '/api/chatbot/generate',
      {
        type: 'chat',
        prompt: `${persona.systemPrompt}\n\nYour name is "${botName}". Stay in character at all times.\n\nUser: ${userMsg}`,
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

  /* --- tickets: create ticket --- */
  const createTicket = () => {
    if (!newTicket.subject.trim()) return;
    postJSON('/api/support-center/', newTicket)
      .then(() => {
        setNewTicket({ subject: '', description: '', customer_email: '', priority: 'medium' });
        setShowNewTicket(false);
        loadTickets();
      })
      .catch((err) => console.error('Failed to create ticket:', err));
  };

  /* --- tickets: AI response per ticket --- */
  const generateTicketAiResponse = (ticket) => {
    if (ticketAiGenerating) return;
    setTicketAiGenerating(ticket.id);
    setTicketAiOutput((prev) => ({ ...prev, [ticket.id]: '' }));

    const cancel = connectSSE(
      '/api/support-center/generate',
      { ticket: { subject: ticket.subject, description: ticket.description, priority: ticket.priority, customer_email: ticket.customer_email } },
      {
        onChunk(text) {
          setTicketAiOutput((prev) => ({ ...prev, [ticket.id]: (prev[ticket.id] || '') + text }));
        },
        onResult(data) {
          setTicketAiOutput((prev) => ({ ...prev, [ticket.id]: data.content }));
          setTicketAiGenerating(null);
        },
        onError() {
          setTicketAiOutput((prev) => ({ ...prev, [ticket.id]: 'Failed to generate response.' }));
          setTicketAiGenerating(null);
        },
      },
    );
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

  const TABS = ['bots', 'tickets', 'ai-tools'];

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
          <p className="text-base text-gray-500 mt-1">Chatbots, tickets &amp; AI-powered support tools</p>
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
          { label: 'CHAT SESSIONS', value: statsLoading ? '...' : (stats.sessions?.toLocaleString() ?? '0'), sub: 'Total conversations' },
          { label: 'OPEN TICKETS', value: statsLoading ? '...' : (stats.openTickets?.toString() ?? '0'), sub: statsLoading ? '...' : `${stats.criticalCount ?? 0} critical priority` },
          { label: 'TOTAL TICKETS', value: statsLoading ? '...' : (stats.totalTickets?.toString() ?? '0'), sub: 'All time' },
          { label: 'SATISFACTION', value: '---', sub: 'Connect feedback to track' },
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

              {/* Quick replies — show only on initial greeting */}
              {messages.length === 1 && !input && (
                <div className="px-3 sm:px-4 pb-2 flex flex-wrap gap-2">
                  {persona.quickReplies.map((qr) => (
                    <button
                      key={qr}
                      onClick={() => sendMessage(qr)}
                      className="text-xs px-3 py-1.5 rounded-full border border-indigo-500/10 text-gray-400 hover:text-sky-300 hover:border-sky-500/30 transition-all"
                    >
                      {qr}
                    </button>
                  ))}
                </div>
              )}

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
                  onClick={() => sendMessage()}
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
              onClick={() => setMessages([{ role: 'bot', text: persona.greeting }])}
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
        <div className="animate-fade-in space-y-4">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {ticketsLoading ? 'Loading tickets...' : `${tickets.length} ticket${tickets.length !== 1 ? 's' : ''}`}
            </p>
            <button
              onClick={() => setShowNewTicket(!showNewTicket)}
              className="btn-accent px-4 py-2 rounded-lg text-xs"
              style={{ background: MODULE_COLOR }}
            >
              {showNewTicket ? 'Cancel' : '+ New Ticket'}
            </button>
          </div>

          {/* New Ticket form */}
          {showNewTicket && (
            <div className="panel rounded-2xl p-4 sm:p-6 space-y-3">
              <p className="hud-label text-[11px] mb-2">CREATE TICKET</p>
              <input
                value={newTicket.subject}
                onChange={(e) => setNewTicket((t) => ({ ...t, subject: e.target.value }))}
                placeholder="Subject"
                className="w-full input-field rounded-xl px-4 py-3 text-sm"
              />
              <textarea
                value={newTicket.description}
                onChange={(e) => setNewTicket((t) => ({ ...t, description: e.target.value }))}
                placeholder="Description"
                rows={3}
                className="w-full input-field rounded-xl px-4 py-3 text-sm resize-none"
              />
              <div className="flex flex-wrap gap-3">
                <input
                  value={newTicket.customer_email}
                  onChange={(e) => setNewTicket((t) => ({ ...t, customer_email: e.target.value }))}
                  placeholder="Customer email"
                  className="flex-1 min-w-0 input-field rounded-xl px-4 py-3 text-sm"
                />
                <select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket((t) => ({ ...t, priority: e.target.value }))}
                  className="input-field rounded-xl px-4 py-3 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <button
                onClick={createTicket}
                disabled={!newTicket.subject.trim()}
                className="btn-accent px-5 py-2.5 rounded-lg text-sm disabled:opacity-50"
                style={{ background: MODULE_COLOR }}
              >
                Create Ticket
              </button>
            </div>
          )}

          {/* Ticket list */}
          {tickets.length === 0 && !ticketsLoading ? (
            <div className="panel rounded-2xl p-8 text-center">
              <p className="text-gray-500 text-sm">No tickets yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="panel rounded-2xl overflow-hidden">
              <div className="divide-y divide-indigo-500/[0.04]">
                {tickets.map((t) => (
                  <div key={t.id} className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-white/[0.01] transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="text-xs font-mono text-gray-500">#{t.id}</span>
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
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">
                          {t.created_at ? new Date(t.created_at).toLocaleDateString() : ''}
                        </span>
                        <button
                          onClick={() => generateTicketAiResponse(t)}
                          disabled={ticketAiGenerating !== null}
                          className="text-[10px] px-2 py-1 rounded-md border border-sky-500/20 text-sky-400 hover:bg-sky-500/10 transition-all disabled:opacity-50"
                        >
                          {ticketAiGenerating === t.id ? 'Generating...' : 'AI Response'}
                        </button>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-gray-300">{t.subject}</p>
                    {t.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{t.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 mt-1 text-xs text-gray-500">
                      {t.customer_email && <span>{t.customer_email}</span>}
                      {t.assigned_to && <><span>&middot;</span><span>{t.assigned_to}</span></>}
                    </div>
                    {/* AI response output */}
                    {ticketAiOutput[t.id] && (
                      <div className="mt-3 p-3 rounded-lg bg-sky-500/5 border border-sky-500/10">
                        <p className="hud-label text-[9px] mb-1" style={{ color: MODULE_COLOR }}>
                          {ticketAiGenerating === t.id ? 'GENERATING...' : 'AI SUGGESTED RESPONSE'}
                        </p>
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                          {ticketAiOutput[t.id]}
                          {ticketAiGenerating === t.id && (
                            <span className="inline-block w-1 h-3 bg-sky-400 ml-0.5 animate-pulse" />
                          )}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  TAB: AI TOOLS                                                */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {tab === 'ai-tools' && (
        <div className="animate-fade-in space-y-4 sm:space-y-6">
          {/* Category filter */}
          <div className="flex flex-wrap gap-2">
            {['all', 'Chatbot', 'Support'].map((cat) => (
              <button
                key={cat}
                onClick={() => setToolFilter(cat)}
                className={`chip text-[10px] ${toolFilter === cat ? 'active' : ''}`}
                style={
                  toolFilter === cat
                    ? { background: 'rgba(14,165,233,0.15)', borderColor: 'rgba(14,165,233,0.3)', color: '#38bdf8' }
                    : {}
                }
              >
                {cat === 'all' ? 'All Tools' : cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
            {AI_TOOLS
              .filter((t) => toolFilter === 'all' || t.category === toolFilter)
              .map((tool) => {
                const isActive = selectedTool?.name === tool.name;
                const sourceColor = tool.source === 'chatbot' ? MODULE_COLOR : '#f97316';
                return (
                  <button
                    key={tool.name}
                    onClick={() => generateTool(tool)}
                    disabled={generating}
                    className={`panel-interactive rounded-2xl p-4 sm:p-6 text-left ${isActive ? 'border-sky-500/30' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: `${sourceColor}15`, color: sourceColor, border: `1px solid ${sourceColor}30` }}
                      >
                        {tool.category}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-gray-200">{tool.name}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tool.prompt}</p>
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
