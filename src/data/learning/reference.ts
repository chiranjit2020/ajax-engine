import type { Snippet } from './types';

export interface ReferenceEntry {
  id: string;
  term: string;
  summary: string;
  details?: string;
  example?: Snippet;
}

export interface ReferenceGroup {
  id: 'network-concepts' | 'browser-apis' | 'status-codes' | 'wordpress' | 'errors';
  title: string;
  entries: ReferenceEntry[];
}

export const REFERENCE: ReferenceGroup[] = [
  {
    id: 'network-concepts',
    title: 'Network concepts',
    entries: [
      {
        id: 'get-vs-post',
        term: 'GET versus POST',
        summary: 'GET retrieves data and carries parameters in the URL. POST sends data to be processed, in the request body.',
        details: 'GET requests should not change anything on the server, so browsers and caches may repeat them. Use POST for actions that create or change data.',
      },
      {
        id: 'query-vs-body',
        term: 'Query parameters versus request body',
        summary: 'Query parameters follow “?” in the URL (?id=7). The body is separate content sent after the headers, used by POST and PUT.',
        details: 'URLs appear in logs and browser history, so never put secrets in a query string.',
      },
      {
        id: 'content-types',
        term: 'application/json, x-www-form-urlencoded, multipart/form-data',
        summary: 'The Content-Type header says how a body is encoded: JSON text, name=value&… pairs, or multiple parts (needed for file uploads).',
        details: 'fetch() sets the header automatically for URLSearchParams and FormData bodies. For JSON you set it yourself. PHP fills $_POST only for the two form encodings, not for JSON.',
      },
      {
        id: 'status-families',
        term: 'HTTP status codes',
        summary: '2xx success, 3xx redirection, 4xx the request was wrong or not allowed, 5xx the server failed.',
        details: 'See the Status codes group for 200, 201, 400, 401, 403, 404, 422, and 500.',
      },
      {
        id: 'http-vs-app-success',
        term: 'HTTP success versus application success',
        summary: 'The status code describes the HTTP exchange; the body can still report a failure. A 200 response can carry {"success": false}.',
        details: 'WordPress’s wp_send_json_error() uses HTTP 200 unless you pass a status code. Check both the status and the envelope.',
      },
      {
        id: 'json-parsing',
        term: 'JSON parsing and malformed JSON',
        summary: 'A response body is text until parsed. response.json() and JSON.parse() throw a SyntaxError for invalid JSON, whatever the status.',
        details: '“Unexpected token ‘<’” means the body began with “<” — usually an HTML error page instead of JSON.',
      },
      {
        id: 'cors',
        term: 'Same-origin policy and CORS',
        summary: 'By default, page JavaScript can only read responses from its own origin (scheme + host + port). Other origins must opt in with CORS headers such as Access-Control-Allow-Origin.',
        details: 'A CORS block looks like a network error in JavaScript: fetch() rejects and no status is readable. The browser console explains the real reason. admin-ajax.php requests from the same site are same-origin.',
      },
      {
        id: 'cookies',
        term: 'Cookies and authenticated requests',
        summary: 'The browser attaches the site’s cookies to same-origin requests automatically. That is how WordPress knows who is logged in during an AJAX request.',
        details: 'fetch() sends cookies to the same origin by default (credentials: "same-origin"). Login cookies are usually HttpOnly, so JavaScript cannot read them at all.',
      },
      {
        id: 'network-vs-server-error',
        term: 'Network failure versus server error response',
        summary: 'A network failure means no response arrived: there is no status code. A server error is a real response with a 5xx status and usually a body.',
        details: 'fetch() rejects only for the first. jQuery calls error() for both; check jqXHR.status (0 means no response).',
      },
    ],
  },
  {
    id: 'browser-apis',
    title: 'AJAX in the browser',
    entries: [
      {
        id: 'fetch',
        term: 'fetch()',
        summary: 'Modern built-in API. Returns a Promise for a Response. Rejects only when no response arrives.',
        example: {
          language: 'javascript',
          code: `const response = await fetch('/api/items', { method: 'POST', body: new URLSearchParams({ name: 'x' }) });\nif (!response.ok) throw new Error('HTTP ' + response.status);\nconst data = await response.json();`,
        },
      },
      {
        id: 'xhr',
        term: 'XMLHttpRequest',
        summary: 'The original API: open(), send(), and events such as load and error. readyState 4 means done.',
        example: {
          language: 'javascript',
          code: `const xhr = new XMLHttpRequest();\nxhr.open('GET', '/api/items');\nxhr.onload = () => { if (xhr.status === 200) use(JSON.parse(xhr.responseText)); };\nxhr.send();`,
        },
      },
      {
        id: 'jquery-ajax',
        term: 'jQuery.ajax()',
        summary: 'Library wrapper around XMLHttpRequest, common in WordPress. Calls success() for 2xx and error() for 4xx/5xx, network failures, or unparseable data.',
        example: {
          language: 'javascript',
          code: `$.ajax({ url, type: 'POST', dataType: 'json', data: { action: 'x' },\n  success: (response) => {}, error: (jqXHR) => {} });`,
        },
      },
      {
        id: 'abort',
        term: 'AbortController',
        summary: 'Cancels a fetch(). Used for timeouts and to drop outdated requests. The aborted fetch() rejects with an AbortError.',
      },
      {
        id: 'text-vs-html',
        term: 'textContent / .text() versus innerHTML / .html()',
        summary: 'textContent and .text() insert plain text. innerHTML and .html() parse HTML — unsafe for data you did not write.',
      },
    ],
  },
  {
    id: 'status-codes',
    title: 'Status codes',
    entries: [
      { id: '200', term: '200 OK', summary: 'The request succeeded. The body has the result.' },
      { id: '201', term: '201 Created', summary: 'A new resource was created, often with a Location header pointing to it.' },
      { id: '400', term: '400 Bad Request', summary: 'The request was malformed or missing something. admin-ajax.php uses it for a missing action or unmatched hook (body “0”).' },
      { id: '401', term: '401 Unauthorized', summary: 'Authentication is required or failed: the server does not know who you are.' },
      { id: '403', term: '403 Forbidden', summary: 'The server knows the request but refuses it. check_ajax_referer() uses it for a bad nonce (body “-1”); callbacks use it when a capability check fails.' },
      { id: '404', term: '404 Not Found', summary: 'Nothing exists at that address, or the requested record does not exist.' },
      { id: '422', term: '422 Unprocessable Content', summary: 'The request was understood but the data failed validation. Usually comes with field-level messages.' },
      { id: '500', term: '500 Internal Server Error', summary: 'The server’s code failed. Check the server’s error log; often temporary if caused by an outage.' },
    ],
  },
  {
    id: 'wordpress',
    title: 'WordPress hooks and functions',
    entries: [
      { id: 'wp-ajax', term: 'wp_ajax_{action}', summary: 'Hook fired by admin-ajax.php for logged-in users. Register with add_action( \'wp_ajax_my_action\', \'my_callback\' ).' },
      { id: 'wp-ajax-nopriv', term: 'wp_ajax_nopriv_{action}', summary: 'Hook fired for logged-out visitors. Needed for public features; never use it for private data.' },
      { id: 'admin-url', term: "admin_url( 'admin-ajax.php' )", summary: 'The correct AJAX URL for this site, including subdirectory installs.' },
      { id: 'localize', term: 'wp_localize_script()', summary: 'Prints a JavaScript object before an enqueued script — commonly used to pass ajaxUrl and a nonce. wp_add_inline_script() is an alternative.' },
      { id: 'create-nonce', term: 'wp_create_nonce( $action )', summary: 'Creates a nonce for the current user and action, valid for a limited time window.' },
      { id: 'check-referer', term: "check_ajax_referer( $action, 'nonce' )", summary: 'Verifies the nonce in the request. On failure, stops with “-1” and HTTP 403. Helps prevent CSRF; is not an authorization check.' },
      { id: 'current-user-can', term: 'current_user_can( $capability )', summary: 'Checks whether the logged-in user’s role grants a capability. The authorization check for private data and actions.' },
      { id: 'absint', term: 'absint() / sanitize_text_field()', summary: 'absint() returns a non-negative integer (“abc” → 0). sanitize_text_field() cleans a plain text string.' },
      { id: 'prepare', term: '$wpdb->prepare()', summary: 'Builds SQL with placeholders (%d, %s, %f) so input is always treated as data. Use for every query containing input.' },
      { id: 'send-json', term: 'wp_send_json_success() / wp_send_json_error()', summary: 'Send {"success": true|false, "data": …} and end the request. Optional status code as the second argument (WordPress 4.7+).' },
      { id: 'esc', term: 'esc_html() / esc_attr() / esc_url()', summary: 'Escape output for HTML text, attributes, and URLs respectively, at the moment of output.' },
    ],
  },
  {
    id: 'errors',
    title: 'Common errors and debugging tips',
    entries: [
      { id: 'err-zero', term: 'Response body “0” (HTTP 400)', summary: 'admin-ajax.php found no action, or nothing registered on the hook it fired. Check the action spelling and the wp_ajax_ / wp_ajax_nopriv_ registration for the visitor’s login state.' },
      { id: 'err-minus-one', term: 'Response body “-1” (HTTP 403)', summary: 'check_ajax_referer() failed: the nonce is missing, for another action, for another user, or expired.' },
      { id: 'err-zero-suffix', term: 'Valid JSON followed by “0”', summary: 'The callback echoed output but did not end the request, so admin-ajax.php appended wp_die( \'0\' ). Use wp_send_json_*() or call wp_die().' },
      { id: 'err-token', term: 'SyntaxError: Unexpected token ‘<’', summary: 'The body is HTML (often a PHP error or login page), not JSON. Read the raw response body.' },
      { id: 'err-fetch-404', term: 'catch() never runs for a 404', summary: 'fetch() resolves for HTTP errors. Check response.ok.' },
      { id: 'err-cors', term: '“Blocked by CORS policy”', summary: 'The response came from another origin without permission headers. The server must send Access-Control-Allow-Origin, or call it from the same origin.' },
      { id: 'err-nothing', term: 'Nothing happens on click', summary: 'The page may have reloaded (missing preventDefault()), or the script did not load. Check the Console and the Network panel for the request.' },
      { id: 'tip-order', term: 'Debugging order', summary: 'Did a request go out? Did a response arrive? What status? What raw body? Did it parse? What does the envelope say?' },
    ],
  },
];

export const NETWORK_CONCEPTS = REFERENCE.find((group) => group.id === 'network-concepts')!.entries;
