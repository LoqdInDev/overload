import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchJSON, postJSON, connectSSE } from './api';

// Mock localStorage
const storage = {};
const localStorageMock = {
  getItem: vi.fn((key) => storage[key] || null),
  setItem: vi.fn((key, val) => { storage[key] = val; }),
  removeItem: vi.fn((key) => { delete storage[key]; }),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock window and window.location
globalThis.window = globalThis.window || {};
globalThis.window.location = { href: '' };
delete globalThis.location;
globalThis.location = globalThis.window.location;

beforeEach(() => {
  vi.restoreAllMocks();
  Object.keys(storage).forEach(k => delete storage[k]);
  globalThis.location.href = '';
});

describe('fetchJSON', () => {
  it('makes GET request with auth headers', async () => {
    storage.overload_access_token = 'test-token';
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: 'ok' }),
    });

    const result = await fetchJSON('/api/test');
    expect(result).toEqual({ data: 'ok' });
    expect(fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
    }));
  });

  it('works without auth token', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([1, 2, 3]),
    });

    const result = await fetchJSON('/api/items');
    expect(result).toEqual([1, 2, 3]);
    expect(fetch).toHaveBeenCalledWith('/api/items', expect.objectContaining({
      headers: expect.not.objectContaining({ Authorization: expect.any(String) }),
    }));
  });

  it('throws on HTTP errors', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: () => Promise.resolve({ error: 'Not found', code: 'NOT_FOUND' }),
    });

    await expect(fetchJSON('/api/missing')).rejects.toThrow('Not found');
  });

  it('redirects to login on 401 without refresh token', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Unauthorized' }),
    });

    await expect(fetchJSON('/api/protected')).rejects.toThrow('Session expired');
    expect(globalThis.location.href).toBe('/login');
  });
});

describe('postJSON', () => {
  it('sends POST with JSON body', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ id: 1 }),
    });

    const result = await postJSON('/api/items', { name: 'Test' });
    expect(result).toEqual({ id: 1 });
    expect(fetch).toHaveBeenCalledWith('/api/items', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
    }));
  });
});

describe('connectSSE', () => {
  it('returns a cancel function', () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: { getReader: () => ({ read: () => Promise.resolve({ done: true }) }) },
    });

    const cancel = connectSSE('/api/gen', { prompt: 'hi' }, {
      onChunk: vi.fn(),
      onResult: vi.fn(),
      onError: vi.fn(),
    });

    expect(typeof cancel).toBe('function');
  });
});
