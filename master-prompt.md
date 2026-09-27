# Master Prompt: AJAX Visualizer Engine

**Project:** Interactive AJAX Learning & Visualization Web App

**Objective:** Build a production-quality, interactive visualizer engine that teaches how AJAX works as a standalone web technology and how AJAX works inside WordPress, from the browser's JavaScript to the server's PHP and back.

The app should not be another documentation website or a collection of static diagrams. It should let learners visually execute AJAX requests, observe every stage of the request-response lifecycle, inspect the data being transferred, and understand the differences between vanilla AJAX and WordPress AJAX.

This master prompt is designed for Claude Code, working in a local development environment or an existing GitHub repository.

---

# 1. Your role and working instructions

You are a Senior Frontend Engineer, WordPress Plugin Developer, System Architect, and Interactive Technical Educator.

Your task is to design and build an interactive AJAX Visualizer Engine that teaches AJAX from the ground up, using visual simulations, executable examples, request lifecycle animations, and realistic WordPress workflows.

The application must serve two purposes:

1. Help absolute beginners understand AJAX without requiring prior knowledge of asynchronous JavaScript, HTTP internals, or WordPress hooks.
2. Help experienced WordPress developers understand how browser-side AJAX connects to WordPress's PHP execution lifecycle, including admin-ajax.php, action hooks, authentication, nonces, capabilities, and JSON responses.

**NON-NEGOTIABLE RULES:**

- Build an actual functional web application, not a static landing page, mockup, or screenshot.
- Every primary visualization must be interactive.
- Never introduce an animation without explaining what it represents technically.
- Every major concept must have a plain-English explanation, a visual representation, and a practical code example.
- Maintain a strict separation between standalone AJAX and WordPress AJAX while showing their shared HTTP foundation.
- Do not falsely suggest that AJAX is a programming language, a WordPress-only feature, or a server-side technology.
- Do not pretend a browser-only simulation has executed a real PHP or WordPress backend.
- Clearly label simulated server execution, actual browser requests, and real backend execution.
- Do not overcomplicate the interface with too many simultaneous panels, diagrams, or controls.
- Do not introduce unrelated technologies, frameworks, or curriculum chapters without a clear need.
- Prioritize conceptual correctness, beginner comprehension, performance, accessibility, and responsive UI.

Before modifying an existing project, inspect the repository, package.json, current routes, components, styles, dependencies, and existing design system. Preserve working functionality and established architectural decisions.

If this is a new project, establish the smallest practical architecture that can support the complete learning experience.

Do not rewrite the entire application or replace existing components unnecessarily.

# 2. App identity and product direction

**Working name:** AJAX Lab  
**Tagline:** See Every Request. Understand Every Response.  
**Product category:** Interactive Web Technology Learning Tool

The experience should feel like a combination of:

- An interactive computer science laboratory.
- A browser network inspector.
- A visual programming simulator.
- A beginner-friendly WordPress development workshop.

The user should feel that they are operating a real web application, not reading a textbook.

Design the application around a central interactive workspace, where the learner can switch between Standalone AJAX and WordPress AJAX, select a scenario, execute a request, and inspect the lifecycle step by step.

The application must be usable without login, paid APIs, external AI services, or mandatory third-party accounts.

All core lessons and simulations must work locally and offline after the application has loaded.

# 3. Recommended technology stack

Use the following stack as the default for a new application. If the repository already has a working stack, audit it first and adapt rather than migrating without reason.

| Area | Recommendation | Purpose |
|---|---|---|
| Frontend | React + Vite + TypeScript | Component-based UI and predictable interactive state |
| Styling | Tailwind CSS or existing CSS architecture | Responsive design, consistent tokens, restrained visual effects |
| Visualization | SVG + CSS animations + React state | Precise control over packets, lifecycle states, arrows, and step-by-step playback |
| Code display | Syntax highlighting with copy and line highlighting | Code snippets correspond to selected scenario and lifecycle step |
| Persistence | localStorage and static lesson data | Remember theme, completed lessons, and progress locally |

Implementation constraints:

