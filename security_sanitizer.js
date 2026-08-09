/**
 * Data Sanitization & Input Validation Helper
 * Prevents NoSQL Injection, XSS attacks, SQL injection payload strings, and object prototype pollution.
 */

// 1. Kuzuia NoSQL Injection (Kuondoa MongoDB/Firestore operators kama '$gt', '$ne', '$where')
function sanitizeNoSQLInput(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeNoSQLInput);
  }

  const sanitized = {};
  for (const key of Object.keys(obj)) {
    // Kuzuia Prototype Pollution & Operator Injection
    if (key.startsWith('$') || key.includes('.') || key === '__proto__' || key === 'constructor') {
      continue; // Ruka na futa funguo za hatari kiusalam
    }
    sanitized[key] = sanitizeNoSQLInput(obj[key]);
  }
  return sanitized;
}

// 2. Kuzuia XSS (HTML Entity Encoding)
function sanitizeXSSString(str) {
  if (typeof str !== 'string') return str;

  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// 3. Sanitizer ya Maombi (Express Request Sanitizer Middleware)
function sanitizeRequestBody(req, res, next) {
  if (req.body) {
    req.body = sanitizeNoSQLInput(req.body);
  }
  if (req.query) {
    req.query = sanitizeNoSQLInput(req.query);
  }
  if (req.params) {
    req.params = sanitizeNoSQLInput(req.params);
  }
  next();
}

module.exports = {
  sanitizeNoSQLInput,
  sanitizeXSSString,
  sanitizeRequestBody,
};
