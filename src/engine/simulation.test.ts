import { loadProfileScenario } from '../data/scenarios/load-profile';
import { lastReachableIndex, resolveExecution } from './execution';
import { engineReducer, initialEngineState, type EngineAction } from './simulation';
import type { EngineState } from './types';

const scenario = loadProfileScenario;
const execution = resolveExecution(scenario, { userId: 7 });
const lastIndex = lastReachableIndex(scenario, execution);
const run = (state: EngineState, ...actions: EngineAction[]) => actions.reduce(engineReducer, state);

describe('engineReducer', () => {
  it('starts playing from the first stage', () => {
    const state = run(initialEngineState(scenario.id), { type: 'START', execution, lastIndex });
    expect(state).toMatchObject({ stageIndex: 0, status: 'playing', lastIndex: 7 });
  });

  it('advances on a TICK for the current run and finishes on the last stage', () => {
    let state = run(initialEngineState(scenario.id), { type: 'START', execution, lastIndex });
    for (let i = 0; i < 10; i++) state = engineReducer(state, { type: 'TICK', runId: state.runId });
    expect(state).toMatchObject({ stageIndex: 7, status: 'finished' });
  });

  it('ignores ticks from a stale run', () => {
    const started = run(initialEngineState(scenario.id), { type: 'START', execution, lastIndex });
    const replayed = engineReducer(started, { type: 'REPLAY', execution, lastIndex });
    expect(engineReducer(replayed, { type: 'TICK', runId: started.runId })).toBe(replayed);
  });

  it('ignores ticks after switching scenario', () => {
    const started = run(initialEngineState(scenario.id), { type: 'START', execution, lastIndex });
    const switched = engineReducer(started, { type: 'LOAD_SCENARIO', scenarioId: 'other' });
    expect(switched).toMatchObject({ scenarioId: 'other', status: 'idle', stageIndex: -1, execution: null });
    expect(engineReducer(switched, { type: 'TICK', runId: started.runId })).toBe(switched);
  });

  it('ignores ticks while paused', () => {
    const paused = run(initialEngineState(scenario.id), { type: 'START', execution, lastIndex }, { type: 'PAUSE' });
    expect(engineReducer(paused, { type: 'TICK', runId: paused.runId })).toBe(paused);
  });

  it('steps forward and back without leaving the valid range', () => {
    let state = run(initialEngineState(scenario.id), { type: 'NEXT', execution, lastIndex });
    expect(state).toMatchObject({ stageIndex: 0, status: 'paused' });
    state = run(state, { type: 'PREVIOUS' }, { type: 'PREVIOUS' });
    expect(state.stageIndex).toBe(0);
    for (let i = 0; i < 12; i++) state = engineReducer(state, { type: 'NEXT', execution, lastIndex });
    expect(state).toMatchObject({ stageIndex: 7, status: 'finished' });
  });

  it('resumes from a selected stage and resets to idle', () => {
    let state = run(
      initialEngineState(scenario.id),
      { type: 'SELECT_STAGE', index: 3, execution, lastIndex },
      { type: 'RESUME' },
    );
    expect(state).toMatchObject({ stageIndex: 3, status: 'playing' });
    state = engineReducer(state, { type: 'RESET' });
    expect(state).toMatchObject({ stageIndex: -1, status: 'idle', execution: null, lastIndex: -1 });
  });

  it('clamps stage selection to the failure point', () => {
    const failed = resolveExecution(scenario, { userId: 999 });
    const state = run(initialEngineState(scenario.id), {
      type: 'SELECT_STAGE',
      index: 7,
      execution: failed,
      lastIndex: lastReachableIndex(scenario, failed),
    });
    expect(state).toMatchObject({ stageIndex: 6, status: 'finished' });
  });
});
