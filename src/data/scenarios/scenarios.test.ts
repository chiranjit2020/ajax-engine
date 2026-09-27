import { linesForStage } from '../../engine/code-ranges';
import { resolveExecution } from '../../engine/execution';
import { SCENARIOS, resolveSource } from './index';

describe.each(SCENARIOS.map((entry) => [entry.scenario.id, entry] as const))('scenario %s', (_id, entry) => {
  const stageIds = [...new Set(entry.scenario.stages.map((stage) => stage.id))];
  const files = entry.code.map((file) => [file.label, resolveSource(file, entry.scenario.defaultInput)] as const);
  const successTags = resolveExecution(entry.scenario, entry.scenario.defaultInput).tags;

  it('has a default input that succeeds', () => {
    expect(successTags).toContain('success');
  });

  it.each(files)('%s markers reference only real stages', (_label, source) => {
    for (const range of source.ranges) expect(stageIds).toContain(range.stageId);
  });

  it.each(files)('%s notes sit on real lines', (_label, source) => {
    for (const line of Object.keys(source.notes).map(Number)) {
      expect(line).toBeGreaterThanOrEqual(1);
      expect(line).toBeLessThanOrEqual(source.lineCount);
    }
  });

  if (entry.codeLayout === 'alternatives') {
    it.each(files)('%s highlights code for every stage on success', (_label, source) => {
      for (const stageId of stageIds) expect(linesForStage(source, stageId, successTags).size).toBeGreaterThan(0);
    });
  } else {
    it('highlights code for every stage in at least one file on success', () => {
      for (const stageId of stageIds) {
        expect(files.some(([, source]) => linesForStage(source, stageId, successTags).size > 0), stageId).toBe(true);
      }
    });
  }

  it('simulates the default input deterministically', () => {
    const first = resolveExecution(entry.scenario, entry.scenario.defaultInput);
    const second = resolveExecution(entry.scenario, entry.scenario.defaultInput);
    expect(second).toEqual(first);
  });
});

describe('load-profile code sync', () => {
  const entry = SCENARIOS.find(({ scenario }) => scenario.id === 'load-profile')!;
  const fetchSource = resolveSource(entry.code.find((file) => file.id === 'fetch')!, entry.scenario.defaultInput);
  const lineOf = (text: string) => fetchSource.code.split('\n').findIndex((line) => line.includes(text)) + 1;

  it('shows the catch block only when the run fails', () => {
    const catchLine = lineOf("card.textContent = 'Could not load the profile.'");
    expect(linesForStage(fetchSource, 'js-handles-response', ['failure'])).toContain(catchLine);
    expect(linesForStage(fetchSource, 'js-handles-response', ['success'])).not.toContain(catchLine);
  });

  it('attaches the response.ok explanation to the status check', () => {
    expect(fetchSource.notes[lineOf('if (!response.ok)')]).toMatch(/does NOT reject on 404/);
  });
});
