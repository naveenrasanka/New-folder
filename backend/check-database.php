<?php
header('Content-Type: application/json');

require_once 'config/database.php';

try {
    $pdo = getDBConnection();
    
    // Check if products table exists
    $stmt = $pdo->prepare("SHOW TABLES LIKE 'products'");
    $stmt->execute();
    $tableExists = $stmt->rowCount() > 0;
    
    // Get columns
    $columns = [];
    if ($tableExists) {
        $stmt = $pdo->prepare("SHOW COLUMNS FROM products");
        $stmt->execute();
        $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    }
    
    // Count products
    $productCount = 0;
    if ($tableExists) {
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM products");
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $productCount = $result['count'];
    }
    
    // Get sample products
    $sampleProducts = [];
    if ($tableExists && $productCount > 0) {
        $stmt = $pdo->prepare("SELECT * FROM products LIMIT 5");
        $stmt->execute();
        $sampleProducts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    echo json_encode([
        'database' => 'shop_db',
        'table_exists' => $tableExists,
        'columns' => $columns,
        'size_column_exists' => in_array('size', $columns),
        'total_products' => $productCount,
        'sample_products' => $sampleProducts
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}
?>
