import { linesForStage } from '../../engine/code-ranges';
import { responseContentType, serializeBody } from '../../engine/http';
import { resolveExecution } from '../../engine/execution';
import { failureMessage, failureRecoveryScenario, type FailureMode } from './failure-recovery';
import { SCENARIOS, resolveSource } from './index';
import { finalResults, keystrokes, liveSearchScenario, searchProducts } from './live-search';
import { ARTICLES, articlesOnPage, deleteRecordScenario, loadMoreScenario, updateProfileScenario } from './more-standalone';
import { submitFormScenario } from './submit-form';

const failure = (mode: FailureMode, attempt = 1) => resolveExecution(failureRecoveryScenario, { mode, attempt });
const stageIndex = (id: string) => failureRecoveryScenario.stages.findIndex((stage) => stage.id === id);

describe('Failure and recovery', () => {
  it.each([
    ['network', 'network', 'http-response', 'You appear to be offline. Try again.'],
    ['timeout', 'timeout', 'http-response', 'The server took too long. Try again.'],
    ['server-error', 'http-error', 'js-handles-response', 'The server reported an error (HTTP 500).'],
    ['not-found', 'http-error', 'js-handles-response', 'The server reported an error (HTTP 404).'],
    ['invalid-json', 'parse-error', 'js-handles-response', 'The server sent something we could not read.'],
  ] as const)('%s fails as %s at %s', (mode, kind, stage, message) => {
    const execution = failure(mode);
    expect(execution.failure).toMatchObject({ kind, atStage: stage });
    expect(failureMessage(execution)).toBe(message);
  });

  it('keeps network failures (no response) apart from HTTP errors (a response with an error status)', () => {
    expect(failure('network').response).toBeNull();
    expect(failure('server-error').response?.status).toBe(500);
  });

  it('reports invalid JSON even though the status is 200', () => {
    expect(failure('invalid-json').response?.status).toBe(200);
  });

  it.each(['network', 'timeout', 'server-error'] as const)('recovers from a transient %s on retry', (mode) => {
    expect(failure(mode, 2).failure).toBeNull();
  });

  it.each(['not-found', 'invalid-json'] as const)('fails again on retry for a permanent %s', (mode) => {
    expect(failure(mode, 2).failure).not.toBeNull();
  });

  it('highlights the catch block when fetch() rejects at the response stage', () => {
    const entry = SCENARIOS.find(({ scenario }) => scenario.id === 'failure-recovery')!;
    const source = resolveSource(entry.code[0]!, failureRecoveryScenario.defaultInput);
    const lines = source.code.split('\n');
    const at = (mode: FailureMode) =>
      [...linesForStage(source, 'http-response', failure(mode).tags)].map((line) => lines[line - 1]).join('\n');
    expect(at('network')).toContain('list.textContent = describe(error);');
    expect(at('server-error')).not.toContain('describe(error)');
    expect(failure('network').failureIndex).toBe(stageIndex('http-response'));
  });
});

describe('Submit a form (POST)', () => {
  it('sends the fields URL-encoded in the POST body', () => {
    const { request } = resolveExecution(submitFormScenario, submitFormScenario.defaultInput);
    expect(request.method).toBe('POST');
    expect(serializeBody(request.body)).toBe('name=Ana+Silva&email=ana%40example.test&workshop=intro-ajax');
  });

  it('answers 201 Created with a Location header for valid input', () => {
    const execution = resolveExecution(submitFormScenario, submitFormScenario.defaultInput);
    expect(execution.response).toMatchObject({ status: 201, headers: { Location: '/api/registrations/101' } });
    expect(execution.failure).toBeNull();
  });

  it('answers 422 with one message per invalid field', () => {
    const execution = resolveExecution(submitFormScenario, submitFormScenario.presets!.invalid!.input);
    expect(execution.response?.status).toBe(422);
    expect(execution.parsedBody).toEqual({ errors: { email: 'Please enter a valid email address.', workshop: 'Please choose a workshop.' } });
    expect(submitFormScenario.explainFailure!(execution)).toMatch(/The request itself worked perfectly/);
  });
});

describe('Live search', () => {
  it('searches with an encoded GET query', () => {
    const execution = resolveExecution(liveSearchScenario, { query: 'cat bed', cancelStale: true });
    expect(execution.request.url).toBe('/api/search?q=cat%20bed');
    expect(execution.parsedBody).toEqual({ query: 'cat bed', results: ['Cat bed'] });
  });

  it('debounces: only a pause sends a request', () => {
    expect(keystrokes('cat')).toEqual([
      { text: 'c', sent: false },
      { text: 'ca', sent: true },
      { text: 'cat', sent: true },
    ]);
  });

  it('shows stale results for the previous term when cancellation is off', () => {
    const input = { query: 'cat', cancelStale: false };
    const final = finalResults(resolveExecution(liveSearchScenario, input), input);
    expect(final).toEqual({ term: 'ca', results: searchProducts('ca'), stale: true });
    expect(final.results).toContain('Camera');
    const safe = { query: 'cat', cancelStale: true };
    expect(finalResults(resolveExecution(liveSearchScenario, safe), safe)).toMatchObject({ term: 'cat', stale: false });
  });

  it('generates code with or without the abort', () => {
    const entry = SCENARIOS.find(({ scenario }) => scenario.id === 'live-search')!;
    expect(resolveSource(entry.code[0]!, { query: 'cat', cancelStale: true }).code).toContain('  controller?.abort();');
    expect(resolveSource(entry.code[0]!, { query: 'cat', cancelStale: false }).code).toContain('  // controller?.abort();');
  });
});

describe('Update, delete, and load more', () => {
  it('PATCHes only the changed field as JSON', () => {
    const execution = resolveExecution(updateProfileScenario, { role: 'Staff Engineer' });
    expect(execution.request).toMatchObject({ method: 'PATCH', url: '/api/profile/7', headers: { 'Content-Type': 'application/json' } });
    expect(serializeBody(execution.request.body)).toBe('{"role":"Staff Engineer"}');
    expect(execution.parsedBody).toEqual({ id: 7, name: 'Maya Chen', role: 'Staff Engineer' });
    expect(resolveExecution(updateProfileScenario, { role: ' ' }).response?.status).toBe(422);
  });

  it('DELETE succeeds with 204 and an empty body that is never parsed as JSON', () => {
    const execution = resolveExecution(deleteRecordScenario, { taskId: 4, alreadyDeleted: false });
    expect(execution.request).toMatchObject({ method: 'DELETE', url: '/api/tasks/4', body: { kind: 'none' } });
    expect(execution.response).toMatchObject({ status: 204, rawBody: '' });
    expect(execution.failure).toBeNull();
    expect(responseContentType(execution.response!)).toBe('no body');
    expect(resolveExecution(deleteRecordScenario, { taskId: 4, alreadyDeleted: true }).response?.status).toBe(404);
  });

  it('paginates until there are no more articles', () => {
    const pages = [2, 3].map((page) => resolveExecution(loadMoreScenario, { page }).parsedBody as { items: string[]; hasMore: boolean });
    expect(pages[0]).toEqual({ page: 2, items: articlesOnPage(2), hasMore: true });
    expect(pages[1]!.hasMore).toBe(false);
    expect([...articlesOnPage(1), ...pages[0]!.items, ...pages[1]!.items]).toEqual(ARTICLES);
  });
});
