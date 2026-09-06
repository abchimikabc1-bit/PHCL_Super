import 'server-only';

import {
  Timestamp,
} from 'firebase-admin/firestore';

import {
  adminAuth,
  adminDb,
} from '@/lib/firebase-admin';

import {
  type VerificationFacts,
  type VerificationStatus,
  type VerificationTier,
} from '@/lib/server-verification-requirements';

/**
 * ============================================================
 * PHCL SUPER — SERVER VERIFICATION FACTS COLLECTOR
 * ============================================================
 *
 * PURPOSE
 *
 * Collect server-trusted facts used by the PHCL
 * Verification Requirements / Trust Engine.
 *
 * SECURITY BOUNDARY
 *
 * This module:
 *
 * - performs READS only
 * - never approves KYC/KYS/KYB
 * - never mutates financial balances
 * - never writes ledger entries
 * - never changes orders
 * - never enables MFA/2FA
 * - never trusts browser-supplied verification claims
 *
 * IMPORTANT
 *
 * Some security authorities do not yet exist as
 * dedicated verified server-side systems.
 *
 * Until they do, this collector FAILS CLOSED:
 *
 * - twoFactorEnabled = false
 * - biometricOrPasskeyEnabled = false
 * - verifiedReferrals = 0
 */

const USER_COLLECTION =
  'users';

const ORDER_COLLECTION =
  'orders';

const FINANCIAL_LEDGER_COLLECTION =
  'financial_ledger';

const MAX_UID_LENGTH =
  256;

type UnknownRecord =
  Record<string, unknown>;

type FirebaseTimestampLike = {
  toDate?: () => Date;
  seconds?: number;
  _seconds?: number;
};

function isPlainObject(
  value: unknown,
): value is UnknownRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function normalizeUid(
  value: string,
): string {
  if (
    typeof value !== 'string'
  ) {
    throw new Error(
      'Invalid verification customer.',
    );
  }

  const normalized =
    value.trim();

  if (
    !normalized ||
    normalized.length >
      MAX_UID_LENGTH ||
    normalized.includes('/')
  ) {
    throw new Error(
      'Invalid verification customer.',
    );
  }

  return normalized;
}

function normalizeTier(
  value: unknown,
): VerificationTier {
  switch (value) {
    case 'regular':
    case 'small_business':
    case 'corporate':
      return value;

    default:
      /**
       * Existing/legacy customer profiles that
       * do not yet contain a valid tier receive
       * the least-privileged customer tier.
       *
       * This does NOT grant any verification.
       */
      return 'regular';
  }
}

function normalizeVerificationStatus(
  value: unknown,
): VerificationStatus {
  switch (value) {
    case 'NOT_STARTED':
    case 'PENDING_REVIEW':
    case 'APPROVED':
    case 'REJECTED':
    case 'RESTRICTED':
      return value;

    default:
      return 'NOT_STARTED';
  }
}

function readOptionalVerificationStatus(
  value: unknown,
): VerificationStatus | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  return normalizeVerificationStatus(
    value,
  );
}


function readAccountStanding(
  value: unknown,
): boolean {
  /**
   * Only explicitly ACTIVE accounts are
   * considered in good standing.
   *
   * Missing/unknown status FAILS CLOSED.
   */
  return value === 'ACTIVE';
}

function timestampToDate(
  value: unknown,
): Date | null {
  if (
    value instanceof Timestamp
  ) {
    return value.toDate();
  }

  if (
    value instanceof Date
  ) {
    return Number.isFinite(
      value.getTime(),
    )
      ? value
      : null;
  }

  if (
    typeof value === 'string'
  ) {
    const parsed =
      new Date(value);

    return Number.isFinite(
      parsed.getTime(),
    )
      ? parsed
      : null;
  }

  if (
    !isPlainObject(value)
  ) {
    return null;
  }

  const timestampLike =
    value as FirebaseTimestampLike;

  if (
    typeof timestampLike.toDate ===
    'function'
  ) {
    try {
      const result =
        timestampLike.toDate();

      return (
        result instanceof Date &&
        Number.isFinite(
          result.getTime(),
        )
      )
        ? result
        : null;
    } catch {
      return null;
    }
  }

  const seconds =
    typeof timestampLike.seconds ===
    'number'
      ? timestampLike.seconds
      : typeof timestampLike._seconds ===
          'number'
        ? timestampLike._seconds
        : null;

  if (
    seconds === null ||
    !Number.isFinite(seconds)
  ) {
    return null;
  }

  const result =
    new Date(
      seconds * 1000,
    );

  return Number.isFinite(
    result.getTime(),
  )
    ? result
    : null;
}

