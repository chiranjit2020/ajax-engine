// @stage user-action
const list = document.querySelector('#articles');
const button = document.querySelector('#load-more');
// @note Page 1 came with the HTML. The next request asks for page 2.
let nextPage = 2;

button.addEventListener('click', loadMore);
// @end

async function loadMore() {
  // @stage js-handler
  button.disabled = true;
  const url = '/api/articles?page=' + nextPage + '&per_page=3';
  // @end

  // @stage http-request, server-receives, server-processing, http-response
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  // @end

  // @stage js-handles-response
  const data = await response.json();
  // @end

  // @stage dom-update
  // @note append() adds after the existing items; nothing already on screen is re-rendered.
  list.append(...data.items.map((title) => {
    const li = document.createElement('li');
    li.textContent = title;
    return li;
  }));
  nextPage += 1;
  button.disabled = false;
  button.hidden = !data.hasMore;
  // @end
}
