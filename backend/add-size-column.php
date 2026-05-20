<?php
// Migration script to add size column to products table

require_once 'config/database.php';

try {
    $pdo = getDBConnection();
    
    // Check if size column exists
    $stmt = $pdo->prepare("SHOW COLUMNS FROM products LIKE 'size'");
    $stmt->execute();
    
    if ($stmt->rowCount() == 0) {
        // Add size column after category
        $alter = $pdo->prepare("ALTER TABLE products ADD COLUMN size VARCHAR(50) AFTER category");
        $alter->execute();
        
        echo json_encode([
            'success' => true,
            'message' => 'Size column added to products table successfully'
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'message' => 'Size column already exists'
        ]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error: ' . $e->getMessage()
    ]);
}
?>
