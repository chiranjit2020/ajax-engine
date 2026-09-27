import { launch, ORIGIN as QA_ORIGIN } from './browser.mjs';

const ORIGIN = QA_ORIGIN;
const BASE = `${ORIGIN}/#/`;
const browser = await launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
const results = [];
const errors = [];
const offOrigin = new Set();
context.on('request', (request) => {
  if (!request.url().startsWith(ORIGIN) && !request.url().startsWith('data:')) offOrigin.add(request.url());
});
const record = (check, pass, detail = '') => results.push({ check, pass, detail });

async function newPage(path = '') {
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`${path}: ${error.message}`));
  page.on('console', (message) => message.type() === 'error' && errors.push(`${path}: ${message.text()}`));
  await page.goto(BASE + path);
  await page.waitForTimeout(400);
  return page;
}
const current = (page) => page.evaluate(() => document.querySelector('[aria-label="Request lifecycle stages"] [aria-current="step"]')?.textContent ?? null);
const stageButton = (page, n) => page.getByRole('list', { name: 'Request lifecycle stages' }).first().getByRole('button').nth(n);
const control = (page, name) => page.getByRole('group', { name: 'Playback' }).first().getByRole('button', { name, exact: true });

// 1. Core lifecycle controls, with real timers.
{
  const page = await newPage();
  await page.getByLabel('Speed').first().selectOption('0.5');
  await control(page, 'Play').click();
  await page.waitForTimeout(900);
  const playing = await current(page);
  await control(page, 'Pause').click();
  const paused = await current(page);
  await page.waitForTimeout(1500);
  record('Pause stops playback', (await current(page)) === paused, paused ?? '');
  await control(page, 'Resume').click();
  await page.waitForTimeout(900);
  record('Play advances; Resume continues', playing !== null && (await current(page)) !== paused);
  await control(page, 'Pause').click();
  const before = await current(page);
  await control(page, 'Previous').click();
  const back = await current(page);
  await control(page, 'Next').click();
  record('Previous and Next step one stage', back !== before && (await current(page)) === before);
  await control(page, 'Replay').click();
  record('Replay restarts at stage 1', (await current(page))?.includes('User action') ?? false);
  await control(page, 'Reset').click();
  record('Reset returns to idle', (await current(page)) === null);

  // 9. Switching scenario during playback leaves no animation running.
  await control(page, 'Play').click();
  await page.waitForTimeout(700);
  await page.getByRole('combobox', { name: 'Scenario' }).first().selectOption({ label: 'Live search (GET)' });
  await page.waitForTimeout(2500);
  record('Scenario switch mid-playback stops the old run', (await current(page)) === null);
  await page.close();
}

// 2. Every standalone scenario runs end to end.
{
  const page = await newPage();
  const options = await page.getByRole('combobox', { name: 'Scenario' }).first().locator('option').allTextContents();
  for (const title of options) {
    await page.getByRole('combobox', { name: 'Scenario' }).first().selectOption({ label: title });
    await stageButton(page, 7).click();
    const text = await current(page);
    record(`Scenario runs: ${title}`, text !== null, text ?? '');
  }
  await page.close();
}

// 4. Code highlighting matches the stage; 11. copy copies the cleaned source.
{
  const page = await newPage();
  await stageButton(page, 7).click();
  const highlighted = await page.evaluate(() => [...document.querySelectorAll('[data-line].bg-accent-soft')].map((line) => line.textContent).join('\n'));
  record('Code highlight matches the DOM-update stage', highlighted.includes("textContent = profile.name"));
  await page.getByRole('button', { name: 'Copy code' }).first().click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  record('Copy button copies the cleaned source', copied.includes('async function loadProfile()') && !/@stage|@note|@end/.test(copied), `${copied.length} chars`);
  // 13. Simulation is labelled as such.
  await page.getByRole('tab', { name: 'Network' }).click();
  record('Simulated requests are labelled', (await page.getByText('Simulated — no real server was contacted').count()) + (await page.getByText('This request never left your browser.').count()) > 0);
  await page.close();
}

// 3. WordPress dispatcher in the browser: a logged-out visitor without a nopriv hook gets "0".
{
  const page = await newPage('wordpress');
  await page.getByRole('button', { name: /Remove wp_ajax_nopriv_get_student_details/ }).click();
  await stageButton(page, 6).click();
  record('WordPress: missing nopriv hook answers "0" / 400', (await page.getByText('HTTP 400 Bad Request · body: 0').count()) + (await page.getByText(/Body "0" with HTTP 400/).count()) > 0);
  await page.close();
}

// 7. Responsive layouts and 10. routes survive a refresh.
const routes = ['', 'learn', 'learn/what-is-ajax', 'code', 'network', 'wordpress', 'challenges', 'reference'];
for (const width of [320, 768, 1280]) {
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`${width}: ${error.message}`));
  await page.setViewportSize({ width, height: 900 });
  for (const route of routes) {
    await page.goto(BASE + route);
    await page.reload();
    await page.waitForSelector('h1', { state: 'attached' });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 0) record(`No horizontal overflow at ${width}px: /${route}`, false, `${overflow}px`);
  }
  record(`All routes load after refresh without overflow at ${width}px`, !results.some((r) => r.check.startsWith(`No horizontal overflow at ${width}px`)));
  await page.close();
}

// 8. Reduced motion disables packet transitions.
{
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  await page.goto(BASE);
  await page.getByRole('list', { name: 'Request lifecycle stages' }).getByRole('button').nth(2).click();
  const duration = await page.getByRole('button', { name: /Request packet/ }).evaluate((el) => getComputedStyle(el).transitionDuration);
  record('Reduced motion disables packet animation', duration.split(',').every((value) => parseFloat(value) < 0.01), duration);
  await page.close();
}

// 12. Offline after load: every page, including the lazily loaded ones.
{
  const page = await newPage();
  await page.waitForTimeout(2500); // allow the background prefetch
  await context.setOffline(true);
  const failures = [];
  for (const route of ['learn', 'learn/what-is-ajax', 'challenges', 'reference', 'wordpress', 'code', '']) {
    await page.evaluate((hash) => {
      window.location.hash = hash;
    }, `#/${route}`);
    await page.waitForTimeout(400);
    const h1 = await page.locator('h1').count();
    if (!h1) failures.push(route);
  }
  await stageButton(page, 7).click();
  record('Works offline after load (all pages, and the simulation)', failures.length === 0 && (await current(page)) !== null, failures.join(', '));
  await context.setOffline(false);
  await page.close();
}

record('No request left localhost during the whole session', offOrigin.size === 0, [...offOrigin].slice(0, 3).join(', '));
record('No console errors or page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
await browser.close();
for (const result of results) console.log(`${result.pass ? 'PASS' : 'FAIL'}  ${result.check}${result.detail ? ` — ${result.detail}` : ''}`);
if (results.some((result) => !result.pass)) process.exitCode = 1;
