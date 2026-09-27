import type { Lesson, Level } from './types';

export const LEVELS: Level[] = [
  { level: 1, title: 'Foundations: Understand AJAX', description: 'No prior AJAX knowledge required.' },
  { level: 2, title: 'Standalone AJAX: Browser-to-server communication', description: 'XMLHttpRequest, fetch(), HTTP methods, JSON, and errors.' },
  { level: 3, title: 'WordPress AJAX: The WordPress request lifecycle', description: 'admin-ajax.php, action hooks, nonces, and JSON responses.' },
  { level: 4, title: 'Professional practice: Debug and build safely', description: 'Debugging, security, race conditions, and a complete feature.' },
];

/** Lessons in a level unlock once this many lessons in the previous level are complete. */
export const UNLOCK_THRESHOLD = 3;

export const LESSONS: Lesson[] = [
  // ─── Level 1 ─────────────────────────────────────────────────────────────
  {
    id: 'what-is-ajax',
    level: 1,
    title: 'What AJAX actually is',
    objective: 'Explain AJAX in one sentence, and say what it is not.',
    analogy:
      'In a restaurant you do not leave, walk back in, and sit down again every time you want dessert. You ask the waiter, who brings just the dessert to your table. AJAX is asking the waiter.',
    explanation: [
      'AJAX is a technique: JavaScript running in a web page asks a server for data in the background, then updates part of the page with the answer. The page is never reloaded.',
      'The name stands for “Asynchronous JavaScript and XML” and dates from 2005. Today the data is usually JSON rather than XML, but the name stuck.',
      'AJAX is not a programming language, not a library you install, not a server technology, and not a WordPress feature. Every browser supports it through built-in functions such as fetch() and XMLHttpRequest.',
    ],
    visual: { scenarioId: 'load-profile', caption: 'Watch one complete AJAX request, from the click to the updated profile card.' },
    experiment: {
      steps: [
        'Type something in the “Your notes” field of the page.',
        'Press Load Profile and let the request finish.',
        'Look at the address bar and your note. Neither changed — only the profile card did.',
      ],
      link: { scenarioId: 'load-profile' },
      linkLabel: 'Open the profile scenario',
    },
    code: {
      title: 'The smallest useful AJAX request',
      language: 'javascript',
      code: `button.addEventListener('click', async () => {
  const response = await fetch('/api/profile?id=7');
  const profile = await response.json();
  card.querySelector('.name').textContent = profile.name;
});`,
      notes: [
        { line: 1, text: 'Nothing happens until the user clicks.' },
        { line: 2, text: 'fetch() sends an HTTP request in the background.' },
        { line: 3, text: 'The answer arrives as text; .json() turns it into a JavaScript object.' },
        { line: 4, text: 'Only this one element changes. The rest of the page stays as it was.' },
      ],
    },
    mistake: {
      title: 'Looking for “AJAX” to install',
      consequence: 'Beginners sometimes search for an AJAX library or server module, and add jQuery just to make a request.',
      fix: 'AJAX is already in every browser. fetch() and XMLHttpRequest are the tools; the server only has to answer ordinary HTTP requests.',
    },
    check: {
      kind: 'choice',
      question: 'Which statement about AJAX is true?',
      options: [
        { text: 'It is a programming language used in browsers.', feedback: 'The language is JavaScript. AJAX is a way of using it.' },
        { text: 'Browser JavaScript requests data in the background and updates part of the page.' },
        { text: 'It only works on WordPress sites.', feedback: 'Any website can use AJAX; WordPress just has its own conventions for it.' },
        { text: 'It runs on the web server.', feedback: 'The request starts in the browser. The server only answers it.' },
      ],
      answer: 1,
      explanation: 'AJAX is a browser-side technique: JavaScript sends an HTTP request without reloading the page and uses the response to update the page.',
    },
    challenge: {
      kind: 'text',
      question: 'In the code above, which built-in browser function sends the request? Type its name.',
      accept: ['fetch', 'fetch()'],
      placeholder: 'function name',
      hint: 'Look at line 2.',
      explanation: 'fetch() is the modern built-in way to send an HTTP request from JavaScript. No library is needed.',
    },
  },
  {
    id: 'reload-vs-async',
    level: 1,
    title: 'Traditional page reload versus asynchronous updates',
    objective: 'Describe what a full page reload throws away, and what an AJAX update keeps.',
    analogy:
      'A full reload is like reprinting an entire newspaper to fix one headline. An AJAX update is like pasting a correction over just that headline.',
    explanation: [
      'Without AJAX, getting new data means navigating: the browser requests a whole new HTML document, throws the current page away, and draws everything again. Scroll position and anything you typed are lost, and the screen may flash.',
      'With AJAX, the page stays loaded. JavaScript fetches only the data it needs and changes only the part of the page that shows it.',
      'Forms normally submit by navigating. To send a form with AJAX, the code calls event.preventDefault() to cancel that navigation, then sends the data itself.',
    ],
    visual: { scenarioId: 'load-profile', caption: 'Use “Compare with a full page reload” on the page to see the difference side by side.' },
    experiment: {
      steps: [
        'Type a note in the page, then press “Compare with a full page reload”.',
        'Notice that the address changes, the page goes blank, and your note is gone.',
        'Go back to the AJAX version and load a profile: the note survives.',
      ],
      link: { scenarioId: 'load-profile' },
      linkLabel: 'Open the comparison',
    },
    code: {
      title: 'Stopping a form from reloading the page',
      language: 'javascript',
      code: `form.addEventListener('submit', (event) => {
  event.preventDefault();
  const body = new URLSearchParams(new FormData(form));
  fetch('/api/register', { method: 'POST', body });
});`,
      notes: [
        { line: 1, text: 'Listen for the form’s submit event.' },
        { line: 2, text: 'Cancel the browser’s default action: navigating to a new page.' },
        { line: 3, text: 'Collect the form fields.' },
        { line: 4, text: 'Send them in the background instead.' },
      ],
    },
    mistake: {
      title: 'Forgetting preventDefault()',
      consequence: 'The fetch() starts, but the browser also submits the form normally and navigates away, so the AJAX response has no page left to update.',
      fix: 'Call event.preventDefault() at the start of the submit handler.',
    },
    check: {
      kind: 'choice',
      question: 'After an AJAX update, what happens to text the user typed elsewhere on the page?',
      options: [
        { text: 'It is lost, like after any page load.', feedback: 'That happens with a full reload, not with AJAX.' },
        { text: 'It stays, because the page was never reloaded.' },
        { text: 'It is sent to the server automatically.', feedback: 'Only data your code puts into the request is sent.' },
      ],
      answer: 1,
      explanation: 'An AJAX update changes only the elements your code touches; everything else, including form input and scroll position, is untouched.',
    },
    challenge: {
      kind: 'text',
      question: 'Which method call cancels a form’s normal full-page submission? (write it as it appears on line 2)',
      accept: ['event.preventDefault()', 'preventDefault()', 'event.preventDefault', 'preventDefault'],
      placeholder: 'event.…',
      hint: 'It “prevents” the “default” action.',
      explanation: 'event.preventDefault() stops the browser’s built-in behaviour for that event — for a submit event, navigating to a new page.',
    },
  },
  {
    id: 'client-server',
    level: 1,
    title: 'Client, server, HTTP, and browser responsibilities',
    objective: 'Say which part of the system is responsible for each step of a request.',
    analogy:
      'Posting a letter: you (JavaScript) write it, the postal service (the network, using HTTP) carries it, the recipient (the server) reads it and writes a reply, and the reply comes back the same way.',
    explanation: [
      'The client is the browser, running your page and its JavaScript. The server is a program on another computer that receives requests and sends responses.',
      'HTTP is the agreed format for those messages: a request has a method, a URL, headers, and sometimes a body; a response has a status code, headers, and a body.',
      'The browser does the networking. JavaScript decides what to ask for and what to do with the answer. The server decides what the answer is, including the status code.',
    ],
    visual: {
      scenarioId: 'load-profile',
      stage: 3,
      caption: 'The request has reached the server. Step forwards and backwards and watch the “Responsible” label change.',
    },
    experiment: {
      steps: ['Step through all eight stages with Next.', 'For each stage, note which part is responsible: browser, JavaScript, network, web server, PHP, or DOM.'],
      link: { scenarioId: 'load-profile', stage: 0 },
      linkLabel: 'Step through the stages',
    },
    code: {
      title: 'The server side: a tiny PHP endpoint',
      language: 'php',
      code: `<?php
header('Content-Type: application/json');
$profiles = [7 => ['name' => 'Maya Chen', 'role' => 'Frontend Developer']];
$id = (int) ($_GET['id'] ?? 0);
if (!isset($profiles[$id])) {
    http_response_code(404);
    echo json_encode(['error' => 'Profile not found']);
    exit;
}
echo json_encode($profiles[$id]);`,
      notes: [
        { line: 2, text: 'Tell the browser the body will be JSON.' },
        { line: 4, text: 'Read the id from the query string and force it to an integer.' },
        { line: 6, text: 'The server chooses the status code.' },
        { line: 10, text: 'Whatever is echoed becomes the response body.' },
      ],
    },
    mistake: {
      title: 'Expecting JavaScript to “see” the database',
      consequence: 'Browser code cannot read the server’s files or database directly; it only ever sees what the server chooses to send back.',
      fix: 'Put the logic that needs server data on the server, and send the browser only what it needs.',
    },
    check: {
      kind: 'choice',
      question: 'Which part decides the HTTP status code of a response?',
      options: [
        { text: 'The browser.', feedback: 'The browser receives the status; it does not choose it.' },
        { text: 'The JavaScript that sent the request.', feedback: 'JavaScript can only read the status after it arrives.' },
        { text: 'The server.' },
      ],
      answer: 2,
      explanation: 'The server’s code sets the status code, for example 200 for success or 404 when the resource does not exist.',
    },
    challenge: {
      kind: 'text',
      question: 'Which HTTP status code does the endpoint above send when the profile does not exist?',
      accept: ['404'],
      placeholder: 'e.g. 200',
      hint: 'Look at line 6.',
      explanation: '404 Not Found means the server understood the request but has no resource at that address.',
    },
  },
  {
    id: 'async-events',
    level: 1,
    title: 'JavaScript events and asynchronous execution',
    objective: 'Predict the order in which asynchronous code runs.',
    analogy:
      'At a café you order, receive a buzzer, and sit down. You do not stand at the counter until the coffee is ready — the buzzer tells you later. A Promise is that buzzer.',
    explanation: [
      'JavaScript reacts to events such as clicks. When a click handler sends a request, the request takes time, but the browser does not freeze while it waits.',
      'fetch() returns a Promise straight away: an object that will later hold the response. Code after the fetch() call keeps running immediately.',
      'await pauses only the async function it is in, until the Promise settles. The rest of the page keeps responding.',
    ],
    visual: { scenarioId: 'load-profile', stage: 2, caption: 'The request is in flight. The page is still fully usable while it waits.' },
    experiment: {
      steps: ['Set the speed to Slow and press Play.', 'While the request is in flight, type in the notes field. The page is not blocked.'],
      link: { scenarioId: 'load-profile' },
      linkLabel: 'Try it',
    },
    code: {
      title: 'Which line logs first?',
      language: 'javascript',
      code: `console.log('1: before fetch');
fetch('/api/profile?id=7').then(() => {
  console.log('3: response arrived');
});
console.log('2: after fetch');`,
      notes: [
        { line: 2, text: 'fetch() starts the request and returns a Promise immediately.' },
        { line: 3, text: 'This callback runs later, when the response arrives.' },
        { line: 5, text: 'This runs right away — before the response.' },
      ],
    },
    mistake: {
      title: 'Using the result before it exists',
      code: {
        language: 'javascript',
        code: `let profile;
fetch('/api/profile?id=7').then((r) => r.json()).then((p) => { profile = p; });
console.log(profile.name); // TypeError: profile is undefined`,
      },
      consequence: 'The last line runs before the response arrives, so profile is still undefined.',
      fix: 'Use the data inside the .then() callback, or after an await inside an async function.',
    },
    check: {
      kind: 'choice',
      question: 'In the code above, in what order are the messages logged?',
      options: [{ text: '1, 3, 2' }, { text: '1, 2, 3' }, { text: '2, 1, 3', feedback: 'Line 1 runs first; nothing jumps ahead of it.' }],
      answer: 1,
      explanation: 'fetch() does not wait for the response. Line 5 runs immediately, and the .then() callback runs later, once the response arrives.',
    },
    challenge: {
      kind: 'order',
      question: 'Put these moments in the order they happen after a click.',
      items: [
        'The click handler runs',
        'fetch() returns a Promise',
        'Code after fetch() runs',
        'The response arrives',
        'The .then() callback updates the page',
      ],
      explanation: 'The handler runs synchronously to the end first; the response and its callback always come later.',
    },
  },
  {
    id: 'request-response',
    level: 1,
    title: 'Request and response fundamentals',
    objective: 'Read the parts of an HTTP request and response.',
    analogy:
      'A request is like an order form: what you want (method and URL), notes for the kitchen (headers), and sometimes a filled-in section (the body). The response is the receipt and the food: a status, notes, and the content.',
    explanation: [
      'A request line says the method and the URL, for example GET /api/profile?id=7. Everything after the “?” is the query string, which is how GET requests carry data.',
      'Headers are name: value pairs of extra information, such as Accept: application/json (“I would like JSON”). POST requests usually carry data in a body instead of the URL.',
      'A response has a status code (200 OK, 404 Not Found, …), headers such as Content-Type, and a body — at first just text, which JavaScript then parses.',
    ],
    visual: { scenarioId: 'load-profile', stage: 5, route: '/network', caption: 'The response has arrived. Inspect it in the Network Inspector.' },
    experiment: {
      steps: ['Open the Request tab: find the method, the query parameter, and the Accept header.', 'Open the Response tab: find the status code, the Content-Type, and the raw body.'],
      link: { scenarioId: 'load-profile', stage: 5, route: '/network' },
      linkLabel: 'Open the Network Inspector',
    },
    code: {
      title: 'One request and its response, as HTTP text',
      language: 'markup',
      code: `GET /api/profile?id=7 HTTP/1.1
Host: ajax-lab.test
Accept: application/json

HTTP/1.1 200 OK
Content-Type: application/json

{"id":7,"name":"Maya Chen"}`,
      notes: [
        { line: 1, text: 'Method, path with query string, protocol.' },
        { line: 3, text: 'A request header: the kind of answer we want.' },
        { line: 5, text: 'The status line of the response.' },
        { line: 8, text: 'The body: plain text until JavaScript parses it.' },
      ],
    },
    mistake: {
      title: 'Treating the body as an object straight away',
      consequence: 'The body arrives as text. Reading response.name on a fetch Response gives undefined.',
      fix: 'Parse it first: await response.json() (fetch) or JSON.parse(xhr.responseText) (XMLHttpRequest).',
    },
    check: {
      kind: 'choice',
      question: 'Where does a GET request put its data?',
      options: [
        { text: 'In the request body.', feedback: 'That is where POST usually puts it. GET requests have no body.' },
        { text: 'In the URL’s query string.' },
        { text: 'In a cookie.', feedback: 'Cookies are set by the site, not used for a request’s own data.' },
      ],
      answer: 1,
      explanation: 'GET requests carry their data in the query string, after the “?” in the URL, such as ?id=7.',
    },
    challenge: {
      kind: 'text',
      question: 'In GET /api/profile?id=7, what is the value of the id query parameter?',
      accept: ['7'],
      placeholder: 'value',
      hint: 'Look after “id=”.',
      explanation: 'The query string id=7 has the name “id” and the value “7”. On the server it always arrives as text.',
    },
  },

  // ─── Level 2 ─────────────────────────────────────────────────────────────
  {
    id: 'xhr-readystate',
    level: 2,
    title: 'XMLHttpRequest and readyState',
    objective: 'Send a request with XMLHttpRequest and handle its events.',
    analogy:
      'XMLHttpRequest is like tracking a parcel: you get updates as it is packed, shipped, and delivered (readyState 1 to 4), and you act when it arrives.',
    explanation: [
      'XMLHttpRequest (XHR) is the original browser API for AJAX, and it still works everywhere. You create one object per request, configure it with open(), then start it with send().',
      'Its readyState goes from 0 (unsent) to 4 (DONE). The load event fires when a response has fully arrived — for any status code, including 404.',
      'The response body is available as text in xhr.responseText; JSON.parse() turns it into an object.',
    ],
    visual: { scenarioId: 'load-profile', stage: 1, caption: 'In the Code tab, choose “XMLHttpRequest” to see the same request written with XHR.' },
    experiment: {
      steps: ['Open the Code tab and choose XMLHttpRequest.', 'Step through the stages and compare which lines light up with the fetch() version.'],
      link: { scenarioId: 'load-profile', stage: 1 },
      linkLabel: 'Compare implementations',
    },
    code: {
      title: 'An XMLHttpRequest from start to finish',
      language: 'javascript',
      code: `const xhr = new XMLHttpRequest();
xhr.open('GET', '/api/profile?id=7');
xhr.onload = function () {
  if (xhr.status === 200) {
    const profile = JSON.parse(xhr.responseText);
    card.textContent = profile.name;
  }
};
xhr.send();`,
      notes: [
        { line: 2, text: 'Configure the request. Nothing is sent yet.' },
        { line: 3, text: 'onload runs when the response has arrived (readyState 4).' },
        { line: 4, text: 'onload also runs for 404 and 500, so check the status.' },
        { line: 9, text: 'send() starts the request and returns immediately.' },
      ],
    },
    mistake: {
      title: 'Assuming onload means success',
      consequence: 'A 404 or 500 also triggers onload. Without a status check, the code tries to use an error page as data.',
      fix: 'Check xhr.status (for example 200–299) before using the response. onerror fires only for network-level failures.',
    },
    check: {
      kind: 'choice',
      question: 'Which readyState means an XMLHttpRequest has finished?',
      options: [{ text: '1 (OPENED)' }, { text: '2 (HEADERS_RECEIVED)' }, { text: '4 (DONE)' }],
      answer: 2,
      explanation: 'readyState 4, DONE, means the whole response has arrived (or the request failed). The load event fires at this point for any HTTP response.',
    },
    challenge: {
      kind: 'text',
      question: 'Which XMLHttpRequest method actually starts sending the request?',
      accept: ['send', 'send()', 'xhr.send()', 'xhr.send'],
      placeholder: 'method name',
      hint: 'open() only configures it.',
      explanation: 'open() prepares the request; send() transmits it. Event handlers should be attached before send().',
    },
  },
  {
    id: 'fetch-promises',
    level: 2,
    title: 'fetch(), Promises, and async/await',
    objective: 'Use fetch() correctly, including checking response.ok.',
    analogy:
      'fetch() is a delivery promise: “I will bring you whatever the server sends.” It keeps that promise even when the server sends bad news like 404 — it only breaks it when nothing arrives at all.',
    explanation: [
      'fetch(url) returns a Promise that resolves to a Response object once the response headers arrive. With await, you can write this as if it were step-by-step code.',
      'Crucially, fetch() does not reject for HTTP errors. A 404 or 500 still resolves; response.ok is simply false. fetch() rejects only when no response arrives at all, such as a network failure.',
      'response.json() is also asynchronous: it reads the body and parses it, and it throws if the body is not valid JSON.',
    ],
    visual: { scenarioId: 'load-profile', preset: 'not-found', stage: 6, caption: 'A 404 arrives. fetch() did not reject — the code’s response.ok check turns it into an error.' },
    experiment: {
      steps: ['Choose id=999 in the page and play the request.', 'Stop at stage 7 and read the highlighted status check in the Code tab.'],
      link: { scenarioId: 'load-profile', preset: 'not-found' },
      linkLabel: 'Request a missing profile',
    },
    code: {
      title: 'fetch() with a proper status check',
      language: 'javascript',
      code: `async function loadProfile(id) {
  const response = await fetch('/api/profile?id=' + id);
  if (!response.ok) {
    throw new Error('HTTP ' + response.status);
  }
  return await response.json();
}`,
      notes: [
        { line: 2, text: 'Resolves for any HTTP response, including 404.' },
        { line: 3, text: 'ok is true only for statuses 200–299.' },
        { line: 6, text: 'Parsing is a second asynchronous step.' },
      ],
    },
    mistake: {
      title: 'Relying on catch() to see a 404',
      code: {
        language: 'javascript',
        code: `fetch('/api/missing')
  .then((r) => r.json())
  .catch(() => showError()); // never runs for a 404`,
      },
      consequence: 'The 404 resolves normally, so catch() never runs and the page tries to show the error body as data.',
      fix: 'Check response.ok (or response.status) and throw or handle the error yourself.',
    },
    check: {
      kind: 'choice',
      question: 'fetch(\'/missing\') receives an HTTP 404. What happens?',
      options: [
        { text: 'The Promise rejects.', feedback: 'Only network-level failures reject.' },
        { text: 'The Promise resolves, and response.ok is false.' },
        { text: 'fetch() retries automatically.', feedback: 'fetch() never retries by itself.' },
      ],
      answer: 1,
      explanation: 'An HTTP error status is still a successful delivery of a response. Your code must check response.ok.',
    },
    challenge: {
      kind: 'text',
      question: 'Which Response property is true only for 2xx status codes?',
      accept: ['ok', 'response.ok'],
      placeholder: 'response.…',
      hint: 'It is two letters long.',
      explanation: 'response.ok is a shortcut for “status is between 200 and 299”.',
    },
  },
  {
    id: 'methods-headers-bodies',
    level: 2,
    title: 'GET, POST, headers, and request bodies',
    objective: 'Choose between GET and POST and send data the right way.',
    analogy: 'GET is asking a librarian for a book by title. POST is handing in a filled-in form to be processed.',
    explanation: [
      'GET retrieves data. It carries its parameters in the URL and should not change anything on the server, which makes it safe to repeat.',
      'POST sends data to be processed — creating a registration, saving a comment. The data travels in the request body, and the Content-Type header says how it is encoded.',
      'Common encodings: application/x-www-form-urlencoded (name=Ana&email=…), multipart/form-data (for file uploads), and application/json. Passing URLSearchParams to fetch() sets the first one automatically.',
    ],
    visual: { scenarioId: 'submit-form', stage: 2, route: '/network', caption: 'A POST request: no query string, the fields are in the body.' },
    experiment: {
      steps: ['Submit the sign-up form and open Network → Request.', 'Compare with the profile scenario’s GET request: where does the data live in each?'],
      link: { scenarioId: 'submit-form' },
      linkLabel: 'Open the sign-up form',
    },
    code: {
      title: 'A POST with form-encoded data',
      language: 'javascript',
      code: `const body = new URLSearchParams({ name: 'Ana', workshop: 'intro-ajax' });
const response = await fetch('/api/register', {
  method: 'POST',
  headers: { Accept: 'application/json' },
  body,
});`,
      notes: [
        { line: 1, text: 'Encodes the fields as name=Ana&workshop=intro-ajax.' },
        { line: 3, text: 'Without this, fetch() sends GET.' },
        { line: 5, text: 'The browser adds Content-Type: application/x-www-form-urlencoded for you.' },
      ],
    },
    mistake: {
      title: 'Sending a JSON string without saying so',
      code: { language: 'javascript', code: `fetch('/api/register', { method: 'POST', body: JSON.stringify(data) });` },
      consequence: 'The body is sent as text/plain, so a server expecting JSON (or form fields) may not read it.',
      fix: "Add headers: { 'Content-Type': 'application/json' } when sending JSON, or use URLSearchParams/FormData for form data.",
    },
    check: {
      kind: 'choice',
      question: 'Which is true of the sign-up form’s POST request?',
      options: [
        { text: 'Its data is in the query string.', feedback: 'That is how GET works. Look at the Request tab: there are no query parameters.' },
        { text: 'Its data travels in the request body.' },
        { text: 'It has no headers.', feedback: 'Every request has headers.' },
      ],
      answer: 1,
      explanation: 'POST requests carry data in the body, described by the Content-Type header.',
    },
    challenge: {
      kind: 'text',
      question: 'What Content-Type does the browser use when the body is a URLSearchParams object?',
      accept: ['application/x-www-form-urlencoded', 'application/x-www-form-urlencoded;charset=utf-8', 'application/x-www-form-urlencoded; charset=utf-8'],
      placeholder: 'type/subtype',
      hint: 'Check the Body heading in the Request tab.',
      explanation: 'URLSearchParams produces URL-encoded form data: application/x-www-form-urlencoded.',
    },
  },
  {
    id: 'json-dom',
    level: 2,
    title: 'JSON, response parsing, and DOM manipulation',
    objective: 'Parse JSON safely and put data into the page without creating security holes.',
    analogy: 'JSON is a shipping box with a standard label layout. Parsing is opening the box; if the box is damaged, you find out when you open it.',
    explanation: [
      'JSON is text in a strict format. JSON.parse() and response.json() turn it into JavaScript objects and arrays. If the text is cut off or is really an HTML error page, parsing throws a SyntaxError.',
      'A 200 status does not guarantee a valid body. Always be ready for parsing to fail.',
      'To show data, change the DOM. textContent inserts plain text. innerHTML parses its value as HTML, so data containing markup becomes real elements — dangerous for anything you did not write yourself.',
    ],
    visual: { scenarioId: 'failure-recovery', preset: 'invalid-json', stage: 6, caption: 'Status 200 OK, but the body is cut off: parsing fails.' },
    experiment: {
      steps: ['Play the “Broken response body” condition.', 'In Network → Response, compare the raw body with valid JSON. Where does it end?'],
      link: { scenarioId: 'failure-recovery', preset: 'invalid-json' },
      linkLabel: 'Load a broken body',
    },
    code: {
      title: 'Parse, then write plain text',
      language: 'javascript',
      code: `try {
  const data = await response.json();
  list.textContent = data.items[0].text;
} catch (error) {
  list.textContent = 'The server sent something we could not read.';
}`,
      notes: [
        { line: 2, text: 'Throws SyntaxError if the body is not valid JSON.' },
        { line: 3, text: 'textContent never interprets HTML.' },
        { line: 5, text: 'A friendly message instead of a broken page.' },
      ],
    },
    mistake: {
      title: 'Using innerHTML for server data',
      code: { language: 'javascript', code: `result.innerHTML = response.data.name; // name could contain <img onerror=…>` },
      consequence: 'If a stored value contains HTML, it becomes live markup and can run script (cross-site scripting).',
      fix: 'Use textContent (or jQuery .text()) for plain text. Build elements with createElement when you need structure.',
    },
    check: {
      kind: 'choice',
      question: 'Which is the safe way to display a name received from the server?',
      options: [
        { text: 'element.innerHTML = name', feedback: 'innerHTML parses markup inside name.' },
        { text: 'element.textContent = name' },
        { text: 'document.write(name)', feedback: 'document.write also parses HTML, and breaks pages after load.' },
      ],
      answer: 1,
      explanation: 'textContent treats the value as text, so any HTML inside it is displayed rather than executed.',
    },
    challenge: {
      kind: 'text',
      question: 'What does JSON.parse(\'{"name":"Maya"}\').name return? Type the value.',
      accept: ['maya'],
      placeholder: 'value',
      hint: 'Parsing gives an object with one property.',
      explanation: 'JSON.parse turns the text into { name: "Maya" }, so .name is the string “Maya”.',
    },
  },
  {
    id: 'forms-search-errors',
    level: 2,
    title: 'Forms, live search, pagination, and error handling',
    objective: 'Handle expected errors (like validation) differently from unexpected failures.',
    analogy: 'A form sent back with notes in the margin is not a lost form. The post office losing it is a different problem, needing a different response.',
    explanation: [
      'Some error responses are part of normal use. A 422 from a sign-up form says “fix these fields” — the code should show those messages, not crash.',
      'Live search sends a request as the user types. Waiting briefly for typing to pause (debouncing) avoids a request per keystroke. Loading more results (pagination) appends new items to the existing list instead of replacing it.',
      'Unexpected failures — no connection, a timeout, a 500 — need a clear message and often a way to try again.',
    ],
    visual: { scenarioId: 'submit-form', preset: 'invalid', stage: 6, caption: 'The server answers 422 with a message per field.' },
    experiment: {
      steps: ['Submit the form with an invalid email and no workshop.', 'Read the messages under each field, then fix them and submit again.'],
      link: { scenarioId: 'submit-form', preset: 'invalid' },
      linkLabel: 'Submit an invalid form',
    },
    code: {
      title: 'Debouncing a live search',
      language: 'javascript',
      code: `let timer;
input.addEventListener('input', () => {
  clearTimeout(timer);
  timer = setTimeout(() => search(input.value), 300);
});`,
      notes: [
        { line: 3, text: 'Each keystroke cancels the previous pending search…' },
        { line: 4, text: '…and schedules a new one 300 ms later. Only a pause in typing sends a request.' },
      ],
    },
    mistake: {
      title: 'Treating every non-2xx status the same',
      consequence: 'Showing “Something went wrong” for a validation error hides exactly the information the user needs to fix their input.',
      fix: 'Branch on the status: show field messages for 422, offer a retry for network errors and 5xx.',
    },
    check: {
      kind: 'choice',
      question: 'The sign-up form receives 422 with { errors: { email: "…" } }. What should the page do?',
      options: [
        { text: 'Show “Network error, try again”.', feedback: 'The network worked; the server answered.' },
        { text: 'Show the message next to the email field.' },
        { text: 'Reload the page.', feedback: 'That would lose everything the user typed.' },
      ],
      answer: 1,
      explanation: '422 means the server understood the request but rejected the data. The response explains why, so show it.',
    },
    challenge: {
      kind: 'order',
      question: 'Put the steps of an AJAX form submission in order.',
      items: [
        'The user submits the form',
        'event.preventDefault() cancels the page load',
        'fetch() sends the fields with POST',
        'The server validates the fields',
        'JavaScript checks response.ok',
        'The page shows a confirmation or field messages',
      ],
      explanation: 'Every AJAX form follows this shape: stop the navigation, send, let the server validate, then show the outcome.',
    },
  },

  // ─── Level 3 ─────────────────────────────────────────────────────────────
  {
    id: 'admin-ajax',
    level: 3,
    title: 'What admin-ajax.php does',
    objective: 'Explain admin-ajax.php’s role without confusing it with AJAX itself.',
    analogy: 'admin-ajax.php is a hotel’s front desk: every guest request goes there first, and the desk routes it to the right department.',
    explanation: [
      'admin-ajax.php is a PHP file that ships with WordPress, at /wp-admin/admin-ajax.php. It is WordPress’s entry point for AJAX requests — not AJAX itself. The browser technique is exactly the same as on any other site.',
      'When a request arrives, it loads all of WordPress (settings, plugins, the theme, and the current user from the login cookie) and reads the action parameter.',
      'It then turns the action into a hook name and fires that hook. Your plugin’s function runs because it was registered on that hook.',
    ],
    visual: { scenarioId: 'wp-student-details', stage: 2, caption: 'The request arrives at admin-ajax.php, which boots WordPress.' },
    experiment: {
      steps: ['In the WordPress Lab, clear the action field and send the request.', 'Note where it stops and what body comes back.'],
      link: { scenarioId: 'wp-student-details', preset: 'no-action', route: '/wordpress' },
      linkLabel: 'Send a request with no action',
    },
    code: {
      title: 'The core of admin-ajax.php (simplified)',
      language: 'php',
      code: `define( 'DOING_AJAX', true );
require_once dirname( __DIR__ ) . '/wp-load.php';
if ( empty( $_REQUEST['action'] ) ) {
    wp_die( '0', 400 );
}
$action = $_REQUEST['action'];`,
      notes: [
        { line: 1, text: 'Marks the request as AJAX.' },
        { line: 2, text: 'Boots WordPress, including plugins and the current user.' },
        { line: 4, text: 'No action: answer “0” with HTTP 400.' },
      ],
    },
    mistake: {
      title: 'Thinking admin-ajax.php is admin-only',
      consequence: 'Despite the /wp-admin/ path, front-end pages use it too, and it runs for logged-out visitors (through wp_ajax_nopriv_ hooks).',
      fix: 'Treat it as the general AJAX entry point, and protect private actions with capability checks — not with the URL.',
    },
    check: {
      kind: 'choice',
      question: 'What is admin-ajax.php?',
      options: [
        { text: 'The JavaScript library WordPress uses for AJAX.', feedback: 'It is a PHP file on the server.' },
        { text: 'A WordPress PHP file that receives AJAX requests and fires the matching hook.' },
        { text: 'Another name for AJAX in WordPress.', feedback: 'AJAX is the browser technique; admin-ajax.php only receives the request.' },
      ],
      answer: 1,
      explanation: 'admin-ajax.php is WordPress’s server-side entry point for AJAX requests. It dispatches them to hooks.',
    },
    challenge: {
      kind: 'text',
      question: 'What URL path do WordPress admin-ajax requests go to?',
      accept: ['/wp-admin/admin-ajax.php', 'wp-admin/admin-ajax.php'],
      placeholder: '/…',
      hint: 'Check the URL in the Network Inspector.',
      explanation: 'The path is /wp-admin/admin-ajax.php. In code, get it with admin_url( \'admin-ajax.php\' ) rather than hardcoding it.',
    },
  },
  {
    id: 'ajax-hooks',
    level: 3,
    title: 'Registering wp_ajax_ and wp_ajax_nopriv_ hooks',
    objective: 'Register a callback so both logged-in and logged-out visitors (or only one of them) can reach it.',
    analogy:
      'Two doors to the same room: a staff entrance (wp_ajax_) and a public entrance (wp_ajax_nopriv_). Unlocking the staff door does nothing for members of the public.',
    explanation: [
      'admin-ajax.php builds the hook name by appending the action value to a prefix: wp_ajax_ for logged-in users, wp_ajax_nopriv_ for logged-out visitors.',
      'You connect your function with add_action( hook, function ). The function name does not have to match the action — the hook name does.',
      'A handler registered only on wp_ajax_ never runs for logged-out visitors; they get “0” with HTTP 400. Public actions need both registrations. Private ones should have only wp_ajax_.',
    ],
    visual: { scenarioId: 'wp-student-details', preset: 'nopriv-missing', stage: 4, caption: 'A logged-out visitor, but only wp_ajax_ is registered.' },
    experiment: {
      steps: ['In the WordPress Lab, start the guided exercise.', 'Send the request, register the missing hook, and send it again.'],
      link: { scenarioId: 'wp-student-details', route: '/wordpress' },
      linkLabel: 'Open the WordPress Lab',
    },
    code: {
      title: 'Registering one callback for both kinds of visitor',
      language: 'php',
      code: `add_action( 'wp_ajax_get_student_details', 'ajax_lab_get_student_details' );
add_action( 'wp_ajax_nopriv_get_student_details', 'ajax_lab_get_student_details' );

function ajax_lab_get_student_details() {
    // …
}`,
      notes: [
        { line: 1, text: 'Logged-in users: wp_ajax_ + action.' },
        { line: 2, text: 'Logged-out visitors: wp_ajax_nopriv_ + action.' },
        { line: 4, text: 'The function name is independent of the action.' },
      ],
    },
    mistake: {
      title: 'Testing only while logged in',
      consequence: 'Developers are usually logged in, so the feature works for them — and silently returns “0” for every visitor.',
      fix: 'Test in a private window (logged out). Register wp_ajax_nopriv_ for public features.',
    },
    check: {
      kind: 'choice',
      question: 'A logged-out visitor sends action=save_note. Which hook does WordPress fire?',
      options: [{ text: 'wp_ajax_save_note' }, { text: 'wp_ajax_nopriv_save_note' }, { text: 'save_note' }],
      answer: 1,
      explanation: 'Logged-out visitors use the wp_ajax_nopriv_ prefix. The hook name is always prefix + action.',
    },
    challenge: {
      kind: 'text',
      question: 'Type the hook a logged-in user triggers with action=load_cart.',
      accept: ['wp_ajax_load_cart'],
      placeholder: 'hook name',
      hint: 'Prefix for logged-in users + the action.',
      explanation: 'wp_ajax_ + load_cart = wp_ajax_load_cart.',
    },
  },
  {
    id: 'localize-script',
    level: 3,
    title: 'Passing data to JavaScript with wp_localize_script()',
    objective: 'Give your script the AJAX URL and a nonce from PHP.',
    analogy: 'Before a guest arrives, the hotel slips a card under the door with the front desk’s number and a room key. The script finds both waiting when it runs.',
    explanation: [
      'Your JavaScript needs two values it cannot know by itself: the AJAX URL and a nonce. PHP knows both.',
      'wp_enqueue_script() adds your script to the page. wp_localize_script() prints a small JavaScript object (for example ajaxLab) before it, holding the values you pass.',
      'admin_url( \'admin-ajax.php\' ) gives the correct URL even when WordPress is installed in a subfolder. wp_create_nonce() creates a nonce for the current user. (wp_add_inline_script() is a newer alternative for passing data.)',
    ],
    visual: { scenarioId: 'wp-student-details', stage: 1, route: '/code', caption: 'In the plugin file, the wp_localize_script() block is highlighted as the request is sent.' },
    experiment: {
      steps: ['In the Code Studio, go to stage 2.', 'Find where ajaxLab.ajaxUrl and ajaxLab.nonce come from in the plugin, and where they are used in the JavaScript.'],
      link: { scenarioId: 'wp-student-details', stage: 1, route: '/code' },
      linkLabel: 'Open the Code Studio',
    },
    code: {
      title: 'Enqueue and localize',
      language: 'php',
      code: `wp_enqueue_script( 'ajax-lab', plugin_dir_url( __FILE__ ) . 'ajax-lab.js', array( 'jquery' ), '1.0.0', true );
wp_localize_script( 'ajax-lab', 'ajaxLab', array(
    'ajaxUrl' => admin_url( 'admin-ajax.php' ),
    'nonce'   => wp_create_nonce( 'ajax_lab_nonce' ),
) );`,
      notes: [
        { line: 1, text: 'Registers and prints the script, which depends on jQuery.' },
        { line: 2, text: 'Creates a global JavaScript object named ajaxLab.' },
        { line: 3, text: 'The right URL for this site.' },
        { line: 4, text: 'A nonce for the action name ajax_lab_nonce and the current user.' },
      ],
    },
    mistake: {
      title: 'Hardcoding the AJAX URL',
      code: { language: 'javascript', code: `$.post('/wp-admin/admin-ajax.php', { … });` },
      consequence: 'Breaks when WordPress lives in a subdirectory (example.com/blog/) or on a multisite subsite.',
      fix: 'Pass admin_url( \'admin-ajax.php\' ) from PHP and use that value in JavaScript.',
    },
    check: {
      kind: 'choice',
      question: 'Why pass ajaxUrl from PHP instead of writing \'/wp-admin/admin-ajax.php\' in the script?',
      options: [
        { text: 'It is faster.', feedback: 'Speed is not the reason.' },
        { text: 'WordPress may not be installed at the site root; admin_url() always gives the right address.' },
        { text: 'It hides the URL from attackers.', feedback: 'The URL is public either way. Hiding a URL is not a security measure.' },
      ],
      answer: 1,
      explanation: 'admin_url() accounts for subdirectory installs and multisite paths, so the script always calls the right endpoint.',
    },
    challenge: {
      kind: 'text',
      question: 'Which PHP function creates the nonce passed to the script?',
      accept: ['wp_create_nonce', 'wp_create_nonce()'],
      placeholder: 'function name',
      hint: 'Line 4.',
      explanation: 'wp_create_nonce( $action ) creates a nonce; check_ajax_referer( $action, … ) verifies it on the server.',
    },
  },
  {
    id: 'callbacks-json',
    level: 3,
    title: 'PHP callbacks, request parsing, and wp_send_json()',
    objective: 'Write a callback that reads input and responds with the right JSON and status.',
    analogy:
      'The callback is the department the front desk sends you to. It reads your form, and always answers on the same kind of reply slip: success or failure, plus details.',
    explanation: [
      'Your callback reads the posted fields from $_POST (or $_REQUEST), validates them, and does its work.',
      'wp_send_json_success( $data ) sends {"success":true,"data":…}; wp_send_json_error( $data ) sends {"success":false,"data":…}. Both end the request. Since WordPress 4.7 you can pass a status code as the second argument.',
      'Three different “success” signals exist: the transport (did a response arrive?), the HTTP status (200 or 400?), and the envelope (success: true or false). With jQuery, a 400 goes to error(); a 200 carrying success:false goes to success(), where your code must check response.success.',
    ],
    visual: { scenarioId: 'wp-student-details', preset: 'invalid-id', stage: 7, caption: 'wp_send_json_error( …, 400 ): jQuery runs error(), not success().' },
    experiment: {
      steps: ['In the WordPress Lab, set student_id to “abc” and send it.', 'Compare the response status and body, and which jQuery callback is highlighted in the Code Studio.'],
      link: { scenarioId: 'wp-student-details', preset: 'invalid-id', route: '/wordpress' },
      linkLabel: 'Send an invalid ID',
    },
    code: {
      title: 'A callback with validation',
      language: 'php',
      code: `function ajax_lab_get_student_details() {
    check_ajax_referer( 'ajax_lab_nonce', 'nonce' );
    $student_id = absint( $_POST['student_id'] ?? 0 );
    if ( ! $student_id ) {
        wp_send_json_error( array( 'message' => 'Invalid student ID.' ), 400 );
    }
    wp_send_json_success( array( 'id' => $student_id, 'name' => 'Aarav Das' ) );
}`,
      notes: [
        { line: 2, text: 'Stops with -1 / 403 if the nonce is not valid.' },
        { line: 3, text: 'absint(): “42” → 42, “abc” → 0.' },
        { line: 5, text: 'success:false with HTTP 400, then the request ends.' },
        { line: 7, text: 'success:true with HTTP 200.' },
      ],
    },
    mistake: {
      title: 'Forgetting that the request must end',
      code: { language: 'php', code: `echo json_encode( $data ); // no wp_die() or exit` },
      consequence: 'admin-ajax.php continues and finishes with wp_die( \'0\' ), so the body becomes your JSON followed by “0” — invalid JSON.',
      fix: 'Use wp_send_json_success() / wp_send_json_error(), which end the request for you.',
    },
    check: {
      kind: 'choice',
      question: 'The callback calls wp_send_json_error( $data, 400 ). Which jQuery callback runs?',
      options: [
        { text: 'success(), with response.success === false', feedback: 'That happens only when no error status is passed (HTTP 200).' },
        { text: 'error()' },
        { text: 'Neither', feedback: 'One of them always runs when a response arrives.' },
      ],
      answer: 1,
      explanation: 'jQuery calls error() for any 4xx or 5xx status. The HTTP status and the JSON success flag are separate signals.',
    },
    challenge: {
      kind: 'text',
      question: 'Which JSON key in a wp_send_json_* response says whether the operation succeeded?',
      accept: ['success'],
      placeholder: 'key',
      hint: 'It is true or false.',
      explanation: 'Every wp_send_json_success/error response has a boolean "success" key, plus "data".',
    },
  },
  {
    id: 'nonces-capabilities',
    level: 3,
    title: 'Nonce validation, capabilities, and permissions',
    objective: 'Explain what a nonce protects against, and why a capability check is still needed.',
    analogy:
      'A nonce is like a ticket stub proving you came in through the theatre’s own lobby. It does not prove you bought a backstage pass — that is what the capability check is for.',
    explanation: [
      'A WordPress nonce is a short token, tied to an action, the current user, and a time window. check_ajax_referer() verifies it. It helps stop cross-site request forgery (CSRF): another website tricking a logged-in user’s browser into sending a request.',
      'A nonce is not a password, not encryption, and not proof of permission. Anyone who can load your page can get a valid nonce for themselves.',
      'Permission is checked with current_user_can( capability ). Private data needs both: a nonce check, and a capability (or ownership) check.',
    ],
    visual: {
      scenarioId: 'wp-security-lab',
      preset: 'nonce-not-authorization',
      stage: 5,
      route: '/wordpress',
      caption: 'A subscriber with a valid nonce is still refused: the capability check says no.',
    },
    experiment: {
      steps: ['Open the Security lab and run “Nonce is not authorization”.', 'Then run “Remove the capability check” and compare what reaches the browser.'],
      link: { scenarioId: 'wp-security-lab', route: '/wordpress' },
      linkLabel: 'Open the Security lab',
    },
    code: {
      title: 'Both checks, in order',
      language: 'php',
      code: `check_ajax_referer( 'ajax_lab_nonce', 'nonce' );
if ( ! current_user_can( 'view_student_records' ) ) {
    wp_send_json_error( array( 'message' => 'Not allowed.' ), 403 );
}`,
      notes: [
        { line: 1, text: 'Did this request come from our own page? (CSRF protection)' },
        { line: 2, text: 'Is this user allowed to do this? (authorization)' },
      ],
    },
    mistake: {
      title: 'Treating a valid nonce as permission',
      consequence: 'Any logged-in user — even a subscriber — can load the page, get a valid nonce, and read private data.',
      fix: 'After the nonce check, always check current_user_can() (or that the user owns the record).',
    },
    check: {
      kind: 'choice',
      question: 'A request has a valid nonce. What does that show?',
      options: [
        { text: 'The user is allowed to perform the action.', feedback: 'That is what current_user_can() checks.' },
        { text: 'The request came from a page this site generated for this user.' },
        { text: 'The request is encrypted.', feedback: 'Nonces are not encryption. HTTPS encrypts the connection.' },
      ],
      answer: 1,
      explanation: 'A nonce helps confirm the request originated from your own page (against CSRF). It says nothing about the user’s permissions.',
    },
    challenge: {
      kind: 'text',
      question: 'Which WordPress function checks whether the current user has a capability?',
      accept: ['current_user_can', 'current_user_can()'],
      placeholder: 'function name',
      hint: 'Line 2.',
      explanation: 'current_user_can( $capability ) returns true only if the logged-in user’s role grants that capability.',
    },
  },

  // ─── Level 4 ─────────────────────────────────────────────────────────────
  {
    id: 'debugging',
    level: 4,
    title: 'Debugging failed requests in the Network Inspector',
    objective: 'Find the cause of a failed request from its status, body, and console.',
    analogy: 'A doctor checks symptoms in order — temperature, pulse, blood test — rather than guessing. Debugging a request works the same way.',
    explanation: [
      'Start with one question: did a response arrive at all? If not, it is a network problem, a timeout, or a browser block (such as CORS). There is no status to read.',
      'If a response arrived, read the status code, then the raw body. In WordPress, “0” with 400 usually means no hook matched; “-1” with 403 means the nonce check failed.',
      'If the status is fine but the page still breaks, check parsing (is the body valid JSON?) and the envelope (success: false?).',
    ],
    visual: { scenarioId: 'failure-recovery', preset: 'server-error', stage: 5, route: '/network', caption: 'A 500 response: the status and the body tell you what went wrong.' },
    experiment: {
      steps: ['Try each server condition in the failure scenario.', 'For each, note: did a response arrive? What status? What body?'],
      link: { scenarioId: 'failure-recovery', preset: 'server-error' },
      linkLabel: 'Open the failure scenario',
    },
    code: {
      title: 'Logging what you need to debug',
      language: 'javascript',
      code: `const response = await fetch(url);
console.log(response.status, response.headers.get('Content-Type'));
const text = await response.text();
console.log(text);`,
      notes: [
        { line: 2, text: 'The status and the declared content type.' },
        { line: 3, text: 'Read the body as text first — it may not be JSON at all.' },
      ],
    },
    mistake: {
      title: '“Unexpected token <” and guessing',
      consequence: 'That parsing error means the body started with “<” — an HTML error page, not JSON. Guessing at the JavaScript wastes time.',
      fix: 'Look at the raw response body in the Network panel. It usually says exactly what went wrong on the server.',
    },
    check: {
      kind: 'choice',
      question: 'A WordPress AJAX request returns body “0” with HTTP 400. What is the most likely cause?',
      options: [
        { text: 'The nonce is invalid.', feedback: 'A failed nonce check returns “-1” with 403.' },
        { text: 'No callback is registered for this action and login state.' },
        { text: 'The JSON is malformed.', feedback: '“0” is WordPress’s own answer, not broken JSON from your code.' },
      ],
      answer: 1,
      explanation: 'admin-ajax.php answers “0” with 400 when the action is missing or nothing is registered on the hook it fired.',
    },
    challenge: {
      kind: 'text',
      question: 'An admin-ajax response has body “-1” and status 403. Which WordPress function most likely produced it?',
      accept: ['check_ajax_referer', 'check_ajax_referer()'],
      placeholder: 'function name',
      hint: 'It verifies nonces.',
      explanation: 'check_ajax_referer() stops the request with wp_die( -1, 403 ) when the nonce is missing or invalid.',
    },
  },
  {
    id: 'validate-escape',
    level: 4,
    title: 'Input validation, sanitization, and output escaping',
    objective: 'Apply the right protection at the right point: validate input, prepare queries, escape output.',
    analogy: 'Check a delivery before accepting it (validation), handle it with the right tools (prepared queries), and label it correctly when you pass it on (escaping).',
    explanation: [
      'Validate input against what you expect: absint() for IDs, sanitize_text_field() for plain text, allowed lists for options.',
      'Never build SQL by pasting input into it. $wpdb->prepare() with placeholders (%d, %s) keeps input as data, so it cannot change the query.',
      'Escape when outputting, for the place it is going: esc_html() for HTML text, esc_attr() for attributes, esc_url() for links — and in JavaScript, textContent or .text() instead of innerHTML or .html().',
    ],
    visual: { scenarioId: 'wp-security-lab', preset: 'xss-html', stage: 7, route: '/wordpress', caption: 'A stored name containing HTML, written with .html().' },
    experiment: {
      steps: ['Run “SQL injection, validation removed”, then “Same input, validation on”.', 'Run “Stored HTML with .html()”, then “…with .text()”.'],
      link: { scenarioId: 'wp-security-lab', route: '/wordpress' },
      linkLabel: 'Open the Security lab',
    },
    code: {
      title: 'Validate, prepare, escape',
      language: 'php',
      code: `$student_id = absint( $_POST['student_id'] ?? 0 );
$row = $wpdb->get_row( $wpdb->prepare(
    "SELECT name FROM {$wpdb->prefix}students WHERE id = %d",
    $student_id
) );
echo esc_html( $row->name );`,
      notes: [
        { line: 1, text: 'Validation: always a non-negative integer.' },
        { line: 3, text: '%d is filled in safely by prepare().' },
        { line: 6, text: 'Escaping for HTML output (when rendering in PHP).' },
      ],
    },
    mistake: {
      title: 'Sanitizing once and calling it done',
      consequence: 'Input that is safe for a database can still be dangerous in HTML, and vice versa. One function cannot protect every context.',
      fix: 'Validate on input, use prepared queries for SQL, and escape at output for the specific context.',
    },
    check: {
      kind: 'choice',
      question: 'When should output escaping happen?',
      options: [
        { text: 'Once, when the data is first saved.', feedback: 'The right escaping depends on where the data ends up.' },
        { text: 'At the moment the data is output, for that context (HTML, attribute, URL).' },
        { text: 'Only for data from administrators.', feedback: 'Any stored value can contain unexpected content.' },
      ],
      answer: 1,
      explanation: 'Escape late: at the point of output, using the function that matches the context.',
    },
    challenge: {
      kind: 'text',
      question: 'Which WordPress function escapes text for output inside HTML?',
      accept: ['esc_html', 'esc_html()'],
      placeholder: 'function name',
      hint: 'esc_ + where it is going.',
      explanation: 'esc_html() converts characters like < and > into entities, so text is displayed rather than parsed as markup.',
    },
  },
  {
    id: 'races-debounce',
    level: 4,
    title: 'Request cancellation, debouncing, and race conditions',
    objective: 'Prevent slow, outdated responses from overwriting newer ones.',
    analogy:
      'You text a friend “pizza?”, then “actually, sushi?”. If “pizza?” is answered last, you might book the wrong restaurant. You need to ignore replies to questions you have already replaced.',
    explanation: [
      'Responses do not always arrive in the order requests were sent. In a live search, the answer for “ca” can arrive after the answer for “cat” and overwrite it — a race condition.',
      'Debouncing reduces the number of requests. Cancelling the previous request with an AbortController ensures only the latest one can update the page.',
      'An aborted fetch() rejects with an AbortError. That is expected, so ignore it rather than showing an error.',
    ],
    visual: { scenarioId: 'failure-recovery', preset: 'timeout', stage: 5, caption: 'AbortController in action: the code gives up on a request that takes too long.' },
    experiment: {
      steps: ['Run the timeout condition and read the AbortController lines in the Code tab.', 'Retry: the same pattern cancels a request when a newer one replaces it.'],
      link: { scenarioId: 'failure-recovery', preset: 'timeout' },
      linkLabel: 'See AbortController',
    },
    code: {
      title: 'Only the latest search wins',
      language: 'javascript',
      code: `let controller;
async function search(term) {
  controller?.abort();
  controller = new AbortController();
  try {
    const response = await fetch('/api/search?q=' + encodeURIComponent(term), { signal: controller.signal });
    render(await response.json());
  } catch (error) {
    if (error.name !== 'AbortError') showError();
  }
}`,
      notes: [
        { line: 3, text: 'Cancel the previous search, if any.' },
        { line: 6, text: 'encodeURIComponent keeps the term from breaking the URL.' },
        { line: 9, text: 'An abort is expected, not an error.' },
      ],
    },
    mistake: {
      title: 'Rendering every response',
      consequence: 'The results shown may belong to an earlier, shorter search term.',
      fix: 'Abort the previous request, or ignore responses that are not for the latest request.',
    },
    check: {
      kind: 'choice',
      question: 'Searches for “ca” then “cat” are sent; “ca” answers last. Without cancellation, what does the user see?',
      options: [{ text: 'Results for “cat”.' }, { text: 'Results for “ca”, even though they typed “cat”.' }, { text: 'An error.' }],
      answer: 1,
      explanation: 'The last response to arrive wins, and here it is the outdated one. Cancel or ignore stale requests.',
    },
    challenge: {
      kind: 'order',
      question: 'Order the steps of a debounced, cancellable search.',
      items: [
        'The user types a character',
        'The pending timer is cleared and restarted',
        'Typing pauses long enough for the timer to fire',
        'The previous request is aborted',
        'A new request is sent with a fresh AbortController',
        'Only this response updates the results',
      ],
      explanation: 'Debounce first to avoid extra requests, then cancel anything outdated so only the latest response renders.',
    },
  },
  {
    id: 'performance',
    level: 4,
    title: 'Performance, caching, and duplicate request prevention',
    objective: 'Avoid sending requests you do not need.',
    analogy: 'If you already asked the librarian for a book, you do not ask again while they are fetching it — and you keep the book on your desk if you will need it again.',
    explanation: [
      'Double clicks and repeated submits send duplicate requests. Disable the button (or ignore clicks) while a request is in flight.',
      'If the same data is needed repeatedly, keep it in memory instead of asking again. The server can also control browser caching with the Cache-Control header.',
      'Ask for only what you need: fewer fields, smaller pages of results.',
    ],
    visual: { scenarioId: 'load-profile', stage: 2, caption: 'While the request is in flight, the Load Profile button is disabled.' },
    experiment: {
      steps: ['Press Load Profile and try pressing it again while the request is running.', 'Notice the button is disabled until the request finishes.'],
      link: { scenarioId: 'load-profile' },
      linkLabel: 'Try it',
    },
    code: {
      title: 'Ignore clicks while busy, and remember results',
      language: 'javascript',
      code: `const cache = new Map();
let busy = false;
async function loadProfile(id) {
  if (busy) return;
  if (cache.has(id)) return render(cache.get(id));
  busy = true;
  try {
    const response = await fetch('/api/profile?id=' + id);
    cache.set(id, await response.json());
    render(cache.get(id));
  } finally {
    busy = false;
  }
}`,
      notes: [
        { line: 4, text: 'A second click during a request does nothing.' },
        { line: 5, text: 'Already loaded: no request at all.' },
        { line: 11, text: 'finally resets the flag even if the request fails.' },
      ],
    },
    mistake: {
      title: 'Caching errors or private data',
      consequence: 'Storing a failed response keeps showing the failure; caching personal data can leak it between users on shared devices.',
      fix: 'Cache only successful, non-sensitive responses, and send Cache-Control: no-store for private data.',
    },
    check: {
      kind: 'choice',
      question: 'What is the simplest way to stop a form being submitted twice?',
      options: [
        { text: 'Disable the submit button while the request is in flight.' },
        { text: 'Tell users not to double-click.', feedback: 'People double-click anyway.' },
        { text: 'Send each request twice to be safe.', feedback: 'That creates the duplicates you wanted to avoid.' },
      ],
      answer: 0,
      explanation: 'Disabling the control (and re-enabling it when the request finishes, success or failure) prevents duplicates.',
    },
    challenge: {
      kind: 'text',
      question: 'Which Cache-Control value tells the browser not to store a response at all?',
      accept: ['no-store', 'cache-control: no-store'],
      placeholder: 'value',
      hint: 'no-…',
      explanation: 'Cache-Control: no-store forbids storing the response. (no-cache still stores it but revalidates before reuse.)',
    },
  },
  {
    id: 'build-feature',
    level: 4,
    title: 'Building a complete AJAX-powered WordPress feature',
    objective: 'Assemble every piece — enqueue, localize, hooks, callback, JavaScript — into one working feature.',
    analogy: 'Building a feature is like wiring a doorbell: button, wire, bell, and power must all be connected, and the whole thing tested from outside the house.',
    explanation: [
      'PHP: enqueue your script and pass it the AJAX URL and a nonce. Register the callback on wp_ajax_ (and wp_ajax_nopriv_ if the feature is public).',
      'Callback: verify the nonce, check capabilities if the data is private, validate input, do the work with prepared queries, and answer with wp_send_json_success() or wp_send_json_error().',
      'JavaScript: send action, nonce, and data; handle both success and error; write results with .text() or textContent. Then test logged in and logged out.',
    ],
    visual: { scenarioId: 'wp-student-details', route: '/code', caption: 'Follow one request through the browser code and the server code, stage by stage.' },
    experiment: {
      steps: ['In the Code Studio, play the WordPress scenario.', 'For each stage, identify which file and which lines are responsible.'],
      link: { scenarioId: 'wp-student-details', route: '/code' },
      linkLabel: 'Open the Code Studio',
    },
    code: {
      title: 'The JavaScript half',
      language: 'javascript',
      code: `$.ajax({
  url: ajaxLab.ajaxUrl,
  type: 'POST',
  dataType: 'json',
  data: { action: 'load_notes', nonce: ajaxLab.nonce },
  success: (response) => $('#notes').text(response.data.text),
  error: () => $('#notes').text('Could not load notes.'),
});`,
      notes: [
        { line: 2, text: 'From wp_localize_script().' },
        { line: 5, text: 'action picks the hook; nonce is verified by check_ajax_referer().' },
        { line: 6, text: '.text() for anything from the server.' },
        { line: 7, text: 'Always handle failure.' },
      ],
    },
    mistake: {
      title: 'Registering the public hook for private data',
      consequence: 'Adding wp_ajax_nopriv_ “to make it work” exposes the callback to every visitor; without a capability check, private data leaks.',
      fix: 'Only register wp_ajax_nopriv_ for genuinely public actions, and keep capability checks in private ones.',
    },
    check: {
      kind: 'choice',
      question: 'Which piece connects the action value sent by JavaScript to your PHP function?',
      options: [
        { text: 'The function name matching the action.', feedback: 'Function names are independent of actions.' },
        { text: 'add_action( \'wp_ajax_\' . $action, $function )' },
        { text: 'wp_localize_script()', feedback: 'That passes data to JavaScript; it does not route requests.' },
      ],
      answer: 1,
      explanation: 'admin-ajax.php fires wp_ajax_{action} (or wp_ajax_nopriv_{action}); add_action() attaches your function to that hook.',
    },
    challenge: {
      kind: 'order',
      question: 'Put the steps of building a WordPress AJAX feature in order.',
      items: [
        'Enqueue the script',
        'Pass the AJAX URL and a nonce with wp_localize_script()',
        'Register the callback with add_action( \'wp_ajax_…\' )',
        'In the callback, verify the nonce and check permissions',
        'Validate input and send wp_send_json_success()',
        'In JavaScript, send action and nonce, then write the result with .text()',
      ],
      explanation: 'Setup, routing, protection, work, response, and display — each piece depends on the one before it.',
    },
  },
];

export function lessonsInLevel(level: Lesson['level']): Lesson[] {
  return LESSONS.filter((lesson) => lesson.level === level);
}

export function isLevelUnlocked(level: Lesson['level'], completed: Record<string, unknown>): boolean {
  if (level === 1) return true;
  const previous = lessonsInLevel((level - 1) as Lesson['level']);
  return previous.filter((lesson) => completed[lesson.id]).length >= UNLOCK_THRESHOLD;
}
