import { parseStageMarkers, type AnnotatedSource } from '../../engine/code-ranges';
import type { Scenario, TrackMode } from '../../engine/types';
import deleteRecordSource from '../code/delete-record.fetch.js?raw';
import failureRecoverySource from '../code/failure-recovery.fetch.js?raw';
import loadMoreSource from '../code/load-more.fetch.js?raw';
import loadProfileFetchSource from '../code/load-profile.fetch.js?raw';
import loadProfileJquerySource from '../code/load-profile.jquery.js?raw';
import loadProfileXhrSource from '../code/load-profile.xhr.js?raw';
import submitFormSource from '../code/submit-form.fetch.js?raw';
import updateRecordSource from '../code/update-record.fetch.js?raw';
import wpAdminAjaxSource from '../code/wp-admin-ajax.php?raw';
import wpStudentSource from '../code/wp-student.js?raw';
import { failureRecoveryScenario } from './failure-recovery';
import { liveSearchScenario, liveSearchSource, type SearchInput } from './live-search';
import { loadProfileScenario } from './load-profile';
import { deleteRecordScenario, loadMoreScenario, updateProfileScenario } from './more-standalone';
import { submitFormScenario } from './submit-form';
import { securityPluginSource, securityScriptSource, wpSecurityScenario, type WpSecurityInput } from './wp-security-lab';
import { pluginSource, wpStudentScenario, type WpStudentInput } from './wp-student-details';

export interface CodeFile {
  id: string;
  /** Tab label, e.g. "fetch()". */
  label: string;
  filename: string;
  language: 'javascript' | 'php';
  side: 'client' | 'server';
  /** Fixed source, or source generated from the scenario input (e.g. registrations from the hook registry). */
  source: AnnotatedSource | ((input: any) => AnnotatedSource);
  /** The single most important thing that sets this file apart. */
  keyPoint?: string;
}

export interface ScenarioEntry {
  scenario: Scenario<any>;
  code: CodeFile[];
  /**
   * 'alternatives': each file implements the whole flow (fetch vs XHR vs jQuery).
   * 'client-server': the files together implement it (browser JS + server PHP).
   */
  codeLayout: 'alternatives' | 'client-server';
}

/** Generated sources, cached per file and per input object. */
const generated = new WeakMap<CodeFile, WeakMap<object, AnnotatedSource>>();

/** The annotated source for the current input. Generated sources are cached per file and input object. */
export function resolveSource(file: CodeFile, input: unknown): AnnotatedSource {
  if (typeof file.source !== 'function') return file.source;
  const key = (input ?? {}) as object;
  let perFile = generated.get(file);
  if (!perFile) {
    perFile = new WeakMap();
    generated.set(file, perFile);
  }
  let cached = perFile.get(key);
  if (!cached) {
    cached = file.source(input);
    perFile.set(key, cached);
  }
  return cached;
}

