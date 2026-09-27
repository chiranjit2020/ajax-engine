// @stage user-action
const button = document.querySelector('#load-profile');
const card = document.querySelector('#profile-card');

// @note Nothing happens until the click. Then the browser calls loadProfile().
button.addEventListener('click', loadProfile);
// @end

function loadProfile() {
  // @stage js-handler
  const id = document.querySelector('#profile-id').value;
  // @note An XMLHttpRequest object represents one request. open() configures it but sends nothing yet.
  const xhr = new XMLHttpRequest();
  xhr.open('GET', '/api/profile?id=' + encodeURIComponent(id));
  xhr.setRequestHeader('Accept', 'application/json');
  card.setAttribute('aria-busy', 'true');
  // @end

  xhr.onload = function () {
    // @stage js-handles-response
    // @note onload runs when a response arrives, whatever its status (readyState is 4, DONE). 404 still triggers onload, so check the status.
    if (xhr.status < 200 || xhr.status >= 300) {
      return showError();
    }
    // @note responseText is a string. JSON.parse() turns it into an object and throws if it is not valid JSON.
    let profile;
    try {
      profile = JSON.parse(xhr.responseText);
    } catch (error) {
      return showError();
    }
    // @end

    // @stage dom-update
    card.querySelector('.name').textContent = profile.name;
    card.querySelector('.role').textContent = profile.role;
    card.removeAttribute('aria-busy');
    // @end
  };

  // @stage js-handles-response ?failure
  // @note onerror fires only for network-level failures, when there is no HTTP response at all.
  xhr.onerror = showError;
  // @end

  // @stage http-request, server-receives, server-processing, http-response
  // @note send() starts the request and returns immediately. The events above fire later.
  xhr.send();
  // @end
}

// @stage js-handles-response ?failure
function showError() {
  card.textContent = 'Could not load the profile.';
  card.removeAttribute('aria-busy');
}
// @end
