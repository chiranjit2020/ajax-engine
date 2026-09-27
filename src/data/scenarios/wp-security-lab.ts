import type { Execution, HttpRequest, Scenario, ServerResult } from '../../engine/types';
import { absint, phpString, type HookRegistration } from '../../engine/wordpress';
import {
  JQUERY_ERROR_TAIL,
  checkAjaxReferer,
  describeUser,
  nonceValue,
  note,
  registrationsSource,
  runAdminAjax,
  userCan,
  wordpressStages,
  wpAjaxRequest,
  wpJson,
  type NonceState,
  type SimUser,
} from './wordpress/common';

/**
 * WordPress security lab (spec §9): a private "student record" endpoint whose
 * safety controls the learner can switch off and replay. Everything here is a
 * local simulation with mock records; the SQL is evaluated by a tiny string
 * model, and unsafe HTML output is described, never injected into the page.
 */
export interface SecurityControls {
  /** check_ajax_referer() — CSRF protection. */
  verifyNonce: boolean;
  /** current_user_can( 'view_student_records' ) — authorization. */
  checkCapability: boolean;
  /** absint() + $wpdb->prepare() — validation and a safe query. */
  validateInput: boolean;
  /** How the JavaScript writes the result: .text() (safe) or .html() (unsafe for untrusted data). */
  output: 'text' | 'html';
  /** Also register wp_ajax_nopriv_ so logged-out visitors reach the callback. */
  publicAccess: boolean;
}

export interface WpSecurityInput {
  user: SimUser;
  nonce: NonceState;
  studentId: string;
  controls: SecurityControls;
}

export const SECURITY_ACTION = 'get_student_record';
export const SECURITY_CALLBACK = 'ajax_lab_get_student_record';
export const CAPABILITY = 'view_student_records';

export interface StudentRecord {
  id: number;
  name: string;
  email: string;
  grade: string;
}

/** Mock database table wp_students. Record 13's name was saved by an attacker. */
export const RECORDS: Record<number, StudentRecord> = {
  42: { id: 42, name: 'Aarav Das', email: 'aarav.das@example.test', grade: 'A-' },
  43: { id: 43, name: 'Priya Sen', email: 'priya.sen@example.test', grade: 'B+' },
  13: { id: 13, name: `Mallory <img src=x onerror="alert('XSS')">`, email: 'mallory@example.test', grade: 'C' },
};

export const STUDENT_ID_OPTIONS: { value: string; label: string }[] = [
  { value: '42', label: '42 — a normal record' },
  { value: '99', label: '99 — no such student' },
  { value: 'abc', label: 'abc — not a number' },
  { value: '42 OR 1=1', label: '42 OR 1=1 — SQL injection attempt' },
  { value: '13', label: '13 — name contains HTML' },
];

export const SAFE_CONTROLS: SecurityControls = {
  verifyNonce: true,
  checkCapability: true,
  validateInput: true,
  output: 'text',
  publicAccess: false,
};

export const DEFAULT_SECURITY_INPUT: WpSecurityInput = {
  user: 'administrator',
  nonce: 'valid',
  studentId: '42',
  controls: SAFE_CONTROLS,
};

export function securityRegistrations(controls: SecurityControls): HookRegistration[] {
  return [
    { id: 's1', hook: `wp_ajax_${SECURITY_ACTION}`, callback: SECURITY_CALLBACK },
    ...(controls.publicAccess ? [{ id: 's2', hook: `wp_ajax_nopriv_${SECURITY_ACTION}`, callback: SECURITY_CALLBACK }] : []),
  ];
}

const phpTruthy = (value: string) => value !== '' && value !== '0';
const SELECT = 'SELECT id, name, email, grade FROM wp_students WHERE id =';

/** A tiny model of MySQL evaluating `... WHERE id = <text>` built by string concatenation. */
function unsafeQuery(raw: string): { rows: StudentRecord[]; kind: 'ok' | 'injection' | 'error' } {
  if (/^\s*\d+\s*$/.test(raw)) {
    const record = RECORDS[Number(raw)];
    return { rows: record ? [record] : [], kind: 'ok' };
  }
  if (/^\s*\d+\s+OR\s+1\s*=\s*1\s*(--.*)?$/i.test(raw)) return { rows: Object.values(RECORDS), kind: 'injection' };
  return { rows: [], kind: 'error' };
}

