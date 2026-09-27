import type { StageDefinition, StageId } from './types';

/**
 * The shared eight-stage AJAX lifecycle (spec §5.2). Scenarios start from these
 * definitions and override the text that is specific to their request.
 */
export const SHARED_STAGE_IDS = [
  'user-action',
  'js-handler',
  'http-request',
  'server-receives',
  'server-processing',
  'http-response',
  'js-handles-response',
  'dom-update',
] as const satisfies readonly StageId[];

export type SharedStageId = (typeof SHARED_STAGE_IDS)[number];

const SHARED_STAGES: Record<SharedStageId, StageDefinition> = {
  'user-action': {
    id: 'user-action',
    title: 'User action',
    actor: 'browser',
    lane: 'client',
    visualState: 'idle',
    summary: 'Something happens in the page, such as a button click.',
    explanation:
      'The browser notices an event — a click, a form submission, or typing in a search box. Nothing has been sent anywhere yet. The page is still fully usable.',
    durationMs: 700,
  },
  'js-handler': {
    id: 'js-handler',
    title: 'JavaScript handler',
    actor: 'javascript',
    lane: 'client',
    visualState: 'request-created',
    summary: 'JavaScript collects data and creates a request.',
    explanation:
      'An event listener runs. It gathers whatever data the request needs and describes the request: the method, the URL, headers, and any body. Then it hands the request to a browser API such as fetch() or XMLHttpRequest.',
    durationMs: 900,
  },
  'http-request': {
    id: 'http-request',
    title: 'HTTP request',
    actor: 'network',
    lane: 'network',
    visualState: 'request-sent',
    summary: 'The request travels from the browser to the server.',
    explanation:
      'The browser sends an HTTP request over the network. It carries a method, a URL, headers (including cookies for the same site), and optionally a body. JavaScript does not wait here — the page keeps running while the request is in flight.',
    durationMs: 1100,
  },
  'server-receives': {
    id: 'server-receives',
    title: 'Server receives request',
    actor: 'web-server',
    lane: 'server',
    visualState: 'server-processing',
    summary: 'The web server accepts the request and hands it to backend code.',
    explanation:
      'A web server such as Apache or Nginx receives the request and passes it to the program responsible for that URL — for example a PHP script.',
    durationMs: 800,
  },
  'server-processing': {
    id: 'server-processing',
    title: 'Server-side processing',
    actor: 'php',
    lane: 'server',
    visualState: 'server-processing',
    summary: 'Backend code validates input and prepares a response.',
    explanation:
      'The backend reads the request, checks that the input is valid, runs its logic (perhaps reading a database), and decides what to send back.',
    durationMs: 1200,
  },
  'http-response': {
    id: 'http-response',
    title: 'HTTP response',
    actor: 'network',
    lane: 'network',
    visualState: 'response-received',
    summary: 'A status code, headers, and a body travel back to the browser.',
    explanation:
      'The server replies with an HTTP status code (such as 200 or 404), response headers, and a body — often JSON text. At this point the body is still just text.',
    durationMs: 1100,
  },
  'js-handles-response': {
    id: 'js-handles-response',
    title: 'JavaScript handles response',
    actor: 'javascript',
    lane: 'client',
    visualState: 'response-parsed',
    summary: 'JavaScript checks the status and parses the body.',
    explanation:
      'The code that started the request runs again. It checks whether the response was successful, parses the body (for example with response.json()), and decides what to show.',
    durationMs: 900,
  },
  'dom-update': {
    id: 'dom-update',
    title: 'DOM update',
    actor: 'dom',
    lane: 'client',
    visualState: 'dom-updated',
    summary: 'Only the relevant part of the page changes.',
    explanation:
      'JavaScript updates the part of the page that needs new content. The rest of the page — scroll position, other inputs, playing media — is untouched, because the browser never navigated away.',
    durationMs: 700,
  },
};

export type StageOverrides = Partial<
  Record<SharedStageId, Partial<Omit<StageDefinition, 'id' | 'visualState' | 'lane'>>>
>;

/** Build a scenario's stage list from the shared lifecycle, applying scenario-specific text. */
export function defineSharedStages(overrides: StageOverrides = {}): StageDefinition[] {
  return SHARED_STAGE_IDS.map((id) => ({ ...SHARED_STAGES[id], ...overrides[id] }));
}
