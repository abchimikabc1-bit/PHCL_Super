import 'server-only';

export type VerificationTier =
  | 'regular'
  | 'small_business'
  | 'corporate';

export type VerificationStatus =
  | 'NOT_STARTED'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'RESTRICTED';

export type TrustLevel =
  | 1
  | 2
  | 3
  | 4
  | 5;

export type TrustLevelName =
  | 'New Customer'
  | 'Active Customer'
  | 'Verified Customer'
  | 'Trusted Customer'
  | 'PHCL Premier';

export type RequirementKey =
  | 'EMAIL_VERIFIED'
  | 'PHONE_VERIFIED'
  | 'ACCOUNT_AGE'
  | 'COMPLETED_TRANSACTIONS'
  | 'SUCCESSFUL_ORDERS'
  | 'VERIFIED_REFERRALS'
  | 'GOOD_ACCOUNT_STANDING'
  | 'KYC_APPROVED'
  | 'KYS_APPROVED'
  | 'KYB_APPROVED'
  | 'TWO_FACTOR_ENABLED'
  | 'BIOMETRIC_OR_PASSKEY';

export interface VerificationFacts {
  tier: VerificationTier;

  accountAgeDays: number;

  completedTransactions: number;

  successfulOrders: number;

  verifiedReferrals: number;

  emailVerified: boolean;

  phoneVerified: boolean;

  goodAccountStanding: boolean;

  twoFactorEnabled: boolean;

  biometricOrPasskeyEnabled: boolean;

  kycStatus: VerificationStatus;

  kysStatus?: VerificationStatus | null;

  kybStatus?: VerificationStatus | null;
}

export interface RequirementResult {
  key: RequirementKey;

  label: string;

  met: boolean;

  current?: number;

  target?: number;

  /**
   * Verification requirements such as
   * Government ID/liveness are deliberately
   * NOT represented as browser claims here.
   *
   * This engine consumes only server-trusted
   * facts.
   */
  securityCritical: boolean;
}

export interface VerificationProgress {
  applicable: boolean;

  status: VerificationStatus | 'NOT_APPLICABLE';

  progressPercent: number;

  eligibleToStart: boolean;

  requirements: RequirementResult[];
}

export interface TrustAssessment {
  level: TrustLevel;

  name: TrustLevelName;

  score: number;

  nextLevel:
    | {
        level: TrustLevel;
        name: TrustLevelName;
        minimumScore: number;
      }
    | null;
}

export interface VerificationAssessment {
  kyc: VerificationProgress;

  kys: VerificationProgress;

  kyb: VerificationProgress;

  trust: TrustAssessment;

  security: {
    twoFactorEnabled: boolean;

    biometricOrPasskeyEnabled: boolean;

    strongAuthenticationReady: boolean;
  };
}

/**
 * PHCL initial qualification policy.
 *
 * IMPORTANT:
 *
 * These thresholds determine eligibility /
 * progress only.
 *
 * They MUST NEVER approve KYC, KYS or KYB.
 *
 * Final verification authority belongs to
 * protected server/compliance workflows.
 */
const POLICY = {
  kyc: {
    minimumAccountAgeDays: 7,
    minimumCompletedTransactions: 3,
  },

  kys: {
    minimumAccountAgeDays: 30,
    minimumSuccessfulOrders: 10,
  },

  trust: {
    activeCustomerScore: 20,
    verifiedCustomerScore: 45,
    trustedCustomerScore: 70,
    premierScore: 90,
  },
} as const;

function safeCount(
  value: number,
): number {
  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    return 0;
  }

  return Math.floor(value);
}

function percentage(
  requirements: RequirementResult[],
): number {
  if (
    requirements.length === 0
  ) {
    return 0;
  }

  const completed =
    requirements.filter(
      (requirement) =>
        requirement.met,
    ).length;

  return Math.round(
    (
      completed /
      requirements.length
    ) *
      100,
  );
}

function normalizeStatus(
  status:
    | VerificationStatus
    | null
    | undefined,
): VerificationStatus {
  switch (status) {
    case 'NOT_STARTED':
    case 'PENDING_REVIEW':
    case 'APPROVED':
    case 'REJECTED':
    case 'RESTRICTED':
      return status;

    default:
      return 'NOT_STARTED';
  }
}

function booleanRequirement(
  key: RequirementKey,
  label: string,
  met: boolean,
  securityCritical = false,
): RequirementResult {
  return {
    key,
    label,
    met,
    securityCritical,
  };
}

function numericRequirement(
  key: RequirementKey,
  label: string,
  current: number,
  target: number,
): RequirementResult {
  const safeCurrent =
    safeCount(
      current,
    );

  return {
    key,
    label,
    current: safeCurrent,
    target,
    met:
      safeCurrent >=
      target,
    securityCritical:
      false,
  };
}

