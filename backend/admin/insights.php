<?php
/**
 * Admin Insights API
 * Returns aggregated statistics for admin dashboard charts
 */
ob_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    ob_end_flush();
    exit;
}

try {
    require_once __DIR__ . '/../config/database.php';
    $pdo = getDBConnection();

    $adminToken = $_GET['adminToken'] ?? '';
    // simple admin token check (should be replaced with proper auth)
    if (empty($adminToken) || strlen($adminToken) < 3) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Unauthorized - admin token required']);
        ob_end_flush();
        exit;
    }

    // Total orders and revenue
    $stmt = $pdo->query("SELECT COUNT(*) AS total_orders, COALESCE(SUM(total_amount),0) AS total_revenue FROM orders");
    $totals = $stmt->fetch(PDO::FETCH_ASSOC);

    // Orders by district
    $stmt = $pdo->query("SELECT COALESCE(customer_district,'Unknown') AS district, COUNT(*) AS orders_count, COALESCE(SUM(total_amount),0) AS orders_revenue FROM orders GROUP BY COALESCE(customer_district,'Unknown') ORDER BY orders_count DESC");
    $ordersByDistrict = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Orders by status
    $stmt = $pdo->query("SELECT COALESCE(status,'pending') AS status, COUNT(*) AS cnt FROM orders GROUP BY COALESCE(status,'pending')");
    $ordersByStatus = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Top products (join with products table for names). Exclude cancelled orders.
    $stmt = $pdo->query("SELECT COALESCE(p.name, CONCAT('Product #', oi.product_id)) AS name, SUM(oi.quantity) AS qty, COALESCE(SUM(oi.quantity * oi.price),0) AS revenue, ROUND(COALESCE(SUM(oi.quantity * oi.price)/NULLIF(SUM(oi.quantity),0),0),2) AS avg_price FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id LEFT JOIN orders o ON oi.order_id = o.id WHERE COALESCE(o.status,'') <> 'cancelled' GROUP BY oi.product_id, COALESCE(p.name, CONCAT('Product #', oi.product_id)) ORDER BY qty DESC LIMIT 10");
    $topProducts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Orders over last 14 days
    $stmt = $pdo->query("SELECT DATE(created_at) AS date, COUNT(*) AS cnt, COALESCE(SUM(total_amount),0) AS revenue FROM orders WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 13 DAY) GROUP BY DATE(created_at) ORDER BY DATE(created_at)");
    $ordersOverTime = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Subscribers count
    $stmt = $pdo->query("SELECT COUNT(*) AS subscribers FROM email_subscriptions WHERE is_subscribed = 1");
    $sub = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'totals' => $totals,
        'ordersByDistrict' => $ordersByDistrict,
        'ordersByStatus' => $ordersByStatus,
        'topProducts' => $topProducts,
        'ordersOverTime' => $ordersOverTime,
        'subscribers' => $sub['subscribers'] ?? 0,
    ]);
    ob_end_flush();
    exit;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    ob_end_flush();
    exit;
}

?>
