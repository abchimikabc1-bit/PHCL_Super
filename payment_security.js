/**
 * Payment Security & Webhook HMAC Verification Helper
 * Verifies SHA-256 HMAC Signatures on M-Pesa & Card Gateway Callbacks, preventing Double-Spending and Forgery.
 */

const crypto = require('crypto');

const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || 'secure_payment_webhook_secret_key_2026';
const processedTxHashes = new Set(); // Replay Attack Prevention & Idempotency Store

/**
 * Computes SHA-256 HMAC Signature for payment payloads
 */
function generatePayloadSignature(payload) {
  const dataString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto.createHmac('sha256', WEBHOOK_SECRET).update(dataString).digest('hex');
}

/**
 * Validates incoming webhook signature against calculated HMAC signature
 */
function verifyWebhookSignature(payload, signatureHeader) {
  if (!signatureHeader) return false;
  const expectedSignature = generatePayloadSignature(payload);

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (e) {
    return false;
  }
}

/**
 * Idempotency Check: Prevents Replay Attacks / Double Spending
 */
function isTransactionProcessed(transactionId) {
  if (processedTxHashes.has(transactionId)) {
    return true;
  }
  processedTxHashes.add(transactionId);
  return false;
}

module.exports = {
  generatePayloadSignature,
  verifyWebhookSignature,
  isTransactionProcessed,
  processedTxHashes,
};