function assessKyc(
  facts: VerificationFacts,
): VerificationProgress {
  const requirements:
    RequirementResult[] = [
      booleanRequirement(
        'EMAIL_VERIFIED',
        'Email verified',
        facts.emailVerified,
        true,
      ),

      booleanRequirement(
        'PHONE_VERIFIED',
        'Phone verified',
        facts.phoneVerified,
        true,
      ),

      numericRequirement(
        'ACCOUNT_AGE',
        'Account age',
        facts.accountAgeDays,
        POLICY.kyc
          .minimumAccountAgeDays,
      ),

      numericRequirement(
        'COMPLETED_TRANSACTIONS',
        'Completed transactions',
        facts.completedTransactions,
        POLICY.kyc
          .minimumCompletedTransactions,
      ),

      booleanRequirement(
        'GOOD_ACCOUNT_STANDING',
        'Account in good standing',
        facts.goodAccountStanding,
        true,
      ),
    ];

  return {
    applicable: true,

    status:
      normalizeStatus(
        facts.kycStatus,
      ),

    progressPercent:
      percentage(
        requirements,
      ),

    eligibleToStart:
      requirements.every(
        (requirement) =>
          requirement.met,
      ),

    requirements,
  };
}

function assessKys(
  facts: VerificationFacts,
): VerificationProgress {
  if (
    facts.tier !==
    'small_business'
  ) {
    return {
      applicable: false,

      status:
        'NOT_APPLICABLE',

      progressPercent: 0,

      eligibleToStart: false,

      requirements: [],
    };
  }

  const requirements:
    RequirementResult[] = [
      booleanRequirement(
        'KYC_APPROVED',
        'KYC approved',
        facts.kycStatus ===
          'APPROVED',
        true,
      ),

      numericRequirement(
        'ACCOUNT_AGE',
        'Account age',
        facts.accountAgeDays,
        POLICY.kys
          .minimumAccountAgeDays,
      ),

      numericRequirement(
        'SUCCESSFUL_ORDERS',
        'Successful orders',
        facts.successfulOrders,
        POLICY.kys
          .minimumSuccessfulOrders,
      ),

      booleanRequirement(
        'GOOD_ACCOUNT_STANDING',
        'Account in good standing',
        facts.goodAccountStanding,
        true,
      ),

      booleanRequirement(
        'TWO_FACTOR_ENABLED',
        '2FA enabled',
        facts.twoFactorEnabled,
        true,
      ),
    ];

  return {
    applicable: true,

    status:
      normalizeStatus(
        facts.kysStatus,
      ),

    progressPercent:
      percentage(
        requirements,
      ),

    eligibleToStart:
      requirements.every(
        (requirement) =>
          requirement.met,
      ),

    requirements,
  };
}

function assessKyb(
  facts: VerificationFacts,
): VerificationProgress {
  if (
    facts.tier !==
    'corporate'
  ) {
    return {
      applicable: false,

      status:
        'NOT_APPLICABLE',

      progressPercent: 0,

      eligibleToStart: false,

      requirements: [],
    };
  }

  /**
   * KYB eligibility deliberately stays
   * conservative.
   *
   * Company registration documents,
   * beneficial ownership, business address,
   * authorized representatives and other
   * KYB evidence must later be evaluated by
   * the dedicated protected KYB workflow.
   */
  const requirements:
    RequirementResult[] = [
      booleanRequirement(
        'KYC_APPROVED',
        'Authorized representative KYC approved',
        facts.kycStatus ===
          'APPROVED',
        true,
      ),

      booleanRequirement(
        'EMAIL_VERIFIED',
        'Business account email verified',
        facts.emailVerified,
        true,
      ),

      booleanRequirement(
        'PHONE_VERIFIED',
        'Business account phone verified',
        facts.phoneVerified,
        true,
      ),

      booleanRequirement(
        'GOOD_ACCOUNT_STANDING',
        'Account in good standing',
        facts.goodAccountStanding,
        true,
      ),

      booleanRequirement(
        'TWO_FACTOR_ENABLED',
        '2FA enabled for authorized representative',
        facts.twoFactorEnabled,
        true,
      ),
    ];

  return {
    applicable: true,

    status:
      normalizeStatus(
        facts.kybStatus,
      ),

    progressPercent:
      percentage(
        requirements,
      ),

    eligibleToStart:
      requirements.every(
        (requirement) =>
          requirement.met,
      ),

    requirements,
  };
}

