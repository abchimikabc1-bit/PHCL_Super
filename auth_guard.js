/**
 * Authentication & Authorization Guard Middleware
 * Verifies JWT / Firebase Auth tokens, checks email verification, and enforces Role-Based Access Control (RBAC).
 */

const admin = require('firebase-admin');

// Middleware ya Hakiki ya Token (Bearer Token Verification)
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Haujaidhinishwa: Unahitaji kutuma Bearer Token halali.',
    });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    // Hakiki token kupitia Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken, true);

    // Kuzuia watumiaji ambao hawajathibitisha barua pepe yao
    if (!decodedToken.email_verified) {
      return res.status(403).json({
        error: 'Ufikiaji Umekataliwa: Lazima uthibitishe barua pepe yako kwanza.',
      });
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Hitilafu ya Hakiki ya Token:', error.message);
    return res.status(401).json({
      error: 'Token Sio Halali au Imemaliza Muda wake.',
    });
  }
}

// Middleware ya Hakiki ya Cheo (Role-Based Authorization)
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Mtumiaji haijatambulika.' });
    }

    const userRole = req.user.role || 'user';

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'Ufikiaji Umekataliwa: Huna haki (permissions) za kufanya kitendo hiki.',
      });
    }

    next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};
