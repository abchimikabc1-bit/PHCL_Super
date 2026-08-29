import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from 'firebase/auth';

import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';

import { getPolicyVersions } from '@/lib/policy-compliance';
import { auth, db } from './user-profile';

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

type CustomerRegistrationInput = {
  fullName: string;
  email?: string;
  phone: string;
  country: string;
  password: string;
  tier: 'regular' | 'small_business' | 'corporate';
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

export const registerCustomer = async (
  input: CustomerRegistrationInput,
): Promise<RegistrationResult> => {
  const fullName = input.fullName.trim();
  const phone = input.phone.trim().replace(/\s+/g, '');
  const country = input.country.trim();

  // Lazima kuwe na namba ya simu au barua pepe
  if (!input.email?.trim() && !phone) {
    return {
      ok: false,
      message:
        'Ni lazima uweke Namba ya Simu au Barua Pepe kuendelea!',
    };
  }

  // Zuia matumizi ya domain ya ndani ya PHCL
  if (
    input.email &&
    input.email.trim().toLowerCase().endsWith('@phclsuper.com')
  ) {
    return {
      ok: false,
      message:
        'Huruhusiwi kutumia barua pepe ya @phclsuper.com kujisajili!',
    };
  }

  // Hakikisha namba ya simu haijatumika tayari
  if (phone) {
    const phoneQuery = query(
      collection(db, 'users'),
      where('phone', '==', input.phone.trim()),
    );

    const querySnapshot = await getDocs(phoneQuery);

    if (!querySnapshot.empty) {
      return {
        ok: false,
        message:
          'Namba hii ya simu tayari imesajiliwa kwenye mfumo wetu! Tumia barua pepe yako.',
      };
    }
  }

  // Tengeneza virtual email kama mtumiaji hana email
  const email = input.email?.trim()
    ? input.email.trim().toLowerCase()
    : `${phone}@phclsuper.com`;

  if (fullName.split(/\s+/).length < 3) {
    return {
      ok: false,
      message: 'Tafadhali ingiza majina yako matatu kamili!',
    };
  }

  if (input.password.length < 8 || input.password.length > 12) {
    return {
      ok: false,
      message:
        'Nenosiri lazima liwe na urefu wa herufi 8 hadi 12!',
    };
  }

  if (input.tier !== 'regular' && !input.livenessVerified) {
    return {
      ok: false,
      message:
        'Ni lazima ukamilishe uhakiki wa Liveness (Kupepesa Macho)!',
    };
  }

  if (input.tier !== 'regular' && !input.recaptchaToken) {
    return {
      ok: false,
      message: 'Kamilisha reCAPTCHA challenge ya usalama!',
    };
  }

  try {
    // Sajili mtumiaji kwenye Firebase Authentication
    const userCred = await createUserWithEmailAndPassword(
      auth,
      email,
      input.password,
    );

    const uid = userCred.user.uid;

    await sendEmailVerification(userCred.user);

    const policyVersions = getPolicyVersions();

    // Hifadhi profile pekee.
    // Hakuna seed phrase/private key inayohifadhiwa Firestore.
    await setDoc(doc(db, 'users', uid), {
      uid,
      email,
      fullName,
      phone: input.phone.trim(),
      country,
      tier: input.tier,
      role: 'user',

      idType:
        input.tier !== 'regular'
          ? input.idType ?? null
          : null,

      idNumber:
        input.tier !== 'regular'
          ? input.idNumber ?? null
          : null,

      companyName:
        input.tier === 'corporate'
          ? input.companyName ?? null
          : null,

      companyRegNo:
        input.tier === 'corporate'
          ? input.companyRegNo ?? null
          : null,

      mfaEnabled:
        input.tier !== 'regular'
          ? Boolean(input.mfaEnabled)
          : false,

      livenessVerified:
        input.tier !== 'regular'
          ? Boolean(input.livenessVerified)
          : false,

      kycStatus:
        input.tier !== 'regular'
          ? 'PENDING_REVIEW'
          : 'APPROVED',

      balances: {
        usd: 0,
        tzs: 0,
        ntzs: 0,
        pi: 0,
      },

      consent: {
        agreedToTerms: input.agreedToTerms,
        agreedToPrivacy: input.agreedToPrivacy,
        termsVersion: policyVersions.termsVersion,
        privacyVersion: policyVersions.privacyVersion,
        agreedAt: new Date().toISOString(),
      },

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      ok: true,
      message: 'Usajili umekamilika kikamilifu!',
      uid,
    };
  } catch (error: unknown) {
    const firebaseError = error as FirebaseAuthError;

    if (firebaseError.code === 'auth/email-already-in-use') {
      return {
        ok: false,
        message:
          'Namba ya Simu au Email hii tayari imesajiliwa kwenye mfumo!',
      };
    }

    return {
      ok: false,
      message:
        firebaseError.message ||
        'Kosa la usajili limejitokeza.',
    };
  }
};

export const getRegistrations = (): CustomerRegistration[] => [];