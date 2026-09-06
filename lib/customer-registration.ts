import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from 'firebase/auth';

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import {
  firebaseAuth,
  firebaseDb,
} from '@/lib/firebase-client';

import {
  getPolicyVersions,
} from '@/lib/policy-compliance';

export interface CustomerRegistration {
  fullName: string;
  email: string;
  phone: string;
}

export interface RegistrationResult {
  ok: boolean;
  message: string;
  uid?: string;
}

type CustomerTier =
  | 'regular'
  | 'small_business'
  | 'corporate';

type CustomerRegistrationInput = {
  fullName: string;
  email?: string;
  phone: string;
  country: string;
  password: string;
  tier: CustomerTier;

  /**
   * These fields are kept temporarily
   * for API compatibility with the
   * existing registration UI.
   *
   * They MUST NOT create verified
   * KYC/KYS/KYB authority.
   */
  idType?: string;
  idNumber?: string;
  companyName?: string;
  companyRegNo?: string;
  mfaEnabled?: boolean;
  livenessVerified?: boolean;
  recaptchaToken?: string;

  agreedToTerms: boolean;
  agreedToPrivacy: boolean;
};

type FirebaseAuthError = {
  code?: string;
  message?: string;
};

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

function normalizeEmail(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase();
}

function normalizePhone(
  value: string,
): string {
  return value
    .trim()
    .replace(/\s+/g, '');
}

function isValidTier(
  value: string,
): value is CustomerTier {
  return (
    value === 'regular' ||
    value === 'small_business' ||
    value === 'corporate'
  );
}

/**
 * Client-side customer registration.
 *
 * SECURITY MODEL:
 *
 * This function may create:
 * - Firebase customer identity
 * - basic customer profile
 * - unverified account/application data
 *
 * It MUST NOT:
 * - approve KYC
 * - approve KYS
 * - approve KYB
 * - create Admin authority
 * - create financial balances
 * - verify biometric/liveness claims
 * - verify business documents
 * - grant payout/payment privileges
 */