- Prefer native browser APIs such as `fetch()`, `FormData`, `URLSearchParams`, and `XMLHttpRequest` for teaching.
- Use jQuery only in the dedicated WordPress/jQuery lessons where it is pedagogically relevant.
- Do not introduce Redux, a database, an authentication service, or a backend framework unless a concrete requirement justifies it.
- Use deterministic local mock data for simulated backend scenarios.
- Keep the visualization engine separate from lesson content, UI components, and any real backend adapter.

# 4. Information architecture and navigation

Build a compact navigation system with seven primary modules. The main visualizer is the heart of the application.

1. **AJAX Lab â€” Main Workspace**
2. **Learn** â€” Structured, beginner-friendly lessons.
3. **Visualizer** â€” Animated request-response lifecycle and execution controls.
4. **Code Studio** â€” Inspect browser-side JavaScript and server-side PHP.
5. **Network Inspector** â€” Request headers, payload, response headers, status, and response body.
6. **WordPress Lab** â€” admin-ajax.php, hooks, nonce validation, and PHP callbacks.
7. **Quiz & Challenges** â€” Test understanding through practical scenarios.
8. **Quick Reference** â€” AJAX methods, WordPress hooks, common errors, and debugging tips.

The navigation should remain minimal on mobile. Use a compact bottom navigation or collapsible menu on smaller screens. The main workspace must never become a horizontally overflowing desktop dashboard squeezed into a phone.

# 5. The main AJAX visualization engine

## 5.1 Workspace layout

Create a polished, split-view learning environment.

**Desktop workspace**

Top bar:
- App logo and name.
- Standalone / WordPress mode switch.
- Current scenario selector.
- Theme toggle.
- Reset simulation control.

Main content:
- Left: Request scenario and interactive configuration.
- Center: Visual request lifecycle.
- Right: Live explanation and current execution details.

Bottom panel:
- Execution timeline.
- Code inspector.
- Network inspector.
- Console / event log.

The bottom panel should be collapsible and use tabs. Do not display all inspectors simultaneously by default.

**On mobile:**
- Stack the scenario selector, lifecycle, and explanation vertically.
- Keep execution controls easily reachable.
- Use a simplified vertical request flow.
- Put code, network, and event details into a bottom sheet or separate tabs.
- Maintain legible code and diagram labels at 320px viewport width.

The user should be able to collapse secondary panels and focus entirely on the animation.

## 5.2 The shared AJAX lifecycle

Create the primary animation around these eight stages:

1. **User action** â€” Button click, form submission, search input, or another browser event.
2. **JavaScript handler** â€” Collect data, create a request, and call fetch(), XMLHttpRequest, or jQuery.ajax().
3. **HTTP request** â€” Method, URL, headers, cookies, and request body travel to the server.
4. **Server receives request** â€” Web server and PHP or another backend process the request.
5. **Server-side processing** â€” Validate input, execute business logic, access data if needed, and prepare a response.
6. **HTTP response** â€” Status code, headers, and response body return to the browser.
7. **JavaScript handles response** â€” Read JSON or text, handle errors, and update application state.
8. **DOM updates** â€” Update only the relevant portion of the page without a full navigation.

These stages should be individually clickable. Selecting a stage must:

- Highlight the corresponding node in the animation.
- Explain what is happening in plain English.
- Show the relevant code lines.
- Display the request or response data available at that stage.
- Explain which component is responsible: browser, JavaScript, network, web server, PHP, WordPress, or DOM.

Add Play, Pause, Next Step, Previous Step, Replay, and Reset controls.

The learner must be able to advance one stage at a time and inspect the state before proceeding.

### 5.3 Animated data packets

Create animated request and response packets moving between the browser and server.

The request packet must visually contain:

- HTTP method.
- Request URL.
- Content type.
- Request payload, if any.
- Relevant headers and cookies.

The response packet must visually contain:

- HTTP status.
- Content type.
- Response body.
- Whether the response was successful, unsuccessful, or malformed.

During animation, allow the learner to click the packet and inspect its contents.

The animation must represent the actual logical request sequence, not a decorative loading animation.

Use directional arrows to distinguish outgoing requests from incoming responses. Use distinct visual states for pending, processing, completed, and failed requests.

Keep the packet compact. Display detailed data in the inspector rather than crowding the diagram.

# 6. Standalone AJAX laboratory

This module must teach AJAX independently of WordPress. Do not introduce admin-ajax.php, WordPress hooks, or WordPress-specific conventions until the learner switches modes.

