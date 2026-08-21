import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, generateSeedPhrase } from './user-profile'; // Tumeagiza generateSeedPhrase hapa
import { getPolicyVersions } from '@/lib/policy-compliance';

export interface RegistrationResult {
  ok: boolean;
  message: string;
  uid?: string;
  seedPhrase?: string; // Tumeongeza hapa ili fomu ya signup iweze kuonyesha maneno 12 ya siri!
}

export const registerCustomer = async (input: {
  fullName: string;
  email: string;
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
  recaptchaToken?: string; // Bot challenge token
  agreedToTerms: boolean;
  agreedToPrivacy: boolean;
}): Promise<RegistrationResult> => {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  const country = input.country.trim();

  // 1. Uhakiki wa Kienyeji na Usalama (Validations)
  if (fullName.split(/\s+/).length < 3) {
    return { ok: false, message: 'Tafadhali ingiza majina yako matatu kamili!' };
  }
  if (input.password.length < 8 || input.password.length > 12) {
    return { ok: false, message: 'Nenosiri lazima liwe na urefu wa herufi 8 hadi 12!' };
  }
  if (!input.agreedToTerms || !input.agreedToPrivacy) {
    return { ok: false, message: 'Ni lazima ukubali Sera na Vigezo vya Huduma!' };
  }

  // Uhakiki wa Liveness (Kupepesa macho) kwa Tier 2 & 3
  if (input.tier !== 'regular' && !input.livenessVerified) {
    return { ok: false, message: 'Ni lazima ukamilishe uhakiki wa Liveness (Kupepesa Macho)!' };
  }

  // Uhakiki wa reCAPTCHA (Bot Protection)
  if (input.tier !== 'regular' && !input.recaptchaToken) {
    return { ok: false, message: 'Kosa la Roboti: Kamilisha reCAPTCHA challenge ya usalama!' };
  }

  try {
    // 2. Kusajili Mtumiaji Kwenye Firebase Authentication
    const userCred = await createUserWithEmailAndPassword(auth, email, input.password);
    const uid = userCred.user.uid;
    const policyVersions = getPolicyVersions();
    
    // ZALISHA MANENO YA SIRI 12 YA KUREJESHA POCHI (SEED PHRASE)
    const seedPhrase = generateSeedPhrase();

    // 3. Kuokoa Profaili, Daraja, na Seed Phrase Kwenye Firestore
    await setDoc(doc(db, 'users', uid), {
      uid,
      email,
      fullName,
      phone,
      country,
      tier: input.tier,
      role: 'user',
      seedPhrase, // Inahifadhi maneno 12 ya siri kwenye Firestore kwa usalama
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

    // Inarudisha uid na seedPhrase ili ukurasa wa Signup uweze kuwaonyesha kwa usalama
    return { ok: true, message: 'Usajili na kuanzisha pochi kimekamilika kikamilifu!', uid, seedPhrase };
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      return { ok: false, message: 'Barua pepe hii tayari imeshasajiliwa kwenye mfumo!' };
    }
    return { ok: false, message: error.message || 'Kosa la usajili limejitokeza.' };
  }
};

// Inalinda ukurasa wa Feedback usigome
export const getRegistrations = () => [];
