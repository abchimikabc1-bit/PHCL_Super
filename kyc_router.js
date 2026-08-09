/**
 * Auth & Multi-Tier KYC Controller Router (Updated with Liveness Selfie Verification)
 */

const express = require('express');
const { AuthService } = require('./auth_service');
const { KYCService } = require('./kyc_service');
const { LivenessDetector } = require('./liveness_detector');
const { authLimiter } = require('./security_middleware');
const { sanitizeRequestBody } = require('./security_sanitizer');

const router = express.Router();
const authService = new AuthService();
const kycService = new KYCService();

router.use(express.json());
router.use(sanitizeRequestBody);

function requireSession(req, res, next) {
  try {
    const token = req.headers['x-session-token'];
    req.session = authService.validateSession(token);
    next();
  } catch (err) {
    res.status(401).json({ success: false, error: err.message });
  }
}

// 1. REGISTER
router.post('/auth/register', async (req, res) => {
  try {
    const result = await authService.registerUser(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 2. LOGIN
router.post('/auth/login', authLimiter, async (req, res) => {
  try {
    const result = await authService.loginUser(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(401).json({ success: false, error: error.message });
  }
});

// 3. LOGOUT
router.post('/auth/logout', async (req, res) => {
  try {
    const sessionToken = req.headers['x-session-token'];
    const result = await authService.logoutUser(sessionToken);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 4. LIVENESS SELFIE VERIFICATION ENDPOINT
router.post('/kyc/liveness-check', requireSession, async (req, res) => {
  try {
    const { frames, challengesCompleted } = req.body;
    const livenessResult = LivenessDetector.verifyLiveness(frames, challengesCompleted);

    if (!livenessResult.isLive) {
      return res.status(400).json({
        success: false,
        error: livenessResult.reason,
        confidenceScore: livenessResult.confidenceScore,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Uhakiki wa Liveness Selfie umefanikiwa 100%!',
      confidenceScore: livenessResult.confidenceScore,
      livenessToken: `live_tok_${Date.now()}`,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 5. KYC TIER 1 SUBMISSION
router.post('/kyc/tier1', requireSession, async (req, res) => {
  try {
    const result = await kycService.submitTier1Verification(req.session.uid, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 6. KYC TIER 2 SUBMISSION (Requires Liveness Verification Token)
router.post('/kyc/tier2', requireSession, async (req, res) => {
  try {
    const { docType, idNumber, fullName, dob, selfieUrl, documentFrontUrl, livenessToken } = req.body;

    if (!livenessToken) {
      return res.status(400).json({
        success: false,
        error: 'Ufikiaji Umekataliwa: Lazima ukamilishe Liveness Selfie Capture kwanza kabla ya kuwasilisha Tier 2.',
      });
    }

    const result = await kycService.submitTier2Verification(req.session.uid, {
      docType,
      idNumber,
      fullName,
      dob,
      selfieUrl,
      documentFrontUrl,
    });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 7. KYC TIER 3 SUBMISSION
router.post('/kyc/tier3', requireSession, async (req, res) => {
  try {
    const result = await kycService.submitTier3Verification(req.session.uid, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 8. GET KYC STATUS
router.get('/kyc/status', requireSession, async (req, res) => {
  const status = kycService.getOrCreateApplication(req.session.uid);
  res.status(200).json({ success: true, data: status });
});

// 9. ADMIN REVIEW ENDPOINT
router.post('/admin/kyc/review', requireSession, async (req, res) => {
  if (req.session.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Haujaidhinishwa: Unahitaji haki za Admin.' });
  }

  try {
    const result = await kycService.adminReviewKYC(req.session.uid, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = { router, authService, kycService };
