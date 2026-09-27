import { RotateCcw } from 'lucide-react';
import { useId } from 'react';
import { useSimulation } from '../../app/providers/SimulationProvider';
import { scenariosForTrack } from '../../data/scenarios';
import type { TrackMode } from '../../engine/types';

const TRACKS: { value: TrackMode; label: string }[] = [
  { value: 'standalone', label: 'Standalone' },
  { value: 'wordpress', label: 'WordPress' },
];

/** Mode switch, scenario selector, and reset. Shown in the top bar on tablet/desktop and inside the workspace on mobile. */
export function WorkspaceToolbar() {
  const { track, setTrack, entry, loadScenario, reset, state } = useSimulation();
  const selectId = useId();
  const scenarios = scenariosForTrack(track);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="AJAX mode" className="flex rounded-lg border border-line bg-surface-2 p-0.5">
        {TRACKS.map(({ value, label }) => {
          const checked = track === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={checked}
              onClick={() => !checked && setTrack(value)}
              className={`rounded-md px-2.5 py-1 text-sm font-medium ${checked ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <label htmlFor={selectId} className="sr-only">
        Scenario
      </label>
      <select
        id={selectId}
        value={entry?.scenario.id ?? ''}
        disabled={scenarios.length === 0}
        onChange={(event) => loadScenario(event.target.value)}
        className="order-last h-8 w-full min-w-0 rounded-lg border border-line bg-surface px-2 text-sm text-text disabled:text-muted sm:order-none sm:w-auto"
      >
        {scenarios.length === 0 && <option value="">No scenarios yet</option>}
        {scenarios.map(({ scenario }) => (
          <option key={scenario.id} value={scenario.id}>
            {scenario.title}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={reset}
        disabled={state.status === 'idle' && state.execution === null}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-sm text-text hover:bg-surface-2 disabled:opacity-50"
      >
        <RotateCcw size={14} aria-hidden />
        Reset
      </button>
    </div>
  );
}
