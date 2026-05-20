<?php
/**
 * Email Utility for sending product notifications
 * Uses PHPMailer if available, falls back to PHP mail()
 */

class EmailNotifier {
    private $fromEmail = 'stellarthinker75@gmail.com';
    private $fromName = 'E-Commerce Shop - New Product Alert';
    private $sendgridApiKey = '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';
    private $smtpConfig = null;
    
    public function __construct() {
        // SMTP configuration for Gmail (backup)
        $this->smtpConfig = [
            'host' => 'smtp.gmail.com',
            'port' => 587,
            'username' => 'kingpython1431@gmail.com',
            'password' => 'needforspeed'
        ];
    }
    
    /**
     * Send new product notification email
     * @param string $toEmail - Recipient email
     * @param array $product - Product details
     * @return bool - Success/failure
     */
    public function sendNewProductNotification($toEmail, $product) {
        if (!filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
            return false;
        }
        
        $subject = "🆕 New Item Added: {$product['name']} - BUY LK";
        
        $htmlBody = $this->generateProductEmailHTML($product);
        $plainTextBody = $this->generateProductEmailPlainText($product);
        
        return $this->sendEmail($toEmail, $subject, $htmlBody, $plainTextBody);
    }
    
    /**
     * Send batch email notifications to multiple subscribers
     * @param array $emails - Array of email addresses
     * @param array $product - Product details
     * @return array - Results array with success count
     */
    public function sendBatchNotifications($emails, $product) {
        $results = [
            'success' => 0,
            'failed' => 0,
            'errors' => []
        ];
        
        // Ensure logs directory exists
        $logsDir = __DIR__ . '/../logs';
        if (!is_dir($logsDir)) {
            @mkdir($logsDir, 0755, true);
        }
        $logFile = $logsDir . '/email_notifications.json';
        $logs = [];
        if (file_exists($logFile)) {
            $logs = json_decode(file_get_contents($logFile), true) ?: [];
        }
        
        foreach ($emails as $email) {
            if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $sent = $this->sendNewProductNotification($email, $product);
                
                // Log the notification attempt
                $logs[] = [
                    'timestamp' => date('Y-m-d H:i:s'),
                    'email' => $email,
                    'product_name' => $product['name'],
                    'product_id' => $product['id'],
                    'status' => $sent ? 'sent' : 'attempted'
                ];
                
                if ($sent) {
                    $results['success']++;
                } else {
                    $results['failed']++;
                    $results['errors'][] = "Failed to send to: $email";
                }
            } else {
                $results['failed']++;
                $results['errors'][] = "Invalid email: $email";
            }
        }
        
