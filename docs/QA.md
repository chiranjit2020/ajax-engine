# QA report — spec §15 acceptance criteria

Verified on the production build (`npm run build` + `npm run preview`) in Chrome, 2026-09-27.
Automated evidence: `npm test` (unit/component) and `npm run qa` (browser acceptance + accessibility).

| Criterion (§15) | Result | Evidence |
|---|---|---|
| **Core lifecycle** — every stage works with Play, Pause, Next, Previous, Replay, Reset | Pass | `qa/acceptance.mjs`: Play advances, Pause holds for 1.5 s, Resume continues, Previous/Next step one stage, Replay restarts at stage 1, Reset returns to idle (real timers). Reducer tests in `src/engine/simulation.test.ts`. |
| **Standalone AJAX** — GET, POST, forms, search, pagination, failure scenarios functional | Pass | All seven standalone scenarios run to the final stage in the browser. Behaviour tests in `src/data/scenarios/standalone.test.ts` (debounce, stale response, PATCH JSON body, DELETE 204 with no body, pagination to the last page, each failure kind and retry recovery). |
| **WordPress dispatcher** — resolves authenticated and unauthenticated hook registrations | Pass | `src/engine/wordpress.test.ts` and `wp-student-details.test.ts`: matching hooks, missing hooks, wrong login state, empty action, typos, multiple callbacks. Browser check: a logged-out visitor without `wp_ajax_nopriv_` gets `0` / HTTP 400. |
| **Code synchronization** — highlights and explanations match the active stage | Pass | Stage markers are validated for every scenario and code file (`scenarios.test.ts`); outcome-specific highlights are tested per scenario; browser check of the DOM-update highlight. |
| **Network inspector** — derived from the actual execution state | Pass | Inspector reads only the engine's execution; response data is hidden until the response stage (`LabPage.test.tsx`). Debug challenges build their evidence from a real `resolveExecution()` and show only browser-visible data. |
| **Security lab** — nonce, capability, and unsafe data handling are accurate | Pass | `wp-security-lab.test.ts`: nonce failures (-1/403) precede capability checks, a valid nonce is not authorization, removing checks leaks data, validation neutralises injection. XSS via `.html()` is described, never injected — asserted in tests and in Chrome (zero `<img>` elements). |
| **Responsive UI** — no broken layout at 320 px, tablet, desktop | Pass | Every route at 320, 768 and 1280 px, after a reload: zero horizontal overflow. Screenshots reviewed in both themes. |
| **Accessibility** — keyboard, focus, reduced motion, announcements | Pass | axe-core: 0 violations across 22 page states (11 states × light/dark). Keyboard: controls reachable by Tab and operable by Enter, every focused element has a visible outline. Reduced motion: packet transitions ≈ 0 s. Lifecycle progress announced through a polite live region on every page (tested). |
| **Reliability** — no unhandled errors, stale timers, or broken state after switching scenarios | Pass | Switching scenario and mode mid-playback leaves no running timer (fake-timer tests assert zero pending timers; real-timer browser check). No console or page errors in the whole browser session. |
| **Build and deployment** — production build succeeds, routes work on refresh, no paid services | Pass | Build succeeds with no warnings; hash routes survive refresh; no request left the page's origin during the session; works offline after load, including lazily loaded pages. |

## Additional §15 requirements

| Requirement | Result | Evidence |
|---|---|---|
| Dispatcher tested with matching hooks, missing hooks, incorrect authentication | Pass | See WordPress dispatcher row. |
| Malformed JSON, HTTP errors, network failures, application-level errors tested independently | Pass | `execution.test.ts`, `standalone.test.ts` (each failure kind), `wp-student-details.test.ts` (HTTP 200 `success:false`). |
| Switching scenarios during playback stops the old animation | Pass | Fake-timer and real-browser checks. |
| Copy buttons copy the correct source | Pass | Clipboard read in Chrome equals the cleaned source (no stage markers); component test. |
| No simulated request presented as real execution | Pass | “Simulated” labels are derived from each execution's mode; Real Request mode is opt-in, labelled, and marks server internals as not observable. |
| Production build passes | Pass | `npm run build`. |
| README with setup and local development instructions | Pass | `README.md`. |

## Defects found and fixed during QA (Phase 6)

- **Production-only crash in the Code Studio** (“Prism is not defined”) introduced by vendor chunking: the PHP grammar ran before the global it needs. Fixed by keeping the grammars in the main chunk; a test now guards the build configuration.
- **Offline gap from lazy loading**: first visits to the learning pages after going offline would have failed. Fixed by prefetching those chunks shortly after start-up; verified offline in Chrome.
- **Colour contrast** (axe): decorative line numbers, dimmed “not reached” stages, and light-theme success/warning text on tinted backgrounds were below 4.5:1. Fixed in the design tokens and components.
- **Heading order and keyboard access**: added a missing section heading on the Network page, an `<h1>` on locked-lesson pages, and keyboard focus on scrollable code samples.
- **Marker error in the DELETE example**, caught by the scenario integrity tests.
