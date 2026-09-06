import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

import {
  firebaseAuth,
  firebaseDb,
} from '@/lib/firebase-client';

export type UserTier =
  | 'regular'
  | 'small_business'
  | 'corporate';

export type UserKycStatus =
  | 'NOT_STARTED'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED';

export interface UserProfile {
  readonly uid: string;

  email: string;

  fullName: string;

  phone: string;

  readonly balances: {
    usd: number;
    tzs: number;
    ntzs: number;
    pi: number;
  };

  /**
   * Customer profile role only.
   *
   * This value MUST NOT be used as
   * PHCL Admin authorization.
   */
  readonly role: 'user';

  tier?: UserTier;

  readonly kycStatus?: UserKycStatus;
}

type EditableUserProfileFields = {
  fullName?: string;
  phone?: string;
};

/**
 * TEMPORARY COMPATIBILITY EXPORTS
 *
 * Several legacy PHCL client pages still import:
 *
 *   auth
 *   db
 *
 * from this module.
 *
 * We keep these exports temporarily so the
 * existing application continues compiling
 * while checkout, wallet, orders, deposit,
 * profile and registration are migrated to
 * the hardened architecture.
 *
 * IMPORTANT:
 *
 * These exports do NOT grant financial or
 * Admin authority.
 */
export const auth =
  firebaseAuth!;

export const db =
  firebaseDb!;

function requireFirebaseServices() {
  if (
    !firebaseAuth ||
    !firebaseDb
  ) {
    throw new Error(
      'Firebase client services are not configured.',
    );
  }

  return {
    auth: firebaseAuth,
    db: firebaseDb,
  };
}

function requireAuthenticatedUser(
  expectedUid?: string,
) {
  const {
    auth: currentAuth,
    db: currentDb,
  } =
    requireFirebaseServices();

  const currentUser =
    currentAuth.currentUser;

  if (!currentUser) {
    throw new Error(
      'Authentication required.',
    );
  }

  if (
    expectedUid &&
    currentUser.uid !== expectedUid
  ) {
    throw new Error(
      'Access denied.',
    );
  }

  return {
    currentUser,
    db: currentDb,
  };
}

function cleanText(
  value: string,
  maxLength: number,
): string {
  return value
    .trim()
    .slice(
      0,
      maxLength,
    );
}

function cleanTier(
  tier: UserTier,
): UserTier {
  if (
    tier !== 'regular' &&
    tier !== 'small_business' &&
    tier !== 'corporate'
  ) {
    throw new Error(
      'Invalid account tier.',
    );
  }

  return tier;
}

function toFiniteBalance(
  value: unknown,
): number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value)
  )
    ? value
    : 0;
}

/**
 * Creates the initial CUSTOMER profile.
 *
 * Security rules:
 *
 * - role is always "user"
 * - KYC always starts as NOT_STARTED
 * - balances always start at zero
 * - Firebase UID must match current user
 *
 * Browser registration cannot approve KYC,
 * assign Admin authority or create funds.
 */
export async function createUserProfile(
  uid: string,
  _email: string,
  fullName: string,
  phone: string,
  tier: UserTier,
): Promise<void> {
  const {
    currentUser,
    db: currentDb,
  } =
    requireAuthenticatedUser(
      uid,
    );

  const profileRef =
    doc(
      currentDb,
      'users',
      uid,
    );

  const existingProfile =
    await getDoc(
      profileRef,
    );

  if (
    existingProfile.exists()
  ) {
    throw new Error(
      'User profile already exists.',
    );
  }

  const authenticatedEmail =
    currentUser.email?.trim();

  if (
    !authenticatedEmail
  ) {
    throw new Error(
      'Authenticated email is required.',
    );
  }

  await setDoc(
    profileRef,
    {
      uid,

      email:
        authenticatedEmail,

      fullName:
        cleanText(
          fullName,
          120,
        ),

      phone:
        cleanText(
          phone,
          40,
        ),

      role:
        'user',

      tier:
        cleanTier(
          tier,
        ),

      /**
       * KYC/KYS/KYB decisions must later
       * come from server-controlled
       * verification workflows.
       */
      kycStatus:
        'NOT_STARTED',

      /**
       * Client registration must never
       * create financial value.
       */
      balances: {
        usd: 0,
        tzs: 0,
        ntzs: 0,
        pi: 0,
      },

      createdAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),
    },
  );
}