function calculateAccountAgeDays(
  createdAt: unknown,
  now: Date,
): number {
  const created =
    timestampToDate(
      createdAt,
    );

  if (!created) {
    return 0;
  }

  const createdMs =
    created.getTime();

  const nowMs =
    now.getTime();

  if (
    !Number.isFinite(createdMs) ||
    !Number.isFinite(nowMs) ||
    createdMs > nowMs
  ) {
    return 0;
  }

  const millisecondsPerDay =
    24 * 60 * 60 * 1000;

  return Math.max(
    0,
    Math.floor(
      (
        nowMs -
        createdMs
      ) /
        millisecondsPerDay,
    ),
  );
}

/**
 * Count authoritative completed checkout
 * orders belonging to this customer.
 *
 * Orders are created by the secure checkout
 * coordinator with:
 *
 * customerUid
 * status = COMPLETED
 */
async function countSuccessfulOrders(
  uid: string,
): Promise<number> {
  const snapshot =
    await adminDb
      .collection(
        ORDER_COLLECTION,
      )
      .where(
        'customerUid',
        '==',
        uid,
      )
      .where(
        'status',
        '==',
        'COMPLETED',
      )
      .get();

  const count =
    snapshot.size;

  return Number.isSafeInteger(
    count,
  ) &&
    count >= 0
    ? count
    : 0;
}

/**
 * Count authoritative financial operations
 * represented in the immutable ledger.
 *
 * IMPORTANT:
 *
 * We deliberately count distinct operation IDs
 * instead of blindly counting ledger rows.
 *
 * A TRANSFER may create multiple ledger sides.
 * Counting raw rows could therefore inflate
 * customer activity/trust.
 */
async function countCompletedTransactions(
  uid: string,
): Promise<number> {
  const snapshot =
    await adminDb
      .collection(
        FINANCIAL_LEDGER_COLLECTION,
      )
      .where(
        'uid',
        '==',
        uid,
      )
      .select(
        'operationId',
      )
      .get();

  const operationIds =
    new Set<string>();

  for (
    const document of
      snapshot.docs
  ) {
    const data =
      document.data();

    const operationId =
      typeof data.operationId ===
      'string'
        ? data.operationId.trim()
        : '';

    if (operationId) {
      operationIds.add(
        operationId,
      );
    }
  }

  return operationIds.size;
}

/**
 * Firebase Authentication is authoritative
 * for Firebase email verification.
 *
 * Do not trust users/{uid}.emailVerified
 * as the final security authority.
 */
async function readFirebaseAuthFacts(
  uid: string,
): Promise<{
  emailVerified: boolean;
  phoneVerified: boolean;
}> {
  const user =
    await adminAuth.getUser(
      uid,
    );

  const phoneNumber =
    typeof user.phoneNumber ===
      'string' &&
    user.phoneNumber.trim()
      ? user.phoneNumber.trim()
      : null;

  return {
    emailVerified:
      user.emailVerified ===
      true,

    /**
     * Firebase Authentication is authoritative
     * for customer phone verification.
     *
     * A phone number is considered verified here
     * only when it exists on the Firebase Auth
     * user record after Firebase Phone Auth.
     *
     * Never trust users/{uid}.phoneVerified or a
     * browser-supplied boolean as authority.
     */
    phoneVerified:
      phoneNumber !== null,
  };
}

