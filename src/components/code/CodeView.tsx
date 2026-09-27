import { Check, Copy, Info } from 'lucide-react';
import { Highlight, type PrismTheme } from 'prism-react-renderer';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { linesForStage, stageForLine, type AnnotatedSource } from '../../engine/code-ranges';
import type { StageId } from '../../engine/types';
import './prism';
import type { CodeFile } from '../../data/scenarios';
import { prefersReducedMotion } from '../../utils/motion';

/** Token colours come from CSS variables so both themes stay readable. */
export const THEME: PrismTheme = {
  plain: { color: 'var(--text)', backgroundColor: 'transparent' },
  styles: [
    { types: ['comment', 'prolog', 'doctype'], style: { color: 'var(--code-comment)', fontStyle: 'italic' } },
    { types: ['keyword', 'boolean', 'builtin', 'important'], style: { color: 'var(--code-keyword)' } },
    { types: ['string', 'template-string', 'char', 'regex'], style: { color: 'var(--code-string)' } },
    { types: ['function', 'class-name'], style: { color: 'var(--code-function)' } },
    { types: ['number', 'constant'], style: { color: 'var(--code-number)' } },
    { types: ['property', 'attr-name', 'variable'], style: { color: 'var(--code-property)' } },
    { types: ['punctuation', 'operator'], style: { color: 'var(--code-punctuation)' } },
  ],
};

export function CopyButton({ text, label = 'Copy code' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const timeout = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timeout.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.clearTimeout(timeout.current);
      timeout.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-surface-2 hover:text-text"
    >
      {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
      <span aria-live="polite">{copied ? 'Copied' : label}</span>
    </button>
  );
}

/**
 * Syntax-highlighted source with stage-linked lines. Lines in the active
 * stage's marker ranges are highlighted and their @note explanations shown.
 * Clicking a mapped line number selects that stage.
 */
export function CodeView({
  file,
  source,
  activeStageId,
  tags,
  stageTitle,
  onSelectStage,
}: {
  file: CodeFile;
  /** The file's annotated source for the current input (see resolveSource). */
  source: AnnotatedSource;
  activeStageId: StageId | null;
  /** Outcome tags of the current run; selects conditional highlights. */
  tags?: readonly string[];
  stageTitle(stageId: StageId): string;
  onSelectStage(stageId: StageId): void;
}) {
  const highlighted = useMemo(
    () => (activeStageId ? linesForStage(source, activeStageId, tags) : new Set<number>()),
    [source, activeStageId, tags],
  );
  const scroller = useRef<HTMLDivElement>(null);

  // Keep the first highlighted line in view when the stage changes.
  useEffect(() => {
    const first = Math.min(...highlighted);
    if (!Number.isFinite(first)) return;
    const row = scroller.current?.querySelector<HTMLElement>(`[data-line="${first}"]`);
    const container = scroller.current?.closest<HTMLElement>('[data-scroll-container]') ?? null;
    if (row && container) {
      const top = row.offsetTop - container.clientHeight / 3;
      container.scrollTo?.({ top: Math.max(top, 0), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  }, [highlighted]);

  return (
    <div ref={scroller} className="relative">
      <div className="flex items-center justify-between gap-2 px-3 pt-2">
        <p className="font-mono text-xs text-muted">{file.filename}</p>
        <CopyButton text={source.code} />
      </div>
      <Highlight code={source.code} language={file.language} theme={THEME}>
        {({ tokens, getLineProps, getTokenProps }) => (
          <div className="overflow-x-auto py-2">
            <pre className="min-w-max font-mono text-[13px] leading-6">
              <code>
                {tokens.map((line, index) => {
                  const lineNumber = index + 1;
                  const stageId = stageForLine(source, lineNumber);
                  const active = highlighted.has(lineNumber);
                  const note = active ? source.notes[lineNumber] : undefined;
                  const { className: _ignored, ...lineProps } = getLineProps({ line });
                  return (
                    <Fragment key={lineNumber}>
                      <div
                        {...lineProps}
                        data-line={lineNumber}
                        className={`flex border-l-2 pr-4 ${active ? 'border-accent bg-accent-soft' : 'border-transparent'}`}
                      >
                        {stageId ? (
                          <button
                            type="button"
                            onClick={() => onSelectStage(stageId)}
                            aria-label={`Line ${lineNumber}: go to stage “${stageTitle(stageId)}”`}
                            className="w-10 shrink-0 select-none pr-3 text-right text-muted hover:text-accent hover:underline"
                          >
                            {lineNumber}
                          </button>
                        ) : (
                          <span aria-hidden className="w-10 shrink-0 select-none pr-3 text-right text-muted">
                            {lineNumber}
                          </span>
                        )}
                        <span
                          onClick={stageId ? () => onSelectStage(stageId) : undefined}
                          className={stageId ? 'cursor-pointer' : undefined}
                        >
                          {line.map((token, key) => (
                            <span key={key} {...getTokenProps({ token })} />
                          ))}
                          {line.length === 1 && line[0]!.empty ? ' ' : null}
                        </span>
                      </div>
                      {note && (
                        <div className="flex border-l-2 border-accent bg-accent-soft pb-1.5 pl-10 pr-4">
                          <p className="flex max-w-[60ch] gap-1.5 whitespace-normal rounded-md border border-accent/30 bg-surface px-2 py-1 font-sans text-xs leading-relaxed text-text">
                            <Info size={13} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                            {note}
                          </p>
                        </div>
                      )}
                    </Fragment>
                  );
                })}
              </code>
            </pre>
          </div>
        )}
      </Highlight>
    </div>
  );
}
