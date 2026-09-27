import { getScenarioEntry } from '../scenarios';
import { resolveExecution } from '../../engine/execution';
import { CATEGORIES, CHALLENGES } from './challenges';
import { LESSONS, LEVELS, isLevelUnlocked } from './lessons';
import { REFERENCE } from './reference';
import { isTextAnswerCorrect, normalizeAnswer, stableShuffle, type Task, type VisualLink } from './types';

function expectValidLink(link: VisualLink) {
  const entry = getScenarioEntry(link.scenarioId);
  expect(entry, link.scenarioId).toBeDefined();
  if (link.preset) expect(entry!.scenario.presets?.[link.preset], `${link.scenarioId}:${link.preset}`).toBeDefined();
  if (link.stage !== undefined) {
    expect(link.stage).toBeGreaterThanOrEqual(0);
    expect(link.stage).toBeLessThan(entry!.scenario.stages.length);
  }
}

function expectValidTask(task: Task) {
  switch (task.kind) {
    case 'choice':
    case 'debug':
      expect(task.answer).toBeLessThan(task.options.length);
      if (task.kind === 'debug') expectValidLink(task.evidence);
      break;
    case 'multi':
      for (const answer of task.answers) expect(answer).toBeLessThan(task.options.length);
      break;
    case 'text':
      expect(task.accept.length).toBeGreaterThan(0);
      expect(isTextAnswerCorrect(task, task.accept[0]!)).toBe(true);
      break;
    case 'order':
      expect(new Set(task.items).size).toBe(task.items.length);
      break;
    case 'fill':
      for (const part of task.parts) expect(part.answer).toBeLessThan(part.options.length);
      break;
  }
  expect(task.explanation.length).toBeGreaterThan(0);
}

describe('curriculum (spec §11)', () => {
  it('has four levels of five lessons with unique IDs', () => {
    expect(LEVELS).toHaveLength(4);
    for (const { level } of LEVELS) expect(LESSONS.filter((lesson) => lesson.level === level)).toHaveLength(5);
    expect(new Set(LESSONS.map((lesson) => lesson.id)).size).toBe(LESSONS.length);
  });

  it.each(LESSONS.map((lesson) => [lesson.id, lesson] as const))('%s links to real scenarios and has valid tasks', (_id, lesson) => {
    expectValidLink(lesson.visual);
    expectValidLink(lesson.experiment.link);
    expectValidTask(lesson.check);
    expectValidTask(lesson.challenge);
    expect(lesson.explanation.length).toBeGreaterThan(0);
    expect(lesson.experiment.steps.length).toBeGreaterThan(0);
    for (const note of lesson.code.notes ?? []) expect(note.line).toBeLessThanOrEqual(lesson.code.code.split('\n').length);
  });

  it('unlocks a level after three lessons of the previous level', () => {
    const level1 = LESSONS.filter((lesson) => lesson.level === 1).map((lesson) => lesson.id);
    expect(isLevelUnlocked(2, {})).toBe(false);
    expect(isLevelUnlocked(2, Object.fromEntries(level1.slice(0, 2).map((id) => [id, true])))).toBe(false);
    expect(isLevelUnlocked(2, Object.fromEntries(level1.slice(0, 3).map((id) => [id, true])))).toBe(true);
    expect(isLevelUnlocked(3, Object.fromEntries(level1.map((id) => [id, true])))).toBe(false);
  });
});

describe('challenges (spec §14)', () => {
  it('covers every category A–F', () => {
    for (const category of CATEGORIES) expect(CHALLENGES.some((challenge) => challenge.category === category.id), category.id).toBe(true);
  });

  it.each(CHALLENGES.map((challenge) => [challenge.id, challenge] as const))('%s is valid', (_id, challenge) => {
    expectValidTask(challenge.task);
    if (challenge.explore) expectValidLink(challenge.explore);
  });

  it('debug evidence really shows the failure each answer describes', () => {
    const evidence = (id: string) => {
      const task = CHALLENGES.find((challenge) => challenge.id === id)!.task as Extract<Task, { kind: 'debug' }>;
      const entry = getScenarioEntry(task.evidence.scenarioId)!;
      return resolveExecution(entry.scenario, entry.scenario.presets![task.evidence.preset!]!.input);
    };
    expect(evidence('debug-invalid-json')).toMatchObject({ failure: { kind: 'parse-error' }, response: { status: 200 } });
    expect(evidence('debug-zero')).toMatchObject({ response: { status: 400, rawBody: '0' } });
    expect(evidence('debug-zero').tags).toContain('logged-out-no-hook');
    expect(evidence('debug-404')).toMatchObject({ failure: { kind: 'http-error' }, response: { status: 404 } });
  });
});

describe('helpers', () => {
  it('normalizes short answers', () => {
    expect(normalizeAnswer('  `fetch()`; ')).toBe('fetch()');
    expect(normalizeAnswer('WP_AJAX_Load_Cart')).toBe('wp_ajax_load_cart');
  });

  it('shuffles deterministically and never presents the solved order', () => {
    const items = ['a', 'b', 'c', 'd'];
    expect(stableShuffle(items, 'x')).toEqual(stableShuffle(items, 'x'));
    expect(stableShuffle(items, 'x')).not.toEqual(items);
    expect([...stableShuffle(items, 'x')].sort()).toEqual(items);
  });

  it('has reference entries with unique IDs', () => {
    const ids = REFERENCE.flatMap((group) => group.entries.map((entry) => entry.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
