// @stage user-action
const button = document.querySelector('#load-profile');
const card = document.querySelector('#profile-card');

// @note Nothing happens until the click. Then the browser calls loadProfile().
button.addEventListener('click', loadProfile);
// @end

async function loadProfile() {
  // @stage js-handler
  // @note Read the chosen ID from the page and build the URL. A GET request carries its data in the query string, not a body.
  const id = document.querySelector('#profile-id').value;
  const url = '/api/profile?id=' + encodeURIComponent(id);
  // @note Mark the card as busy so the page can show a loading state.
  card.setAttribute('aria-busy', 'true');
  // @end

  try {
    // @stage http-request, server-receives, server-processing, http-response
    // @note fetch() sends the request and returns a Promise immediately. `await` pauses only this function; the rest of the page keeps working.
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    // @end

    // @stage js-handles-response
    // @note fetch() does NOT reject on 404 or 500. It only rejects when no response arrives at all, so the status must be checked here.
    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }
    // @note response.json() is asynchronous too: it reads the body text and parses it as JSON.
    const profile = await response.json();
    // @end

    // @stage dom-update
    // @note textContent inserts plain text, so data from the server cannot inject HTML.
    card.querySelector('.name').textContent = profile.name;
    card.querySelector('.role').textContent = profile.role;
    card.removeAttribute('aria-busy');
    // @end
  } catch (error) {
    // @stage js-handles-response ?failure
    // @note Network failures, the thrown HTTP error, and invalid JSON all end up here.
    card.textContent = 'Could not load the profile.';
    card.removeAttribute('aria-busy');
    // @end
  }
}
