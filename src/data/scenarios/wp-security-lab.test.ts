import { linesForStage } from '../../engine/code-ranges';
import { resolveExecution } from '../../engine/execution';
import { SCENARIOS, resolveSource } from './index';
import {
  DEFAULT_SECURITY_INPUT,
  SAFE_CONTROLS,
  containsHtml,
  securityResultText,
  wpSecurityScenario,
  type SecurityControls,
  type WpSecurityInput,
} from './wp-security-lab';

const run = (overrides: Partial<WpSecurityInput> = {}, controls: Partial<SecurityControls> = {}) =>
  resolveExecution(wpSecurityScenario, { ...DEFAULT_SECURITY_INPUT, ...overrides, controls: { ...SAFE_CONTROLS, ...controls } });
const data = (execution: ReturnType<typeof run>) => JSON.parse(execution.response!.rawBody);

describe('Security lab — each control and what removing it exposes', () => {
  it('returns the record to an administrator with all controls on', () => {
    const execution = run();
    expect(execution.response?.status).toBe(200);
    expect(data(execution).data).toEqual([{ id: 42, name: 'Aarav Das', email: 'aarav.das@example.test', grade: 'A-' }]);
    expect(execution.tags).not.toContain('leak');
  });

  it('a valid nonce is not authorization: a subscriber is refused by the capability check', () => {
    const execution = run({ user: 'subscriber' });
    expect(execution.tags).toEqual(expect.arrayContaining(['nonce-ok', 'cap-denied']));
    expect(execution.response?.status).toBe(403);
    expect(securityResultText(execution)).toBe('You are not allowed to view student records.');
  });

  it('removing the capability check leaks private data to a subscriber', () => {
    const execution = run({ user: 'subscriber' }, { checkCapability: false });
    expect(execution.response?.status).toBe(200);
    expect(execution.tags).toEqual(expect.arrayContaining(['cap-skipped', 'leak']));
    expect(data(execution).data[0].email).toBe('aarav.das@example.test');
    expect(execution.notes['wp-callback']!.tone).toBe('danger');
  });

  it('a private endpoint is unreachable for logged-out visitors unless wp_ajax_nopriv_ is registered', () => {
    expect(run({ user: 'visitor' }).response).toMatchObject({ status: 400, rawBody: '0' });
    expect(run({ user: 'visitor' }, { publicAccess: true }).response?.status).toBe(403);
    expect(run({ user: 'visitor' }, { publicAccess: true, checkCapability: false }).tags).toContain('leak');
  });

  it.each(['missing', 'invalid', 'expired'] as const)('rejects a %s nonce with -1 / 403 before the capability check', (nonce) => {
    const execution = run({ nonce });
    expect(execution.response).toMatchObject({ status: 403, rawBody: '-1' });
    expect(execution.tags).not.toContain('cap-denied');
  });

  it('removing the nonce check lets a request without a nonce through (CSRF exposure)', () => {
    const execution = run({ nonce: 'missing' }, { verifyNonce: false });
    expect(execution.response?.status).toBe(200);
    expect(execution.tags).toContain('nonce-skipped');
  });

  it('validation turns an injection attempt into a harmless integer', () => {
    const execution = run({ studentId: '42 OR 1=1' });
    expect(data(execution).data).toHaveLength(1);
    expect(execution.notes['wp-callback']!.text).toContain('absint( \'42 OR 1=1\' ) = 42');
  });

  it('without validation, "42 OR 1=1" returns every row', () => {
    const execution = run({ studentId: '42 OR 1=1' }, { validateInput: false });
    expect(execution.tags).toContain('sqli');
    expect(data(execution).data).toHaveLength(3);
  });

  it('distinguishes invalid input, a missing record, and a database error', () => {
    expect(run({ studentId: 'abc' }).tags).toContain('invalid-id');
    expect(run({ studentId: '99' })).toMatchObject({ response: { status: 404 } });
    expect(run({ studentId: 'abc' }, { validateInput: false }).tags).toEqual(expect.arrayContaining(['sql-error', 'not-found']));
  });

  it('stored HTML reaches the browser either way — the output method decides whether it runs', () => {
    const text = securityResultText(run({ studentId: '13' }));
    expect(containsHtml(text)).toBe(true);
  });

  it('has a preset for every lesson and challenge that references one', () => {
    for (const preset of Object.values(wpSecurityScenario.presets!)) expect(() => resolveExecution(wpSecurityScenario, preset.input)).not.toThrow();
  });
});

describe('Security lab code generation', () => {
  const entry = SCENARIOS.find(({ scenario }) => scenario.id === 'wp-security-lab')!;
  const code = (id: string, controls: Partial<SecurityControls> = {}) =>
    resolveSource(entry.code.find((file) => file.id === id)!, { ...DEFAULT_SECURITY_INPUT, controls: { ...SAFE_CONTROLS, ...controls } }).code;

  it('shows switched-off checks as removed code', () => {
    expect(code('sec-plugin')).toContain("    check_ajax_referer( 'ajax_lab_nonce', 'nonce' );");
    expect(code('sec-plugin', { verifyNonce: false })).toContain("    // check_ajax_referer( 'ajax_lab_nonce', 'nonce' );");
    expect(code('sec-plugin', { checkCapability: false })).toContain("// if ( ! current_user_can( 'view_student_records' ) ) { ... }");
    expect(code('sec-plugin')).toContain('$wpdb->prepare(');
    expect(code('sec-plugin', { validateInput: false })).toContain('WHERE id = $student_id"');
    expect(code('sec-plugin', { publicAccess: true })).toContain("'wp_ajax_nopriv_get_student_record'");
  });

  it('switches the JavaScript between .text() and .html()', () => {
    expect(code('sec-js')).toContain(".text( names.join( ', ' ) )");
    expect(code('sec-js', { output: 'html' })).toContain(".html( names.join( ', ' ) )");
  });

  it('highlights the capability refusal only when it happens', () => {
    const input = { ...DEFAULT_SECURITY_INPUT, user: 'subscriber' as const };
    const source = resolveSource(entry.code.find((file) => file.id === 'sec-plugin')!, input);
    const lines = source.code.split('\n');
    const at = (tags: string[]) => [...linesForStage(source, 'wp-response', tags)].map((line) => lines[line - 1]).join('\n');
    expect(at(resolveExecution(wpSecurityScenario, input).tags)).toContain('You are not allowed');
    expect(at(resolveExecution(wpSecurityScenario, DEFAULT_SECURITY_INPUT).tags)).not.toContain('You are not allowed');
  });
});
