// src/lib/auth.ts

import {
  createUserWithEmailAndPassword,
  linkWithCredential,
  onAuthStateChanged,
  PhoneAuthProvider,
  RecaptchaVerifier,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type ConfirmationResult,
  type User,
} from 'firebase/auth';

import {
  firebaseAuth,
} from '@/lib/firebase-client';

/**
 * Firebase Auth instance used by the
 * PHCL Super customer authentication flow.
 *
 * There must be only one Firebase client
 * app/auth authority in the browser.
 */
export const auth =
  firebaseAuth;

const E164_PHONE_PATTERN =
  /^\+[1-9]\d{7,14}$/;

/**
 * Register a new Firebase customer account.
 */
export async function registerWithEmail(
  email: string,
  password: string,
): Promise<User> {
  if (!auth) {
    throw new Error(
      'Firebase authentication is not configured.',
    );
  }

  const userCredential =
    await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );

  return userCredential.user;
}

/**
 * Sign in an existing Firebase customer.
 */
export async function loginWithEmail(
  email: string,
  password: string,
): Promise<User> {
  if (!auth) {
    throw new Error(
      'Firebase authentication is not configured.',
    );
  }

  const userCredential =
    await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );

  return userCredential.user;
}

/**
 * Send a Firebase email-verification message
 * to an authenticated PHCL customer.
 */
export async function sendCustomerEmailVerification(
  user: User,
): Promise<void> {
  if (!auth) {
    throw new Error(
      'Firebase authentication is not configured.',
    );
  }

  if (
    !user ||
    !user.uid
  ) {
    throw new Error(
      'Authenticated customer is required.',
    );
  }

  if (
    auth.currentUser?.uid !==
    user.uid
  ) {
    throw new Error(
      'Authenticated customer mismatch.',
    );
  }

  if (
    user.emailVerified
  ) {
    return;
  }

  await sendEmailVerification(
    user,
  );
}

/**
 * Refresh the currently authenticated
 * customer's Firebase identity state.
 */
export async function refreshCurrentCustomer(
  user: User,
): Promise<User> {
  if (!auth) {
    throw new Error(
      'Firebase authentication is not configured.',
    );
  }

  if (
    !user ||
    !user.uid
  ) {
    throw new Error(
      'Authenticated customer is required.',
    );
  }

  if (
    auth.currentUser?.uid !==
    user.uid
  ) {
    throw new Error(
      'Authenticated customer mismatch.',
    );
  }

  await user.reload();

  await user.getIdToken(
    true,
  );

  return user;
}

/**
 * Create the reCAPTCHA verifier required by
 * Firebase Phone Authentication.
 *
 * The container must already exist in the DOM.
 * Call clear() on the returned verifier when the
 * flow is abandoned or the component unmounts.
 */
export function createCustomerPhoneRecaptchaVerifier(
  containerId: string,
): RecaptchaVerifier {
  if (!auth) {
    throw new Error(
      'Firebase authentication is not configured.',
    );
  }

  const normalizedContainerId =
    containerId.trim();

  if (!normalizedContainerId) {
    throw new Error(
      'Phone verification reCAPTCHA container is required.',
    );
  }

  return new RecaptchaVerifier(
    auth,
    normalizedContainerId,
    {
      size: 'invisible',
    },
  );
}

/**
 * Send an SMS verification code for a phone
 * number that will be LINKED to the currently
 * authenticated Firebase customer.
 *
 * IMPORTANT:
 * Sending the SMS does not verify or link the
 * number. Verification becomes authoritative
 * only after verifyAndLinkCustomerPhoneNumber().
 */
export async function sendCustomerPhoneVerificationCode(
  user: User,
  phoneNumber: string,
  verifier: RecaptchaVerifier,
): Promise<ConfirmationResult> {
  if (!auth) {
    throw new Error(
      'Firebase authentication is not configured.',
    );
  }

  if (
    !user ||
    !user.uid
  ) {
    throw new Error(
      'Authenticated customer is required.',
    );
  }

  if (
    auth.currentUser?.uid !==
    user.uid
  ) {
    throw new Error(
      'Authenticated customer mismatch.',
    );
  }

  const normalizedPhoneNumber =
    phoneNumber.trim();

  if (
    !E164_PHONE_PATTERN.test(
      normalizedPhoneNumber,
    )
  ) {
    throw new Error(
      'Phone number must use international format, for example +255712345678.',
    );
  }

  /**
   * PhoneAuthProvider only starts the Firebase
   * verification challenge. It does not sign in
   * a separate phone-only customer account.
   */
  const provider =
    new PhoneAuthProvider(
      auth,
    );

  const verificationId =
    await provider.verifyPhoneNumber(
      normalizedPhoneNumber,
      verifier,
    );

  /**
   * Keep a ConfirmationResult-compatible object
   * so the UI only needs an opaque verification
   * result and never handles phoneVerified flags.
   */
  return {
    verificationId,

    confirm:
      async (
        verificationCode: string,
      ) => {
        const credential =
          PhoneAuthProvider.credential(
            verificationId,
            verificationCode.trim(),
          );

        return linkWithCredential(
          user,
          credential,
        );
      },
  };
}

/**
 * Verify the SMS code and LINK the verified
 * phone credential to the SAME Firebase UID.
 *
 * This function never writes phoneVerified to
 * Firestore. Firebase Authentication becomes
 * the phone-verification authority.
 */
export async function verifyAndLinkCustomerPhoneNumber(
  user: User,
  confirmationResult: ConfirmationResult,
  verificationCode: string,
): Promise<User> {
  if (!auth) {
    throw new Error(
      'Firebase authentication is not configured.',
    );
  }

  if (
    !user ||
    !user.uid
  ) {
    throw new Error(
      'Authenticated customer is required.',
    );
  }

  if (
    auth.currentUser?.uid !==
    user.uid
  ) {
    throw new Error(
      'Authenticated customer mismatch.',
    );
  }

  const normalizedCode =
    verificationCode.trim();

  if (
    !/^\d{4,8}$/.test(
      normalizedCode,
    )
  ) {
    throw new Error(
      'Invalid phone verification code.',
    );
  }

  const linkedCredential =
    await confirmationResult.confirm(
      normalizedCode,
    );

  if (
    linkedCredential.user.uid !==
    user.uid
  ) {
    throw new Error(
      'Phone credential customer mismatch.',
    );
  }

  await linkedCredential.user.reload();

  await linkedCredential.user.getIdToken(
    true,
  );

  return linkedCredential.user;
}

/**
 * Sign out the current Firebase customer.
 */
export async function logoutUser(): Promise<void> {
  if (!auth) {
    return;
  }

  await signOut(auth);
}

/**
 * Send Firebase password-reset email.
 */
export async function resetUserPassword(
  email: string,
): Promise<void> {
  if (!auth) {
    throw new Error(
      'Firebase authentication is not configured.',
    );
  }

  await sendPasswordResetEmail(
    auth,
    email,
  );
}

/**
 * Subscribe to Firebase customer
 * authentication state.
 */
export function subscribeToAuth(
  callback:
    (user: User | null) => void,
): () => void {
  if (!auth) {
    callback(null);

    return () => undefined;
  }

  return onAuthStateChanged(
    auth,
    callback,
  );
}
