import { formatRawRequest, formatRawResponse, serializeBody, splitUrl, toCurl } from './http';
import type { HttpRequest } from './types';

const get: HttpRequest = { method: 'GET', url: '/api/profile?id=7', headers: { Accept: 'application/json' }, body: { kind: 'none' } };
const post: HttpRequest = {
  method: 'POST',
  url: '/api/register',
  headers: {},
  body: { kind: 'form-urlencoded', fields: { name: "O'Brien", email: 'a@b.test' } },
};

describe('http helpers', () => {
  it('splits a URL into path and query parameters', () => {
    expect(splitUrl('/api/profile?id=7&x=a%20b')).toEqual({ path: '/api/profile', query: [['id', '7'], ['x', 'a b']] });
  });

  it('serializes each body kind', () => {
    expect(serializeBody({ kind: 'none' })).toBeNull();
    expect(serializeBody({ kind: 'json', value: { a: 1 } })).toBe('{"a":1}');
    expect(serializeBody(post.body)).toBe('name=O%27Brien&email=a%40b.test');
  });

  it('builds an illustrative cURL command against the placeholder host', () => {
    expect(toCurl(get)).toBe("curl 'https://ajax-lab.test/api/profile?id=7' \\\n  -H 'Accept: application/json'");
    const curl = toCurl(post);
    expect(curl).toContain('-X POST');
    expect(curl).toContain("-H 'Content-Type: application/x-www-form-urlencoded'");
    expect(curl).toContain("--data 'name=O%27Brien&email=a%40b.test'");
  });

  it('formats raw HTTP text', () => {
    expect(formatRawRequest(get)).toBe('GET /api/profile?id=7 HTTP/1.1\nHost: ajax-lab.test\nAccept: application/json');
    expect(formatRawRequest(post)).toContain('\n\nname=O%27Brien');
    expect(formatRawResponse({ status: 404, statusText: 'Not Found', headers: { 'Content-Type': 'application/json' }, rawBody: '{}' })).toBe(
      'HTTP/1.1 404 Not Found\nContent-Type: application/json\n\n{}',
    );
  });
});
