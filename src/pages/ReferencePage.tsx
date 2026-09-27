import { Search } from 'lucide-react';
import { useId, useState } from 'react';
import { ReferenceEntryView } from '../components/learning/ReferenceEntry';
import { REFERENCE } from '../data/learning/reference';

/** Quick reference (spec §4): APIs, status codes, WordPress functions, and common errors, with search. */
export function ReferencePage() {
  const [query, setQuery] = useState('');
  const searchId = useId();
  const needle = query.trim().toLowerCase();
  const groups = REFERENCE.map((group) => ({
    ...group,
    entries: group.entries.filter((entry) => !needle || `${entry.term} ${entry.summary} ${entry.details ?? ''}`.toLowerCase().includes(needle)),
  })).filter((group) => group.entries.length);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-3 sm:p-4">
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Quick Reference</h1>
        <div className="relative max-w-md">
          <label htmlFor={searchId} className="sr-only">
            Search the reference
          </label>
          <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search: nonce, 403, fetch, CORS…"
            className="h-9 w-full rounded-lg border border-line bg-surface pl-8 pr-2 text-sm"
          />
        </div>
      </div>

      {groups.length === 0 && <p className="text-sm text-muted">Nothing matches “{query}”.</p>}
      {groups.map((group) => (
        <section key={group.id} aria-labelledby={`ref-${group.id}`} className="min-w-0 space-y-2">
          <h2 id={`ref-${group.id}`} className="text-base font-semibold">
            {group.title}
          </h2>
          <dl className="divide-y divide-line rounded-xl border border-line bg-surface">
            {group.entries.map((entry) => (
              <div key={entry.id} className="grid gap-1.5 p-4 md:grid-cols-[14rem_minmax(0,1fr)] md:gap-4">
                <dt className="font-mono text-sm font-semibold [overflow-wrap:anywhere]">{entry.term}</dt>
                <dd className="min-w-0">
                  <ReferenceEntryView entry={entry} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
