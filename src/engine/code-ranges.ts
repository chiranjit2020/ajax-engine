import type { StageId } from './types';

/**
 * Example source files mark which lines belong to which lifecycle stage using
 * marker comments, instead of hardcoded line numbers that drift when code is edited:
 *
 *   // @stage js-handler
 *   const response = await fetch('/api/profile');
 *   // @end
 *
 * A marker may list several stages (`// @stage http-request, js-handler`).
 * A trailing `?tag` limits the range to runs carrying that tag: `?success` or
 * `?failure` (e.g. a catch block), or a scenario-specific tag from the server
 * trace such as `?nonce-failed`.
 * Ranges may nest. `// @note <text>` attaches a short explanation to the next
 * code line; it is shown beside that line while its stage is active.
 * Marker lines are removed from the displayed code, and all line numbers
 * below are 1-based positions in that cleaned code.
 */
export interface StageRange {
  stageId: StageId;
  startLine: number;
  endLine: number;
  /** Only highlight for runs carrying this tag; undefined means always. */
  when?: string;
}

export interface AnnotatedSource {
  code: string;
  lineCount: number;
  ranges: StageRange[];
  /** Explanations keyed by line number. */
  notes: Record<number, string>;
}

const OPEN = /^\s*(?:\/\/|#|\/\*)\s*@stage\s+([\w-]+(?:\s*,\s*[\w-]+)*)\s*(?:\?([\w-]+))?\s*(?:\*\/)?\s*$/;
const NOTE = /^\s*(?:\/\/|#)\s*@note\s+(.+?)\s*$/;
const CLOSE = /^\s*(?:\/\/|#|\/\*)\s*@end\s*(?:\*\/)?\s*$/;

export function parseStageMarkers(source: string): AnnotatedSource {
  const output: string[] = [];
  const ranges: StageRange[] = [];
  const open: { stageIds: StageId[]; startLine: number; when?: string }[] = [];
  const notes: Record<number, string> = {};
  let pendingNote: string | null = null;

  source.replace(/\r\n/g, '\n').split('\n').forEach((line, index) => {
    const opening = OPEN.exec(line);
    if (opening) {
      open.push({
        stageIds: opening[1]!.split(',').map((id) => id.trim()),
        startLine: output.length + 1,
        when: opening[2],
      });
      return;
    }
    if (CLOSE.test(line)) {
      const range = open.pop();
      if (!range) throw new Error(`Unmatched @end marker on source line ${index + 1}`);
      for (const stageId of range.stageIds) {
        ranges.push({ stageId, startLine: range.startLine, endLine: output.length, when: range.when });
      }
      return;
    }
    const note = NOTE.exec(line);
    if (note) {
      pendingNote = pendingNote ? `${pendingNote} ${note[1]}` : note[1]!;
      return;
    }
    output.push(line);
    if (pendingNote) {
      notes[output.length] = pendingNote;
      pendingNote = null;
    }
  });

  if (open.length > 0) {
    throw new Error(`Unclosed @stage marker for "${open[open.length - 1]!.stageIds.join(', ')}"`);
  }

  // Drop a single trailing empty line left by a final newline.
  if (output.length > 0 && output[output.length - 1] === '') output.pop();

  return { code: output.join('\n'), lineCount: output.length, ranges, notes };
}

/** Lines for a stage. Conditional ranges are included only when `tags` contains their tag; without tags, all are included. */
export function linesForStage(source: AnnotatedSource, stageId: StageId, tags?: readonly string[]): Set<number> {
  const lines = new Set<number>();
  for (const range of source.ranges) {
    if (range.stageId !== stageId) continue;
    if (range.when && tags && !tags.includes(range.when)) continue;
    for (let line = range.startLine; line <= range.endLine; line++) lines.add(line);
  }
  return lines;
}

/** The stage a clicked line belongs to — the innermost (shortest) range wins. */
export function stageForLine(source: AnnotatedSource, line: number): StageId | null {
  let best: StageRange | null = null;
  for (const range of source.ranges) {
    if (line < range.startLine || line > range.endLine) continue;
    if (!best || range.endLine - range.startLine < best.endLine - best.startLine) best = range;
  }
  return best?.stageId ?? null;
}
