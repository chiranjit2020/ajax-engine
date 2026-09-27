import { ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { useSimulation } from '../../app/providers/SimulationProvider';
import type { StageId, StageStatus, TrackMode } from '../../engine/types';
import { ACTOR_LABELS, type LifecycleView } from '../../hooks/useLifecycleView';
import { StageStatusLabel } from './StageStatusLabel';

type Direction = 'right' | 'down' | 'left';

/**
 * Tablet/desktop placement, keyed by stage ID: the request travels left to
 * right along the top row and the response returns right to left along the
 * bottom row. Classes are literal so Tailwind can see them. On mobile the list
 * is a single vertical flow in stage order.
 */
const LAYOUT: Record<StageId, { cell: string; next: Direction | null }> = {
  // Standalone: browser → network → server and back.
  'user-action': { cell: 'md:col-start-1 md:row-start-1', next: 'right' },
  'js-handler': { cell: 'md:col-start-2 md:row-start-1', next: 'right' },
  'http-request': { cell: 'md:col-start-3 md:row-start-1', next: 'right' },
  'server-receives': { cell: 'md:col-start-4 md:row-start-1', next: 'down' },
  'server-processing': { cell: 'md:col-start-4 md:row-start-2', next: 'left' },
  'http-response': { cell: 'md:col-start-3 md:row-start-2', next: 'left' },
  'js-handles-response': { cell: 'md:col-start-2 md:row-start-2', next: 'left' },
  'dom-update': { cell: 'md:col-start-1 md:row-start-2', next: null },
  // WordPress: into admin-ajax.php and hook dispatch, down through the login branch, back out via the callback.
  'wp-user-action': { cell: 'md:col-start-1 md:row-start-1', next: 'right' },
  'wp-js-request': { cell: 'md:col-start-2 md:row-start-1', next: 'right' },
  'wp-admin-ajax': { cell: 'md:col-start-3 md:row-start-1', next: 'right' },
  'wp-hook-dispatch': { cell: 'md:col-start-4 md:row-start-1', next: 'down' },
  'wp-auth-branch': { cell: 'md:col-start-4 md:row-start-2', next: 'left' },
  'wp-callback': { cell: 'md:col-start-3 md:row-start-2', next: 'left' },
  'wp-response': { cell: 'md:col-start-2 md:row-start-2', next: 'left' },
  'wp-dom-update': { cell: 'md:col-start-1 md:row-start-2', next: null },
};

const LANE_HEADERS: Record<TrackMode, { label: string; span: string }[]> = {
  standalone: [
    { label: 'Browser', span: 'col-span-2' },
    { label: 'Network', span: '' },
    { label: 'Server', span: '' },
  ],
  wordpress: [
    { label: 'Browser', span: '' },
    { label: 'HTTP', span: '' },
    { label: 'WordPress (PHP)', span: 'col-span-2' },
  ],
};

const ARROW_POSITION: Record<Direction, string> = {
  right: 'md:-right-6 md:top-1/2 md:-translate-y-1/2',
  left: 'md:-left-6 md:top-1/2 md:-translate-y-1/2',
  down: 'md:-bottom-7 md:left-1/2 md:-translate-x-1/2',
};

const ARROW_ICON = { right: ArrowRight, left: ArrowLeft, down: ArrowDown };

const NODE_STYLE: Record<StageStatus, string> = {
  pending: 'border-line bg-surface',
  active: 'border-accent bg-accent-soft ring-2 ring-accent/30',
  complete: 'border-success/40 bg-surface',
  failed: 'border-danger bg-danger-soft ring-2 ring-danger/25',
  skipped: 'border-dashed border-line bg-surface-2',
};

function Connector({ direction, traversed }: { direction: Direction; traversed: boolean }) {
  const Icon = ARROW_ICON[direction];
  const tone = traversed ? 'text-accent' : 'text-line';
  return (
    <>
      <span aria-hidden className={`hidden md:absolute md:z-10 md:grid ${ARROW_POSITION[direction]} ${tone}`}>
        <Icon size={18} strokeWidth={2.5} />
      </span>
      <span aria-hidden className={`grid justify-center py-0.5 md:hidden ${tone}`}>
        <ArrowDown size={16} strokeWidth={2.5} />
      </span>
    </>
  );
}

export function LifecycleDiagram({ view }: { view: LifecycleView }) {
  const { selectStage, state, track } = useSimulation();

  return (
    <div>
      <div aria-hidden className="mb-2 hidden gap-x-8 text-xs font-semibold uppercase tracking-wide text-muted md:grid md:grid-cols-4">
        {LANE_HEADERS[track].map(({ label, span }) => (
          <p key={label} className={span}>
            {label}
          </p>
        ))}
      </div>

      <ol aria-label="Request lifecycle stages" className="grid gap-x-8 md:grid-cols-4 md:grid-rows-[1fr_1fr] md:gap-y-10">
        {view.stages.map(({ stage, index, status }) => {
          const layout = LAYOUT[stage.id];
          const selected = index === state.stageIndex;
          const isLast = index === view.stages.length - 1;
          return (
            <li key={stage.id} className={`relative flex flex-col ${layout?.cell ?? ''}`}>
              <button
                type="button"
                onClick={() => selectStage(index)}
                aria-current={selected ? 'step' : undefined}
                className={`flex h-full w-full flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors hover:border-accent/60 ${NODE_STYLE[status]}`}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="font-mono text-xs text-muted">{String(index + 1).padStart(2, '0')}</span>
                  <StageStatusLabel status={status} />
                </span>
                <span className="text-sm font-semibold leading-snug text-text">{stage.title}</span>
                <span className="text-xs text-muted">{ACTOR_LABELS[stage.actor]}</span>
              </button>
              {!isLast && (
                <Connector
                  direction={layout?.next ?? 'down'}
                  traversed={status === 'complete'}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
