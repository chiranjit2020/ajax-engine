import { ChevronDown, ChevronUp } from 'lucide-react';
import { useInspector, type PanelTab } from '../../app/providers/InspectorProvider';
import type { LifecycleView } from '../../hooks/useLifecycleView';
import { Tabs } from '../ui/Tabs';
import { CodeTab } from './CodeTab';
import { ConsoleTab } from './ConsoleTab';
import { NetworkTab } from './NetworkTab';
import { TimelineTab } from './TimelineTab';

const TABS: { id: PanelTab; label: string }[] = [
  { id: 'code', label: 'Code' },
  { id: 'network', label: 'Network' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'console', label: 'Console' },
];

/** One inspector at a time, in tabs, collapsible so the learner can focus on the animation. */
export function BottomPanel({ view }: { view: LifecycleView }) {
  const { panelTab, setPanelTab, panelOpen, setPanelOpen } = useInspector();

  return (
    <section aria-label="Inspectors" className="rounded-xl border border-line bg-surface">
      <Tabs
        label="Inspector"
        tabs={TABS}
        active={panelTab}
        onChange={(id) => {
          setPanelTab(id);
          if (!panelOpen) setPanelOpen(true);
        }}
        trailing={
          <button
            type="button"
            onClick={() => setPanelOpen(!panelOpen)}
            aria-expanded={panelOpen}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-surface-2 hover:text-text"
          >
            {panelOpen ? <ChevronDown size={14} aria-hidden /> : <ChevronUp size={14} aria-hidden />}
            {panelOpen ? 'Hide' : 'Show'}
          </button>
        }
      >
        {panelOpen && (
          <div data-scroll-container className="max-h-[26rem] overflow-auto">
            {panelTab === 'timeline' && <TimelineTab view={view} />}
            {panelTab === 'code' && <CodeTab view={view} />}
            {panelTab === 'network' && <NetworkTab view={view} />}
            {panelTab === 'console' && <ConsoleTab view={view} />}
          </div>
        )}
      </Tabs>
    </section>
  );
}
