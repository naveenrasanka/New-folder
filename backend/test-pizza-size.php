<?php
header('Content-Type: application/json');

require_once 'config/database.php';

try {
    $pdo = getDBConnection();
    
    // Check 1: Does size column exist?
    $stmt = $pdo->prepare("SHOW COLUMNS FROM products LIKE 'size'");
    $stmt->execute();
    $sizeColumnExists = $stmt->rowCount() > 0;
    
    if (!$sizeColumnExists) {
        // Try to add it
        try {
            $pdo->exec("ALTER TABLE products ADD COLUMN size VARCHAR(50) AFTER category");
            $sizeColumnExists = true;
            $message = "Size column was missing and has been added automatically.";
        } catch (Exception $e) {
            $message = "Size column missing and could not be added: " . $e->getMessage();
        }
    } else {
        $message = "Size column exists.";
    }
    
    // Check 2: Get pizza products
    $stmt = $pdo->prepare("SELECT id, name, category, size FROM products WHERE category = 'pizza' LIMIT 5");
    $stmt->execute();
    $pizzaProducts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Check 3: Get all columns
    $stmt = $pdo->prepare("SHOW COLUMNS FROM products");
    $stmt->execute();
    $allColumns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo json_encode([
        'status' => 'success',
        'size_column_exists' => $sizeColumnExists,
        'message' => $message,
        'pizza_products_count' => count($pizzaProducts),
        'pizza_products' => $pizzaProducts,
        'all_columns' => $allColumns
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage()
    ]);
}
?>
