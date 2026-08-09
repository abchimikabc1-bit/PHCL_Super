/**
 * Express Controller Router for User Wallets & Master PHCL Treasury
 */

const express = require('express');
const { walletService } = require('./wallet_service');
const { sanitizeRequestBody } = require('./security_sanitizer');

const router = express.Router();

router.use(express.json());
router.use(sanitizeRequestBody);

// 1. GET USER WALLET BALANCE & RECENT TRANSACTIONS
router.get('/wallet/balance', (req, res) => {
  try {
    const userUid = req.headers['x-user-uid'] || 'usr_demo_01';
    const walletInfo = walletService.getWalletInfo(userUid);
    res.status(200).json({ success: true, data: walletInfo });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 2. GET MASTER PHCL TREASURY INFO (ADMIN ONLY)
router.get('/wallet/master-phcl', (req, res) => {
  try {
    const userRole = req.headers['x-user-role'] || 'user';
    if (userRole !== 'admin') {
      return res.status(403).json({ success: false, error: '🛑 Ufikiaji Umekataliwa: Ukurasa wa Master PHCL Treasury unaruhusiwa kwa Admin pekee.' });
    }
    const treasury = walletService.getMasterPhclTreasuryInfo();
    res.status(200).json({ success: true, data: treasury });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 3. RECOVER WALLET PASSPHRASE VIA EMAIL OTP & LIVENESS
router.post('/wallet/recover', (req, res) => {
  try {
    const userUid = req.headers['x-user-uid'] || 'usr_demo_01';
    const { emailOtp, livenessVerified } = req.body;

    const result = walletService.recoverWalletPassphrase(userUid, { emailOtp, livenessVerified });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 4. CHANGE USER TRANSACTION PIN WITH DOUBLE-ENTRY CONFIRMATION
router.post('/wallet/change-pin', (req, res) => {
  try {
    const userUid = req.headers['x-user-uid'] || 'usr_demo_01';
    const { currentPin, newPin, confirmNewPin } = req.body;
    const result = walletService.changeUserTransactionPin(userUid, currentPin, newPin, confirmNewPin);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 5. CHANGE ADMIN MASTER PASSWORD WITH DOUBLE-ENTRY CONFIRMATION
router.post('/wallet/change-admin-password', (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    const result = walletService.changeAdminPassword(currentPassword, newPassword, confirmNewPassword);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 6. TOP-UP / DEPOSIT FUNDS TO WALLET
router.post('/wallet/deposit', async (req, res) => {
  try {
    const userUid = req.headers['x-user-uid'] || 'usr_demo_01';
    const result = await walletService.depositToWallet(userUid, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 7. WITHDRAW FUNDS FROM WALLET
router.post('/wallet/withdraw', async (req, res) => {
  try {
    const userUid = req.headers['x-user-uid'] || 'usr_demo_01';
    const result = await walletService.withdrawFromWallet(userUid, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 8. CROSS-NETWORK P2P TRANSFER
router.post('/wallet/transfer', async (req, res) => {
  try {
    const senderUid = req.headers['x-user-uid'] || 'usr_demo_01';
    const result = await walletService.transferCrossNetwork(senderUid, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = { router, walletService };
