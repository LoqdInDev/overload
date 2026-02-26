import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchJSON, postJSON } from '../lib/api';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const pollRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchJSON('/api/automation/notifications?limit=20');
      setNotifications(data.items || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, []);

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
