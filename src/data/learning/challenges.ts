import type { Task, VisualLink } from './types';

export interface ChallengeCategory {
  id: 'predict' | 'trace' | 'fix-hook' | 'debug' | 'secure' | 'build';
  letter: string;
  title: string;
  description: string;
}

export interface Challenge {
  id: string;
  category: ChallengeCategory['id'];
  title: string;
  task: Task;
  /** Optional scenario to explore the situation in the simulator. */
  explore?: VisualLink & { label: string };
}

export const CATEGORIES: ChallengeCategory[] = [
  { id: 'predict', letter: 'A', title: 'Predict the request', description: 'Read the code and say what it will send.' },
  { id: 'trace', letter: 'B', title: 'Trace the lifecycle', description: 'Put the stages of a request in order.' },
  { id: 'fix-hook', letter: 'C', title: 'Fix the WordPress hook', description: 'Find why a callback never runs.' },
  { id: 'debug', letter: 'D', title: 'Debug the response', description: 'Use the request, response, and console to find the cause.' },
  { id: 'secure', letter: 'E', title: 'Secure the endpoint', description: 'Choose the corrections an unsafe handler needs.' },
  { id: 'build', letter: 'F', title: 'Build the feature', description: 'Complete a working AJAX feature piece by piece.' },
];

