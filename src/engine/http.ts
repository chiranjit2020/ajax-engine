import type { HttpRequest, HttpResponse, RequestBody } from './types';

/** Placeholder origin for simulated URLs. `.test` is reserved and never resolves on the internet. */
export const SIMULATED_ORIGIN = 'https://ajax-lab.test';

export function splitUrl(url: string): { path: string; query: [string, string][] } {
  const parsed = new URL(url, SIMULATED_ORIGIN);
  return { path: parsed.pathname, query: [...parsed.searchParams.entries()] };
}

export function headerValue(headers: Record<string, string>, name: string): string | undefined {
  const lower = name.toLowerCase();
  return Object.entries(headers).find(([key]) => key.toLowerCase() === lower)?.[1];
}

export const BODY_CONTENT_TYPES: Record<RequestBody['kind'], string | null> = {
  none: null,
  json: 'application/json',
  'form-urlencoded': 'application/x-www-form-urlencoded',
  multipart: 'multipart/form-data',
};

/** The body as it would travel on the wire (multipart shown in simplified form). */
export function serializeBody(body: RequestBody): string | null {
  switch (body.kind) {
    case 'none':
      return null;
    case 'json':
      return JSON.stringify(body.value);
    case 'form-urlencoded':
      return new URLSearchParams(body.fields).toString();
    case 'multipart':
      return Object.entries(body.fields)
        .map(([name, value]) => `--boundary\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}`)
        .concat('--boundary--')
        .join('\r\n');
  }
}

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function responseContentType(response: HttpResponse): string {
  const type = headerValue(response.headers, 'content-type')?.split(';')[0]?.trim();
  return type ?? (response.rawBody === '' ? 'no body' : 'unknown');
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/** An illustrative cURL command. The simulated host does not exist, so this is for reading, not running. */
export function toCurl(request: HttpRequest, origin = SIMULATED_ORIGIN): string {
  const method = request.method === 'GET' ? '' : ` -X ${request.method}`;
  // The first element keeps "curl", the method, and the URL on one line; each option gets its own line.
  const parts = [`curl${method} ${shellQuote(new URL(request.url, origin).toString())}`];
  for (const [name, value] of Object.entries(request.headers)) parts.push(`-H ${shellQuote(`${name}: ${value}`)}`);
  const contentType = BODY_CONTENT_TYPES[request.body.kind];
  if (request.body.kind === 'multipart') {
    for (const [name, value] of Object.entries(request.body.fields)) parts.push(`-F ${shellQuote(`${name}=${value}`)}`);
  } else {
    const body = serializeBody(request.body);
    if (body !== null) {
      if (contentType && !headerValue(request.headers, 'content-type')) parts.push(`-H ${shellQuote(`Content-Type: ${contentType}`)}`);
      parts.push(`--data ${shellQuote(body)}`);
    }
  }
  return parts.join(' \\\n  ');
}

/** The request as HTTP/1.1 text, for teaching. Real browsers add more headers than shown. */
export function formatRawRequest(request: HttpRequest, origin = SIMULATED_ORIGIN): string {
  const target = new URL(request.url, origin);
  const lines = [`${request.method} ${target.pathname}${target.search} HTTP/1.1`, `Host: ${target.host}`];
  for (const [name, value] of Object.entries(request.headers)) lines.push(`${name}: ${value}`);
  const contentType = BODY_CONTENT_TYPES[request.body.kind];
  if (contentType && !headerValue(request.headers, 'content-type')) lines.push(`Content-Type: ${contentType}`);
  const body = serializeBody(request.body);
  return body === null ? lines.join('\n') : `${lines.join('\n')}\n\n${body}`;
}

export function formatRawResponse(response: HttpResponse): string {
  const lines = [`HTTP/1.1 ${response.status} ${response.statusText}`];
  for (const [name, value] of Object.entries(response.headers)) lines.push(`${name}: ${value}`);
  return `${lines.join('\n')}\n\n${response.rawBody}`;
}
