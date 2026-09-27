/**
 * Core data model for the AJAX Lab lifecycle engine.
 *
 * Everything the UI shows — the lifecycle diagram, packets, code highlights,
 * network inspector, timeline, and console — is derived from these types via
 * a single EngineState. Nothing in the UI keeps its own copy of request data.
 */

/** Which curriculum track a scenario belongs to. Standalone never mentions WordPress. */
export type TrackMode = 'standalone' | 'wordpress';

/**
 * How a request is executed.
 * - simulation: deterministic mock handler running in the browser (default).
 * - real: an actual HTTP request to a user-configured endpoint (opt-in, later phase).
 */
export type ExecutionMode = 'simulation' | 'real';

/**
 * Visualization states. These describe what the diagram is showing, not the
 * browser's exact internal networking implementation.
 */
export type VisualState =
  | 'idle'
  | 'request-created'
  | 'request-sent'
  | 'server-processing'
  | 'response-received'
  | 'response-parsed'
  | 'dom-updated'
  | 'failed';

/** The component responsible for the work done in a stage. */
export type Actor =
  | 'browser'
  | 'javascript'
  | 'network'
  | 'web-server'
  | 'php'
  | 'wordpress'
  | 'dom';

/** Which side of the diagram a stage lives on. */
export type Lane = 'client' | 'network' | 'server';

/** Stable identifier used to connect stages to code ranges, timeline rows, and log entries. */
export type StageId = string;

export interface StageDefinition {
  id: StageId;
  /** Short title shown on the lifecycle node, e.g. "HTTP request". */
  title: string;
  actor: Actor;
  lane: Lane;
  /** Visual state the diagram enters when this stage is reached. */
  visualState: VisualState;
  /** One-sentence plain-English description. */
  summary: string;
  /** Longer explanation shown in the explanation panel. */
  explanation: string;
  /** Simulated duration at 1x speed, in milliseconds. */
  durationMs: number;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type RequestBody =
  | { kind: 'none' }
  | { kind: 'json'; value: unknown }
  | { kind: 'form-urlencoded'; fields: Record<string, string> }
  | { kind: 'multipart'; fields: Record<string, string> };

export interface HttpRequest {
  method: HttpMethod;
  /** Path + query as the browser would send it, e.g. "/api/profile?id=7". */
  url: string;
  headers: Record<string, string>;
  body: RequestBody;
}

export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  /** Exactly the text the server sent; parsing happens in a later stage. */
  rawBody: string;
}

/** Ways a request can fail, kept distinct because they are different concepts. */
export type FailureKind =
  | 'network' // no HTTP response at all
  | 'timeout' // the client gave up waiting
  | 'http-error' // a response arrived with a 4xx/5xx status
  | 'parse-error' // a response arrived but the body is not valid JSON
  | 'application-error'; // valid response whose payload reports failure

export interface Failure {
  kind: FailureKind;
  /** Stage at which the failure becomes visible. */
  atStage: StageId;
  message: string;
}

export type NoteTone = 'info' | 'success' | 'warning' | 'danger';

export interface StageNote {
  tone: NoteTone;
  text: string;
}

/**
 * What happened inside the (simulated) server, stage by stage. A server can
 * halt part-way — e.g. admin-ajax.php finds no hook and calls wp_die() — and
 * still send a response, so halting is separate from the run's final failure.
 */
export interface ServerTrace {
  /** Stage where server-side processing stopped early. */
  haltAt?: StageId;
  /** Server stages that never ran because of the halt. */
  skipped?: StageId[];
  /** Run-specific facts for individual stages ("Hook resolved: …"). */
  notes?: Record<StageId, StageNote>;
  /** Outcome tags used to pick conditional code highlights (`// @stage id ?tag`). */
  tags?: string[];
}

/** What the simulated (or real) server produced for a given request. */
export type ServerResult =
  | { kind: 'response'; response: HttpResponse; trace?: ServerTrace }
  | { kind: 'network-failure'; message: string; trace?: ServerTrace }
  | { kind: 'timeout'; message: string; trace?: ServerTrace };

/**
 * The resolved outcome of one run. Computed once when a run starts so that
 * stepping backwards and forwards is deterministic.
 */
export interface Execution {
  scenarioId: string;
  executionMode: ExecutionMode;
  request: HttpRequest;
  response: HttpResponse | null;
  /** Parsed JSON body, if parsing succeeded. */
  parsedBody: unknown;
  failure: Failure | null;
  /** Index into the scenario stages at which the run fails, or null if it completes. */
  failureIndex: number | null;
  /** Index of the stage where server processing halted early, if it did. */
  haltIndex: number | null;
  skippedIndexes: number[];
  notes: Record<StageId, StageNote>;
  /** 'success' or 'failure', plus any server trace tags. */
  tags: string[];
}

export interface Scenario<Input = unknown> {
  id: string;
  track: TrackMode;
  title: string;
  description: string;
  stages: StageDefinition[];
  /** Default learner input for the scenario's playground. */
  defaultInput: Input;
  /** Named inputs that lessons and challenges can open the scenario with. */
  presets?: Record<string, { label: string; input: Input }>;
  buildRequest(input: Input): HttpRequest;
  /**
   * Deterministic simulated server behaviour. Must be a pure function.
   * Everything the client sends must be read from `request`; `input` supplies
   * only server-side configuration (e.g. which WordPress hooks are registered).
   */
  simulateServer(request: HttpRequest, input: Input): ServerResult;
  /** Human-readable list of what the DOM update changed, for the "data at this stage" view. */
  describeDomChanges?(execution: Execution): string[];
  /**
   * Application-level failure inside an otherwise successful HTTP response,
   * e.g. a WordPress `{ "success": false }` envelope sent with HTTP 200.
   */
  applicationError?(parsedBody: unknown): string | null;
  /** Scenario-specific explanation of why the run failed (overrides the generic one). */
  explainFailure?(execution: Execution): string | null;
}

export type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'finished';

export interface EngineState {
  scenarioId: string;
  /** -1 means no stage has been reached yet. */
  stageIndex: number;
  status: PlaybackStatus;
  /** Incremented on every load/replay/reset so stale timers can be ignored. */
  runId: number;
  execution: Execution | null;
  /** Furthest reachable stage for the current execution (its failure point or final stage); -1 without one. */
  lastIndex: number;
  /** Multiplier applied to stage durations (e.g. 0.5 = twice as fast). */
  speed: number;
}

export type StageStatus = 'pending' | 'active' | 'complete' | 'failed' | 'skipped';

export type LogLevel = 'info' | 'success' | 'warning' | 'error';

export interface LogEntry {
  stageId: StageId;
  level: LogLevel;
  message: string;
  /** Simulated elapsed time since the run started, in milliseconds. */
  atMs: number;
}
