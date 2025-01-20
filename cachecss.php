<?php
define('IN_MYBB', 1);
require_once "./global.php";

if (!defined('MYBB_ROOT')) {
    define('MYBB_ROOT', dirname(__FILE__) . '/');
}

require_once MYBB_ROOT . "admin/inc/functions_themes.php";

// Set error logging
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/cachecss_errors.log');

header('Content-Type: application/json');

// Get POST parameters
$theme_name = $_POST['theme_name'] ?? '';
$stylesheet = $_POST['stylesheet'] ?? '';

error_log("[cachecss.php] Received request - theme_name: $theme_name, stylesheet: $stylesheet");

if (empty($theme_name) || empty($stylesheet)) {
    echo json_encode(['success' => false, 'message' => 'Missing theme_name or stylesheet parameter']);
    exit;
}

// Get theme ID from name
$query = $db->simple_select("themes", "tid", "name='" . $db->escape_string($theme_name) . "'");
$theme = $db->fetch_array($query);

if (!$theme) {
    error_log("[cachecss.php] Theme not found: $theme_name");
    echo json_encode(['success' => false, 'message' => "Theme not found: $theme_name"]);
    exit;
}

$tid = $theme['tid'];

// Get stylesheet content
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

// Cache the stylesheet
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