## 6.1 Standalone scenarios

Implement these interactive scenarios, each with its own runnable simulation, request configuration, code, and response.

1. **Load data on button click (GET):** Click "Load Profile" to request a user profile and render it without reloading the page.
2. **Live search (GET):** Type a product or student name. Visualize debounce, request dispatch, matching results, and stale-response handling.
3. **Submit a form (POST):** Submit a registration form using FormData or URL-encoded data and show validation errors or success.
4. **Update a record (PATCH / PUT):** Simulate changing a user's profile or product information and returning the updated record.
5. **Delete a record (DELETE):** Confirm a deletion, send a request, process the result, and update the UI.
6. **Load more content (GET):** Paginate a list, load the next set of records, and append results to the existing DOM.
7. **Failure and recovery:** Simulate network errors, server errors, invalid JSON, timeouts, and HTTP error responses.

## 6.2 The learner's browser playground

Each standalone scenario must contain a small, realistic interface that the learner can actually operate.

For example, in the profile scenario:

- Display a mock profile card with a "Load Profile" button.
- Initially show a placeholder instead of the profile.
- On clicking the button, start the lifecycle animation.
- Show the request URL and method.
- Let the learner inspect the mock PHP/API endpoint.
- After the response stage, update the profile card.
- Provide a "Show full page reload" comparison to explain traditional navigation versus AJAX.

The simulated backend should use deterministic JavaScript functions, with clearly defined request and response objects. Use a short, configurable simulated latency so the learner can observe the request in progress.

Do not require an external API for the core scenarios.

## 6.3 Compare AJAX implementation techniques

Provide a tabbed code comparison for the same operation using:

1. XMLHttpRequest (the foundational browser API).
2. fetch() with async/await (modern native approach).
3. jQuery.ajax() (common in existing WordPress themes and plugins).

For every implementation, display the equivalent request lifecycle and resulting data.

Teach these differences explicitly:

- XMLHttpRequest exposes events and readyState.
- fetch() returns a Promise and does not reject merely because the server returns HTTP 404 or 500.
- Response.json() is asynchronous and parses the response body.
- jQuery.ajax() provides success/error callbacks and jqXHR behavior.
- All three approaches can communicate over HTTP asynchronously.

Do not imply that fetch() is inherently WordPress-specific or that jQuery is required for AJAX.

Keep the code examples small enough for beginners to understand. Highlight the current line during step-by-step playback.

# 7. WordPress AJAX laboratory

This is the defining feature of the app. The learner must understand that WordPress AJAX uses the same browser and HTTP fundamentals, but introduces WordPress's own request entry point and hook system.

## 7.1 The WordPress request architecture

Create a separate visual flow that shows the actual WordPress request path:

1. **Browser:** Button click or form submission.
2. **JavaScript / jQuery:** Sends action, nonce, and optional data.
3. **WordPress admin-ajax.php:** WordPress AJAX entry point receives the HTTP request and dispatches the requested action.
4. **WordPress hook dispatcher:** Resolves the action hook based on the action parameter and authentication context.
5. **Authentication branch:**
   - Logged in: `wp_ajax_{$action}`.
   - Logged out: `wp_ajax_nopriv_{$action}`.
6. **PHP callback:** Validate input, check permissions, run business logic, and return a response.
7. **JSON response / wp_send_json():** PHP sends the response and terminates the AJAX request.
8. **JavaScript updates the DOM:** Display results, feedback, or validation errors without a full page reload.

Important accuracy requirements:

- Explain that `admin-ajax.php` is a WordPress-provided PHP entry point, not the AJAX technology itself.
- Explain that the `action` parameter is used to determine which WordPress hook is dispatched.
- Show that authenticated and unauthenticated requests use different hooks.
- Explain that `wp_ajax_nopriv_{$action}` is needed for logged-out visitors; registering only `wp_ajax_{$action}` does not enable the same handler for logged-out users.
- Explain that the hook name is formed by appending the action value to the relevant hook prefix.
- Show how the PHP callback is registered using `add_action()`.
- Show the request passing through WordPress bootstrap and hook dispatch, not directly from the browser to a plugin callback.
- Make clear that WordPress AJAX can return JSON, text, or other HTTP response bodies; JSON is a common convention, not an absolute requirement.