export const SCENARIOS: ScenarioEntry[] = [
  {
    scenario: loadProfileScenario,
    codeLayout: 'alternatives',
    code: [
      {
        id: 'fetch',
        label: 'fetch()',
        filename: 'profile.js',
        language: 'javascript',
        side: 'client',
        source: parseStageMarkers(loadProfileFetchSource),
        keyPoint:
          'fetch() returns a Promise. It rejects only when no response arrives, so a 404 or 500 must be caught by checking response.ok.',
      },
      {
        id: 'xhr',
        label: 'XMLHttpRequest',
        filename: 'profile-xhr.js',
        language: 'javascript',
        side: 'client',
        source: parseStageMarkers(loadProfileXhrSource),
        keyPoint:
          'XMLHttpRequest is the original browser API. It reports progress through events and readyState; onload fires for any HTTP response, including 404.',
      },
      {
        id: 'jquery',
        label: 'jQuery.ajax()',
        filename: 'profile-jquery.js',
        language: 'javascript',
        side: 'client',
        source: parseStageMarkers(loadProfileJquerySource),
        keyPoint:
          'jQuery.ajax() wraps XMLHttpRequest. With dataType "json" it parses the body for you and calls error for HTTP errors, network failures, and invalid JSON.',
      },
    ],
  },
  {
    scenario: liveSearchScenario,
    codeLayout: 'alternatives',
    code: [
      {
        id: 'search-fetch',
        label: 'fetch() + debounce',
        filename: 'search.js',
        language: 'javascript',
        side: 'client',
        source: (input: SearchInput) => parseStageMarkers(liveSearchSource(input)),
        keyPoint: 'Generated from the cancellation setting. A debounce timer limits requests; an AbortController stops stale responses.',
      },
    ],
  },
  {
    scenario: submitFormScenario,
    codeLayout: 'alternatives',
    code: [
      {
        id: 'form-fetch',
        label: 'fetch() + FormData',
        filename: 'signup.js',
        language: 'javascript',
        side: 'client',
        source: parseStageMarkers(submitFormSource),
        keyPoint: 'event.preventDefault() keeps the page in place; the fields travel in the POST body.',
      },
    ],
  },
  {
    scenario: updateProfileScenario,
    codeLayout: 'alternatives',
    code: [
      {
        id: 'update-fetch',
        label: 'fetch() PATCH',
        filename: 'profile-edit.js',
        language: 'javascript',
        side: 'client',
        source: parseStageMarkers(updateRecordSource),
        keyPoint: 'PATCH sends only the changed field, as JSON — so the code sets Content-Type itself.',
      },
    ],
  },
  {
    scenario: deleteRecordScenario,
    codeLayout: 'alternatives',
    code: [
      {
        id: 'delete-fetch',
        label: 'fetch() DELETE',
        filename: 'tasks.js',
        language: 'javascript',
        side: 'client',
        source: parseStageMarkers(deleteRecordSource),
        keyPoint: 'A successful DELETE returns 204 No Content: check the status, and do not parse the empty body.',
      },
    ],
  },
  {
    scenario: loadMoreScenario,
    codeLayout: 'alternatives',
    code: [
      {
        id: 'more-fetch',
        label: 'fetch() + append()',
        filename: 'articles.js',
        language: 'javascript',
        side: 'client',
        source: parseStageMarkers(loadMoreSource),
        keyPoint: 'Each click requests the next page and appends it; hasMore decides whether the button stays.',
      },
    ],
  },
  {
    scenario: failureRecoveryScenario,
    codeLayout: 'alternatives',
    code: [
      {
        id: 'failure-fetch',
        label: 'fetch() + AbortController',
        filename: 'notifications.js',
        language: 'javascript',
        side: 'client',
        source: parseStageMarkers(failureRecoverySource),
        keyPoint: 'One try/catch handles network errors, timeouts, HTTP errors, and invalid JSON — error.name tells them apart.',
      },
    ],
  },
  {
    scenario: wpStudentScenario,
    codeLayout: 'client-server',
    code: [
      {
        id: 'wp-js',
        label: 'ajax-lab.js',
        filename: 'ajax-lab.js (theme or plugin JavaScript)',
        language: 'javascript',
        side: 'client',
        source: parseStageMarkers(wpStudentSource),
        keyPoint: 'Runs in the browser. It sends action, nonce, and student_id to admin-ajax.php and handles the reply.',
      },
      {
        id: 'wp-plugin',
        label: 'ajax-lab.php',
        filename: 'ajax-lab.php (plugin)',
        language: 'php',
        side: 'server',
        source: (input: WpStudentInput) => parseStageMarkers(pluginSource(input.registrations)),
        keyPoint:
          'Runs on the server. The add_action() calls are generated from the hook registry in the WordPress Lab. A teaching example with fixed demonstration data — not a complete plugin.',
      },
      {
        id: 'wp-core',
        label: 'admin-ajax.php',
        filename: 'wp-admin/admin-ajax.php (WordPress core, simplified)',
        language: 'php',
        side: 'server',
        source: parseStageMarkers(wpAdminAjaxSource),
        keyPoint: 'Part of WordPress itself — you never edit it. It turns the action into a hook name and fires it.',
      },
    ],
  },
  {
    scenario: wpSecurityScenario,
    codeLayout: 'client-server',
    code: [
      {
        id: 'sec-js',
        label: 'records.js',
        filename: 'records.js',
        language: 'javascript',
        side: 'client',
        source: (input: WpSecurityInput) => parseStageMarkers(securityScriptSource(input.controls)),
        keyPoint: 'Generated from the output setting: .text() or .html().',
      },
      {
        id: 'sec-plugin',
        label: 'student-records.php',
        filename: 'student-records.php (plugin)',
        language: 'php',
        side: 'server',
        source: (input: WpSecurityInput) => parseStageMarkers(securityPluginSource(input.controls)),
        keyPoint: 'Generated from the security controls. Switched-off checks appear as removed (commented-out) code.',
      },
      {
        id: 'sec-core',
        label: 'admin-ajax.php',
        filename: 'wp-admin/admin-ajax.php (WordPress core, simplified)',
        language: 'php',
        side: 'server',
        source: parseStageMarkers(wpAdminAjaxSource),
        keyPoint: 'Part of WordPress itself. It turns the action into a hook name and fires it.',
      },
    ],
  },
];

export function scenariosForTrack(track: TrackMode): ScenarioEntry[] {
  return SCENARIOS.filter((entry) => entry.scenario.track === track);
}

export function getScenarioEntry(id: string): ScenarioEntry | undefined {
  return SCENARIOS.find((entry) => entry.scenario.id === id);
}

export const DEFAULT_SCENARIO_ID = loadProfileScenario.id;
