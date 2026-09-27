import { Loader, TriangleAlert, UserRound } from 'lucide-react';
import { useId, useState } from 'react';
import { useSimulation } from '../../app/providers/SimulationProvider';
import { finalResults, keystrokes, previousTerm, type SearchInput } from '../../data/scenarios/live-search';
import { TASKS, articlesOnPage, type DeleteInput, type PageInput, type UpdateInput } from '../../data/scenarios/more-standalone';
import { hasReached } from '../../engine/execution';
import type { Execution, Scenario } from '../../engine/types';
import { BrowserFrame, Tag } from '../shared/BrowserFrame';

/** Where the current run is, derived from the engine state. */
function useRun() {
  const { state, entry } = useSimulation();
  const scenario = entry?.scenario as Scenario | undefined;
  const execution = state.execution;
  const at = state.stageIndex;
  const failed = execution?.failureIndex != null && at >= execution.failureIndex;
  const done = !!scenario && execution !== null && !failed && hasReached(scenario, at, 'dom-updated');
  const busy = !!scenario && execution !== null && hasReached(scenario, at, 'request-created') && !done && !failed;
  const inProgress = execution !== null && state.status !== 'finished';
  return { execution, failed, done, busy, inProgress };
}

const buttonClass = 'h-8 rounded-md bg-accent px-3 text-sm font-medium text-on-accent hover:opacity-90 disabled:opacity-50';

// ─── Live search ───────────────────────────────────────────────────────────

export function SearchPlayground() {
  const { input, setInput, play } = useSimulation();
  const { execution, done, busy, inProgress } = useRun();
  const searchId = useId();
  const search = input as SearchInput;
  const previous = previousTerm(search.query);
  const final = done && execution ? finalResults(execution as Execution, search) : null;

  return (
    <div className="space-y-3">
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={search.cancelStale}
          onChange={(event) => setInput({ ...search, cancelStale: event.target.checked })}
          className="mt-0.5 size-4 accent-[var(--accent)]"
        />
        <span>
          Cancel outdated requests <span className="text-muted">(AbortController)</span>
        </span>
      </label>

      <BrowserFrame url="ajax-lab.test/shop">
        <div className="space-y-3">
          <div className="space-y-1">
            <label htmlFor={searchId} className="flex justify-between text-xs font-medium">
              Search products <Tag>#search</Tag>
            </label>
            <input
              id={searchId}
              value={search.query}
              spellCheck={false}
              onChange={(event) => setInput({ ...search, query: event.target.value })}
              className="h-8 w-full rounded-md border border-line bg-surface px-2 text-sm"
            />
          </div>

          <ol aria-label="Keystrokes" className="flex flex-wrap gap-1.5 text-[11px]">
            {keystrokes(search.query).map(({ text, sent }, index, all) => {
              const last = index === all.length - 1;
              const label = !sent ? 'timer reset' : last ? 'request followed below' : search.cancelStale ? 'sent, then aborted' : 'sent — slow response';
              return (
                <li key={text} className={`rounded-md border px-1.5 py-0.5 ${sent && !last && !search.cancelStale ? 'border-warning bg-warning-soft' : 'border-line'}`}>
                  <span className="font-mono">“{text}”</span> <span className="text-muted">{label}</span>
                </li>
              );
            })}
          </ol>

          <button type="button" onClick={play} disabled={inProgress || search.query.trim().length < 2} className={buttonClass}>
            Pause typing (search)
          </button>

          <div className="space-y-1.5 rounded-md border border-line p-2.5 text-sm" aria-busy={busy}>
            <div className="flex justify-end">
              <Tag>#results</Tag>
            </div>
            {final ? (
              <>
                {final.stale && (
                  <p className="flex gap-1.5 text-xs text-warning">
                    <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden />
                    The slower response for “{previous}” arrived after the one for “{search.query}” and replaced it. These results do not match what was typed.
                  </p>
                )}
                {final.results.length ? (
                  <ul className="list-disc pl-5">
                    {final.results.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted">No matches.</p>
                )}
              </>
            ) : busy ? (
              <p className="flex items-center gap-2 text-muted">
                <Loader size={14} className="animate-spin" aria-hidden /> Searching…
              </p>
            ) : (
              <p className="text-muted">Results appear here.</p>
            )}
          </div>
        </div>
      </BrowserFrame>
    </div>
  );
}

// ─── Update a record ───────────────────────────────────────────────────────

export function UpdatePlayground() {
  const { input, setInput, play } = useSimulation();
  const { execution, failed, done, busy, inProgress } = useRun();
  const roleId = useId();
  const form = input as UpdateInput;
  const saved = done && execution ? (execution.parsedBody as { role: string }).role : 'Frontend Developer';
  const error = failed && execution?.response?.status === 422 ? (execution.parsedBody as { errors: { role: string } }).errors.role : null;

  return (
    <BrowserFrame url="ajax-lab.test/team/maya">
      <div className="space-y-3">
        <div className="flex items-center gap-2.5 rounded-md border border-line p-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
            <UserRound size={18} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Maya Chen</p>
            <p className="truncate text-xs text-muted">{saved}</p>
          </div>
          <span className="ml-auto">
            <Tag>#profile-card</Tag>
          </span>
        </div>
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!inProgress) play();
          }}
        >
          <label htmlFor={roleId} className="text-xs font-medium">
            Role
          </label>
          <input
            id={roleId}
            value={form.role}
            aria-invalid={!!error}
            onChange={(event) => setInput({ role: event.target.value })}
            className="h-8 w-full rounded-md border border-line bg-surface px-2 text-sm aria-invalid:border-danger"
          />
          {error && <p className="text-xs text-danger">{error}</p>}
          <button type="submit" disabled={inProgress} className={buttonClass}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>
    </BrowserFrame>
  );
}

