// @stage user-action
const form = document.querySelector('#role-form');
const roleField = form.querySelector('[name="role"]');
const card = document.querySelector('#profile-card');

form.addEventListener('submit', saveRole);
// @end

async function saveRole(event) {
  // @stage js-handler
  event.preventDefault();
  // @note PATCH changes part of a resource: only the role is sent.
  const body = JSON.stringify({ role: roleField.value });
  // @end

  // @stage http-request, server-receives, server-processing, http-response
  const response = await fetch('/api/profile/7', {
    method: 'PATCH',
    // @note A JSON body needs this header. Without it, fetch() labels the string text/plain.
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body,
  });
  // @end

  // @stage js-handles-response
  const data = await response.json();
  if (!response.ok) {
  // @end
    // @stage js-handles-response ?failure
    form.querySelector('.error').textContent = data.errors.role;
    return;
    // @end
  // @stage js-handles-response
  }
  // @end

  // @stage dom-update
  // @note Show what the server saved, not what was typed: the server is the source of truth.
  card.querySelector('.role').textContent = data.role;
  // @end
}
