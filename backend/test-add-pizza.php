<?php
header('Content-Type: application/json');

require_once 'config/database.php';

try {
    $pdo = getDBConnection();
    
    // Test: Add a test pizza product directly
    $testPizza = [
        'name' => 'Test Margherita Pizza - ' . date('Y-m-d H:i:s'),
        'category' => 'pizza',
        'price' => 399.99,
        'size' => 'medium',
        'rating' => 0,
        'tag' => 'test',
        'image' => 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?auto=format&fit=crop&w=800&q=80',
        'description' => 'Test pizza with size',
        'stock' => 50
    ];
    
    try {
        $stmt = $pdo->prepare("INSERT INTO products (name, category, price, size, rating, tag, image, description, stock, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)");
        $stmt->execute([
            $testPizza['name'],
            $testPizza['category'],
            $testPizza['price'],
            $testPizza['size'],
            $testPizza['rating'],
            $testPizza['tag'],
            $testPizza['image'],
            $testPizza['description'],
            $testPizza['stock']
        ]);
        
        $productId = $pdo->lastInsertId();
        
        // Now fetch it back
        $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
        $stmt->execute([$productId]);
        $savedProduct = $stmt->fetch(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Test pizza added successfully',
            'product_id' => $productId,
            'saved_product' => $savedProduct
        ], JSON_PRETTY_PRINT);
    } catch (Exception $e) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to add test pizza',
            'error' => $e->getMessage()
        ], JSON_PRETTY_PRINT);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error' => $e->getMessage()
    ]);
}
?>