export const CHALLENGES: Challenge[] = [
  {
    id: 'predict-fetch-get',
    category: 'predict',
    title: 'A plain fetch() call',
    task: {
      kind: 'fill',
      question: 'What will this code send?',
      code: { language: 'javascript', code: `fetch('/api/notes?tag=work&limit=5')\n  .then((response) => response.json());` },
      parts: [
        { label: 'HTTP method', options: ['GET', 'POST', 'PUT'], answer: 0, feedback: 'fetch() uses GET unless you pass a method.' },
        { label: 'Where tag=work travels', options: ['In the query string', 'In the request body', 'In a cookie'], answer: 0, feedback: 'Everything after “?” is the query string.' },
        { label: 'Request body', options: ['None', 'tag=work&limit=5', '{"tag":"work"}'], answer: 0, feedback: 'GET requests have no body.' },
      ],
      explanation: 'With no options, fetch() sends GET with the data in the URL and no body.',
    },
  },
  {
    id: 'predict-fetch-post',
    category: 'predict',
    title: 'A fetch() POST with form data',
    task: {
      kind: 'fill',
      question: 'What will this code send?',
      code: {
        language: 'javascript',
        code: `fetch('/api/comments', {\n  method: 'POST',\n  body: new URLSearchParams({ text: 'Nice!', post: '12' }),\n});`,
      },
      parts: [
        { label: 'HTTP method', options: ['GET', 'POST'], answer: 1, feedback: 'The method option says POST.' },
        { label: 'Content-Type', options: ['application/json', 'application/x-www-form-urlencoded', 'text/plain'], answer: 1, feedback: 'URLSearchParams bodies are URL-encoded form data; the browser sets the header.' },
        { label: 'Body', options: ['text=Nice%21&post=12', '{"text":"Nice!","post":"12"}', 'None'], answer: 0, feedback: 'URL encoding turns “!” into %21.' },
      ],
      explanation: 'A URLSearchParams body produces name=value pairs joined by &, with special characters percent-encoded.',
    },
  },
  {
    id: 'predict-wp-post',
    category: 'predict',
    title: 'A WordPress $.post()',
    task: {
      kind: 'fill',
      question: 'A logged-out visitor runs this. What happens?',
      code: { language: 'javascript', code: `$.post(ajaxLab.ajaxUrl, { action: 'save_note', note: 'Hi' });` },
      parts: [
        { label: 'HTTP method', options: ['GET', 'POST'], answer: 1, feedback: '$.post() sends POST.' },
        { label: 'URL path', options: ['/wp-admin/admin-ajax.php', '/save_note', '/wp-json/save_note'], answer: 0, feedback: 'ajaxLab.ajaxUrl is admin_url( \'admin-ajax.php\' ).' },
        {
          label: 'Hook WordPress fires',
          options: ['wp_ajax_save_note', 'wp_ajax_nopriv_save_note', 'save_note'],
          answer: 1,
          feedback: 'Logged-out visitors use the nopriv prefix.',
        },
      ],
      explanation: 'The request goes to admin-ajax.php, which fires wp_ajax_nopriv_save_note for a logged-out visitor.',
    },
  },
  {
    id: 'trace-standalone',
    category: 'trace',
    title: 'A standalone AJAX request',
    task: {
      kind: 'order',
      question: 'Put the eight stages of an AJAX request in order.',
      items: [
        'User action',
        'JavaScript handler',
        'HTTP request',
        'Server receives request',
        'Server-side processing',
        'HTTP response',
        'JavaScript handles response',
        'DOM update',
      ],
      explanation: 'Browser to server and back: the event, the request, the server’s work, the response, then the page update.',
    },
    explore: { scenarioId: 'load-profile', stage: 0, label: 'Step through it' },
  },
  {
    id: 'trace-wordpress',
    category: 'trace',
    title: 'A WordPress AJAX request',
    task: {
      kind: 'order',
      question: 'Put the stages of a WordPress AJAX request in order.',
      items: [
        'Button click',
        'jQuery sends action and nonce',
        'admin-ajax.php boots WordPress',
        'The hook name is built from the action',
        'is_user_logged_in() picks wp_ajax_ or wp_ajax_nopriv_',
        'The PHP callback runs',
        'wp_send_json_success() sends the response',
        'JavaScript updates the DOM',
      ],
      explanation: 'The request never goes straight to your plugin: WordPress boots, builds the hook name, and only then calls your function.',
    },
    explore: { scenarioId: 'wp-student-details', stage: 0, label: 'Step through it' },
  },
  {
    id: 'fix-nopriv',
    category: 'fix-hook',
    title: 'Works for admins, fails for visitors',
    task: {
      kind: 'choice',
      question: 'Logged-out visitors get “0” from this feature. Which change fixes it?',
      code: {
        language: 'php',
        code: `add_action( 'wp_ajax_save_note', 'my_save_note' );\n\nfunction my_save_note() {\n    // … saves a public guestbook note\n}`,
      },
      options: [
        { text: "add_action( 'wp_ajax_nopriv_save_note', 'my_save_note' );" },
        { text: 'Rename the function to wp_ajax_save_note().', feedback: 'Function names do not matter; the hook name does.' },
        { text: "Change the JavaScript action to 'my_save_note'.", feedback: 'Then no hook would match for anyone.' },
        { text: "add_action( 'save_note', 'my_save_note' );", feedback: 'admin-ajax.php never fires a hook without the wp_ajax_ or wp_ajax_nopriv_ prefix.' },
      ],
      answer: 0,
      explanation: 'Logged-out visitors fire wp_ajax_nopriv_save_note, which has no callback. Registering it fixes the public feature.',
    },
    explore: { scenarioId: 'wp-student-details', preset: 'nopriv-missing', route: '/wordpress', label: 'Try it in the WordPress Lab' },
  },
  {
    id: 'fix-typo',
    category: 'fix-hook',
    title: 'A one-letter mistake',
    task: {
      kind: 'text',
      question: 'The JavaScript sends action: \'get_student_details\'. Nobody — logged in or not — gets a response other than “0”. What hook name should the first add_action() use?',
      code: {
        language: 'php',
        code: `add_action( 'wp_ajax_get_student_detail', 'ajax_lab_get_student_details' );\nadd_action( 'wp_ajax_nopriv_get_student_detail', 'ajax_lab_get_student_details' );`,
      },
      accept: ['wp_ajax_get_student_details'],
      placeholder: 'wp_ajax_…',
      hint: 'Compare the end of the hook name with the action.',
      explanation: 'The hook must be exactly prefix + action. “get_student_detail” is missing its final “s”, so neither hook matches.',
    },
    explore: { scenarioId: 'wp-student-details', preset: 'typo-hook', route: '/wordpress', label: 'Fix it in the WordPress Lab' },
  },
  {
    id: 'debug-invalid-json',
    category: 'debug',
    title: 'The status says OK',
    task: {
      kind: 'debug',
      question: 'The notifications never appear. Why?',
      evidence: { scenarioId: 'failure-recovery', preset: 'invalid-json' },
      options: [
        { text: 'The server returned an HTTP error.', feedback: 'Look at the status: 200 OK.' },
        { text: 'The body is not valid JSON, so parsing failed.' },
        { text: 'The network connection dropped.', feedback: 'A response arrived, so the network worked.' },
      ],
      answer: 1,
      explanation: 'The body stops in the middle of an object, so response.json() threw a SyntaxError — even though the status was 200.',
    },
  },
  {
    id: 'debug-zero',
    category: 'debug',
    title: 'A single “0”',
    task: {
      kind: 'debug',
      question: 'A visitor clicks “Load student” and gets “The request failed.” What is the cause?',
      evidence: { scenarioId: 'wp-student-details', preset: 'nopriv-missing' },
      options: [
        { text: 'The nonce expired.', feedback: 'A nonce failure answers “-1” with 403.' },
        { text: 'No callback is registered for logged-out visitors on this action.' },
        { text: 'The student ID was invalid.', feedback: 'An invalid ID gets a JSON error from the callback, which never ran here.' },
      ],
      answer: 1,
      explanation: 'The request has no login cookie, so WordPress fired wp_ajax_nopriv_get_student_details. Nothing is registered there, so admin-ajax.php answered “0” with 400.',
    },
  },
  {
    id: 'debug-404',
    category: 'debug',
    title: 'fetch() did not reject',
    task: {
      kind: 'debug',
      question: 'The developer expected .catch() to handle this, but the console shows no rejection. What happened?',
      evidence: { scenarioId: 'load-profile', preset: 'not-found' },
      options: [
        { text: 'A 404 is a normal HTTP response, so fetch() resolved; the code had to check response.ok.' },
        { text: 'The server never answered.', feedback: 'There is a status and a body: the server did answer.' },
        { text: 'The URL was blocked by CORS.', feedback: 'A CORS block would give no readable status at all.' },
      ],
      answer: 0,
      explanation: 'fetch() rejects only when no response arrives. HTTP error statuses must be detected by checking response.ok or response.status.',
    },
  },
  {
    id: 'secure-grades',
    category: 'secure',
    title: 'A grades endpoint',
    task: {
      kind: 'multi',
      question: 'This handler returns private grades. Select every change it needs.',
      code: {
        language: 'php',
        code: `add_action( 'wp_ajax_nopriv_get_grades', 'lab_get_grades' );\n\nfunction lab_get_grades() {\n    global $wpdb;\n    $id = $_POST['student_id'];\n    $rows = $wpdb->get_results(\n        "SELECT grade FROM {$wpdb->prefix}grades WHERE student_id = $id"\n    );\n    wp_send_json_success( $rows );\n}`,
      },
      options: [
        { text: 'Register on wp_ajax_ instead of wp_ajax_nopriv_', feedback: 'Private data should not be reachable by logged-out visitors.' },
        { text: 'Verify the nonce with check_ajax_referer()', feedback: 'Protects logged-in users from forged requests.' },
        { text: 'Check current_user_can() (or that the user owns the record)', feedback: 'A nonce does not say who may see grades.' },
        { text: 'Validate the ID with absint() and use $wpdb->prepare()', feedback: 'The ID is pasted into SQL: injection.' },
        { text: 'Rename the action to something hard to guess', feedback: 'Hiding a name is not security. Actions are visible in the page’s JavaScript.' },
        { text: 'Change the request from POST to GET', feedback: 'The method does not make an endpoint safer.' },
      ],
      answers: [0, 1, 2, 3],
      explanation: 'Private data needs: no public hook, a nonce check (CSRF), a permission check (authorization), and validated input in a prepared query (injection). Obscurity and HTTP methods are not protections.',
    },
    explore: { scenarioId: 'wp-security-lab', preset: 'public-visitor', route: '/wordpress', label: 'See the leak in the Security lab' },
  },
  {
    id: 'secure-output',
    category: 'secure',
    title: 'Showing comments',
    task: {
      kind: 'choice',
      question: 'Comments are saved by visitors and shown with this code. What is the fix?',
      code: { language: 'javascript', code: `success: function (response) {\n  $('#comments').html(response.data.comment);\n}` },
      options: [
        { text: "Use .text() instead of .html()" },
        { text: 'Add a nonce check in PHP', feedback: 'Nonces protect requests, not what the page does with stored data.' },
        { text: 'Switch to fetch()', feedback: 'The problem is how the data is inserted, not how it is fetched.' },
      ],
      answer: 0,
      explanation: '.html() parses a stored comment as HTML, so a comment containing markup can run script (stored XSS). .text() displays it as text.',
    },
    explore: { scenarioId: 'wp-security-lab', preset: 'xss-html', route: '/wordpress', label: 'See it in the Security lab' },
  },
  {
    id: 'build-notes',
    category: 'build',
    title: 'A “Load notes” feature',
    task: {
      kind: 'fill',
      question: 'Complete the feature. The action is load_notes; notes are private to logged-in users.',
      code: {
        language: 'php',
        code: `add_action( '①', 'lab_load_notes' );\n\nfunction lab_load_notes() {\n    ②( 'lab_nonce', 'nonce' );\n    if ( ! current_user_can( 'read' ) ) {\n        wp_send_json_error( array( 'message' => 'Not allowed.' ), 403 );\n    }\n    ③( array( 'text' => get_user_meta( get_current_user_id(), 'lab_notes', true ) ) );\n}\n\n// JavaScript\n$.ajax({ url: ajaxLab.ajaxUrl, type: 'POST', dataType: 'json',\n  data: { action: '④', nonce: ajaxLab.nonce },\n  success: (response) => $('#notes')⑤(response.data.text),\n});`,
      },
      parts: [
        { label: '① Hook', options: ['wp_ajax_load_notes', 'wp_ajax_nopriv_load_notes', 'load_notes'], answer: 0, feedback: 'Private to logged-in users: wp_ajax_ only.' },
        { label: '② Nonce check', options: ['check_ajax_referer', 'wp_create_nonce', 'wp_verify_user'], answer: 0, feedback: 'check_ajax_referer() verifies; wp_create_nonce() creates.' },
        { label: '③ Response', options: ['wp_send_json_success', 'echo json_encode', 'return'], answer: 0, feedback: 'wp_send_json_success() sends JSON and ends the request.' },
        { label: '④ Action', options: ['load_notes', 'lab_load_notes', 'wp_ajax_load_notes'], answer: 0, feedback: 'The action is the part after the prefix, not the function name.' },
        { label: '⑤ Insert', options: ['.text', '.html', '.append'], answer: 0, feedback: 'Notes are user content: insert them as text.' },
      ],
      explanation: 'Hook = prefix + action; verify, authorize, respond with wp_send_json_*; send only the action name from JavaScript; insert user content as text.',
    },
  },
];