## 7.2 Interactive WordPress hook dispatcher

This should be one of the most educational interactive features.

Build a simulated WordPress hook registration screen. The learner should be able to select or edit the AJAX action name and authentication state.

Example action:

`get_student_details`

Request parameter:

`action=get_student_details`

Demonstrate these hook registrations:

| Authentication | Hook | Example state |
|---|---|---|
| Logged in | `wp_ajax_get_student_details` | Matching hook |
| Logged out | `wp_ajax_nopriv_get_student_details` | No handler until registered |

Required functionality:

- Allow adding, editing, and removing hook registrations.
- Show registered hooks and their associated callback names.
- Allow toggling logged-in/logged-out state.
- Allow changing the action parameter.
- Visually highlight the hook that matches the current request.
- If no matching hook exists, show a failed dispatch and explain why.
- If the hook is registered only for logged-in users, explain why a logged-out visitor cannot reach it.
- Show the callback execution only when the registration and authentication state match.

Provide a guided exercise in which the learner fixes a missing `wp_ajax_nopriv_` registration and replays the request.

Do not use real WordPress user accounts or pretend the local hook dispatcher is connected to a production site.

# 8. WordPress code studio: PHP + JavaScript side by side

The code studio must connect the browser-side and server-side code visually. Learners should be able to follow the same request across both files.

## 8.1 Build a complete example

Use a realistic "Load Student Details" example with a PHP handler and JavaScript frontend.

### PHP â€” simplified plugin example

```php
<?php
/**
 * Plugin Name: AJAX Lab Demo
 */

add_action(
    'wp_enqueue_scripts',
    'ajax_lab_enqueue_scripts'
);

function ajax_lab_enqueue_scripts() {
    wp_enqueue_script(
        'ajax-lab',
        plugin_dir_url(__FILE__) . 'ajax-lab.js',
        array('jquery'),
        '1.0.0',
        true
    );

    wp_localize_script(
        'ajax-lab',
        'ajaxLab',
        array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce'   => wp_create_nonce('ajax_lab_nonce'),
        )
    );
}

add_action(
    'wp_ajax_get_student_details',
    'ajax_lab_get_student_details'
);

add_action(
    'wp_ajax_nopriv_get_student_details',
    'ajax_lab_get_student_details'
);

function ajax_lab_get_student_details() {
    check_ajax_referer('ajax_lab_nonce', 'nonce');

    $student_id = isset($_POST['student_id'])
        ? absint($_POST['student_id'])
        : 0;

    if (!$student_id) {
        wp_send_json_error(
            array('message' => 'Invalid student ID.'),
            400
        );
    }

    // Demonstration data. No database query is performed.
    $student = array(
        'id'    => $student_id,
        'name'  => 'Aarav Das',
        'course' => 'Web Development',
    );

    wp_send_json_success($student);
}
```

Explain that this is a teaching example with fixed demonstration data, not a complete student-management plugin.

Because the same handler is registered for logged-in and logged-out visitors, a nonce does not establish identity or authorization. In a real student-management system, private student records must additionally be protected by authentication and appropriate capability or ownership checks.

### JavaScript â€” jQuery frontend

```javascript
jQuery(function ($) {
    $('#load-student').on('click', function () {
        const studentId = $('#student-id').val();

        $.ajax({
            url: ajaxLab.ajaxUrl,
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'get_student_details',
                nonce: ajaxLab.nonce,
                student_id: studentId
            },

            beforeSend: function () {
                $('#student-result').text('Loading...');
            },

            success: function (response) {
                if (response.success) {
                    $('#student-result').text(
                        response.data.name
                    );
                } else {
                    $('#student-result').text(
                        response.data.message
                    );
                }
            },

            error: function () {
                $('#student-result').text(
                    'The request failed.'
                );
            }
        });
    });
});
```

Use the above as a teaching reference. Keep the executable examples in the application as separate, syntax-highlighted source files, with line numbers and step-specific highlighting.

## 8.2 Code-to-animation synchronization

Implement a two-way connection between code and the visualization.

When the learner selects a lifecycle stage:

