<?php
header('Content-Type: application/json');
require_once '../config/database.php';

$pdo = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];

// Create settings table if it doesn't exist
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS settings (
            id INT PRIMARY KEY AUTO_INCREMENT,
            key_name VARCHAR(255) UNIQUE NOT NULL,
            value TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
    exit;
}

if ($method === 'GET') {
    // Get shipping cost
    try {
        $stmt = $pdo->prepare("SELECT value FROM settings WHERE key_name = 'shipping_cost'");
        $stmt->execute();
        $result = $stmt->fetch();
        
        $shipping_cost = $result ? floatval($result['value']) : 0;
        
        echo json_encode([
            'success' => true,
            'shipping_cost' => $shipping_cost
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch shipping cost']);
    }
}
elseif ($method === 'POST') {
    // Set shipping cost
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['shipping_cost'])) {
        http_response_code(400);
        echo json_encode(['error' => 'shipping_cost is required']);
        exit;
    }
    
    try {
        // Check if record exists
        $stmt = $pdo->prepare("SELECT id FROM settings WHERE key_name = 'shipping_cost'");
        $stmt->execute();
        $exists = $stmt->fetch();
        
        if ($exists) {
            // Update existing
            $stmt = $pdo->prepare("UPDATE settings SET value = ? WHERE key_name = 'shipping_cost'");
            $stmt->execute([$input['shipping_cost']]);
        } else {
            // Insert new
            $stmt = $pdo->prepare("INSERT INTO settings (key_name, value) VALUES ('shipping_cost', ?)");
            $stmt->execute([$input['shipping_cost']]);
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Shipping cost updated successfully',
            'shipping_cost' => floatval($input['shipping_cost'])
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to update shipping cost']);
    }
}
else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>
