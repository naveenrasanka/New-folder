<?php
/**
 * Test PHP mail() function directly
 */

header('Content-Type: text/html; charset=utf-8');

echo "<!DOCTYPE html>
<html>
<head>
    <title>PHP mail() Test</title>
    <style>
        body { font-family: 'Courier New', monospace; margin: 20px; background: #1e1e1e; color: #00ff00; }
        .container { max-width: 800px; margin: 0 auto; background: #0d0d0d; padding: 20px; border-radius: 8px; border: 2px solid #00ff00; }
        h1 { color: #00ff00; border-bottom: 2px solid #00ff00; padding-bottom: 10px; }
        .section { background: #1e1e1e; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 3px solid; }
        .success { border-left-color: #00ff00; }
        .error { border-left-color: #ff0000; background: #2a0000; }
        .info { border-left-color: #00aaff; }
        pre { margin: 0; background: #000; padding: 10px; border-radius: 3px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class='container'>
        <h1>📧 PHP mail() Direct Test</h1>";

// Check mail configuration
echo "<div class='section info'>";
echo "<strong>PHP Mail Configuration:</strong><br>";
echo "mail.add_x_header: " . ini_get('mail.add_x_header') . "<br>";
echo "SMTP: " . (ini_get('SMTP') ?: 'Not configured') . "<br>";
echo "smtp_port: " . ini_get('smtp_port') . "<br>";
echo "sendmail_from: " . (ini_get('sendmail_from') ?: 'Not configured') . "<br>";
echo "sendmail_path: " . (ini_get('sendmail_path') ?: 'Not configured (Windows)') . "<br>";
echo "</div>";

// Test mail() function
echo "<div class='section info'>";
echo "<strong>Testing mail() Function:</strong><br>";

$testEmail = 'tharupama@gmail.com';
$subject = '=?UTF-8?B?' . base64_encode('🧪 Test Email - PHP mail()') . '?=';
$message = '<h1>Test Email</h1><p>If you received this, PHP mail() is working on your XAMPP!</p>';
$headers = "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8\r\n";
$headers .= "From: kingpython1431@gmail.com\r\n";
$headers .= "Reply-To: kingpython1431@gmail.com\r\n";

echo "To: <code>$testEmail</code><br>";
echo "Subject: Test Email<br>";
echo "From: kingpython1431@gmail.com<br><br>";

$result = @mail($testEmail, $subject, $message, $headers);

if ($result) {
    echo "✅ <strong>mail() returned TRUE</strong><br>";
    echo "Email has been queued for sending.<br>";
    echo "Check your inbox/spam folder for the test message.";
} else {
    echo "❌ <strong>mail() returned FALSE</strong><br>";
    echo "Mail server may not be configured, or there was an error.<br>";
    echo "This is normal on local XAMPP without Sendmail/Postfix.";
}

echo "</div>";

// Check for recent errors
echo "<div class='section info'>";
echo "<strong>Recent PHP Errors:</strong><br>";
if (function_exists('error_get_last')) {
    $error = error_get_last();
    if ($error) {
        echo "<pre>" . htmlspecialchars($error['message']) . " (" . $error['file'] . ":" . $error['line'] . ")</pre>";
    } else {
        echo "No errors recorded";
    }
}
echo "</div>";

// Recommendations
echo "<div class='section success'>";
echo "<strong>💡 For Local Development (XAMPP):</strong><br>";
echo "Since PHP mail() typically doesn't work on Windows XAMPP without additional setup:<br><br>";
echo "<strong>Option 1: Use Sendgrid (Recommended)</strong><br>";
echo "- Verify API key is correct<br>";
echo "- Run the debug-sendgrid.php test to see exact error<br><br>";
echo "<strong>Option 2: Use Gmail SMTP</strong><br>";
echo "- Configure SMTP in php.ini<br>";
echo "- Or generate Gmail App Password and update config<br><br>";
echo "<strong>Option 3: Use MailHog/MailTrap</strong><br>";
echo "- Free local mail testing service<br>";
echo "- Captures emails without sending real messages<br>";
echo "</div>";

echo "</div></body></html>";
?>
