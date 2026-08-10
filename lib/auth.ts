// lib/auth.ts
// Firebase client SDK initialization (replace placeholder values with your actual config)
import { initializeApp } from 'firebase/app';
import { getAuth, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Export the Auth instance for use throughout the app
export const auth = getAuth(app);
// Export a helper to sign out the current user
export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.error('Logout failed', e);
    throw e;
  }
};
