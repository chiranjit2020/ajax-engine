/**
 * Pure simulation of the parts of WordPress that handle an admin-ajax.php
 * request. It mirrors wp-admin/admin-ajax.php: the hook name is the prefix
 * for the visitor's authentication state plus the `action` value, and a
 * missing hook ends the request with wp_die( '0', 400 ).
 *
 * This is a teaching model, not WordPress. Nothing here contacts a real site.
 */

export const LOGGED_IN_PREFIX = 'wp_ajax_';
export const LOGGED_OUT_PREFIX = 'wp_ajax_nopriv_';

export interface HookRegistration {
  id: string;
  /** Full hook name as passed to add_action(), e.g. "wp_ajax_nopriv_get_student_details". */
  hook: string;
  /** Callback function name. */
  callback: string;
}

export interface DispatchResult {
  action: string;
  loggedIn: boolean;
  prefix: string;
  /** The hook admin-ajax.php will fire: prefix + action. */
  hookName: string;
  /** Registrations on that hook, in the order they were added. */
  matches: HookRegistration[];
  /** The hook for the opposite authentication state, and whether anything is registered on it. */
  otherHookName: string;
  otherHookRegistered: boolean;
}

export function hookNameFor(action: string, loggedIn: boolean): string {
  return (loggedIn ? LOGGED_IN_PREFIX : LOGGED_OUT_PREFIX) + action;
}

export function dispatch(registrations: HookRegistration[], action: string, loggedIn: boolean): DispatchResult {
  const hookName = hookNameFor(action, loggedIn);
  const otherHookName = hookNameFor(action, !loggedIn);
  return {
    action,
    loggedIn,
    prefix: loggedIn ? LOGGED_IN_PREFIX : LOGGED_OUT_PREFIX,
    hookName,
    matches: registrations.filter((registration) => registration.hook === hookName),
    otherHookName,
    otherHookRegistered: registrations.some((registration) => registration.hook === otherHookName),
  };
}

/** PHP intval() for strings: leading whitespace, optional sign, then leading digits; otherwise 0. */
export function intval(value: string): number {
  const match = /^\s*([+-]?\d+)/.exec(value);
  return match ? Number.parseInt(match[1]!, 10) : 0;
}

/** WordPress absint(): abs( (int) $value ). Note that "-5" becomes 5, and "abc" becomes 0. */
export function absint(value: string): number {
  return Math.abs(intval(value));
}

/** PHP single-quoted string literal. */
export function phpString(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}
