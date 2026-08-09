/**
 * Express Controller Router for Payments & Escrow Vault
 */

const express = require('express');
const { PaymentService } = require('./payment_service');
const { verifyWebhookSignature, generatePayloadSignature } = require('./payment_security');
const { sanitizeRequestBody } = require('./security_sanitizer');

const router = express.Router();
const paymentService = new PaymentService();

router.use(express.json());
router.use(sanitizeRequestBody);

// 1. INITIATE PAYMENT (M-Pesa STK Push / Tigo Pesa / Airtel Money / Card)
router.post('/payments/initiate', async (req, res) => {
  try {
    const userUid = req.headers['x-user-uid'] || 'usr_buyer_demo';
    const userEmail = req.headers['x-user-email'] || 'buyer@domain.com';

    const buyer = { uid: userUid, email: userEmail };
    const result = await paymentService.initiatePayment(buyer, req.body);

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 2. PAYMENT WEBHOOK CALLBACK (HMAC Signature Verification Guarded)
router.post('/payments/webhook', (req, res) => {
  const signature = req.headers['x-signature'];

  if (!verifyWebhookSignature(req.body, signature)) {
    return res.status(401).json({
      success: false,
      error: 'HMAC Signature Verification Failed: Callback haijathibitishwa na M-Pesa / Gateway.',
    });
  }

  try {
    const result = paymentService.processWebhookCallback(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 3. CHECK TRANSACTION STATUS
router.get('/payments/status/:requestId', (req, res) => {
  const request = paymentService.checkoutRequests.get(req.params.requestId);
  if (!request) {
    return res.status(404).json({ success: false, error: 'Checkout request ID haipatikani.' });
  }
  res.status(200).json({ success: true, data: request });
});

// 4. RELEASE ESCROW FUNDS TO SELLER
router.post('/payments/escrow/release', (req, res) => {
  try {
    const buyerUid = req.headers['x-user-uid'] || 'usr_buyer_demo';
    const { escrowId } = req.body;

    const result = paymentService.releaseEscrowFunds(buyerUid, escrowId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = { router, paymentService };
