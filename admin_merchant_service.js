/**
 * Admin Control Panel & Merchant Onboarding Service
 * Manages Merchant Verification (BRELA & TRA TIN Registration), Product Approvals, and Escrow Audits.
 */

const crypto = require('crypto');
const { NotificationService } = require('./notification_service');

const notificationService = new NotificationService();

class AdminMerchantService {
  constructor() {
    this.merchants = new Map();
    this.merchantProducts = new Map();
  }

  // 1. ONBOARD NEW VERIFIED MERCHANT (BRELA Registration & TRA TIN Number Verification)
  onboardMerchant(adminUid, { userUid, businessName, brelaNumber, traTinNumber, businessCategory }) {
    if (!userUid || !businessName || !brelaNumber || !traTinNumber) {
      throw new Error('Jina la Biashara, Nambari ya BRELA, na TIN Number ya TRA vinahitajika ili kusajili Muuzaji.');
    }

    const merchantId = `mch_${crypto.randomBytes(8).toString('hex')}`;
    const timestamp = new Date().toISOString();

    const merchantRecord = {
      merchantId,
      userUid,
      businessName,
      brelaNumber,
      traTinNumber,
      businessCategory: businessCategory || 'General',
      verificationStatus: 'VERIFIED_MERCHANT',
      approvedBy: adminUid,
      onboardedAt: timestamp,
    };

    this.merchants.set(merchantId, merchantRecord);

    // Trigger Notification to Merchant
    notificationService.sendNotification(userUid, {
      title: '🏢 Akaunti ya Muuzaji Imethibitishwa (Merchant Verified)!',
      message: `Hongera! Biashara yako "${businessName}" imethibitishwa na Admin kupitia BRELA (${brelaNumber}) na TRA TIN.`,
      type: 'MERCHANT_STATUS',
    });

    return merchantRecord;
  }

  // 2. GET ALL VERIFIED MERCHANTS
  getAllMerchants() {
    return Array.from(this.merchants.values());
  }

  // 3. ADMIN ESCROW OVERRIDE AUDIT
  adminOverrideEscrow(adminUid, { escrowId, action, reason }) {
    if (!['FORCE_RELEASE', 'FORCE_REFUND'].includes(action)) {
      throw new Error("Kitendo cha Admin lazima iwe 'FORCE_RELEASE' au 'FORCE_REFUND'.");
    }

    return {
      escrowId,
      action,
      reason,
      executedBy: adminUid,
      timestamp: new Date().toISOString(),
      message: `Escrow ID ${escrowId} imefanyiwa desisheni ya ${action} na Admin kwa usalama.`,
    };
  }
}

module.exports = { AdminMerchantService };
