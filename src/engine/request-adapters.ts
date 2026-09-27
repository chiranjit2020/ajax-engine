import { BODY_CONTENT_TYPES, headerValue, serializeBody } from './http';
import type { HttpRequest, ServerResult } from './types';

/**
 * Real Request mode (spec §13.2): send a scenario's request to a server the
 * learner configured explicitly. Opt-in only; the simulation never calls this.
 */

export type TargetCheck = { ok: true; origin: string } | { ok: false; reason: string };

/** Only an explicit http(s) origin is accepted — no default target, no paths, no credentials in the URL. */
export function validateTarget(value: string): TargetCheck {
  if (value.trim() && !/^[a-z][a-z0-9+.-]*:\/\//i.test(value.trim())) {
    return { ok: false, reason: 'Include the scheme, for example http://localhost:8080.' };
  }
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return { ok: false, reason: 'Enter a full origin, such as http://localhost:8080.' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { ok: false, reason: 'Only http:// and https:// are allowed.' };
  if (url.username || url.password) return { ok: false, reason: 'Do not put credentials in the URL.' };
  if (url.pathname !== '/' || url.search || url.hash) return { ok: false, reason: 'Enter only the origin; the scenario supplies the path.' };
  return { ok: true, origin: url.origin };
}

export const REAL_SERVER_NOTE =
  'Real server: what happens inside it is not visible from the browser. Only the response it sends back can be inspected.';

export async function performRealRequest(request: HttpRequest, origin: string, timeoutMs = 10_000): Promise<ServerResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = new Headers(request.headers);
  const contentType = BODY_CONTENT_TYPES[request.body.kind];
  if (contentType && request.body.kind !== 'multipart' && !headerValue(request.headers, 'content-type')) headers.set('Content-Type', contentType);
  const trace = { notes: { 'server-receives': { tone: 'info' as const, text: REAL_SERVER_NOTE }, 'server-processing': { tone: 'info' as const, text: REAL_SERVER_NOTE } } };

  try {
    const response = await fetch(new URL(request.url, origin), {
      method: request.method,
      headers,
      body: serializeBody(request.body) ?? undefined,
      signal: controller.signal,
      credentials: 'omit',
    });
    const responseHeaders: Record<string, string> = {};
    // Only headers the server exposes through CORS are readable here.
    response.headers.forEach((value, name) => {
      responseHeaders[name] = value;
    });
    return {
      kind: 'response',
      response: { status: response.status, statusText: response.statusText, headers: responseHeaders, rawBody: await response.text() },
      trace,
    };
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return { kind: 'timeout', message: `No response within ${timeoutMs / 1000} seconds, so the request was aborted.`, trace };
    }
    return {
      kind: 'network-failure',
      message:
        'fetch() rejected: no readable response. The server may be unreachable, or it may not allow requests from this page’s origin (CORS). The browser console shows the exact reason.',
      trace,
    };
  } finally {
    clearTimeout(timer);
  }
}
