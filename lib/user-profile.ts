import {
  getApp,
  getApps,
  initializeApp,
} from 'firebase/app';

import { getAuth } from 'firebase/auth';

import {
  doc,
  getDoc,
  getFirestore,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

export type UserTier =
  | 'regular'
  | 'small_business'
  | 'corporate';

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  phone: string;

  balances: {
    usd: number;
    tzs: number;
    ntzs: number;
    pi: number;
  };

  role: 'user' | 'admin';

  tier?: UserTier;

  kycStatus?:
    | 'NOT_STARTED'
    | 'PENDING_REVIEW'
    | 'APPROVED'
    | 'REJECTED';
}

export async function createUserProfile(
  uid: string,
  email: string,
  fullName: string,
  phone: string,
  tier: UserTier,
): Promise<void> {
  await setDoc(doc(db, 'users', uid), {
    uid,
    email,
    fullName,
    phone,
    role: 'user',
    tier,

    kycStatus:
      tier !== 'regular'
        ? 'PENDING_REVIEW'
        : 'APPROVED',

    balances: {
      usd: 0,
      tzs: 0,
      ntzs: 0,
      pi: 0,
    },

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getUserProfile(
  uid: string,
): Promise<UserProfile | null> {
  const docSnap = await getDoc(
    doc(db, 'users', uid),
  );

  if (!docSnap.exists()) {
    return null;
  }

  return {
    uid,
    ...docSnap.data(),
  } as UserProfile;
}

export async function updateUserProfile(
  uid: string,
  data: Partial<
    Omit<UserProfile, 'uid' | 'balances' | 'role'>
  >,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function adjustUserBalance(
  uid: string,
  currency: keyof UserProfile['balances'],
  amount: number,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    [`balances.${currency}`]: increment(amount),
    updatedAt: serverTimestamp(),
  });
}