/**
 * Future PHCL 2FA authority.
 *
 * Current users/{uid}.mfa fields are NOT
 * accepted as proof of actual enrollment.
 *
 * A checkbox/browser claim must never become
 * authentication authority.
 */
async function readTwoFactorAuthority(
  _uid: string,
): Promise<boolean> {
  return false;
}

/**
 * Future customer Passkey/WebAuthn authority.
 *
 * Fingerprint/Face biometric material should
 * remain inside the user's secure device
 * authenticator.
 *
 * PHCL should store/verify credential authority,
 * not raw fingerprint or face templates.
 */
async function readPasskeyAuthority(
  _uid: string,
): Promise<boolean> {
  return false;
}

/**
 * Future verified referral authority.
 *
 * Until a dedicated referral service provides
 * server-verified referrals, referrals contribute
 * ZERO to Trust.
 */
async function countVerifiedReferrals(
  _uid: string,
): Promise<number> {
  return 0;
}

/**
 * Collect all facts required by the PHCL
 * Verification Requirements / Trust Engine.
 *
 * Caller MUST supply a UID derived from a
 * trusted server authentication boundary.
 *
 * This function performs no writes.
 */
export async function getServerVerificationFacts(
  rawUid: string,
): Promise<VerificationFacts> {
  const uid =
    normalizeUid(
      rawUid,
    );

  const profileSnapshot =
    await adminDb
      .collection(
        USER_COLLECTION,
      )
      .doc(uid)
      .get();

  if (
    !profileSnapshot.exists
  ) {
    throw new Error(
      'Customer profile not found.',
    );
  }

  const profile =
    profileSnapshot.data();

  if (
    !profile ||
    !isPlainObject(profile)
  ) {
    throw new Error(
      'Customer profile is invalid.',
    );
  }

  /**
   * Bind the document to the requested UID
   * if the stored profile contains a uid field.
   *
   * Missing uid is tolerated temporarily for
   * legacy compatibility.
   *
   * A conflicting uid fails closed.
   */
  if (
    typeof profile.uid ===
      'string' &&
    profile.uid.trim() !==
      uid
  ) {
    throw new Error(
      'Customer profile identity mismatch.',
    );
  }

  const now =
    new Date();

  const [
    authFacts,
    completedTransactions,
    successfulOrders,
    verifiedReferrals,
    twoFactorEnabled,
    biometricOrPasskeyEnabled,
  ] =
    await Promise.all([
      readFirebaseAuthFacts(
        uid,
      ),

      countCompletedTransactions(
        uid,
      ),

      countSuccessfulOrders(
        uid,
      ),

      countVerifiedReferrals(
        uid,
      ),

      readTwoFactorAuthority(
        uid,
      ),

      readPasskeyAuthority(
        uid,
      ),
    ]);

  const tier =
    normalizeTier(
      profile.tier,
    );

  const kycStatus =
    normalizeVerificationStatus(
      profile.kycStatus,
    );

  const kysStatus =
    tier ===
    'small_business'
      ? readOptionalVerificationStatus(
          profile.kysStatus,
        ) ??
        'NOT_STARTED'
      : null;

  const kybStatus =
    tier ===
    'corporate'
      ? readOptionalVerificationStatus(
          profile.kybStatus,
        ) ??
        'NOT_STARTED'
      : null;

  return {
    tier,

    accountAgeDays:
      calculateAccountAgeDays(
        profile.createdAt,
        now,
      ),

    completedTransactions,

    successfulOrders,

    verifiedReferrals,

    emailVerified:
      authFacts.emailVerified,

    /**
     * Firebase Authentication is the authoritative
     * source for customer phone verification.
     *
     * Legacy users/{uid}.phoneVerified is ignored
     * deliberately so a client/profile write can
     * never grant verified-phone status.
     */
    phoneVerified:
      authFacts.phoneVerified,

    goodAccountStanding:
      readAccountStanding(
        profile.accountStatus,
      ),

    twoFactorEnabled,

    biometricOrPasskeyEnabled,

    kycStatus,

    kysStatus,

    kybStatus,
  };
}