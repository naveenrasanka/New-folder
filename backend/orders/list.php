<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

function readJsonBody() {
    $input = json_decode(file_get_contents('php://input'), true);
    return is_array($input) ? $input : [];
}

function respond($statusCode, $payload) {
    http_response_code($statusCode);
    echo json_encode($payload);
    exit;
}

function columnExists($pdo, $tableName, $columnName) {
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?');
    $stmt->execute([$tableName, $columnName]);
    return (int)$stmt->fetchColumn() > 0;
}

function isColumnNullable($pdo, $tableName, $columnName) {
    $stmt = $pdo->prepare('SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1');
    $stmt->execute([$tableName, $columnName]);
    $value = $stmt->fetchColumn();
    return strtoupper((string)$value) === 'YES';
}

function ensureOrdersSchema($pdo) {
    $pdo->exec("CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT DEFAULT NULL,
        supabase_user_id VARCHAR(64) DEFAULT NULL,
        user_email VARCHAR(100) DEFAULT NULL,
        customer_name VARCHAR(150) DEFAULT NULL,
        customer_phone VARCHAR(40) DEFAULT NULL,
        customer_address VARCHAR(200) DEFAULT NULL,
        customer_district VARCHAR(80) DEFAULT NULL,
        payment_method VARCHAR(40) DEFAULT 'credit_card',
        payment_status VARCHAR(20) DEFAULT 'paid',
        total_amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )");

    if (!columnExists($pdo, 'orders', 'supabase_user_id')) {
        $pdo->exec("ALTER TABLE orders ADD COLUMN supabase_user_id VARCHAR(64) DEFAULT NULL AFTER user_id");
    }

    if (columnExists($pdo, 'orders', 'user_id') && !isColumnNullable($pdo, 'orders', 'user_id')) {
        $pdo->exec("ALTER TABLE orders MODIFY COLUMN user_id INT NULL");
    }

    if (!columnExists($pdo, 'orders', 'user_email')) {
        $pdo->exec("ALTER TABLE orders ADD COLUMN user_email VARCHAR(100) DEFAULT NULL AFTER supabase_user_id");
    }

    if (!columnExists($pdo, 'orders', 'customer_name')) {
        $pdo->exec("ALTER TABLE orders ADD COLUMN customer_name VARCHAR(150) DEFAULT NULL AFTER user_email");
    }

    if (!columnExists($pdo, 'orders', 'customer_phone')) {
        $pdo->exec("ALTER TABLE orders ADD COLUMN customer_phone VARCHAR(40) DEFAULT NULL AFTER customer_name");
    }

    if (!columnExists($pdo, 'orders', 'customer_address')) {
        $pdo->exec("ALTER TABLE orders ADD COLUMN customer_address VARCHAR(200) DEFAULT NULL AFTER customer_phone");
    }

    if (!columnExists($pdo, 'orders', 'customer_district')) {
        $pdo->exec("ALTER TABLE orders ADD COLUMN customer_district VARCHAR(80) DEFAULT NULL AFTER customer_address");
    }

    if (!columnExists($pdo, 'orders', 'payment_method')) {
        $pdo->exec("ALTER TABLE orders ADD COLUMN payment_method VARCHAR(40) DEFAULT 'credit_card' AFTER customer_district");
    }

    if (!columnExists($pdo, 'orders', 'payment_status')) {
        $pdo->exec("ALTER TABLE orders ADD COLUMN payment_status VARCHAR(20) DEFAULT 'paid' AFTER payment_method");
    }

    if (!columnExists($pdo, 'orders', 'updated_at')) {
        $pdo->exec("ALTER TABLE orders ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
    }

    $pdo->exec("CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )");
}

try {
    $pdo = getDBConnection();
    ensureOrdersSchema($pdo);

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $all = isset($_GET['all']) && $_GET['all'] === '1';

        if ($all) {
            $adminToken = trim($_GET['adminToken'] ?? '');
            if ($adminToken === '') {
                respond(403, ['success' => false, 'message' => 'Unauthorized access']);
            }

            $stmt = $pdo->prepare("SELECT o.id, o.user_id, o.supabase_user_id, o.user_email, o.customer_name, o.customer_phone, o.customer_address, o.customer_district, o.payment_method, o.payment_status, o.total_amount, o.status, o.created_at, o.updated_at, COALESCE(o.customer_name, u.username, o.user_email, 'Customer') AS customer_name
                                   FROM orders o
                                   LEFT JOIN users u ON o.user_id = u.id
                                   ORDER BY o.created_at DESC");
            $stmt->execute();
            $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Fetch items for each order
            foreach ($orders as &$order) {
                $itemStmt = $pdo->prepare("SELECT oi.id, oi.product_id, oi.quantity, oi.price, p.name as product_name, p.size as product_size, p.category as product_category
                                           FROM order_items oi
                                           LEFT JOIN products p ON oi.product_id = p.id
                                           WHERE oi.order_id = ?
                                           ORDER BY oi.id");
                $itemStmt->execute([$order['id']]);
                $order['items'] = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
            }

            respond(200, ['success' => true, 'data' => $orders]);
        }

        $userId = intval($_GET['user_id'] ?? 0);
        $supabaseUserId = trim($_GET['supabase_user_id'] ?? '');
        $userEmail = trim($_GET['user_email'] ?? '');
        $district = trim($_GET['district'] ?? '');

        if ($userId <= 0 && $supabaseUserId === '' && $userEmail === '') {
            respond(400, ['success' => false, 'message' => 'user_id, supabase_user_id or user_email is required']);
        }

        $whereParts = [];
        $params = [];

        if ($userId > 0) {
            $whereParts[] = 'o.user_id = ?';
            $params[] = $userId;
        }

        if ($supabaseUserId !== '') {
            $whereParts[] = 'o.supabase_user_id = ?';
            $params[] = $supabaseUserId;
        }

        if ($userEmail !== '') {
            $whereParts[] = 'o.user_email = ?';
            $params[] = $userEmail;
        }

        if ($district !== '') {
            $whereParts[] = 'o.customer_district = ?';
            $params[] = $district;
        }

        $query = "SELECT o.id, o.user_id, o.supabase_user_id, o.user_email, o.customer_name, o.customer_phone, o.customer_address, o.customer_district, o.payment_method, o.payment_status, o.total_amount, o.status, o.created_at, o.updated_at
                  FROM orders o
                  WHERE " . implode(' OR ', $whereParts) . "
                  ORDER BY o.created_at DESC";

        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch items for each order
        foreach ($orders as &$order) {
            $itemStmt = $pdo->prepare("SELECT oi.id, oi.product_id, oi.quantity, oi.price, p.name as product_name, p.size as product_size, p.category as product_category
                                       FROM order_items oi
                                       LEFT JOIN products p ON oi.product_id = p.id
                                       WHERE oi.order_id = ?
                                       ORDER BY oi.id");
            $itemStmt->execute([$order['id']]);
            $order['items'] = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        respond(200, ['success' => true, 'data' => $orders]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = readJsonBody();

        $userId = intval($input['user_id'] ?? 0);
        $supabaseUserId = trim($input['supabase_user_id'] ?? '');
        $userEmail = trim($input['user_email'] ?? '');
        $customerName = trim($input['customer_name'] ?? '');
        $customerPhone = trim($input['customer_phone'] ?? '');
        $customerAddress = trim($input['customer_address'] ?? '');
        $billingDetails = is_array($input['billingDetails'] ?? null) ? $input['billingDetails'] : [];
        $customerDistrict = trim((string)($input['customer_district'] ?? $input['district'] ?? ($billingDetails['district'] ?? $billingDetails['city'] ?? '')));
        $paymentMethod = trim($input['payment_method'] ?? 'credit_card');
        $paymentStatus = trim($input['payment_status'] ?? 'paid');
        $totalAmount = floatval($input['total_amount'] ?? 0);
        $status = trim($input['status'] ?? 'pending');
        $items = $input['items'] ?? [];

        if ($userId <= 0 && $supabaseUserId === '' && $userEmail === '') {
            respond(400, ['success' => false, 'message' => 'Order must include a customer identifier']);
        }

        if ($totalAmount <= 0) {
            respond(400, ['success' => false, 'message' => 'total_amount must be greater than 0']);
        }

        $allowedStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!in_array($status, $allowedStatuses, true)) {
            $status = 'pending';
        }

        $allowedPaymentMethods = ['credit_card', 'cash_on_delivery'];
        if (!in_array($paymentMethod, $allowedPaymentMethods, true)) {
            $paymentMethod = 'credit_card';
        }

        $allowedPaymentStatuses = ['paid', 'pending'];
        if (!in_array($paymentStatus, $allowedPaymentStatuses, true)) {
            $paymentStatus = $paymentMethod === 'cash_on_delivery' ? 'pending' : 'paid';
        }

        $pdo->beginTransaction();

        $stmt = $pdo->prepare('INSERT INTO orders (user_id, supabase_user_id, user_email, customer_name, customer_phone, customer_address, customer_district, payment_method, payment_status, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $userId > 0 ? $userId : null,
            $supabaseUserId !== '' ? $supabaseUserId : null,
            $userEmail !== '' ? $userEmail : null,
            $customerName !== '' ? $customerName : null,
            $customerPhone !== '' ? $customerPhone : null,
            $customerAddress !== '' ? $customerAddress : null,
            $customerDistrict !== '' ? $customerDistrict : null,
            $paymentMethod,
            $paymentStatus,
            $totalAmount,
            $status
        ]);

        $orderId = intval($pdo->lastInsertId());

        // Validate stock availability before processing — only for beverages
        if (is_array($items) && !empty($items)) {
            foreach ($items as $item) {
                $productId = intval($item['product_id'] ?? 0);
                $quantity = intval($item['quantity'] ?? 0);

                if ($productId <= 0 || $quantity <= 0) {
                    continue;
                }

                // Check product category and stock only for beverages
                $stockCheckStmt = $pdo->prepare('SELECT stock, name, category FROM products WHERE id = ?');
                $stockCheckStmt->execute([$productId]);
                $productRow = $stockCheckStmt->fetch(PDO::FETCH_ASSOC);

                if (!$productRow) {
                    $pdo->rollBack();
                    respond(400, ['success' => false, 'message' => 'Product #' . $productId . ' not found']);
                }

                $category = strtolower(trim((string)($productRow['category'] ?? '')));
                if ($category === 'beverages') {
                    $availableStock = intval($productRow['stock'] ?? 0);
                    if ($availableStock < $quantity) {
                        $pdo->rollBack();
                        respond(400, ['success' => false, 'message' => 'Insufficient stock for "' . $productRow['name'] . '". Only ' . $availableStock . ' available.']);
                    }
                }
            }
        }

        if (is_array($items) && !empty($items)) {
            $itemStmt = $pdo->prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
            $stockStmt = $pdo->prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
            
            foreach ($items as $item) {
                $productId = intval($item['product_id'] ?? 0);
                $quantity = intval($item['quantity'] ?? 0);
                $price = floatval($item['price'] ?? 0);

                if ($productId <= 0 || $quantity <= 0 || $price < 0) {
                    continue;
                }

                $itemStmt->execute([$orderId, $productId, $quantity, $price]);

                // Only alter stock / availability for beverages
                $catStmt = $pdo->prepare('SELECT category, stock FROM products WHERE id = ?');
                $catStmt->execute([$productId]);
                $catRow = $catStmt->fetch(PDO::FETCH_ASSOC);
                $cat = strtolower(trim((string)($catRow['category'] ?? '')));

                if ($cat === 'beverages') {
                    // Decrease stock for the beverage
                    $stockStmt->execute([$quantity, $productId]);

                    // Check if stock is now 0 or less and set is_available to 0
                    $checkStmt = $pdo->prepare('SELECT stock FROM products WHERE id = ?');
                    $checkStmt->execute([$productId]);
                    $productRow2 = $checkStmt->fetch(PDO::FETCH_ASSOC);

                    if ($productRow2 && intval($productRow2['stock']) <= 0) {
                        $updateAvailStmt = $pdo->prepare('UPDATE products SET is_available = 0 WHERE id = ?');
                        $updateAvailStmt->execute([$productId]);
                    }
                }
            }
        }

        $pdo->commit();

        respond(201, [
            'success' => true,
            'message' => 'Order created successfully',
            'order_id' => $orderId
        ]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $input = readJsonBody();

        $adminToken = trim($input['adminToken'] ?? '');
        if ($adminToken === '') {
            respond(403, ['success' => false, 'message' => 'Unauthorized access']);
        }

        $orderId = intval($input['id'] ?? 0);
        $status = strtolower(trim($input['status'] ?? ''));

        if ($orderId <= 0 || $status === '') {
            respond(400, ['success' => false, 'message' => 'Order ID and status are required']);
        }

        $allowedStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!in_array($status, $allowedStatuses, true)) {
            respond(400, ['success' => false, 'message' => 'Invalid status']);
        }

        $stmt = $pdo->prepare('UPDATE orders SET status = ? WHERE id = ?');
        $stmt->execute([$status, $orderId]);

        if ($stmt->rowCount() === 0) {
            respond(404, ['success' => false, 'message' => 'Order not found or status unchanged']);
        }

        // Fetch updated order to notify customer
        try {
            $fetchStmt = $pdo->prepare('SELECT id, user_email, customer_name, customer_phone, customer_address, customer_district, status FROM orders WHERE id = ? LIMIT 1');
            $fetchStmt->execute([$orderId]);
            $orderRow = $fetchStmt->fetch(PDO::FETCH_ASSOC);

            if ($orderRow && !empty($orderRow['user_email'])) {
                require_once __DIR__ . '/../config/EmailNotifier.php';
                $notifier = new EmailNotifier();

                $toEmail = $orderRow['user_email'];
                $customerName = $orderRow['customer_name'] ?: 'Customer';
                $orderStatus = ucfirst($orderRow['status']);
                $orderIdDisplay = intval($orderRow['id']);
                $orderTotal = floatval($orderRow['total_amount'] ?? 0);

                // Fetch order items with product details
                $items = [];
                try {
                    $itemsStmt = $pdo->prepare("SELECT oi.product_id, oi.quantity, oi.price, p.name AS product_name, p.size AS product_size FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ? ORDER BY oi.id");
                    $itemsStmt->execute([$orderId]);
                    $items = $itemsStmt->fetchAll(PDO::FETCH_ASSOC);
                } catch (Exception $e) {
                    error_log('Failed to fetch order items: ' . $e->getMessage());
                }

                // Get shipping cost from settings (default 0)
                $shippingCost = 0.0;
                try {
                    $shipStmt = $pdo->prepare("SELECT value FROM settings WHERE key_name = 'shipping_cost' LIMIT 1");
                    $shipStmt->execute();
                    $shipRow = $shipStmt->fetch(PDO::FETCH_ASSOC);
                    if ($shipRow && isset($shipRow['value'])) {
                        $shippingCost = floatval($shipRow['value']);
                    }
                } catch (Exception $e) {
                    error_log('Failed to fetch shipping cost: ' . $e->getMessage());
                }

                // Send email non-blocking
                try {
                    $sent = $notifier->sendOrderStatusEmail($toEmail, $orderIdDisplay, $orderStatus, $customerName, $items, $orderTotal, $shippingCost);
                    error_log("Order status notification to $toEmail send result: " . ($sent ? 'sent' : 'failed'));
                } catch (Exception $e) {
                    error_log("Error sending order status email: " . $e->getMessage());
                }
            }
        } catch (Exception $e) {
            error_log('Failed to fetch order after update: ' . $e->getMessage());
        }

        respond(200, ['success' => true, 'message' => 'Order status updated']);
    }

    respond(405, ['success' => false, 'message' => 'Method not allowed']);
} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $e->getMessage()]);
}
?>