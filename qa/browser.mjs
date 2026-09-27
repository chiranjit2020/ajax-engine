import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

/** Base URL of a running `npm run preview` server. */
export const ORIGIN = process.env.QA_ORIGIN ?? 'http://localhost:4173';

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

/** Launch the locally installed Chrome/Edge/Chromium (set CHROME_PATH to override). */
export function launch() {
  const executablePath = CANDIDATES.find((path) => path && existsSync(path));
  if (!executablePath) throw new Error('No Chrome/Chromium found. Set CHROME_PATH to its executable.');
  return chromium.launch({ executablePath });
}
