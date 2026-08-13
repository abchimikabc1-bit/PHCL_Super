// src/lib/auth.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  type User
} from 'firebase/auth';

// Hakikisha vigezo hivi vinalingana na mradi wako wa Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
);

function getFirebaseAuth() {
  if (!hasFirebaseConfig) {
    throw new Error('Firebase configuration is missing.');
  }

  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  return getAuth(app);
}

export function getClientAuth() {
  return getFirebaseAuth();
}

/**
 * 1. Kujisajili (Sign Up / Register)
 */
export async function registerWithEmail(email: string, password: string): Promise<User> {
  const userCredential = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  return userCredential.user;
}

/**
 * 2. Kuingia (Sign In / Login)
 */
export async function loginWithEmail(email: string, password: string): Promise<User> {
  const userCredential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  return userCredential.user;
}

/**
 * 3. Kutoka (Sign Out / Logout)
 */
export async function logoutUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

/**
 * 4. Kurejesha/Kusahau Neno la Siri (Password Reset)
 */
export async function resetUserPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(getFirebaseAuth(), email);
}

/**
 * 5. Kufuatilia Hali ya Login ya Mtumiaji (Auth State Observer)
 * Hii inafuatilia ikiwa mtumiaji ameingia au ametoka ili kubadilisha muonekano wa duka
 */
export function subscribeToAuth(callback: (user: User | null) => void) {
  if (!hasFirebaseConfig) {
    callback(null);
    return () => undefined;
  }

  return onAuthStateChanged(getFirebaseAuth(), callback);
}
