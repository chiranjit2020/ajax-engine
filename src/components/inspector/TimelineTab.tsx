import { useSimulation } from '../../app/providers/SimulationProvider';
import type { LifecycleView } from '../../hooks/useLifecycleView';
import { StageStatusLabel } from '../visualizer/StageStatusLabel';

export function TimelineTab({ view }: { view: LifecycleView }) {
  const { selectStage, state } = useSimulation();
  return (
    <div className="p-3">
      <p className="mb-2 text-xs text-muted">Simulated durations — adjustable with the speed control. Select a row to jump to that stage.</p>
      <ol className="divide-y divide-line rounded-lg border border-line">
        {view.stages.map(({ stage, index, status, startMs }) => (
          <li key={stage.id}>
            <button
              type="button"
              onClick={() => selectStage(index)}
              aria-current={index === state.stageIndex ? 'step' : undefined}
              className={`grid w-full grid-cols-[3.5rem_1fr_auto] items-center gap-3 px-3 py-2 text-left text-sm hover:bg-surface-2 ${
                index === state.stageIndex ? 'bg-accent-soft' : ''
              }`}
            >
              <span className="font-mono text-xs text-muted">{(startMs / 1000).toFixed(1)}s</span>
              <span className="min-w-0 truncate">{stage.title}</span>
              <StageStatusLabel status={status} />
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
