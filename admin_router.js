/**
 * Express Controller Router for Admin Operations & Merchant Onboarding (Step 3)
 */

const express = require('express');
const { AdminMerchantService } = require('./admin_merchant_service');
const { sanitizeRequestBody } = require('./security_sanitizer');

const router = express.Router();
const adminService = new AdminMerchantService();

router.use(express.json());
router.use(sanitizeRequestBody);

// 1. ONBOARD NEW VERIFIED MERCHANT (BRELA & TRA TIN Verification)
router.post('/admin/merchants/onboard', (req, res) => {
  try {
    const adminUid = req.headers['x-admin-uid'] || 'admin_001';
    const result = adminService.onboardMerchant(adminUid, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 2. GET ALL VERIFIED MERCHANTS
router.get('/admin/merchants', (req, res) => {
  const list = adminService.getAllMerchants();
  res.status(200).json({ success: true, data: list });
});

// 3. ADMIN ESCROW OVERRIDE AUDIT
router.post('/admin/escrow/override', (req, res) => {
  try {
    const adminUid = req.headers['x-admin-uid'] || 'admin_001';
    const result = adminService.adminOverrideEscrow(adminUid, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = { router, adminService };
