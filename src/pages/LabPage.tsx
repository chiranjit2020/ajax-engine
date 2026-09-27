import { Maximize2, Minimize2, Workflow } from 'lucide-react';
import { useState } from 'react';
import { useSimulation } from '../app/providers/SimulationProvider';
import { BottomPanel } from '../components/inspector/BottomPanel';
import { WorkspaceToolbar } from '../components/layout/WorkspaceToolbar';
import { Badge } from '../components/ui/Badge';
import { ExplanationPanel } from '../components/visualizer/ExplanationPanel';
import { LifecycleDiagram } from '../components/visualizer/LifecycleDiagram';
import { PacketTrack } from '../components/visualizer/PacketTrack';
import { PlaybackControls } from '../components/visualizer/PlaybackControls';
import { ScenarioPanel } from '../components/visualizer/ScenarioPanel';
import { useLifecycleView } from '../hooks/useLifecycleView';

const CARD = 'min-w-0 rounded-xl border border-line bg-surface p-4';

function NoScenario() {
  return (
    <div className={`${CARD} mx-auto max-w-xl space-y-2 text-center`}>
      <Workflow className="mx-auto text-accent" size={28} aria-hidden />
      <h2 className="text-lg font-semibold">No scenario selected</h2>
      <p className="text-sm text-muted">Choose a scenario from the selector above.</p>
    </div>
  );
}

export function LabPage() {
  const { entry, state } = useSimulation();
  const view = useLifecycleView();
  const [focused, setFocused] = useState(false);

  return (
    <div className="flex flex-col gap-4 p-3 sm:p-4">
      <h1 className="sr-only">AJAX Lab workspace</h1>
      <div className="lg:hidden">
        <WorkspaceToolbar />
      </div>

      {!entry || !view ? (
        <NoScenario />
      ) : (
        <>
          <div
            className={`grid gap-4 ${
              focused ? '' : 'md:grid-cols-2 xl:grid-cols-[17rem_minmax(0,1fr)_18rem]'
            }`}
          >
            {!focused && (
              <section aria-label="Scenario" className={CARD}>
                <ScenarioPanel />
              </section>
            )}

            <section
              aria-labelledby="lifecycle-heading"
              className={`${CARD} min-w-0 space-y-4 md:order-first md:col-span-2 xl:order-none xl:col-span-1`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="lifecycle-heading" className="text-base font-semibold">
                  Request lifecycle
                </h2>
                {state.execution?.executionMode === 'real' ? <Badge tone="warning">Real request</Badge> : <Badge>Simulation</Badge>}
                <button
                  type="button"
                  onClick={() => setFocused(!focused)}
                  aria-pressed={focused}
                  className="ml-auto hidden items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted hover:bg-surface-2 hover:text-text md:inline-flex"
                >
                  {focused ? <Minimize2 size={14} aria-hidden /> : <Maximize2 size={14} aria-hidden />}
                  Focus on animation
                </button>
              </div>

              <LifecycleDiagram view={view} />
              <PacketTrack />

              <div className="sticky bottom-0 -mx-4 -mb-4 rounded-b-xl border-t border-line bg-surface/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:mb-0 md:border-0 md:bg-transparent md:p-0">
                <PlaybackControls />
              </div>
            </section>

            {!focused && (
              <section aria-label="Explanation" className={CARD}>
                <ExplanationPanel view={view} />
              </section>
            )}
          </div>

          <BottomPanel view={view} />
        </>
      )}

    </div>
  );
}
