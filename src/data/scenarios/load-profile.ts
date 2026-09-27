import { defineSharedStages } from '../../engine/lifecycle';
import type { HttpResponse, Scenario, ServerResult } from '../../engine/types';

/**
 * Standalone scenario 1 — "Load data on button click (GET)".
 * The learner clicks "Load Profile"; the page requests one profile and updates
 * only the profile card. The server is a deterministic in-browser simulation.
 */
export interface LoadProfileInput {
  userId: number;
}

export interface Profile {
  id: number;
  name: string;
  role: string;
  location: string;
}

export const PROFILES: Record<number, Profile> = {
  7: { id: 7, name: 'Maya Chen', role: 'Frontend Developer', location: 'Singapore' },
  8: { id: 8, name: 'Leo Martins', role: 'Backend Developer', location: 'Lisbon' },
};

export const PROFILE_OPTIONS: { value: number; label: string }[] = [
  { value: 7, label: 'id=7 · exists' },
  { value: 8, label: 'id=8 · exists' },
  { value: 999, label: 'id=999 · does not exist (404)' },
];

function json(status: number, statusText: string, body: unknown): HttpResponse {
  return {
    status,
    statusText,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
    rawBody: JSON.stringify(body),
  };
}

export const loadProfileScenario: Scenario<LoadProfileInput> = {
  id: 'load-profile',
  track: 'standalone',
  title: 'Load profile on click',
  description: 'Click “Load Profile” to fetch one user profile with GET and show it without reloading the page.',
  defaultInput: { userId: 7 },
  presets: {
    'not-found': { label: 'Profile that does not exist (404)', input: { userId: 999 } },
  },
  stages: defineSharedStages({
    'user-action': {
      summary: 'The learner clicks “Load Profile”.',
      explanation:
        'The browser fires a click event on the button. A listener registered earlier with addEventListener() is waiting for exactly this event. Until now, no request exists.',
    },
    'js-handler': {
      summary: 'The click handler reads the chosen ID and builds a GET request.',
      explanation:
        'The handler reads the selected ID from the page and builds the URL /api/profile?id=…. GET requests carry their data in the query string; there is no request body. The card is marked busy so the page can show a loading state.',
    },
    'http-request': {
      summary: 'GET /api/profile?id=… travels to the server, with no body.',
      explanation:
        'The browser sends the request line, the Accept header asking for JSON, and any same-site cookies. The request is asynchronous: the page stays interactive and other JavaScript can run while it is in flight.',
    },
    'server-receives': {
      summary: 'The simulated web server routes /api/profile to the profile endpoint.',
      explanation:
        'On a real server, a web server such as Apache or Nginx would receive this request and hand it to the program responsible for /api/profile — for example a PHP script. Here that step is simulated in your browser.',
    },
    'server-processing': {
      summary: 'The simulated endpoint validates the ID and looks it up in mock data.',
      explanation:
        'The endpoint reads id from the query string, checks it is a number, and looks for a matching profile. If one exists it prepares a 200 response; if not, a 404. No real database is involved — the data is fixed demonstration data.',
    },
    'http-response': {
      summary: 'Status, headers, and a JSON body travel back to the browser.',
      explanation:
        'The response carries a status code, headers such as Content-Type: application/json, and the body as plain text. The browser has received it, but JavaScript has not looked at it yet.',
    },
    'js-handles-response': {
      summary: 'JavaScript checks the status and parses the JSON body.',
      explanation:
        'The code that started the request continues. It checks whether the status means success, then parses the body text into a JavaScript object. A 404 is a normal HTTP response — whether it counts as an error is decided by this code.',
    },
    'dom-update': {
      summary: 'Only the profile card changes. The page does not reload.',
      explanation:
        'JavaScript writes the name and role into the card with textContent. Nothing else on the page is re-rendered: the address bar, scroll position, and anything typed elsewhere stay exactly as they were.',
    },
  }),
  buildRequest: ({ userId }) => ({
    method: 'GET',
    url: `/api/profile?id=${encodeURIComponent(String(userId))}`,
    headers: { Accept: 'application/json' },
    body: { kind: 'none' },
  }),
  simulateServer: (request): ServerResult => {
    const raw = new URL(request.url, 'https://ajax-lab.test').searchParams.get('id');
    const id = Number(raw);
    if (!raw || !Number.isInteger(id) || id <= 0) {
      return { kind: 'response', response: json(400, 'Bad Request', { error: 'id must be a positive integer' }) };
    }
    const profile = PROFILES[id];
    if (!profile) return { kind: 'response', response: json(404, 'Not Found', { error: 'Profile not found' }) };
    return { kind: 'response', response: json(200, 'OK', profile) };
  },
  describeDomChanges: (execution) => {
    const profile = execution.parsedBody as Profile;
    return [
      `#profile-card .name → "${profile.name}"`,
      `#profile-card .role → "${profile.role}"`,
      '#profile-card aria-busy removed',
    ];
  },
};
