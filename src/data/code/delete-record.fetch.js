// @stage user-action
const list = document.querySelector('#tasks');

list.addEventListener('click', (event) => {
  const button = event.target.closest('[data-delete]');
  if (button) deleteTask(button.dataset.delete);
});
// @end

async function deleteTask(id) {
  // @stage user-action
  // @note Deleting cannot be undone, so ask first.
  if (!confirm('Delete this task?')) return;
  // @end

  // @stage js-handler
  const url = '/api/tasks/' + encodeURIComponent(id);
  // @end

  // @stage http-request, server-receives, server-processing, http-response
  // @note DELETE needs no body: the URL identifies the record.
  const response = await fetch(url, { method: 'DELETE' });
  // @end

  // @stage js-handles-response
  // @note 204 No Content has an empty body, so do not call response.json() — it would throw.
  if (response.status === 204 || response.status === 404) {
  // @end
    // @stage dom-update
    // @stage js-handles-response ?failure
    // @note On 404 the task is already gone, so the row is stale either way.
    document.querySelector('#task-' + id).remove();
    // @end
    // @end
  // @stage js-handles-response
  }
  // @end
}
