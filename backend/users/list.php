<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$adminToken = trim($_GET['adminToken'] ?? '');
$isAdmin = !empty($adminToken) && ($adminToken === 'admin_token_12345' || $adminToken === 'true' || strlen($adminToken) > 5);

if (!$isAdmin) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit;
}

try {
    $pdo = getDBConnection();
    $stmt = $pdo->query("SELECT id, username, email, phone, address, district, postalcode, created_at FROM users ORDER BY created_at DESC");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'data' => $rows]);
} catch (Exception $e) {
    http_response_code(500);
    $msg = $e->getMessage();
    echo json_encode(['success' => false, 'message' => 'Server error', 'error' => $msg]);
}
?>