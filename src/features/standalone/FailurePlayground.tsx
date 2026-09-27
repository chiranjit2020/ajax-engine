import { Loader, RotateCw } from 'lucide-react';
import { useId } from 'react';
import { useSimulation } from '../../app/providers/SimulationProvider';
import { FAILURE_MODES, failureMessage, isTransient, type FailureInput, type FailureMode, type NotificationItem } from '../../data/scenarios/failure-recovery';
import { hasReached } from '../../engine/execution';
import { BrowserFrame, Tag } from '../shared/BrowserFrame';

/** A dashboard that loads notifications from a misbehaving (simulated) server, with a retry button. */
export function FailurePlayground() {
  const { state, entry, input, setInput, play } = useSimulation();
  const modeId = useId();
  if (!entry) return null;
  const config = input as FailureInput;
  const scenario = entry.scenario;
  const execution = state.execution;
  const at = state.stageIndex;
  const failed = execution?.failureIndex != null && at >= execution.failureIndex;
  const done = execution !== null && !failed && hasReached(scenario, at, 'dom-updated');
  const busy = execution !== null && hasReached(scenario, at, 'request-created') && !done && !failed;
  const inProgress = execution !== null && state.status !== 'finished';

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label htmlFor={modeId} className="text-xs font-semibold uppercase tracking-wide text-muted">
          Simulated server condition
        </label>
        <select
          id={modeId}
          value={config.mode}
          onChange={(event) => setInput({ mode: event.target.value as FailureMode, attempt: 1 })}
          className="h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm"
        >
          {FAILURE_MODES.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted">
          Attempt {config.attempt}.{' '}
          {config.mode === 'ok'
            ? 'Every request succeeds.'
            : isTransient(config.mode)
              ? 'This failure is temporary: a retry succeeds.'
              : 'This failure is permanent: a retry fails the same way.'}
        </p>
      </div>

      <BrowserFrame url="ajax-lab.test/dashboard">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Notifications</p>
            <button
              type="button"
              onClick={play}
              disabled={inProgress}
              className="h-8 rounded-md bg-accent px-3 text-sm font-medium text-on-accent hover:opacity-90 disabled:opacity-50"
            >
              Load notifications
            </button>
          </div>
          <div aria-busy={busy} className="space-y-2 rounded-md border border-line p-2.5 text-sm">
            <div className="flex justify-end">
              <Tag>#notifications</Tag>
            </div>
            {done && execution ? (
              <ul className="list-disc space-y-0.5 pl-5">
                {(execution.parsedBody as { items: NotificationItem[] }).items.map((item) => (
                  <li key={item.id}>{item.text}</li>
                ))}
              </ul>
            ) : failed && execution ? (
              <div className="space-y-2">
                <p className="text-danger">{failureMessage(execution)}</p>
                <button
                  type="button"
                  onClick={() => setInput({ ...config, attempt: config.attempt + 1 }, { play: true })}
                  disabled={inProgress}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line px-2.5 text-sm hover:bg-surface-2 disabled:opacity-50"
                >
                  <RotateCw size={14} aria-hidden /> Try again <Tag>#retry</Tag>
                </button>
              </div>
            ) : busy ? (
              <p className="flex items-center gap-2 text-muted">
                <Loader size={14} className="animate-spin" aria-hidden /> Loading…
              </p>
            ) : (
              <p className="text-muted">Nothing loaded yet.</p>
            )}
          </div>
        </div>
      </BrowserFrame>
    </div>
  );
}