export async function registerCustomer(
  input: CustomerRegistrationInput,
): Promise<RegistrationResult> {
  const fullName =
    cleanText(
      input.fullName,
      120,
    );

  const email =
    input.email
      ? normalizeEmail(
          input.email,
        )
      : '';

  const phone =
    normalizePhone(
      input.phone,
    );

  const country =
    cleanText(
      input.country,
      80,
    );

  if (
    !fullName ||
    !country
  ) {
    return {
      ok: false,
      message:
        'Tafadhali jaza taarifa zote muhimu za usajili.',
    };
  }

  /**
   * This Email/Password registration flow
   * requires a real email address.
   *
   * Phone-only registration must later use
   * Firebase Phone Auth or another dedicated
   * verified phone-authentication flow.
   *
   * We intentionally do NOT manufacture
   * fake @phclsuper.com email addresses.
   */
  if (!email) {
    return {
      ok: false,
      message:
        'Kwa usajili huu, barua pepe halali inahitajika. Usajili wa kutumia simu pekee utaendeshwa kupitia mfumo maalum wa Phone Authentication.',
    };
  }

  /**
   * Internal PHCL email addresses must never
   * be self-registered through the public
   * customer registration flow.
   */
  if (
    email.endsWith(
      '@phclsuper.com',
    )
  ) {
    return {
      ok: false,
      message:
        'Barua pepe za ndani za @phclsuper.com haziwezi kusajiliwa kupitia mfumo wa kawaida wa wateja.',
    };
  }

  if (
    fullName
      .split(/\s+/)
      .filter(Boolean)
      .length < 2
  ) {
    return {
      ok: false,
      message:
        'Tafadhali ingiza jina lako kamili.',
    };
  }

  /**
   * Firebase itself also enforces its
   * password policy where configured.
   *
   * Do not impose a weak maximum such as
   * 12 characters.
   */
  if (
    input.password.length < 8
  ) {
    return {
      ok: false,
      message:
        'Nenosiri lazima liwe na angalau herufi 8.',
    };
  }

  if (
    input.password.length > 128
  ) {
    return {
      ok: false,
      message:
        'Nenosiri ni refu kupita kiwango kinachoruhusiwa.',
    };
  }

  if (
    !isValidTier(
      input.tier,
    )
  ) {
    return {
      ok: false,
      message:
        'Aina ya akaunti si sahihi.',
    };
  }

  if (
    !input.agreedToTerms ||
    !input.agreedToPrivacy
  ) {
    return {
      ok: false,
      message:
        'Ni lazima ukubali Masharti ya Matumizi na Sera ya Faragha.',
    };
  }

  /**
   * IMPORTANT:
   *
   * We deliberately DO NOT trust:
   *
   * input.livenessVerified
   * input.recaptchaToken
   * input.mfaEnabled
   *
   * as security authority.
   *
   * Those must later be verified by
   * server-side services.
   */
  void input.livenessVerified;
  void input.recaptchaToken;
  void input.mfaEnabled;
  void input.idNumber;

  try {
    const {
      auth,
      db,
    } =
      requireFirebaseServices();

    /**
     * Create Firebase CUSTOMER identity.
     */
    const userCredential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        input.password,
      );

    const user =
      userCredential.user;

    const uid =
      user.uid;

    /**
     * Send verification email.
     *
     * Email verification does NOT equal
     * KYC/KYS/KYB approval.
     */
    await sendEmailVerification(
      user,
    );

    const profileRef =
      doc(
        db,
        'users',
        uid,
      );

    /**
     * Fail closed if a profile somehow
     * already exists for this UID.
     */
    const existingProfile =
      await getDoc(
        profileRef,
      );

    if (
      existingProfile.exists()
    ) {
      throw new Error(
        'Customer profile already exists.',
      );
    }

    const policyVersions =
      getPolicyVersions();

    const companyName =
      input.tier === 'corporate' &&
      input.companyName
        ? cleanText(
            input.companyName,
            160,
          )
        : null;

    const companyRegNo =
      input.tier === 'corporate' &&
      input.companyRegNo
        ? cleanText(
            input.companyRegNo,
            100,
          )
        : null;

    const idType =
      input.tier !== 'regular' &&
      input.idType
        ? cleanText(
            input.idType,
            60,
          )
        : null;

    /**
     * Store a CUSTOMER profile only.
     *
     * All privileged states start
     * unverified / zero / disabled.
     */
    await setDoc(
      profileRef,
      {
        uid,

        email,

        fullName,

        phone:
          cleanText(
            phone,
            40,
          ),

        country,

        /**
         * Public registration can NEVER
         * create Admin authority.
         */
        role:
          'user',

        tier:
          input.tier,

        /**
         * Identity verification always
         * starts unverified.
         */
        kycStatus:
          'NOT_STARTED',

        kysStatus:
          input.tier ===
            'small_business'
            ? 'NOT_STARTED'
            : null,

        kybStatus:
          input.tier ===
            'corporate'
            ? 'NOT_STARTED'
            : null,

        /**
         * These are claims supplied by
         * the applicant, NOT verified facts.
         */
        application: {
          idType,

          companyName,

          companyRegNo,
        },

        /**
         * Raw ID numbers are intentionally
         * NOT stored here from browser input.
         *
         * Sensitive identity documents will
         * belong to the later protected
         * verification workflow.
         */

        emailVerified:
          false,

        phoneVerified:
          false,

        biometricVerification: {
          status:
            'NOT_STARTED',

          /**
           * Raw fingerprint / face templates
           * must never be placed in this
           * ordinary customer document.
           */
          rawBiometricStored:
            false,
        },

        mfa: {
          enabled:
            false,

          verified:
            false,
        },

        /**
         * Registration cannot mint,
         * deposit, credit or assign funds.
         */
        balances: {
          usd: 0,
          tzs: 0,
          ntzs: 0,
          pi: 0,
        },

        accountStatus:
          'ACTIVE',

        verificationStatus:
          'UNVERIFIED',

        consent: {
          agreedToTerms:
            true,

          agreedToPrivacy:
            true,

          termsVersion:
            policyVersions
              .termsVersion,

          privacyVersion:
            policyVersions
              .privacyVersion,

          agreedAt:
            new Date()
              .toISOString(),
        },

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp(),
      },
    );

    return {
      ok: true,

      message:
        'Akaunti imeundwa. Tafadhali thibitisha barua pepe yako na ukamilishe hatua zinazohitajika za uthibitishaji wa akaunti.',

      uid,
    };
  } catch (
    error: unknown
  ) {
    const firebaseError =
      error as FirebaseAuthError;

    if (
      firebaseError.code ===
        'auth/email-already-in-use'
    ) {
      return {
        ok: false,

        message:
          'Barua pepe hii tayari imesajiliwa.',
      };
    }

    if (
      firebaseError.code ===
        'auth/invalid-email'
    ) {
      return {
        ok: false,

        message:
          'Barua pepe uliyoingiza si sahihi.',
      };
    }

    if (
      firebaseError.code ===
        'auth/weak-password'
    ) {
      return {
        ok: false,

        message:
          'Nenosiri halijafikia kiwango cha usalama kinachohitajika.',
      };
    }

    /**
     * Do not expose raw Firebase/internal
     * infrastructure error details to users.
     */
    return {
      ok: false,

      message:
        'Usajili haukukamilika. Tafadhali jaribu tena.',
    };
  }
}

/**
 * Legacy compatibility function.
 *
 * Registration enumeration must never
 * expose customer records from the browser.
 */
export function getRegistrations():
  CustomerRegistration[] {
  return [];
}