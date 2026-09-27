import { ArrowLeftRight, Loader, UserRound } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { useSimulation } from '../../../app/providers/SimulationProvider';
import { PROFILE_OPTIONS, PROFILES, type LoadProfileInput, type Profile } from '../../../data/scenarios/load-profile';
import { hasReached } from '../../../engine/execution';
import { BrowserFrame, Tag } from '../../shared/BrowserFrame';

type ReloadPhase = 'off' | 'loading' | 'done';

/**
 * A small page the learner operates. The profile card is rendered from the
 * engine state — it changes only when the run reaches the DOM-update stage.
 */
export function ProfilePlayground() {
  const { state, entry, input, setInput, play, reset } = useSimulation();
  const selectId = useId();
  const notesId = useId();
  const [notes, setNotes] = useState('');
  const [reload, setReload] = useState<ReloadPhase>('off');
  const { userId } = input as LoadProfileInput;

  useEffect(() => {
    if (reload !== 'loading') return;
    const timeout = window.setTimeout(() => setReload('done'), 1400);
    return () => window.clearTimeout(timeout);
  }, [reload]);

  if (!entry) return null;
  const scenario = entry.scenario;
  const execution = state.execution;
  const at = state.stageIndex;
  const current = scenario.stages[at];
  const failed = execution?.failureIndex != null && at >= execution.failureIndex;
  const updated = execution !== null && !failed && hasReached(scenario, at, 'dom-updated');
  const busy = execution !== null && hasReached(scenario, at, 'request-created') && !updated && !failed;
  const inProgress = execution !== null && state.status !== 'finished';
  const profile = updated ? (execution!.parsedBody as Profile) : null;

  function startReload() {
    reset();
    setNotes('');
    setReload('loading');
  }

  if (reload !== 'off') {
    const reloadedProfile = PROFILES[userId];
    return (
      <div className="space-y-3">
        <p className="text-xs font-medium text-warning">Illustration: traditional navigation (not part of the lifecycle simulation)</p>
        <BrowserFrame url={`ajax-lab.test/team?profile=${userId}`} loading={reload === 'loading'}>
          {reload === 'loading' ? (
            <div className="grid h-48 place-items-center text-center text-sm text-muted">
              <p>
                <Loader size={18} className="mx-auto mb-2 animate-spin" aria-hidden />
                The browser throws the current page away and downloads a whole new HTML document…
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold">Team directory</p>
              <div className="rounded-md border border-line p-2 text-sm">
                {reloadedProfile ? (
                  <>
                    <p className="font-medium">{reloadedProfile.name}</p>
                    <p className="text-muted">{reloadedProfile.role}</p>
                  </>
                ) : (
                  <p className="text-muted">404 — the server rendered an error page instead.</p>
                )}
              </div>
              <p className="rounded-md border border-dashed border-line p-2 text-xs text-muted">Your notes: (empty — lost in the reload)</p>
            </div>
          )}
        </BrowserFrame>
        {reload === 'done' && (
          <p className="text-sm leading-relaxed text-muted">
            The address changed, the screen went blank, and the <strong className="text-text">whole page</strong> was rebuilt from new HTML.
            Your note was lost. With AJAX, only the profile card changes and everything else stays as it was.
          </p>
        )}
        <button
          type="button"
          onClick={() => setReload('off')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-sm hover:bg-surface-2"
        >
          <ArrowLeftRight size={14} aria-hidden /> Back to the AJAX version
        </button>
      </div>
    );
  }

  const clickHighlighted = current?.id === 'user-action';
  const cardHighlighted = current?.visualState === 'dom-updated' || current?.id === 'js-handles-response';

  return (
    <div className="space-y-3">
      <BrowserFrame url="ajax-lab.test/team">
        <div className="space-y-3">
          <p className="text-sm font-semibold">Team directory</p>

          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[9rem] flex-1 space-y-1">
              <label htmlFor={selectId} className="flex items-center justify-between gap-2 text-xs font-medium">
                Profile <Tag>#profile-id</Tag>
              </label>
              <select
                id={selectId}
                value={userId}
                onChange={(event) => setInput({ userId: Number(event.target.value) })}
                className="h-8 w-full rounded-md border border-line bg-surface px-1.5 text-sm"
              >
                {PROFILE_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={play}
              disabled={inProgress}
              title={inProgress ? 'A request is already in progress' : undefined}
              className={`h-8 rounded-md bg-accent px-3 text-sm font-medium text-on-accent hover:opacity-90 disabled:opacity-50 ${
                clickHighlighted ? 'ring-4 ring-accent/35' : ''
              }`}
            >
              Load Profile
            </button>
          </div>

          <div
            aria-busy={busy}
            className={`rounded-md border p-2.5 transition-shadow ${cardHighlighted ? 'border-accent ring-4 ring-accent/25' : 'border-line'}`}
          >
            <div className="mb-1 flex justify-end">
              <Tag>#profile-card</Tag>
            </div>
            {profile ? (
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                  <UserRound size={18} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{profile.name}</p>
                  <p className="truncate text-xs text-muted">{profile.role}</p>
                </div>
              </div>
            ) : failed ? (
              <p className="text-sm text-danger">Could not load the profile.</p>
            ) : busy ? (
              <p className="flex items-center gap-2 text-sm text-muted">
                <Loader size={14} className="animate-spin" aria-hidden /> Loading… <Tag>aria-busy="true"</Tag>
              </p>
            ) : (
              <p className="text-sm text-muted">No profile loaded.</p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor={notesId} className="text-xs font-medium">
              Your notes <span className="font-normal text-muted">(type something, then load a profile)</span>
            </label>
            <input
              id={notesId}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="h-8 w-full rounded-md border border-line bg-surface px-2 text-sm"
            />
          </div>
        </div>
      </BrowserFrame>

      <div className="flex flex-wrap gap-2 text-sm">
        <button
          type="button"
          onClick={startReload}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 hover:bg-surface-2"
        >
          <ArrowLeftRight size={14} aria-hidden /> Compare with a full page reload
        </button>
      </div>
    </div>
  );
}
