import { defineSharedStages } from '../../engine/lifecycle';
import type { Execution, HttpResponse, Scenario, ServerResult } from '../../engine/types';

/**
 * Standalone scenario 7 — "Failure and recovery". The simulated server can
 * fail in several different ways; transient failures recover on a retry,
 * permanent ones do not. The server's condition is configuration, not
 * something the request carries.
 */
export type FailureMode = 'ok' | 'network' | 'timeout' | 'server-error' | 'not-found' | 'invalid-json';

export interface FailureInput {
  mode: FailureMode;
  /** 1 for the first attempt; each retry increments it. */
  attempt: number;
}

export const FAILURE_MODES: { value: FailureMode; label: string; transient: boolean }[] = [
  { value: 'ok', label: 'Server healthy', transient: false },
  { value: 'network', label: 'Connection drops (network error)', transient: true },
  { value: 'timeout', label: 'Server too slow (timeout)', transient: true },
  { value: 'server-error', label: 'Server crashes (HTTP 500)', transient: true },
  { value: 'not-found', label: 'Wrong URL (HTTP 404)', transient: false },
  { value: 'invalid-json', label: 'Broken response body (invalid JSON)', transient: false },
];

export const isTransient = (mode: FailureMode) => FAILURE_MODES.find((option) => option.value === mode)?.transient ?? false;

export interface NotificationItem {
  id: number;
  text: string;
}

const ITEMS: NotificationItem[] = [
  { id: 1, text: 'Welcome back!' },
  { id: 2, text: 'Your report is ready.' },
];

const json = (status: number, statusText: string, rawBody: string): HttpResponse => ({
  status,
  statusText,
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  rawBody,
});

function simulate(_request: unknown, input: FailureInput): ServerResult {
  // Transient failures happen only on the first attempt; the server has recovered by the retry.
  const failing = input.mode !== 'ok' && (!isTransient(input.mode) || input.attempt === 1);
  const mode = failing ? input.mode : 'ok';
  switch (mode) {
    case 'network':
      return { kind: 'network-failure', message: 'The connection dropped before any response arrived. fetch() rejected with TypeError: Failed to fetch.' };
    case 'timeout':
      return { kind: 'timeout', message: 'No response within 5 seconds, so the code aborted the request. fetch() rejected with AbortError.' };
    case 'server-error':
      return { kind: 'response', response: json(500, 'Internal Server Error', JSON.stringify({ error: 'Database temporarily unavailable' })) };
    case 'not-found':
      return { kind: 'response', response: json(404, 'Not Found', JSON.stringify({ error: 'No route matches /api/notifications' })) };
    case 'invalid-json':
      return { kind: 'response', response: json(200, 'OK', '{"items": [{"id": 1, "text": "Welcome back!"') };
    default:
      return { kind: 'response', response: json(200, 'OK', JSON.stringify({ items: ITEMS })) };
  }
}

/** The message the catch block's describe() produces. */
export function failureMessage(execution: Execution): string {
  switch (execution.failure?.kind) {
    case 'timeout':
      return 'The server took too long. Try again.';
    case 'network':
      return 'You appear to be offline. Try again.';
    case 'parse-error':
      return 'The server sent something we could not read.';
    default:
      return `The server reported an error (HTTP ${execution.response?.status}).`;
  }
}

export const failureRecoveryScenario: Scenario<FailureInput> = {
  id: 'failure-recovery',
  track: 'standalone',
  title: 'Failure and recovery',
  description:
    'Load notifications while the server misbehaves. Compare a network error, a timeout, HTTP errors, and invalid JSON — then retry and see which failures recover.',
  defaultInput: { mode: 'ok', attempt: 1 },
  presets: {
    network: { label: 'Network error', input: { mode: 'network', attempt: 1 } },
    timeout: { label: 'Timeout', input: { mode: 'timeout', attempt: 1 } },
    'server-error': { label: 'HTTP 500', input: { mode: 'server-error', attempt: 1 } },
    'not-found': { label: 'HTTP 404', input: { mode: 'not-found', attempt: 1 } },
    'invalid-json': { label: 'Invalid JSON with HTTP 200', input: { mode: 'invalid-json', attempt: 1 } },
    ok: { label: 'Healthy server', input: { mode: 'ok', attempt: 1 } },
  },
  stages: defineSharedStages({
    'user-action': { summary: 'The user clicks “Load notifications” (or “Try again”).' },
    'js-handler': {
      summary: 'The handler starts a 5-second timer and prepares a GET request.',
      explanation:
        'fetch() will wait for a response indefinitely, so the code creates an AbortController and schedules controller.abort() after 5 seconds. Passing controller.signal to fetch() connects the two.',
    },
    'http-request': { summary: 'GET /api/notifications is sent.' },
    'server-receives': { summary: 'The simulated server receives the request.' },
    'server-processing': { summary: 'The simulated server handles it — or fails, depending on its condition.' },
    'http-response': {
      summary: 'A response comes back — or never does.',
      explanation:
        'Two very different things can happen here. Either an HTTP response arrives (with any status, even 404 or 500), or none arrives at all because the connection failed or the code gave up waiting. Only the second makes fetch() reject.',
    },
    'js-handles-response': {
      summary: 'JavaScript checks the status and parses the body.',
      explanation:
        'The code throws its own error for a non-2xx status, and response.json() throws if the body is not valid JSON. Both jump to the catch block — the same place a network error or timeout goes.',
    },
    'dom-update': { summary: 'The notification list is rebuilt from the data.' },
  }),
  buildRequest: () => ({ method: 'GET', url: '/api/notifications', headers: { Accept: 'application/json' }, body: { kind: 'none' } }),
  simulateServer: simulate,
  explainFailure: (execution) => {
    const retry = (execution.failure?.kind === 'network' || execution.failure?.kind === 'timeout' || execution.response?.status === 500)
      ? ' This kind of failure is often temporary, so offering “Try again” makes sense.'
      : ' Retrying will not help: the same request will fail the same way until the code or server is fixed.';
    switch (execution.failure?.kind) {
      case 'network':
        return 'No HTTP response arrived at all, so there is no status code to check. fetch() rejected, and the catch block ran.' + retry;
      case 'timeout':
        return 'The code stopped waiting and aborted the request. fetch() rejected with an AbortError, and the catch block ran.' + retry;
      case 'parse-error':
        return 'The status was 200 OK, but the body is cut off, so response.json() threw a SyntaxError. A success status does not guarantee a usable body.' + retry;
      case 'http-error':
        return `An HTTP ${execution.response?.status} response arrived normally — fetch() did not reject. The code checked response.ok and threw its own error.` + retry;
      default:
        return null;
    }
  },
  describeDomChanges: (execution) => {
    const items = (execution.parsedBody as { items: NotificationItem[] }).items;
    return items.map((item) => `#notifications <li> "${item.text}"`);
  },
};
