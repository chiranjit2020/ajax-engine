import { defineSharedStages } from '../../engine/lifecycle';
import type { HttpResponse, Scenario, ServerResult } from '../../engine/types';

/**
 * Standalone scenarios 4–6: update a record (PATCH), delete a record (DELETE),
 * and load more content (paginated GET). Each has a deterministic in-browser server.
 */

const json = (status: number, statusText: string, body: unknown): HttpResponse => ({
  status,
  statusText,
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  rawBody: JSON.stringify(body),
});

// ─── Update a record (PATCH) ───────────────────────────────────────────────

export interface UpdateInput {
  role: string;
}

export const updateProfileScenario: Scenario<UpdateInput> = {
  id: 'update-record',
  track: 'standalone',
  title: 'Update a record (PATCH)',
  description: 'Change one field of a profile. Only the changed field is sent, as JSON, and the server returns the updated record.',
  defaultInput: { role: 'Engineering Lead' },
  presets: { empty: { label: 'Empty role (422)', input: { role: '   ' } } },
  stages: defineSharedStages({
    'user-action': { summary: 'The user edits the role and presses Save.' },
    'js-handler': {
      summary: 'The handler builds a PATCH request with a JSON body containing only the role.',
      explanation:
        'PATCH means “change part of this resource”. The URL names the record (/api/profile/7); the body lists only the fields that change. Because the body is JSON, the code must set Content-Type: application/json itself.',
    },
    'http-request': { summary: 'PATCH /api/profile/7 carries {"role": …} in the body.' },
    'server-processing': { summary: 'The simulated server validates the role and updates the record.' },
    'http-response': { summary: 'The server answers 200 with the whole updated record, or 422.' },
    'js-handles-response': { summary: 'JavaScript checks response.ok and parses the updated record.' },
    'dom-update': { summary: 'The card shows the saved value returned by the server.' },
  }),
  buildRequest: ({ role }) => ({
    method: 'PATCH',
    url: '/api/profile/7',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: { kind: 'json', value: { role } },
  }),
  simulateServer: (request): ServerResult => {
    const role = request.body.kind === 'json' ? String((request.body.value as { role?: unknown }).role ?? '').trim() : '';
    if (!role) return { kind: 'response', response: json(422, 'Unprocessable Content', { errors: { role: 'Role cannot be empty.' } }) };
    if (role.length > 40) return { kind: 'response', response: json(422, 'Unprocessable Content', { errors: { role: 'Role must be 40 characters or fewer.' } }) };
    return { kind: 'response', response: json(200, 'OK', { id: 7, name: 'Maya Chen', role }) };
  },
  explainFailure: (execution) =>
    execution.response?.status === 422
      ? 'The server rejected the new value with 422. Nothing was changed, so the page keeps showing the previous role and displays the message.'
      : null,
  describeDomChanges: (execution) => [`#profile-card .role → "${(execution.parsedBody as { role: string }).role}"`],
};

// ─── Delete a record (DELETE) ──────────────────────────────────────────────

export interface Task {
  id: number;
  title: string;
}

export const TASKS: Task[] = [
  { id: 3, title: 'Write tests' },
  { id: 4, title: 'Review pull request' },
  { id: 5, title: 'Update README' },
];

export interface DeleteInput {
  taskId: number;
  /** Simulates the task having been deleted already, e.g. in another tab. */
  alreadyDeleted: boolean;
}

