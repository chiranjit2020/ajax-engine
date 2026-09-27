import { defineSharedStages } from '../../engine/lifecycle';
import type { HttpResponse, Scenario, ServerResult } from '../../engine/types';

/**
 * Standalone scenario 3 — "Submit a form (POST)". A workshop sign-up form is
 * sent as URL-encoded form data; the simulated server validates it and
 * answers 201 Created or 422 with per-field errors.
 */
export interface SignupInput {
  name: string;
  email: string;
  workshop: string;
}

export const WORKSHOPS = [
  { value: '', label: 'Choose a workshop' },
  { value: 'intro-ajax', label: 'Intro to AJAX' },
  { value: 'wp-ajax', label: 'WordPress AJAX' },
];

export type SignupErrors = Partial<Record<keyof SignupInput, string>>;

export function validateSignup(fields: Record<string, string>): SignupErrors {
  const errors: SignupErrors = {};
  if (!fields.name?.trim()) errors.name = 'Please enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email ?? '')) errors.email = 'Please enter a valid email address.';
  if (!WORKSHOPS.some((workshop) => workshop.value && workshop.value === fields.workshop)) errors.workshop = 'Please choose a workshop.';
  return errors;
}

const json = (status: number, statusText: string, body: unknown, extra: Record<string, string> = {}): HttpResponse => ({
  status,
  statusText,
  headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra },
  rawBody: JSON.stringify(body),
});

function simulate(request: Parameters<Scenario['simulateServer']>[0]): ServerResult {
  const fields = request.body.kind === 'form-urlencoded' ? request.body.fields : {};
  const errors = validateSignup(fields);
  if (Object.keys(errors).length) return { kind: 'response', response: json(422, 'Unprocessable Content', { errors }) };
  return {
    kind: 'response',
    response: json(201, 'Created', { id: 101, name: fields.name, email: fields.email, workshop: fields.workshop }, { Location: '/api/registrations/101' }),
  };
}

export const submitFormScenario: Scenario<SignupInput> = {
  id: 'submit-form',
  track: 'standalone',
  title: 'Submit a form (POST)',
  description: 'Register for a workshop. The form is sent with POST without leaving the page, and the server answers with success or field errors.',
  defaultInput: { name: 'Ana Silva', email: 'ana@example.test', workshop: 'intro-ajax' },
  presets: {
    invalid: { label: 'Invalid email, no workshop', input: { name: 'Ana Silva', email: 'ana-at-example', workshop: '' } },
  },
  stages: defineSharedStages({
    'user-action': { summary: 'The user submits the sign-up form.' },
    'js-handler': {
      summary: 'preventDefault() stops the normal page submit; the fields are encoded for a POST body.',
      explanation:
        'A form submit would normally make the browser navigate to a new page. event.preventDefault() cancels that, so JavaScript can send the data itself. FormData collects the named fields, and URLSearchParams encodes them as name=Ana+Silva&email=….',
    },
    'http-request': {
      summary: 'POST /api/register carries the fields in the request body.',
      explanation:
        'Unlike GET, a POST request carries its data in the body. Because the body is a URLSearchParams object, the browser labels it Content-Type: application/x-www-form-urlencoded automatically.',
    },
    'server-processing': {
      summary: 'The simulated server validates every field.',
      explanation:
        'The server never trusts the browser: it checks the name, the email format, and the workshop itself, even if the page also validates. Invalid input gets 422 with a message per field; valid input creates a registration and gets 201 Created.',
    },
    'http-response': { summary: 'The status says whether the registration was created (201) or rejected (422).' },
    'js-handles-response': {
      summary: 'JavaScript parses the JSON and checks response.ok.',
      explanation:
        'Both answers have a JSON body. For 422, the code shows each field’s message next to the field; this is an expected outcome, not a crash. For 201, it continues to the success message.',
    },
    'dom-update': { summary: 'A confirmation appears and the form is cleared — still on the same page.' },
  }),
  buildRequest: (input) => ({
    method: 'POST',
    url: '/api/register',
    headers: { Accept: 'application/json' },
    body: { kind: 'form-urlencoded', fields: { name: input.name, email: input.email, workshop: input.workshop } },
  }),
  simulateServer: simulate,
  explainFailure: (execution) =>
    execution.response?.status === 422
      ? 'The server validated the fields and rejected them with 422 Unprocessable Content. The request itself worked perfectly: the answer is “please fix these fields”, and the code shows each message next to its field.'
      : null,
  describeDomChanges: (execution) => [`#signup-status → "Registered! Your ID is ${(execution.parsedBody as { id: number }).id}."`, '#signup fields cleared (form.reset())'],
};
