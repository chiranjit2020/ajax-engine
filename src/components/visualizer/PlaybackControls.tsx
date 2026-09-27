import { Pause, Play, RefreshCw, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { useSimulation } from '../../app/providers/SimulationProvider';

const SPEEDS = [
  { value: 2, label: 'Slow' },
  { value: 1, label: 'Normal' },
  { value: 0.5, label: 'Fast' },
];

function ControlButton({
  label,
  onClick,
  disabled,
  primary,
  children,
}: {
  label: string;
  onClick(): void;
  disabled?: boolean;
  primary?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-medium disabled:opacity-40 ${
        primary
          ? 'min-w-22 bg-accent text-on-accent hover:opacity-90'
          : 'w-9 border border-line bg-surface px-0 text-text hover:bg-surface-2 sm:w-auto sm:px-2.5'
      }`}
    >
      {children}
      <span className={primary ? '' : 'sr-only sm:not-sr-only'}>{label}</span>
    </button>
  );
}

export function PlaybackControls() {
  const { state, entry, play, pause, next, previous, replay, reset, setSpeed } = useSimulation();
  const speedId = useId();
  const playing = state.status === 'playing';
  const hasRun = state.execution !== null;
  const unavailable = !entry;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Playback" className="flex flex-wrap items-center gap-1.5">
        {playing ? (
          <ControlButton label="Pause" onClick={pause} primary>
            <Pause size={16} aria-hidden />
          </ControlButton>
        ) : (
          <ControlButton label={state.status === 'paused' ? 'Resume' : 'Play'} onClick={play} disabled={unavailable} primary>
            <Play size={16} aria-hidden />
          </ControlButton>
        )}
        <ControlButton label="Previous" onClick={previous} disabled={!hasRun || state.stageIndex <= 0}>
          <SkipBack size={16} aria-hidden />
        </ControlButton>
        <ControlButton label="Next" onClick={next} disabled={unavailable || state.status === 'finished'}>
          <SkipForward size={16} aria-hidden />
        </ControlButton>
        <ControlButton label="Replay" onClick={replay} disabled={!hasRun}>
          <RefreshCw size={16} aria-hidden />
        </ControlButton>
        <ControlButton label="Reset" onClick={reset} disabled={!hasRun}>
          <RotateCcw size={16} aria-hidden />
        </ControlButton>
      </div>

      <div className="ml-auto flex items-center gap-2 text-sm">
        <label htmlFor={speedId} className="sr-only text-muted sm:not-sr-only">
          Speed
        </label>
        <select
          id={speedId}
          value={state.speed}
          onChange={(event) => setSpeed(Number(event.target.value))}
          className="h-9 rounded-lg border border-line bg-surface px-2 text-text"
        >
          {SPEEDS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
