import { CheckCircle2, ExternalLink } from 'lucide-react';
import { useProgress } from '../app/providers/ProgressProvider';
import { TaskRunner } from '../components/learning/TaskRunner';
import { CATEGORIES, CHALLENGES } from '../data/learning/challenges';
import { useOpenVisual } from '../hooks/useOpenVisual';
import { ProgressBar, ResetProgressButton } from './LearnPage';

/** Challenges A–F (spec §14), with immediate explanations and locally tracked attempts. */
export function ChallengesPage() {
  const { progress, recordAttempt } = useProgress();
  const openVisual = useOpenVisual();
  const solved = CHALLENGES.filter((challenge) => progress.challenges[challenge.id]?.solved).length;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-3 sm:p-4">
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Quiz &amp; Challenges</h1>
        <p className="text-sm text-muted">Practical problems based on what the simulator shows. Every answer gets an explanation.</p>
        <ProgressBar done={solved} total={CHALLENGES.length} label="Challenges solved" />
        <ResetProgressButton />
      </div>

      {CATEGORIES.map((category) => (
        <section key={category.id} aria-labelledby={`cat-${category.id}`} className="space-y-3">
          <div>
            <h2 id={`cat-${category.id}`} className="text-base font-semibold">
              {category.letter}. {category.title}
            </h2>
            <p className="text-sm text-muted">{category.description}</p>
          </div>
          {CHALLENGES.filter((challenge) => challenge.category === category.id).map((challenge) => {
            const record = progress.challenges[challenge.id];
            return (
              <details key={challenge.id} className="group min-w-0 rounded-xl border border-line bg-surface">
                <summary className="flex items-center justify-between gap-2 p-4 text-sm font-medium">
                  <span>{challenge.title}</span>
                  <span className="flex shrink-0 items-center gap-2 text-xs font-normal text-muted">
                    {record && `${record.attempts} attempt${record.attempts === 1 ? '' : 's'}`}
                    {record?.solved && <CheckCircle2 size={16} className="text-success" aria-label="Solved" />}
                  </span>
                </summary>
                <div className="space-y-3 border-t border-line p-4">
                  <TaskRunner task={challenge.task} seed={challenge.id} onAttempt={(correct) => recordAttempt(challenge.id, correct)} />
                  {challenge.explore && (
                    <button
                      type="button"
                      onClick={() => openVisual(challenge.explore!)}
                      className="inline-flex items-center gap-1.5 text-sm text-accent underline"
                    >
                      <ExternalLink size={14} aria-hidden /> {challenge.explore.label}
                    </button>
                  )}
                </div>
              </details>
            );
          })}
        </section>
      ))}
    </div>
  );
}
