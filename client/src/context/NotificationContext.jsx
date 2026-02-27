import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchJSON, postJSON } from '../lib/api';
import { useToast } from './ToastContext';

const FALLBACK_NOTIFICATIONS = [
  { id: 1, type: 'suggestion_ready', title: 'New blog post draft ready', message: '7 Email Subject Line Formulas — AI generated with 89% confidence', module_id: 'content', read: false, created_at: new Date(Date.now() - 1800000).toISOString() },
  { id: 2, type: 'action_completed', title: 'Instagram post published', message: 'Spring Collection carousel posted to @brand', module_id: 'social', read: false, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 3, type: 'rule_triggered', title: 'ROAS budget rule fired', message: 'Meta Ads budget increased 15% — ROAS exceeded 4.2x threshold', module_id: 'ads', read: false, created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 4, type: 'action_completed', title: 'Weekly SEO audit complete', message: '3 new keyword opportunities found, 2 meta tags updated', module_id: 'seo', read: true, created_at: new Date(Date.now() - 14400000).toISOString() },
  { id: 5, type: 'suggestion_ready', title: 'Email campaign ready for review', message: 'Welcome series — 3 emails drafted with A/B subject lines', module_id: 'email-sms', read: true, created_at: new Date(Date.now() - 28800000).toISOString() },
  { id: 6, type: 'action_failed', title: 'Review response failed', message: 'Could not post response to Google review — API rate limit', module_id: 'reviews', read: true, created_at: new Date(Date.now() - 43200000).toISOString() },
];

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const pollRef = useRef(null);
  const prevIdsRef = useRef(new Set());
  const initialLoadRef = useRef(true);
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    try {
      const data = await fetchJSON('/api/automation/notifications?limit=20');
      const items = data.items || [];
      setNotifications(items);
      setUnreadCount(data.unreadCount || 0);

      // Toast for new unread notifications (skip initial load)
      if (!initialLoadRef.current && items.length > 0) {
        const newItems = items.filter(n => !n.read && !prevIdsRef.current.has(n.id));
        for (const n of newItems.slice(0, 3)) {
          toast.info(n.title, n.message);
        }
      }
      initialLoadRef.current = false;
      prevIdsRef.current = new Set(items.map(n => n.id));
    } catch {
      if (initialLoadRef.current) {
        setNotifications(FALLBACK_NOTIFICATIONS);
        setUnreadCount(FALLBACK_NOTIFICATIONS.filter(n => !n.read).length);
        prevIdsRef.current = new Set(FALLBACK_NOTIFICATIONS.map(n => n.id));
        initialLoadRef.current = false;
      }
    }
  }, [toast]);

  useEffect(() => {
    refresh();
    pollRef.current = setInterval(refresh, 30000);
    return () => clearInterval(pollRef.current);
  }, [refresh]);

  const markRead = useCallback(async (id) => {
    try {
      await postJSON(`/api/automation/notifications/${id}/read`, {});
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await postJSON('/api/automation/notifications/read-all', {});
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) return { notifications: [], unreadCount: 0, markRead: async () => {}, markAllRead: async () => {}, refresh: async () => {} };
  return ctx;
}
