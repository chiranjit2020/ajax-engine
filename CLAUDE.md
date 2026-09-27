# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

**AJAX Lab** is an interactive web app that teaches standalone AJAX and WordPress AJAX (`admin-ajax.php`, `wp_ajax_` / `wp_ajax_nopriv_` hooks, nonces, capabilities) through a step-by-step request lifecycle visualizer. All six phases are done. All seven modules are built: the Lab, Learn (20 lessons), Code Studio, Network Inspector, WordPress Lab (hook dispatcher plus security lab), Quiz & Challenges, and Quick Reference. Standalone scenarios: `load-profile`, `live-search`, `submit-form`, `update-record`, `delete-record`, `load-more`, `failure-recovery`. WordPress scenarios: `wp-student-details`, `wp-security-lab`. `docs/QA.md` maps each spec §15 acceptance criterion to its evidence.

`master-prompt.md` is the full spec and the source of truth. Read the relevant section before implementing any module. (The file has some mojibake, such as `â€”` for an em dash and broken box-drawing characters in the §13 tree. Treat these as encoding artifacts.)

## Required workflow (spec §16)

Work goes in six phases: audit → architecture/design system → core standalone visualizer → WordPress engine → security/educational modules → polish/QA. **At the end of each phase, stop and ask for approval** before moving to the next. Report what was implemented, which files changed, test and build results, and any remaining blockers. Finish one standalone scenario end to end before adding more scenarios. Do not generate the whole app in one pass.

## Commands

```sh
npm run dev            # Vite dev server
npm run build          # tsc typecheck + production build to dist/
npm run typecheck      # tsc only
npm test               # Vitest, all tests once
npx vitest run src/engine/simulation.test.ts   # single file
npx vitest run -t "ignores ticks"              # tests matching a name
npm run qa             # browser acceptance + axe/keyboard checks; needs `npm run preview` running
```

No linter is configured. `npm run qa` (`qa/*.mjs`) uses `playwright-core` with the locally installed Chrome/Edge/Chromium (override with `CHROME_PATH`, target with `QA_ORIGIN`). Always re-run it after changing build configuration: some failures only appear in production chunks.

## Stack

React 19 + Vite 8 + TypeScript 7 (the native Go compiler, which is clean so far), Tailwind v4 via `@tailwindcss/vite`, React Router in **hash mode** (`HashRouter`, so routes survive a refresh on any static host), lucide-react icons, Vitest + jsdom + Testing Library. System fonts only. Persistence uses only `localStorage`, through `src/utils/storage.ts` (prefixed, never throws). Do not add Redux, a database, auth, or a backend framework. Teaching code uses native `fetch`/`XMLHttpRequest`/`FormData`; jQuery appears only in the WordPress/jQuery lessons. Everything must work offline.

## How the engine works

- `src/engine/` is pure TypeScript with no React:
  - `types.ts` holds the data model.
  - `lifecycle.ts` defines the shared 8 stages, which scenarios customise through `defineSharedStages(overrides)`.
  - `execution.ts` has `resolveExecution()`, which runs the scenario's pure `simulateServer` once, up front, and computes the failure point. It also derives per-stage status, the visual state, and the console log.
  - `simulation.ts` holds `engineReducer`, the playback state machine.
- **Stale-timer protection:** every user-driven action bumps `runId`. The single playback `setTimeout` lives in `SimulationProvider` and dispatches `TICK` with the `runId` it was scheduled for, and the reducer ignores a mismatched one. TICK itself keeps `runId`, so playback chains. Don't add timers anywhere else.
- `src/app/providers/SimulationProvider.tsx` owns the engine state, the current track, and the scenario input. UI reads derived data through `useLifecycleView()` (`src/hooks/`). Panels never store request data themselves.
- **Stage lookups are rank-based.** `firstStageReaching()` and `hasReached()` order visual states (idle < request-created < … < dom-updated). A scenario that skips a state still works; the WordPress flow creates and sends its request in one stage. Never look up a stage by exact `visualState`.
- **Two kinds of failure:**
  - *Terminal failure* (`failure`, `failureIndex`): the run stops there and later stages show "Not reached". Network failures and timeouts land on the first stage reaching `response-received`. HTTP errors, invalid JSON, and application errors (`scenario.applicationError`, e.g. a WordPress `{"success":false}` sent with HTTP 200) land on the first stage reaching `response-parsed`.
  - *Server halt* (`ServerTrace.haltAt`/`skipped`): the server stops mid-way but still responds, e.g. admin-ajax.php calling `wp_die('0', 400)`. The halt stage shows as failed and skipped stages show "Not reached". The run continues to the response.
