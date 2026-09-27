import { useEffect, useState } from 'react';
import { useSimulation } from '../app/providers/SimulationProvider';
import { CodeView } from '../components/code/CodeView';
import { WorkspaceToolbar } from '../components/layout/WorkspaceToolbar';
import { PlaybackControls } from '../components/visualizer/PlaybackControls';
import { StageStatusLabel } from '../components/visualizer/StageStatusLabel';
import { resolveSource, type CodeFile } from '../data/scenarios';
import { linesForStage } from '../engine/code-ranges';
import { ACTOR_LABELS, useLifecycleView, type LifecycleView } from '../hooks/useLifecycleView';

/** One column of code. With `follow`, it switches to the file containing the active stage’s lines. */
function CodePane({ title, files, view, follow }: { title: string; files: CodeFile[]; view: LifecycleView; follow: boolean }) {
  const { state, input, selectStage } = useSimulation();
  const [selectedId, setSelectedId] = useState(files[0]?.id);
  const tags = state.execution?.tags;
  const activeStageId = view.current && view.current.status !== 'skipped' ? view.current.stage.id : null;
  const file = files.find((codeFile) => codeFile.id === selectedId) ?? files[0];

  useEffect(() => {
    if (!follow || !activeStageId || !file) return;
    if (linesForStage(resolveSource(file, input), activeStageId, tags).size > 0) return;
    const other = files.find((codeFile) => linesForStage(resolveSource(codeFile, input), activeStageId, tags).size > 0);
    if (other) setSelectedId(other.id);
    // Only react to stage changes; a manual file choice stays until the next stage.
  }, [activeStageId, state.execution]);

  if (!file) return null;
  const hasLines = activeStageId ? linesForStage(resolveSource(file, input), activeStageId, tags).size > 0 : false;

  return (
    <section aria-label={title} className="flex min-w-0 flex-col rounded-xl border border-line bg-surface">
      <div className="space-y-2 border-b border-line px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{title}</h2>
          {activeStageId && !hasLines && <span className="text-xs text-muted">No code here for this stage</span>}
        </div>
        {files.length > 1 && (
          <div role="group" aria-label={`${title} files`} className="flex flex-wrap gap-1">
            {files.map((codeFile) => (
              <button
                key={codeFile.id}
                type="button"
                aria-pressed={codeFile === file}
                onClick={() => setSelectedId(codeFile.id)}
                className="rounded-md border border-transparent px-2 py-1 font-mono text-xs text-muted hover:text-text aria-pressed:border-line aria-pressed:bg-surface-2 aria-pressed:text-text"
              >
                {codeFile.label}
              </button>
            ))}
          </div>
        )}
        {file.keyPoint && <p className="text-xs leading-relaxed text-muted">{file.keyPoint}</p>}
      </div>
      <div data-scroll-container className="max-h-[70vh] overflow-auto">
        <CodeView
          file={file}
          source={resolveSource(file, input)}
          activeStageId={activeStageId}
          tags={tags}
          stageTitle={(stageId) => view.stages.find(({ stage }) => stage.id === stageId)?.stage.title ?? stageId}
          onSelectStage={(stageId) => {
            const index = view.stages.findIndex(({ stage }) => stage.id === stageId);
            if (index >= 0) selectStage(index);
          }}
        />
      </div>
    </section>
  );
}

/** Follow one request through the browser-side and server-side code (spec §8). */
export function CodeStudioPage() {
  const { entry, state, selectStage } = useSimulation();
  const view = useLifecycleView();
  const current = view?.current;
  const note = current ? state.execution?.notes[current.stage.id] : undefined;

  return (
    <div className="flex flex-col gap-4 p-3 sm:p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Code Studio</h1>
          <p className="max-w-2xl text-sm text-muted">
            Step through the request and watch the code that runs at each stage. Select a line number to jump to its stage.
          </p>
        </div>
        <WorkspaceToolbar />
      </div>

      {entry && view && (
        <>
          <section aria-label="Stages" className="space-y-3 rounded-xl border border-line bg-surface p-4">
            <ol aria-label="Request lifecycle stages" className="flex flex-wrap gap-1.5">
              {view.stages.map(({ stage, index, status }) => (
                <li key={stage.id}>
                  <button
                    type="button"
                    onClick={() => selectStage(index)}
                    aria-current={index === state.stageIndex ? 'step' : undefined}
                    className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-left text-xs ${
                      index === state.stageIndex ? 'border-accent bg-accent-soft' : 'border-line hover:bg-surface-2'
                    }`}
                  >
                    <span className="font-mono text-muted">{index + 1}</span>
                    <span className="font-medium">{stage.title}</span>
                    <span className="sr-only">
                      <StageStatusLabel status={status} />
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <PlaybackControls />
            {current ? (
              <div className="space-y-1 text-sm">
                <p className="flex flex-wrap items-center gap-2">
                  <strong>{current.stage.title}</strong>
                  <StageStatusLabel status={current.status} />
                  <span className="text-xs text-muted">· {ACTOR_LABELS[current.stage.actor]}</span>
                </p>
                <p className="text-muted">{current.status === 'skipped' ? 'This stage never ran in this request.' : current.stage.summary}</p>
                {note && current.status !== 'skipped' && <p className="break-words font-mono text-xs">{note.text}</p>}
              </div>
            ) : (
              <p className="text-sm text-muted">Press Play or Next to start.</p>
            )}
          </section>

          {entry.codeLayout === 'client-server' ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <CodePane title="Browser (JavaScript)" files={entry.code.filter((file) => file.side === 'client')} view={view} follow />
              <CodePane title="Server (PHP)" files={entry.code.filter((file) => file.side === 'server')} view={view} follow />
            </div>
          ) : (
            <CodePane title="Browser (JavaScript)" files={entry.code} view={view} follow={false} />
          )}
        </>
      )}
    </div>
  );
}
