/**
 * Automated Contract & Payload Verification Tests for Cross-Platform Mobile App (Phase 3)
 */

const assert = require('assert');
const { MarketplaceService } = require('../marketplace_service');
const { PaymentService } = require('../payment_service');

describe('Phase 3 Mobile App API Contract Test Suite', () => {
  test('Verifies Flutter Mobile App API payload schema compatibility', () => {
    const market = new MarketplaceService();
    const items = market.getAllListings();

    assert(items.length >= 2, 'Mobile app must receive at least initial seed listings');
    const first = items[0];

    assert.ok(first.id, 'Mobile item payload contains id');
    assert.ok(first.title, 'Mobile item payload contains title');
    assert.ok(typeof first.price === 'number', 'Mobile item payload contains numeric price');
  });

  test('Validates Mobile Payment initiation payload for M-Pesa STK Push', () => {
    const payment = new PaymentService();
    const buyer = { uid: 'usr_flutter_mobile', email: 'flutter@mobile.app' };

    const res = payment.initiatePayment(buyer, {
      listingId: 'prod_001',
      amount: 450,
      provider: 'MPESA',
      phoneNumber: '0755887766',
    });

    assert.ok(res.checkoutRequestId.startsWith('chk_mpesa_'));
    assert.strictEqual(res.status, 'PENDING_AUTHORIZATION');
  });
});
