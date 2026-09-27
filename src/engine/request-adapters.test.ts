import { performRealRequest, validateTarget } from './request-adapters';
import type { HttpRequest } from './types';

const get: HttpRequest = { method: 'GET', url: '/api/profile?id=7', headers: { Accept: 'application/json' }, body: { kind: 'none' } };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('validateTarget', () => {
  it('accepts only an explicit http(s) origin', () => {
    expect(validateTarget('http://localhost:8080')).toEqual({ ok: true, origin: 'http://localhost:8080' });
    expect(validateTarget(' https://api.example.test ')).toEqual({ ok: true, origin: 'https://api.example.test' });
    expect(validateTarget('')).toMatchObject({ ok: false });
    expect(validateTarget('localhost:8080')).toEqual({ ok: false, reason: 'Include the scheme, for example http://localhost:8080.' });
    expect(validateTarget('ftp://example.test')).toMatchObject({ ok: false, reason: 'Only http:// and https:// are allowed.' });
    expect(validateTarget('https://user:pw@example.test')).toMatchObject({ ok: false });
    expect(validateTarget('https://example.test/api')).toMatchObject({ ok: false });
  });
});

describe('performRealRequest', () => {
  it('sends the scenario request to the configured origin without credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"name":"Real"}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await performRealRequest(get, 'http://localhost:8080');
    expect(String(fetchMock.mock.calls[0]![0])).toBe('http://localhost:8080/api/profile?id=7');
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ method: 'GET', credentials: 'omit' });
    expect(result).toMatchObject({ kind: 'response', response: { status: 200, rawBody: '{"name":"Real"}' } });
  });

  it('reports a rejected fetch as a network failure that mentions CORS', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const result = await performRealRequest(get, 'http://localhost:8080');
    expect(result.kind).toBe('network-failure');
    expect(result.kind === 'network-failure' && result.message).toMatch(/CORS/);
  });

  it('aborts after the timeout', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: URL, init: RequestInit) => new Promise((_, reject) => init.signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))))),
    );
    const result = await performRealRequest(get, 'http://localhost:8080', 50);
    expect(result.kind).toBe('timeout');
  });
});
