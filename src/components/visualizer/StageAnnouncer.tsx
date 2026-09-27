import { useSimulation } from '../../app/providers/SimulationProvider';
import { useLifecycleView } from '../../hooks/useLifecycleView';

/**
 * Announces lifecycle progress to screen readers on every page that drives the
 * simulation (Lab, WordPress Lab, Code Studio, Network Inspector).
 */
export function StageAnnouncer() {
  const { state, pending } = useSimulation();
  const view = useLifecycleView();
  const current = view?.current;
  let message = '';
  if (pending) message = 'Sending a real request…';
  else if (current && view) {
    const failure = state.execution?.failure;
    message = `Stage ${current.index + 1} of ${view.stages.length}: ${current.stage.title}.`;
    if (current.status === 'skipped') message += ' This stage did not run.';
    else if (current.index === state.execution?.failureIndex && failure) message += ` Failed: ${failure.message}`;
    else if (state.status === 'finished') message += ' Request complete.';
  }
  return (
    <p aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </p>
  );
}
