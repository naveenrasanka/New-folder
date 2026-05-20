<?php
/**
 * Sendgrid Email Sender
 * Uses Sendgrid API v3 to send emails
 */

class SendgridAPI {
    private $apiKey;
    private $apiUrl = 'https://api.sendgrid.com/v3/mail/send';
    
    public function __construct($apiKey) {
        $this->apiKey = $apiKey;
    }
    
    /**
     * Send email via Sendgrid API
     */
    public function sendEmail($to, $subject, $htmlBody, $fromEmail, $fromName) {
        try {
            $payload = [
                'personalizations' => [
                    [
                        'to' => [
                            [
                                'email' => $to,
                                'name' => $to
                            ]
                        ],
                        'subject' => $subject
                    ]
                ],
                'from' => [
                    'email' => $fromEmail,
                    'name' => $fromName
                ],
                'content' => [
                    [
                        'type' => 'text/html',
                        'value' => $htmlBody
                    ]
                ],
                'reply_to' => [
                    'email' => $fromEmail,
                    'name' => $fromName
                ]
            ];
            
            // Send via cURL
            $ch = curl_init($this->apiUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $this->apiKey,
                'Content-Type: application/json'
            ]);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);
            
            // Debug output to global debug variable if in test mode
            if (defined('DEBUG_MODE') && DEBUG_MODE) {
                global $debugOutput;
                $debugOutput .= "[Sendgrid] HTTP Code: $httpCode\n";
                $debugOutput .= "[Sendgrid] Response: " . substr($response, 0, 500) . "\n";
                if ($curlError) {
                    $debugOutput .= "[Sendgrid] cURL Error: $curlError\n";
                }
            }
            
            // Sendgrid returns 202 for accepted
            if ($httpCode === 202) {
                return true;
            } else if ($httpCode >= 400) {
                error_log("Sendgrid API Error [$httpCode]: $response");
                return false;
            } else if ($curlError) {
                error_log("Sendgrid cURL Error: $curlError");
                return false;
            }
            
            return true;
        } catch (Exception $e) {
            error_log("Sendgrid Exception: " . $e->getMessage());
            return false;
        }
    }
}
?>
