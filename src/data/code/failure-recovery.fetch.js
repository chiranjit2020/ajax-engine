// @stage user-action
const list = document.querySelector('#notifications');
const retry = document.querySelector('#retry');

document.querySelector('#load').addEventListener('click', loadNotifications);
// @note Retrying simply sends the same request again.
retry.addEventListener('click', loadNotifications);
// @end

async function loadNotifications() {
  // @stage js-handler
  // @note fetch() has no timeout of its own. An AbortController lets the code give up after 5 seconds.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  retry.hidden = true;
  // @end

  try {
    // @stage http-request, server-receives, server-processing, http-response
    const response = await fetch('/api/notifications', {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    // @end

    // @stage js-handles-response
    // @note A 404 or 500 is a real HTTP response, so fetch() resolves. The status must be checked here.
    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }
    // @note response.json() throws a SyntaxError when the body is not valid JSON — even with status 200.
    const data = await response.json();
    // @end

    // @stage dom-update
    list.replaceChildren(...data.items.map((item) => {
      const li = document.createElement('li');
      li.textContent = item.text;
      return li;
    }));
    // @end
  } catch (error) {
    // @stage js-handles-response ?failure
    // @stage http-response ?network
    // @stage http-response ?timeout
    // @note Every failure lands in this one catch block: the rejected fetch(), the thrown HTTP error, and the JSON SyntaxError.
    list.textContent = describe(error);
    retry.hidden = false;
    // @end
    // @end
    // @end
  } finally {
    // @stage js-handles-response
    clearTimeout(timer);
    // @end
  }
}

// @stage js-handles-response ?failure
// @stage http-response ?network
// @stage http-response ?timeout
// @note error.name tells the failures apart. Only some of them are worth retrying.
function describe(error) {
  if (error.name === 'AbortError') return 'The server took too long. Try again.';
  if (error.name === 'TypeError') return 'You appear to be offline. Try again.';
  if (error.name === 'SyntaxError') return 'The server sent something we could not read.';
  return 'The server reported an error (' + error.message + ').';
}
// @end
// @end
// @end
