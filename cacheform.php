<?php
/**
 * cacheform.php
 * ----------------
 * This script provides a user interface for manually clearing and refreshing cached stylesheets in MyBB themes.
 * It supplements the automated VSCode extension functionality, allowing manual intervention when necessary.
 *
 * Key Functionalities:
 * - Displays a form to select themes and associated stylesheets.
 * - Fetches stylesheets dynamically via AJAX based on the selected theme.
 * - Refreshes the cache for selected stylesheets using MyBB's `cache_stylesheet` function.
 * - Logs operations for debugging and transparency.
 *
 * User Interface:
 * - Includes a responsive HTML form to select themes and stylesheets.
 * - Allows users to clear cache for multiple stylesheets in one action.
 *
 * Error Handling:
 * - Logs errors to `cacheform_errors.log` for debugging.
 * - Provides user feedback via AJAX responses, displayed as success or error messages.
 */
// Include MyBB initialization file
define('IN_MYBB', 1);
require_once "./global.php";

// Define the MyBB root directory if not already defined
if (!defined('MYBB_ROOT')) {
    define('MYBB_ROOT', dirname(__FILE__) . '/');
}

// Ensure the functions_themes.php file is included
require_once MYBB_ROOT . "admin/inc/functions_themes.php";

// Set error logging
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/cacheform_errors.log');

// Check if the user has admin privileges
// Commented out for development purposes
// if ($mybb->usergroup['cancp'] != 1) {
//     echo "<p>You do not have permission to access this page.</p>";
//     error_log("Unauthorized access attempt by user ID: " . $mybb->user['uid']);
//     exit;
// }

