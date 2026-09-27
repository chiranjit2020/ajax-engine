import { useSimulation } from '../../app/providers/SimulationProvider';
import { PLAYGROUNDS } from '../../features/playgrounds';
import { Badge } from '../ui/Badge';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { RealModePanel } from './RealModePanel';

/** Scenario description, the scenario's interactive playground page, and the execution mode. */
export function ScenarioPanel() {
  const { entry, state, realActive } = useSimulation();
  if (!entry) return null;
  const { scenario } = entry;
  const Playground = PLAYGROUNDS[scenario.id];
  const real = state.execution ? state.execution.executionMode === 'real' : realActive;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="accent">{scenario.track === 'standalone' ? 'Standalone AJAX' : 'WordPress AJAX'}</Badge>
          {real ? <Badge tone="warning">Real server</Badge> : <Badge>Simulated server</Badge>}
        </div>
        <h2 className="text-base font-semibold">{scenario.title}</h2>
        <p className="text-sm text-muted">{scenario.description}</p>
      </div>
      {Playground && (
        <ErrorBoundary
          resetKey={state.execution}
          fallback={
            <p className="rounded-lg border border-dashed border-line p-3 text-sm text-muted">
              This page cannot display the response it received (it does not have the shape the example expects). Inspect it in the Network tab.
            </p>
          }
        >
          <Playground />
        </ErrorBoundary>
      )}
      <RealModePanel />
    </div>
  );
}
