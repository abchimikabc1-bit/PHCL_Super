import { getPolicyVersions } from '@/lib/policy-compliance';

export type CustomerConsent = {
  agreedToTerms: boolean;
  agreedToPrivacy: boolean;
  marketingOptIn: boolean;
  agreedAt: string;
  termsVersion: string;
  privacyVersion: string;
};

export type CustomerRegistration = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  passwordHint: string;
  createdAt: string;
  consent: CustomerConsent;
};

const REGISTRY_KEY = 'phcl_customer_registrations_v1';

const safeParse = <T>(value: string, fallback: T): T => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const getRegistrations = (): CustomerRegistration[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(REGISTRY_KEY);
  if (!raw) {
    return [];
  }

  return safeParse<CustomerRegistration[]>(raw, []);
};

const persistRegistrations = (entries: CustomerRegistration[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(REGISTRY_KEY, JSON.stringify(entries));
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const registerCustomer = (input: {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  password: string;
  agreedToTerms: boolean;
  agreedToPrivacy: boolean;
  marketingOptIn: boolean;
}): { ok: boolean; message: string; entry?: CustomerRegistration } => {
  const fullName = input.fullName.trim();
  const email = normalizeEmail(input.email);
  const phone = input.phone.trim();
  const country = input.country.trim();
  const password = input.password;

  if (fullName.length < 3) {
    return { ok: false, message: 'Full name must be at least 3 characters.' };
  }
  if (!email.includes('@') || email.length < 6) {
    return { ok: false, message: 'Enter a valid email address.' };
  }
  if (phone.length < 7) {
    return { ok: false, message: 'Enter a valid phone number.' };
  }
  if (country.length < 2) {
    return { ok: false, message: 'Enter your country.' };
  }
  if (password.length < 8) {
    return { ok: false, message: 'Password must be at least 8 characters.' };
  }
  if (!input.agreedToTerms || !input.agreedToPrivacy) {
    return { ok: false, message: 'You must agree to Terms and Privacy Policy before registration.' };
  }

  const existing = getRegistrations();
  if (existing.some((entry) => normalizeEmail(entry.email) === email)) {
    return { ok: false, message: 'This email is already registered.' };
  }

  const now = new Date().toISOString();
  const policyVersions = getPolicyVersions();
  const entry: CustomerRegistration = {
    id: `CUS-${Date.now()}`,
    fullName,
    email,
    phone,
    country,
    passwordHint: `${password.slice(0, 2)}••••${password.slice(-1)}`,
    createdAt: now,
    consent: {
      agreedToTerms: true,
      agreedToPrivacy: true,
      marketingOptIn: Boolean(input.marketingOptIn),
      agreedAt: now,
      termsVersion: policyVersions.termsVersion,
      privacyVersion: policyVersions.privacyVersion,
    },
  };

  persistRegistrations([entry, ...existing]);
  return { ok: true, message: 'Registration completed successfully.', entry };
};
