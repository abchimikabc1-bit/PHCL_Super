// src/lib/auth.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { getFirebaseAuthClient } from '@/lib/firebase-client';

function requireAuth() {
  const auth = getFirebaseAuthClient();
  if (!auth) {
    throw new Error('Firebase client configuration is missing.');
  }
  return auth;
}

/**
 * 1. Kujisajili (Sign Up / Register)
 */
export async function registerWithEmail(email: string, password: string): Promise<User> {
  const auth = requireAuth();
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

/**
 * 2. Kuingia (Sign In / Login)
 */
export async function loginWithEmail(email: string, password: string): Promise<User> {
  const auth = requireAuth();
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

/**
 * 3. Kutoka (Sign Out / Logout)
 */
export async function logoutUser(): Promise<void> {
  const auth = requireAuth();
  await signOut(auth);
}

/**
 * 4. Kurejesha/Kusahau Neno la Siri (Password Reset)
 */
export async function resetUserPassword(email: string): Promise<void> {
  const auth = requireAuth();
  await sendPasswordResetEmail(auth, email);
}

/**
 * 5. Kufuatilia Hali ya Login ya Mtumiaji (Auth State Observer)
 * Hii inafuatilia ikiwa mtumiaji ameingia au ametoka ili kubadilisha muonekano wa duka
 */
export function subscribeToAuth(callback: (user: User | null) => void) {
  const auth = getFirebaseAuthClient();
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}
