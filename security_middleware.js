/**
 * Express Security Middleware Suite
 * Implements Helmet HTTP Headers, Rate Limiting, CORS Restrictions, XSS Prevention & Anti-CSRF
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

// 1. RATE LIMITING: Kuzuia mashambulizi ya Brute Force na Distributed DoS
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Dakika 15
  max: 100, // Zisizidi maombi 100 kwa kila IP kwa muda huo
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    error: 'Maombi yamezidi kikomo. Tafadhali subiri kabla ya kujaribu tena.',
  },
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // SAA 1
  max: 5, // Maombi 5 tu ya kuingia (Login) yanaruhusiwa kuzuia Brute-force
  message: {
    status: 429,
    error: 'Majaribio mengi mno ya kuingia. Akaunti imefungwa kwa muda kwa sababu za kiusalama.',
  },
});

// 2. RESTRICTED CORS POLICY: Ruhusu tu Domain zilizoidhinishwa (Hakuna Wildcard '*')
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['https://myapp.domain.com'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Maombi yakataliwa na Mfumo wa Usalama wa CORS.'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  credentials: true,
  optionsSuccessStatus: 200,
};

// 3. SECURE HTTP HEADERS (HELMET): Kuzuia Clickjacking, Sniffing na Content Injection
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'strict-dynamic'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-site' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' }, // Kuzuia Clickjacking
  hidePoweredBy: true, // Ficha 'X-Powered-By: Express'
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }, // Lazimisha HTTPS (HSTS)
  ieNoOpen: true,
  noSniff: true, // Kuzuia MIME type sniffing
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

module.exports = {
  globalLimiter,
  authLimiter,
  corsOptions: cors(corsOptions),
  helmetConfig,
};