function simulateSecurityLab(request: HttpRequest, config: WpSecurityInput): ServerResult {
  const { controls } = config;
  const dispatched = runAdminAjax(request, securityRegistrations(controls));
  if ('result' in dispatched) return dispatched.result;
  const context = dispatched.context;
  const { notes, respond, user, tags } = context;
  const facts: string[] = [];
  let danger = false;

  if (controls.verifyNonce) {
    const failure = checkAjaxReferer(context);
    if (failure) return failure;
    facts.push('Nonce valid.');
  } else {
    tags.push('nonce-skipped');
    facts.push('Nonce NOT checked — check_ajax_referer() was removed.');
    danger = true;
  }

  const allowed = userCan(user, CAPABILITY);
  if (controls.checkCapability) {
    if (!allowed) {
      notes['wp-callback'] = note(
        'danger',
        `${facts.join(' ')} current_user_can( '${CAPABILITY}' ) is false for ${describeUser(user)}, so the callback refuses with HTTP 403.`,
      );
      notes['wp-response'] = note('danger', 'wp_send_json_error() sent “You are not allowed to view student records.” with HTTP 403.');
      return respond(wpJson(false, { message: 'You are not allowed to view student records.' }, 403), {}, ['cap-denied']);
    }
    facts.push(`current_user_can( '${CAPABILITY}' ) is true for ${describeUser(user)}.`);
  } else {
    tags.push('cap-skipped');
    facts.push('Capability NOT checked — current_user_can() was removed.');
  }

  const raw = context.fields.student_id ?? '';
  let rows: StudentRecord[];
  if (controls.validateInput) {
    const id = absint(raw);
    if (!id) {
      notes['wp-callback'] = note('warning', `${facts.join(' ')} absint( ${phpString(raw)} ) = 0, so the ID is rejected.`);
      notes['wp-response'] = note('danger', 'wp_send_json_error() sent “Invalid student ID.” with HTTP 400.');
      return respond(wpJson(false, { message: 'Invalid student ID.' }, 400), {}, ['invalid-id']);
    }
    rows = RECORDS[id] ? [RECORDS[id]] : [];
    facts.push(`absint( ${phpString(raw)} ) = ${id}. Prepared query: ${SELECT} ${id}`);
  } else {
    if (!phpTruthy(raw)) {
      notes['wp-callback'] = note('warning', `${facts.join(' ')} The ID is empty, so it is rejected.`);
      return respond(wpJson(false, { message: 'Invalid student ID.' }, 400), {}, ['invalid-id']);
    }
    const query = unsafeQuery(raw);
    rows = query.rows;
    facts.push(`Query built by joining strings: ${SELECT} ${raw}`);
    if (query.kind === 'injection') {
      tags.push('sqli');
      danger = true;
      facts.push(`⚠ "OR 1=1" is true for every row, so the query returned all ${rows.length} students.`);
    } else if (query.kind === 'error') {
      tags.push('sql-error');
      facts.push('The database rejected the SQL (syntax error); $wpdb->get_results() returned null.');
    }
  }

  if (!rows.length) {
    notes['wp-callback'] = note(danger ? 'danger' : 'warning', `${facts.join(' ')} No rows, so the callback answers 404.`);
    notes['wp-response'] = note('danger', 'wp_send_json_error() sent “Student not found.” with HTTP 404.');
    return respond(wpJson(false, { message: 'Student not found.' }, 404), {}, ['not-found']);
  }

  if (!allowed) {
    tags.push('leak');
    danger = true;
    facts.push(`⚠ Private email and grade data was sent to ${describeUser(user)}, who is not allowed to see it.`);
  }
  notes['wp-callback'] = note(danger ? 'danger' : 'success', facts.join(' '));
  notes['wp-response'] = note(danger ? 'danger' : 'success', `wp_send_json_success() sent ${rows.length} record(s) with HTTP 200.`);
  return respond(wpJson(true, rows, 200), {}, ['found']);
}

/** What #student-result shows after the run, exactly as the generated JavaScript would set it. */
export function securityResultText(execution: Execution): string {
  if (!execution.failure) {
    const rows = (execution.parsedBody as { data: StudentRecord[] }).data;
    return rows.map((row) => row.name).join(', ');
  }
  // error(): jqXHR.responseJSON is set whenever the body parses as JSON, even for a 4xx.
  let json: unknown;
  try {
    json = JSON.parse(execution.response?.rawBody ?? '');
  } catch {
    json = undefined;
  }
  const message = (json as { data?: { message?: string } } | undefined)?.data?.message;
  return message ?? 'The request failed.';
}

export const containsHtml = (text: string) => /<[a-z!/]/i.test(text);

