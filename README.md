# AJAX Lab

**See every request. Understand every response.**

AJAX Lab is an interactive web app that teaches how AJAX works — first as a plain browser technique, then inside WordPress — by letting you run requests and inspect every stage from the click to the page update.

- **AJAX Lab** — pick a scenario, operate a small simulated page, and step through the eight-stage request lifecycle with animated request/response packets, synchronized code highlighting, and a network inspector.
- **Learn** — 20 lessons in four levels, each with an analogy, a “Show me visually” link into the simulator, a code walkthrough, a common mistake, a knowledge check, and a practical challenge.
- **Code Studio** — browser JavaScript and server PHP side by side, following one request.
- **Network Inspector** — request, response, console, and timeline for the active run, plus short network concept lessons.
- **WordPress Lab** — a simulated `admin-ajax.php` hook dispatcher (edit hooks, action, login state, nonce) and a security lab where you switch off safety controls and see the consequence.
- **Quiz & Challenges** — predict, trace, fix, debug, secure, and build.
- **Quick Reference** — APIs, status codes, WordPress functions, and common errors.

Everything runs in the browser. There is no backend, no account, and no external service; after the first load it also works offline. Progress is stored only in your browser.

## Getting started

Requirements: Node.js 20 or newer (developed with Node 26) and npm.

```sh
npm install
npm run dev        # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Type-check, then build the static site into `dist/` |
| `npm run preview` | Serve the production build at http://localhost:4173 |
| `npm run typecheck` | TypeScript only |
| `npm test` | Unit and component tests (Vitest + Testing Library, jsdom) |
| `npx vitest run src/engine/simulation.test.ts` | One test file |
| `npx vitest run -t "ignores ticks"` | Tests whose name matches |
| `npm run qa` | Browser acceptance + accessibility checks against a running `npm run preview` (see below) |

### Browser QA

`npm run qa` drives your installed Chrome, Edge, or Chromium with `playwright-core` (no browser download) and runs:

- `qa/acceptance.mjs` — the spec §15 checklist: playback controls, every scenario, code sync, copy buttons, responsive layouts at 320/768/1280 px, refresh on every route, reduced motion, offline use after load, no request leaving the origin, no console errors.
- `qa/a11y.mjs` — axe-core (WCAG 2.1 A/AA + best practices) on 11 page states in light and dark themes, plus a keyboard check.

Start `npm run preview` first. Set `CHROME_PATH` if the browser is not found, and `QA_ORIGIN` to test another URL.

## Deploying

`npm run build` produces a fully static site in `dist/`. Host it on any static file server or CDN. Routes use the URL hash (`/#/learn`), so every page works on refresh without server rewrite rules.

## Simulation and real requests

Every scenario runs against a **deterministic simulated server in your browser**, and the interface labels it as simulated. Nothing is sent over the network.

Standalone scenarios also offer an opt-in **Real Request mode** (in the scenario panel, under *Execution*). It sends the scenario's request to a server origin you type in, only after you confirm, and without cookies. Your server must implement the scenario's method and path and allow the page's origin through CORS. The server's internal processing is shown as not observable — only its response is inspected. WordPress scenarios always use the simulation: the app does not connect to a real WordPress site.

## How it is built

React 19, TypeScript, Vite, Tailwind CSS v4, React Router (hash mode), prism-react-renderer (with prismjs for PHP), lucide icons.

- `src/engine/` — framework-free lifecycle engine: types, the playback state machine, execution resolution, HTTP helpers, the WordPress hook dispatcher, and the real-request adapter.
- `src/data/scenarios/` — scenarios: request builders and simulated servers. `src/data/code/` — example source files annotated with stage markers.
- `src/data/learning/` — lessons, challenges, and reference content.
- `src/features/` — each scenario's interactive mini-page and stage-specific visuals.
- `src/components/`, `src/pages/`, `src/app/` — UI, pages, providers, routing.

One central, typed lifecycle state drives the animation, code highlighting, inspector, timeline, console, and explanations, so they cannot disagree. Example code is linked to stages with comments such as `// @stage js-handler … // @end`, not hardcoded line numbers. See `CLAUDE.md` for architecture details and conventions.

## Accessibility

Keyboard operable throughout, visible focus indicators, `prefers-reduced-motion` support, screen-reader announcements of lifecycle progress, light/dark/system themes, and layouts that work from 320 px wide. Status is never conveyed by colour alone.

## Limitations

- The simulated servers are teaching models. The SQL injection demo is a tiny string model, and the XSS demo describes what a browser would do instead of injecting markup.
- Real Request mode covers standalone scenarios only.
- There is no linter configured; type checking and tests are the quality gates.
