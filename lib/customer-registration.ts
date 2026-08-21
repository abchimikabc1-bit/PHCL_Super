import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db, generateSeedPhrase } from './user-profile';
import { getPolicyVersions } from '@/lib/policy-compliance';

export interface RegistrationResult {
  ok: boolean;
  message: string;
  uid?: string;
  seedPhrase?: string;
}

export const registerCustomer = async (input: {
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
}): Promise<RegistrationResult> => {
  const fullName = input.fullName.trim();
  const phone = input.phone.trim().replace(/\s+/g, ''); // Safisha nafasi kwenye namba
  const country = input.country.trim();

  // 1. Uhakiki wa Namba ya Simu au Email Uwepo wa Lazima
  if (!input.email?.trim() && !phone) {
    return { ok: false, message: 'Ni lazima uweke Namba ya Simu au Barua Pepe ili kujiunga!' };
  }

  // 2. ZUIA MTUMIAJI KUANDIKA DOMAIN YA SIRI KWA MIKONO YAKE (ANTI-FRAUD)
  if (input.email && input.email.trim().toLowerCase().endsWith('@phclsuper.com')) {
    return { ok: false, message: 'Huruhusiwi kutumia barua pepe ya @phclsuper.com kujisajili!' };
  }

  // 3. UHAKIKI WA NAMBA YA SIMU ISIJIRUDIE KWENYE DATABASE (Firestore Check)
  if (phone && db) {
    const q = query(collection(db, 'users'), where('phone', '==', input.phone.trim()));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return { ok: false, message: 'Namba hii ya simu tayari imesajiliwa kwenye mfumo wetu! Tumia barua pepe yako.' };
    }
  }

  // BINASISHA VIRTUAL EMAIL KIOTOMATIKI IKIWA HAWANA EMAIL
  const email = input.email?.trim()
    ? input.email.trim().toLowerCase()
    : `${phone}@phclsuper.com`;

  if (fullName.split(/\s+/).length < 3) {
    return { ok: false, message: 'Tafadhali ingiza majina yako matatu kamili!' };
  }
  if (input.password.length < 8 || input.password.length > 12) {
    return { ok: false, message: 'Nenosiri lazima liwe na urefu wa herufi 8 hadi 12!' };
  }

  // Uhakiki wa Liveness kwa Tier 2 & 3
  if (input.tier !== 'regular' && !input.livenessVerified) {
    return { ok: false, message: 'Ni lazima ukamilishe uhakiki wa Liveness (Kupepesa Macho)!' };
  }
  if (input.tier !== 'regular' && !input.recaptchaToken) {
    return { ok: false, message: 'Kamilisha reCAPTCHA challenge ya usalama!' };
  }

  try {
    // 2. Kusajili Mtumiaji Kwenye Firebase Auth
    const userCred = await createUserWithEmailAndPassword(auth, email, input.password);
    const uid = userCred.user.uid;
    
    // TUMA BARUA PEPE YA UTHIBITISHO KIOTOMATIKI (EMAIL VERIFICATION)
    await sendEmailVerification(userCred.user); // <--- ONGEZA MSTARI HUU HAPA!
    
    const policyVersions = getPolicyVersions();
    const seedPhrase = generateSeedPhrase();

    // 4. Kusajili Mtumiaji Kwenye Firebase Auth
    const userCred = await createUserWithEmailAndPassword(auth, email, input.password);
    const uid = userCred.user.uid;
    const policyVersions = getPolicyVersions();
    const seedPhrase = generateSeedPhrase();

    // 5. Kuokoa Wasifu, Daraja, na Seed Phrase Kwenye Firestore
    await setDoc(doc(db, 'users', uid), {
      uid,
      email,
      fullName,
      phone: input.phone.trim(),
      country,
      tier: input.tier,
      role: 'user',
      seedPhrase,
      idType: input.tier !== 'regular' ? input.idType : null,
      idNumber: input.tier !== 'regular' ? input.idNumber : null,
      companyName: input.tier === 'corporate' ? input.companyName : null,
      companyRegNo: input.tier === 'corporate' ? input.companyRegNo : null,
      mfaEnabled: input.tier !== 'regular' ? Boolean(input.mfaEnabled) : false,
      livenessVerified: input.tier !== 'regular' ? Boolean(input.livenessVerified) : false,
      kycStatus: input.tier !== 'regular' ? 'PENDING_REVIEW' : 'APPROVED',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      balances: { usd: 0, tzs: 0, ntzs: 0, pi: 0 },
      consent: {
        agreedToTerms: true,
        agreedToPrivacy: true,
        termsVersion: policyVersions.termsVersion,
        privacyVersion: policyVersions.privacyVersion,
        agreedAt: new Date().toISOString()
      }
    });

    return { ok: true, message: 'Usajili na uundaji wa pochi kimekamilika kikamilifu!', uid, seedPhrase };
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      return { ok: false, message: 'Namba ya Simu au Email hii tayari imesajiliwa kwenye mfumo!' };
    }
    return { ok: false, message: error.message || 'Kosa la usajili limejitokeza.' };
  }
};

export const getRegistrations = () => [];