export function securityPluginSource(controls: SecurityControls): string {
  const registrations = registrationsSource(securityRegistrations(controls));

  const nonce = controls.verifyNonce
    ? `    // @stage wp-callback
    // @stage wp-response ?nonce-failed
    // @note Stops with wp_die( -1, 403 ) unless this site created the nonce for this user. It helps stop other websites triggering the action (CSRF). It does not say who the user is or what they may do.
    check_ajax_referer( 'ajax_lab_nonce', 'nonce' );
    // @end
    // @end`
    : `    // @stage wp-callback
    // @note REMOVED: without a nonce check, another website could make a logged-in visitor's browser send this request.
    // check_ajax_referer( 'ajax_lab_nonce', 'nonce' );
    // @end`;

  const capability = controls.checkCapability
    ? `    // @stage wp-callback
    // @note Authorization: “may this user see student records?” — a question a nonce cannot answer.
    if ( ! current_user_can( '${CAPABILITY}' ) ) {
    // @end
        // @stage wp-callback, wp-response ?cap-denied
        wp_send_json_error( array( 'message' => 'You are not allowed to view student records.' ), 403 );
        // @end
    // @stage wp-callback
    }
    // @end`
    : `    // @stage wp-callback
    // @note REMOVED: without a capability check, anyone who reaches this callback receives private data.
    // if ( ! current_user_can( '${CAPABILITY}' ) ) { ... }
    // @end`;

  const input = controls.validateInput
    ? `    // @stage wp-callback
    // @note absint() guarantees a non-negative integer: "abc" becomes 0, and "42 OR 1=1" becomes 42.
    $student_id = absint( $_POST['student_id'] ?? 0 );
    if ( ! $student_id ) {
    // @end
        // @stage wp-callback, wp-response ?invalid-id
        wp_send_json_error( array( 'message' => 'Invalid student ID.' ), 400 );
        // @end
    // @stage wp-callback
    }

    global $wpdb;
    // @note prepare() fills the %d placeholder with an integer, so input can never change the query's structure.
    $rows = $wpdb->get_results( $wpdb->prepare(
        "SELECT id, name, email, grade FROM {$wpdb->prefix}students WHERE id = %d",
        $student_id
    ) );
    // @end`
    : `    // @stage wp-callback
    // @note REMOVED validation: whatever the browser sent is used as-is.
    $student_id = $_POST['student_id'] ?? '';
    if ( ! $student_id ) {
    // @end
        // @stage wp-callback, wp-response ?invalid-id
        wp_send_json_error( array( 'message' => 'Invalid student ID.' ), 400 );
        // @end
    // @stage wp-callback
    }

    global $wpdb;
    // @note UNSAFE: the input is pasted into the SQL text. "42 OR 1=1" changes the query's meaning (SQL injection).
    $rows = $wpdb->get_results(
        "SELECT id, name, email, grade FROM {$wpdb->prefix}students WHERE id = $student_id"
    );
    // @end`;

  return `<?php
/**
 * Plugin Name: AJAX Lab — Student Records (security lab)
 * Student records are private: only users with the ${CAPABILITY} capability may read them.
 */

${registrations}

function ${SECURITY_CALLBACK}() {
${nonce}

${capability}

${input}

    // @stage wp-callback
    if ( ! $rows ) {
    // @end
        // @stage wp-callback, wp-response ?not-found
        wp_send_json_error( array( 'message' => 'Student not found.' ), 404 );
        // @end
    // @stage wp-callback
    }
    // @end

    // @stage wp-response ?found
    // @note Sends every row the query returned, including the private email and grade fields.
    wp_send_json_success( $rows );
    // @end
}
`;
}

export function securityScriptSource(controls: SecurityControls): string {
  const write =
    controls.output === 'text'
      ? `                // @note .text() inserts plain text: HTML inside a name is displayed, never run.
                $('#student-result').text( names.join( ', ' ) );`
      : `                // @note UNSAFE: .html() parses the text as HTML. A name containing markup becomes real elements, and handlers like onerror run (XSS).
                $('#student-result').html( names.join( ', ' ) );`;
  return `jQuery(function ($) {
    // @stage wp-user-action
    $('#load-record').on('click', function () {
    // @end
        // @stage wp-js-request
        $.ajax({
            url: ajaxLab.ajaxUrl,
            type: 'POST',
            dataType: 'json',
            data: {
                action: '${SECURITY_ACTION}',
                nonce: ajaxLab.nonce,
                student_id: $('#student-id').val()
            },
        // @end

            // @stage wp-dom-update ?status-2xx
            success: function (response) {
                const names = response.data.map(function (student) {
                    return student.name;
                });
${write}
            },
            // @end

            // @stage wp-dom-update ?http-error
            // @note jQuery sets jqXHR.responseJSON whenever the body parses as JSON — even for a 4xx — so the server's message can be shown.
            error: function (jqXHR) {
                const json = jqXHR.responseJSON;
                $('#student-result').text(
                    json && json.data ? json.data.message : 'The request failed.'
                );
            }
            // @end
        });
    });
});
`;
}

