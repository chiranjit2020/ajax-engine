import { absint, dispatch, hookNameFor, intval, phpString, type HookRegistration } from './wordpress';

const both: HookRegistration[] = [
  { id: '1', hook: 'wp_ajax_get_student_details', callback: 'ajax_lab_get_student_details' },
  { id: '2', hook: 'wp_ajax_nopriv_get_student_details', callback: 'ajax_lab_get_student_details' },
];
const loggedInOnly = both.slice(0, 1);

describe('WordPress hook dispatch', () => {
  it('forms the hook name by appending the action to the prefix', () => {
    expect(hookNameFor('get_student_details', true)).toBe('wp_ajax_get_student_details');
    expect(hookNameFor('get_student_details', false)).toBe('wp_ajax_nopriv_get_student_details');
  });

  it('matches the logged-in hook for logged-in visitors', () => {
    const result = dispatch(both, 'get_student_details', true);
    expect(result.hookName).toBe('wp_ajax_get_student_details');
    expect(result.matches.map((match) => match.id)).toEqual(['1']);
  });

  it('matches the nopriv hook for logged-out visitors', () => {
    expect(dispatch(both, 'get_student_details', false).matches.map((match) => match.id)).toEqual(['2']);
  });

  it('does not let a logged-out visitor reach a wp_ajax_-only handler', () => {
    const result = dispatch(loggedInOnly, 'get_student_details', false);
    expect(result.matches).toEqual([]);
    expect(result.otherHookName).toBe('wp_ajax_get_student_details');
    expect(result.otherHookRegistered).toBe(true);
  });

  it('does not let a logged-in visitor reach a nopriv-only handler', () => {
    const result = dispatch(both.slice(1), 'get_student_details', true);
    expect(result.matches).toEqual([]);
    expect(result.otherHookRegistered).toBe(true);
  });

  it('requires an exact hook name — a typo in the action or the hook does not match', () => {
    expect(dispatch(both, 'get_student_detail', true).matches).toEqual([]);
    expect(dispatch([{ id: 'x', hook: 'wp_ajax_Get_Student_Details', callback: 'f' }], 'get_student_details', true).matches).toEqual([]);
  });

  it('returns every registration on the hook in order', () => {
    const extra = { id: '3', hook: 'wp_ajax_get_student_details', callback: 'log_request' };
    expect(dispatch([...both, extra], 'get_student_details', true).matches.map((match) => match.id)).toEqual(['1', '3']);
  });
});

describe('PHP helpers', () => {
  it('implements intval() and absint() string semantics', () => {
    expect(intval('42')).toBe(42);
    expect(intval('  12abc')).toBe(12);
    expect(intval('abc')).toBe(0);
    expect(intval('')).toBe(0);
    expect(absint('-5')).toBe(5);
    expect(absint('7.9')).toBe(7);
    expect(absint('abc')).toBe(0);
  });

  it('escapes single-quoted PHP strings', () => {
    expect(phpString("it's")).toBe("'it\\'s'");
    expect(phpString('a\\b')).toBe("'a\\\\b'");
  });
});
