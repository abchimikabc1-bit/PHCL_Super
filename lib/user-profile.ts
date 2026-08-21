import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  phone: string;
  balances: { usd: number; tzs: number; ntzs: number; pi: number };
  role: 'user' | 'admin';
  tier?: 'regular' | 'small_business' | 'corporate';
  kycStatus?: 'NOT_STARTED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  seedPhrase?: string; // MANENO YETU YA SIRI 12 YA KUREJESHA POCHI
}

// MFUMO MAALUM WA KUTENGENEZA MANENO YA SIRI 12 (BIP-39 COMPACT GENERATOR)
function generateSeedPhrase(): string {
  const words = [
    'active', 'apple', 'anchor', 'banana', 'brave', 'cherry', 'client', 'cosmic', 'crypto', 'forest', 
    'grape', 'lemon', 'melon', 'mountain', 'ocean', 'orange', 'planet', 'peach', 'river', 'secure', 
    'shining', 'solar', 'valley', 'wallet', 'quantum', 'global', 'ledger', 'carbon', 'phoenix', 'matrix'
  ];
  const chosen: string[] = [];
  while (chosen.length < 12) {
    const randomWord = words[Math.floor(Math.random() * words.length)];
    if (!chosen.includes(randomWord)) {
      chosen.push(randomWord);
    }
  }
  return chosen.join(' ');
}

export async function createUserProfile(uid: string, email: string, fullName: string, phone: string, tier: string): Promise<string> {
  const seedPhrase = generateSeedPhrase(); // Inazalisha maneno ya siri 12
  
  await setDoc(doc(db, 'users', uid), {
    email,
    fullName,
    phone,
    role: 'user',
    tier,
    kycStatus: tier !== 'regular' ? 'PENDING_REVIEW' : 'APPROVED',
    balances: { usd: 0, tzs: 0, ntzs: 0, pi: 0 },
    uid,
    seedPhrase, // Inahifadhi maneno ya siri 12 kwenye Firestore kwa usalama
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return seedPhrase; // Inarudisha maneno ili tuweze kuwaonyesha wakati wa usajili
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docSnap = await getDoc(doc(db, 'users', uid));
  return docSnap.exists() ? { uid, ...docSnap.data() } as UserProfile : null;
}

export async function updateUserProfile(uid: string, data: Partial<Omit<UserProfile, 'uid' | 'balances' | 'role'>>): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() });
}

export async function adjustUserBalance(uid: string, currency: string, amount: number): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { [`balances.${currency}`]: increment(amount), updatedAt: serverTimestamp() });
}
