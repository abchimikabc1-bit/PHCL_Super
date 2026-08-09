/**
 * Multi-Tier KYC Engine with Real-Time Notification Integration (Phase 2)
 */

const { encryptText, hashPII } = require('./crypto_helper');
const { NotificationService } = require('./notification_service');

const notificationService = new NotificationService();

class KYCService {
  constructor() {
    this.kycApplications = new Map();
  }

  async submitTier1Verification(uid, { emailOtp, phoneOtp }) {
    if (!emailOtp || !phoneOtp) {
      throw new Error('Msimbo wa OTP wa Barua pepe na Simu unahitajika ili kumaliza Tier 1.');
    }

    if (emailOtp !== '123456' || phoneOtp !== '123456') {
      throw new Error('Msimbo wa OTP haukuwa sahihi au umemaliza muda wake.');
    }

    const app = this.getOrCreateApplication(uid);
    app.tier1Status = 'VERIFIED';
    app.currentTier = Math.max(app.currentTier, 1);
    app.updatedAt = new Date().toISOString();

    // Trigger Notification
    notificationService.sendNotification(uid, {
      title: '✅ Tier 1 Verified',
      message: 'Uhakiki wako wa Barua pepe na Nambari ya Simu umethibitishwa kwa usalama!',
      type: 'KYC_STATUS',
    });

    return { uid, currentTier: app.currentTier, tier1Status: app.tier1Status };
  }

  async submitTier2Verification(uid, { docType, idNumber, fullName, dob, selfieUrl, documentFrontUrl }) {
    const app = this.getOrCreateApplication(uid);

    if (app.tier1Status !== 'VERIFIED') {
      throw new Error('Lazima ukamilishe Uhakiki wa Tier 1 kwanza kabla ya kuanza Tier 2.');
    }

    if (!docType || !idNumber || !fullName || !selfieUrl || !documentFrontUrl) {
      throw new Error('Aina ya kitambulisho, Nambari ya kitambulisho, Selfie, na Picha ya Kitambulisho vinahitajika.');
    }

    const encryptedId = encryptText(idNumber);
    const idHash = hashPII(idNumber);

    app.tier2Data = {
      docType,
      encryptedIdNumber: encryptedId,
      idHash,
      fullName,
      dob,
      selfieUrl,
      documentFrontUrl,
      submittedAt: new Date().toISOString(),
    };

    app.tier2Status = 'PENDING_REVIEW';
    app.status = 'PENDING_ADMIN_REVIEW';
    app.updatedAt = new Date().toISOString();

    // Trigger Notification
    notificationService.sendNotification(uid, {
      title: '📑 Tier 2 Submitted',
      message: 'Hati zako za NIDA na Liveness Selfie zimepokewa. Zinasubiri ukaguzi wa Admin.',
      type: 'KYC_STATUS',
    });

    return {
      uid,
      status: app.status,
      tier2Status: app.tier2Status,
      message: 'Nyaraka zako za Tier 2 zimewasilishwa. Zinasubiri ukaguzi wa Admin.',
    };
  }

  async submitTier3Verification(uid, { proofOfAddressUrl, utilityBillType }) {
    const app = this.getOrCreateApplication(uid);

    if (app.tier2Status !== 'APPROVED') {
      throw new Error('Lazima KYC ya Tier 2 iwe imekubaliwa (APPROVED) kabla ya kuwasilisha Tier 3.');
    }

    if (!proofOfAddressUrl) {
      throw new Error('Hati ya makazi (Proof of Address) inahitajika.');
    }

    app.tier3Data = {
      proofOfAddressUrl,
      utilityBillType,
      amlSanctionCheck: 'CLEAN_NO_MATCH',
      submittedAt: new Date().toISOString(),
    };

    app.tier3Status = 'PENDING_REVIEW';
    app.status = 'PENDING_ADMIN_REVIEW';
    app.updatedAt = new Date().toISOString();

    return {
      uid,
      status: app.status,
      tier3Status: app.tier3Status,
      message: 'Hati za Tier 3 zimewasilishwa na zinasubiri ukaguzi wa mwisho.',
    };
  }

  async adminReviewKYC(adminUid, { targetUid, targetTier, decision, rejectionReason }) {
    const app = this.kycApplications.get(targetUid);
    if (!app) {
      throw new Error('Ombi la KYC halikupatikanani kwa mtumiaji huyu.');
    }

    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      throw new Error("Desisheni lazima iwe 'APPROVED' au 'REJECTED'.");
    }

    if (targetTier === 2) {
      app.tier2Status = decision;
      if (decision === 'APPROVED') app.currentTier = 2;
    } else if (targetTier === 3) {
      app.tier3Status = decision;
      if (decision === 'APPROVED') app.currentTier = 3;
    }

    app.status = decision;
    app.reviewedBy = adminUid;
    app.rejectionReason = decision === 'REJECTED' ? rejectionReason : null;
    app.updatedAt = new Date().toISOString();

    // Trigger Instant Push Notification to Target User
    notificationService.sendNotification(targetUid, {
      title: decision === 'APPROVED' ? `🎉 KYC Tier ${targetTier} Approved!` : `🛑 KYC Tier ${targetTier} Rejected`,
      message: decision === 'APPROVED'
        ? `Hongera! Ombi lakom la KYC Tier ${targetTier} limeidhinishwa na Admin.`
        : `Ombi lako la KYC limekataliwa. Sababu: ${rejectionReason || 'Hati hazikukamilika'}`,
      type: 'KYC_STATUS',
    });

    return {
      targetUid,
      currentTier: app.currentTier,
      status: app.status,
      rejectionReason: app.rejectionReason,
    };
  }

  getOrCreateApplication(uid) {
    if (!this.kycApplications.has(uid)) {
      this.kycApplications.set(uid, {
        uid,
        currentTier: 0,
        tier1Status: 'UNVERIFIED',
        tier2Status: 'UNVERIFIED',
        tier3Status: 'UNVERIFIED',
        status: 'UNVERIFIED',
        updatedAt: new Date().toISOString(),
      });
    }
    return this.kycApplications.get(uid);
  }
}

module.exports = { KYCService, notificationService };
