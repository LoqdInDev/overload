import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { trackEvent } from '../lib/analytics';
import {
  API_BASE as _API_BASE,
  getAccessToken, getRefreshToken, saveTokens, clearTokens,
  setRememberMe, attemptTokenRefresh,
} from '../lib/api';

const API_BASE = _API_BASE || '';

const AuthContext = createContext({
  user: null,
  loading: true,
  isAuthenticated: false,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, verify existing token — try refresh if expired
  useEffect(() => {
    async function verifySession() {
      const token = getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          // Access token expired — try refresh
          const refreshed = await attemptTokenRefresh();
          if (refreshed) {
            const newToken = getAccessToken();
            const retry = await fetch(`${API_BASE}/api/auth/me`, {
              headers: { Authorization: `Bearer ${newToken}` },
            });
            if (retry.ok) {
              const data = await retry.json();
              setUser(data.user);
            } else {
              clearTokens();
            }
          } else {
            clearTokens();
          }
        }
      } catch {
        clearTokens();
      } finally {
        setLoading(false);
      }
    }
    verifySession();
  }, []);

  const login = useCallback(async (email, password, rememberMe = true) => {
    setRememberMe(rememberMe);
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    saveTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    return data.user;
  }, []);

  const signup = useCallback(async (email, password, displayName) => {
    setRememberMe(true); // Always remember on signup
    const res = await fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Signup failed');

    saveTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    trackEvent('signup_completed', { userId: data.user.id });
    return data.user;
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    setRememberMe(true); // Always remember for Google sign-in
    const res = await fetch(`${API_BASE}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Google sign-in failed');

    saveTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    trackEvent('google_login_completed', { userId: data.user.id });
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // ignore logout errors
    }
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, login, signup, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
