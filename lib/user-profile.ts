// src/lib/user-profile.ts
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { getApp, getApps, initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = Object.values(firebaseConfig).every(Boolean)
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : undefined as any;

// Kuanzisha Firestore instance
export const db = app ? getFirestore(app) : null as any;
export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  phone: string;
  addressLine1?: string;
  city?: string;
  country?: string;s
  createdAt: any;
  updatedAt: any;
  balances: {
    usd: number;
    tzs: number;
    ntzs: number;
    pi: number;
  };
  role: 'user' | 'admin';
  tier?: 'regular' | 'small_business' | 'corporate'; // TUMEONGEZA HAPA KWA USALAMA
  kycStatus?: 'NOT_STARTED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'; // TUMEONGEZA HAPA
}

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  phone: string;
  addressLine1?: string;
  city?: string;
  country?: string;
  createdAt: any;
  updatedAt: any;
  balances: {
    usd: number;
    tzs: number;
    ntzs: number;
    pi: number;
  };
  role: 'user' | 'admin';
}

/**
 * 1. Kuunda Profile Mpya ya Mtumiaji (Create User Profile)
 * Inaitwa mara tu mtumiaji mpya anapomaliza kujisajili kwenye ukurasa wa 'login'
 */
export async function createUserProfile(
  uid: string,
  email: string,
  fullName: string,
  phone: string
): Promise<void> {
  if (!db) {
    throw new Error('Firestore is not configured.');
  }
  const userRef = doc(db, 'users', uid);

  const defaultProfile: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'> = {
    email,
    fullName,
    phone,
    balances: {
      usd: 0, // Salio la kuanzia la kielelezo (no-cost starter balance)
      tzs: 0,
      ntzs: 0,
      pi: 0,
    },
    role: 'user',
  };

  await setDoc(userRef, {
    ...defaultProfile,
    uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * 2. Kusoma Taarifa za Profile (Get User Profile)
 * Inasoma taarifa za mtumiaji aliyeko active kwa usalama
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!db) {
    return null;
  }
  const userRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    return null;
  }

  return {
    uid,
    ...userDoc.data(),
  } as UserProfile;
}

/**
 * 3. Kusasisha Taarifa za Anwani au Mawasiliano (Update User Profile)
 */
export async function updateUserProfile(
  uid: string,
  data: Partial<Omit<UserProfile, 'uid' | 'balances' | 'role' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  if (!db) {
    throw new Error('Firestore is not configured.');
  }
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * 4. Kusasisha Salio la Wallet kwa Usalama (Securely Mutate Balance)
 * Kutumia 'increment' inahakikisha miamala mingi ikitokea kwa pamoja, salio halivurugiki
 */
export async function adjustUserBalance(
  uid: string,
  currency: 'usd' | 'tzs' | 'ntzs' | 'pi',
  amount: number
): Promise<void> {
  if (!db) {
    throw new Error('Firestore is not configured.');
  }
  const userRef = doc(db, 'users', uid);
  const balanceField = `balances.${currency}`;

  await updateDoc(userRef, {
    [balanceField]: increment(amount),
    updatedAt: serverTimestamp(),
  });
}