// Handle different actions
if (isset($_GET['action'])) {
    $action = $_GET['action'];

    if ($action == 'fetch_stylesheets') {
        header('Content-Type: application/json');
        $tid = intval($_GET['tid'] ?? 0);

        if ($tid === 0) {
            echo json_encode([]);
            exit;
        }

        try {
            // Fetch stylesheets for the selected theme, ordered by last modification date
            $query = $db->simple_select("themestylesheets", "name", "tid='{$tid}'", ["order_by" => "lastmodified", "order_dir" => "DESC"]);
            $stylesheets = [];

            while ($stylesheet = $db->fetch_array($query)) {
                $stylesheets[] = ['name' => $stylesheet['name']];
            }

            error_log("[fetch_stylesheets] Stylesheets fetched: " . json_encode($stylesheets));
            echo json_encode($stylesheets);
        } catch (Exception $e) {
            error_log("Error fetching stylesheets: " . $e->getMessage());
            echo json_encode([]);
        }
        exit;
    } elseif ($action == 'clear_cache') {
        header('Content-Type: application/json');
        $tid = intval($_POST['tid'] ?? 0);
        $stylesheets = $_POST['stylesheets'] ?? [];

        error_log("[clear_cache] Received tid: $tid, stylesheets: " . json_encode($stylesheets));

        if (empty($tid) || empty($stylesheets)) {
            error_log("[clear_cache] Exiting: Missing 'tid' or 'stylesheets' parameter.");
            echo json_encode(['success' => false, 'message' => "Invalid parameters."]);
            exit;
        }

        $success = true;
        $messages = [];

        foreach ($stylesheets as $name) {
            // Log received parameters
            error_log("[clear_cache] Processing stylesheet: $name");

            // Fetch the stylesheet content from the database
            $query = $db->simple_select('themestylesheets', 'stylesheet', "tid='{$tid}' AND name='{$db->escape_string($name)}'");
            $content = $db->fetch_field($query, 'stylesheet');

            if (!$content) {
                error_log("[clear_cache] Failed to fetch stylesheet from database: {$name}");
                $success = false;
                $messages[] = "Failed to fetch stylesheet: {$name}";
                continue;
            }

            // Update the stylesheet content in the database
            $update_data = [
                'stylesheet' => $db->escape_string($content),
                'lastmodified' => TIME_NOW
            ];
            $update_result = $db->update_query('themestylesheets', $update_data, "tid='{$tid}' AND name='{$db->escape_string($name)}'");

            if ($update_result) {
                error_log("[clear_cache] Updated stylesheet content in database: {$name}");
                $messages[] = "Updated stylesheet: {$name}";
            } else {
                error_log("[clear_cache] Failed to update stylesheet content in database: {$name}");
                $success = false;
                $messages[] = "Failed to update stylesheet: {$name}";
                continue;
            }

            // Force cache refresh using cache_stylesheet function
            if (function_exists('cache_stylesheet')) {
                if (cache_stylesheet($tid, $name, $content)) {
                    error_log("[clear_cache] Forced cache refresh using cache_stylesheet function");
                    $messages[] = "Cache refreshed for stylesheet: {$name}";
                } else {
                    error_log("[clear_cache] Failed to refresh cache using cache_stylesheet function");
                    $success = false;
                    $messages[] = "Failed to refresh cache for stylesheet: {$name}";
                }
            } else {
                error_log("[clear_cache] Function cache_stylesheet does not exist.");
                $success = false;
                $messages[] = "Function cache_stylesheet does not exist for stylesheet: {$name}";
            }
        }

        // Log cache clear
        error_log("[clear_cache] Cache cleared for theme ID $tid and stylesheets: " . implode(', ', $stylesheets));

        echo json_encode(['success' => $success, 'message' => implode('<br>', $messages)]);
        exit;
    } elseif ($action == 'csscacheclear') {
        header('Content-Type: application/json');

        $theme_name = $_POST['theme_name'] ?? '';
        $stylesheet = $_POST['stylesheet'] ?? '';

        if (empty($theme_name) || empty($stylesheet)) {
            error_log("[csscacheclear] Exiting: Missing 'theme_name' or 'stylesheet' parameter.");
            echo json_encode(['success' => false, 'message' => "Invalid parameters."]);
            exit;
        }

        // Fetch the theme ID based on the theme name
        $query = $db->simple_select("themes", "tid", "name='{$db->escape_string($theme_name)}'");
        $theme = $db->fetch_array($query);

        if (!$theme) {
            error_log("[csscacheclear] Theme not found: $theme_name");
            echo json_encode(['success' => false, 'message' => "Theme not found: $theme_name"]);
            exit;
        }

        $tid = $theme['tid'];

        error_log("[csscacheclear] Received tid: $tid, stylesheet: $stylesheet");

        // Fetch the stylesheet content from the database
        $query = $db->simple_select('themestylesheets', 'stylesheet', "tid='{$tid}' AND name='{$db->escape_string($stylesheet)}'");
        $content = $db->fetch_field($query, 'stylesheet');

        if (!$content) {
            error_log("[csscacheclear] Failed to fetch stylesheet from database: {$stylesheet}");
            echo json_encode(['success' => false, 'message' => "Failed to fetch stylesheet: {$stylesheet}"]);
            exit;
        }

        // Update the stylesheet content in the database
        $update_data = [
            'stylesheet' => $db->escape_string($content),
            'lastmodified' => TIME_NOW
        ];
        $update_result = $db->update_query('themestylesheets', $update_data, "tid='{$tid}' AND name='{$db->escape_string($stylesheet)}'");

        if ($update_result) {
            error_log("[csscacheclear] Updated stylesheet content in database: {$stylesheet}");
            $messages[] = "Updated stylesheet: {$stylesheet}";
        } else {
            error_log("[csscacheclear] Failed to update stylesheet content in database: {$stylesheet}");
            echo json_encode(['success' => false, 'message' => "Failed to update stylesheet: {$stylesheet}"]);
            exit;
        }

        // Force cache refresh using cache_stylesheet function
        if (function_exists('cache_stylesheet')) {
            if (cache_stylesheet($tid, $stylesheet, $content)) {
                error_log("[csscacheclear] Forced cache refresh using cache_stylesheet function");
                $messages[] = "Cache refreshed for stylesheet: {$stylesheet}";
            } else {
                error_log("[csscacheclear] Failed to refresh cache using cache_stylesheet function");
                echo json_encode(['success' => false, 'message' => "Failed to refresh cache for stylesheet: {$stylesheet}"]);
                exit;
            }
        } else {
            error_log("[csscacheclear] Function cache_stylesheet does not exist.");
            echo json_encode(['success' => false, 'message' => "Function cache_stylesheet does not exist for stylesheet: {$stylesheet}"]);
            exit;
        }

        // Log cache clear
        error_log("[csscacheclear] Cache cleared for theme ID $tid and stylesheet: $stylesheet");

        echo json_encode(['success' => true, 'message' => implode('<br>', $messages)]);
        exit;
    } elseif ($action == 'log') {
        // Set the absolute path for the log file
        $logFile = 'C:/wamp64/www/mybb/mybbbridge/mybbbridge_extension.log';

        header('Content-Type: text/plain');  // Set response type

        // Verify the POST parameter 'message'
        if (isset($_POST['message']) && !empty($_POST['message'])) {
            $message = $_POST['message'];
            $timestamp = date("Y-m-d H:i:s");
            $formattedMessage = "[{$timestamp}] [MyBBBridge] {$message}\n";

            // Try to write to the log file and respond accordingly
            if (file_put_contents($logFile, $formattedMessage, FILE_APPEND | LOCK_EX) !== false) {
                echo "Log written to file.";
            } else {
                echo "Failed to write log to file.";
            }
        } else {
            echo "No log message received.";
        }
        exit;
    }
}
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>Cache CSS</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
        }

        h1 {
            color: #333;
        }

        form {
            margin-top: 20px;
        }

        label {
            display: block;
            margin-bottom: 8px;
        }

        input[type="number"],
        input[type="text"],
        select {
            width: 100%;
            padding: 8px;
            margin-bottom: 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
        }

        input[type="submit"] {
            background-color: #4CAF50;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }

        input[type="submit"]:hover {
            background-color: #45a049;
        }

        .message {
            margin-top: 20px;
            padding: 10px;
            border-radius: 4px;
        }

        .success {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }

        .error {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
    </style>
    <script>
        async function fetchStylesheets(themeId) {
            try {
                const response = await fetch(`cacheform.php?action=fetch_stylesheets&tid=${themeId}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const stylesheets = await response.json();
                const stylesheetSelect = document.getElementById('stylesheets');
                stylesheetSelect.innerHTML = '';

                if (stylesheets.length === 0) {
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = 'No stylesheets available';
                    stylesheetSelect.appendChild(option);
                } else {
                    stylesheets.forEach(stylesheet => {
                        const option = document.createElement('option');
                        option.value = stylesheet.name;
                        option.textContent = stylesheet.name;
                        stylesheetSelect.appendChild(option);
                    });
                }
            } catch (error) {
                console.error('Error fetching stylesheets:', error);
                const stylesheetSelect = document.getElementById('stylesheets');
                stylesheetSelect.innerHTML = '<option value="">Error fetching stylesheets</option>';
            }
        }

        async function clearCache(event) {
            event.preventDefault();
            const form = event.target;
            const formData = new FormData(form);
            try {
                const response = await fetch('cacheform.php?action=clear_cache', {
                    method: 'POST',
                    body: formData
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const result = await response.json();
                const messageDiv = document.getElementById('message');
                messageDiv.innerHTML = result.message;
                messageDiv.className = 'message ' + (result.success ? 'success' : 'error');
            } catch (error) {
                console.error('Error clearing cache:', error);
                const messageDiv = document.getElementById('message');
                messageDiv.innerHTML = 'Error clearing cache';
                messageDiv.className = 'message error';
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            const themeSelect = document.getElementById('tid');
            themeSelect.addEventListener('change', () => {
                fetchStylesheets(themeSelect.value);
            });

            const form = document.getElementById('cacheForm');
            form.addEventListener('submit', clearCache);
        });
    </script>
</head>

<body>
    <h1>Cache CSS</h1>
    <form id="cacheForm" method="post">
        <label for="tid">Theme:</label>
        <select id="tid" name="tid" required>
            <?php
            try {
                // Fetch themes using MyBB's database connection
                $query = $db->simple_select("themes", "tid, name");

                while ($theme = $db->fetch_array($query)) {
                    echo "<option value='" . $theme['tid'] . "'>" . htmlspecialchars_uni($theme['name']) . "</option>";
                }
            } catch (Exception $e) {
                error_log("Error fetching themes: " . $e->getMessage());
                echo "<option value=''>Error fetching themes</option>";
            }
            ?>
        </select>
        <label for="stylesheets">Stylesheet Names:</label>
        <select id="stylesheets" name="stylesheets[]" multiple required>
            <!-- Stylesheets will be populated here by JavaScript -->
        </select>
        <input type="submit" value="Clear Cache">
    </form>
    <div id="message"></div>
</body>

</html>
