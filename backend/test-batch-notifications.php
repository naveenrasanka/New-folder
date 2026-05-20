<?php
/**
 * Test batch email notifications to all subscribers
 */

header('Content-Type: text/html; charset=utf-8');
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<!DOCTYPE html>
<html>
<head>
    <title>Batch Email Notification Test</title>
    <style>
        body { font-family: 'Courier New', monospace; margin: 20px; background: #1e1e1e; color: #00ff00; }
        .container { max-width: 1000px; margin: 0 auto; background: #0d0d0d; padding: 20px; border-radius: 8px; border: 2px solid #00ff00; }
        h1 { color: #00ff00; border-bottom: 2px solid #00ff00; padding-bottom: 10px; }
        .section { background: #1e1e1e; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 3px solid #00ff00; }
        .success { border-left-color: #00ff00; }
        .error { border-left-color: #ff0000; background: #2a0000; }
        pre { margin: 0; overflow-x: auto; background: #000; padding: 10px; border-radius: 3px; font-size: 12px; }
    </style>
</head>
<body>
    <div class='container'>
        <h1>📧 Batch Email Notification Test</h1>";

// Database and Email classes
require_once 'config/database.php';
require_once 'config/EmailNotifier.php';

try {
    $pdo = getDBConnection();
    echo "<div class='section success'>✅ Database connected</div>";
} catch (Exception $e) {
    echo "<div class='section error'>❌ Database Error: " . htmlspecialchars($e->getMessage()) . "</div>";
    exit;
}

// Fetch all subscribers
try {
    $stmt = $pdo->query("SELECT email FROM email_subscriptions");
    $subscribers = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo "<div class='section success'>✅ Found " . count($subscribers) . " active subscribers:<br>";
    foreach ($subscribers as $email) {
        echo "  • " . htmlspecialchars($email) . "<br>";
    }
    echo "</div>";
} catch (Exception $e) {
    echo "<div class='section error'>❌ Error fetching subscribers: " . htmlspecialchars($e->getMessage()) . "</div>";
    exit;
}

// Create test product
$testProduct = [
    'id' => 999,
    'name' => '🧪 Batch Test Pizza - ' . date('H:i:s'),
    'price' => 499.99,
    'category' => 'pizza',
    'image' => 'test.jpg'
];

echo "<div class='section success'>📦 Test Product:<br>";
echo "  Name: " . htmlspecialchars($testProduct['name']) . "<br>";
echo "  Price: LKR " . $testProduct['price'] . "<br>";
echo "</div>";

// Send batch notifications
echo "<div class='section success'>📤 Sending batch notifications...<br>";

$notifier = new EmailNotifier();
$results = $notifier->sendBatchNotifications($subscribers, $testProduct);

echo "  ✅ Sent: " . $results['success'] . "<br>";
echo "  ❌ Failed: " . $results['failed'] . "<br>";
if (!empty($results['errors'])) {
    echo "  Errors: <pre>" . htmlspecialchars(json_encode($results['errors'], JSON_PRETTY_PRINT)) . "</pre>";
}
echo "</div>";

// Check log file
$logFile = __DIR__ . '/logs/email_notifications.json';
if (file_exists($logFile)) {
    $logContent = file_get_contents($logFile);
    $logs = json_decode($logContent, true);
    
    echo "<div class='section success'>📄 Log file exists<br>";
    echo "  Total entries: " . count($logs) . "<br>";
    echo "  Last 3 entries:<br>";
    echo "  <pre>" . htmlspecialchars(json_encode(array_slice($logs, -3), JSON_PRETTY_PRINT)) . "</pre>";
    echo "</div>";
} else {
    echo "<div class='section error'>❌ No log file created yet</div>";
}

echo "<div class='section success'>✅ Test complete! Check <a href='email-log.php' style='color: #00ff00;'>email-log.php</a> to view all notifications.</div>";

echo "</body></html>";
?>
