/**
 * Comprehensive Automated Tests for Authentication & Multi-Tier KYC System
 */

const { AuthService } = require('../auth_service');
const { KYCService } = require('../kyc_service');
const { encryptText, decryptText, hashPII } = require('../crypto_helper');

describe('Crypto Helper PII Encryption & Hashing', () => {
  test('Encrypts and decrypts sensitive NIDA numbers accurately', () => {
    const nidaNumber = '19900101-12345-00001-12';
    const encrypted = encryptText(nidaNumber);

    expect(encrypted).not.toBe(nidaNumber);
    expect(encrypted.split(':').length).toBe(3); // IV:AuthTag:Ciphertext

    const decrypted = decryptText(encrypted);
    expect(decrypted).toBe(nidaNumber);
  });

  test('Generates deterministic HMAC hash for lookup without decryption', () => {
    const id1 = '19900101-12345-00001-12';
    const hash1 = hashPII(id1);
    const hash2 = hashPII(id1);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 Hex
  });
});

describe('Auth Service - Registration, Login & Logout (Token Revocation)', () => {
  let authService;

  beforeEach(() => {
    authService = new AuthService();
  });

  test('Registers a new user with hashed passwords', async () => {
    const user = await authService.registerUser({
      email: 'user@example.com',
      password: 'StrongPassword123!',
      displayName: 'Juma Hamisi',
      phoneNumber: '+255712345678',
    });

    expect(user.uid).toBeDefined();
    expect(user.kycTier).toBe(0);
  });

  test('Logins successfully and validates session', async () => {
    await authService.registerUser({
      email: 'user@example.com',
      password: 'StrongPassword123!',
      displayName: 'Juma Hamisi',
    });

    const loginRes = await authService.loginUser({
      email: 'user@example.com',
      password: 'StrongPassword123!',
    });

    expect(loginRes.sessionToken).toBeDefined();
    const session = authService.validateSession(loginRes.sessionToken);
    expect(session.email).toBe('user@example.com');
  });

  test('Revokes session token on logout (Prevents Replay Attack)', async () => {
    await authService.registerUser({
      email: 'user@example.com',
      password: 'StrongPassword123!',
    });

    const { sessionToken } = await authService.loginUser({
      email: 'user@example.com',
      password: 'StrongPassword123!',
    });

    await authService.logoutUser(sessionToken);

    // Kujaribu kutumia token iliyofutwa lazima ikataliwe!
    expect(() => authService.validateSession(sessionToken)).toThrow('Session hii imefutwa au kutolewa mfumoni');
  });
});

describe('Multi-Tier KYC & Compliance Engine', () => {
  let kycService;
  const uid = 'usr_test123';

  beforeEach(() => {
    kycService = new KYCService();
  });

  test('Completes Tier 1 OTP Verification', async () => {
    const res = await kycService.submitTier1Verification(uid, {
      emailOtp: '123456',
      phoneOtp: '123456',
    });

    expect(res.currentTier).toBe(1);
    expect(res.tier1Status).toBe('VERIFIED');
  });

  test('Submits Tier 2 Government ID & Selfie with encrypted PII', async () => {
    await kycService.submitTier1Verification(uid, {
      emailOtp: '123456',
      phoneOtp: '123456',
    });

    const tier2Res = await kycService.submitTier2Verification(uid, {
      docType: 'NIDA',
      idNumber: '19951010-11111-22222-33',
      fullName: 'Amina Salum',
      dob: '1995-10-10',
      selfieUrl: 'https://cdn.domain.com/selfies/amina.jpg',
      documentFrontUrl: 'https://cdn.domain.com/docs/nida_front.jpg',
    });

    expect(tier2Res.tier2Status).toBe('PENDING_REVIEW');

    const appData = kycService.getOrCreateApplication(uid);
    expect(appData.tier2Data.encryptedIdNumber).not.toBe('19951010-11111-22222-33');
    expect(decryptText(appData.tier2Data.encryptedIdNumber)).toBe('19951010-11111-22222-33');
  });

  test('Admin Reviews and Approves Tier 2 & Tier 3 KYC Applications', async () => {
    await kycService.submitTier1Verification(uid, {
      emailOtp: '123456',
      phoneOtp: '123456',
    });

    await kycService.submitTier2Verification(uid, {
      docType: 'PASSPORT',
      idNumber: 'AB123456',
      fullName: 'Amina Salum',
      dob: '1995-10-10',
      selfieUrl: 'https://cdn.domain.com/selfies/amina.jpg',
      documentFrontUrl: 'https://cdn.domain.com/docs/passport.jpg',
    });

    // Admin approves Tier 2
    const adminRes = await kycService.adminReviewKYC('admin_uid_001', {
      targetUid: uid,
      targetTier: 2,
      decision: 'APPROVED',
    });

    expect(adminRes.currentTier).toBe(2);
    expect(adminRes.status).toBe('APPROVED');

    // Submit Tier 3 Proof of Address
    await kycService.submitTier3Verification(uid, {
      proofOfAddressUrl: 'https://cdn.domain.com/docs/utility_bill.pdf',
      utilityBillType: 'ELECTRICITY',
    });

    // Admin approves Tier 3
    const tier3AdminRes = await kycService.adminReviewKYC('admin_uid_001', {
      targetUid: uid,
      targetTier: 3,
      decision: 'APPROVED',
    });

    expect(tier3AdminRes.currentTier).toBe(3);
  });
});
