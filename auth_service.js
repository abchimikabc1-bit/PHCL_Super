/**
 * Authentication & Session Management Service
 * Handles secure Registration, Password Hashing, Login, Token Revocation (Logout), and Session Timeout.
 */

const crypto = require('crypto');

// In-Memory Token Blacklist for Revoked Sessions (In Production, use Redis / Firestore)
const revokedTokenBlacklist = new Set();
const userSessions = new Map();

// Helper to hash passwords securely using PBKDF2 with unique salt
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(originalHash));
}

class AuthService {
  constructor() {
    this.usersDb = new Map(); // Simulated user database store
  }

  // 1. REGISTRATION: Sajili Mtumiaji Mpya kwa Passwords Zilizosimbwa
  async registerUser({ email, password, displayName, phoneNumber }) {
    if (!email || !password || password.length < 8) {
      throw new Error('Barua pepe na Nenosiri halali (angalau herufi 8) vinahitajika.');
    }

    if (this.usersDb.has(email.toLowerCase())) {
      throw new Error('Barua pepe hii imeshachukuliwa tayari.');
    }

    const userId = `usr_${crypto.randomBytes(8).toString('hex')}`;
    const passwordHash = hashPassword(password);

    const newUser = {
      uid: userId,
      email: email.toLowerCase(),
      displayName,
      phoneNumber,
      passwordHash,
      emailVerified: false,
      phoneVerified: false,
      role: 'user',
      kycTier: 0,
      createdAt: new Date().toISOString(),
    };

    this.usersDb.set(email.toLowerCase(), newUser);
    return { uid: newUser.uid, email: newUser.email, kycTier: newUser.kycTier };
  }

  // 2. LOGIN: Kuingia Mfumoni na Kutoa Token ya Session
  async loginUser({ email, password }) {
    const user = this.usersDb.get(email.toLowerCase());
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new Error('Taarifa za kuingia hazijathibitishwa (Barua pepe au Nenosiri sio sahihi).');
    }

    // Tengeneza Secure Session Token
    const sessionToken = `session_${crypto.randomBytes(32).toString('hex')}`;
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // Masaa 24

    userSessions.set(sessionToken, {
      uid: user.uid,
      email: user.email,
      role: user.role,
      kycTier: user.kycTier,
      expiresAt,
    });

    return {
      sessionToken,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        kycTier: user.kycTier,
        role: user.role,
      },
    };
  }

  // 3. LOGOUT: Kutoka Mfumoni na Kufuta Token Kwenye Blacklist (Prevent Token Replay)
  async logoutUser(sessionToken) {
    if (sessionToken) {
      userSessions.delete(sessionToken);
      revokedTokenBlacklist.add(sessionToken);
    }
    return { message: 'Umetoka mfumoni kwa usalama.' };
  }

  // 4. HAKIKI TOKEN YA SESSION
  validateSession(sessionToken) {
    if (!sessionToken || revokedTokenBlacklist.has(sessionToken)) {
      throw new Error('Session hii imefutwa au kutolewa mfumoni (Revoked).');
    }

    const session = userSessions.get(sessionToken);
    if (!session) {
      throw new Error('Session hii haijulikani. Tafadhali ingia tena.');
    }

    if (Date.now() > session.expiresAt) {
      userSessions.delete(sessionToken);
      revokedTokenBlacklist.add(sessionToken);
      throw new Error('Session imemaliza muda wake (Timed out). Tafadhali ingia tena.');
    }

    return session;
  }
}

module.exports = {
  AuthService,
  revokedTokenBlacklist,
  userSessions,
};
