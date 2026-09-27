import { useInspector, type NetworkSection } from '../../app/providers/InspectorProvider';
import type { LifecycleView } from '../../hooks/useLifecycleView';
import { OverviewSection, RequestSection, ResponseSection } from './network/NetworkSections';

const SECTIONS: { id: NetworkSection; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'request', label: 'Request' },
  { id: 'response', label: 'Response' },
];

/** Network inspector inside the bottom panel. Console and Timeline are sibling panel tabs. */
export function NetworkTab({ view }: { view: LifecycleView }) {
  const { networkSection, setNetworkSection } = useInspector();

  return (
    <div>
      <div role="group" aria-label="Network section" className="sticky top-0 z-10 flex gap-1 border-b border-line bg-surface px-3 py-2">
        {SECTIONS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={networkSection === id}
            onClick={() => setNetworkSection(id)}
            className="rounded-md border border-transparent px-2 py-1 text-xs font-medium text-muted hover:text-text aria-pressed:border-line aria-pressed:bg-surface-2 aria-pressed:text-text"
          >
            {label}
          </button>
        ))}
      </div>
      <div className="p-3">
        {networkSection === 'overview' && <OverviewSection view={view} />}
        {networkSection === 'request' && <RequestSection view={view} />}
        {networkSection === 'response' && <ResponseSection view={view} />}
      </div>
    </div>
  );
}
