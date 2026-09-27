jQuery(function ($) {
    // @stage wp-user-action
    // @note Registered when the page loaded. Nothing is sent until the click.
    $('#load-student').on('click', function () {
    // @end
        // @stage wp-js-request
        const studentId = $('#student-id').val();

        $.ajax({
            // @note ajaxLab.ajaxUrl was printed into the page by wp_localize_script(). It points to /wp-admin/admin-ajax.php.
            url: ajaxLab.ajaxUrl,
            type: 'POST',
            // @note jQuery will parse the body as JSON and call error() if it cannot, or if the status is 4xx/5xx.
            dataType: 'json',
            data: {
                // @note This value tells WordPress which AJAX action to dispatch. WordPress uses it to find the matching registered hook. It is not the PHP function name itself.
                action: 'get_student_details',
                // @note The nonce was also printed by wp_localize_script(). It helps prove the request came from a page this site generated. It is not a password and does not prove who the visitor is.
                nonce: ajaxLab.nonce,
                student_id: studentId
            },

            beforeSend: function () {
                $('#student-result').text('Loading...');
            },
        // @end

            // @stage wp-dom-update ?status-2xx
            success: function (response) {
                // @note success() runs for a 2xx response that parsed as JSON. The WordPress envelope still has to be checked.
                if (response.success) {
            // @end
                    // @stage wp-dom-update ?success
                    // @note .text() inserts plain text, so a name containing HTML cannot inject markup.
                    $('#student-result').text(
                        response.data.name
                    );
                    // @end
            // @stage wp-dom-update ?status-2xx
                } else {
            // @end
                    // @stage wp-dom-update ?application-error
                    // @note Runs only when wp_send_json_error() is sent with HTTP 200 — the default when no status code is passed.
                    $('#student-result').text(
                        response.data.message
                    );
                    // @end
            // @stage wp-dom-update ?status-2xx
                }
            },
            // @end

            // @stage wp-dom-update ?http-error
            // @note jQuery calls error() for any 4xx/5xx status — including wp_die( '0', 400 ), wp_die( -1, 403 ), and wp_send_json_error( ..., 400 ).
            error: function () {
                $('#student-result').text(
                    'The request failed.'
                );
            }
            // @end
        });
    });
});
