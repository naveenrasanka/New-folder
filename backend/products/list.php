<?php
// Prevent any output before JSON
ob_start();
error_reporting(E_ALL);
ini_set('display_errors', '0');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Set error handler to return JSON errors (but ignore mail() warnings)
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    // Ignore mail() warnings - email sending shouldn't block product creation
    if (strpos($errstr, 'mail()') !== false || strpos($errstr, 'mailserver') !== false) {
        error_log("Mail warning ignored: $errstr");
        return true; // Don't continue with default handler
    }
    
    ob_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error',
        'error' => $errstr,
        'file' => $errfile,
        'line' => $errline
    ]);
    exit;
});

try {
    require_once '../config/database.php';
    require_once '../config/EmailNotifier.php';
} catch (Exception $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to load required files',
        'error' => $e->getMessage()
    ]);
    ob_end_flush();
    exit;
}

// Handle CORS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

try {
    $pdo = getDBConnection();
    
    // GET all products
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        try {
            // Try to select with size column
            $stmt = $pdo->prepare("SELECT id, name, category, price, rating, tag, image, description, stock, size, is_available FROM products ORDER BY id ASC");
            $stmt->execute();
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            // If size column doesn't exist, select without it
            $stmt = $pdo->prepare("SELECT id, name, category, price, rating, tag, image, description, stock, is_available FROM products ORDER BY id ASC");
            $stmt->execute();
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
            // Add null size to each product for compatibility
            foreach ($products as &$product) {
                $product['size'] = null;
            }
        }
        
        http_response_code(200);
        echo json_encode($products);
        exit;
    }
    
    // POST new product (Admin only)
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $adminToken = trim($input['adminToken'] ?? '');
        
        // For now, just check if token is provided (in production, validate token)
        // Token validation can be enhanced later with a sessions table
        if (empty($adminToken)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Unauthorized access']);
            exit;
        }
        
        // Handle availability update
        if (isset($input['productId']) && isset($input['is_available'])) {
            $productId = intval($input['productId']);
            $isAvailable = $input['is_available'] ? 1 : 0;
            
            $stmt = $pdo->prepare("UPDATE products SET is_available = ? WHERE id = ?");
            $stmt->execute([$isAvailable, $productId]);
            
            http_response_code(200);
            echo json_encode(['success' => true, 'message' => 'Product availability updated']);
            exit;
        }
        
        // Handle new product creation
        $name = trim($input['name'] ?? '');
        $category = trim($input['category'] ?? '');
        $price = floatval($input['price'] ?? 0);
        $tag = trim($input['tag'] ?? '');
        $image = trim($input['image'] ?? '');
        $description = trim($input['description'] ?? '');
        $stock = intval($input['stock'] ?? 50);
        $size = trim($input['size'] ?? '');
        
        // Validation
        if (empty($name) || empty($category) || $price <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Name, category, and valid price are required']);
            exit;
        }
        
        // Insert product
        // Rating is review-driven; start at 0 until customer reviews are submitted.
        $stmt = $pdo->prepare("INSERT INTO products (name, category, price, rating, tag, image, description, stock, size, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)");
        $stmt->execute([$name, $category, $price, 0, $tag, $image, $description, $stock, $size]);
        
        $productId = $pdo->lastInsertId();
        $emailsSent = 0;
        $emailsFailed = 0;
        
        // Get all subscribed users
        try {
            $subscribersStmt = $pdo->prepare("SELECT email FROM email_subscriptions WHERE is_subscribed = 1");
            $subscribersStmt->execute();
            $subscribers = $subscribersStmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (!empty($subscribers)) {
                // Prepare product data for email
                $productData = [
                    'id' => $productId,
                    'name' => $name,
                    'category' => $category,
                    'price' => $price,
                    'tag' => $tag,
                    'image' => $image,
                    'description' => $description
                ];
                
                // Send emails to all subscribers
                $emailNotifier = new EmailNotifier();
                $subscriberEmails = array_column($subscribers, 'email');
                $sendResults = $emailNotifier->sendBatchNotifications($subscriberEmails, $productData);
                
                $emailsSent = $sendResults['success'];
                $emailsFailed = $sendResults['failed'];
                
                // Log any errors
                if (!empty($sendResults['errors'])) {
                    error_log("Email sending errors: " . json_encode($sendResults['errors']));
                }
            }
        } catch (Exception $e) {
            error_log("Error sending subscriber emails: " . $e->getMessage());
        }
        
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Product added successfully',
            'productId' => $productId,
            'emailsSent' => $emailsSent,
            'emailsFailed' => $emailsFailed,
            'totalSubscribers' => count($subscribers ?? [])
        ]);
        exit;
    }
    
    // PUT update product (Admin only)
    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $adminToken = trim($input['adminToken'] ?? '');
        
        if (empty($adminToken)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Unauthorized access']);
            exit;
        }
        
        $productId = intval($input['id'] ?? 0);
        if (!$productId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Product ID is required']);
            exit;
        }
        
        $name = trim($input['name'] ?? '');
        $category = trim($input['category'] ?? '');
        $price = floatval($input['price'] ?? 0);
        $tag = trim($input['tag'] ?? '');
        $image = trim($input['image'] ?? '');
        $description = trim($input['description'] ?? '');
        $stock = intval($input['stock'] ?? 50);
        $size = trim($input['size'] ?? '');
        
        // Validation
        if (empty($name) || empty($category) || $price <= 0) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Name, category, and valid price are required']);
            exit;
        }
        
        // Update product
        $stmt = $pdo->prepare("UPDATE products SET name = ?, category = ?, price = ?, tag = ?, image = ?, description = ?, stock = ?, size = ? WHERE id = ?");
        $stmt->execute([$name, $category, $price, $tag, $image, $description, $stock, $size, $productId]);
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Product updated successfully'
        ]);
        exit;
    }
    
    // DELETE product (Admin only)
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $adminToken = trim($input['adminToken'] ?? '');
        
        if (empty($adminToken)) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => 'Unauthorized access']);
            exit;
        }
        
        $productId = intval($input['id'] ?? 0);
        if (!$productId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Product ID is required']);
            exit;
        }
        
        // Delete product
        $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
        $stmt->execute([$productId]);
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Product deleted successfully'
        ]);
        exit;
    }
    
} catch (PDOException $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error',
        'error' => $e->getMessage()
    ]);
    ob_end_flush();
} catch (Exception $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error',
        'error' => $e->getMessage()
    ]);
    ob_end_flush();
}

ob_end_flush();
?>
