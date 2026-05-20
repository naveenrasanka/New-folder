<?php
/**
 * Advanced Sendgrid API Debug - Captures actual responses
 */

header('Content-Type: text/html; charset=utf-8');
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<!DOCTYPE html>
<html>
<head>
    <title>Advanced Sendgrid Debug</title>
    <style>
        body { font-family: 'Courier New', monospace; margin: 20px; background: #1e1e1e; color: #00ff00; }
        .container { max-width: 1200px; margin: 0 auto; background: #0d0d0d; padding: 20px; border-radius: 8px; border: 2px solid #00ff00; }
        h1 { color: #00ff00; border-bottom: 2px solid #00ff00; padding-bottom: 10px; }
        .section { background: #1e1e1e; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 3px solid #00ff00; }
        .error { border-left-color: #ff0000; background: #2a0000; }
        .success { border-left-color: #00ff00; }
        .warning { border-left-color: #ffff00; background: #2a2a00; }
        .info { border-left-color: #00aaff; }
        pre { margin: 0; overflow-x: auto; background: #000; padding: 10px; border-radius: 3px; }
    </style>
</head>
<body>
    <div class='container'>
        <h1>🔍 Advanced Sendgrid API Debug</h1>";

require_once 'config/database.php';
require_once 'config/EmailNotifier.php';

try {
    $pdo = getDBConnection();
    echo "<div class='section success'>✅ Database connected</div>";
} catch (Exception $e) {
    echo "<div class='section error'>❌ Database Error: " . htmlspecialchars($e->getMessage()) . "</div>";
    exit;
}

// Get API key from EmailNotifier
$notifier = new EmailNotifier();
$reflectionClass = new ReflectionClass($notifier);
$reflectionProperty = $reflectionClass->getProperty('sendgridApiKey');
$reflectionProperty->setAccessible(true);
$apiKey = $reflectionProperty->getValue($notifier);
$apiUrl = 'https://api.sendgrid.com/v3/mail/send';
$fromEmail = 'stellarthinker75@gmail.com';
$toEmail = 'tharupama@gmail.com';

echo "<div class='section info'>";
echo "<strong>Configuration:</strong><br>";
echo "API URL: <code>$apiUrl</code><br>";
echo "From: <code>$fromEmail</code><br>";
echo "To: <code>$toEmail</code><br>";
echo "API Key (from EmailNotifier): <code>" . substr($apiKey, 0, 20) . "...</code> (length: " . strlen($apiKey) . ")<br>";
echo "✅ Key loaded from EmailNotifier.php<br>";
echo "</div>";

// Test 1: Check cURL
echo "<div class='section warning'>";
echo "<strong>1️⃣ Checking cURL Extension</strong><br>";
if (extension_loaded('curl')) {
    echo "✅ cURL is installed<br>";
    echo "Version: " . curl_version()['version'];
} else {
    echo "❌ cURL is NOT installed - cannot send emails";
}
echo "</div>";

// Test 2: Test basic API connectivity
echo "<div class='section warning'>";
echo "<strong>2️⃣ Testing API Connectivity (GET Request)</strong><br>";

$ch = curl_init('https://api.sendgrid.com/v3/mail/send');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $apiKey,
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'GET'); // Test with GET to check auth

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

echo "HTTP Code: <code>$httpCode</code><br>";
if ($curlError) {
    echo "cURL Error: <code>$curlError</code><br>";
}
echo "Response (first 500 chars): <pre>" . htmlspecialchars(substr($response, 0, 500)) . "</pre>";

// Interpret response
if ($httpCode === 405) {
    echo "✅ API is reachable but GET not allowed (expected - send uses POST)";
} else if ($httpCode === 401) {
    echo "❌ <strong>AUTHORIZATION FAILED</strong> - API key is invalid or expired";
} else if ($httpCode === 403) {
    echo "❌ <strong>FORBIDDEN</strong> - Account has restrictions";
} else if ($curlError) {
    echo "❌ <strong>NETWORK ERROR</strong> - Cannot reach API";
}
echo "</div>";

// Test 3: Send actual test email
echo "<div class='section warning'>";
echo "<strong>3️⃣ Sending Test Email (POST Request)</strong><br>";

$payload = [
    'personalizations' => [
        [
            'to' => [['email' => $toEmail, 'name' => $toEmail]],
            'subject' => '🧪 Test Email - Sendgrid Direct'
        ]
    ],
    'from' => ['email' => $fromEmail, 'name' => 'BUY LK Test'],
    'content' => [['type' => 'text/html', 'value' => '<h1>Test Email</h1><p>If you see this, Sendgrid is working!</p>']],
    'reply_to' => ['email' => $fromEmail, 'name' => 'BUY LK']
];

$payloadJson = json_encode($payload);

echo "Payload JSON (first 300 chars):<br>";
echo "<pre>" . htmlspecialchars(substr($payloadJson, 0, 300)) . "</pre><br>";

$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $apiKey,
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payloadJson);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_VERBOSE, true);

$verboseHandle = fopen('php://temp', 'r+');
curl_setopt($ch, CURLOPT_STDERR, $verboseHandle);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
$curlInfo = curl_getinfo($ch);
curl_close($ch);

echo "HTTP Code: <strong><code>$httpCode</code></strong><br>";

if ($httpCode === 202) {
    echo "<div style='color: #00ff00; font-weight: bold;'>✅ SUCCESS! Email accepted by Sendgrid (HTTP 202)</div>";
} else {
    echo "❌ Failed with HTTP $httpCode<br>";
}

if ($curlError) {
    echo "cURL Error: <code>$curlError</code><br>";
}

echo "Response Body:<br>";
echo "<pre>" . htmlspecialchars($response) . "</pre>";

echo "cURL Info:<br>";
echo "<pre>";
foreach ($curlInfo as $key => $value) {
    if (is_scalar($value)) {
        echo "$key: " . htmlspecialchars($value) . "\n";
    }
}
echo "</pre>";

echo "</div>";

// Test 4: Recommendations
echo "<div class='section info'>";
echo "<strong>💡 Recommendations:</strong><br>";
if ($httpCode === 202) {
    echo "✅ Email sending is working! Check your inbox.";
} else if ($httpCode === 401) {
    echo "❌ <strong>API Key Issue</strong><br>";
    echo "- Verify API key is correct in EmailNotifier.php<br>";
    echo "- Check if API key has expired on Sendgrid dashboard<br>";
    echo "- Generate a new API key and update the configuration";
} else if ($httpCode === 400) {
    echo "❌ <strong>Bad Request</strong><br>";
    echo "- Check JSON payload format<br>";
    echo "- Verify email addresses are valid<br>";
    echo "- Check required fields are present";
} else if ($curlError) {
    echo "❌ <strong>Network/SSL Issue</strong><br>";
    echo "- Try using regular PHP mail() as fallback<br>";
    echo "- Check firewall/proxy settings<br>";
    echo "- Verify SSL certificates on XAMPP";
}
echo "</div>";

echo "</div></body></html>";
?>
