// src/lib/user-profile.ts
import { getApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';

function getDb() {
  if (getApps().length === 0) {
    throw new Error('Firebase app has not been initialized.');
  }

  return getFirestore(getApp());
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
  const db = getDb();
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
  const db = getDb();
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
  const db = getDb();
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
  const db = getDb();
  const userRef = doc(db, 'users', uid);
  const balanceField = `balances.${currency}`;

  await updateDoc(userRef, {
    [balanceField]: increment(amount),
    updatedAt: serverTimestamp(),
  });
}
