// @stage user-action
const form = document.querySelector('#signup');
const status = document.querySelector('#signup-status');

// @note Listening for "submit" rather than a button click also catches pressing Enter in a field.
form.addEventListener('submit', submitSignup);
// @end

async function submitSignup(event) {
  // @stage js-handler
  // @note Without preventDefault(), the browser would submit the form the traditional way and navigate to a new page.
  event.preventDefault();
  // @note FormData reads every named field. URLSearchParams encodes them as application/x-www-form-urlencoded.
  const body = new URLSearchParams(new FormData(form));
  // @end

  // @stage http-request, server-receives, server-processing, http-response
  // @note A POST request carries its data in the body, not in the URL.
  const response = await fetch('/api/register', {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body,
  });
  // @end

  // @stage js-handles-response
  const data = await response.json();
  if (!response.ok) {
  // @end
    // @stage js-handles-response ?failure
    // @note 422 is an expected answer: the server is saying which fields to fix. The code handles it instead of throwing.
    showErrors(data.errors);
    return;
    // @end
  // @stage js-handles-response
  }
  // @end

  // @stage dom-update
  status.textContent = 'Registered! Your ID is ' + data.id + '.';
  form.reset();
  // @end
}

// @stage js-handles-response ?failure
function showErrors(errors) {
  for (const [field, message] of Object.entries(errors)) {
    form.querySelector('[data-error-for="' + field + '"]').textContent = message;
  }
}
// @end
