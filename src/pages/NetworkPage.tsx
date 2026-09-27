import { useState } from 'react';
import { Link } from 'react-router';
import { useSimulation } from '../app/providers/SimulationProvider';
import { ConsoleTab } from '../components/inspector/ConsoleTab';
import { OverviewSection, RequestSection, ResponseSection } from '../components/inspector/network/NetworkSections';
import { TimelineTab } from '../components/inspector/TimelineTab';
import { Tabs } from '../components/ui/Tabs';
import { PacketTrack } from '../components/visualizer/PacketTrack';
import { PlaybackControls } from '../components/visualizer/PlaybackControls';
import { NETWORK_CONCEPTS } from '../data/learning/reference';
import { useLifecycleView } from '../hooks/useLifecycleView';
import { ReferenceEntryView } from '../components/learning/ReferenceEntry';

type InspectorTab = 'overview' | 'request' | 'response' | 'console' | 'timeline';

const TABS: { id: InspectorTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'request', label: 'Request' },
  { id: 'response', label: 'Response' },
  { id: 'console', label: 'Console' },
  { id: 'timeline', label: 'Timeline' },
];

/** Full-page network inspector for the same run as the AJAX Lab — it shares the single simulation state. */
export function NetworkPage() {
  const { entry, state } = useSimulation();
  const view = useLifecycleView();
  const [tab, setTab] = useState<InspectorTab>('overview');

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-3 sm:p-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Network Inspector</h1>
        <p className="text-sm text-muted">
          A simplified version of the browser’s DevTools Network panel. It inspects the same run as the{' '}
          <Link to="/" className="text-accent underline">
            AJAX Lab
          </Link>
          {entry ? (
            <>
              {' '}
              — currently <strong className="text-text">{entry.scenario.title}</strong>
              {view?.current ? `, stage ${state.stageIndex + 1} of ${view.stages.length}` : ''}.
            </>
          ) : (
            '.'
          )}
        </p>
      </div>

      {!entry || !view ? (
        <p className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">
          Choose a standalone scenario in the AJAX Lab to inspect its request.
        </p>
      ) : (
        <>
          <div className="space-y-3 rounded-xl border border-line bg-surface p-4">
            <PacketTrack />
            <PlaybackControls />
          </div>
          <section aria-labelledby="inspector-heading" className="rounded-xl border border-line bg-surface">
            <h2 id="inspector-heading" className="sr-only">
              Request details
            </h2>
            <Tabs<InspectorTab> label="Network inspector" tabs={TABS} active={tab} onChange={setTab}>
              {tab === 'overview' && (
                <div className="p-4">
                  <OverviewSection view={view} />
                </div>
              )}
              {tab === 'request' && (
                <div className="p-4">
                  <RequestSection view={view} />
                </div>
              )}
              {tab === 'response' && (
                <div className="p-4">
                  <ResponseSection view={view} />
                </div>
              )}
              {tab === 'console' && <ConsoleTab view={view} />}
              {tab === 'timeline' && <TimelineTab view={view} />}
            </Tabs>
          </section>
        </>
      )}

      <section aria-labelledby="concepts" className="space-y-2">
        <h2 id="concepts" className="text-base font-semibold">
          Network concepts
        </h2>
        <p className="text-sm text-muted">Short explanations of what the inspector shows.</p>
        <div className="divide-y divide-line rounded-xl border border-line bg-surface">
          {NETWORK_CONCEPTS.map((entry) => (
            <details key={entry.id} className="group">
              <summary className="p-3 text-sm font-medium">{entry.term}</summary>
              <div className="px-3 pb-3">
                <ReferenceEntryView entry={entry} />
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
