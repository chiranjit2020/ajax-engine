// @stage user-action
// @note jQuery is a library, not a requirement for AJAX. It wraps XMLHttpRequest with a shorter API.
$('#load-profile').on('click', function () {
// @end
  // @stage js-handler
  const card = $('#profile-card');
  card.attr('aria-busy', 'true');
  // @end

  // @stage http-request, server-receives, server-processing, http-response
  // @note $.ajax() sends the request and returns a jqXHR object immediately. The callbacks below run later.
  $.ajax({
    url: '/api/profile',
    type: 'GET',
    // @note For GET, jQuery turns `data` into the query string: /api/profile?id=7
    data: { id: $('#profile-id').val() },
    // @stage js-handles-response
    // @note dataType 'json' tells jQuery to check the status and parse the body before calling success or error.
    dataType: 'json',
    // @end
  // @end

    // @stage dom-update
    success: function (profile) {
      // @note .text() inserts plain text, like textContent.
      card.find('.name').text(profile.name);
      card.find('.role').text(profile.role);
      card.removeAttr('aria-busy');
    },
    // @end

    // @stage js-handles-response ?failure
    // @note Unlike fetch(), jQuery calls error for HTTP 4xx/5xx, network failures, and invalid JSON alike.
    error: function (jqXHR, textStatus) {
      card.text('Could not load the profile.');
      card.removeAttr('aria-busy');
    },
    // @end
  });
});
