import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { readStored, writeStored } from '../../utils/storage';

/**
 * Learner progress, stored only in this browser (spec §14: no accounts, no
 * backend). If storage is unavailable, progress still works for the session.
 */
export interface Progress {
  lessons: Record<string, { completedAt: string }>;
  challenges: Record<string, { attempts: number; solved: boolean }>;
}

const EMPTY: Progress = { lessons: {}, challenges: {} };
const KEY = 'progress';

function load(): Progress {
  try {
    const parsed = JSON.parse(readStored(KEY) ?? 'null') as Progress | null;
    return parsed && typeof parsed === 'object' ? { lessons: parsed.lessons ?? {}, challenges: parsed.challenges ?? {} } : EMPTY;
  } catch {
    return EMPTY;
  }
}

interface ProgressContextValue {
  progress: Progress;
  completeLesson(id: string): void;
  recordAttempt(challengeId: string, correct: boolean): void;
  reset(): void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<Progress>(load);

  const update = useCallback((next: (current: Progress) => Progress) => {
    setProgress((current) => {
      const value = next(current);
      writeStored(KEY, JSON.stringify(value));
      return value;
    });
  }, []);

  const value = useMemo<ProgressContextValue>(
    () => ({
      progress,
      completeLesson: (id) =>
        update((current) =>
          current.lessons[id] ? current : { ...current, lessons: { ...current.lessons, [id]: { completedAt: new Date().toISOString() } } },
        ),
      recordAttempt: (challengeId, correct) =>
        update((current) => {
          const previous = current.challenges[challengeId] ?? { attempts: 0, solved: false };
          return {
            ...current,
            challenges: { ...current.challenges, [challengeId]: { attempts: previous.attempts + 1, solved: previous.solved || correct } },
          };
        }),
      reset: () => update(() => EMPTY),
    }),
    [progress, update],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const context = useContext(ProgressContext);
  if (!context) throw new Error('useProgress must be used inside ProgressProvider');
  return context;
}
