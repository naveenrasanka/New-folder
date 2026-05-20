<?php
/**
 * Email Log Viewer - See all notifications sent
 * When email sending fails on local XAMPP, this log shows what was attempted
 */

header('Content-Type: text/html; charset=utf-8');

// Create logs directory if it doesn't exist
$logsDir = __DIR__ . '/../logs';
if (!is_dir($logsDir)) {
    mkdir($logsDir, 0755, true);
}

echo "<!DOCTYPE html>
<html>
<head>
    <title>Email Notification Log</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1000px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 3px solid #ff8c00; padding-bottom: 10px; }
        .status { padding: 15px; border-radius: 5px; margin: 20px 0; }
        .success { background: #d1fae5; border-left: 4px solid #10b981; color: #065f46; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; color: #92400e; }
        .info { background: #dbeafe; border-left: 4px solid #3b82f6; color: #1e40af; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #333; color: white; padding: 12px; text-align: left; }
        td { padding: 12px; border-bottom: 1px solid #ddd; }
        tr:hover { background: #f9f9f9; }
        .timestamp { color: #666; font-size: 0.9em; }
        .email { color: #0066cc; font-weight: 600; }
        .product { color: #ff8c00; }
        .count { font-size: 1.5em; font-weight: bold; color: #ff8c00; }
        button { padding: 10px 20px; background: #ff8c00; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 1em; margin: 10px 0; }
        button:hover { background: #e67e00; }
        .clear-btn { background: #dc2626; }
        .clear-btn:hover { background: #b91c1c; }
    </style>
</head>
<body>
    <div class='container'>
        <h1>📧 Email Notification Log</h1>";

// Get all email logs
$logFile = $logsDir . '/email_notifications.json';

if (file_exists($logFile)) {
    $logs = json_decode(file_get_contents($logFile), true) ?: [];
} else {
    $logs = [];
}

$totalNotifications = count($logs);

echo "<div class='status info'>";
echo "<strong>📊 Statistics:</strong> <span class='count'>$totalNotifications</span> notifications logged";
echo "</div>";

// Clear log button
if ($_POST['action'] === 'clear' && $totalNotifications > 0) {
    file_put_contents($logFile, json_encode([]));
    echo "<div class='status success'>✅ Log cleared!</div>";
    $logs = [];
    $totalNotifications = 0;
}

if ($totalNotifications > 0) {
    echo "<table>
        <thead>
            <tr>
                <th>Date/Time</th>
                <th>Product</th>
                <th>Subscriber Email</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>";
    
    // Show newest first
    foreach (array_reverse($logs) as $log) {
        $date = date('M d, Y H:i:s', strtotime($log['timestamp']));
        $productName = htmlspecialchars($log['product_name']);
        $email = htmlspecialchars($log['email']);
        $status = $log['status'] === 'sent' ? '✅ Sent' : '⏱️ Attempted';
        
        echo "<tr>";
        echo "<td class='timestamp'>$date</td>";
        echo "<td class='product'>$productName</td>";
        echo "<td class='email'>$email</td>";
        echo "<td>$status</td>";
        echo "</tr>";
    }
    
    echo "</tbody></table>";
    
    // Clear button
    echo "<form method='POST'>";
    echo "<input type='hidden' name='action' value='clear'>";
    echo "<button type='submit' class='clear-btn' onclick='return confirm(\"Clear all logs? This cannot be undone.\")'>🗑️ Clear All Logs</button>";
    echo "</form>";
} else {
    echo "<div class='status warning'>";
    echo "📭 No notifications logged yet.<br>";
    echo "When you add a new product, notification attempts will appear here.";
    echo "</div>";
}

echo "
        <div class='status info'>
            <strong>💡 How This Works:</strong><br>
            - When admin adds a new product, the system sends emails to all subscribers<br>
            - Each notification is logged here, even if actual email sending fails<br>
            - On local XAMPP, emails typically can't be sent without extra setup<br>
            - Use <strong>Sendgrid API</strong> (with valid key) for real email sending<br>
        </div>
    </div>
</body>
</html>";
?>
