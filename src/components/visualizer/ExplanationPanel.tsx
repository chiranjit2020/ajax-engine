import { CircleAlert, CircleCheck, CircleMinus, Info, TriangleAlert } from 'lucide-react';
import { useSimulation } from '../../app/providers/SimulationProvider';
import { ACTOR_LABELS, type LifecycleView } from '../../hooks/useLifecycleView';
import type { FailureKind, NoteTone, StageNote } from '../../engine/types';
import { Badge } from '../ui/Badge';
import { StageData } from './StageData';
import { StageStatusLabel } from './StageStatusLabel';

/** Why each failure kind is a different concept. */
const FAILURE_EXPLANATIONS: Record<FailureKind, string> = {
  network:
    'No HTTP response came back at all — the server was unreachable or the connection dropped. There is no status code, headers, or body to inspect.',
  timeout: 'The client stopped waiting before any response arrived. As with a network failure, there is no status code.',
  'http-error':
    'A response did arrive: a 4xx or 5xx status is a complete, normal HTTP response. The JavaScript checked the status and chose to treat it as an error. fetch() does not reject for this on its own — the code has to check response.ok.',
  'parse-error':
    'The response arrived, but its body is not valid JSON, so parsing threw an error. The HTTP status alone could not reveal this.',
  'application-error':
    'The request and parsing both succeeded, but the data itself reports that the operation failed.',
};

const NOTE_STYLE: Record<NoteTone, { box: string; icon: typeof Info }> = {
  info: { box: 'border-line bg-surface-2 text-text', icon: Info },
  success: { box: 'border-success/40 bg-success-soft text-text', icon: CircleCheck },
  warning: { box: 'border-warning/40 bg-warning-soft text-text', icon: TriangleAlert },
  danger: { box: 'border-danger/40 bg-danger-soft text-text', icon: CircleAlert },
};

/** A run-specific fact from the server trace, e.g. which hook was resolved. */
function StageNoteCallout({ note }: { note: StageNote }) {
  const { box, icon: Icon } = NOTE_STYLE[note.tone];
  return (
    <div className={`flex gap-2 rounded-lg border p-3 text-sm ${box}`}>
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden />
      <p className="min-w-0 font-mono text-xs leading-relaxed [overflow-wrap:anywhere]">{note.text}</p>
    </div>
  );
}

export function ExplanationPanel({ view }: { view: LifecycleView }) {
  const { state, entry } = useSimulation();
  const current = view.current;
  const failure = state.execution?.failure;

  if (!current) {
    return (
      <div className="space-y-3">
        <h2 className="text-base font-semibold">What happens here</h2>
        <p className="text-sm text-muted">
          Press <strong className="text-text">Play</strong> to watch the whole request, or <strong className="text-text">Next</strong> to go
          one stage at a time. You can also select any stage in the diagram to jump straight to it.
        </p>
        <p className="text-sm text-muted">
          Each stage explains what happens, which part of the system is responsible, and what data exists at that moment.
        </p>
      </div>
    );
  }

  const execution = state.execution;
  // The run's final failure, as opposed to a server that halted mid-way and still responded.
  const failedHere = execution !== null && current.index === execution.failureIndex && failure;
  const note = execution?.notes[current.stage.id];
  const realServerStage = execution?.executionMode === 'real' && current.stage.lane === 'server';
  const skipped = current.status === 'skipped';
  const haltStage = execution?.haltIndex != null ? view.stages[execution.haltIndex] : undefined;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-muted">
          Stage {current.index + 1} of {view.stages.length}
        </span>
        <StageStatusLabel status={current.status} />
      </div>
      <h2 className="text-lg font-semibold leading-snug">{current.stage.title}</h2>
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Responsible:</span>
        <Badge tone="accent">{ACTOR_LABELS[current.stage.actor]}</Badge>
      </p>
      {realServerStage ? (
        <p className="text-sm leading-relaxed text-muted">
          A real server is handling this request. What happens inside it — routing, validation, database access — is not visible from the
          browser. The next stages show what it sent back.
        </p>
      ) : (
        <>
          <p className="text-sm font-medium">{current.stage.summary}</p>
          <p className="text-sm leading-relaxed text-muted">{current.stage.explanation}</p>
        </>
      )}
      {skipped && (
        <div className="flex gap-2 rounded-lg border border-dashed border-line bg-surface-2 p-3 text-sm">
          <CircleMinus size={16} className="mt-0.5 shrink-0 text-muted" aria-hidden />
          <p>
            <strong>This stage never ran in this request.</strong>{' '}
            {haltStage ? `Processing stopped earlier, at stage ${haltStage.index + 1} (“${haltStage.stage.title}”).` : ''}
          </p>
        </div>
      )}
      {note && !skipped && <StageNoteCallout note={note} />}
      {skipped ? null : failedHere ? (
        <div className="space-y-2 rounded-lg border border-danger/40 bg-danger-soft p-3 text-sm">
          <p className="flex gap-2 font-medium text-danger">
            <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
            {failure.message}
          </p>
          <p className="leading-relaxed text-text">
            {entry?.scenario.explainFailure?.(state.execution!) ?? FAILURE_EXPLANATIONS[failure.kind]}
          </p>
        </div>
      ) : (
        <StageData current={current} />
      )}
    </div>
  );
}
