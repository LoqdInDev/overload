import { useState, useRef, useEffect } from 'react';

const BOT_PERSONAS = [
  { id: 'support', name: 'Customer Support', desc: 'Helpful, empathetic support agent', color: '#0ea5e9' },
  { id: 'sales', name: 'Sales Assistant', desc: 'Persuasive, knowledgeable sales rep', color: '#22c55e' },
  { id: 'onboarding', name: 'Onboarding Guide', desc: 'Friendly product walkthrough assistant', color: '#a855f7' },
  { id: 'faq', name: 'FAQ Bot', desc: 'Quick answers to common questions', color: '#f59e0b' },
];

const TEMPLATES = [
  { name: 'Welcome Message', prompt: 'Write a friendly chatbot welcome message that greets visitors and offers help' },
  { name: 'Product Inquiry', prompt: 'Generate a chatbot response template for product feature inquiries' },
  { name: 'Pricing Question', prompt: 'Generate a chatbot response for pricing and plan comparison questions' },
  { name: 'Objection Handler', prompt: 'Generate chatbot responses for common sales objections (too expensive, not ready, using competitor)' },
  { name: 'Escalation Flow', prompt: 'Write a chatbot escalation message that smoothly transfers to a human agent' },
  { name: 'After-Hours', prompt: 'Write an after-hours auto-response that captures lead info and sets expectations' },
];

