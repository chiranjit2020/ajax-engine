import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_SCENARIO_ID, getScenarioEntry, scenariosForTrack, type ScenarioEntry } from '../../data/scenarios';
import { executionFromResult, lastReachableIndex, resolveExecution } from '../../engine/execution';
import { performRealRequest, validateTarget } from '../../engine/request-adapters';
import { engineReducer, initialEngineState } from '../../engine/simulation';
import type { EngineState, Execution, TrackMode } from '../../engine/types';

/** Opt-in Real Request mode settings (spec §13.2). A real request is sent only when all three are set. */
export interface RealModeSettings {
  enabled: boolean;
  /** An explicit http(s) origin typed by the learner. There is no default. */
  origin: string;
  /** The learner confirmed that a real request will leave the browser. */
  acknowledged: boolean;
}

type Run = { execution: Execution; lastIndex: number };

/**
 * The single owner of lifecycle state. The diagram, controls, explanation,
 * code panel, inspector, timeline, and console all read from this context, so
 * they cannot drift apart. The only timer in the playback system lives here.
 */
interface SimulationContextValue {
  track: TrackMode;
  entry: ScenarioEntry | null;
  state: EngineState;
  input: unknown;
  setTrack(track: TrackMode): void;
  loadScenario(id: string): void;
  /** Change the scenario input (resetting the run); with `play`, immediately start a run with the new input. */
  setInput(input: unknown, options?: { play?: boolean }): void;
  play(): void;
  pause(): void;
  next(): void;
  previous(): void;
  replay(): void;
  reset(): void;
  selectStage(index: number): void;
  setSpeed(speed: number): void;
  /**
   * Open a scenario (switching track if needed) with a named preset input, or its
   * default input, then optionally play it or jump to a stage. Used by lessons,
   * challenges, and experiment buttons. Always uses the simulation.
   */
  applyPreset(scenarioId: string, presetKey?: string, options?: { play?: boolean; stage?: number }): void;
  realMode: RealModeSettings;
  /** True when the next run will send a real request (valid settings, standalone scenario). */
  realActive: boolean;
  /** True while a real request is in flight, before playback starts. */
  pending: boolean;
  setRealMode(patch: Partial<RealModeSettings>): void;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [track, setTrackState] = useState<TrackMode>('standalone');
  const [state, dispatch] = useReducer(engineReducer, DEFAULT_SCENARIO_ID, (id) => initialEngineState(id));
  const entry = getScenarioEntry(state.scenarioId) ?? null;
  const scenario = entry && entry.scenario.track === track ? entry.scenario : null;
  // Each scenario keeps its own input (e.g. an edited hook registry) across scenario and track switches.
  const [inputs, setInputs] = useState<Record<string, unknown>>({});
  const input = state.scenarioId in inputs ? inputs[state.scenarioId] : entry?.scenario.defaultInput;

  const [realMode, setRealModeState] = useState<RealModeSettings>({ enabled: false, origin: '', acknowledged: false });
  const [pending, setPending] = useState(false);
  const target = useMemo(() => validateTarget(realMode.origin), [realMode.origin]);
  const realActive = realMode.enabled && realMode.acknowledged && target.ok && scenario?.track === 'standalone';
  // Incremented to invalidate an in-flight real request (reset, input, scenario, or mode change).
  const realToken = useRef(0);
  const cancelPending = useCallback(() => {
    realToken.current++;
    setPending(false);
  }, []);

  /**
   * Resolve a run for `runInput` and hand it to `apply`: synchronously in
   * simulation, or once the real response arrives in Real Request mode.
   */
  const withRun = useCallback(
    (runInput: unknown, apply: (run: Run) => void) => {
      if (!scenario) return;
      if (!realActive || !target.ok) {
        const execution = resolveExecution(scenario, runInput);
        apply({ execution, lastIndex: lastReachableIndex(scenario, execution) });
        return;
      }
      const token = ++realToken.current;
      const built = scenario.buildRequest(runInput);
      const request = { ...built, url: new URL(built.url, target.origin).toString() };
      setPending(true);
      void performRealRequest(built, target.origin).then((result) => {
        if (token !== realToken.current) return;
        setPending(false);
        const execution = executionFromResult(scenario, request, result, 'real');
        apply({ execution, lastIndex: lastReachableIndex(scenario, execution) });
      });
    },
    [scenario, realActive, target],
  );

