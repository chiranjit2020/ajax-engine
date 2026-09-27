<?php
/*
 * wp-admin/admin-ajax.php — a simplified excerpt of WordPress core, for teaching.
 * The real file also loads admin includes, fires admin_init, and registers
 * WordPress's own AJAX actions. The dispatch logic below is the same.
 */

// @stage wp-admin-ajax
// @note Marks this request as an AJAX request; wp_doing_ajax() now returns true.
define( 'DOING_AJAX', true );

// @note Boots all of WordPress: configuration, plugins, the theme, and the current user from the login cookie.
require_once dirname( __DIR__ ) . '/wp-load.php';

header( 'Content-Type: text/html; charset=UTF-8' );
send_nosniff_header();
nocache_headers();

if ( empty( $_REQUEST['action'] ) ) {
// @end
    // @stage wp-admin-ajax, wp-response ?no-action
    // @note No action parameter: WordPress cannot know what to run, so it answers "0" with HTTP 400.
    wp_die( '0', 400 );
    // @end
// @stage wp-admin-ajax
}
// @end

// @stage wp-hook-dispatch
// @note The action is only a string. Nothing is called yet; it becomes part of a hook name below.
$action = $_REQUEST['action'];
// @end

// @stage wp-auth-branch
// @note True when the request carried a valid WordPress login cookie.
if ( is_user_logged_in() ) {
// @end
    // @stage wp-auth-branch ?logged-in
    // @note Logged-in visitors: prefix "wp_ajax_" + the action.
    if ( ! has_action( "wp_ajax_{$action}" ) ) {
    // @end
        // @stage wp-auth-branch, wp-response ?logged-in-no-hook
        wp_die( '0', 400 );
        // @end
    // @stage wp-auth-branch ?logged-in
    }
    // @end
    // @stage wp-auth-branch ?logged-in-hook
    // @note Runs every callback registered on this hook, in order.
    do_action( "wp_ajax_{$action}" );
    // @end
// @stage wp-auth-branch
} else {
// @end
    // @stage wp-auth-branch ?logged-out
    // @note Logged-out visitors: prefix "wp_ajax_nopriv_" + the action. A wp_ajax_ registration alone is never used here.
    if ( ! has_action( "wp_ajax_nopriv_{$action}" ) ) {
    // @end
        // @stage wp-auth-branch, wp-response ?logged-out-no-hook
        wp_die( '0', 400 );
        // @end
    // @stage wp-auth-branch ?logged-out
    }
    // @end
    // @stage wp-auth-branch ?logged-out-hook
    do_action( "wp_ajax_nopriv_{$action}" );
    // @end
// @stage wp-auth-branch
}
// @end

// Reached only if a callback returns without sending a response.
wp_die( '0' );
