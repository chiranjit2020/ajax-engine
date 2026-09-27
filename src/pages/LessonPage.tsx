import { ArrowLeft, ArrowRight, CheckCircle2, Eye, Lock, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { useProgress } from '../app/providers/ProgressProvider';
import { Snippet } from '../components/learning/Snippet';
import { TaskRunner } from '../components/learning/TaskRunner';
import { LESSONS, LEVELS, UNLOCK_THRESHOLD, isLevelUnlocked } from '../data/learning/lessons';
import { useOpenVisual } from '../hooks/useOpenVisual';

function Part({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`part-${number}`} className="min-w-0 space-y-2.5 rounded-xl border border-line bg-surface p-4">
      <h2 id={`part-${number}`} className="flex items-baseline gap-2 text-base font-semibold">
        <span className="font-mono text-xs text-muted">{number}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** One lesson in the eight-part format from spec §11. */
export function LessonPage() {
  const { lessonId } = useParams();
  const { progress, completeLesson, recordAttempt } = useProgress();
  const openVisual = useOpenVisual();
  const index = LESSONS.findIndex((lesson) => lesson.id === lessonId);
  const lesson = LESSONS[index];

  if (!lesson) {
    return (
      <div className="space-y-2 p-4 text-sm">
        <h1 className="text-lg font-semibold">Lesson not found</h1>
        <Link to="/learn" className="text-accent underline">
          Back to all lessons
        </Link>
      </div>
    );
  }

  const level = LEVELS.find((item) => item.level === lesson.level)!;
  if (!isLevelUnlocked(lesson.level, progress.lessons)) {
    return (
      <div className="mx-auto max-w-xl space-y-3 p-4">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <Lock size={16} aria-hidden /> {lesson.title}
        </h1>
        <p className="text-sm text-muted">
          This lesson is in Level {lesson.level}. Complete {UNLOCK_THRESHOLD} lessons in Level {lesson.level - 1} to unlock it.
        </p>
        <Link to="/learn" className="text-sm text-accent underline">
          Back to all lessons
        </Link>
      </div>
    );
  }

  const complete = Boolean(progress.lessons[lesson.id]);
  const previous = LESSONS[index - 1];
  const next = LESSONS[index + 1];
  const nextUnlocked = next ? isLevelUnlocked(next.level, progress.lessons) : false;
  const numberInLevel = LESSONS.filter((item) => item.level === lesson.level).indexOf(lesson) + 1;

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-3 sm:p-4">
      <header className="space-y-1">
        <Link to="/learn" className="inline-flex items-center gap-1 text-sm text-muted hover:text-text">
          <ArrowLeft size={14} aria-hidden /> All lessons
        </Link>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Level {lesson.level} · {level.title} · Lesson {lesson.level}.{numberInLevel}
        </p>
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold">
          {lesson.title}
          {complete && (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-success">
              <CheckCircle2 size={16} aria-hidden /> Completed
            </span>
          )}
        </h1>
      </header>

      <Part number={1} title="What you will learn">
        <p className="text-sm">{lesson.objective}</p>
      </Part>

      <Part number={2} title="In plain English">
        <p className="rounded-lg border-l-4 border-accent bg-accent-soft p-3 text-sm leading-relaxed">{lesson.analogy}</p>
        {lesson.explanation.map((paragraph, i) => (
          <p key={i} className="text-sm leading-relaxed">
            {paragraph}
          </p>
        ))}
      </Part>

      <Part number={3} title="See it">
        <p className="text-sm text-muted">{lesson.visual.caption}</p>
        <button
          type="button"
          onClick={() => openVisual(lesson.visual)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent hover:opacity-90"
        >
          <Eye size={15} aria-hidden /> Show me visually
        </button>
      </Part>

      <Part number={4} title="Try it yourself">
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {lesson.experiment.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => openVisual(lesson.experiment.link)}
          className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-surface-2"
        >
          {lesson.experiment.linkLabel}
        </button>
      </Part>

      <Part number={5} title="Code walkthrough">
        <Snippet snippet={lesson.code} title={lesson.code.title} />
      </Part>

      <Part number={6} title={`Common mistake: ${lesson.mistake.title}`}>
        {lesson.mistake.code && <Snippet snippet={lesson.mistake.code} />}
        <p className="flex gap-2 text-sm">
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-warning" aria-hidden />
          <span>{lesson.mistake.consequence}</span>
        </p>
        <p className="text-sm">
          <strong>Fix:</strong> {lesson.mistake.fix}
        </p>
      </Part>

      <Part number={7} title="Check your understanding">
        <TaskRunner
          key={`${lesson.id}-check`}
          task={lesson.check}
          seed={lesson.id}
          onAttempt={(correct) => correct && completeLesson(lesson.id)}
        />
        {!complete && <p className="text-xs text-muted">Answer correctly to complete the lesson.</p>}
      </Part>

      <Part number={8} title="Practical challenge">
        <TaskRunner key={`${lesson.id}-challenge`} task={lesson.challenge} seed={lesson.id} onAttempt={(correct) => recordAttempt(`lesson:${lesson.id}`, correct)} />
      </Part>

      <nav aria-label="Lesson navigation" className="flex flex-wrap justify-between gap-2">
        {previous ? (
          <Link to={`/learn/${previous.id}`} className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-surface-2">
            <ArrowLeft size={14} aria-hidden /> {previous.title}
          </Link>
        ) : (
          <span />
        )}
        {next &&
          (nextUnlocked ? (
            <Link to={`/learn/${next.id}`} className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-surface-2">
              {next.title} <ArrowRight size={14} aria-hidden />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 text-sm text-muted">
              <Lock size={14} aria-hidden /> Next level locked
            </span>
          ))}
      </nav>
    </article>
  );
}