- Highlight the JavaScript line responsible for the current request.
- Highlight the PHP hook registration when WordPress dispatches the action.
- Highlight the PHP callback while the simulated server processes data.
- Highlight `wp_send_json_success()` or `wp_send_json_error()` when the response is created.
- Highlight the JavaScript response handler when the response is processed.
- Highlight the DOM update code when the result appears in the interface.

When the learner clicks a line of code, jump to the corresponding lifecycle stage.

Display a small explanation beside the active line, such as:

> `action: 'get_student_details'`  
> This value tells WordPress which AJAX action to dispatch. WordPress uses it to find the matching registered hook. It is not the PHP function name itself.

Do not use independent, hardcoded highlights that can drift out of sync with the animation. Define stable stage identifiers and associate each relevant source-code range with those identifiers.

# 9. WordPress AJAX security and error lab

This module is essential. The app must teach safe AJAX development, not just successful requests.

## 9.1 Interactive security scenarios

1. **Nonce validation:** Compare valid, missing, expired, and invalid nonce scenarios. Show where `check_ajax_referer()` executes and how a failed check interrupts processing.
2. **Authentication and capabilities:** Simulate an administrator, an authenticated user without the required capability, and a logged-out visitor. Demonstrate `current_user_can()` and permission checks.
3. **Input validation and sanitization:** Send valid and invalid IDs, unexpected strings, and malformed payloads. Show validation and context-appropriate sanitization.
4. **Output escaping:** Demonstrate why `textContent` or jQuery `.text()` is appropriate for plain text and why inserting untrusted data through `innerHTML` or `.html()` can introduce XSS.
5. **Nonce is not authorization:** Show a request with a valid nonce but insufficient permissions. The simulated capability check must deny access to private data.

The user should be able to intentionally disable or break a security control and replay the request to observe the consequence.

## 9.2 Security teaching rules

Explain each of these distinctions in beginner-friendly language:

- A WordPress nonce helps protect against certain CSRF attacks; it is not a password, access token, or proof of authorization.
- Nonces do not replace `current_user_can()`, authentication, or resource-ownership checks.
- Public AJAX actions should return only data intended for public access.
- Sanitize input appropriately, validate values against expected rules, and escape output for its context.
- Use prepared database queries for SQL operations.
- Use `wp_send_json_success()` and `wp_send_json_error()` for structured JSON responses where appropriate.
- HTTP status codes, the WordPress JSON success flag, and JavaScript transport errors are separate concepts.

Do not describe a nonce as encryption or imply that hiding an AJAX URL makes an endpoint secure.

Use simulated identities and mock records only. Never expose real user information, credentials, or production secrets in the demo.

Security exercises must be local, harmless, and limited to the app's own simulated request environment.

# 10. Network inspector and request debugger

Build a browser-DevTools-inspired inspector, but simplify it for learning.

The inspector should use five tabs.

| Tab | Content |
|---|---|
| Overview | Request URL, method, status, duration, current state, and scenario name |
| Request | Query parameters, request headers, form fields, JSON body, and action parameter |
| Response | HTTP status, response headers, raw response text, parsed JSON, and WordPress success/error envelope |
| Console | Lifecycle events, parsing errors, request failures, validation errors, and callback logs |
| Timeline | Ordered request events and configurable simulated durations |

Add a "Copy as cURL" action for requests that have a meaningful HTTP representation. For simulated requests, clearly label the command as illustrative and do not imply that it will reach a real WordPress installation.

The request and response inspector must derive its contents from the same request-state object used by the animation. Avoid separate hardcoded inspector data.

## 10.1 Important network concepts to visualize

Include mini-lessons within the inspector for:

- GET versus POST.
- Query parameters versus request body.
- `application/json` versus `application/x-www-form-urlencoded` versus `multipart/form-data`.
- HTTP status codes: 200, 400, 401, 403, 404, 500.
- HTTP response success versus application-level success.
- JSON parsing and malformed JSON.
- Browser same-origin policy and CORS.
- Cookies and authenticated browser requests.
- The difference between a network failure and a server-generated error response.

Explain that an HTTP 200 response can still contain a WordPress JSON error envelope, and that `fetch()` does not automatically reject on HTTP error status codes.

# 11. Learning curriculum and guided lessons

Create a structured curriculum with progressive difficulty. Every lesson must link directly to a relevant visualizer scenario.

