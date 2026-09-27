import { linesForStage } from '../../engine/code-ranges';
import { resolveExecution, stageStatus } from '../../engine/execution';
import type { HttpRequest } from '../../engine/types';
import { SCENARIOS, resolveSource } from './index';
import { DEFAULT_REGISTRATIONS, DEFAULT_WP_INPUT, wpStudentScenario, type WpStudentInput } from './wp-student-details';

const run = (overrides: Partial<WpStudentInput> = {}) => resolveExecution(wpStudentScenario, { ...DEFAULT_WP_INPUT, ...overrides });
const loggedInOnly = DEFAULT_REGISTRATIONS.filter((registration) => !registration.hook.includes('nopriv'));
const indexOf = (id: string) => wpStudentScenario.stages.findIndex((stage) => stage.id === id);
const body = (overrides: Partial<WpStudentInput> = {}) => run(overrides).response?.rawBody;

describe('WordPress student details — simulated admin-ajax.php', () => {
  it('sends a POST to admin-ajax.php with action, nonce, and student_id as form fields', () => {
    const { request } = run();
    expect(request).toMatchObject({ method: 'POST', url: '/wp-admin/admin-ajax.php' });
    expect(request.body).toMatchObject({ kind: 'form-urlencoded', fields: { action: 'get_student_details', student_id: '42' } });
    expect(request.headers.Cookie).toBeUndefined();
    expect(run({ user: 'administrator' }).request.headers.Cookie).toMatch(/^wordpress_logged_in_/);
  });

  it('succeeds for a logged-out visitor through wp_ajax_nopriv_', () => {
    const execution = run();
    expect(execution.failure).toBeNull();
    expect(execution.response?.status).toBe(200);
    expect(JSON.parse(execution.response!.rawBody)).toEqual({ success: true, data: { id: 42, name: 'Aarav Das', course: 'Web Development' } });
    expect(execution.tags).toEqual(expect.arrayContaining(['logged-out-hook', 'hook-r2', 'found', 'status-2xx']));
    expect(execution.haltIndex).toBeNull();
  });

  it('uses the wp_ajax_ registration for a logged-in visitor', () => {
    expect(run({ user: 'administrator' }).tags).toEqual(expect.arrayContaining(['logged-in-hook', 'hook-r1']));
  });

  it('answers "0" with HTTP 400 when a logged-out visitor has only a wp_ajax_ handler', () => {
    const execution = run({ registrations: loggedInOnly });
    expect(execution.response).toMatchObject({ status: 400, rawBody: '0' });
    expect(execution.haltIndex).toBe(indexOf('wp-auth-branch'));
    expect(execution.skippedIndexes).toEqual([indexOf('wp-callback')]);
    expect(execution.failure).toMatchObject({ kind: 'http-error', atStage: 'wp-dom-update' });
    expect(execution.tags).toEqual(expect.arrayContaining(['no-hook', 'logged-out-no-hook']));
    expect(execution.notes['wp-auth-branch']!.text).toMatch(/registered on wp_ajax_get_student_details, but that hook is only used for logged-in visitors/);
  });

  it('works again once the missing wp_ajax_nopriv_ hook is registered', () => {
    const fixed = [...loggedInOnly, { id: 'r9', hook: 'wp_ajax_nopriv_get_student_details', callback: 'ajax_lab_get_student_details' }];
    expect(run({ registrations: fixed }).failure).toBeNull();
  });

  it('answers "0" with HTTP 400 when the action is empty, before any hook runs', () => {
    const execution = run({ action: '' });
    expect(execution.response).toMatchObject({ status: 400, rawBody: '0' });
    expect(execution.haltIndex).toBe(indexOf('wp-admin-ajax'));
    expect(execution.skippedIndexes).toEqual([indexOf('wp-hook-dispatch'), indexOf('wp-auth-branch'), indexOf('wp-callback')]);
  });

  it('does not match when the action has a typo', () => {
    expect(run({ action: 'get_student_detail' }).tags).toContain('no-hook');
  });

  it.each(['missing', 'invalid', 'expired'] as const)('stops with "-1" and HTTP 403 for a %s nonce', (nonce) => {
    const execution = run({ nonce });
    expect(execution.response).toMatchObject({ status: 403, rawBody: '-1' });
    expect(execution.haltIndex).toBe(indexOf('wp-callback'));
    expect(execution.tags).toContain('nonce-failed');
  });

  it('rejects a logged-out nonce sent with a logged-in cookie, because nonces are per user', () => {
    const guest = run().request;
    const loggedIn = run({ user: 'administrator' }).request;
    const mixed: HttpRequest = { ...guest, headers: loggedIn.headers };
    expect(wpStudentScenario.simulateServer(mixed, DEFAULT_WP_INPUT)).toMatchObject({ response: { status: 403 } });
  });

  it('reads the action from the request, not from the configuration', () => {
    const request = run().request;
    const tampered: HttpRequest = { ...request, body: { kind: 'form-urlencoded', fields: { action: 'other', student_id: '1' } } };
    expect(wpStudentScenario.simulateServer(tampered, DEFAULT_WP_INPUT)).toMatchObject({ response: { status: 400, rawBody: '0' } });
  });

  it('applies absint() to the student ID', () => {
    expect(JSON.parse(body({ studentId: '-5' })!)).toMatchObject({ success: true, data: { id: 5 } });
    expect(JSON.parse(body({ studentId: '12abc' })!)).toMatchObject({ data: { id: 12 } });
    const invalid = run({ studentId: 'abc' });
    expect(invalid.response?.status).toBe(400);
    expect(JSON.parse(invalid.response!.rawBody)).toEqual({ success: false, data: { message: 'Invalid student ID.' } });
    expect(invalid.tags).toContain('invalid-id');
  });

  it('treats an HTTP 200 {"success": false} envelope as an application error', () => {
    expect(wpStudentScenario.applicationError!({ success: false, data: { message: 'Nope' } })).toBe('Nope');
    expect(wpStudentScenario.applicationError!({ success: true, data: {} })).toBeNull();
  });

  it('marks the halted stage failed and the callback skipped, then fails when JavaScript handles the 400', () => {
    const execution = run({ registrations: loggedInOnly });
    const last = indexOf('wp-dom-update');
    expect(stageStatus(indexOf('wp-auth-branch'), last, execution)).toBe('failed');
    expect(stageStatus(indexOf('wp-callback'), last, execution)).toBe('skipped');
    expect(stageStatus(indexOf('wp-response'), last, execution)).toBe('complete');
    expect(stageStatus(last, last, execution)).toBe('failed');
    expect(stageStatus(indexOf('wp-callback'), indexOf('wp-auth-branch'), execution)).toBe('pending');
  });
});

