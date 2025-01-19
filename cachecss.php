<?php
// Set error logging
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/cachecss_errors.log');

// Log received parameters
error_log("[cachecss.php] Received POST parameters: " . json_encode($_POST));

// Check if required parameters are present
if (!isset($_POST['theme_name']) || !isset($_POST['stylesheet'])) {
    error_log("[cachecss.php] Missing 'theme_name' or 'stylesheet' parameter.");
    echo json_encode(['success' => false, 'message' => "Invalid parameters."]);
    exit;
}

$theme_name = $_POST['theme_name'];
$stylesheet = $_POST['stylesheet'];

// Log the received parameters
error_log("[cachecss.php] theme_name: $theme_name, stylesheet: $stylesheet");

// Include MyBB initialization file
define('IN_MYBB', 1);
require_once "./global.php";

// Define the MyBB root directory if not already defined
if (!defined('MYBB_ROOT')) {
    define('MYBB_ROOT', dirname(__FILE__) . '/');
}

// Ensure the functions_themes.php file is included
require_once MYBB_ROOT . "admin/inc/functions_themes.php";

// Fetch the theme ID based on the theme name
$query = $db->simple_select("themes", "tid", "name='{$db->escape_string($theme_name)}'");
$theme = $db->fetch_array($query);

if (!$theme) {
    error_log("[cachecss.php] Theme not found: $theme_name");
    echo json_encode(['success' => false, 'message' => "Theme not found: $theme_name"]);
    exit;
}

$tid = $theme['tid'];

// Cache the stylesheet
try {
    $stylesheet_path = MYBB_ROOT . "cache/themes/theme{$tid}/{$stylesheet}";
    if (file_exists($stylesheet_path)) {
        $stylesheet_content = file_get_contents($stylesheet_path);
        cache_stylesheet($tid, $stylesheet, $stylesheet_content);
        error_log("[cachecss.php] Cached stylesheet: $stylesheet for theme ID: $tid");
        echo json_encode(['success' => true, 'message' => "Cache refreshed for theme_name $theme_name and stylesheet: $stylesheet"]);
    } else {
        error_log("[cachecss.php] Stylesheet not found: $stylesheet_path");
        echo json_encode(['success' => false, 'message' => "Stylesheet not found: $stylesheet"]);
    }
} catch (Exception $e) {
    error_log("[cachecss.php] Error caching stylesheet: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => "Error caching stylesheet: " . $e->getMessage()]);
}
?>