## Level 1 â€” Foundations: Understand AJAX

No prior AJAX knowledge required.

1. What AJAX actually is.
2. Traditional page reload versus asynchronous updates.
3. Client, server, HTTP, and browser responsibilities.
4. JavaScript events and asynchronous execution.
5. Request and response fundamentals.

## Level 2 â€” Standalone AJAX: Build browser-to-server communication

1. XMLHttpRequest and readyState.
2. `fetch()`, Promises, and async/await.
3. GET, POST, headers, and request bodies.
4. JSON, response parsing, and DOM manipulation.
5. Forms, live search, pagination, and error handling.

## Level 3 â€” WordPress AJAX: Understand WordPress's request lifecycle

1. What admin-ajax.php does.
2. Registering `wp_ajax_` and `wp_ajax_nopriv_` hooks.
3. Passing data with `wp_localize_script()` and script configuration.
4. PHP callbacks, request parsing, and `wp_send_json()`.
5. Nonce validation, capabilities, and permissions.

## Level 4 â€” Professional Practice: Debug and build safely

1. Debugging failed requests in Network Inspector.
2. Input validation, sanitization, output escaping.
3. Request cancellation, debouncing, and race conditions.
4. Performance, caching, and duplicate request prevention.
5. Building a complete AJAX-powered WordPress feature.

### Lesson format

Every lesson must follow the same teaching pattern:

1. Learning objective: What the learner will understand after this lesson.
2. Plain-English explanation: Explain the concept using a real-world analogy.
3. Visual demonstration: Show the relevant request or system flow.
4. Interactive experiment: Let the learner change a value or trigger an event.
5. Code walkthrough: Explain the minimum code required, line by line.
6. Common mistake: Demonstrate a realistic error and its consequences.
7. Knowledge check: Ask a short question before marking the lesson complete.
8. Practical challenge: Let the learner solve a small problem independently.

Use simple English, short explanations, and familiar examples.

Avoid introducing multiple unfamiliar concepts in the same step. Introduce technical terminology only after explaining what it means in everyday language.

Every lesson should have a "Show me visually" button that opens the relevant visualizer with the correct scenario and initial state.

# 12. Visual design system and UX requirements

The application should look like a modern developer tool, not a generic educational dashboard.

**Design direction**

Style:
- Modern developer-tool interface.
- Clean, restrained, premium visual design.
- A balance between a code editor, browser DevTools, and an interactive learning platform.
- Generous spacing, clear hierarchy, readable code, and minimal visual noise.

Color:
- Neutral dark navy/charcoal surfaces for dark mode.
- Clean white and light-gray surfaces for light mode.
- Use a restrained blue or cyan accent for active request paths.
- Use green for success, amber for processing/warnings, and red for errors.
- Never rely on color alone to communicate request state.

Typography:
- Use a highly readable sans-serif font for UI and lesson content.
- Use a monospace font for code, HTTP requests, response payloads, and technical identifiers.
- Maintain comfortable line heights and readable font sizes on mobile.

Components:
- Compact navigation.
- Clear segmented control for Standalone / WordPress modes.
- Scenario cards.
- Lifecycle nodes and directional arrows.
- Code panels with line numbers.
- Expandable inspector panels.
- Consistent badges for request status and authentication state.
- Subtle transitions and meaningful micro-animations.

Avoid:
- Excessive gradients and glassmorphism.
- Large decorative illustrations that reduce usable space.
- Too many cards nested inside cards.
- Excessive shadows, glowing effects, or animated backgrounds.
- Huge hero sections that push the visualizer below the fold.
- Tiny text or dense diagrams that are impossible to read on mobile.

Support light, dark, and system theme modes.

Store the user's theme preference locally. Ensure that code blocks, diagrams, status badges, and all interactive states remain readable in both themes.

## 12.1 Responsive behavior

| Viewport | Requirements |
|---|---|
| Desktop â€” 1280px and above | Full three-column workspace, animated lifecycle in the center, compact side inspectors, and collapsible code panel |
| Tablet â€” 768px to 1279px | Two-column or stacked layout. Move code and network details into tabs. Keep the animation as the primary focus |
| Mobile â€” 320px to 767px | Single-column layout, vertical lifecycle, touch-friendly controls, compact status indicators, and horizontally scrollable code only where necessary |

