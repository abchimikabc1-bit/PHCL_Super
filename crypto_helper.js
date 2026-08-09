/**
 * AES-256-GCM Encryption & Decryption Helper
 * Encrypts sensitive PII (NIDA numbers, Passport IDs, Tax Numbers) before database persistence.
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY = process.env.ENCRYPTION_SECRET
  ? Buffer.from(process.env.ENCRYPTION_SECRET, 'hex')
  : crypto.scryptSync('default_secure_passphrase_change_in_production', 'salt_salt', 32);

/**
 * Encrypts plain text string into hex payload with IV and AuthTag
 */
function encryptText(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts encrypted payload back to plain text
 */
function decryptText(encryptedPayload) {
  if (!encryptedPayload || !encryptedPayload.includes(':')) return encryptedPayload;
  const [ivHex, authTagHex, encryptedText] = encryptedPayload.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Computes deterministic HMAC hash for searching without decrypting
 */
function hashPII(text) {
  if (!text) return text;
  return crypto.createHmac('sha256', SECRET_KEY).update(text.trim()).digest('hex');
}

module.exports = {
  encryptText,
  decryptText,
  hashPII,
};
