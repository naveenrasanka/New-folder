<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config/database.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

function respond($statusCode, $payload) {
    http_response_code($statusCode);
    echo json_encode($payload);
    exit;
}

function columnExists($pdo, $tableName, $columnName) {
    $stmt = $pdo->prepare("
        SELECT COUNT(*) 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ? 
        AND COLUMN_NAME = ?
    ");
    $stmt->execute([$tableName, $columnName]);
    return (int)$stmt->fetchColumn() > 0;
}

function ensureUsersSchema($pdo) {
    // Username should behave like a display name, not a unique identifier.
    // If the legacy unique index exists, drop it so users can update their name freely.
    try {
        $pdo->exec("ALTER TABLE users DROP INDEX username");
    } catch (Exception $e) {
        // Ignore if the index does not exist or was already removed.
    }

    if (!columnExists($pdo, 'users', 'phone')) {
        $pdo->exec("ALTER TABLE users ADD COLUMN phone VARCHAR(40) DEFAULT NULL");
    }

    if (!columnExists($pdo, 'users', 'address')) {
        $pdo->exec("ALTER TABLE users ADD COLUMN address VARCHAR(200) DEFAULT NULL");
    }
    if (!columnExists($pdo, 'users', 'district')) {
        $pdo->exec("ALTER TABLE users ADD COLUMN district VARCHAR(80) DEFAULT NULL");
    }

    if (!columnExists($pdo, 'users', 'postalcode')) {
        $pdo->exec("ALTER TABLE users ADD COLUMN postalcode VARCHAR(20) DEFAULT NULL");
    }
}

function fkExists($pdo, $tableName, $columnName) {
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? AND REFERENCED_TABLE_NAME = 'users' AND REFERENCED_COLUMN_NAME = 'email'");
    $stmt->execute([$tableName, $columnName]);
    return (int)$stmt->fetchColumn() > 0;
}

function ensureEmailFkConstraints($pdo) {
    $targets = [
        ['table' => 'orders', 'column' => 'user_email', 'constraint' => 'fk_orders_user_email'],
        ['table' => 'product_reviews', 'column' => 'user_email', 'constraint' => 'fk_product_reviews_user_email'],
        ['table' => 'site_reviews', 'column' => 'user_email', 'constraint' => 'fk_site_reviews_user_email'],
    ];

    foreach ($targets as $t) {
        try {
            // Only attempt if column exists and FK not already present
            $colStmt = $pdo->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?");
            $colStmt->execute([$t['table'], $t['column']]);
            $colExists = (int)$colStmt->fetchColumn() > 0;
            if (!$colExists) {
                continue;
            }

            if (fkExists($pdo, $t['table'], $t['column'])) {
                continue;
            }

            // Add foreign key referencing users(email) — requires users.email to be indexed/unique
            $sql = sprintf(
                "ALTER TABLE `%s` ADD CONSTRAINT `%s` FOREIGN KEY (`%s`) REFERENCES `users`(`email`) ON UPDATE CASCADE ON DELETE SET NULL",
                $t['table'],
                $t['constraint'],
                $t['column']
            );
            $pdo->exec($sql);
        } catch (Exception $e) {
            // Log and continue — schema change may fail if existing data doesn't match users.email
            error_log("Failed to add FK {$t['constraint']} on {$t['table']}.{$t['column']}: " . $e->getMessage());
            continue;
        }
    }
}

function fetchUser($pdo, $email) {
    $stmt = $pdo->prepare("
        SELECT id, username, email, phone, address, district, postalcode, created_at, updated_at 
        FROM users 
        WHERE email = ? 
        LIMIT 1
    ");
    $stmt->execute([$email]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

function fetchUserById($pdo, $userId) {
    $stmt = $pdo->prepare("\n        SELECT id, username, email, phone, address, district, postalcode, created_at, updated_at \n        FROM users \n        WHERE id = ? \n        LIMIT 1\n    ");
    $stmt->execute([$userId]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

function fetchUserByEmail($pdo, $email) {
    $stmt = $pdo->prepare("\n        SELECT id, username, email, phone, address, district, postalcode, created_at, updated_at \n        FROM users \n        WHERE email = ? \n        LIMIT 1\n    ");
    $stmt->execute([$email]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

try {
    $pdo = getDBConnection();
    ensureUsersSchema($pdo);
    // Attempt to add FK constraints for user_email columns to support ON UPDATE CASCADE
    ensureEmailFkConstraints($pdo);

    // ================= GET PROFILE =================
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {

        $email = trim($_GET['email'] ?? '');

        if ($email === '') {
            respond(400, [
                'success' => false,
                'message' => 'Email is required'
            ]);
        }

        $user = fetchUser($pdo, $email);

        if (!$user) {
            respond(404, [
                'success' => false,
                'message' => 'User not found'
            ]);
        }

        respond(200, [
            'success' => true,
            'data' => $user
        ]);
    }

    // ================= UPDATE PROFILE =================
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {

        $input = json_decode(file_get_contents('php://input'), true);

        $userId = intval($input['id'] ?? 0);
        $currentEmail = trim($input['current_email'] ?? $input['currentEmail'] ?? '');
        $email = trim($input['email'] ?? '');
        $username = trim($input['username'] ?? '');
        $phone = trim($input['phone'] ?? '');
        $address = trim($input['address'] ?? '');
        $district = trim($input['district'] ?? '');
        $postalcode = trim($input['postalcode'] ?? $input['postalCode'] ?? '');

        if ($email === '') {
            respond(400, [
                'success' => false,
                'message' => 'Email is required'
            ]);
        }

        // Auto fallback username
        if ($username === '') {
            $username = explode('@', $email)[0];
        }

        // If an id or current email is provided, update that specific user record.
        // This allows admins and users to change email addresses safely.
        $currentUser = null;
        if ($userId > 0) {
            $currentUser = fetchUserById($pdo, $userId);
        } elseif ($currentEmail !== '') {
            $currentUser = fetchUserByEmail($pdo, $currentEmail);
            if ($currentUser) {
                $userId = intval($currentUser['id']);
            }
        }

        if ($currentUser) {
            $duplicateStmt = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1");
            $duplicateStmt->execute([$email, $userId]);
            $duplicateUser = $duplicateStmt->fetch(PDO::FETCH_ASSOC);

            if ($duplicateUser) {
                respond(409, [
                    'success' => false,
                    'message' => 'Another user already uses this email address'
                ]);
            }

            $stmt = $pdo->prepare("\n                UPDATE users \n                SET username = ?, email = ?, phone = ?, address = ?, district = ?, postalcode = ? \n                WHERE id = ?\n            ");

            $stmt->execute([
                $username,
                $email,
                $phone ?: null,
                $address ?: null,
                $district ?: null,
                $postalcode ?: null,
                $userId
            ]);

            $updatedUser = fetchUserById($pdo, $userId);

            respond(200, [
                'success' => true,
                'updated' => true,
                'created' => false,
                'message' => 'User updated successfully',
                'data' => $updatedUser
            ]);
        }

        // Check if email already exists in users table
        $checkStmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $checkStmt->execute([$email]);
        $existingUser = $checkStmt->fetch(PDO::FETCH_ASSOC);

        if ($existingUser) {
            // Email exists - UPDATE the user
            $stmt = $pdo->prepare("
                UPDATE users 
                SET username = ?, phone = ?, address = ?, district = ?, postalcode = ? 
                WHERE email = ?
            ");

            $stmt->execute([
                $username,
                $phone ?: null,
                $address ?: null,
                $district ?: null,
                $postalcode ?: null,
                $email
            ]);

            $updatedUser = fetchUser($pdo, $email);

            respond(200, [
                'success' => true,
                'updated' => true,
                'created' => false,
                'message' => 'Profile updated successfully',
                'data' => $updatedUser
            ]);
        } else {
            // Email does NOT exist - INSERT new user with the form values
            $insertStmt = $pdo->prepare("
                INSERT INTO users (username, email, phone, address, district, postalcode, password)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");

            // Use a placeholder password hash for users created via profile (they should have set one elsewhere)
            $placeholderPassword = password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT);

            $insertStmt->execute([
                $username,
                $email,
                $phone ?: null,
                $address ?: null,
                $district ?: null,
                $postalcode ?: null,
                $placeholderPassword
            ]);

            $newUser = fetchUser($pdo, $email);

            respond(201, [
                'success' => true,
                'updated' => false,
                'created' => true,
                'message' => 'New user profile created successfully',
                'data' => $newUser
            ]);
        }
    }

    // ================= INVALID METHOD =================
    respond(405, [
        'success' => false,
        'message' => 'Method not allowed'
    ]);

} catch (Exception $e) {
    respond(500, [
        'success' => false,
        'message' => 'Server error',
        'error' => $e->getMessage()
    ]);
}
?>