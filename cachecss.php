<?php
/**
 * cachecss.php
 * ----------------
 * This script facilitates communication between the MyBBBridge VSCode extension and MyBB,
 * allowing for automatic refreshing of cached stylesheets. It receives a theme name and stylesheet name,
 * validates their existence, and re-caches the stylesheet using MyBB's theme functions.
 *
 * Key Functions:
 * - Retrieve the theme ID based on the theme name provided via POST.
 * - Validate the existence of the specified stylesheet in the given theme.
 * - Re-cache the stylesheet to ensure changes are reflected immediately.
 *
 * Error Handling:
 * - Logs errors to a local file (cachecss_errors.log) for debugging.
 * - Returns JSON responses with success or failure messages for easy integration with external tools.
 */

define('IN_MYBB', 1);
require_once "./global.php";

// Ensure MYBB_ROOT is defined for consistent path resolution
if (!defined('MYBB_ROOT')) {
    define('MYBB_ROOT', dirname(__FILE__) . '/');
}

// Include MyBB functions for theme management
require_once MYBB_ROOT . "admin/inc/functions_themes.php";

// Configure error logging
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/cachecss_errors.log');

// Set JSON response header
header('Content-Type: application/json');

// Retrieve POST parameters
$theme_name = $_POST['theme_name'] ?? '';
$stylesheet = $_POST['stylesheet'] ?? '';

// Log the received request
error_log("[cachecss.php] Received request - theme_name: $theme_name, stylesheet: $stylesheet");

// Validate input parameters
if (empty($theme_name) || empty($stylesheet)) {
    echo json_encode(['success' => false, 'message' => 'Missing theme_name or stylesheet parameter']);
    exit;
}

// Fetch the theme ID based on the provided theme name
$query = $db->simple_select("themes", "tid", "name='" . $db->escape_string($theme_name) . "'");
$theme = $db->fetch_array($query);

if (!$theme) {
    error_log("[cachecss.php] Theme not found: $theme_name");
    echo json_encode(['success' => false, 'message' => "Theme not found: $theme_name"]);
    exit;
}

$tid = $theme['tid'];

// Fetch the content of the specified stylesheet
$query = $db->simple_select(
    "themestylesheets",
    "stylesheet",
    "tid='" . $tid . "' AND name='" . $db->escape_string($stylesheet) . "'"
);
$style = $db->fetch_array($query);

if (!$style) {
    error_log("[cachecss.php] Stylesheet not found: $stylesheet");
    echo json_encode(['success' => false, 'message' => "Stylesheet not found: $stylesheet"]);
    exit;
}

// Attempt to re-cache the stylesheet
try {
    if (cache_stylesheet($tid, $stylesheet, $style['stylesheet'])) {
        error_log("[cachecss.php] Successfully cached stylesheet: $stylesheet for theme: $theme_name");
        echo json_encode([
            'success' => true,
            'message' => "Successfully cached stylesheet: $stylesheet for theme: $theme_name"
        ]);
    } else {
        throw new Exception("Failed to cache stylesheet");
    }
} catch (Exception $e) {
    error_log("[cachecss.php] Error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
