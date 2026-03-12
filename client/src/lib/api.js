export const API_BASE = import.meta.env.VITE_API_URL || '';
export const TOKEN_KEY = 'overload_access_token';
export const REFRESH_KEY = 'overload_refresh_token';
const WORKSPACE_KEY = 'overload_workspace_id';
const REMEMBER_KEY = 'overload_remember';

// Returns the correct storage based on "remember me" preference
export function getTokenStorage() {
  // If user chose "remember me", tokens are in localStorage; otherwise sessionStorage
  // The REMEMBER_KEY flag itself is always in localStorage so we can check it on next visit
  const remember = localStorage.getItem(REMEMBER_KEY);
  return remember === 'false' ? sessionStorage : localStorage;
}

export function setRememberMe(remember) {
  localStorage.setItem(REMEMBER_KEY, remember ? 'true' : 'false');
}

export function saveTokens(accessToken, refreshToken) {
  const store = getTokenStorage();
  store.setItem(TOKEN_KEY, accessToken);
  store.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens() {
  // Clear from both storages to be safe
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
}

export function getAccessToken() {
  return getTokenStorage().getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken() {
  return getTokenStorage().getItem(REFRESH_KEY) || localStorage.getItem(REFRESH_KEY) || sessionStorage.getItem(REFRESH_KEY);
}

function getAuthHeaders() {
  const token = getAccessToken();
  const wsId = localStorage.getItem(WORKSPACE_KEY);
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (wsId) headers['X-Workspace-Id'] = wsId;
  return headers;
}

export async function attemptTokenRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    saveTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export async function fetchJSON(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
  const res = await fetch(fullUrl, {
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...options.headers },
    ...options,
  });

  if (res.status === 401) {
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      const retry = await fetch(fullUrl, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...options.headers },
        ...options,
      });
      if (retry.ok) return retry.json();
    }
    clearTokens();
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText, code: 'UNKNOWN' }));
    const error = new Error(err.error || `HTTP ${res.status}`);
    error.code = err.code;
    error.status = res.status;
    throw error;
  }

  return res.json();
}

export async function postJSON(url, body) {
  return fetchJSON(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function putJSON(url, body) {
  return fetchJSON(url, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function deleteJSON(url) {
  return fetchJSON(url, { method: 'DELETE' });
}

export function connectSSE(url, body, { onChunk, onResult, onError, onDone }) {
  const controller = new AbortController();
  const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;

  fetch(fullUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(body),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (res.status === 401) {
        const refreshed = await attemptTokenRefresh();
        if (refreshed) {
          const retry = await fetch(fullUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify(body),
            signal: controller.signal,
          });
          if (!retry.ok) {
            const msg = await retry.text().catch(() => retry.statusText);
            onError?.(msg || `Server error (${retry.status})`);
            return;
          }
          return processStream(retry.body.getReader(), { onChunk, onResult, onError });
        }
        window.location.href = '/login';
        return;
      }

      if (!res.ok) {
        let msg = `Server error (${res.status})`;
        try { const err = await res.json(); msg = err.error || msg; } catch {}
        onError?.(msg);
        return;
      }

      return processStream(res.body.getReader(), { onChunk, onResult, onError });
    })
    .then(() => onDone?.())
    .catch((err) => {
      if (err.name !== 'AbortError') onError?.(err.message);
    });

  return () => controller.abort();
}

async function processStream(reader, { onChunk, onResult, onError }) {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.type === 'chunk') onChunk?.(data.text);
        else if (data.type === 'result') onResult?.(data.data);
        else if (data.type === 'error') onError?.(data.error);
      } catch {
        // ignore parse errors from partial chunks
      }
    }
  }
}

// Global fetch interceptor: auto-injects auth headers and API_BASE
// for all raw fetch() calls to /api/* endpoints. This ensures modules
// that use raw fetch (instead of fetchJSON/connectSSE) still work.
export function setupAuthInterceptor() {
  const _fetch = window.fetch;
  window.fetch = function (input, init = {}) {
    let url = typeof input === 'string' ? input : input?.url;
    if (!url) return _fetch.call(this, input, init);

    const isRelativeApi = url.startsWith('/api/');
    const isFullApi = API_BASE && url.startsWith(`${API_BASE}/api/`);
    if (!isRelativeApi && !isFullApi) return _fetch.call(this, input, init);

    // Prepend API_BASE for relative /api/ paths
    if (isRelativeApi) url = `${API_BASE}${url}`;

    // Add auth headers for non-auth endpoints
    if (!url.includes('/api/auth/')) {
      const token = getAccessToken();
      const wsId = localStorage.getItem(WORKSPACE_KEY);
      const h = init.headers instanceof Headers
        ? Object.fromEntries(init.headers.entries())
        : { ...(init.headers || {}) };
      if (token && !h.Authorization && !h.authorization) h.Authorization = `Bearer ${token}`;
      if (wsId && !h['X-Workspace-Id']) h['X-Workspace-Id'] = wsId;
      init = { ...init, headers: h };
    }

    return _fetch.call(this, url, init);
  };
}
