import { defineSharedStages } from '../../engine/lifecycle';
import type { Execution, HttpResponse, Scenario, ServerResult } from '../../engine/types';

/**
 * Standalone scenario 2 — "Live search (GET)". Keystrokes are debounced; the
 * request for the final term is the one followed through the lifecycle. An
 * earlier, slower request for the previous term is still in flight: with
 * cancellation the code aborts it, without cancellation its stale results
 * arrive last and overwrite the correct ones.
 */
export interface SearchInput {
  query: string;
  /** Abort the previous request before sending a new one. */
  cancelStale: boolean;
}

export const PRODUCTS = ['Cable', 'Camera', 'Candle', 'Canvas bag', 'Carpet', 'Cat bed', 'Catalog', 'Cup', 'Desk lamp', 'Notebook'];

export function searchProducts(query: string): string[] {
  const needle = query.trim().toLowerCase();
  return needle ? PRODUCTS.filter((name) => name.toLowerCase().startsWith(needle)) : [];
}

/** The keystrokes that led to the query, and which of them sent a request (a pause of 300 ms or more). */
export function keystrokes(query: string): { text: string; sent: boolean }[] {
  const steps = [...query].map((_, index) => query.slice(0, index + 1));
  // The learner paused after the second-to-last term (sending it), then typed the last character.
  return steps.map((text, index) => ({ text, sent: index >= steps.length - 2 && text.length >= 2 }));
}

/** The earlier request still in flight when the final one is sent, if any. */
export function previousTerm(query: string): string | null {
  return query.length >= 3 ? query.slice(0, -1) : null;
}

/** What the results list finally shows. Without cancellation, the stale response arrives last and wins. */
export function finalResults(execution: Execution, input: SearchInput): { term: string; results: string[]; stale: boolean } {
  const data = execution.parsedBody as { query: string; results: string[] };
  const previous = previousTerm(input.query);
  if (!input.cancelStale && previous) return { term: previous, results: searchProducts(previous), stale: true };
  return { term: data.query, results: data.results, stale: false };
}

function simulate(request: { url: string }): ServerResult {
  const query = new URL(request.url, 'https://ajax-lab.test').searchParams.get('q') ?? '';
  const response: HttpResponse = {
    status: 200,
    statusText: 'OK',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    rawBody: JSON.stringify({ query, results: searchProducts(query) }),
  };
  return { kind: 'response', response };
}

export const liveSearchScenario: Scenario<SearchInput> = {
  id: 'live-search',
  track: 'standalone',
  title: 'Live search (GET)',
  description: 'Type to search products. See debouncing reduce requests, and what happens when an older, slower response arrives last.',
  defaultInput: { query: 'cat', cancelStale: true },
  presets: {
    race: { label: 'Stale response wins (no cancellation)', input: { query: 'cat', cancelStale: false } },
  },
  stages: defineSharedStages({
    'user-action': {
      summary: 'The user types; each keystroke fires an input event.',
      explanation:
        'Every keystroke fires an input event, but sending a request for each one would waste requests and invite races. The handler waits until typing pauses for 300 ms (debouncing).',
    },
    'js-handler': {
      summary: 'Typing paused, so the handler builds GET /api/search?q=… for the current term.',
      explanation:
        'A request for the previous term is still in flight. With cancellation, the code aborts it now through its AbortController, so its response can never reach the page. The new term is URL-encoded into the query string.',
    },
    'http-request': { summary: 'GET /api/search?q=… travels to the server.' },
    'server-processing': { summary: 'The simulated server finds products starting with the term.' },
    'http-response': { summary: 'The matching products come back as JSON.' },
    'js-handles-response': { summary: 'JavaScript parses the list of matches.' },
    'dom-update': {
      summary: 'The results list is replaced with the matches.',
      explanation:
        'Only the results list changes. Without cancellation, the slower response for the previous term would arrive after this one and replace the list again — showing results that no longer match what the user typed.',
    },
  }),
  buildRequest: ({ query }) => ({
    method: 'GET',
    url: `/api/search?q=${encodeURIComponent(query)}`,
    headers: { Accept: 'application/json' },
    body: { kind: 'none' },
  }),
  simulateServer: simulate,
  describeDomChanges: (execution) => {
    const results = (execution.parsedBody as { results: string[] }).results;
    return [`#results → ${results.length} item(s): ${results.join(', ') || '(none)'}`];
  },
};

export function liveSearchSource(input: SearchInput): string {
  const abort = input.cancelStale
    ? `  // @stage js-handler
  // @note Abort the previous request, so its response can never overwrite newer results.
  controller?.abort();
  controller = new AbortController();
  // @end
`
    : `  // @stage js-handler
  // @note REMOVED cancellation: an older request can still finish after this one.
  // controller?.abort();
  // @end
`;
  return `// @stage user-action
const input = document.querySelector('#search');
const results = document.querySelector('#results');
let timer;
let controller;

// @note Debounce: each keystroke restarts a 300 ms timer. Only a pause in typing sends a request.
input.addEventListener('input', () => {
  clearTimeout(timer);
  timer = setTimeout(() => search(input.value), 300);
});
// @end

async function search(term) {
${abort}
  // @stage js-handler
  const url = '/api/search?q=' + encodeURIComponent(term);
  // @end
  try {
    // @stage http-request, server-receives, server-processing, http-response
    const response = await fetch(url, {${input.cancelStale ? ' signal: controller.signal,' : ''} headers: { Accept: 'application/json' } });
    // @end
    // @stage js-handles-response
    const data = await response.json();
    // @end
    // @stage dom-update
    results.replaceChildren(...data.results.map((name) => {
      const li = document.createElement('li');
      li.textContent = name;
      return li;
    }));
    // @end
  } catch (error) {
    // @stage js-handles-response ?failure
    // @note An aborted request rejects with AbortError. That is expected, so it is ignored.
    if (error.name !== 'AbortError') results.textContent = 'Search failed.';
    // @end
  }
}
`;
}
