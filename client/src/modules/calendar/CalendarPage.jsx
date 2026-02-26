import { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchJSON, postJSON, connectSSE } from '../../lib/api';

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
  usePageTitle('Marketing Calendar');
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', type: 'content' });

  useEffect(() => {
    setLoading(true);
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = new Date(year, month + 1, 0);
    const end = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
    fetchJSON(`/api/calendar/events?start=${start}&end=${end}`)
      .then(data => setEvents(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [year, month]);

  const days = getMonthData(year, month);
  const today = now.getDate();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const dayEvents = (day) => events.filter(e => new Date(e.date).getDate() === day);

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth()); };

  const addEvent = async () => {
    if (!newEvent.title.trim() || !selectedDay) return;
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    const type = EVENT_TYPES.find(t => t.id === newEvent.type);
    try {
      const created = await postJSON('/api/calendar/events', {
        title: newEvent.title,
        module_id: newEvent.type,
        date,
        color: type?.color || '#3b82f6',
      });
      setEvents(e => [...e, created]);
      setNewEvent({ title: '', type: 'content' });
      setShowAddForm(false);
    } catch (err) { console.error(err); }
  };

  const fillCalendar = () => {
    setGenerating(true); setOutput('');
    connectSSE('/api/calendar/generate', { type: 'fill', prompt: `Generate a marketing content calendar for ${MONTHS[month]} ${year}. Include social media posts, blog content, email campaigns, and deadlines. Format each event as: [Day] - [Type: campaign|content|social|email|deadline] - [Title]` }, {
      onChunk: (text) => setOutput(p => p + text),
      onResult: (data) => { setOutput(data.content); setGenerating(false); },
      onError: (err) => { console.error(err); setGenerating(false); },
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <div className="mb-6 sm:mb-8 animate-fade-in flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div><p className="hud-label text-[11px] mb-2" style={{ color: '#0ea5e9' }}>MARKETING CALENDAR</p><h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">{MONTHS[month]} {year}</h1></div>
        <div className="flex flex-wrap gap-2">
          <button onClick={fillCalendar} disabled={generating} className="chip text-[10px]" style={{ background: 'rgba(14,165,233,0.15)', borderColor: 'rgba(14,165,233,0.3)', color: '#38bdf8' }}>{generating ? 'Generating...' : 'AI Fill Calendar'}</button>
          <button onClick={goToday} className="chip text-[10px]">Today</button>
          <button onClick={prev} className="chip text-[10px]">&larr;</button>
          <button onClick={next} className="chip text-[10px]">&rarr;</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">{EVENT_TYPES.map(t => (<div key={t.id} className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: t.color }} /><span className="text-xs text-gray-500">{t.name}</span></div>))}</div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="lg:col-span-3">
          <div className="overflow-x-auto">
            <div className="panel rounded-2xl overflow-hidden min-w-[480px]">
              <div className="grid grid-cols-7">{DAYS.map(d => (<div key={d} className="p-2 text-center text-xs font-bold text-gray-500 border-b border-indigo-500/[0.04]">{d}</div>))}</div>
              <div className="grid grid-cols-7">
                {days.map((d, i) => {
                  const evts = d.current ? dayEvents(d.day) : [];
                  const isToday = isCurrentMonth && d.current && d.day === today;
                  const isSelected = d.current && d.day === selectedDay;
                  return (
                    <button key={i} onClick={() => d.current && setSelectedDay(d.day === selectedDay ? null : d.day)}
                      className={`min-h-[60px] sm:min-h-[80px] p-2 border-b border-r border-indigo-500/[0.03] text-left transition-all ${d.current ? 'hover:bg-white/[0.01]' : 'opacity-30'} ${isSelected ? 'bg-sky-500/5 border-sky-500/15' : ''}`}>
                      <span className={`text-xs font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full ${isToday ? 'bg-sky-500 text-white' : d.current ? 'text-gray-400' : 'text-gray-700'}`}>{d.day}</span>
                      <div className="mt-0.5 space-y-0.5">
                        {evts.slice(0, 2).map(e => { const type = EVENT_TYPES.find(t => t.id === e.module_id || t.id === e.type); return (<div key={e.id} className="flex items-center gap-1"><div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: type?.color || e.color || '#3b82f6' }} /><span className="text-[9px] text-gray-400 truncate">{e.title}</span></div>); })}
                        {evts.length > 2 && <span className="text-[9px] text-gray-600">+{evts.length - 2} more</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {selectedDay && (
            <div className="panel rounded-2xl p-4 sm:p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-3"><p className="hud-label text-[11px]" style={{ color: '#0ea5e9' }}>{MONTHS[month]} {selectedDay}</p><button onClick={() => setShowAddForm(!showAddForm)} className="chip text-[10px]">+ Add</button></div>
              {showAddForm && (<div className="space-y-3 mb-3 p-3 rounded-lg bg-black/30"><input value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="Event title" className="w-full input-field rounded px-3 py-2 text-xs" /><div className="flex gap-1 flex-wrap">{EVENT_TYPES.map(t => (<button key={t.id} onClick={() => setNewEvent({ ...newEvent, type: t.id })} className="text-[9px] px-2 py-0.5 rounded-full border" style={newEvent.type === t.id ? { background: `${t.color}20`, borderColor: `${t.color}40`, color: t.color } : { borderColor: 'rgba(99,102,241,0.1)', color: '#6b7280' }}>{t.name}</button>))}</div><button onClick={addEvent} className="btn-accent w-full py-1.5 rounded text-[10px]" style={{ background: '#0ea5e9' }}>Add Event</button></div>)}
              <div className="space-y-1.5">{dayEvents(selectedDay).length === 0 ? <p className="text-xs text-gray-600">No events</p> : dayEvents(selectedDay).map(e => { const type = EVENT_TYPES.find(t => t.id === e.module_id || t.id === e.type); return (<div key={e.id} className="flex items-center gap-2 py-1.5"><div className="w-1.5 h-1.5 rounded-full" style={{ background: type?.color || e.color || '#3b82f6' }} /><span className="text-sm text-gray-300">{e.title}</span></div>); })}</div>
            </div>
          )}

          <div className="panel rounded-2xl p-4 sm:p-6">
            <p className="hud-label text-[11px] mb-3">UPCOMING</p>
            <div className="space-y-3">{events.filter(e => { const d = new Date(e.date); return isCurrentMonth ? d.getDate() >= today : true; }).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 6).map(e => { const type = EVENT_TYPES.find(t => t.id === e.module_id || t.id === e.type); return (<div key={e.id} className="flex items-center gap-2"><span className="text-xs text-gray-600 font-mono w-6">{new Date(e.date).getDate()}</span><div className="w-1.5 h-1.5 rounded-full" style={{ background: type?.color || e.color || '#3b82f6' }} /><span className="text-xs text-gray-400 truncate">{e.title}</span></div>); })}</div>
          </div>
        </div>
      </div>

      {output && <div className="mt-6 animate-fade-up"><div className="flex items-center gap-2 mb-3"><div className={`w-2 h-2 rounded-full ${generating ? 'bg-sky-400 animate-pulse' : 'bg-emerald-400'}`} /><span className="hud-label text-[11px]" style={{ color: generating ? '#38bdf8' : '#4ade80' }}>{generating ? 'GENERATING CALENDAR...' : 'AI SUGGESTIONS'}</span></div><div className="panel rounded-2xl p-4 sm:p-7"><pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 bg-sky-400 ml-0.5 animate-pulse" />}</pre></div></div>}
    </div>
  );
}
