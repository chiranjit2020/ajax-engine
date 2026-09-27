import { CheckCircle2, Circle, Lock } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useProgress } from '../app/providers/ProgressProvider';
import { LESSONS, LEVELS, UNLOCK_THRESHOLD, isLevelUnlocked, lessonsInLevel } from '../data/learning/lessons';

export function ProgressBar({ done, total, label }: { done: number; total: number; label: string }) {
  const percent = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted">
        <span>{label}</span>
        <span>
          {done} of {total}
        </span>
      </div>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} className="h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function ResetProgressButton() {
  const { reset } = useProgress();
  const [confirming, setConfirming] = useState(false);
  return confirming ? (
    <span className="inline-flex flex-wrap items-center gap-2 text-sm">
      Reset all lessons and challenges?
      <button
        type="button"
        onClick={() => {
          reset();
          setConfirming(false);
        }}
        className="rounded-lg bg-danger px-2.5 py-1 font-medium text-surface"
      >
        Reset
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="rounded-lg border border-line px-2.5 py-1">
        Cancel
      </button>
    </span>
  ) : (
    <button type="button" onClick={() => setConfirming(true)} className="text-sm text-muted underline hover:text-text">
      Reset progress
    </button>
  );
}

/** Curriculum overview (spec §11): four levels, local progress, and level unlocking. */
export function LearnPage() {
  const { progress } = useProgress();
  const completed = LESSONS.filter((lesson) => progress.lessons[lesson.id]).length;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-3 sm:p-4">
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Learn</h1>
        <p className="text-sm text-muted">
          Twenty short lessons, from “what is AJAX?” to a complete WordPress feature. Each one links to the simulator. Progress is saved in this
          browser only.
        </p>
        <ProgressBar done={completed} total={LESSONS.length} label="Lessons completed" />
        <ResetProgressButton />
      </div>

      {LEVELS.map(({ level, title, description }) => {
        const lessons = lessonsInLevel(level);
        const unlocked = isLevelUnlocked(level, progress.lessons);
        const done = lessons.filter((lesson) => progress.lessons[lesson.id]).length;
        return (
          <section key={level} aria-labelledby={`level-${level}`} className="min-w-0 space-y-3 rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 id={`level-${level}`} className="text-base font-semibold">
                  Level {level} — {title}
                </h2>
                <p className="text-sm text-muted">{description}</p>
              </div>
              <span className="text-xs text-muted">
                {done}/{lessons.length} complete
              </span>
            </div>
            {!unlocked && (
              <p className="flex items-center gap-1.5 rounded-lg bg-surface-2 p-2.5 text-sm text-muted">
                <Lock size={14} aria-hidden /> Complete {UNLOCK_THRESHOLD} lessons in Level {level - 1} to unlock this level.
              </p>
            )}
            <ol className="space-y-1.5">
              {lessons.map((lesson, index) => {
                const complete = Boolean(progress.lessons[lesson.id]);
                const content = (
                  <>
                    <span className="w-8 shrink-0 font-mono text-xs text-muted">
                      {level}.{index + 1}
                    </span>
                    <span className="min-w-0 flex-1">{lesson.title}</span>
                    {complete ? (
                      <CheckCircle2 size={16} className="shrink-0 text-success" aria-label="Completed" />
                    ) : unlocked ? (
                      <Circle size={16} className="shrink-0 text-muted" aria-label="Not completed" />
                    ) : (
                      <Lock size={15} className="shrink-0 text-muted" aria-label="Locked" />
                    )}
                  </>
                );
                return (
                  <li key={lesson.id}>
                    {unlocked ? (
                      <Link to={`/learn/${lesson.id}`} className="flex items-center gap-2 rounded-lg border border-line p-2.5 text-sm hover:border-accent/60 hover:bg-surface-2">
                        {content}
                      </Link>
                    ) : (
                      <span className="flex items-center gap-2 rounded-lg border border-dashed border-line p-2.5 text-sm text-muted">{content}</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