/**
 * Reads only the currently authenticated
 * customer's own profile.
 *
 * The role exposed by this client helper is
 * normalized to "user".
 *
 * Admin authority belongs to the separate
 * hardened PHCL Admin security system.
 */
export async function getUserProfile(
  uid: string,
): Promise<UserProfile | null> {
  const {
    db: currentDb,
  } =
    requireAuthenticatedUser(
      uid,
    );

  const docSnap =
    await getDoc(
      doc(
        currentDb,
        'users',
        uid,
      ),
    );

  if (
    !docSnap.exists()
  ) {
    return null;
  }

  const data =
    docSnap.data();

  const balances =
    data.balances &&
    typeof data.balances ===
      'object'
      ? (
          data.balances as Record<
            string,
            unknown
          >
        )
      : {};

  const tier:
    UserTier | undefined =
    data.tier ===
      'regular' ||
    data.tier ===
      'small_business' ||
    data.tier ===
      'corporate'
      ? data.tier
      : undefined;

  const kycStatus:
    UserKycStatus | undefined =
    data.kycStatus ===
      'NOT_STARTED' ||
    data.kycStatus ===
      'PENDING_REVIEW' ||
    data.kycStatus ===
      'APPROVED' ||
    data.kycStatus ===
      'REJECTED'
      ? data.kycStatus
      : undefined;

  return {
    uid,

    email:
      typeof data.email ===
      'string'
        ? data.email
        : '',

    fullName:
      typeof data.fullName ===
      'string'
        ? data.fullName
        : '',

    phone:
      typeof data.phone ===
      'string'
        ? data.phone
        : '',

    /**
     * Firestore profile data cannot turn
     * a customer into a PHCL Admin.
     */
    role:
      'user',

    tier,

    kycStatus,

    balances: {
      usd:
        toFiniteBalance(
          balances.usd,
        ),

      tzs:
        toFiniteBalance(
          balances.tzs,
        ),

      ntzs:
        toFiniteBalance(
          balances.ntzs,
        ),

      pi:
        toFiniteBalance(
          balances.pi,
        ),
    },
  };
}

/**
 * Customer-editable fields only.
 *
 * NOT editable here:
 *
 * - uid
 * - email
 * - role
 * - tier
 * - kycStatus
 * - balances
 */
export async function updateUserProfile(
  uid: string,
  data: EditableUserProfileFields,
): Promise<void> {
  const {
    db: currentDb,
  } =
    requireAuthenticatedUser(
      uid,
    );

  const update: {
    fullName?: string;
    phone?: string;
    updatedAt: ReturnType<
      typeof serverTimestamp
    >;
  } = {
    updatedAt:
      serverTimestamp(),
  };

  if (
    typeof data.fullName ===
    'string'
  ) {
    update.fullName =
      cleanText(
        data.fullName,
        120,
      );
  }

  if (
    typeof data.phone ===
    'string'
  ) {
    update.phone =
      cleanText(
        data.phone,
        40,
      );
  }

  await updateDoc(
    doc(
      currentDb,
      'users',
      uid,
    ),
    update,
  );
}

/**
 * FINANCIAL SECURITY BOUNDARY
 *
 * Existing legacy pages still import this
 * function, therefore its name remains
 * temporarily for compatibility.
 *
 * It intentionally performs NO balance
 * modification.
 *
 * Checkout, wallet, transfers, deposits and
 * refunds will be migrated to the PHCL
 * server-side financial ledger.
 */
export async function adjustUserBalance(
  uid: string,
  currency:
    keyof UserProfile['balances'],
  amount: number,
): Promise<never> {
  requireAuthenticatedUser(
    uid,
  );

  void currency;
  void amount;

  throw new Error(
    'Direct client-side balance mutation is disabled.',
  );
}