const preset = (label: string, overrides: Partial<WpSecurityInput>, controls: Partial<SecurityControls> = {}) => ({
  label,
  input: { ...DEFAULT_SECURITY_INPUT, ...overrides, controls: { ...SAFE_CONTROLS, ...controls } },
});

export const wpSecurityScenario: Scenario<WpSecurityInput> = {
  id: 'wp-security-lab',
  track: 'wordpress',
  title: 'Security lab: private student record',
  description:
    'A private endpoint returns student records. Change who is asking and switch safety controls off, then replay to see what each control protects against.',
  defaultInput: DEFAULT_SECURITY_INPUT,
  presets: {
    'nonce-not-authorization': preset('Subscriber with a valid nonce', { user: 'subscriber' }),
    'no-capability-check': preset('Subscriber, capability check removed', { user: 'subscriber' }, { checkCapability: false }),
    'missing-nonce': preset('Nonce missing', { nonce: 'missing' }),
    'sql-injection': preset('Injection attempt, validation removed', { studentId: '42 OR 1=1' }, { validateInput: false }),
    'sql-injection-blocked': preset('Injection attempt, validation on', { studentId: '42 OR 1=1' }),
    'xss-html': preset('Stored HTML, rendered with .html()', { studentId: '13' }, { output: 'html' }),
    'xss-text': preset('Stored HTML, rendered with .text()', { studentId: '13' }),
    'public-visitor': preset('Logged-out visitor, public access, no capability check', { user: 'visitor' }, { publicAccess: true, checkCapability: false }),
  },
  stages: wordpressStages({
    'wp-user-action': { summary: 'The user clicks “Load record”.' },
    'wp-js-request': { summary: 'jQuery POSTs action, nonce, and student_id to admin-ajax.php.' },
    'wp-callback': {
      summary: 'The callback checks the nonce, the user’s capability, and the input — in that order.',
      explanation:
        'Each check answers a different question. The nonce: did this request come from our own page (CSRF protection)? The capability: is this user allowed to see student records (authorization)? Validation: is the ID really a positive integer? Only then does the callback query the database — with a prepared statement.',
    },
    'wp-dom-update': {
      summary: 'jQuery calls success or error, and the names are written into #student-result.',
      explanation:
        'Data from the server is untrusted: a name might contain HTML saved by an attacker. .text() inserts it as plain text. .html() parses it as HTML, which lets injected markup and event handlers run (cross-site scripting, XSS).',
    },
  }),
  buildRequest: (input) => {
    const fields: Record<string, string> = { action: SECURITY_ACTION };
    const nonce = nonceValue(input.nonce, input.user);
    if (nonce !== undefined) fields.nonce = nonce;
    fields.student_id = input.studentId;
    return wpAjaxRequest(input.user, fields);
  },
  simulateServer: simulateSecurityLab,
  applicationError: (parsed) => {
    const envelope = parsed as { success?: boolean; data?: { message?: string } } | null;
    return envelope && envelope.success === false ? (envelope.data?.message ?? 'WordPress returned "success": false.') : null;
  },
  explainFailure: (execution) => {
    const tags = execution.tags;
    const shown = ` The error() callback reads jqXHR.responseJSON and shows “${securityResultText(execution)}”.`;
    if (tags.includes('no-hook'))
      return 'Student records are private, so the action is registered only on wp_ajax_. A logged-out visitor fires wp_ajax_nopriv_… and admin-ajax.php answers "0" with HTTP 400. For a private endpoint, that is the safe outcome.' + JQUERY_ERROR_TAIL;
    if (tags.includes('nonce-failed'))
      return 'check_ajax_referer() could not verify the nonce, so it answered "-1" with HTTP 403 before any other code ran. This is what stops a forged cross-site request.' + JQUERY_ERROR_TAIL;
    if (tags.includes('cap-denied'))
      return 'The nonce was valid, but this user lacks the view_student_records capability, so the callback refused with HTTP 403. A valid nonce is not permission: it only shows the request came from this site’s page.' + shown;
    if (tags.includes('invalid-id')) return 'The ID failed validation, so the callback refused with HTTP 400 before touching the database.' + shown;
    if (tags.includes('not-found'))
      return tags.includes('sql-error')
        ? 'Without validation, "abc" was pasted into the SQL text and the database rejected it. The callback answered 404 — but the input should never have reached the query.' + shown
        : 'No record has that ID, so the callback answered HTTP 404.' + shown;
    return null;
  },
  describeDomChanges: (execution) => {
    const text = securityResultText(execution);
    return [`#student-result → ${JSON.stringify(text)}`];
  },
};
