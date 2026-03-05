import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { MODULE_REGISTRY } from '../../config/modules';
import { connectSSE } from '../../lib/api';

// ─── Module path map for extracting navigation links from AI responses ────────

const MODULE_PATHS = MODULE_REGISTRY.reduce((acc, m) => {
  acc[m.path] = m.name;
  return acc;
}, {});

// Known paths that might appear in AI responses
const ALL_PATHS = [
  '/video-marketing', '/content', '/creative', '/email-sms', '/social',
  '/website-builder', '/pr-press', '/ads', '/funnels', '/influencers',
  '/affiliates', '/product-feeds', '/ab-testing', '/budget-optimizer',
  '/referral-loyalty', '/analytics', '/seo', '/crm', '/reviews',
  '/competitors', '/calendar', '/reports', '/audience-builder', '/goal-tracker',
  '/ecommerce-hub', '/customer-ai', '/knowledge-base', '/integrations',
  '/api-manager', '/webhooks', '/workflow-builder', '/the-advisor', '/autopilot',
  '/brand-hub', '/team', '/client-manager', '/automation-settings',
  '/activity', '/approvals', '/automation-rules', '/tutorial',
];

function extractLinks(text) {
  const found = [];
  const seen = new Set();
  for (const path of ALL_PATHS) {
    if (text.includes(path) && !seen.has(path)) {
      seen.add(path);
      const name = MODULE_PATHS[path] || path.replace('/', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      found.push({ label: name, path });
    }
  }
  return found.slice(0, 5);
}

const SUGGESTION_POOL = [
  'How do I get started?',
  'What is Autopilot mode?',
  'How do integrations work?',
  'Tell me about The Advisor',
  'How do I run paid ads?',
  'What can AI Content do?',
  'How does Copilot mode work?',
  'What is Brand Hub?',
  'How do I track goals?',
  'What is the Workflow Builder?',
  'How does the CRM work?',
  'What is the A/B Testing module?',
  'How do I create a funnel?',
  'What does the Budget Optimizer do?',
  'Tell me about Analytics',
];

function getRandomSuggestions(exclude, count = 3) {
  const filtered = SUGGESTION_POOL.filter(s => s !== exclude);
  return [...filtered].sort(() => Math.random() - 0.5).slice(0, count);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ChatBot() {
  const { dark } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const cancelRef = useRef(null);

  // Theme tokens
  const terra = '#C45D3E';
  const sage = '#5E8E6E';
  const ink = dark ? '#E8E4DE' : '#332F2B';
  const t2 = dark ? '#94908A' : '#7A756F';
  const t3 = dark ? '#6B6660' : '#94908A';
  const brd = dark ? 'rgba(255,255,255,0.07)' : 'rgba(44,40,37,0.08)';
  const bgPanel = dark ? '#1E1C1A' : '#FBF7F0';
  const bgInput = dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.03)';
  const bgBotMsg = dark ? 'rgba(196,93,62,0.08)' : 'rgba(196,93,62,0.06)';
  const bgUserMsg = dark ? 'rgba(94,142,110,0.12)' : 'rgba(94,142,110,0.08)';
  const dmSans = "'DM Sans', system-ui, sans-serif";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Cleanup SSE on unmount
  useEffect(() => () => cancelRef.current?.(), []);

  const handleSend = useCallback((text) => {
    const msg = (text || input).trim();
    if (!msg || isStreaming) return;
    setInput('');

    const userMsg = { role: 'user', text: msg };

    // Add placeholder streaming bot message
    const botPlaceholder = { role: 'bot', text: '', streaming: true, links: [], suggestions: [] };
    setMessages(prev => [...prev, userMsg, botPlaceholder]);
    setIsStreaming(true);

    // Build history from current messages (exclude the placeholder we just added)
    const history = messages.map(m => ({ role: m.role, text: m.text }));

    let accumulated = '';

    cancelRef.current = connectSSE('/api/chatbot/assistant', { message: msg, history }, {
      onChunk: (chunk) => {
        accumulated += chunk;
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (updated[lastIdx]?.streaming) {
            updated[lastIdx] = { ...updated[lastIdx], text: accumulated };
          }
          return updated;
        });
      },
      onResult: () => {
        const links = extractLinks(accumulated);
        const suggestions = getRandomSuggestions(msg);
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (updated[lastIdx]?.streaming) {
            updated[lastIdx] = { role: 'bot', text: accumulated, streaming: false, links, suggestions };
          }
          return updated;
        });
        setIsStreaming(false);
        cancelRef.current = null;
      },
      onError: (err) => {
        setMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (updated[lastIdx]?.streaming) {
            updated[lastIdx] = {
              role: 'bot',
              text: "Sorry, I couldn't connect right now. Try asking again, or use **Ctrl+K** to navigate directly to any module.",
              streaming: false,
              links: [],
              suggestions: getRandomSuggestions(msg),
            };
          }
          return updated;
        });
        setIsStreaming(false);
        cancelRef.current = null;
      },
    });
  }, [input, isStreaming, messages]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNavClick = (path) => {
    navigate(path);
    setOpen(false);
  };

  // ─── Render helpers ─────────────────────

  const renderMarkdown = (text) => {
    // Supports **bold** and strips module paths like (/some-path) from display
    return text.split(/(\*\*.*?\*\*)/).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ fontWeight: 700, color: ink }}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const renderTypingDots = () => (
    <div className="flex gap-1 py-1">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: terra,
            opacity: 0.6,
            animation: 'bounce 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  );

  const renderBotMessage = (msg, idx) => (
    <div key={idx} className="flex gap-2.5 animate-fade-in" style={{ animationDuration: '300ms' }}>
      {/* Avatar */}
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{
        background: `linear-gradient(135deg, ${terra}20, ${sage}20)`,
      }}>
        <svg className="w-3.5 h-3.5" style={{ color: terra }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      </div>

      {/* Message body */}
      <div className="flex-1 min-w-0">
        <div className="rounded-xl rounded-tl-sm px-3.5 py-2.5" style={{ background: bgBotMsg }}>
          {msg.text ? (
            <p style={{ fontSize: 13, color: t2, lineHeight: 1.7, fontFamily: dmSans, whiteSpace: 'pre-wrap' }}>
              {renderMarkdown(msg.text)}
              {msg.streaming && <span style={{ opacity: 0.4 }}>▌</span>}
            </p>
          ) : (
            renderTypingDots()
          )}

          {/* Navigation links extracted from response */}
          {!msg.streaming && msg.links && msg.links.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {msg.links.map((link, li) => (
                <button
                  key={li}
                  onClick={() => handleNavClick(link.path)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all duration-200"
                  style={{
                    background: `${terra}12`,
                    border: `1px solid ${terra}20`,
                    fontSize: 11,
                    fontWeight: 600,
                    color: terra,
                    fontFamily: dmSans,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${terra}22`; }}
                  onMouseLeave={e => { e.currentTarget.style.background = `${terra}12`; }}
                >
                  {link.label}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Follow-up suggestion chips */}
        {!msg.streaming && msg.suggestions && msg.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {msg.suggestions.map((s, si) => (
              <button
                key={si}
                onClick={() => handleSend(s)}
                className="px-2.5 py-1 rounded-full transition-all duration-200"
                style={{
                  background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)',
                  border: `1px solid ${brd}`,
                  fontSize: 11,
                  color: t2,
                  fontFamily: dmSans,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.08)' : 'rgba(44,40,37,0.07)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)'; }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderUserMessage = (msg, idx) => (
    <div key={idx} className="flex justify-end animate-fade-in" style={{ animationDuration: '200ms' }}>
      <div className="rounded-xl rounded-tr-sm px-3.5 py-2.5 max-w-[85%]" style={{ background: bgUserMsg }}>
        <p style={{ fontSize: 13, color: ink, lineHeight: 1.55, fontFamily: dmSans }}>
          {msg.text}
        </p>
      </div>
    </div>
  );

  // ─── Portal ─────────────────────────────

  return createPortal(
    <>
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-5px); }
        }
      `}</style>
      <div ref={panelRef} className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[55]" style={{ fontFamily: dmSans }}>

        {/* ── Chat panel ── */}
        {open && (
          <div
            className="absolute bottom-16 right-0 w-[calc(100vw-40px)] sm:w-[360px] rounded-2xl overflow-hidden animate-fade-in flex flex-col"
            style={{
              background: bgPanel,
              border: `1px solid ${brd}`,
              boxShadow: dark
                ? '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)'
                : '0 20px 60px rgba(44,40,37,0.15), 0 0 0 1px rgba(44,40,37,0.04)',
              maxHeight: 'min(520px, calc(100vh - 120px))',
              animationDuration: '250ms',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${brd}` }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{
                  background: `linear-gradient(135deg, ${terra}, ${sage})`,
                }}>
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: ink, fontFamily: dmSans }}>Overload Assistant</p>
                  <p style={{ fontSize: 10, color: isStreaming ? terra : sage, fontWeight: 600 }}>
                    {isStreaming ? 'Thinking...' : 'Online'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)' }}
                onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.1)' : 'rgba(44,40,37,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)'; }}
                aria-label="Close chat"
              >
                <svg className="w-4 h-4" style={{ color: t3 }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-4" style={{ minHeight: 200 }}>
              {/* Welcome message */}
              {messages.length === 0 && (
                <div className="space-y-4">
                  <div className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{
                      background: `linear-gradient(135deg, ${terra}20, ${sage}20)`,
                    }}>
                      <svg className="w-3.5 h-3.5" style={{ color: terra }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="rounded-xl rounded-tl-sm px-3.5 py-2.5" style={{ background: bgBotMsg }}>
                        <p style={{ fontSize: 13, color: t2, lineHeight: 1.65, fontFamily: dmSans }}>
                          Hey! I'm the <strong style={{ fontWeight: 700, color: ink }}>Overload Assistant</strong>. I know everything about this platform — ask me anything about any module, feature, or how to get started.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {['How do I get started?', 'What is Autopilot?', 'Show me analytics tools', 'How do integrations work?'].map((s, si) => (
                          <button
                            key={si}
                            onClick={() => handleSend(s)}
                            className="px-2.5 py-1 rounded-full transition-all duration-200"
                            style={{
                              background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)',
                              border: `1px solid ${brd}`,
                              fontSize: 11,
                              color: t2,
                              fontFamily: dmSans,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.08)' : 'rgba(44,40,37,0.07)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)'; }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Conversation */}
              {messages.map((msg, idx) =>
                msg.role === 'bot' ? renderBotMessage(msg, idx) : renderUserMessage(msg, idx)
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="flex-shrink-0 px-3 pb-3 pt-1">
              <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{
                background: bgInput,
                border: `1px solid ${isStreaming ? terra + '40' : brd}`,
                transition: 'border-color 0.2s',
              }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isStreaming ? 'Thinking...' : 'Ask me anything...'}
                  disabled={isStreaming}
                  className="flex-1 bg-transparent outline-none"
                  style={{ fontSize: 13, color: ink, fontFamily: dmSans, opacity: isStreaming ? 0.5 : 1 }}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isStreaming}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
                  style={{
                    background: (input.trim() && !isStreaming) ? `linear-gradient(135deg, ${terra}, ${terra}dd)` : (dark ? 'rgba(255,255,255,0.04)' : 'rgba(44,40,37,0.04)'),
                    opacity: (input.trim() && !isStreaming) ? 1 : 0.4,
                  }}
                  aria-label="Send message"
                >
                  <svg className="w-3.5 h-3.5" style={{ color: (input.trim() && !isStreaming) ? '#fff' : t3 }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Floating button ── */}
        <button
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Close assistant' : 'Open assistant'}
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300"
          style={{
            background: open
              ? (dark ? 'rgba(255,255,255,0.08)' : 'rgba(44,40,37,0.08)')
              : `linear-gradient(135deg, ${terra}, #D4735A)`,
            boxShadow: open
              ? 'none'
              : `0 6px 24px ${terra}40, 0 2px 8px ${terra}30`,
            transform: open ? 'scale(0.9)' : 'scale(1)',
          }}
          onMouseEnter={e => { if (!open) e.currentTarget.style.transform = 'scale(1.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = open ? 'scale(0.9)' : 'scale(1)'; }}
        >
          {open ? (
            <svg className="w-5 h-5" style={{ color: t3 }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
          )}
        </button>
      </div>
    </>,
    document.body
  );
}
