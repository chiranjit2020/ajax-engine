import { byteLength, responseContentType } from './http';
import type {
  Execution,
  ExecutionMode,
  Failure,
  HttpRequest,
  HttpResponse,
  LogEntry,
  NoteTone,
  Scenario,
  ServerResult,
  ServerTrace,
  StageId,
  StageDefinition,
  StageStatus,
  VisualState,
} from './types';

/**
 * Visual states in lifecycle order. Scenarios need not use every state (the
 * WordPress flow creates and sends its request in one stage), so lookups ask
 * for the first stage that has progressed at least as far as a given state.
 */
const STATE_RANK: Record<VisualState, number> = {
  idle: 0,
  'request-created': 1,
  'request-sent': 2,
  'server-processing': 3,
  'response-received': 4,
  'response-parsed': 5,
  'dom-updated': 6,
  failed: -1,
};

/** Index of the first stage at or beyond the given state, or -1 if none is. */
export function firstStageReaching(scenario: Scenario, state: VisualState): number {
  return scenario.stages.findIndex((stage) => STATE_RANK[stage.visualState] >= STATE_RANK[state]);
}

function indexOrLast(scenario: Scenario, state: VisualState): number {
  const index = firstStageReaching(scenario, state);
  return index === -1 ? scenario.stages.length - 1 : index;
}

function isJson(response: HttpResponse): boolean {
  const type = Object.entries(response.headers).find(([name]) => name.toLowerCase() === 'content-type');
  return type ? type[1].includes('json') : false;
}

function applyTrace(scenario: Scenario, trace: ServerTrace | undefined, failure: Failure | null) {
  const indexOf = (id: StageId) => scenario.stages.findIndex((stage) => stage.id === id);
  const haltIndex = trace?.haltAt ? indexOf(trace.haltAt) : -1;
  return {
    haltIndex: haltIndex === -1 ? null : haltIndex,
    skippedIndexes: (trace?.skipped ?? []).map(indexOf).filter((index) => index !== -1),
    notes: trace?.notes ?? {},
    tags: [...(failure ? ['failure', failure.kind] : ['success']), ...(trace?.tags ?? [])],
  };
}

/**
 * Resolve the complete outcome of a run up front. The simulated server is a
 * pure function, so this is deterministic and makes backward stepping trivial.
 */
export function resolveExecution<Input>(
  scenario: Scenario<Input>,
  input: Input,
  executionMode: ExecutionMode = 'simulation',
): Execution {
  const request = scenario.buildRequest(input);
  return executionFromResult(scenario as Scenario, request, scenario.simulateServer(request, input), executionMode);
}

/**
 * Classify a server result — simulated, or received from a real server — into
 * an execution: failure point, parsed body, and outcome tags. Pure.
 */
export function executionFromResult(
  scenario: Scenario,
  request: HttpRequest,
  result: ServerResult,
  executionMode: ExecutionMode,
): Execution {
  const generic = scenario;
  const base = { scenarioId: scenario.id, executionMode, request };

  if (result.kind !== 'response') {
    const failureIndex = indexOrLast(generic, 'response-received');
    const failure: Failure = {
      kind: result.kind === 'timeout' ? 'timeout' : 'network',
      atStage: scenario.stages[failureIndex]!.id,
      message: result.message,
    };
    return {
      ...base,
      ...applyTrace(generic, result.trace, failure),
      response: null,
      parsedBody: undefined,
      failure,
      failureIndex,
    };
  }

  const { response } = result;
  const handleIndex = indexOrLast(generic, 'response-parsed');
  const handleStage = scenario.stages[handleIndex]!.id;
  let failure: Failure | null = null;
  let parsedBody: unknown = undefined;

  if (isJson(response)) {
    try {
      parsedBody = JSON.parse(response.rawBody);
    } catch (error) {
      failure = {
        kind: 'parse-error',
        atStage: handleStage,
        message: `The body is not valid JSON: ${(error as Error).message}`,
      };
    }
  } else {
    parsedBody = response.rawBody;
  }

  if (!failure && (response.status < 200 || response.status >= 300)) {
    failure = {
      kind: 'http-error',
      atStage: handleStage,
      message: `The server responded with HTTP ${response.status} ${response.statusText}.`,
    };
  }

  const applicationMessage = failure ? null : (scenario.applicationError?.(parsedBody) ?? null);
  if (applicationMessage) {
    failure = { kind: 'application-error', atStage: handleStage, message: applicationMessage };
  }

  return {
    ...base,
    ...applyTrace(generic, result.trace, failure),
    response,
    parsedBody,
    failure,
    failureIndex: failure ? handleIndex : null,
  };
}

