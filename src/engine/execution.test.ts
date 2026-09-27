import { loadProfileScenario } from '../data/scenarios/load-profile';
import { defineSharedStages } from './lifecycle';
import { currentVisualState, deriveLog, resolveExecution, stageStatus } from './execution';
import type { Scenario, ServerResult } from './types';

function scenarioReturning(result: ServerResult): Scenario<null> {
  return {
    id: 'test',
    track: 'standalone',
    title: 'Test',
    description: '',
    stages: defineSharedStages(),
    defaultInput: null,
    buildRequest: () => ({ method: 'GET', url: '/test', headers: {}, body: { kind: 'none' } }),
    simulateServer: () => result,
  };
}

describe('resolveExecution', () => {
  it('completes a successful JSON request', () => {
    const execution = resolveExecution(loadProfileScenario, { userId: 7 });
    expect(execution.failure).toBeNull();
    expect(execution.parsedBody).toMatchObject({ id: 7, name: 'Maya Chen', role: 'Frontend Developer' });
    expect(execution.request.url).toBe('/api/profile?id=7');
  });

  it('treats an HTTP error status as a failure when JavaScript handles the response', () => {
    const execution = resolveExecution(loadProfileScenario, { userId: 999 });
    expect(execution.response?.status).toBe(404);
    expect(execution.failure).toMatchObject({ kind: 'http-error', atStage: 'js-handles-response' });
  });

  it('distinguishes a network failure (no response) from an HTTP error', () => {
    const execution = resolveExecution(scenarioReturning({ kind: 'network-failure', message: 'offline' }), null);
    expect(execution.response).toBeNull();
    expect(execution.failure).toMatchObject({ kind: 'network', atStage: 'http-response' });
  });

  it('reports malformed JSON as a parse error even with HTTP 200', () => {
    const execution = resolveExecution(
      scenarioReturning({
        kind: 'response',
        response: { status: 200, statusText: 'OK', headers: { 'content-type': 'application/json' }, rawBody: '{oops' },
      }),
      null,
    );
    expect(execution.failure?.kind).toBe('parse-error');
  });
});

describe('derived stage state', () => {
  const failed = resolveExecution(loadProfileScenario, { userId: 999 });

  it('marks the failed stage and skips everything after it', () => {
    expect(stageStatus(5, 6, failed)).toBe('complete');
    expect(stageStatus(6, 6, failed)).toBe('failed');
    expect(stageStatus(7, 6, failed)).toBe('skipped');
    expect(currentVisualState(loadProfileScenario, 6, failed)).toBe('failed');
  });

  it('shows later stages as pending before the failure is reached', () => {
    expect(stageStatus(7, 2, failed)).toBe('pending');
  });

  it('derives console entries only up to the current stage', () => {
    const log = deriveLog(loadProfileScenario, failed, 6);
    expect(log).toHaveLength(7);
    expect(log.at(-1)).toMatchObject({ level: 'error', stageId: 'js-handles-response' });
  });
});
