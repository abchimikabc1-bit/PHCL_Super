import { getApp, getApps, initializeApp } from 'firebase/app';

import { getAuth } from 'firebase/auth';

import { getFirestore } from 'firebase/firestore';

import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY,

  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,

  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,

  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,

  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,

  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID,

  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

/**
 * These values are required for the
 * Firebase client app used by PHCL Super.
 *
 * measurementId is intentionally NOT
 * required because Firebase Analytics
 * configuration is optional and must not
 * disable Firebase Authentication,
 * Firestore or Storage.
 */
const hasRequiredFirebaseConfig = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId,
);

const app =
  hasRequiredFirebaseConfig
    ? getApps().length
      ? getApp()
      : initializeApp(firebaseConfig)
    : undefined;

export const firebaseApp =
  app ?? null;

export const firebaseAuth =
  app
    ? getAuth(app)
    : null;

export const firebaseDb =
  app
    ? getFirestore(app)
    : null;

export const firebaseStorage =
  app
    ? getStorage(app)
    : null;