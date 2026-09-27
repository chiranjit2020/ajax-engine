import { Loader } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useSimulation } from '../../app/providers/SimulationProvider';
import { NONCE_OPTIONS, type WpStudentInput } from '../../data/scenarios/wp-student-details';
import { isLoggedIn } from '../../data/scenarios/wordpress/common';
import { hasReached } from '../../engine/execution';
import { BrowserFrame, Tag } from '../shared/BrowserFrame';

export function LoginToggle() {
  const { input, setInput } = useSimulation();
  const wp = input as WpStudentInput;
  const options: { value: boolean; label: string }[] = [
    { value: false, label: 'Logged out' },
    { value: true, label: 'Logged in' },
  ];
  return (
    <div role="group" aria-label="Simulated visitor" className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
      {options.map(({ value, label }) => (
        <button
          key={label}
          type="button"
          aria-pressed={isLoggedIn(wp.user) === value}
          onClick={() => isLoggedIn(wp.user) !== value && setInput({ ...wp, user: value ? 'administrator' : 'visitor' })}
          className="rounded-md px-2.5 py-1 text-sm font-medium text-muted hover:text-text aria-pressed:bg-surface aria-pressed:text-text aria-pressed:shadow-sm"
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/**
 * A WordPress front-end page with the spec’s “Load student” example. The
 * result element is rendered from the engine state; the visitor’s login state
 * is simulated and travels to the server only as a cookie.
 */
export function StudentPlayground() {
  const { state, entry, input, setInput, play } = useSimulation();
  const idField = useId();
  if (!entry) return null;
  const wp = input as WpStudentInput;
  const scenario = entry.scenario;
  const execution = state.execution;
  const at = state.stageIndex;
  const current = scenario.stages[at];
  const sent = execution !== null && hasReached(scenario, at, 'request-sent');
  const done = execution !== null && hasReached(scenario, at, 'dom-updated');
  const inProgress = execution !== null && state.status !== 'finished';

  // #student-result, set exactly as the jQuery code would: beforeSend, then success() or error().
  let result: ReactNode = <span className="text-muted">(empty)</span>;
  if (done && execution) {
    const failure = execution.failure;
    if (!failure) result = (execution.parsedBody as { data: { name: string } }).data.name;
    else if (failure.kind === 'application-error') result = failure.message;
    else result = <span className="text-danger">The request failed.</span>;
  } else if (sent) {
    result = (
      <span className="inline-flex items-center gap-1.5 text-muted">
        <Loader size={13} className="animate-spin" aria-hidden /> Loading...
      </span>
    );
  }

  const registered = wp.registrations.map((registration) => registration.hook);
  const nonceLabel = NONCE_OPTIONS.find((option) => option.value === wp.nonce)?.label ?? wp.nonce;

  return (
    <div className="space-y-3">
      <BrowserFrame url="ajax-lab.test/students">
        <div className="space-y-3">
          <p className="text-sm font-semibold">Student lookup</p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[8rem] flex-1 space-y-1">
              <label htmlFor={idField} className="flex items-center justify-between gap-2 text-xs font-medium">
                Student ID <Tag>#student-id</Tag>
              </label>
              <input
                id={idField}
                value={wp.studentId}
                onChange={(event) => setInput({ ...wp, studentId: event.target.value })}
                className="h-8 w-full rounded-md border border-line bg-surface px-2 font-mono text-sm"
              />
            </div>
            <button
              type="button"
              onClick={play}
              disabled={inProgress}
              title={inProgress ? 'A request is already in progress' : undefined}
              className={`h-8 rounded-md bg-accent px-3 text-sm font-medium text-on-accent hover:opacity-90 disabled:opacity-50 ${
                current?.id === 'wp-user-action' ? 'ring-4 ring-accent/35' : ''
              }`}
            >
              Load student
            </button>
          </div>
          <div
            className={`rounded-md border p-2.5 text-sm ${current?.id === 'wp-dom-update' ? 'border-accent ring-4 ring-accent/25' : 'border-line'}`}
          >
            <div className="mb-1 flex justify-end">
              <Tag>#student-result</Tag>
            </div>
            <p className="min-h-5 font-medium">{result}</p>
          </div>
        </div>
      </BrowserFrame>

      <div className="space-y-2 rounded-lg border border-line p-3 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Simulated WordPress</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-muted">Visitor</span>
          <LoginToggle />
        </div>
        <p className="text-xs text-muted">
          Hooks registered:{' '}
          {registered.length ? (
            registered.map((hook, index) => (
              <span key={hook + index}>
                {index > 0 && ', '}
                <code className="break-all font-mono text-text">{hook}</code>
              </span>
            ))
          ) : (
            <span className="text-danger">none</span>
          )}
          . Nonce: {nonceLabel.toLowerCase()}.
        </p>
        <Link to="/wordpress" className="inline-block text-xs font-medium text-accent underline">
          Change hooks, action, and nonce in the WordPress Lab
        </Link>
      </div>
    </div>
  );
}
