import { ArrowRight } from 'lucide-react';
import { useInspector } from '../../app/providers/InspectorProvider';
import { useSimulation } from '../../app/providers/SimulationProvider';
import { resolveSource } from '../../data/scenarios';
import { linesForStage } from '../../engine/code-ranges';
import type { LifecycleView } from '../../hooks/useLifecycleView';
import { CodeView } from '../code/CodeView';

/**
 * Code for the active scenario. For alternative implementations (fetch vs XHR
 * vs jQuery) every file highlights the equivalent lines. For a client/server
 * pair, a hint points to the file where the current stage's code lives.
 */
export function CodeTab({ view }: { view: LifecycleView }) {
  const { entry, state, input, selectStage } = useSimulation();
  const { codeFileId, setCodeFileId } = useInspector();
  if (!entry || entry.code.length === 0) return <p className="p-3 text-sm text-muted">No code for this scenario yet.</p>;

  const file = entry.code.find((codeFile) => codeFile.id === codeFileId) ?? entry.code[0]!;
  const source = resolveSource(file, input);
  const tags = state.execution?.tags;
  // Skipped stages never ran, so no code is highlighted for them.
  const activeStageId = view.current && view.current.status !== 'skipped' ? view.current.stage.id : null;
  const titleOf = (stageId: string) => view.stages.find(({ stage }) => stage.id === stageId)?.stage.title ?? stageId;

  const elsewhere =
    activeStageId && linesForStage(source, activeStageId, tags).size === 0
      ? entry.code.find((other) => other !== file && linesForStage(resolveSource(other, input), activeStageId, tags).size > 0)
      : undefined;

  return (
    <div>
      {entry.code.length > 1 && (
        <div className="sticky top-0 z-10 space-y-2 border-b border-line bg-surface px-3 py-2">
          <div role="group" aria-label={entry.codeLayout === 'alternatives' ? 'Implementation' : 'File'} className="flex flex-wrap gap-1">
            {entry.code.map((codeFile) => (
              <button
                key={codeFile.id}
                type="button"
                aria-pressed={codeFile === file}
                onClick={() => setCodeFileId(codeFile.id)}
                className="rounded-md border border-transparent px-2 py-1 font-mono text-xs text-muted hover:text-text aria-pressed:border-line aria-pressed:bg-surface-2 aria-pressed:text-text"
              >
                {codeFile.label}
              </button>
            ))}
          </div>
          {file.keyPoint && <p className="text-xs leading-relaxed text-muted">{file.keyPoint}</p>}
          {elsewhere && (
            <button
              type="button"
              onClick={() => setCodeFileId(elsewhere.id)}
              className="inline-flex items-center gap-1 rounded-md bg-accent-soft px-2 py-1 text-xs font-medium text-accent"
            >
              This stage runs in {elsewhere.label} <ArrowRight size={12} aria-hidden />
            </button>
          )}
        </div>
      )}
      <CodeView
        file={file}
        source={source}
        activeStageId={activeStageId}
        tags={tags}
        stageTitle={titleOf}
        onSelectStage={(stageId) => {
          const index = view.stages.findIndex(({ stage }) => stage.id === stageId);
          if (index >= 0) selectStage(index);
        }}
      />
    </div>
  );
}