- `simulateServer(request, input)` must read everything the client sends from `request` (form fields, cookies). `input` is only for server-side configuration, such as the WordPress hook registry. The server also returns `trace.notes` (per-stage facts shown in the explanation panel and console) and `trace.tags`.
- Run `tags` are `success`/`failure`, plus the failure kind (e.g. `http-error`), plus trace tags (e.g. `logged-out`, `no-hook`, `nonce-failed`, `hook-<registrationId>`). Code markers select on them with `?tag`.
- **Code ↔ stage sync:** example sources live in `src/data/code/`, imported with `?raw`. Lines are tagged with marker comments (`// @stage <id>[, <id>]` … `// @end`; `#` also works for PHP), which `parseStageMarkers()` strips and turns into line ranges. Adding `?tag` after the IDs (e.g. `?failure`, `?no-hook`) limits a range to runs carrying that tag. A qualifier applies to every stage ID on its marker, so nest separate markers when only one stage should be conditional. `// @note <text>` attaches an explanation to the next line, shown while its stage is active. Never hardcode line numbers.
- **Adding a scenario:** create a `Scenario` in `src/data/scenarios/`, add annotated source to `src/data/code/`, and register both in `src/data/scenarios/index.ts`.
  - Set `codeLayout`: `'alternatives'` means every file must cover every stage; `'client-server'` means the files together must.
  - `scenarios.test.ts` enforces this and also checks that markers name real stages.
  - A `CodeFile.source` can be a function of input, e.g. the WordPress plugin's `add_action()` calls generated from the hook registry. Always read it through `resolveSource(file, input)`. Put the scenario's interactive mini-page in `src/features/` and register it in `src/features/playgrounds.tsx`. Playground UI must derive its state from the engine (e.g. `hasReached()`), never from its own timers.
- UI-only inspector state (active bottom tab, network section, selected code file) lives in `InspectorProvider`. Clicking a packet calls `reveal('network', 'request')`. Request and response data always come from the execution.
- Panels gate data by stage with `hasReached(scenario, stageIndex, visualState)`. For example, no response body is shown before `response-received`, and no parsed body before `response-parsed`. Stage numbers in UI text are derived from the scenario, not hardcoded.
- Simulated URLs use the placeholder host `ajax-lab.test` (`SIMULATED_ORIGIN` in `engine/http.ts`). Copy-as-cURL output is labelled illustrative. The diagram's tablet/desktop grid placement in `LifecycleDiagram.tsx` (`LAYOUT`) is keyed by stage ID, with separate entries for the standalone and WordPress stages.
- Tailwind colors are semantic tokens (`bg-surface`, `text-muted`, `border-line`, `text-accent`, `bg-danger-soft` …), defined as CSS variables in `src/styles/index.css`. Dark mode uses `[data-theme=dark]` on `<html>`, set by `ThemeProvider`, with an inline script in `index.html` to avoid a flash of the wrong theme. Use the tokens, not raw palette colors.
- In fake-timer tests, advance one stage per `act()` call. The next timer is only scheduled after React re-renders.
- Shared WordPress server logic lives in `data/scenarios/wordpress/common.ts`:
  - simulated users (administrator / subscriber / visitor), identified only from the login cookie on the request
  - per-user nonces
  - `wpDie()` / `wpJson()`
  - `runAdminAjax()`, which covers boot, action, hook choice and dispatch, then returns either a finished response or a callback context
  - `checkAjaxReferer()`

  Each WordPress scenario supplies only its callback.
