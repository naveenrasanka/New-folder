<?php
header('Content-Type: application/json');

require_once 'config/database.php';

try {
    $pdo = getDBConnection();
    
    // Check if size column already exists
    $stmt = $pdo->prepare("SHOW COLUMNS FROM products LIKE 'size'");
    $stmt->execute();
    $columnExists = $stmt->rowCount() > 0;
    
    if ($columnExists) {
        echo json_encode([
            'success' => true,
            'message' => 'Size column already exists',
            'column_exists' => true
        ], JSON_PRETTY_PRINT);
        exit;
    }
    
    // Add size column after category
    $pdo->exec("ALTER TABLE products ADD COLUMN size VARCHAR(50) AFTER category");
    
    echo json_encode([
        'success' => true,
        'message' => 'Size column added successfully!',
        'column_exists' => true
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
?>
