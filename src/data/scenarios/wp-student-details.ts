import type { HttpRequest, Scenario, ServerResult } from '../../engine/types';
import { absint, phpString, type HookRegistration } from '../../engine/wordpress';
import {
  JQUERY_ERROR_TAIL,
  checkAjaxReferer,
  note,
  nonceValue,
  registrationsSource,
  runAdminAjax,
  wordpressStages,
  wpAjaxRequest,
  wpJson,
  type NonceState,
  type SimUser,
} from './wordpress/common';

export { AJAX_URL, NONCE_OPTIONS, type NonceState, type SimUser } from './wordpress/common';

/**
 * WordPress scenario — "Load Student Details" (spec §8.1) through admin-ajax.php.
 *
 * The request is built exactly as the jQuery example sends it, and the
 * simulated server reads only what a real server could read from that request
 * (form fields and the login cookie). The hook registry is server-side
 * configuration, supplied from the learner's input.
 */
export interface WpStudentInput {
  /** Simulated visitor; becomes a WordPress login cookie on the request. */
  user: SimUser;
  /** Value of the `action` field the JavaScript sends. */
  action: string;
  nonce: NonceState;
  /** Raw text of the #student-id field. */
  studentId: string;
  /** Server side: add_action() registrations in the plugin. */
  registrations: HookRegistration[];
}

export const WP_ACTION = 'get_student_details';
export const WP_CALLBACK = 'ajax_lab_get_student_details';

export const DEFAULT_REGISTRATIONS: HookRegistration[] = [
  { id: 'r1', hook: `wp_ajax_${WP_ACTION}`, callback: WP_CALLBACK },
  { id: 'r2', hook: `wp_ajax_nopriv_${WP_ACTION}`, callback: WP_CALLBACK },
];

export const DEFAULT_WP_INPUT: WpStudentInput = {
  user: 'visitor',
  action: WP_ACTION,
  nonce: 'valid',
  studentId: '42',
  registrations: DEFAULT_REGISTRATIONS,
};

/** The callback from spec §8.1: nonce check, absint(), fixed demonstration data. */
function simulateStudentDetails(request: HttpRequest, config: WpStudentInput): ServerResult {
  const dispatched = runAdminAjax(request, config.registrations);
  if ('result' in dispatched) return dispatched.result;
  const context = dispatched.context;
  const { notes, respond } = context;

  const nonceFailure = checkAjaxReferer(context);
  if (nonceFailure) return nonceFailure;

  const raw = context.fields.student_id;
  const studentId = raw === undefined ? 0 : absint(raw);
  if (!studentId) {
    notes['wp-callback'] = note('warning', `Nonce valid. absint( ${phpString(raw ?? '')} ) = 0, so the ID is rejected.`);
    notes['wp-response'] = note('danger', 'wp_send_json_error() sent {"success":false,…} with HTTP 400.');
    return respond(wpJson(false, { message: 'Invalid student ID.' }, 400), {}, ['invalid-id']);
  }

  notes['wp-callback'] = note('success', `Nonce valid. absint( ${phpString(raw!)} ) = ${studentId}. Demonstration data prepared.`);
  notes['wp-response'] = note('success', 'wp_send_json_success() sent {"success":true,"data":{…}} with HTTP 200.');
  return respond(wpJson(true, { id: studentId, name: 'Aarav Das', course: 'Web Development' }, 200), {}, ['found']);
}