# 13. Application architecture and implementation discipline

Keep the project maintainable without introducing unnecessary abstraction.

Suggested structure for a new React project:

```text
src/
â”œâ”€â”€ app/
â”‚   â”œâ”€â”€ App.tsx
â”‚   â”œâ”€â”€ routes.tsx
â”‚   â””â”€â”€ providers/
â”œâ”€â”€ components/
â”‚   â”œâ”€â”€ layout/
â”‚   â”œâ”€â”€ navigation/
â”‚   â”œâ”€â”€ visualizer/
â”‚   â”œâ”€â”€ code-studio/
â”‚   â””â”€â”€ inspector/
â”œâ”€â”€ features/
â”‚   â”œâ”€â”€ standalone/
â”‚   â”œâ”€â”€ wordpress/
â”‚   â”œâ”€â”€ security-lab/
â”‚   â”œâ”€â”€ lessons/
â”‚   â””â”€â”€ challenges/
â”œâ”€â”€ engine/
â”‚   â”œâ”€â”€ types.ts
â”‚   â”œâ”€â”€ lifecycle.ts
â”‚   â”œâ”€â”€ simulation.ts
â”‚   â”œâ”€â”€ request-adapters.ts
â”‚   â””â”€â”€ event-log.ts
â”œâ”€â”€ data/
â”‚   â”œâ”€â”€ scenarios.ts
â”‚   â”œâ”€â”€ lessons.ts
â”‚   â””â”€â”€ code-examples.ts
â”œâ”€â”€ hooks/
â”œâ”€â”€ utils/
â””â”€â”€ styles/
```

This is a suggested structure, not a requirement to create empty folders or abstraction layers without a purpose.

## 13.1 State-driven visualization engine

The visualization must be controlled by a central, typed lifecycle state.

Each scenario should provide:

- A scenario identifier and mode.
- Request configuration.
- Lifecycle stages.
- Stage-specific explanations.
- Associated code line ranges.
- Simulated server behavior.
- Response data and error conditions.

The engine should support operations such as:

```text
loadScenario()
startSimulation()
pauseSimulation()
nextStep()
previousStep()
replay()
reset()
```

The engine should distinguish between the following states:

```text
idle
request-created
request-sent
server-processing
response-received
response-parsed
dom-updated
failed
```

These are visualization states, not claims about a browser's exact internal networking implementation.

Do not implement playback as a collection of unrelated timers that independently update components. Use a predictable state machine or equivalent state-driven transition system, with cleanup for timers, cancellation, and scenario changes.

The inspector, animation, code highlighting, timeline, and explanations must all derive from the same active execution state.

## 13.2 Simulation versus real execution

Implement two explicitly separated execution modes.

### Mode A â€” Simulation Mode

Default mode. Executes deterministic mock handlers and simulates the PHP/WordPress lifecycle. Works without a backend and powers all guided lessons.

### Mode B â€” Real Request Mode

Optional advanced mode. Sends actual browser HTTP requests to a user-configured endpoint. Requires explicit endpoint configuration and a compatible server.

For real request mode:

- Make it opt-in and clearly distinguish it from simulation.
- Never silently send requests to external services.
- Do not allow arbitrary requests to localhost, private networks, or external hosts without an explicit user-configured target.
- Show that CORS, browser security rules, authentication, and server availability can prevent requests.
- Do not execute arbitrary PHP code inside the browser.
- Do not claim that a simulated WordPress hook dispatcher is a live WordPress instance.

If no backend is available, all core functionality must remain usable through simulation mode.

# 14. Challenges, quizzes, and progress

Build an interactive assessment system based on the concepts taught in the visualizer.

**Challenge categories:**

A. **Predict the request:** Show a JavaScript snippet and ask the learner to identify the HTTP method, URL, payload, and expected response.

B. **Trace the lifecycle:** Show an incomplete request diagram and ask the learner to place the stages in the correct order.

C. **Fix the WordPress hook:** Present a PHP callback with a missing or incorrectly registered hook. Let the learner correct the registration.

D. **Debug the response:** Show a failed request and ask the learner to inspect the request, response, and console to identify the cause.

