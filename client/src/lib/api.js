const TOKEN_KEY = 'overload_access_token';
const REFRESH_KEY = 'overload_refresh_token';

function getAuthHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function attemptTokenRefresh() {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return false;

  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.accessToken);
    localStorage.setItem(REFRESH_KEY, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...options.headers },
    ...options,
  });

  if (res.status === 401) {
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      const retry = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...options.headers },
        ...options,
      });
      if (retry.ok) return retry.json();
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
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

export function connectSSE(url, body, { onChunk, onResult, onError }) {
  const controller = new AbortController();

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(body),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (res.status === 401) {
        const refreshed = await attemptTokenRefresh();
        if (refreshed) {
          // Retry the SSE connection
          const retry = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify(body),
            signal: controller.signal,
          });
          return processStream(retry.body.getReader(), { onChunk, onResult, onError });
        }
        window.location.href = '/login';
        return;
      }

      return processStream(res.body.getReader(), { onChunk, onResult, onError });
    })
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
