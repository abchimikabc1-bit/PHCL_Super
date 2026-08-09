/**
 * Automated Tests for Admin Control Panel & Merchant Onboarding (Step 3)
 */

const assert = require('assert');
const { AdminMerchantService } = require('../admin_merchant_service');

describe('Step 3 Admin & Merchant Onboarding Test Suite', () => {
  let service;
  const adminUid = 'admin_001';

  beforeEach(() => {
    service = new AdminMerchantService();
  });

  test('Onboards a new verified Merchant with BRELA and TRA TIN registration', () => {
    const merchant = service.onboardMerchant(adminUid, {
      userUid: 'usr_seller_88',
      businessName: 'Tanzania Tech Hub Ltd',
      brelaNumber: '12345678-TZ',
      traTinNumber: '112-223-334',
      businessCategory: 'Electronics',
    });

    assert.ok(merchant.merchantId.startsWith('mch_'));
    assert.strictEqual(merchant.verificationStatus, 'VERIFIED_MERCHANT');
    assert.strictEqual(service.getAllMerchants().length, 1);
  });

  test('Executes Admin Escrow Override decision', () => {
    const res = service.adminOverrideEscrow(adminUid, {
      escrowId: 'esc_MPESA_12345',
      action: 'FORCE_RELEASE',
      reason: 'Order Delivery Verified by Admin',
    });

    assert.strictEqual(res.action, 'FORCE_RELEASE');
    assert.strictEqual(res.executedBy, adminUid);
  });
});
