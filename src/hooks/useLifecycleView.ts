import { useMemo } from 'react';
import { useSimulation } from '../app/providers/SimulationProvider';
import { currentVisualState, deriveLog, stageStartTimes, stageStatus } from '../engine/execution';
import type { Actor, LogEntry, StageDefinition, StageStatus, VisualState } from '../engine/types';

export const ACTOR_LABELS: Record<Actor, string> = {
  browser: 'Browser',
  javascript: 'JavaScript',
  network: 'Network',
  'web-server': 'Web server',
  php: 'PHP',
  wordpress: 'WordPress',
  dom: 'DOM',
};

export interface StageView {
  stage: StageDefinition;
  index: number;
  status: StageStatus;
  startMs: number;
}

export interface LifecycleView {
  stages: StageView[];
  current: StageView | null;
  visualState: VisualState;
  log: LogEntry[];
}

/** Everything a panel needs to render the active run, derived from the single engine state. */
export function useLifecycleView(): LifecycleView | null {
  const { entry, state } = useSimulation();

  return useMemo(() => {
    if (!entry) return null;
    const { scenario } = entry;
    const starts = stageStartTimes(scenario, state.speed);
    const stages = scenario.stages.map((stage, index) => ({
      stage,
      index,
      status: state.execution ? stageStatus(index, state.stageIndex, state.execution) : 'pending',
      startMs: starts[index]!,
    }));
    return {
      stages,
      current: state.stageIndex >= 0 ? (stages[state.stageIndex] ?? null) : null,
      visualState: currentVisualState(scenario, state.stageIndex, state.execution),
      log: deriveLog(scenario, state.execution, state.stageIndex, state.speed),
    };
  }, [entry, state.execution, state.stageIndex, state.speed]);
}
