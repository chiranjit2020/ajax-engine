import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { launch, ORIGIN as QA_ORIGIN } from './browser.mjs';

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const browser = await launch();
const BASE = `${QA_ORIGIN}/#/`;
const findings = [];

async function audit(label, page) {
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(async () =>
    window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } }),
  );
  for (const violation of result.violations) {
    findings.push({
      where: label,
      rule: violation.id,
      impact: violation.impact,
      count: violation.nodes.length,
      sample: violation.nodes.slice(0, 2).map((node) => `${node.target.join(' ')} :: ${node.failureSummary?.split('\n')[1]?.trim() ?? ''}`),
    });
  }
}

const states = [
  ['lab idle', '', null],
  ['lab mid-run', '', async (p) => { for (let i = 0; i < 6; i++) await p.getByRole('button', { name: /^Next$/ }).first().click(); }],
  ['lab failure', '', async (p) => { await p.getByRole('combobox', { name: /Profile/ }).selectOption('999'); await p.getByRole('list', { name: 'Request lifecycle stages' }).getByRole('button').nth(7).click(); }],
  ['learn', 'learn', null],
  ['lesson', 'learn/what-is-ajax', async (p) => { await p.getByRole('radio').first().check(); await p.getByRole('button', { name: 'Check answer' }).first().click(); }],
  ['code studio', 'code', async (p) => { await p.getByRole('button', { name: /^Next$/ }).first().click(); }],
  ['network', 'network', async (p) => { await p.getByRole('button', { name: /^Next$/ }).first().click(); }],
  ['wordpress dispatcher', 'wordpress', async (p) => { await p.getByRole('list', { name: 'Request lifecycle stages' }).getByRole('button').nth(4).click(); }],
  ['wordpress security', 'wordpress', async (p) => { await p.getByRole('tab', { name: 'Security lab' }).click(); await p.getByRole('list', { name: 'Request lifecycle stages' }).getByRole('button').nth(7).click(); }],
  ['challenges', 'challenges', async (p) => { await p.getByText('A single “0”').click(); }],
  ['reference', 'reference', null],
];

for (const scheme of ['light', 'dark']) {
  for (const [label, path, act] of states) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: scheme, reducedMotion: 'reduce' });
    await page.goto(BASE + path);
    await page.waitForTimeout(400);
    if (act) await act(page);
    await page.waitForTimeout(300);
    await audit(`${label} (${scheme})`, page);
    await page.close();
  }
}

// Keyboard: reach and operate the playback controls without a mouse, with a visible focus indicator.
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(BASE);
await page.waitForTimeout(400);
const focusTrail = [];
let nextFocused = false;
for (let i = 0; i < 60 && !nextFocused; i++) {
  await page.keyboard.press('Tab');
  const info = await page.evaluate(() => {
    const el = document.activeElement;
    const style = el ? getComputedStyle(el) : null;
    return { text: (el?.getAttribute('aria-label') || el?.textContent || el?.tagName || '').trim().slice(0, 30), outline: style ? style.outlineStyle !== 'none' && style.outlineWidth !== '0px' : false };
  });
  focusTrail.push(info);
  nextFocused = info.text === 'Next';
}
await page.keyboard.press('Enter');
const afterEnter = await page.evaluate(() => document.querySelector('[aria-current="step"]')?.textContent ?? null);
const missingOutline = focusTrail.filter((item) => !item.outline).map((item) => item.text);
await browser.close();

for (const finding of findings) console.log(`FAIL  ${finding.where}: ${finding.rule} (${finding.impact}, ${finding.count} nodes) ${finding.sample[0] ?? ''}`);
console.log(`${findings.length === 0 ? 'PASS' : 'FAIL'}  axe: ${findings.length} violations across ${states.length * 2} page states`);
const keyboardOk = nextFocused && afterEnter !== null && missingOutline.length === 0;
console.log(`${keyboardOk ? 'PASS' : 'FAIL'}  keyboard: Next reached in ${focusTrail.length} Tab presses, Enter works, every focused element shows an outline`);
if (findings.length || !keyboardOk) process.exitCode = 1;
