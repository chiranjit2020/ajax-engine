import type { ReferenceEntry } from '../../data/learning/reference';
import { Snippet } from './Snippet';

export function ReferenceEntryView({ entry }: { entry: ReferenceEntry }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm">{entry.summary}</p>
      {entry.details && <p className="text-sm text-muted">{entry.details}</p>}
      {entry.example && <Snippet snippet={entry.example} />}
    </div>
  );
}
