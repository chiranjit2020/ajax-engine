import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Loader, Monitor, Server, X } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useInspector } from '../../app/providers/InspectorProvider';
import { useSimulation } from '../../app/providers/SimulationProvider';
import { firstStageReaching } from '../../engine/execution';
import { BODY_CONTENT_TYPES, responseContentType } from '../../engine/http';
import type { Scenario, VisualState } from '../../engine/types';

function firstIndex(scenario: Scenario, state: VisualState): number {
  const index = firstStageReaching(scenario, state);
  return index === -1 ? Number.POSITIVE_INFINITY : index;
}

/**
 * Position along the wire as --p: 0 = at the browser, 100 = at the server.
 * The wire is vertical on phones (matching the vertical lifecycle) and
 * horizontal from the sm breakpoint. Transition length matches the travel stage.
 */
function placement(percent: number, visible: boolean, durationMs: number): CSSProperties {
  return {
    '--p': percent,
    opacity: visible ? 1 : 0,
    visibility: visible ? 'visible' : 'hidden',
    transitionProperty: 'left, top, translate, opacity, visibility',
    transitionDuration: `${durationMs}ms, ${durationMs}ms, ${durationMs}ms, 200ms, 200ms`,
    transitionTimingFunction: 'ease-in-out',
  } as CSSProperties;
}

const PACKET_POSITION =
  'left-1/2 top-[calc(var(--p)*1%)] -translate-x-1/2 -translate-y-[calc(var(--p)*1%)] sm:left-[calc(var(--p)*1%)] sm:top-1/2 sm:-translate-x-[calc(var(--p)*1%)] sm:-translate-y-1/2';

function Direction({ outgoing }: { outgoing: boolean }) {
  return (
    <>
      {outgoing ? <ArrowDown size={12} aria-hidden className="shrink-0 sm:hidden" /> : <ArrowUp size={12} aria-hidden className="shrink-0 sm:hidden" />}
      {outgoing ? <ArrowRight size={12} aria-hidden className="hidden shrink-0 sm:block" /> : <ArrowLeft size={12} aria-hidden className="hidden shrink-0 sm:block" />}
    </>
  );
}

function Endpoint({ label, sublabel, icon: Icon, busy }: { label: string; sublabel?: string; icon: typeof Monitor; busy?: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-2 sm:w-20 sm:flex-col sm:gap-1 sm:text-center">
      <span
        className={`grid size-10 place-items-center rounded-xl border ${busy ? 'border-warning bg-warning-soft text-warning' : 'border-line bg-surface-2 text-text'}`}
      >
        {busy ? <Loader size={18} className="animate-spin" aria-hidden /> : <Icon size={18} aria-hidden />}
      </span>
      <span className="flex items-baseline gap-1.5 sm:flex-col sm:items-center sm:gap-0">
        <span className="text-xs font-medium leading-tight">{label}</span>
        {sublabel && <span className="text-[11px] leading-tight text-muted">{sublabel}</span>}
      </span>
    </div>
  );
}

/**
 * The request and response as compact packets travelling between the browser
 * and the server. Everything shown is derived from the active execution; the
 * full details live in the Network inspector, which opens when a packet is clicked.
 */
