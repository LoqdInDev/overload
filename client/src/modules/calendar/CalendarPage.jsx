import { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { fetchJSON, postJSON, deleteJSON, connectSSE } from '../../lib/api';
import AIInsightsPanel from '../../components/shared/AIInsightsPanel';

const EVENT_TYPES = [
  { id: 'campaign', name: 'Campaign', color: '#7c3aed' },
  { id: 'content', name: 'Content', color: '#f97316' },
  { id: 'social', name: 'Social', color: '#3b82f6' },
  { id: 'email', name: 'Email', color: '#f59e0b' },
  { id: 'deadline', name: 'Deadline', color: '#ef4444' },
];

const RECURRENCE_OPTIONS = [
  { id: null, name: 'One-time' },
  { id: 'daily', name: 'Daily' },
  { id: 'weekly', name: 'Weekly' },
  { id: 'monthly', name: 'Monthly' },
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
  const [newEvent, setNewEvent] = useState({ title: '', type: 'content', recurrence: null });
  const [planMonth, setPlanMonth] = useState(new Date().toLocaleString('default', { month: 'long', year: 'numeric' }));
  const [planBusinessType, setPlanBusinessType] = useState('E-commerce');
  const [planGoal, setPlanGoal] = useState('Brand awareness');
  const [contentPlan, setContentPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);

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
        recurrence: newEvent.recurrence,
      });
      setEvents(e => [...e, created]);
      setNewEvent({ title: '', type: 'content', recurrence: null });
      setShowAddForm(false);
    } catch (err) { console.error(err); }
  };

  const removeEvent = async (id) => {
    try {
      await deleteJSON(`/api/calendar/events/${id}`);
      setEvents(e => e.filter(ev => ev.id !== id));
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

  const RecurrenceBadge = ({ recurrence }) => {
    if (!recurrence) return null;
    return (
      <span className="inline-flex items-center gap-0.5 text-[8px] text-sky-400 opacity-70" title={`Repeats ${recurrence}`}>
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 2l4 4-4 4" /><path d="M3 11v-1a4 4 0 014-4h14" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v1a4 4 0 01-4 4H3" /></svg>
      </span>
    );
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

      {/* ── AI Content Planner ── */}
      <div className="rounded-2xl overflow-hidden mb-6 animate-fade-in" style={{ background: 'rgba(14,165,233,0.04)', border: '1px solid rgba(14,165,233,0.14)' }}>
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-5" style={{ borderBottom: '1px solid rgba(14,165,233,0.08)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(14,165,233,0.14)' }}>
            <svg className="w-5 h-5" style={{ color: '#38bdf8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold">AI Content Planner</p>
            <p className="text-sm text-gray-500">Generate a full month of platform-specific content ideas</p>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
            <div>
              <p className="hud-label text-xs mb-2">MONTH</p>
              <input className="input-field w-full rounded-xl px-4 py-3 text-sm" placeholder="e.g. March 2026" value={planMonth} onChange={e => setPlanMonth(e.target.value)} />
            </div>
            <div>
              <p className="hud-label text-xs mb-2">BUSINESS TYPE</p>
              <input className="input-field w-full rounded-xl px-4 py-3 text-sm" placeholder="e.g. E-commerce, SaaS" value={planBusinessType} onChange={e => setPlanBusinessType(e.target.value)} />
            </div>
            <div>
              <p className="hud-label text-xs mb-2">MAIN GOAL</p>
              <input className="input-field w-full rounded-xl px-4 py-3 text-sm" placeholder="e.g. Brand awareness" value={planGoal} onChange={e => setPlanGoal(e.target.value)} />
            </div>
          </div>
          <button className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
            style={{ background: 'rgba(14,165,233,0.12)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.25)' }}
            disabled={planLoading}
            onClick={async () => {
              setPlanLoading(true);
              setContentPlan(null);
              try {
                const result = await postJSON('/api/calendar/suggest-content-plan', { month: planMonth, business_type: planBusinessType, goal: planGoal });
                setContentPlan(result);
              } catch {}
              setPlanLoading(false);
            }}>
            {planLoading ? (
              <><span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(56,189,248,0.25)', borderTopColor: '#38bdf8' }} />Generating Plan...</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" /></svg>Generate Content Plan</>
            )}
          </button>

          {contentPlan && (
            <div className="mt-6 space-y-5 animate-fade-in">
              {contentPlan.theme && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)' }}>
                  <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#38bdf8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
                  <div><p className="text-[10px] font-bold tracking-wider" style={{ color: '#38bdf8' }}>MONTHLY THEME</p><p className="text-sm font-medium">{contentPlan.theme}</p></div>
                </div>
              )}
              {contentPlan.plan?.map((week, wi) => {
                const PLATFORM_COLORS = { Instagram: '#ee2a7b', Twitter: '#000000', LinkedIn: '#0a66c2', Facebook: '#1877f2', TikTok: '#010101' };
                const TYPE_COLORS = { Educational: '#8b5cf6', Promotional: '#f97316', Entertainment: '#10b981', UGC: '#f59e0b', 'Behind-the-Scenes': '#6366f1' };
                return (
                  <div key={wi}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[11px] font-bold tracking-wider" style={{ color: '#38bdf8' }}>WEEK {week.week}</span>
                      <div className="flex-1 h-px" style={{ background: 'rgba(14,165,233,0.15)' }} />
                    </div>
                    <div className="space-y-2">
                      {week.posts?.map((post, pi) => {
                        const pColor = PLATFORM_COLORS[post.platform] || '#64748b';
                        const tColor = TYPE_COLORS[post.content_type] || '#64748b';
                        return (
                          <div key={pi} className="group flex items-start gap-3 p-4 rounded-xl transition-all hover:bg-black/[0.02]" style={{ border: '1px solid rgba(14,165,233,0.08)' }}>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full text-white" style={{ background: pColor }}>{post.platform}</span>
                                <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full" style={{ background: `${tColor}18`, color: tColor, border: `1px solid ${tColor}28` }}>{post.content_type}</span>
                                <span className="text-[10px] text-gray-400">{post.day}</span>
                              </div>
                              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{post.topic}</p>
                              {post.hook && <p className="text-xs text-gray-400 mt-1 italic">"{post.hook}"</p>}
                            </div>
                            <button
                              className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all whitespace-nowrap"
                              style={{ background: 'rgba(14,165,233,0.12)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.2)' }}
                              onClick={async () => {
                                const monthParts = planMonth.match(/(\w+)\s+(\d{4})/);
                                let date = new Date().toISOString().slice(0, 10);
                                if (monthParts) {
                                  const mIdx = MONTHS.indexOf(monthParts[1]);
                                  const yr = parseInt(monthParts[2]);
                                  if (mIdx >= 0) {
                                    const dayNum = Math.min((week.week - 1) * 7 + pi + 1, 28);
                                    date = `${yr}-${String(mIdx + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                                  }
                                }
                                try {
                                  const type = EVENT_TYPES.find(t => t.name.toLowerCase() === (post.content_type || '').toLowerCase()) || EVENT_TYPES[1];
                                  const created = await postJSON('/api/calendar/events', {
                                    title: post.topic, module_id: type.id, date, color: type.color, description: post.hook || '',
                                  });
                                  setEvents(ev => [...ev, created]);
                                } catch {}
                              }}>+ Add</button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {contentPlan.notes && (
                <div className="px-4 py-3 rounded-xl text-xs text-gray-500" style={{ background: 'rgba(14,165,233,0.04)', border: '1px solid rgba(14,165,233,0.1)' }}>
                  <p className="font-bold tracking-wider text-[10px] mb-1.5" style={{ color: '#38bdf8' }}>STRATEGIC NOTES</p>
                  <p className="leading-relaxed">{contentPlan.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
                        {evts.slice(0, 2).map(e => { const type = EVENT_TYPES.find(t => t.id === e.module_id || t.id === e.type); return (
                          <div key={e.id} className="flex items-center gap-1">
                            <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: type?.color || e.color || '#3b82f6' }} />
                            <span className="text-[9px] text-gray-400 truncate">{e.title}</span>
                            <RecurrenceBadge recurrence={e.recurrence} />
                          </div>
                        ); })}
                        {evts.length > 2 && <span className="text-[9px] text-gray-600">+{evts.length - 2} more</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {selectedDay && (
            <div className="rounded-2xl overflow-hidden animate-fade-in" style={{ border: '1px solid rgba(14,165,233,0.18)', background: 'rgba(14,165,233,0.03)' }}>
              {/* Day header */}
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(14,165,233,0.1)' }}>
                <div>
                  <p className="text-[10px] font-bold tracking-widest" style={{ color: '#38bdf8' }}>{MONTHS[month].toUpperCase()}</p>
                  <p className="text-2xl font-bold leading-none mt-0.5">{selectedDay}</p>
                </div>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all"
                  style={{ background: showAddForm ? 'rgba(14,165,233,0.2)' : 'rgba(14,165,233,0.1)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.2)' }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  Add
                </button>
              </div>

              {/* Add form */}
              {showAddForm && (
                <div className="px-5 py-4 space-y-3" style={{ borderBottom: '1px solid rgba(14,165,233,0.08)' }}>
                  <input
                    value={newEvent.title}
                    onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && addEvent()}
                    placeholder="Event title…"
                    className="w-full input-field rounded-xl px-3.5 py-2.5 text-sm"
                  />
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 mb-2">TYPE</p>
                    <div className="flex flex-wrap gap-1.5">
                      {EVENT_TYPES.map(t => (
                        <button key={t.id} onClick={() => setNewEvent({ ...newEvent, type: t.id })}
                          className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-all"
                          style={newEvent.type === t.id
                            ? { background: `${t.color}22`, borderColor: `${t.color}50`, color: t.color, border: `1px solid ${t.color}50` }
                            : { border: '1px solid rgba(148,163,184,0.15)', color: '#94a3b8' }}>
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 mb-2">RECURRENCE</p>
                    <div className="flex flex-wrap gap-1.5">
                      {RECURRENCE_OPTIONS.map(r => (
                        <button key={r.id || 'once'} onClick={() => setNewEvent({ ...newEvent, recurrence: r.id })}
                          className="text-[11px] px-2.5 py-1 rounded-full font-medium transition-all"
                          style={newEvent.recurrence === r.id
                            ? { background: 'rgba(14,165,233,0.15)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.3)' }
                            : { border: '1px solid rgba(148,163,184,0.15)', color: '#94a3b8' }}>
                          {r.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={addEvent} disabled={!newEvent.title.trim()}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                    style={{ background: '#0ea5e9', color: '#fff' }}>
                    Save Event
                  </button>
                </div>
              )}

              {/* Events list */}
              <div className="px-5 py-3">
                {dayEvents(selectedDay).length === 0 ? (
                  <div className="py-5 text-center">
                    <svg className="w-8 h-8 mx-auto mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" /></svg>
                    <p className="text-xs text-gray-400">No events this day</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {dayEvents(selectedDay).map(e => {
                      const type = EVENT_TYPES.find(t => t.id === e.module_id || t.id === e.type);
                      const color = type?.color || e.color || '#3b82f6';
                      return (
                        <div key={e.id} className="group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-black/[0.03]">
                          <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: color }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{e.title}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[10px] font-medium" style={{ color }}>{type?.name || 'Event'}</span>
                              <RecurrenceBadge recurrence={e.recurrence} />
                            </div>
                          </div>
                          <button onClick={() => removeEvent(e.id)}
                            className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full flex items-center justify-center transition-all hover:bg-red-500/10 text-gray-400 hover:text-red-400">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Upcoming */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(148,163,184,0.12)' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
              <p className="text-[11px] font-bold tracking-widest text-gray-400">UPCOMING</p>
            </div>
            <div className="px-4 py-3">
              {(() => {
                const upcoming = events
                  .filter(e => { const d = new Date(e.date); return isCurrentMonth ? d.getDate() >= today : true; })
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                  .slice(0, 6);
                if (!upcoming.length) return (
                  <div className="py-5 text-center">
                    <p className="text-xs text-gray-400">No upcoming events</p>
                  </div>
                );
                return (
                  <div className="space-y-1">
                    {upcoming.map(e => {
                      const type = EVENT_TYPES.find(t => t.id === e.module_id || t.id === e.type);
                      const color = type?.color || e.color || '#3b82f6';
                      const d = new Date(e.date);
                      const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
                      return (
                        <div key={e.id} className="flex items-center gap-3 px-2 py-2.5 rounded-xl transition-all hover:bg-black/[0.02]">
                          <div className="w-8 text-center flex-shrink-0">
                            <p className="text-[9px] font-semibold text-gray-400 uppercase">{dayName}</p>
                            <p className="text-sm font-bold" style={{ color }}>{d.getDate()}</p>
                          </div>
                          <div className="w-px h-7 rounded-full" style={{ background: `${color}50` }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{e.title}</p>
                            <p className="text-[10px] text-gray-400">{type?.name}</p>
                          </div>
                          <RecurrenceBadge recurrence={e.recurrence} />
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {output && <div className="mt-6 animate-fade-up"><div className="flex items-center gap-2 mb-3"><div className={`w-2 h-2 rounded-full ${generating ? 'bg-sky-400 animate-pulse' : 'bg-emerald-400'}`} /><span className="hud-label text-[11px]" style={{ color: generating ? '#38bdf8' : '#4ade80' }}>{generating ? 'GENERATING CALENDAR...' : 'AI SUGGESTIONS'}</span></div><div className="panel rounded-2xl p-4 sm:p-7"><pre className="text-base text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{output}{generating && <span className="inline-block w-1.5 h-4 bg-sky-400 ml-0.5 animate-pulse" />}</pre></div></div>}
      <AIInsightsPanel moduleId="calendar" />
    </div>
  );
}