- The security lab (`wp-security-lab.ts`) generates both its PHP and its JS from `SecurityControls`, so switched-off checks appear as commented-out code. XSS with `.html()` is *described* in the UI, never injected; a test asserts that no `<img>` is ever created. The SQL is a tiny string model: only `N OR 1=1` counts as an injection.
- Scenario `presets` are named inputs. `applyPreset(scenarioId, preset, { play | stage })` in `SimulationProvider` opens them (switching track as needed), and lessons and challenges use it through `useOpenVisual()`. `setInput(input, { play: true })` changes input and starts a run in one step. Always resolve against the new input, never the stale closure.
- Learning content lives in `src/data/learning/` (`lessons.ts`, `challenges.ts`, `reference.ts`, with shared `Task` types). `TaskRunner` renders every task kind. `learning.test.ts` checks that every link points at a real scenario, preset and stage, and that every answer key is in range. Debug challenges take their evidence from a real `resolveExecution()` and show only what browser DevTools could see: request, response, and browser console. They must never show server notes.
- Progress (lessons completed, challenge attempts) is in `ProgressProvider`, stored in localStorage under `ajax-lab:progress`. A level unlocks after 3 lessons of the previous level are complete.
- The WordPress simulation lives in `engine/wordpress.ts`, which is pure: `dispatch()`, `absint()`/`intval()` with PHP semantics, and `phpString()`. It mirrors real admin-ajax.php. The hook name is the prefix plus the action. The logged-in/logged-out branch is decided by the login cookie. No matching hook means `wp_die('0', 400)`, and a bad nonce means `check_ajax_referer` produces `wp_die(-1, 403)`. The WordPress Lab's dispatch preview calls the same `dispatch()`, so it cannot disagree with the simulation.
- PHP highlighting: prismjs grammars register on prism-react-renderer's Prism through a global set in `components/code/prism/global.ts`. That module must be imported before the grammars (see `prism/index.ts`).
- Stage-specific visuals, such as the hook-name formula and the auth-branch diagram, are registered in `features/stage-details.tsx`.
- Grid children holding long mono identifiers need `min-w-0` (and `[overflow-wrap:anywhere]`). Otherwise names like `wp_ajax_nopriv_get_student_details` push the layout past 320px.
- **Real Request mode** (`engine/request-adapters.ts`, `RealModePanel`): opt-in, standalone scenarios only, and only after the learner types an http(s) origin and ticks an acknowledgement. `credentials: 'omit'`. `executionFromResult()` classifies real and simulated results identically. Stepping within a run never re-sends a real request; any reset, input, scenario or mode change invalidates an in-flight one via a token. `applyPreset()` always switches back to simulation. All "Simulated" labels derive from `execution.executionMode`.
- **Chunking** (`vite.config.ts`, `output.codeSplitting`): vendor groups for react, router, prism-react-renderer and icons. Never put `prismjs` in a group: its grammars must run after `prism/global.ts` sets the global, and `src/test/build-config.test.ts` guards this. Learn, Lesson, Challenges and Reference are `React.lazy` routes, prefetched ~1.5 s after start-up so the app works offline once loaded. Component tests for those pages must await the page `<h1>` before querying.
- `StageAnnouncer` in `AppShell` is the single live region announcing lifecycle progress on every page.
- Playgrounds are wrapped in an `ErrorBoundary`, since a real server can return data of any shape.
- `PacketTrack` is vertical below the `sm` breakpoint and horizontal above it. Packet position is the CSS variable `--p` (0 = browser, 100 = server), and the transition length is set to the travel stage's duration. The global reduced-motion rule turns the transitions off.

## Architecture rules that span modules (spec §13)

- **One source of truth for execution state.** One central typed lifecycle state machine drives the animation, code highlighting, network inspector, timeline, console log, and explanations. Never hardcode inspector data or line highlights separately from it.
- **Engine operations:** `loadScenario`, `startSimulation`, `pauseSimulation`, `nextStep`, `previousStep`, `replay`, `reset`. **Visualization states:** `idle`, `request-created`, `request-sent`, `server-processing`, `response-received`, `response-parsed`, `dom-updated`, `failed`.
- **Playback must not be a set of independent timers.** Transitions are state-driven, with cleanup on pause, cancel, and scenario switch. No stale animation may continue after a scenario switch.
- **Code ↔ stage sync goes through stable stage IDs.** Each source-code line range is mapped to a stage ID. Clicking a code line jumps to its stage, and selecting a stage highlights its lines.
- **Separation of layers:** keep the engine (`src/engine/`), scenario/lesson/code data (`src/data/`), UI components, and any real-request adapter separate from each other.
- **Two execution modes, always labeled:** Simulation (the default; deterministic mock handlers with configurable latency) and opt-in Real Request mode (only to an endpoint the user configures). Never present a simulated PHP/WordPress execution or illustrative cURL command as real.

## Content accuracy constraints

- AJAX is a browser-side technique, not a language, a server technology, or a WordPress feature. `admin-ajax.php` is a WordPress entry point, not "AJAX itself".
- Keep standalone mode free of WordPress concepts.
- The `action` parameter selects the hook (`wp_ajax_{action}` for logged-in users, `wp_ajax_nopriv_{action}` for logged-out users). It is not the PHP function name. Registering only `wp_ajax_` leaves logged-out visitors unhandled.
- A nonce is CSRF mitigation, not authorization, encryption, or identity. Capability and ownership checks are still required.
- `fetch()` does not reject on HTTP 4xx/5xx. HTTP status, the WordPress `success` flag, and transport errors are three separate concepts. An HTTP 200 response can still carry `wp_send_json_error`.
- Use simulated identities and mock data only.

## UI constraints (spec §12)

Aim for a developer-tool look (restrained, no heavy gradients/glass/glow, no big hero section). Support light, dark, and system themes, and persist the choice. Never signal state by color alone. The layout must work at 320px with no horizontal page overflow. Required: keyboard navigation, visible focus, `prefers-reduced-motion` support, and accessible status announcements. Text must meet 4.5:1 contrast in both themes: don't dim text with `opacity-*` or `text-*/NN`, and mark states like "not reached" with a dashed border instead. Every page needs an `<h1>`. The bottom inspector panel is tabbed and collapsible, and inspectors are not all visible at once.