  /** The current run if there is one (stepping never re-sends a real request), otherwise a new one. */
  const currentOrNew = useCallback(
    (apply: (run: Run) => void) => {
      if (state.execution) apply({ execution: state.execution, lastIndex: state.lastIndex });
      else withRun(input, apply);
    },
    [state.execution, state.lastIndex, withRun, input],
  );

  // Playback timer: one timeout for the current stage, cleared on any change.
  useEffect(() => {
    if (state.status !== 'playing' || !scenario) return;
    const stage = scenario.stages[state.stageIndex];
    if (!stage) return;
    const runId = state.runId;
    const timeout = window.setTimeout(() => dispatch({ type: 'TICK', runId }), stage.durationMs * state.speed);
    return () => window.clearTimeout(timeout);
  }, [state.status, state.stageIndex, state.runId, state.speed, scenario]);

  const loadScenario = useCallback(
    (id: string) => {
      if (!getScenarioEntry(id)) return;
      cancelPending();
      dispatch({ type: 'LOAD_SCENARIO', scenarioId: id });
    },
    [cancelPending],
  );

  const value = useMemo<SimulationContextValue>(
    () => ({
      track,
      entry: scenario ? entry : null,
      state,
      input,
      setTrack(nextTrack) {
        setTrackState(nextTrack);
        const first = scenariosForTrack(nextTrack)[0];
        if (first) loadScenario(first.scenario.id);
        else dispatch({ type: 'RESET' });
      },
      loadScenario,
      setInput(nextInput, options = {}) {
        cancelPending();
        setInputs((current) => ({ ...current, [state.scenarioId]: nextInput }));
        dispatch({ type: 'RESET' });
        if (options.play) withRun(nextInput, (run) => dispatch({ type: 'START', ...run }));
      },
      play() {
        if (pending) return;
        if (state.status === 'paused') return dispatch({ type: 'RESUME' });
        const type = state.status === 'finished' ? 'REPLAY' : 'START';
        withRun(input, (run) => dispatch({ type, ...run }));
      },
      pause: () => dispatch({ type: 'PAUSE' }),
      next() {
        if (!pending) currentOrNew((run) => dispatch({ type: 'NEXT', ...run }));
      },
      previous: () => dispatch({ type: 'PREVIOUS' }),
      replay() {
        if (!pending) withRun(input, (run) => dispatch({ type: 'REPLAY', ...run }));
      },
      reset() {
        cancelPending();
        dispatch({ type: 'RESET' });
      },
      selectStage(index) {
        if (!pending) currentOrNew((run) => dispatch({ type: 'SELECT_STAGE', index, ...run }));
      },
      setSpeed: (speed) => dispatch({ type: 'SET_SPEED', speed }),
      applyPreset(scenarioId, presetKey, options = {}) {
        const destination = getScenarioEntry(scenarioId);
        if (!destination) return;
        const preset = presetKey ? destination.scenario.presets?.[presetKey] : undefined;
        const nextInput = preset ? preset.input : destination.scenario.defaultInput;
        cancelPending();
        setRealModeState((current) => ({ ...current, enabled: false }));
        setTrackState(destination.scenario.track);
        setInputs((current) => ({ ...current, [scenarioId]: nextInput }));
        dispatch({ type: 'LOAD_SCENARIO', scenarioId });
        if (options.play || options.stage !== undefined) {
          // Resolve against the new input directly; state updates above have not rendered yet.
          const execution = resolveExecution(destination.scenario, nextInput);
          const lastIndex = lastReachableIndex(destination.scenario, execution);
          if (options.stage !== undefined) dispatch({ type: 'SELECT_STAGE', index: options.stage, execution, lastIndex });
          else dispatch({ type: 'START', execution, lastIndex });
        }
      },
      realMode,
      realActive: Boolean(realActive),
      pending,
      setRealMode(patch) {
        cancelPending();
        dispatch({ type: 'RESET' });
        setRealModeState((current) => ({ ...current, ...patch }));
      },
    }),
    [track, entry, scenario, state, input, withRun, currentOrNew, loadScenario, cancelPending, realMode, realActive, pending],
  );

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

export function useSimulation(): SimulationContextValue {
  const context = useContext(SimulationContext);
  if (!context) throw new Error('useSimulation must be used inside SimulationProvider');
  return context;
}