export function PacketTrack() {
  const { entry, state, track } = useSimulation();
  const { reveal } = useInspector();
  const scenario = entry?.scenario;
  const execution = state.execution;
  if (!scenario) return null;

  const at = state.stageIndex;
  const created = firstIndex(scenario, 'request-created');
  const sent = firstIndex(scenario, 'request-sent');
  const serverStart = firstIndex(scenario, 'server-processing');
  const received = firstIndex(scenario, 'response-received');
  const parsed = firstIndex(scenario, 'response-parsed');
  const travel = (index: number) => (scenario.stages[index]?.durationMs ?? 800) * state.speed * 0.9;

  const processing = execution !== null && at >= serverStart && at < received;
  const requestVisible = execution !== null && at >= created && at <= serverStart;
  const response = execution?.response ?? null;
  const responseVisible = response !== null && at >= received;
  const noResponse = execution !== null && response === null && at >= received;
  const malformed = execution?.failure?.kind === 'parse-error' && at >= parsed;
  const rejected = execution?.failure?.kind === 'http-error' && at >= parsed;

  const request = execution?.request;
  const requestPhase = at >= serverStart ? 'received by server' : at >= sent ? 'in transit' : 'ready to send';
  const bodyType = request ? (BODY_CONTENT_TYPES[request.body.kind] ?? 'no body') : '';

  const responseTone = !response
    ? ''
    : malformed
      ? 'border-warning bg-warning-soft'
      : response.status < 400
        ? 'border-success bg-success-soft'
        : 'border-danger bg-danger-soft';

  return (
    <div className="rounded-xl border border-line bg-surface-2/50 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <Endpoint label="Browser" icon={Monitor} />
        <div className="relative h-36 min-w-0 sm:h-24 sm:flex-1">
          <div
            aria-hidden
            className="absolute inset-y-0 left-1/2 border-l-2 border-dashed border-line sm:inset-x-0 sm:inset-y-auto sm:left-0 sm:top-1/2 sm:border-l-0 sm:border-t-2"
          />
          <span aria-hidden className="absolute left-0 top-1 hidden items-center gap-1 text-[11px] text-muted sm:flex">
            request <ArrowDown size={11} className="sm:hidden" />
            <ArrowRight size={11} className="hidden sm:block" />
          </span>
          <span aria-hidden className="absolute bottom-1 right-0 hidden items-center gap-1 text-[11px] text-muted sm:flex">
            <ArrowUp size={11} className="sm:hidden" />
            <ArrowLeft size={11} className="hidden sm:block" /> response
          </span>

          {request && (
            <button
              type="button"
              onClick={() => reveal('network', 'request')}
              aria-label={`Request packet, ${requestPhase}: ${request.method} ${request.url}. Open in the network inspector.`}
              tabIndex={requestVisible ? 0 : -1}
              style={placement(at >= sent ? 100 : 0, requestVisible, travel(sent))}
              className={`absolute z-10 w-max max-w-full rounded-lg border px-2 py-1 text-left shadow-sm ${PACKET_POSITION} ${
                at >= sent ? 'border-accent bg-surface' : 'border-dashed border-accent/60 bg-surface'
              }`}
            >
              <span className="flex items-center gap-1 font-mono text-xs font-semibold text-accent">
                <Direction outgoing />
                <span className="truncate">
                  {request.method} {request.url}
                </span>
              </span>
              <span className="block truncate text-[11px] leading-tight text-muted">
                {requestPhase} · {bodyType}
              </span>
            </button>
          )}

          {response && (
            <button
              type="button"
              onClick={() => reveal('network', 'response')}
              aria-label={`Response packet: ${response.status} ${response.statusText}${malformed ? ', malformed body' : ''}. Open in the network inspector.`}
              tabIndex={responseVisible ? 0 : -1}
              style={placement(responseVisible ? 0 : 100, responseVisible, travel(received))}
              className={`absolute z-10 w-max max-w-full rounded-lg border px-2 py-1 text-left shadow-sm ${PACKET_POSITION} ${responseTone}`}
            >
              <span className="flex items-center gap-1 font-mono text-xs font-semibold">
                <Direction outgoing={false} />
                <span className="truncate">
                  {response.status} {response.statusText}
                </span>
              </span>
              <span className="block truncate text-[11px] leading-tight text-muted">
                {responseContentType(response)}
                {malformed
                  ? ' · malformed body'
                  : rejected
                    ? ' · rejected by status check'
                    : at >= parsed
                      ? ' · parsed'
                      : ' · body not parsed yet'}
              </span>
            </button>
          )}

          {noResponse && (
            <span className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-lg border border-danger bg-danger-soft px-2 py-1 text-xs font-medium text-danger">
              <X size={13} aria-hidden /> No response
            </span>
          )}

          {!execution && (
            <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-xs text-muted">
              <span className="rounded bg-surface px-1.5">No request yet</span>
            </p>
          )}
        </div>
        <Endpoint
          label={track === 'wordpress' ? 'WordPress' : 'Server'}
          sublabel={execution?.executionMode === 'real' ? 'real' : 'simulated'}
          icon={Server}
          busy={processing}
        />
      </div>
    </div>
  );
}
