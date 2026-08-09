/**
 * Automated Tests for Payment Gateway Integration & Validation (M-Pesa, NBC, CRDB, NMB, PayPal, Anti-Fraud & Balance Check)
 */

const assert = require('assert');
const { PaymentService } = require('../payment_service');
const { realPaymentGatewayEngine } = require('../real_payment_gateway');
const { generatePayloadSignature, verifyWebhookSignature } = require('../payment_security');

describe('Multi-Gateway & Anti-Fraud Shield Test Suite', () => {
  let paymentService;
  const buyer = { uid: 'usr_buyer_test', email: 'buyer@example.com' };

  beforeEach(() => {
    paymentService = new PaymentService();
  });

  test('Initiates NBC Bank Transfer & generates NBC Control Number', async () => {
    const res = await paymentService.initiatePayment(buyer, {
      listingId: 'prod_nbc_01',
      amount: 4500,
      provider: 'BANKTRANSFER',
      bankAccount: '011103948572 (NBC BANK)',
    });

    assert.ok(res.checkoutRequestId.startsWith('chk_banktransfer_'));
    assert.strictEqual(res.gatewayResult.bankName, 'NBC');
    assert.ok(res.gatewayResult.controlNumber.startsWith('NBC-99'));
    assert.strictEqual(res.gatewayResult.swiftCode, 'NIDA-TZ-TZ');
  });

  test('Rejects invalid phone number for Mobile Money (ACCOUNT_INVALID)', async () => {
    const check = realPaymentGatewayEngine.validateAccountAndRisk({
      provider: 'MPESA',
      accountIdentifier: '123',
      amount: 500,
    });

    assert.strictEqual(check.valid, false);
    assert.strictEqual(check.reason, 'ACCOUNT_INVALID');
  });

  test('Rejects blacklisted stolen number (FRAUD_DETECTED)', async () => {
    const check = realPaymentGatewayEngine.validateAccountAndRisk({
      provider: 'MPESA',
      accountIdentifier: '0700000000',
      amount: 500,
    });

    assert.strictEqual(check.valid, false);
    assert.strictEqual(check.reason, 'FRAUD_DETECTED');
  });

  test('Rejects transaction when balance is lower than amount (INSUFFICIENT_FUNDS)', async () => {
    const check = realPaymentGatewayEngine.validateAccountAndRisk({
      provider: 'MPESA',
      accountIdentifier: '0755123456',
      amount: 10000,
      simulatedBalance: 2500,
    });

    assert.strictEqual(check.valid, false);
    assert.strictEqual(check.reason, 'INSUFFICIENT_FUNDS');
  });

  test('Validates Webhook SHA-256 HMAC Signature', () => {
    const payload = {
      checkoutRequestId: 'chk_paypal_demo123',
      transactionId: 'PAYPAL_TX_889900',
      resultCode: 0,
      resultDesc: 'Success',
    };

    const validSignature = generatePayloadSignature(payload);
    assert.strictEqual(verifyWebhookSignature(payload, validSignature), true);
  });
});
