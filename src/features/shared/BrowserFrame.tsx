import { RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';

/** Minimal browser chrome around a simulated page, with an address bar that shows whether the page navigated. */
export function BrowserFrame({ url, loading, children }: { url: string; loading?: boolean; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-2 py-1.5">
        <span aria-hidden className="flex gap-1">
          <span className="size-2 rounded-full bg-line" />
          <span className="size-2 rounded-full bg-line" />
          <span className="size-2 rounded-full bg-line" />
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-surface px-2 py-0.5 font-mono text-[11px] text-muted">
          {loading ? <RotateCw size={11} className="shrink-0 animate-spin" aria-hidden /> : null}
          <span className="truncate" aria-label="Address bar">
            {url}
          </span>
        </span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[10px] text-muted">{children}</span>;
}