describe('WordPress code sync', () => {
  const entry = SCENARIOS.find(({ scenario }) => scenario.id === 'wp-student-details')!;
  const file = (id: string, input: WpStudentInput = DEFAULT_WP_INPUT) => resolveSource(entry.code.find((codeFile) => codeFile.id === id)!, input);
  const highlighted = (id: string, stage: string, overrides: Partial<WpStudentInput> = {}) => {
    const input = { ...DEFAULT_WP_INPUT, ...overrides };
    const source = file(id, input);
    const lines = source.code.split('\n');
    return [...linesForStage(source, stage, run(overrides).tags)].map((line) => lines[line - 1]).join('\n');
  };

  it('generates the add_action() calls from the hook registry', () => {
    expect(file('wp-plugin').code).toContain("'wp_ajax_nopriv_get_student_details'");
    expect(file('wp-plugin', { ...DEFAULT_WP_INPUT, registrations: loggedInOnly }).code).not.toContain('wp_ajax_nopriv_');
  });

  it('highlights only the registration that WordPress dispatched to', () => {
    const lines = highlighted('wp-plugin', 'wp-auth-branch');
    expect(lines).toContain("'wp_ajax_nopriv_get_student_details'");
    expect(lines).not.toContain("'wp_ajax_get_student_details'");
    expect(highlighted('wp-plugin', 'wp-auth-branch', { user: 'administrator' })).toContain("'wp_ajax_get_student_details'");
  });

  it('highlights the logged-out branch and its wp_die in admin-ajax.php when no nopriv hook exists', () => {
    const lines = highlighted('wp-core', 'wp-auth-branch', { registrations: loggedInOnly });
    expect(lines).toContain('has_action( "wp_ajax_nopriv_{$action}" )');
    expect(lines).toContain("wp_die( '0', 400 );");
    expect(lines).not.toContain('do_action');
    expect(lines).not.toContain('"wp_ajax_{$action}"');
  });

  it('highlights the response source for each outcome', () => {
    expect(highlighted('wp-plugin', 'wp-response')).toContain('wp_send_json_success($student);');
    expect(highlighted('wp-plugin', 'wp-response', { nonce: 'missing' })).toContain("check_ajax_referer('ajax_lab_nonce', 'nonce');");
    expect(highlighted('wp-plugin', 'wp-response', { studentId: 'abc' })).toContain('wp_send_json_error(');
    expect(highlighted('wp-core', 'wp-response', { action: '' })).toContain("wp_die( '0', 400 );");
  });

  it('highlights success() for 200 and error() for a 4xx in the JavaScript', () => {
    expect(highlighted('wp-js', 'wp-dom-update')).toContain('response.data.name');
    const failed = highlighted('wp-js', 'wp-dom-update', { studentId: 'abc' });
    expect(failed).toContain("'The request failed.'");
    expect(failed).not.toContain('response.data.name');
  });

  it('escapes hook names typed into the registry', () => {
    const registrations = [{ id: 'x', hook: "wp_ajax_it's", callback: 'ajax_lab_get_student_details' }];
    expect(file('wp-plugin', { ...DEFAULT_WP_INPUT, registrations }).code).toContain("'wp_ajax_it\\'s'");
  });
});
