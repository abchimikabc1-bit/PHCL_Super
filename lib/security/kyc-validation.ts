export type KycRegistrationInput = {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  fingerprintToken: string;
  faceScanToken: string;
  agreedToTerms?: boolean;
  agreedToPrivacy?: boolean;
  marketingOptIn?: boolean;
};

export type KycValidationResult = {
  valid: boolean;
  errors: Partial<Record<keyof KycRegistrationInput, string>>;
  sanitized: KycRegistrationInput;
};

const NAME_REGEX = /^[A-Za-z][A-Za-z\s'-]{1,39}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,12}$/;

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

export function validateKycRegistration(input: Partial<KycRegistrationInput>): KycValidationResult {
  const sanitized: KycRegistrationInput = {
    firstName: clean(input.firstName),
    middleName: clean(input.middleName),
    lastName: clean(input.lastName),
    email: clean(input.email).toLowerCase(),
    password: typeof input.password === 'string' ? input.password : '',
    confirmPassword: typeof input.confirmPassword === 'string' ? input.confirmPassword : '',
    fingerprintToken: clean(input.fingerprintToken),
    faceScanToken: clean(input.faceScanToken),
    agreedToTerms: Boolean(input.agreedToTerms),
    agreedToPrivacy: Boolean(input.agreedToPrivacy),
    marketingOptIn: Boolean(input.marketingOptIn),
  };

  const errors: KycValidationResult['errors'] = {};

  if (!sanitized.firstName) errors.firstName = 'First name is required.';
  else if (!NAME_REGEX.test(sanitized.firstName)) errors.firstName = 'First name is invalid.';

  if (!sanitized.middleName) errors.middleName = 'Middle name is required.';
  else if (!NAME_REGEX.test(sanitized.middleName)) errors.middleName = 'Middle name is invalid.';

  if (!sanitized.lastName) errors.lastName = 'Last name is required.';
  else if (!NAME_REGEX.test(sanitized.lastName)) errors.lastName = 'Last name is invalid.';

  if (!sanitized.email) errors.email = 'Email is required.';
  else if (!EMAIL_REGEX.test(sanitized.email)) errors.email = 'Email is invalid.';

  if (!sanitized.password) {
    errors.password = 'Password is required.';
  } else if (!PASSWORD_REGEX.test(sanitized.password)) {
    errors.password =
      'Password must be 8-12 characters and include uppercase, lowercase, number, and symbol.';
  }

  if (!sanitized.confirmPassword) {
    errors.confirmPassword = 'Password confirmation is required.';
  } else if (sanitized.password !== sanitized.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  if (!sanitized.fingerprintToken) {
    errors.fingerprintToken = 'Fingerprint verification is required.';
  } else if (sanitized.fingerprintToken.length < 16) {
    errors.fingerprintToken = 'Fingerprint verification token is invalid.';
  }

  if (!sanitized.faceScanToken) {
    errors.faceScanToken = 'Face verification is required.';
  } else if (sanitized.faceScanToken.length < 16) {
    errors.faceScanToken = 'Face verification token is invalid.';
  }

  if (!sanitized.agreedToTerms) errors.agreedToTerms = 'Terms agreement is required.';
  if (!sanitized.agreedToPrivacy) errors.agreedToPrivacy = 'Privacy agreement is required.';

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized,
  };
}