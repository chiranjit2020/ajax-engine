import { headerValue } from '../../../engine/http';
import type { HttpRequest, HttpResponse, ServerResult, ServerTrace, StageDefinition, StageId, StageNote } from '../../../engine/types';
import { dispatch, phpString, type HookRegistration } from '../../../engine/wordpress';

/**
 * Shared simulation of a WordPress admin-ajax.php request: simulated users and
 * login cookies, nonces, wp_die()/wp_send_json() responses, and the dispatch
 * steps that run before any plugin callback. Scenarios supply the callback.
 */

// --- Simulated users -------------------------------------------------------

export type SimUser = 'administrator' | 'subscriber' | 'visitor';

interface UserRecord {
  login: string;
  role: string;
  capabilities: string[];
}

/** Server-side user table. `visitor` has no account. */
const USERS: Record<Exclude<SimUser, 'visitor'>, UserRecord> = {
  administrator: { login: 'admin', role: 'Administrator', capabilities: ['view_student_records', 'manage_options', 'read'] },
  subscriber: { login: 'student', role: 'Subscriber', capabilities: ['read'] },
};

export const USER_OPTIONS: { value: SimUser; label: string }[] = [
  { value: 'administrator', label: 'Administrator' },
  { value: 'subscriber', label: 'Subscriber' },
  { value: 'visitor', label: 'Logged-out visitor' },
];

export const isLoggedIn = (user: SimUser) => user !== 'visitor';

/** Simulated login cookie. A real one is HttpOnly, signed, and set by wp-login.php. */
export function loginCookie(user: SimUser): string | null {
  return user === 'visitor' ? null : `wordpress_logged_in_ajaxlab=${USERS[user].login}%7Csimulated`;
}

/** The server identifies the user only from the cookie on the request. */
function userFromRequest(request: HttpRequest): SimUser {
  const cookie = headerValue(request.headers, 'cookie') ?? '';
  const login = /wordpress_logged_in_\w+=([^%;]+)/.exec(cookie)?.[1];
  const match = (Object.keys(USERS) as (keyof typeof USERS)[]).find((key) => USERS[key].login === login);
  return match ?? 'visitor';
}

export function userCan(user: SimUser, capability: string): boolean {
  return user !== 'visitor' && USERS[user].capabilities.includes(capability);
}

export function describeUser(user: SimUser): string {
  return user === 'visitor' ? 'a logged-out visitor' : `${USERS[user].login} (${USERS[user].role})`;
}

// --- Nonces ----------------------------------------------------------------

export type NonceState = 'valid' | 'missing' | 'invalid' | 'expired';

export const NONCE_OPTIONS: { value: NonceState; label: string }[] = [
  { value: 'valid', label: 'Valid nonce' },
  { value: 'missing', label: 'Missing nonce' },
  { value: 'invalid', label: 'Invalid (forged) nonce' },
  { value: 'expired', label: 'Expired nonce' },
];

/** Nonces are tied to the user (and session), so the valid value differs per user. */
const VALID_NONCE: Record<SimUser, string> = { administrator: 'b7c1e94a2f', subscriber: 'c2d9f18e04', visitor: '4d0e8a61c3' };
const OTHER_NONCES = { invalid: 'aaaaaaaaaa', expired: '9a3f07d2e1' } as const;

/** The nonce field value the page would send, or undefined when it is missing. */
export function nonceValue(state: NonceState, user: SimUser): string | undefined {
  if (state === 'missing') return undefined;
  return state === 'valid' ? VALID_NONCE[user] : OTHER_NONCES[state];
}

// --- Requests and responses ------------------------------------------------

export const AJAX_URL = '/wp-admin/admin-ajax.php';

