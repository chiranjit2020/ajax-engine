import type { LogLevel } from '../../engine/types';
import type { LifecycleView } from '../../hooks/useLifecycleView';

const LEVEL: Record<LogLevel, { tag: string; className: string }> = {
  info: { tag: 'info', className: 'text-muted' },
  success: { tag: 'done', className: 'text-success' },
  warning: { tag: 'warn', className: 'text-warning' },
  error: { tag: 'error', className: 'text-danger' },
};

export function ConsoleTab({ view }: { view: LifecycleView }) {
  if (view.log.length === 0) {
    return <p className="p-3 text-sm text-muted">No events yet. Start the simulation to see lifecycle events here.</p>;
  }
  return (
    <ol className="space-y-1 p-3 font-mono text-xs leading-relaxed">
      {view.log.map((entry) => (
        <li key={entry.stageId} className="grid grid-cols-[3.5rem_3rem_1fr] gap-2">
          <span className="text-muted">{(entry.atMs / 1000).toFixed(1)}s</span>
          <span className={`font-semibold ${LEVEL[entry.level].className}`}>{LEVEL[entry.level].tag}</span>
          <span className="min-w-0 break-words text-text">{entry.message}</span>
        </li>
      ))}
    </ol>
  );
}
