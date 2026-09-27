import config from '../../vite.config';

/**
 * prismjs grammar files register themselves on a global `Prism` that
 * src/components/code/prism/global.ts sets first. If a chunk group captures
 * them, their chunk runs before that assignment and the Code Studio crashes
 * with "Prism is not defined" — in production builds only.
 */
it('never moves prismjs grammars into a separately evaluated chunk', () => {
  const splitting = (config as { build?: { rolldownOptions?: { output?: { codeSplitting?: { groups?: { test: RegExp }[] } } } } }).build
    ?.rolldownOptions?.output?.codeSplitting;
  const groups = splitting?.groups ?? [];
  const grammar = 'F:/project/node_modules/prismjs/components/prism-php.js';
  expect(groups.some((group) => group.test.test(grammar))).toBe(false);
  expect(groups.some((group) => group.test.test(grammar.replace(/\//g, '\\')))).toBe(false);
});