function calculateTrustScore(
  facts: VerificationFacts,
): number {
  let score = 0;

  if (
    facts.emailVerified
  ) {
    score += 5;
  }

  if (
    facts.phoneVerified
  ) {
    score += 5;
  }

  if (
    facts.accountAgeDays >=
    7
  ) {
    score += 5;
  }

  if (
    facts.accountAgeDays >=
    30
  ) {
    score += 5;
  }

  if (
    facts.completedTransactions >=
    3
  ) {
    score += 10;
  }

  if (
    facts.completedTransactions >=
    10
  ) {
    score += 5;
  }

  if (
    facts.successfulOrders >=
    5
  ) {
    score += 5;
  }

  /**
   * Referrals contribute only a small
   * reputation component.
   *
   * Referrals NEVER replace identity
   * verification.
   */
  if (
    facts.verifiedReferrals >=
    1
  ) {
    score += 3;
  }

  if (
    facts.verifiedReferrals >=
    5
  ) {
    score += 2;
  }

  if (
    facts.goodAccountStanding
  ) {
    score += 10;
  }

  if (
    facts.twoFactorEnabled
  ) {
    score += 10;
  }

  if (
    facts.biometricOrPasskeyEnabled
  ) {
    score += 5;
  }

  if (
    facts.kycStatus ===
    'APPROVED'
  ) {
    score += 20;
  }

  if (
    facts.tier ===
      'small_business' &&
    facts.kysStatus ===
      'APPROVED'
  ) {
    score += 10;
  }

  if (
    facts.tier ===
      'corporate' &&
    facts.kybStatus ===
      'APPROVED'
  ) {
    score += 10;
  }

  return Math.min(
    100,
    score,
  );
}

function assessTrust(
  facts: VerificationFacts,
): TrustAssessment {
  const score =
    calculateTrustScore(
      facts,
    );

  const {
    activeCustomerScore,
    verifiedCustomerScore,
    trustedCustomerScore,
    premierScore,
  } =
    POLICY.trust;

  if (
    score >= premierScore
  ) {
    return {
      level: 5,
      name:
        'PHCL Premier',
      score,
      nextLevel: null,
    };
  }

  if (
    score >= trustedCustomerScore
  ) {
    return {
      level: 4,
      name:
        'Trusted Customer',
      score,

      nextLevel: {
        level: 5,
        name:
          'PHCL Premier',
        minimumScore:
          premierScore,
      },
    };
  }

  if (
    score >= verifiedCustomerScore
  ) {
    return {
      level: 3,
      name:
        'Verified Customer',
      score,

      nextLevel: {
        level: 4,
        name:
          'Trusted Customer',
        minimumScore:
          trustedCustomerScore,
      },
    };
  }

  if (
    score >= activeCustomerScore
  ) {
    return {
      level: 2,
      name:
        'Active Customer',
      score,

      nextLevel: {
        level: 3,
        name:
          'Verified Customer',
        minimumScore:
          verifiedCustomerScore,
      },
    };
  }

  return {
    level: 1,
    name:
      'New Customer',
    score,

    nextLevel: {
      level: 2,
      name:
        'Active Customer',
      minimumScore:
        activeCustomerScore,
    },
  };
}

/**
 * Pure PHCL server-side assessment.
 *
 * NO Firestore writes.
 * NO financial mutations.
 * NO KYC/KYS/KYB approval.
 * NO Admin authorization.
 *
 * Callers must supply facts collected from
 * trusted server-side sources.
 */
export function assessVerificationRequirements(
  input: VerificationFacts,
): VerificationAssessment {
  const facts:
    VerificationFacts = {
    ...input,

    accountAgeDays:
      safeCount(
        input.accountAgeDays,
      ),

    completedTransactions:
      safeCount(
        input.completedTransactions,
      ),

    successfulOrders:
      safeCount(
        input.successfulOrders,
      ),

    verifiedReferrals:
      safeCount(
        input.verifiedReferrals,
      ),

    kycStatus:
      normalizeStatus(
        input.kycStatus,
      ),

    kysStatus:
      input.kysStatus
        ? normalizeStatus(
            input.kysStatus,
          )
        : null,

    kybStatus:
      input.kybStatus
        ? normalizeStatus(
            input.kybStatus,
          )
        : null,
  };

  return {
    kyc:
      assessKyc(
        facts,
      ),

    kys:
      assessKys(
        facts,
      ),

    kyb:
      assessKyb(
        facts,
      ),

    trust:
      assessTrust(
        facts,
      ),

    security: {
      twoFactorEnabled:
        facts.twoFactorEnabled,

      biometricOrPasskeyEnabled:
        facts.biometricOrPasskeyEnabled,

      strongAuthenticationReady:
        facts.twoFactorEnabled &&
        facts.biometricOrPasskeyEnabled,
    },
  };
}