/** The furthest stage a run can reach: the failure point, or the final stage. */
export function lastReachableIndex(scenario: Scenario, execution: Execution | null): number {
  if (execution?.failureIndex != null) return execution.failureIndex;
  return scenario.stages.length - 1;
}

export function stageStatus(stageIndex: number, currentIndex: number, execution: Execution | null): StageStatus {
  if (execution && currentIndex >= stageIndex) {
    if (execution.skippedIndexes.includes(stageIndex)) return 'skipped';
    if (execution.haltIndex === stageIndex) return 'failed';
  }
  const failureIndex = execution?.failureIndex ?? null;
  if (failureIndex !== null && currentIndex >= failureIndex) {
    if (stageIndex === failureIndex) return 'failed';
    if (stageIndex > failureIndex) return 'skipped';
  }
  if (stageIndex < currentIndex) return 'complete';
  if (stageIndex === currentIndex) return 'active';
  return 'pending';
}

export function currentVisualState(scenario: Scenario, currentIndex: number, execution: Execution | null): VisualState {
  if (currentIndex < 0) return 'idle';
  if (execution?.failureIndex === currentIndex || execution?.haltIndex === currentIndex) return 'failed';
  return scenario.stages[currentIndex]?.visualState ?? 'idle';
}

/** Simulated elapsed time at which each stage begins. */
export function stageStartTimes(scenario: Scenario, speed = 1): number[] {
  let elapsed = 0;
  return scenario.stages.map((stage) => {
    const start = elapsed;
    elapsed += stage.durationMs * speed;
    return start;
  });
}

/**
 * Whether the run has reached the first stage with the given visual state.
 * Panels use this to show only data that exists at the current stage (e.g.
 * no response body before the response has arrived).
 */
export function hasReached(scenario: Scenario, currentIndex: number, state: VisualState): boolean {
  const index = firstStageReaching(scenario, state);
  return index !== -1 && currentIndex >= index;
}

const NOTE_LEVEL: Record<NoteTone, LogEntry['level']> = { info: 'info', success: 'success', warning: 'warning', danger: 'error' };

function logMessage(stage: StageDefinition, execution: Execution): Pick<LogEntry, 'level' | 'message'> {
  const { request, response } = execution;
  const target = `${request.method} ${request.url}`;
  switch (stage.visualState) {
    case 'request-created':
      return { level: 'info', message: `Request created: ${target}` };
    case 'request-sent':
      return { level: 'info', message: `→ ${target} sent. JavaScript keeps running while it is in flight.` };
    case 'server-processing':
      return { level: 'info', message: `[simulated server] ${stage.summary}` };
    case 'response-received':
      return response
        ? {
            level: response.status >= 400 ? 'warning' : 'info',
            message: `← ${response.status} ${response.statusText} · ${responseContentType(response)} · ${byteLength(response.rawBody)} bytes`,
          }
        : { level: 'error', message: 'No response received.' };
    case 'response-parsed':
      return { level: 'info', message: 'Response checked and body parsed.' };
    case 'dom-updated':
      return { level: 'success', message: stage.summary };
    default:
      return { level: 'info', message: stage.summary };
  }
}

/** Console entries for every stage reached so far. Derived, never stored. */
export function deriveLog(scenario: Scenario, execution: Execution | null, currentIndex: number, speed = 1): LogEntry[] {
  if (!execution) return [];
  const starts = stageStartTimes(scenario, speed);
  const entries: LogEntry[] = [];
  const last = Math.min(currentIndex, lastReachableIndex(scenario, execution));

  for (let i = 0; i <= last; i++) {
    const stage = scenario.stages[i]!;
    const atMs = starts[i]!;
    if (execution.failureIndex === i && execution.failure) {
      entries.push({ stageId: stage.id, level: 'error', message: execution.failure.message, atMs });
      continue;
    }
    if (execution.skippedIndexes.includes(i)) {
      entries.push({ stageId: stage.id, level: 'warning', message: `${stage.title}: skipped — never ran.`, atMs });
      continue;
    }
    const note = execution.notes[stage.id];
    if (note) {
      entries.push({ stageId: stage.id, level: NOTE_LEVEL[note.tone], message: note.text, atMs });
      continue;
    }
    entries.push({ stageId: stage.id, atMs, ...logMessage(stage, execution) });
  }
  return entries;
}
