import { ArrowRight, Check, Minus, X } from 'lucide-react';
import { securityRegistrations, wpSecurityScenario, type WpSecurityInput } from '../../data/scenarios/wp-security-lab';
import type { WpStudentInput } from '../../data/scenarios/wp-student-details';
import type { Execution } from '../../engine/types';
import { dispatch, LOGGED_IN_PREFIX, LOGGED_OUT_PREFIX, type DispatchResult, type HookRegistration } from '../../engine/wordpress';

/** The hooks registered on the (simulated) server for a WordPress scenario's current input. */
function registrationsFor(execution: Execution, input: unknown): HookRegistration[] {
  if (execution.scenarioId === wpSecurityScenario.id) return securityRegistrations((input as WpSecurityInput).controls);
  return (input as WpStudentInput).registrations ?? [];
}

/** Read the dispatch inputs the way the server saw them: action from the request, login state from the cookie. */
export function dispatchFromExecution(execution: Execution, input: unknown): DispatchResult {
  const fields = execution.request.body.kind === 'form-urlencoded' ? execution.request.body.fields : {};
  const loggedIn = execution.tags.includes('logged-in');
  return dispatch(registrationsFor(execution, input), fields.action ?? '', loggedIn);
}

/** 'wp_ajax_nopriv_' . 'get_student_details' → wp_ajax_nopriv_get_student_details */
export function HookNameFormula({ result }: { result: DispatchResult }) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Hook name</h3>
      <p className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
        <span className="rounded border border-line bg-surface-2 px-1.5 py-0.5">'{result.prefix}'</span>
        <span className="text-muted">.</span>
        <span className="rounded border border-accent/40 bg-accent-soft px-1.5 py-0.5">'{result.action}'</span>
        <ArrowRight size={13} className="text-muted" aria-label="becomes" />
        <strong className="break-all">{result.hookName}</strong>
      </p>
      <p className="text-xs text-muted">The prefix comes from the login state; the rest is the action value, unchanged.</p>
    </div>
  );
}

function Branch({ label, prefix, result, active }: { label: string; prefix: string; result: DispatchResult; active: boolean }) {
  const hook = prefix + result.action;
  const registered = active ? result.matches.length > 0 : result.otherHookRegistered;
  return (
    <li
      className={`space-y-1 rounded-lg border p-2.5 ${
        active ? (registered ? 'border-success bg-success-soft' : 'border-danger bg-danger-soft') : 'border-dashed border-line'
      }`}
    >
      <p className="flex items-center justify-between gap-2 text-xs font-medium">
        {label}
        <span className="inline-flex items-center gap-1 text-[11px] text-muted">
          {active ? <Check size={12} aria-hidden /> : <Minus size={12} aria-hidden />}
          {active ? 'this request' : 'not taken'}
        </span>
      </p>
      <p className="break-all font-mono text-xs">{hook}</p>
      <p className="flex items-center gap-1 text-xs">
        {registered ? <Check size={12} className="text-success" aria-hidden /> : <X size={12} className="text-danger" aria-hidden />}
        {registered ? 'Handler registered' : 'Nothing registered'}
      </p>
    </li>
  );
}

/** The two separate hooks, with the one this request used highlighted. */
export function AuthBranches({ result }: { result: DispatchResult }) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">is_user_logged_in()?</h3>
      <ul className="grid gap-2 sm:grid-cols-2">
        <Branch label="Yes — logged in" prefix={LOGGED_IN_PREFIX} result={result} active={result.loggedIn} />
        <Branch label="No — logged out" prefix={LOGGED_OUT_PREFIX} result={result} active={!result.loggedIn} />
      </ul>
    </div>
  );
}
