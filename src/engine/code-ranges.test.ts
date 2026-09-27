import { linesForStage, parseStageMarkers, stageForLine } from './code-ranges';

const source = [
  '// @stage outer',
  'a();',
  '  // @stage inner, other',
  '  b();',
  '  // @end',
  '# @stage php-style',
  'c();',
  '# @end',
  '// @end',
  'd();',
  '',
].join('\r\n');

describe('parseStageMarkers', () => {
  const parsed = parseStageMarkers(source);

  it('removes marker lines and keeps the code', () => {
    expect(parsed.code).toBe('a();\n  b();\nc();\nd();');
    expect(parsed.lineCount).toBe(4);
  });

  it('maps stages to line ranges in the cleaned code', () => {
    expect([...linesForStage(parsed, 'outer')]).toEqual([1, 2, 3]);
    expect([...linesForStage(parsed, 'inner')]).toEqual([2]);
    expect([...linesForStage(parsed, 'other')]).toEqual([2]);
    expect([...linesForStage(parsed, 'php-style')]).toEqual([3]);
  });

  it('resolves a clicked line to its innermost stage', () => {
    expect(stageForLine(parsed, 1)).toBe('outer');
    expect(stageForLine(parsed, 2)).toBe('inner');
    expect(stageForLine(parsed, 4)).toBeNull();
  });

  it('attaches @note lines to the following code line', () => {
    const withNotes = parseStageMarkers(['// @stage a', '// @note First part', '// @note second part.', 'x();', 'y();', '// @end'].join('\n'));
    expect(withNotes.code).toBe('x();\ny();');
    expect(withNotes.notes).toEqual({ 1: 'First part second part.' });
  });

  it('limits outcome-specific ranges to runs with that outcome', () => {
    const conditional = parseStageMarkers(['// @stage a', 'ok();', '// @end', '// @stage a ?failure', 'fail();', '// @end'].join('\n'));
    expect([...linesForStage(conditional, 'a', ['success'])]).toEqual([1]);
    expect([...linesForStage(conditional, 'a', ['failure', 'other'])]).toEqual([1, 2]);
    expect([...linesForStage(conditional, 'a')]).toEqual([1, 2]);
  });

  it('rejects unbalanced markers', () => {
    expect(() => parseStageMarkers('// @stage x\na();')).toThrow(/Unclosed/);
    expect(() => parseStageMarkers('a();\n// @end')).toThrow(/Unmatched/);
  });
});
