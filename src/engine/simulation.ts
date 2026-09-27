import type { EngineState, Execution } from './types';

/**
 * Pure playback reducer. Timers live in one hook (useSimulation) which
 * dispatches TICK tagged with the runId it was scheduled for. Every
 * user-driven transition bumps runId, so a TICK from an older run, a previous
 * scenario, or before a pause/reset is ignored and cannot advance playback.
 *
 * Actions that may begin a run carry the resolved execution and its last
 * reachable stage index, so the reducer needs no access to the scenario registry.
 */
export type EngineAction =
  | { type: 'LOAD_SCENARIO'; scenarioId: string }
  | { type: 'START'; execution: Execution; lastIndex: number }
  | { type: 'RESUME' }
  | { type: 'PAUSE' }
  | { type: 'NEXT'; execution: Execution; lastIndex: number }
  | { type: 'PREVIOUS' }
  | { type: 'SELECT_STAGE'; index: number; execution: Execution; lastIndex: number }
  | { type: 'TICK'; runId: number }
  | { type: 'REPLAY'; execution: Execution; lastIndex: number }
  | { type: 'RESET' }
  | { type: 'SET_SPEED'; speed: number };

export function initialEngineState(scenarioId: string, speed = 1): EngineState {
  return { scenarioId, stageIndex: -1, status: 'idle', runId: 0, execution: null, lastIndex: -1, speed };
}

function pausedOrFinished(index: number, lastIndex: number): EngineState['status'] {
  return index >= lastIndex ? 'finished' : 'paused';
}

export function engineReducer(state: EngineState, action: EngineAction): EngineState {
  switch (action.type) {
    case 'LOAD_SCENARIO':
      return { ...initialEngineState(action.scenarioId, state.speed), runId: state.runId + 1 };

    case 'START':
    case 'REPLAY':
      return {
        ...state,
        execution: action.execution,
        lastIndex: action.lastIndex,
        stageIndex: 0,
        status: action.lastIndex <= 0 ? 'finished' : 'playing',
        runId: state.runId + 1,
      };

    case 'RESUME': {
      if (state.status !== 'paused' || !state.execution) return state;
      if (state.stageIndex >= state.lastIndex) return { ...state, status: 'finished' };
      return { ...state, status: 'playing', stageIndex: Math.max(state.stageIndex, 0), runId: state.runId + 1 };
    }

    case 'PAUSE':
      return state.status === 'playing' ? { ...state, status: 'paused', runId: state.runId + 1 } : state;

    case 'NEXT': {
      if (!state.execution) {
        return {
          ...state,
          execution: action.execution,
          lastIndex: action.lastIndex,
          stageIndex: 0,
          status: pausedOrFinished(0, action.lastIndex),
          runId: state.runId + 1,
        };
      }
      const stageIndex = Math.min(state.stageIndex + 1, state.lastIndex);
      return { ...state, stageIndex, status: pausedOrFinished(stageIndex, state.lastIndex), runId: state.runId + 1 };
    }

    case 'PREVIOUS': {
      if (!state.execution) return state;
      const stageIndex = Math.max(state.stageIndex - 1, 0);
      return { ...state, stageIndex, status: 'paused', runId: state.runId + 1 };
    }

    case 'SELECT_STAGE': {
      const execution = state.execution ?? action.execution;
      const lastIndex = state.execution ? state.lastIndex : action.lastIndex;
      const stageIndex = Math.max(0, Math.min(action.index, lastIndex));
      return {
        ...state,
        execution,
        lastIndex,
        stageIndex,
        status: pausedOrFinished(stageIndex, lastIndex),
        runId: state.runId + 1,
      };
    }

    case 'TICK': {
      if (action.runId !== state.runId || state.status !== 'playing') return state;
      const stageIndex = Math.min(state.stageIndex + 1, state.lastIndex);
      // runId is deliberately unchanged so the timer hook schedules the next tick of this run.
      return { ...state, stageIndex, status: stageIndex >= state.lastIndex ? 'finished' : 'playing' };
    }

    case 'RESET':
      return { ...initialEngineState(state.scenarioId, state.speed), runId: state.runId + 1 };

    case 'SET_SPEED':
      return { ...state, speed: action.speed };
  }
}
