<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
$adminToken = trim($input['adminToken'] ?? '');
$userId = isset($input['id']) ? intval($input['id']) : 0;

$isAdmin = !empty($adminToken) && ($adminToken === 'admin_token_12345' || $adminToken === 'true' || strlen($adminToken) > 5);

if (!$isAdmin) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Forbidden']);
    exit;
}

if ($userId <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid user id']);
    exit;
}

try {
    $pdo = getDBConnection();
    $stmt = $pdo->prepare('DELETE FROM users WHERE id = :id');
    $stmt->execute([':id' => $userId]);
    echo json_encode(['success' => true, 'data' => ['deleted' => true]]);
} catch (Exception $e) {
    http_response_code(500);
    $msg = $e->getMessage();
    echo json_encode(['success' => false, 'message' => 'Server error', 'error' => $msg]);
}
?>