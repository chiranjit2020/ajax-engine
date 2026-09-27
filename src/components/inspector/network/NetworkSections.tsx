import type { ReactNode } from 'react';
import { useSimulation } from '../../../app/providers/SimulationProvider';
import { firstStageReaching, hasReached } from '../../../engine/execution';
import { BODY_CONTENT_TYPES, byteLength, headerValue, responseContentType, serializeBody, splitUrl, toCurl } from '../../../engine/http';
import type { Execution, Scenario, VisualState } from '../../../engine/types';
import type { LifecycleView } from '../../../hooks/useLifecycleView';
import { CopyButton } from '../../code/CodeView';
import { Badge } from '../../ui/Badge';

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function KeyValueTable({ rows, empty = 'None' }: { rows: [string, ReactNode][]; empty?: string }) {
  if (rows.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <dl className="grid grid-cols-[minmax(6rem,max-content)_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
      {rows.map(([key, value], index) => (
        <div key={`${key}-${index}`} className="contents">
          <dt className="font-mono text-xs leading-5 text-muted">{key}</dt>
          <dd className="min-w-0 break-words font-mono text-xs leading-5">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="whitespace-pre-wrap rounded-lg border border-line bg-surface-2 p-3 font-mono text-xs leading-relaxed [overflow-wrap:anywhere]">
      <code>{children}</code>
    </pre>
  );
}

function NotYet({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-line p-3 text-sm text-muted">{children}</p>;
}

export function ExecutionNotice({ execution }: { execution: Execution }) {
  return execution.executionMode === 'real' ? (
    <p className="text-xs text-muted">
      <Badge tone="warning">Real request</Badge> This request was sent over the network to the server you configured. Only headers it exposes
      through CORS are visible.
    </p>
  ) : (
    <p className="text-xs text-muted">
      <Badge>Simulated</Badge> This request never left your browser. The endpoint and host are part of the simulation.
    </p>
  );
}

/** "stage 6, “HTTP response”" for the first stage with the given visual state. */
function stageLabel(scenario: Scenario, state: VisualState): string {
  const index = firstStageReaching(scenario, state);
  return index === -1 ? 'a later stage' : `stage ${index + 1}, “${scenario.stages[index]!.title}”`;
}

interface SectionProps {
  view: LifecycleView;
}

function useRun() {
  const { state, entry } = useSimulation();
  return { state, scenario: entry?.scenario as Scenario | undefined, execution: state.execution };
}

export function statusBadge(execution: Execution, scenario: Scenario, stageIndex: number): ReactNode {
  const responseArrived = execution.response && hasReached(scenario, stageIndex, 'response-received');
  if (responseArrived) {
    const { status, statusText } = execution.response!;
    return (
      <Badge tone={status < 400 ? 'success' : 'danger'}>
        {status} {statusText}
      </Badge>
    );
  }
  if (execution.failure && execution.failureIndex !== null && stageIndex >= execution.failureIndex) {
    return <Badge tone="danger">No response ({execution.failure.kind})</Badge>;
  }
  return <Badge tone="warning">Pending</Badge>;
}

export function OverviewSection({ view }: SectionProps) {
  const { state, scenario, execution } = useRun();
  if (!execution || !scenario) return <NotYet>No request yet. Start the simulation to create one.</NotYet>;

  const lastStage = view.stages[Math.min(state.stageIndex, state.lastIndex)];
  const elapsed = lastStage ? lastStage.startMs + lastStage.stage.durationMs * state.speed : 0;

  return (
    <div className="space-y-4">
      <ExecutionNotice execution={execution} />
      <KeyValueTable
        rows={[
          ['Scenario', scenario.title],
          ['Method', execution.request.method],
          ['URL', execution.request.url],
          ['Status', statusBadge(execution, scenario, state.stageIndex)],
          ['State', view.visualState],
          ['Duration', `${(elapsed / 1000).toFixed(1)}s (playback timing${execution.executionMode === 'real' ? ', not the real network time' : ''})`],
        ]}
      />
      <Section title="Copy as cURL" action={<CopyButton text={toCurl(execution.request)} label="Copy" />}>
        {execution.executionMode === 'real' ? (
          <p className="text-xs text-muted">The same request as a command. It targets the server you configured.</p>
        ) : (
          <p className="text-xs text-muted">
            Illustrative only: <span className="font-mono">ajax-lab.test</span> is a placeholder host, so this command will not reach a real
            server.
          </p>
        )}
        <CodeBlock>{toCurl(execution.request)}</CodeBlock>
      </Section>
    </div>
  );
}

export function RequestSection(_: SectionProps) {
  const { state, scenario, execution } = useRun();
  if (!execution || !scenario || !hasReached(scenario, state.stageIndex, 'request-created')) {
    return <NotYet>The request does not exist yet. It is created at {scenario ? stageLabel(scenario, 'request-created') : 'a later stage'}.</NotYet>;
  }
  const { request } = execution;
  const { path, query } = splitUrl(request.url);
  const body = serializeBody(request.body);
  const contentType = BODY_CONTENT_TYPES[request.body.kind];

  return (
    <div className="space-y-4">
      <Section title="General">
        <KeyValueTable
          rows={[
            ['Method', request.method],
            ['Path', path],
            ['Full URL', request.url],
          ]}
        />
      </Section>
      <Section title="Query parameters">
        <KeyValueTable rows={query} empty="No query parameters." />
        {query.length > 0 && request.method === 'GET' && (
          <p className="text-xs text-muted">A GET request sends its data in the URL’s query string, after the “?”.</p>
        )}
      </Section>
      <Section title="Request headers">
        <KeyValueTable rows={Object.entries(request.headers)} />
        <p className="text-xs text-muted">
          {headerValue(request.headers, 'cookie')
            ? 'The Cookie header is attached by the browser automatically for this site — JavaScript does not add it. '
            : ''}
          Browsers also add headers of their own (Host, User-Agent) that are not shown here.
        </p>
      </Section>
      <Section title={`Body${contentType ? ` · ${contentType}` : ''}`}>
        {body === null ? (
          <p className="text-sm text-muted">No body. {request.method === 'GET' && 'GET requests do not send one.'}</p>
        ) : (
          <CodeBlock>{body}</CodeBlock>
        )}
      </Section>
    </div>
  );
}

export function ResponseSection(_: SectionProps) {
  const { state, scenario, execution } = useRun();
  if (!execution || !scenario) return <NotYet>No request yet.</NotYet>;

  const arrived = hasReached(scenario, state.stageIndex, 'response-received');
  if (!arrived) return <NotYet>No response yet. It arrives at {stageLabel(scenario, 'response-received')}.</NotYet>;

  const { response, failure } = execution;
  if (!response) {
    return (
      <div className="rounded-lg border border-danger/40 bg-danger-soft p-3 text-sm text-danger">
        No HTTP response was received ({failure?.kind}). {failure?.message} There is no status code, headers, or body to inspect.
      </div>
    );
  }

  const parsedYet = hasReached(scenario, state.stageIndex, 'response-parsed');
  const parseFailed = failure?.kind === 'parse-error';

  return (
    <div className="space-y-4">
      <Section title="Status">
        <div className="flex flex-wrap items-center gap-2">
          {statusBadge(execution, scenario, state.stageIndex)}
          <span className="text-xs text-muted">
            {response.status < 400
              ? 'A 2xx status means the server handled the request successfully.'
              : `A ${response.status} is still a complete HTTP response. Whether it counts as an error is decided by the JavaScript that reads it.`}
          </span>
        </div>
      </Section>
      <Section title="Response headers">
        <KeyValueTable rows={Object.entries(response.headers)} />
      </Section>
      <Section title={`Raw body · ${responseContentType(response)} · ${byteLength(response.rawBody)} bytes`}>
        <CodeBlock>{response.rawBody}</CodeBlock>
      </Section>
      <Section title="Parsed body">
        {!parsedYet ? (
          <NotYet>Not parsed yet. Until JavaScript parses it at {stageLabel(scenario, 'response-parsed')}, the body is only text.</NotYet>
        ) : parseFailed ? (
          <p className="rounded-lg border border-danger/40 bg-danger-soft p-3 text-sm text-danger">{failure.message}</p>
        ) : (
          <CodeBlock>{JSON.stringify(execution.parsedBody, null, 2)}</CodeBlock>
        )}
      </Section>
    </div>
  );
}
