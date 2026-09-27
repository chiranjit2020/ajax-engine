import { Loader } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { useSimulation } from '../../app/providers/SimulationProvider';
import { WORKSHOPS, type SignupErrors, type SignupInput } from '../../data/scenarios/submit-form';
import { hasReached } from '../../engine/execution';
import { BrowserFrame, Tag } from '../shared/BrowserFrame';

/** A sign-up form submitted with fetch(); field errors and the confirmation come from the simulated response. */
export function FormPlayground() {
  const { state, entry, input, setInput, play } = useSimulation();
  const ids = { name: useId(), email: useId(), workshop: useId() };
  if (!entry) return null;
  const form = input as SignupInput;
  const scenario = entry.scenario;
  const execution = state.execution;
  const at = state.stageIndex;
  const failed = execution?.failureIndex != null && at >= execution.failureIndex;
  const done = execution !== null && !failed && hasReached(scenario, at, 'dom-updated');
  const busy = execution !== null && hasReached(scenario, at, 'request-created') && !done && !failed;
  const inProgress = execution !== null && state.status !== 'finished';
  const errors: SignupErrors = failed && execution?.response?.status === 422 ? ((execution.parsedBody as { errors: SignupErrors }).errors ?? {}) : {};
  const update = (patch: Partial<SignupInput>) => setInput({ ...form, ...patch });

  const field = (key: keyof SignupInput, label: string, control: ReactNode) => (
    <div className="space-y-1">
      <label htmlFor={ids[key]} className="text-xs font-medium">
        {label}
      </label>
      {control}
      {errors[key] && (
        <p id={`${ids[key]}-error`} className="text-xs text-danger">
          {errors[key]}
        </p>
      )}
    </div>
  );

  return (
    <BrowserFrame url="ajax-lab.test/workshops">
      <form
        className="space-y-3"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!inProgress) play();
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">Workshop sign-up</p>
          <Tag>#signup</Tag>
        </div>
        {field(
          'name',
          'Name',
          <input
            id={ids.name}
            name="name"
            value={form.name}
            aria-invalid={!!errors.name}
            onChange={(event) => update({ name: event.target.value })}
            className="h-8 w-full rounded-md border border-line bg-surface px-2 text-sm aria-invalid:border-danger"
          />,
        )}
        {field(
          'email',
          'Email',
          <input
            id={ids.email}
            name="email"
            value={form.email}
            aria-invalid={!!errors.email}
            onChange={(event) => update({ email: event.target.value })}
            className="h-8 w-full rounded-md border border-line bg-surface px-2 text-sm aria-invalid:border-danger"
          />,
        )}
        {field(
          'workshop',
          'Workshop',
          <select
            id={ids.workshop}
            name="workshop"
            value={form.workshop}
            aria-invalid={!!errors.workshop}
            onChange={(event) => update({ workshop: event.target.value })}
            className="h-8 w-full rounded-md border border-line bg-surface px-1.5 text-sm aria-invalid:border-danger"
          >
            {WORKSHOPS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>,
        )}
        <button
          type="submit"
          disabled={inProgress}
          className="h-8 rounded-md bg-accent px-3 text-sm font-medium text-on-accent hover:opacity-90 disabled:opacity-50"
        >
          Register
        </button>
        <div className="min-h-5 text-sm" aria-busy={busy}>
          <Tag>#signup-status</Tag>{' '}
          {done && execution ? (
            <span className="font-medium text-success">
              Registered! Your ID is {(execution.parsedBody as { id: number }).id}. <span className="font-normal text-muted">(form.reset() clears the fields)</span>
            </span>
          ) : busy ? (
            <span className="inline-flex items-center gap-1.5 text-muted">
              <Loader size={13} className="animate-spin" aria-hidden /> Sending…
            </span>
          ) : null}
        </div>
      </form>
    </BrowserFrame>
  );
}
