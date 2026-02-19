import { useState } from 'react';

const EVENT_TYPES = [
  { id: 'campaign', name: 'Campaign', color: '#7c3aed' },
  { id: 'content', name: 'Content', color: '#f97316' },
  { id: 'social', name: 'Social', color: '#3b82f6' },
  { id: 'email', name: 'Email', color: '#f59e0b' },
  { id: 'deadline', name: 'Deadline', color: '#ef4444' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getMonthData(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const days = [];
  for (let i = firstDay - 1; i >= 0; i--) days.push({ day: daysInPrevMonth - i, current: false });
  for (let i = 1; i <= daysInMonth; i++) days.push({ day: i, current: true });
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) days.push({ day: i, current: false });
  return days;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [events, setEvents] = useState([
    { id: 1, title: 'Product Launch Campaign', type: 'campaign', day: 5 },
    { id: 2, title: 'Blog Post: SEO Guide', type: 'content', day: 8 },
    { id: 3, title: 'Instagram Reel Series', type: 'social', day: 8 },
    { id: 4, title: 'Newsletter Send', type: 'email', day: 12 },
    { id: 5, title: 'Ad Campaign Review', type: 'deadline', day: 15 },
    { id: 6, title: 'Twitter Thread', type: 'social', day: 18 },
    { id: 7, title: 'Case Study Publish', type: 'content', day: 20 },
    { id: 8, title: 'Quarter End Report', type: 'deadline', day: 28 },
    { id: 9, title: 'Drip Sequence Launch', type: 'email', day: 22 },
    { id: 10, title: 'Seasonal Sale Start', type: 'campaign', day: 25 },
  ]);
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', type: 'content' });

  const days = getMonthData(year, month);
  const today = now.getDate();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const dayEvents = (day) => events.filter(e => e.day === day);

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth()); };

  const addEvent = () => { if (!newEvent.title.trim() || !selectedDay) return; setEvents(e => [...e, { id: Date.now(), title: newEvent.title, type: newEvent.type, day: selectedDay }]); setNewEvent({ title: '', type: 'content' }); setShowAddForm(false); };

  const fillCalendar = async () => {
    setGenerating(true); setOutput('');
    try {
      const res = await fetch('/api/calendar/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'fill', prompt: `Generate a marketing content calendar for ${MONTHS[month]} ${year}. Include social media posts, blog content, email campaigns, and deadlines. Format each event as: [Day] - [Type: campaign|content|social|email|deadline] - [Title]` }) });
      const reader = res.body.getReader(); const decoder = new TextDecoder();
      while (true) { const { done, value } = await reader.read(); if (done) break; const lines = decoder.decode(value, { stream: true }).split('\n').filter(l => l.startsWith('data: ')); for (const line of lines) { try { const d = JSON.parse(line.slice(6)); if (d.type === 'chunk') setOutput(p => p + d.text); else if (d.type === 'result') setOutput(d.data.content); } catch {} } }
    } catch (e) { console.error(e); } finally { setGenerating(false); }
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6 animate-fade-in flex items-end justify-between">
        <div><p className="hud-label mb-2" style={{ color: '#0ea5e9' }}>MARKETING CALENDAR</p><h1 className="text-2xl font-bold text-white">{MONTHS[month]} {year}</h1></div>
        <div className="flex gap-2">
          <button onClick={fillCalendar} disabled={generating} className="chip text-[10px]" style={{ background: 'rgba(14,165,233,0.15)', borderColor: 'rgba(14,165,233,0.3)', color: '#38bdf8' }}>{generating ? 'Generating...' : 'AI Fill Calendar'}</button>
          <button onClick={goToday} className="chip text-[10px]">Today</button>
          <button onClick={prev} className="chip text-[10px]">&larr;</button>
          <button onClick={next} className="chip text-[10px]">&rarr;</button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">{EVENT_TYPES.map(t => (<div key={t.id} className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: t.color }} /><span className="text-[10px] text-gray-500">{t.name}</span></div>))}</div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <div className="panel rounded-xl overflow-hidden">
            <div className="grid grid-cols-7">{DAYS.map(d => (<div key={d} className="p-2 text-center text-[10px] font-bold text-gray-500 border-b border-indigo-500/[0.04]">{d}</div>))}</div>
            <div className="grid grid-cols-7">
              {days.map((d, i) => {
                const evts = d.current ? dayEvents(d.day) : [];
                const isToday = isCurrentMonth && d.current && d.day === today;
                const isSelected = d.current && d.day === selectedDay;
                return (
                  <button key={i} onClick={() => d.current && setSelectedDay(d.day === selectedDay ? null : d.day)}
                    className={`min-h-[72px] p-1.5 border-b border-r border-indigo-500/[0.03] text-left transition-all ${d.current ? 'hover:bg-white/[0.01]' : 'opacity-30'} ${isSelected ? 'bg-sky-500/5 border-sky-500/15' : ''}`}>
                    <span className={`text-[10px] font-semibold inline-flex items-center justify-center w-5 h-5 rounded-full ${isToday ? 'bg-sky-500 text-white' : d.current ? 'text-gray-400' : 'text-gray-700'}`}>{d.day}</span>
                    <div className="mt-0.5 space-y-0.5">
                      {evts.slice(0, 2).map(e => { const type = EVENT_TYPES.find(t => t.id === e.type); return (<div key={e.id} className="flex items-center gap-1"><div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: type?.color }} /><span className="text-[8px] text-gray-400 truncate">{e.title}</span></div>); })}
                      {evts.length > 2 && <span className="text-[8px] text-gray-600">+{evts.length - 2} more</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {selectedDay && (
            <div className="panel rounded-xl p-4 animate-fade-in">
              <div className="flex items-center justify-between mb-3"><p className="hud-label" style={{ color: '#0ea5e9' }}>{MONTHS[month]} {selectedDay}</p><button onClick={() => setShowAddForm(!showAddForm)} className="chip text-[10px]">+ Add</button></div>
              {showAddForm && (<div className="space-y-2 mb-3 p-2 rounded-lg bg-black/30"><input value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="Event title" className="w-full input-field rounded px-2 py-1.5 text-xs" /><div className="flex gap-1 flex-wrap">{EVENT_TYPES.map(t => (<button key={t.id} onClick={() => setNewEvent({ ...newEvent, type: t.id })} className="text-[8px] px-2 py-0.5 rounded-full border" style={newEvent.type === t.id ? { background: `${t.color}20`, borderColor: `${t.color}40`, color: t.color } : { borderColor: 'rgba(99,102,241,0.1)', color: '#6b7280' }}>{t.name}</button>))}</div><button onClick={addEvent} className="btn-accent w-full py-1.5 rounded text-[10px]" style={{ background: '#0ea5e9' }}>Add Event</button></div>)}
              <div className="space-y-1.5">{dayEvents(selectedDay).length === 0 ? <p className="text-[10px] text-gray-600">No events</p> : dayEvents(selectedDay).map(e => { const type = EVENT_TYPES.find(t => t.id === e.type); return (<div key={e.id} className="flex items-center gap-2 py-1.5"><div className="w-1.5 h-1.5 rounded-full" style={{ background: type?.color }} /><span className="text-xs text-gray-300">{e.title}</span></div>); })}</div>
            </div>
          )}

          <div className="panel rounded-xl p-4">
            <p className="hud-label mb-3">UPCOMING</p>
            <div className="space-y-2">{events.filter(e => isCurrentMonth ? e.day >= today : true).sort((a, b) => a.day - b.day).slice(0, 6).map(e => { const type = EVENT_TYPES.find(t => t.id === e.type); return (<div key={e.id} className="flex items-center gap-2"><span className="text-[10px] text-gray-600 font-mono w-6">{e.day}</span><div className="w-1.5 h-1.5 rounded-full" style={{ background: type?.color }} /><span className="text-[10px] text-gray-400 truncate">{e.title}</span></div>); })}</div>
          </div>
        </div>
      </div>

      {output && <div className="mt-4 animate-fade-up"><div className="flex items-center gap-2 mb-3"><div className={`w-2 h-2 rounded-full ${generating ? 'bg-sky-400 animate-pulse' : 'bg-emerald-400'}`} /><span className="hud-label" style={{ color: generating ? '#38bdf8' : '#4ade80' }}>{generating ? 'GENERATING CALENDAR...' : 'AI SUGGESTIONS'}</span></div><div className="panel rounded-xl p-5"><pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 bg-sky-400 ml-0.5 animate-pulse" />}</pre></div></div>}
    </div>
  );
}