        // Save logs
        @file_put_contents($logFile, json_encode($logs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        
        return $results;
    }

    /**
     * Send an order status update email to a customer
     * @param string $toEmail
     * @param int $orderId
     * @param string $status
     * @param string $customerName
     * @return bool
     */
    public function sendOrderStatusEmail($toEmail, $orderId, $status, $customerName = 'Customer', $items = [], $orderTotal = 0.0, $shippingCost = 0.0) {
        if (!filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        $subject = "Order #{$orderId} status updated — {$status} - BUY LK";

                $orderUrl = 'http://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . '/E%20commerce/New-folder/front/account.html';

                // Prefer embedding the local logo as base64 so email clients display it reliably.
                $localLogoPath = __DIR__ . '/../../front/assests/logo.png';
                $logoSrc = '';
                if (file_exists($localLogoPath) && is_readable($localLogoPath)) {
                    $logoData = base64_encode(file_get_contents($localLogoPath));
                    $finfoType = function_exists('mime_content_type') ? mime_content_type($localLogoPath) : 'image/png';
                    $logoSrc = 'data:' . ($finfoType ?: 'image/png') . ';base64,' . $logoData;
                } else {
                    // Fallback to absolute URL
                    $logoSrc = 'http://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . '/E%20commerce/New-folder/front/assests/logo.png';
                }

                $escapedName = htmlspecialchars($customerName);
                $escapedStatus = htmlspecialchars($status);
                $escapedOrderId = intval($orderId);

                // Build items HTML
                $itemsHtml = '';
                $computedSubtotal = 0.0;
                if (is_array($items) && count($items) > 0) {
                    $itemsHtml .= "<table style=\"width:100%; border-collapse:collapse; margin-top:12px;\">";
                    $itemsHtml .= "<thead><tr style=\"text-align:left; border-bottom:1px solid #eee;\"><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>";
                    foreach ($items as $it) {
                        $pname = htmlspecialchars($it['product_name'] ?? 'Product');
                        $psize = isset($it['product_size']) && $it['product_size'] ? ' (' . htmlspecialchars($it['product_size']) . ')' : '';
                        $qty = intval($it['quantity'] ?? 0);
                        $unit = number_format(floatval($it['price'] ?? 0), 2);
                        $lineTotal = $qty * floatval($it['price'] ?? 0);
                        $computedSubtotal += $lineTotal;
                        $itemsHtml .= "<tr style=\"border-bottom:1px solid #f4f4f4;\">";
                        $itemsHtml .= "<td style=\"padding:8px 0;\">{$pname}{$psize}</td>";
                        $itemsHtml .= "<td style=\"padding:8px 0;\">{$qty}</td>";
                        $itemsHtml .= "<td style=\"padding:8px 0;\">LKR {$unit}</td>";
                        $itemsHtml .= "<td style=\"padding:8px 0;\">LKR " . number_format($lineTotal, 2) . "</td>";
                        $itemsHtml .= "</tr>";
                    }
                    $itemsHtml .= "</tbody></table>";
                } else {
                    $itemsHtml = '<p style="color:#666;">No item details available.</p>';
                }

                $displaySubtotal = number_format($computedSubtotal, 2);
                $displayShipping = number_format(floatval($shippingCost), 2);

                // If orderTotal from DB is zero or missing, derive it from computed subtotal + shipping
                $effectiveOrderTotal = floatval($orderTotal);
                if ($effectiveOrderTotal <= 0) {
                    $effectiveOrderTotal = $computedSubtotal + floatval($shippingCost);
                }
                $displayOrderTotal = number_format($effectiveOrderTotal, 2);

                $htmlBody = <<<HTML
<!doctype html>
<html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order #{$escapedOrderId} — Status updated</title>
        <style>
            body { margin:0; padding:0; background:#f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; }
            .email-wrap { width:100%; padding:20px 0; }
            .email-body { max-width:680px; margin:0 auto; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 4px 16px rgba(0,0,0,0.08); }
            .email-header { background:linear-gradient(90deg,#FF8C00,#ffb347); padding:18px 24px; display:flex; align-items:center; }
            .brand { display:flex; align-items:center; gap:12px; }
            .brand img { width:48px; height:48px; object-fit:contain; border-radius:6px; }
            .brand h1 { font-size:18px; color:#fff; margin:0; letter-spacing:0.4px; }
            .email-content { padding:22px 24px; color:#333; }
            .greeting { font-size:16px; margin:0 0 12px 0; }
            .status-badge { display:inline-block; padding:8px 12px; border-radius:20px; background:#e7f6ff; color:#0066cc; font-weight:600; margin:12px 0; }
            .order-card { border:1px solid #f0f0f0; padding:14px; border-radius:6px; background:#fafafa; margin:12px 0; }
            .order-meta { font-size:14px; color:#555; margin:8px 0; }
            .cta { display:inline-block; margin-top:14px; background:#FF8C00; color:#fff; text-decoration:none; padding:12px 18px; border-radius:6px; font-weight:600; }
            .footer { padding:16px 24px; font-size:12px; color:#888; background:#fbfbfb; text-align:center; }
            @media (max-width:480px) {
                .email-body { margin:0 12px; }
                .brand h1 { font-size:16px; }
            }
        </style>
    </head>
    <body>
        <div class="email-wrap">
            <div class="email-body">
                <div class="email-header">
                    <div class="brand">
                        <img src="{$logoSrc}" alt="BUY LK logo" />
                        <h1>BUY LK — Order Update</h1>
                    </div>
                </div>
                <div class="email-content">
                    <p class="greeting">Hi {$escapedName},</p>
                    <p>Your order <strong>#{$escapedOrderId}</strong> status has been updated.</p>
                    <div class="status-badge">{$escapedStatus}</div>

                    <div class="order-card">
                        <div class="order-meta"><strong>Order ID:</strong> #{$escapedOrderId}</div>
                        <div class="order-meta"><strong>Status:</strong> {$escapedStatus}</div>
                        <div class="order-meta"><strong>Customer:</strong> {$escapedName}</div>

                        {$itemsHtml}

                        <div style="margin-top:12px; text-align:right; font-weight:600;">
                            <div>Subtotal: LKR {$displaySubtotal}</div>
                            <div>Shipping: LKR {$displayShipping}</div>
                            <div style="margin-top:8px; font-size:1.05rem;">Order Total: LKR {$displayOrderTotal}</div>
                        </div>

                        <p style="margin-top:8px;">You can view the full details and tracking information in your account.</p>
                        <a class="cta" href="{$orderUrl}">View your order</a>
                    </div>

                    <p style="color:#666; font-size:13px; margin-top:12px;">If you have any questions, reply to this email or visit our <a href="{$orderUrl}">support page</a>.</p>
                </div>
                <div class="footer">© 2026 BUY LK. All rights reserved.</div>
            </div>
        </div>
    </body>
</html>
HTML;

        $plainText = "Hi {$customerName},\n\nYour order #{$orderId} status has been updated to {$status}.\n\nView your orders: {$orderUrl}\n\nThanks,\nBUY LK";

        return $this->sendEmail($toEmail, $subject, $htmlBody, $plainText);
    }
    
    /**
     * Generate HTML email body for product notification
     */
    private function generateProductEmailHTML($product) {
        $productName = htmlspecialchars($product['name']);
        $productPrice = htmlspecialchars($product['price']);
        $productCategory = htmlspecialchars($product['category']);
        $productDescription = htmlspecialchars($product['description']);
        $productImage = htmlspecialchars($product['image'] ?? 'https://via.placeholder.com/300x200?text=New+Product');
        $productTag = htmlspecialchars($product['tag'] ?? 'New');
        
        $shopUrl = 'http://' . $_SERVER['HTTP_HOST'] . '/E%20commerce/New-folder/front/shop.html';
        
        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Product Alert - BUY LK</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #FF8C00;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #FF8C00;
            margin: 0;
            font-size: 28px;
        }
        .header p {
            color: #666;
            margin: 5px 0 0 0;
            font-size: 14px;
        }
        .product-section {
            background-color: #f9f9f9;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #FF8C00;
        }
        .product-image {
            text-align: center;
            margin-bottom: 20px;
        }
        .product-image img {
            max-width: 100%;
            height: auto;
            border-radius: 6px;
            max-height: 250px;
        }
        .product-details {
            margin: 20px 0;
        }
        .product-name {
            font-size: 24px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
        }
        .product-tag {
            display: inline-block;
            background-color: #FF8C00;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .product-category {
            color: #666;
            font-size: 14px;
            margin-bottom: 10px;
        }
        .product-description {
            color: #555;
            font-size: 14px;
            margin-bottom: 15px;
            line-height: 1.6;
        }
        .product-price {
            font-size: 22px;
            color: #FF8C00;
            font-weight: bold;
            margin-bottom: 20px;
        }
        .cta-button {
            display: inline-block;
            background-color: #FF8C00;
            color: white;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 16px;
            text-align: center;
            width: 100%;
            box-sizing: border-box;
        }
        .cta-button:hover {
            background-color: #E67E00;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #999;
        }
        .unsubscribe {
            margin-top: 15px;
            font-size: 11px;
        }
        .unsubscribe a {
            color: #FF8C00;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🆕 New Product Alert!</h1>
            <p>A new item has been added to BUY LK</p>
        </div>
        
        <div class="product-section">
            <div class="product-image">
                <img src="$productImage" alt="$productName">
            </div>
            
            <div class="product-details">
                <span class="product-tag">$productTag</span>
                
                <div class="product-name">$productName</div>
                
                <div class="product-category">Category: $productCategory</div>
                
                <div class="product-description">$productDescription</div>
                
                <div class="product-price">LKR $productPrice</div>
                
                <a href="$shopUrl" class="cta-button">View Product in Shop</a>
            </div>
        </div>
        
        <div class="footer">
            <p>Thanks for staying updated with BUY LK!</p>
            <p>We regularly add new products to our shop. This is one of them.</p>
            <div class="unsubscribe">
                <p>If you no longer wish to receive these notifications, you can unsubscribe anytime.</p>
            </div>
        </div>
    </div>
</body>
</html>
HTML;
    }
    
    /**
     * Generate plain text email body for product notification
     */
    private function generateProductEmailPlainText($product) {
        $shopUrl = 'http://' . $_SERVER['HTTP_HOST'] . '/E%20commerce/New-folder/front/shop.html';
        
        return <<<TEXT
NEW PRODUCT ALERT - BUY LK

We're excited to announce a new item in our shop!

PRODUCT DETAILS:
================
Name: {$product['name']}
Category: {$product['category']}
Price: LKR {$product['price']}
Tag: {$product['tag']}

Description: {$product['description']}

View the product and shop now at: $shopUrl

Thanks for being a valued subscriber!
BUY LK Team

---
If you no longer wish to receive these emails, you can unsubscribe anytime.
TEXT;
    }
    
    /**
     * Send email using Sendgrid API (primary), PHP mail (secondary fallback)
     * Gmail SMTP is NOT reliable on local environments
     */
    private function sendEmail($toEmail, $subject, $htmlBody, $plainTextBody) {
        try {
            // Primary: Try Sendgrid API
            if (!empty($this->sendgridApiKey)) {
                error_log("Attempting to send email via Sendgrid to: $toEmail");
                $result = $this->sendViaSendgrid($toEmail, $subject, $htmlBody);
                if ($result) {
                    error_log("✅ Sendgrid email sent successfully to: $toEmail");
                    return true;
                }
                error_log("⚠️ Sendgrid failed for $toEmail, trying PHP mail fallback");
            }
            
            // Fallback 1: Use PHP mail() - most reliable on local XAMPP
            error_log("Attempting to send email via PHP mail() to: $toEmail");
            $result = $this->sendViaPhpMail($toEmail, $subject, $htmlBody, $plainTextBody);
            if ($result) {
                error_log("✅ PHP mail() sent successfully to: $toEmail");
                return $result;
            }
            
            // Fallback 2: Try Gmail SMTP as last resort
            error_log("Attempting to send email via Gmail SMTP to: $toEmail");
            if (!empty($this->smtpConfig['username']) && !empty($this->smtpConfig['password'])) {
                $result = $this->sendViaGmailSMTP($toEmail, $subject, $htmlBody);
                if ($result) {
                    error_log("✅ Gmail SMTP sent successfully to: $toEmail");
                    return true;
                }
            }
            
            error_log("❌ All email methods failed for: $toEmail");
            return false;
        } catch (Exception $e) {
            // Log the error but don't throw - email failures shouldn't block product creation
            error_log("❌ Email send error for $toEmail: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Send email using Gmail SMTP
     */
    private function sendViaGmailSMTP($toEmail, $subject, $htmlBody) {
        try {
            require_once __DIR__ . '/GmailSMTP.php';
            
            $smtp = new GmailSMTP(
                $this->smtpConfig['username'],
                $this->smtpConfig['password']
            );
            
            return $smtp->sendEmail($toEmail, $subject, $htmlBody, $this->fromEmail, $this->fromName);
        } catch (Exception $e) {
            error_log("Gmail SMTP error: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Send email using Sendgrid API
     */
    private function sendViaSendgrid($toEmail, $subject, $htmlBody) {
        try {
            require_once __DIR__ . '/SendgridAPI.php';
            
            $sendgrid = new SendgridAPI($this->sendgridApiKey);
            $result = $sendgrid->sendEmail($toEmail, $subject, $htmlBody, $this->fromEmail, $this->fromName);
            
            if ($result) {
                error_log("Sendgrid: Email sent successfully to $toEmail");
            } else {
                error_log("Sendgrid: Failed to send email to $toEmail");
            }
            
            return $result;
        } catch (Exception $e) {
            error_log("Sendgrid API error: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Send email using PHPMailer (requires installation)
     */
    private function sendViaPhpMailer($toEmail, $subject, $htmlBody, $plainTextBody) {
        require_once __DIR__ . '/../../vendor/autoload.php';
        
        $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
        
        try {
            // Configure SMTP if credentials provided
            if (!empty($this->smtpConfig['username'])) {
                $mail->isSMTP();
                $mail->Host = $this->smtpConfig['host'];
                $mail->SMTPAuth = true;
                $mail->Username = $this->smtpConfig['username'];
                $mail->Password = $this->smtpConfig['password'];
                $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
                $mail->Port = $this->smtpConfig['port'];
            }
            
            $mail->setFrom($this->fromEmail, $this->fromName);
            $mail->addAddress($toEmail);
            $mail->Subject = $subject;
            $mail->Body = $htmlBody;
            $mail->AltBody = $plainTextBody;
            $mail->isHTML(true);
            
            return $mail->send();
        } catch (Exception $e) {
            error_log("PHPMailer error: " . $mail->ErrorInfo);
            return false;
        }
    }
    
    /**
     * Send email using PHP mail() function
     * Suppresses warnings since mail server may not be configured
     */
    private function sendViaPhpMail($toEmail, $subject, $htmlBody, $plainTextBody) {
        $headers = "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $headers .= "From: {$this->fromName} <{$this->fromEmail}>\r\n";
        $headers .= "Reply-To: {$this->fromEmail}\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
        
        // Encode subject
        $subject = "=?UTF-8?B?" . base64_encode($subject) . "?=";
        
        // Use @ to suppress mail server warnings (product creation shouldn't fail due to mail config)
        $result = @mail($toEmail, $subject, $htmlBody, $headers);
        
        if (!$result) {
            // Log if mail() failed but don't throw exception
            error_log("mail() failed for $toEmail - mail server may not be configured");
        }
        
        return $result;
    }
}

?>