E. **Secure the endpoint:** Present a simulated WordPress AJAX handler with missing capability checks, unsafe output, or improper input handling. Let the learner select the required correction.

F. **Build the feature:** Guide the learner through creating a simple AJAX-powered search or student-details component.

Provide immediate explanations after each answer, not merely a green tick or red cross.

Track lesson completion, challenge attempts, and unlocked lessons locally. Do not introduce account creation or a backend database for progress tracking.

Include a reset-progress option and a visible progress indicator.

# 15. Quality assurance and acceptance criteria

Claude Code must verify the following before declaring the app complete.

- **Core lifecycle:** Every lifecycle stage works with Play, Pause, Next, Previous, Replay, and Reset.
- **Standalone AJAX:** GET, POST, forms, search, pagination, and failure scenarios are functional.
- **WordPress dispatcher:** Correctly resolves authenticated and unauthenticated hook registrations.
- **Code synchronization:** Code highlights and explanations match the active lifecycle stage.
- **Network inspector:** Request and response information is derived from the actual scenario execution state.
- **Security lab:** Nonce validation, capability checks, and unsafe data handling scenarios produce accurate results.
- **Responsive UI:** No broken layout or unusable controls at 320px, tablet, and desktop widths.
- **Accessibility:** Keyboard navigation, focus indicators, reduced-motion support, and accessible status announcements.
- **Reliability:** No unhandled errors, stale simulation timers, or broken state after switching scenarios.
- **Build and deployment:** Production build succeeds, routes work on refresh, and the app runs without paid services.

Additional testing requirements:

- Test the WordPress action dispatcher with matching hooks, missing hooks, and incorrect authentication states.
- Test malformed JSON, HTTP errors, network failures, and application-level errors independently.
- Test switching scenarios during playback to ensure no old animation continues.
- Verify that code copy buttons copy the correct source.
- Verify that no simulated request is presented as a real server execution.
- Run the production build and fix all errors before delivery.
- Include clear setup and local development instructions in the README.

# 16. Development workflow for Claude Code

Follow this phased implementation process strictly.

## PHASE 1 â€” Repository audit and feasibility

Inspect the existing project and report:

- Current framework and dependencies.
- Existing routes and UI architecture.
- Reusable components and design tokens.
- Missing dependencies, technical limitations, and implementation risks.

If this is a new project, propose a minimal setup.

Do not begin a large implementation before understanding the project.

## PHASE 2 â€” Architecture and design system

Define the app shell, navigation, theme tokens, responsive breakpoints, lifecycle data model, and simulation engine architecture.

Build the visualizer shell before implementing the full curriculum.

## PHASE 3 â€” Core standalone visualizer

Implement the lifecycle engine, execution controls, request and response packets, code synchronization, and network inspector.

Complete at least one end-to-end standalone scenario before expanding to other scenarios.

## PHASE 4 â€” WordPress AJAX engine

Implement the WordPress request flow, simulated hook registry, authentication branching, PHP callback visualization, and WordPress code studio.

Verify that the simulated execution follows the actual WordPress AJAX architecture.

## PHASE 5 â€” Security and educational modules

Add the nonce and capability lab, error scenarios, lessons, challenges, and quick reference.

## PHASE 6 â€” Polish and quality assurance

Test responsive layouts, keyboard interactions, reduced-motion behavior, state cleanup, and production builds.

Fix the underlying problems instead of hiding them with CSS workarounds or hardcoded display values.

At the end of every phase:

1. Summarize what was implemented.
2. List the relevant files changed.
3. Report tests and build results.
4. Identify any remaining limitations or blockers.
5. Stop and request approval before proceeding to the next phase.

Do not silently skip a phase, replace an approved design, introduce unrelated features, or claim a task is complete without verification.

Prioritize a working, accurate core engine over a large collection of unfinished features.

---

# Final instruction to Claude Code

**Start with Phase 1 only.**

Inspect the existing repository or establish whether this is a new project. Then report the architecture, feasibility, and any important technical concerns.

Do not immediately generate the entire application in one pass.

The final product must make a beginner capable of explaining, in their own words, what happens from the moment a button is clicked in the browser until a PHP or WordPress response updates the page.

Every animation, code panel, and interactive exercise must reinforce that understanding.

**The goal is conceptual clarity through interactionâ€”not maximum feature count.**
