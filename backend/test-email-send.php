<?php
/**
 * Direct Email Notification Test - Simplified Debug Version
 */

header('Content-Type: text/html; charset=utf-8');

// Enable all error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

$debugOutput = '';

echo "<!DOCTYPE html>
<html>
<head>
    <title>Email Notification Test - Direct Test</title>
    <style>
        body { font-family: 'Courier New', monospace; margin: 20px; background: #1e1e1e; color: #00ff00; }
        .container { max-width: 1000px; margin: 0 auto; background: #0d0d0d; padding: 20px; border-radius: 8px; border: 2px solid #00ff00; }
        h1 { color: #00ff00; border-bottom: 2px solid #00ff00; padding-bottom: 10px; }
        .output { background: #1e1e1e; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 3px solid #00ff00; }
        .error { border-left-color: #ff0000; }
        .success { border-left-color: #00ff00; }
        .warning { border-left-color: #ffff00; }
        .info { border-left-color: #00aaff; }
        pre { margin: 0; overflow-x: auto; }
    </style>
</head>
<body>
    <div class='container'>
        <h1>📧 DIRECT EMAIL TEST - DEBUG MODE</h1>";

// Get error logs from PHP ini
$errorLogPath = ini_get('error_log');
echo "<div class='output info'>";
echo "PHP Error Log: ";
if ($errorLogPath) {
    echo "<code>$errorLogPath</code>";
} else {
    echo "<code>NOT CONFIGURED - using system default</code>";
}
echo "</div>";

require_once 'config/database.php';
require_once 'config/EmailNotifier.php';
require_once 'config/SendgridAPI.php';

try {
    $pdo = getDBConnection();
    echo "<div class='output success'>✅ Database connection OK</div>";
} catch (Exception $e) {
    echo "<div class='output error'>❌ Database failed: " . htmlspecialchars($e->getMessage()) . "</div>";
    exit;
}

// Get subscribers
$stmt = $pdo->query("SELECT email FROM email_subscriptions WHERE is_subscribed = 1 LIMIT 1");
$subscriber = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$subscriber) {
    echo "<div class='output error'>❌ No active subscribers found</div>";
    exit;
}

$testEmail = $subscriber['email'];
echo "<div class='output success'>✅ Found subscriber: <strong>$testEmail</strong></div>";

// Create test product
$testProduct = [
    'id' => 999,
    'name' => '🧪 Test Pizza - Email System Check',
    'category' => 'pizza',
    'price' => '499.99',
    'tag' => 'Test',
    'image' => 'https://via.placeholder.com/300x200?text=Test+Product',
    'description' => 'This is a test email to verify the notification system is working correctly.'
];

echo "<div class='output info'>";
echo "Test Product:<br>";
echo "- Name: {$testProduct['name']}<br>";
echo "- Category: {$testProduct['category']}<br>";
echo "- Price: LKR {$testProduct['price']}<br>";
echo "</div>";

// Create EmailNotifier and check configuration
$notifier = new EmailNotifier();

echo "<div class='output warning'>";
echo "📧 <strong>Attempting to send email...</strong><br><br>";

// Reflection to get private properties
$reflectionClass = new ReflectionClass('EmailNotifier');

$propertyApiKey = $reflectionClass->getProperty('sendgridApiKey');
$propertyApiKey->setAccessible(true);
$apiKey = $propertyApiKey->getValue($notifier);

$propertyFromEmail = $reflectionClass->getProperty('fromEmail');
$propertyFromEmail->setAccessible(true);
$fromEmail = $propertyFromEmail->getValue($notifier);

echo "From Email: <code>$fromEmail</code><br>";
echo "Sendgrid API Key: <code>" . (substr($apiKey, 0, 15) . '...') . "</code><br>";
echo "API Key Valid: " . (strlen($apiKey) > 50 ? '✅ YES' : '❌ NO - too short') . "<br><br>";

// Test Sendgrid directly
echo "🔍 <strong>Testing Sendgrid API Directly...</strong><br><br>";

$sendgrid = new SendgridAPI($apiKey);

$subject = "🆕 Test Email - BUY LK";
$htmlBody = "<h2>Test Email</h2><p>If you see this, the email system works!</p>";

echo "Making API request to Sendgrid...<br>";

$result = $sendgrid->sendEmail($testEmail, $subject, $htmlBody, $fromEmail, 'E-Commerce Shop');

if ($result) {
    echo "✅ <strong>SUCCESS!</strong> Email sent to $testEmail<br>";
    echo "Check your email inbox (and spam folder) for the test message.";
} else {
    echo "❌ <strong>FAILED!</strong> Email could not be sent.<br>";
    echo "Possible reasons:<br>";
    echo "- Sendgrid API key is invalid<br>";
    echo "- Network/cURL error<br>";
    echo "- Sendgrid account restrictions<br><br>";
    echo "Check system logs for more details.";
}

echo "</div>";

// Show PHP errors that occurred
if (function_exists('error_get_last')) {
    $lastError = error_get_last();
    if ($lastError) {
        echo "<div class='output error'>";
        echo "⚠️ <strong>Last PHP Error:</strong><br>";
        echo htmlspecialchars($lastError['message']) . " (Line " . $lastError['line'] . ")";
        echo "</div>";
    }
}

// Show recent error logs if file exists
if ($errorLogPath && file_exists($errorLogPath)) {
    $lines = file($errorLogPath);
    $recentLines = array_slice($lines, -15);
    
    echo "<div class='output info'>";
    echo "<strong>📝 Recent Error Log Entries:</strong><br><pre>";
    foreach ($recentLines as $line) {
        echo htmlspecialchars(trim($line)) . "\n";
    }
    echo "</pre></div>";
}

echo "
    </div>
</body>
</html>";
?>
