import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { useTheme } from '../../context/ThemeContext';

const TYPE_CONFIG = {
  suggestion_ready: { icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z', color: '#D4A017', fill: true },
  action_completed: { icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: '#22c55e', fill: false },
  action_failed: { icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z', color: '#ef4444', fill: false },
  rule_triggered: { icon: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z', color: '#8b5cf6', fill: true },
};

export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const { dark } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }

  const bg = dark ? '#1E1C1A' : '#ffffff';
  const border = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';
  const textPrimary = dark ? '#E8E4DE' : '#332F2B';
  const textSecondary = dark ? '#6B6660' : '#94908A';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative p-1.5 rounded-lg transition-colors"
        style={{ color: textSecondary }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full text-[9px] font-bold"
            style={{ background: '#D4A017', color: '#ffffff', animation: 'auto-pulse 2s ease-in-out infinite' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[min(320px,90vw)] rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in"
          style={{ background: bg, border: `1px solid ${border}` }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${border}` }}>
            <span className="text-xs font-bold" style={{ color: textPrimary }}>Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[10px] font-medium" style={{ color: '#D4A017' }}>
                Mark all read
              </button>
            )}
          </div>

          {/* Items */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke={textSecondary} strokeWidth={1.5} viewBox="0 0 24 24" style={{ opacity: 0.5 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                <p className="text-[11px] font-medium" style={{ color: textSecondary }}>No notifications yet</p>
                <p className="text-[10px] mt-0.5" style={{ color: textSecondary, opacity: 0.7 }}>Actions and suggestions will appear here</p>
              </div>
            ) : notifications.map(n => {
              const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.action_completed;
              return (
                <div key={n.id}
                  className="px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors"
                  style={{
                    background: n.read ? 'transparent' : (dark ? 'rgba(212,160,23,0.04)' : 'rgba(212,160,23,0.02)'),
                    borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)'}`,
                  }}
                  onClick={() => { if (!n.read) markRead(n.id); }}>
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5"
                    fill={config.fill ? config.color : 'none'}
                    stroke={config.fill ? 'none' : config.color}
                    strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d={config.icon} />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium" style={{ color: textPrimary }}>{n.title}</p>
                    {n.message && (
                      <p className="text-[10px] mt-0.5 line-clamp-2" style={{ color: textSecondary }}>{n.message}</p>
                    )}
                    <span className="text-[10px] mt-0.5 block" style={{ color: textSecondary }}>{timeAgo(n.created_at)}</span>
                  </div>
                  {!n.read && (
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: '#D4A017' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