// ─── Delete a record ───────────────────────────────────────────────────────

export function DeletePlayground() {
  const { input, setInput } = useSimulation();
  const { execution, failed, done, busy, inProgress } = useRun();
  const [confirming, setConfirming] = useState<number | null>(null);
  const config = input as DeleteInput;
  const removed = execution && (done || (failed && execution.response?.status === 404)) ? config.taskId : null;

  return (
    <div className="space-y-3">
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={config.alreadyDeleted}
          onChange={(event) => setInput({ ...config, alreadyDeleted: event.target.checked })}
          className="mt-0.5 size-4 accent-[var(--accent)]"
        />
        <span>Someone already deleted the task in another tab</span>
      </label>
      <BrowserFrame url="ajax-lab.test/tasks">
        <div className="space-y-2">
          <div className="flex justify-between">
            <p className="text-sm font-semibold">Tasks</p>
            <Tag>#tasks</Tag>
          </div>
          <ul className="space-y-1.5">
            {TASKS.filter((task) => task.id !== removed).map((task) => (
              <li key={task.id} className="space-y-1.5 rounded-md border border-line p-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">{task.title}</span>
                  {busy && config.taskId === task.id ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted">
                      <Loader size={12} className="animate-spin" aria-hidden /> Deleting…
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={inProgress}
                      onClick={() => setConfirming(task.id)}
                      className="rounded-md border border-line px-2 py-0.5 text-xs hover:bg-danger-soft hover:text-danger disabled:opacity-40"
                    >
                      Delete
                    </button>
                  )}
                </div>
                {confirming === task.id && (
                  <div role="alertdialog" aria-label={`Delete ${task.title}?`} className="flex flex-wrap items-center gap-2 rounded-md bg-surface-2 p-2 text-xs">
                    Delete “{task.title}”? This cannot be undone.
                    <button
                      type="button"
                      onClick={() => {
                        setConfirming(null);
                        setInput({ ...config, taskId: task.id }, { play: true });
                      }}
                      className="rounded-md bg-danger px-2 py-0.5 font-medium text-surface"
                    >
                      Delete
                    </button>
                    <button type="button" onClick={() => setConfirming(null)} className="rounded-md border border-line px-2 py-0.5">
                      Cancel
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {removed !== null && failed && <p className="text-xs text-warning">That task had already been deleted, so its row was removed.</p>}
        </div>
      </BrowserFrame>
    </div>
  );
}

// ─── Load more ─────────────────────────────────────────────────────────────

export function LoadMorePlayground() {
  const { input, setInput, play } = useSimulation();
  const { execution, done, busy, inProgress } = useRun();
  const { page } = input as PageInput;
  const existing = Array.from({ length: page - 1 }, (_, index) => articlesOnPage(index + 1)).flat();
  const data = done && execution ? (execution.parsedBody as { items: string[]; hasMore: boolean }) : null;
  const hasMore = data ? data.hasMore : true;

  const loadNext = () => {
    if (!execution) play();
    else setInput({ page: page + 1 }, { play: true });
  };

  return (
    <BrowserFrame url="ajax-lab.test/articles">
      <div className="space-y-2">
        <div className="flex justify-between">
          <p className="text-sm font-semibold">Articles</p>
          <Tag>#articles</Tag>
        </div>
        <ol className="list-decimal space-y-0.5 pl-5 text-sm">
          {existing.map((title) => (
            <li key={title}>{title}</li>
          ))}
          {data?.items.map((title) => (
            <li key={title} className="rounded bg-accent-soft px-1">
              {title} <span className="text-[11px] text-muted">new</span>
            </li>
          ))}
        </ol>
        {busy && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Loader size={14} className="animate-spin" aria-hidden /> Loading page {page}…
          </p>
        )}
        {hasMore ? (
          <button type="button" onClick={loadNext} disabled={inProgress} className={buttonClass}>
            Load more <Tag>#load-more</Tag>
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            No more articles.
            <button type="button" onClick={() => setInput({ page: 2 })} className="text-accent underline">
              Start over
            </button>
          </div>
        )}
      </div>
    </BrowserFrame>
  );
}
