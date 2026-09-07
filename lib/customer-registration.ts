import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendEmailVerification,
  type User,
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
    .slice(0, maxLength);
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
    .replace(/\s+/g, '')
    .slice(0, 40);
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

function isReservedPhclEmail(
  email: string,
): boolean {
  const domain =
    email.split('@')[1] ?? '';

  return (
    domain === 'phclsuper.com' ||
    domain.endsWith(
      '.phclsuper.com',
    )
  );
}

/**
 * Creates only a least-privileged customer
 * identity and its safe initial profile.
 *
 * Firebase Authentication is authoritative
 * for email and phone verification. KYC/KYS/
 * KYB, MFA, biometrics, account standing and
 * financial value are never granted here.
 */
export async function registerCustomer(
  input: CustomerRegistrationInput,
): Promise<RegistrationResult> {
  let newlyCreatedUser:
    User | null = null;

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

  if (
    !email ||
    email.length > 320
  ) {
    return {
      ok: false,
      message:
        'Kwa usajili huu, barua pepe halali inahitajika.',
    };
  }

  if (
    isReservedPhclEmail(
      email,
    )
  ) {
    return {
      ok: false,
      message:
        'Barua pepe za ndani za PHCL haziwezi kusajiliwa kupitia mfumo wa kawaida wa wateja.',
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

  /*
   * Compatibility-only browser claims.
   * None is accepted as security authority.
   */
  void input.idType;
  void input.idNumber;
  void input.companyName;
  void input.companyRegNo;
  void input.mfaEnabled;
  void input.livenessVerified;
  void input.recaptchaToken;

  try {
    const {
      auth,
      db,
    } = requireFirebaseServices();

    const userCredential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        input.password,
      );

    const user =
      userCredential.user;

    newlyCreatedUser =
      user;

    const authenticatedEmail =
      user.email
        ?.trim()
        .toLowerCase();

    if (
      !authenticatedEmail ||
      authenticatedEmail !== email
    ) {
      throw new Error(
        'Authenticated email mismatch.',
      );
    }

    const profileRef =
      doc(
        db,
        'users',
        user.uid,
      );

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

    /*
     * Keep this payload synchronized with
     * isSafeCustomerCreate() in firestore.rules.
     */
    await setDoc(
      profileRef,
      {
        uid:
          user.uid,

        email:
          authenticatedEmail,

        fullName,

        phone,

        role:
          'user',

        tier:
          input.tier,

        kycStatus:
          'NOT_STARTED',

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

    try {
      await sendEmailVerification(
        user,
      );
    } catch {
      return {
        ok: true,
        message:
          'Akaunti imeundwa, lakini ujumbe wa uthibitishaji haukutumwa. Tafadhali tumia chaguo la kutuma ujumbe tena.',
        uid:
          user.uid,
      };
    }

    return {
      ok: true,
      message:
        'Akaunti imeundwa. Tafadhali thibitisha barua pepe yako kabla ya kuendelea.',
      uid:
        user.uid,
    };
  } catch (
    error: unknown
  ) {
    if (newlyCreatedUser) {
      await deleteUser(
        newlyCreatedUser,
      ).catch(() => {
        // Do not replace the primary failure.
      });
    }

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

    return {
      ok: false,
      message:
        'Usajili haukukamilika. Tafadhali jaribu tena.',
    };
  }
}

/**
 * Registration enumeration is intentionally
 * unavailable in the browser.
 */
export function getRegistrations():
  CustomerRegistration[] {
  return [];
}