export default function ChatbotPage() {
  const [tab, setTab] = useState('playground');
  const [persona, setPersona] = useState(BOT_PERSONAS[0]);
  const [messages, setMessages] = useState([{ role: 'bot', text: 'Hello! How can I help you today?' }]);
  const [input, setInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [botName, setBotName] = useState('Overload Bot');
  const [knowledge, setKnowledge] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || generating) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(m => [...m, { role: 'user', text: userMsg }]);
    setGenerating(true);
    let botReply = '';
    try {
      const res = await fetch('/api/chatbot/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'chat', prompt: `[Persona: ${persona.name} - ${persona.desc}] [Bot Name: ${botName}]${knowledge ? `\n[Knowledge Base: ${knowledge}]` : ''}\n\nUser: ${userMsg}\n\nRespond as the ${persona.name} chatbot. Be concise and helpful.` }) });
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      setMessages(m => [...m, { role: 'bot', text: '' }]);
      while (true) { const { done, value } = await reader.read(); if (done) break; const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { try { const d = JSON.parse(line.slice(6)); if (d.type === 'chunk') { botReply += d.text; setMessages(m => { const copy = [...m]; copy[copy.length - 1] = { role: 'bot', text: botReply }; return copy; }); } else if (d.type === 'result') { botReply = d.data.content; setMessages(m => { const copy = [...m]; copy[copy.length - 1] = { role: 'bot', text: botReply }; return copy; }); } } catch {} } }
    } catch (e) { console.error(e); setMessages(m => [...m, { role: 'bot', text: 'Sorry, something went wrong. Please try again.' }]); } finally { setGenerating(false); }
  };

  const generateTemplate = async (template) => {
    setGenerating(true); setOutput('');
    try {
      const res = await fetch('/api/chatbot/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'template', prompt: `[Persona: ${persona.name}] [Bot Name: ${botName}]\n\n${template.prompt}` }) });
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) { const { done, value } = await reader.read(); if (done) break; const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { try { const d = JSON.parse(line.slice(6)); if (d.type === 'chunk') setOutput(p => p + d.text); else if (d.type === 'result') setOutput(d.data.content); } catch {} } }
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6 animate-fade-in flex items-end justify-between">
        <div><p className="hud-label mb-2" style={{ color: '#0ea5e9' }}>AI CHATBOT</p><h1 className="text-2xl font-bold text-white">Chatbot Builder</h1></div>
        <div className="flex gap-1">{['playground', 'templates', 'config'].map(t => (<button key={t} onClick={() => setTab(t)} className={`chip text-[10px] ${tab === t ? 'active' : ''}`} style={tab === t ? { background: 'rgba(14,165,233,0.15)', borderColor: 'rgba(14,165,233,0.3)', color: '#38bdf8' } : {}}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>))}</div>
      </div>

      {tab === 'playground' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 animate-fade-in">
          <div className="lg:col-span-3">
            <div className="panel rounded-xl overflow-hidden flex flex-col" style={{ height: '520px' }}>
              <div className="px-4 py-3 border-b border-indigo-500/[0.06] flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${persona.color}20`, color: persona.color }}>{botName[0]}</div>
                <div><p className="text-xs font-bold text-gray-200">{botName}</p><p className="text-[10px] text-gray-500">{persona.name} &bull; {generating ? 'Typing...' : 'Online'}</p></div>
                <div className={`w-2 h-2 rounded-full ml-auto ${generating ? 'bg-sky-400 animate-pulse' : 'bg-emerald-400'}`} />
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed ${m.role === 'user' ? 'bg-sky-500/15 text-sky-100 rounded-br-sm' : 'bg-white/[0.03] text-gray-300 rounded-bl-sm border border-indigo-500/[0.06]'}`}>
                      {m.text}{generating && i === messages.length - 1 && m.role === 'bot' && <span className="inline-block w-1 h-3 bg-sky-400 ml-0.5 animate-pulse" />}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3 border-t border-indigo-500/[0.06] flex gap-2">
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Type a message..." className="flex-1 input-field rounded-lg px-4 py-2.5 text-sm" />
                <button onClick={sendMessage} disabled={generating || !input.trim()} className="btn-accent px-4 rounded-lg text-sm" style={{ background: '#0ea5e9' }}>Send</button>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="panel rounded-xl p-4">
              <p className="hud-label mb-3">PERSONA</p>
              <div className="space-y-1.5">{BOT_PERSONAS.map(p => (<button key={p.id} onClick={() => setPersona(p)} className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all ${persona.id === p.id ? 'border-sky-500/30 bg-sky-500/8' : 'border-indigo-500/[0.06] hover:border-indigo-500/10'}`}><p className="font-bold" style={{ color: persona.id === p.id ? p.color : '#d1d5db' }}>{p.name}</p><p className="text-[10px] text-gray-500 mt-0.5">{p.desc}</p></button>))}</div>
            </div>
            <button onClick={() => { setMessages([{ role: 'bot', text: 'Hello! How can I help you today?' }]); }} className="chip text-[10px] w-full justify-center">Clear Chat</button>
          </div>
        </div>
      )}

      {tab === 'templates' && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TEMPLATES.map(t => (
              <button key={t.name} onClick={() => generateTemplate(t)} disabled={generating} className="panel-interactive rounded-xl p-4 text-left">
                <p className="text-xs font-bold text-gray-200">{t.name}</p>
                <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{t.prompt}</p>
              </button>
            ))}
          </div>
          {(generating || output) && <div className="panel rounded-xl p-5"><div className="flex items-center gap-2 mb-3"><div className={`w-2 h-2 rounded-full ${generating ? 'bg-sky-400 animate-pulse' : 'bg-emerald-400'}`} /><span className="hud-label" style={{ color: generating ? '#38bdf8' : '#4ade80' }}>{generating ? 'GENERATING...' : 'TEMPLATE READY'}</span></div><pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 bg-sky-400 ml-0.5 animate-pulse" />}</pre></div>}
        </div>
      )}

      {tab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">
          <div className="panel rounded-xl p-4 space-y-4">
            <div><p className="hud-label mb-3">BOT NAME</p><input value={botName} onChange={e => setBotName(e.target.value)} className="w-full input-field rounded-lg px-4 py-2.5 text-sm" /></div>
            <div><p className="hud-label mb-3">PERSONA</p><div className="grid grid-cols-2 gap-2">{BOT_PERSONAS.map(p => (<button key={p.id} onClick={() => setPersona(p)} className={`text-left px-3 py-2.5 rounded-lg border text-xs transition-all ${persona.id === p.id ? 'border-sky-500/30 bg-sky-500/8' : 'border-indigo-500/[0.06]'}`}><p className="font-bold" style={{ color: persona.id === p.id ? p.color : '#9ca3af' }}>{p.name}</p></button>))}</div></div>
          </div>
          <div className="panel rounded-xl p-4">
            <p className="hud-label mb-3">KNOWLEDGE BASE</p>
            <textarea value={knowledge} onChange={e => setKnowledge(e.target.value)} rows={8} placeholder="Paste your FAQ, product info, or any knowledge the bot should use when answering..." className="w-full input-field rounded-lg px-4 py-3 text-sm resize-none" />
            <p className="text-[10px] text-gray-600 mt-2">This context will be included in every bot response.</p>
          </div>
        </div>
      )}
    </div>
  );
}