/** The plugin file from spec §8.1, with the add_action() registrations generated from the learner’s hook registry. */
export function pluginSource(registrations: HookRegistration[]): string {
  const hooks = registrationsSource(registrations);

  return `<?php
/**
 * Plugin Name: AJAX Lab Demo
 */

add_action(
    'wp_enqueue_scripts',
    'ajax_lab_enqueue_scripts'
);

function ajax_lab_enqueue_scripts() {
    wp_enqueue_script(
        'ajax-lab',
        plugin_dir_url(__FILE__) . 'ajax-lab.js',
        array('jquery'),
        '1.0.0',
        true
    );

    // @stage wp-js-request
    // @note Ran when the page was built, before any click. It printed ajaxLab.ajaxUrl and ajaxLab.nonce into the page for the JavaScript to use.
    wp_localize_script(
        'ajax-lab',
        'ajaxLab',
        array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            // @note A nonce tied to the action name 'ajax_lab_nonce', the current user, and a time window.
            'nonce'   => wp_create_nonce('ajax_lab_nonce'),
        )
    );
    // @end
}

${hooks}

// @stage wp-callback
function ajax_lab_get_student_details() {
    // @stage wp-response ?nonce-failed
    // @note Verifies the 'nonce' field. If it is missing, forged, or expired, this ends the request with wp_die( -1, 403 ) and nothing below runs.
    check_ajax_referer('ajax_lab_nonce', 'nonce');
    // @end
// @end

    // @stage wp-callback ?nonce-ok
    // @note absint() turns the input into a non-negative integer: "42" → 42, "abc" → 0, "-5" → 5.
    $student_id = isset($_POST['student_id'])
        ? absint($_POST['student_id'])
        : 0;

    if (!$student_id) {
    // @end
        // @stage wp-callback, wp-response ?invalid-id
        // @note Sends {"success":false,"data":{…}} with HTTP 400, then ends the request.
        wp_send_json_error(
            array('message' => 'Invalid student ID.'),
            400
        );
        // @end
    // @stage wp-callback ?nonce-ok
    }
    // @end

    // @stage wp-callback ?found
    // Demonstration data. No database query is performed.
    $student = array(
        'id'    => $student_id,
        'name'  => 'Aarav Das',
        'course' => 'Web Development',
    );
    // @end

    // @stage wp-response ?found
    // @note Sends {"success":true,"data":{…}} with HTTP 200, then ends the request with wp_die().
    wp_send_json_success($student);
    // @end
}
`;
}

export const wpStudentScenario: Scenario<WpStudentInput> = {
  id: 'wp-student-details',
  track: 'wordpress',
  title: 'Load student details',
  description:
    'A WordPress page asks admin-ajax.php for one student. Follow the request through hook dispatch, the login branch, and the PHP callback.',
  defaultInput: DEFAULT_WP_INPUT,
  stages: wordpressStages(),
  presets: {
    'nopriv-missing': {
      label: 'Logged-out visitor, only wp_ajax_ registered',
      input: { ...DEFAULT_WP_INPUT, registrations: DEFAULT_REGISTRATIONS.slice(0, 1) },
    },
    'logged-in': { label: 'Logged-in administrator', input: { ...DEFAULT_WP_INPUT, user: 'administrator' } },
    'missing-nonce': { label: 'Nonce missing', input: { ...DEFAULT_WP_INPUT, nonce: 'missing' } },
    'invalid-id': { label: 'student_id "abc"', input: { ...DEFAULT_WP_INPUT, studentId: 'abc' } },
    'no-action': { label: 'Empty action', input: { ...DEFAULT_WP_INPUT, action: '' } },
    'typo-hook': {
      label: 'Hook name typo in the plugin',
      input: {
        ...DEFAULT_WP_INPUT,
        registrations: [
          { id: 't1', hook: 'wp_ajax_get_student_detail', callback: WP_CALLBACK },
          { id: 't2', hook: 'wp_ajax_nopriv_get_student_detail', callback: WP_CALLBACK },
        ],
      },
    },
  },
  buildRequest: (input) => {
    const fields: Record<string, string> = { action: input.action };
    const nonce = nonceValue(input.nonce, input.user);
    if (nonce !== undefined) fields.nonce = nonce;
    fields.student_id = input.studentId;
    return wpAjaxRequest(input.user, fields);
  },
  simulateServer: simulateStudentDetails,
  applicationError: (parsed) => {
    const envelope = parsed as { success?: boolean; data?: { message?: string } } | null;
    return envelope && envelope.success === false ? (envelope.data?.message ?? 'WordPress returned "success": false.') : null;
  },
  explainFailure: (execution) => {
    const status = execution.response?.status;
    const tags = execution.tags;
    const tail = JQUERY_ERROR_TAIL;
    if (tags.includes('no-action')) return `No action parameter reached admin-ajax.php, so WordPress answered "0" with HTTP ${status}.${tail}`;
    if (tags.includes('no-hook'))
      return `No callback is registered on the hook WordPress fired, so admin-ajax.php answered "0" with HTTP ${status}. Your plugin code never ran.${tail}`;
    if (tags.includes('nonce-failed'))
      return `The nonce check failed, so check_ajax_referer() answered "-1" with HTTP ${status}. A nonce is not a password: it only helps show the request came from this site's own page.${tail}`;
    if (tags.includes('invalid-id'))
      return 'The callback rejected the ID with wp_send_json_error( …, 400 ). Because a 400 status was passed, jQuery called error(), not success(), and the page shows “The request failed.” The response.success === false branch inside success() only runs when the error envelope is sent with HTTP 200.';
    return null;
  },
  describeDomChanges: (execution) => {
    const data = (execution.parsedBody as { data?: { name?: string } } | undefined)?.data;
    return [`#student-result text → "${data?.name ?? ''}"`];
  },
};