export const deleteRecordScenario: Scenario<DeleteInput> = {
  id: 'delete-record',
  track: 'standalone',
  title: 'Delete a record (DELETE)',
  description: 'Confirm, then delete a task. A successful DELETE returns 204 No Content — a response with no body at all.',
  defaultInput: { taskId: 3, alreadyDeleted: false },
  presets: { gone: { label: 'Already deleted elsewhere (404)', input: { taskId: 3, alreadyDeleted: true } } },
  stages: defineSharedStages({
    'user-action': { summary: 'The user clicks Delete and confirms.' },
    'js-handler': {
      summary: 'After confirmation, the handler builds DELETE /api/tasks/{id}.',
      explanation: 'Deleting cannot be undone, so the page asks for confirmation first. The request needs no body: the URL names the record to delete.',
    },
    'http-request': { summary: 'DELETE /api/tasks/{id} travels to the server, with no body.' },
    'server-processing': { summary: 'The simulated server deletes the task — if it still exists.' },
    'http-response': { summary: 'The server answers 204 No Content, or 404 if the task is already gone.' },
    'js-handles-response': {
      summary: 'JavaScript checks the status. A 204 has no body, so there is nothing to parse.',
      explanation: 'Calling response.json() on a 204 would throw, because the body is empty. The status alone says the deletion worked.',
    },
    'dom-update': { summary: 'The task’s row is removed from the list.' },
  }),
  buildRequest: ({ taskId }) => ({ method: 'DELETE', url: `/api/tasks/${taskId}`, headers: {}, body: { kind: 'none' } }),
  simulateServer: (request, input): ServerResult => {
    const id = Number(request.url.split('/').pop());
    if (input.alreadyDeleted || !TASKS.some((task) => task.id === id)) {
      return { kind: 'response', response: json(404, 'Not Found', { error: 'Task not found' }) };
    }
    return { kind: 'response', response: { status: 204, statusText: 'No Content', headers: {}, rawBody: '' } };
  },
  explainFailure: (execution) =>
    execution.response?.status === 404
      ? 'The task no longer exists on the server — it was already deleted elsewhere. The page should remove the stale row and tell the user, rather than show a generic error.'
      : null,
  describeDomChanges: (execution) => [`#task-${execution.request.url.split('/').pop()} removed from the list`],
};

// ─── Load more content (paginated GET) ─────────────────────────────────────

export const ARTICLES = [
  'What AJAX actually is',
  'GET versus POST',
  'Reading HTTP status codes',
  'Parsing JSON safely',
  'Debouncing input',
  'Cancelling requests',
  'WordPress admin-ajax.php',
  'Nonces and capabilities',
];

export const PER_PAGE = 3;
export const lastPage = Math.ceil(ARTICLES.length / PER_PAGE);

export function articlesOnPage(page: number): string[] {
  return ARTICLES.slice((page - 1) * PER_PAGE, page * PER_PAGE);
}

export interface PageInput {
  /** The page to request; page 1 was rendered with the page itself. */
  page: number;
}

export const loadMoreScenario: Scenario<PageInput> = {
  id: 'load-more',
  track: 'standalone',
  title: 'Load more content (pagination)',
  description: 'Load the next page of articles and append it to the list already on screen, until there is nothing left.',
  defaultInput: { page: 2 },
  stages: defineSharedStages({
    'user-action': { summary: 'The user clicks “Load more”.' },
    'js-handler': {
      summary: 'The handler asks for the next page: GET /api/articles?page=N&per_page=3.',
      explanation: 'The page keeps track of how many pages it has shown. Each click asks the server for the next page only.',
    },
    'server-processing': { summary: 'The simulated server returns that slice of the articles, and whether more remain.' },
    'http-response': { summary: 'Three articles (or fewer) and hasMore come back as JSON.' },
    'dom-update': {
      summary: 'The new articles are appended; the existing ones stay.',
      explanation: 'The new items are added after the existing ones, so nothing already on screen is re-rendered. When hasMore is false, the button is hidden.',
    },
  }),
  buildRequest: ({ page }) => ({
    method: 'GET',
    url: `/api/articles?page=${page}&per_page=${PER_PAGE}`,
    headers: { Accept: 'application/json' },
    body: { kind: 'none' },
  }),
  simulateServer: (request): ServerResult => {
    const page = Number(new URL(request.url, 'https://ajax-lab.test').searchParams.get('page'));
    return { kind: 'response', response: json(200, 'OK', { page, items: articlesOnPage(page), hasMore: page < lastPage }) };
  },
  describeDomChanges: (execution) => {
    const data = execution.parsedBody as { items: string[]; hasMore: boolean };
    return [...data.items.map((item) => `#articles += <li> "${item}"`), data.hasMore ? '#load-more stays visible' : '#load-more hidden (no more pages)'];
  },
};
