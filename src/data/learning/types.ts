/** Shared content types for lessons (spec §11) and challenges (spec §14). */

export type SnippetLanguage = 'javascript' | 'php' | 'markup';

export interface Snippet {
  language: SnippetLanguage;
  code: string;
  /** Line-by-line walkthrough, 1-based line numbers. */
  notes?: { line: number; text: string }[];
}

/** Opens a scenario in a given state. */
export interface VisualLink {
  scenarioId: string;
  preset?: string;
  /** Zero-based stage index to jump to; omit to start playing. */
  stage?: number;
  /** Page to open; defaults to the AJAX Lab. */
  route?: '/' | '/wordpress' | '/network' | '/code';
}

interface TaskBase {
  question: string;
  code?: Snippet;
  /** Shown after every answer, right or wrong. */
  explanation: string;
}

export type Task =
  | (TaskBase & { kind: 'choice'; options: { text: string; feedback?: string }[]; answer: number })
  | (TaskBase & { kind: 'multi'; options: { text: string; feedback: string }[]; answers: number[] })
  | (TaskBase & { kind: 'text'; accept: string[]; placeholder?: string; hint: string })
  | (TaskBase & { kind: 'order'; /** Items in the correct order; they are shown shuffled. */ items: string[] })
  | (TaskBase & { kind: 'fill'; parts: { label: string; options: string[]; answer: number; feedback: string }[] })
  | (TaskBase & {
      kind: 'debug';
      /** The evidence comes from a real simulated execution, so it always matches the engine. */
      evidence: { scenarioId: string; preset?: string };
      options: { text: string; feedback?: string }[];
      answer: number;
    });

export interface Lesson {
  id: string;
  level: 1 | 2 | 3 | 4;
  title: string;
  objective: string;
  analogy: string;
  explanation: string[];
  visual: VisualLink & { caption: string };
  experiment: { steps: string[]; link: VisualLink; linkLabel: string };
  code: Snippet & { title: string };
  mistake: { title: string; code?: Snippet; consequence: string; fix: string };
  check: Extract<Task, { kind: 'choice' }>;
  challenge: Task;
}

export interface Level {
  level: Lesson['level'];
  title: string;
  description: string;
}

/** Normalise a short text answer: case, surrounding quotes/backticks, trailing semicolons, spacing. */
export function normalizeAnswer(value: string): string {
  return value
    .trim()
    .replace(/^[`'"]+|[`'";]+$/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function isTextAnswerCorrect(task: Extract<Task, { kind: 'text' }>, value: string): boolean {
  const answer = normalizeAnswer(value);
  return task.accept.some((accepted) => normalizeAnswer(accepted) === answer);
}

/** A stable shuffle, so the order is mixed but the same on every render. */
export function stableShuffle<T>(items: T[], seed: string): T[] {
  const hash = (text: string) => [...(seed + text)].reduce((value, char) => (Math.imul(value, 31) + char.charCodeAt(0)) | 0, 7);
  const shuffled = [...items].sort((a, b) => hash(String(a)) - hash(String(b)));
  // Never present the answer already solved.
  return shuffled.every((item, index) => item === items[index]) && items.length > 1 ? [...shuffled.slice(1), shuffled[0]!] : shuffled;
}