/** A jQuery.ajax() POST with form fields, as sent by the browser (the cookie is added by the browser, not by JavaScript). */
export function wpAjaxRequest(user: SimUser, fields: Record<string, string>): HttpRequest {
  const cookie = loginCookie(user);
  return {
    method: 'POST',
    url: AJAX_URL,
    headers: {
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: { kind: 'form-urlencoded', fields },
  };
}

const WP_HEADERS = {
  'X-Robots-Tag': 'noindex',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-cache, must-revalidate, max-age=0',
};
const STATUS_TEXT: Record<number, string> = { 200: 'OK', 400: 'Bad Request', 403: 'Forbidden', 404: 'Not Found', 500: 'Internal Server Error' };

/** wp_die() in an AJAX request: a plain-text body with the given status. */
export function wpDie(body: string, status: number): HttpResponse {
  return { status, statusText: STATUS_TEXT[status] ?? '', headers: { 'Content-Type': 'text/html; charset=UTF-8', ...WP_HEADERS }, rawBody: body };
}

/** wp_send_json_success() / wp_send_json_error(). */
export function wpJson(success: boolean, data: unknown, status: number): HttpResponse {
  return {
    status,
    statusText: STATUS_TEXT[status] ?? '',
    headers: { 'Content-Type': 'application/json; charset=UTF-8', ...WP_HEADERS },
    rawBody: JSON.stringify({ success, data }),
  };
}

export function note(tone: StageNote['tone'], text: string): StageNote {
  return { tone, text };
}

// --- Stages ----------------------------------------------------------------

const BASE_STAGES: StageDefinition[] = [
  {
    id: 'wp-user-action',
    title: 'Button click',
    actor: 'browser',
    lane: 'client',
    visualState: 'idle',
    summary: 'The visitor clicks “Load student”.',
    explanation: 'The browser fires a click event. A jQuery handler attached when the page loaded is waiting for it. No request exists yet.',
    durationMs: 700,
  },
  {
    id: 'wp-js-request',
    title: 'jQuery sends action + nonce',
    actor: 'javascript',
    lane: 'client',
    visualState: 'request-sent',
    summary: 'jQuery POSTs action, nonce, and student_id to admin-ajax.php.',
    explanation:
      'jQuery.ajax() sends a POST request with form fields: action says which WordPress action to run, nonce helps prove the request came from a page this site generated, and student_id is the data. The URL and nonce were printed into the page earlier by wp_localize_script(). If the visitor is logged in, the browser attaches the WordPress login cookie automatically — JavaScript does not add it.',
    durationMs: 1200,
  },
  {
    id: 'wp-admin-ajax',
    title: 'admin-ajax.php receives it',
    actor: 'wordpress',
    lane: 'server',
    visualState: 'server-processing',
    summary: 'WordPress’s AJAX entry point boots WordPress and checks for an action.',
    explanation:
      "admin-ajax.php is a PHP file that ships with WordPress: the entry point for AJAX requests. It is not AJAX itself — AJAX is the browser technique that sent the request. It loads all of WordPress (plugins, theme, and the current user from the login cookie), marks the request as AJAX, and stops with wp_die( '0', 400 ) if no action was sent.",
    durationMs: 1000,
  },
  {
    id: 'wp-hook-dispatch',
    title: 'Hook name from action',
    actor: 'wordpress',
    lane: 'server',
    visualState: 'server-processing',
    summary: 'The action value is appended to a hook prefix.',
    explanation:
      'WordPress does not call a function named after the action. It builds a hook name by appending the action to a prefix: "wp_ajax_" + "get_student_details" = "wp_ajax_get_student_details". Which prefix it uses depends on whether the visitor is logged in.',
    durationMs: 1000,
  },
  {
    id: 'wp-auth-branch',
    title: 'Logged in or logged out?',
    actor: 'wordpress',
    lane: 'server',
    visualState: 'server-processing',
    summary: 'is_user_logged_in() picks wp_ajax_ or wp_ajax_nopriv_.',
    explanation:
      "Logged-in visitors trigger wp_ajax_{action}; logged-out visitors trigger wp_ajax_nopriv_{action}. They are separate hooks: a handler registered only on wp_ajax_ never runs for logged-out visitors. If nothing is registered on the chosen hook, admin-ajax.php ends the request with wp_die( '0', 400 ).",
    durationMs: 1200,
  },
  {
    id: 'wp-callback',
    title: 'PHP callback runs',
    actor: 'php',
    lane: 'server',
    visualState: 'server-processing',
    summary: 'The registered function verifies the nonce, validates input, and prepares data.',
    explanation:
      'do_action() calls the function registered with add_action(). A safe callback verifies the nonce (check_ajax_referer), validates and sanitizes input, checks permissions when the data is private, and only then does its work.',
    durationMs: 1200,
  },
  {
    id: 'wp-response',
    title: 'Response sent (wp_send_json)',
    actor: 'php',
    lane: 'network',
    visualState: 'response-received',
    summary: 'A status code, headers, and body travel back to the browser.',
    explanation:
      'wp_send_json_success() and wp_send_json_error() print a JSON body shaped like {"success": true|false, "data": …}, set the status code, and end the request with wp_die(). If WordPress stopped earlier, the response is whatever wp_die() produced instead.',
    durationMs: 1100,
  },
  {
    id: 'wp-dom-update',
    title: 'JavaScript updates the DOM',
    actor: 'javascript',
    lane: 'client',
    visualState: 'dom-updated',
    summary: 'jQuery calls success or error, and #student-result is updated.',
    explanation:
      "With dataType: 'json', jQuery parses the body and calls success() for a 2xx status, or error() for a 4xx/5xx status or unparseable body. The success callback still checks response.success, then writes into #student-result with .text(). The page never reloads.",
    durationMs: 800,
  },
];

export function wordpressStages(overrides: Partial<Record<StageId, Partial<Omit<StageDefinition, 'id'>>>> = {}): StageDefinition[] {
  return BASE_STAGES.map((stage) => ({ ...stage, ...overrides[stage.id] }));
}

// --- admin-ajax.php --------------------------------------------------------

export interface CallbackContext {
  fields: Record<string, string>;
  user: SimUser;
  loggedIn: boolean;
  notes: Record<StageId, StageNote>;
  /** Finish the request with a response. Adds status and outcome tags. */
  respond(response: HttpResponse, trace: Omit<ServerTrace, 'notes' | 'tags'>, extraTags: string[]): ServerResult;
  tags: string[];
}

/**
 * The part of admin-ajax.php that runs before any plugin code: boot, read the
 * action, choose the hook by login state, and fire it. Returns either a
 * finished response (WordPress stopped) or a context for the callback.
 */
export function runAdminAjax(request: HttpRequest, registrations: HookRegistration[]): { result: ServerResult } | { context: CallbackContext } {
  const fields = request.body.kind === 'form-urlencoded' ? request.body.fields : {};
  const action = fields.action ?? '';
  const user = userFromRequest(request);
  const loggedIn = isLoggedIn(user);
  const notes: Record<StageId, StageNote> = {};
  const tags: string[] = [loggedIn ? 'logged-in' : 'logged-out', `user-${user}`];
  const respond: CallbackContext['respond'] = (response, trace, extraTags) => {
    if (response.status >= 200 && response.status < 300) extraTags.push('status-2xx');
    notes['wp-response'] ??= note(response.status < 400 ? 'success' : 'danger', `HTTP ${response.status} ${response.statusText} · body: ${response.rawBody}`);
    return { kind: 'response', response, trace: { ...trace, notes, tags: [...tags, ...extraTags] } };
  };

  notes['wp-admin-ajax'] = note('info', `WordPress loaded; current user: ${describeUser(user)}. $_REQUEST['action'] = ${phpString(action)}.`);
  if (!action.trim()) {
    notes['wp-admin-ajax'] = note('danger', "No action was sent, so admin-ajax.php stopped with wp_die( '0', 400 ).");
    notes['wp-response'] = note('danger', 'Body "0" with HTTP 400, produced by wp_die() in admin-ajax.php — no plugin code ran.');
    return {
      result: respond(wpDie('0', 400), { haltAt: 'wp-admin-ajax', skipped: ['wp-hook-dispatch', 'wp-auth-branch', 'wp-callback'] }, ['no-action']),
    };
  }

  const result = dispatch(registrations, action, loggedIn);
  notes['wp-hook-dispatch'] = note('info', `Candidate hooks for "${action}": wp_ajax_${action} (logged in) · wp_ajax_nopriv_${action} (logged out).`);

  const auth = loggedIn ? 'is_user_logged_in() is true (login cookie present)' : 'is_user_logged_in() is false (no login cookie)';
  const runs = result.matches[0];
  if (!runs) {
    const hint = result.otherHookRegistered
      ? ` A handler is registered on ${result.otherHookName}, but that hook is only used for ${loggedIn ? 'logged-out' : 'logged-in'} visitors.`
      : '';
    notes['wp-auth-branch'] = note('danger', `${auth} → has_action( '${result.hookName}' ) is false → wp_die( '0', 400 ).${hint}`);
    notes['wp-response'] = note('danger', 'Body "0" with HTTP 400, produced by wp_die() in admin-ajax.php — the plugin callback never ran.');
    return {
      result: respond(wpDie('0', 400), { haltAt: 'wp-auth-branch', skipped: ['wp-callback'] }, [
        'no-hook',
        `${loggedIn ? 'logged-in' : 'logged-out'}-no-hook`,
      ]),
    };
  }

  const others = result.matches.length - 1;
  notes['wp-auth-branch'] = note(
    'success',
    `${auth} → do_action( '${result.hookName}' ) → ${runs.callback}()${
      others > 0 ? `. ${others} more callback(s) on this hook would run next, but this one ends the request first.` : '.'
    }`,
  );
  tags.push(`${loggedIn ? 'logged-in' : 'logged-out'}-hook`, `hook-${runs.id}`);
  return { context: { fields, user, loggedIn, notes, tags, respond } };
}

/** check_ajax_referer( 'ajax_lab_nonce', 'nonce' ): returns a finished 403 response when it fails, otherwise null. */
export function checkAjaxReferer(context: CallbackContext): ServerResult | null {
  const sent = context.fields.nonce;
  if (sent !== undefined && sent === nonceValue('valid', context.user)) {
    context.tags.push('nonce-ok');
    return null;
  }
  const reason = sent === undefined ? 'no nonce was sent' : `nonce ${phpString(sent)} is not valid for this user and action`;
  context.notes['wp-callback'] = note(
    'danger',
    `check_ajax_referer( 'ajax_lab_nonce', 'nonce' ) failed: ${reason}. It called wp_die( -1, 403 ); nothing after it ran.`,
  );
  context.notes['wp-response'] = note('danger', 'Body "-1" with HTTP 403, produced by check_ajax_referer().');
  return context.respond(wpDie('-1', 403), { haltAt: 'wp-callback' }, ['nonce-failed']);
}

/** add_action() calls generated from a hook registry, each marked for highlighting when WordPress dispatches to it. */
export function registrationsSource(registrations: HookRegistration[]): string {
  if (!registrations.length) return '// No AJAX hooks are registered.';
  return registrations
    .map(
      ({ id, hook, callback }) => `// @stage wp-auth-branch ?hook-${id}
// @note WordPress found this registration: its hook name matches the one admin-ajax.php fired.
add_action(
    ${phpString(hook)},
    ${phpString(callback)}
);
// @end`,
    )
    .join('\n\n');
}

/** jQuery's behaviour, shared by the WordPress scenarios' failure explanations. */
export const JQUERY_ERROR_TAIL =
  ' jQuery treats any 4xx or 5xx status as a failure, so it called error() instead of success(), and the page shows “The request failed.”';
