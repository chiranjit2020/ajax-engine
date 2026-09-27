import { useSimulation } from '../../app/providers/SimulationProvider';
import { STAGE_DETAILS } from '../../features/stage-details';
import { formatRawRequest, formatRawResponse, headerValue, splitUrl } from '../../engine/http';
import type { StageView } from '../../hooks/useLifecycleView';
import { CodeBlock } from '../inspector/network/NetworkSections';

/** The data that exists at the selected stage, derived from the active execution. */
export function StageData({ current }: { current: StageView }) {
  const { state, entry, input } = useSimulation();
  const execution = state.execution;
  if (!execution || !entry) return null;
  const { request, response, failure } = execution;
  const failedHere = current.status === 'failed';

  let label: string;
  let content: string | string[] | null;

  switch (current.stage.visualState) {
    case 'idle':
      label = 'Data';
      content = 'No request exists yet — only a click event.';
      break;
    case 'request-created':
      label = 'Request object (not sent yet)';
      content = `${request.method} ${request.url}\n${Object.entries(request.headers)
        .map(([name, value]) => `${name}: ${value}`)
        .join('\n')}`;
      break;
    case 'request-sent':
      label = 'On the wire (simplified HTTP/1.1)';
      content = formatRawRequest(request);
      break;
    case 'server-processing': {
      const { path, query } = splitUrl(request.url);
      const fields = request.body.kind === 'form-urlencoded' || request.body.kind === 'multipart' ? request.body.fields : {};
      const cookie = headerValue(request.headers, 'cookie');
      label = 'What the server can read';
      content = [
        `method: ${request.method}`,
        `path:   ${path}`,
        ...query.map(([name, value]) => `query ${name} = "${value}"`),
        ...Object.entries(fields).map(([name, value]) => `$_POST['${name}'] = "${value}"`),
        cookie ? `Cookie: ${cookie.split('=')[0]}=… (login cookie)` : 'No cookies',
        'Every value arrives as text.',
      ];
      break;
    }
    case 'response-received':
      label = response ? 'Response received (body is still text)' : 'Response';
      content = response ? formatRawResponse(response) : `No response. ${failure?.message ?? ''}`;
      break;
    case 'response-parsed':
      label = failedHere ? 'Result' : 'Parsed JavaScript value';
      content = failedHere ? (failure?.message ?? 'Failed') : JSON.stringify(execution.parsedBody, null, 2);
      break;
    case 'dom-updated':
      label = 'DOM changes';
      try {
        content = entry.scenario.describeDomChanges?.(execution) ?? 'The target element was updated.';
      } catch {
        content = 'The response does not have the shape this example expects, so the page cannot show it.';
      }
      break;
    default:
      return null;
  }

  const Details = STAGE_DETAILS[current.stage.id];
  return (
    <div className="space-y-3">
      {Details && <Details execution={execution} input={input} />}
      <div className="space-y-1.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</h3>
        <CodeBlock>{Array.isArray(content) ? content.join('\n') : (content ?? '')}</CodeBlock>
      </div>
    </div>
  );
}
