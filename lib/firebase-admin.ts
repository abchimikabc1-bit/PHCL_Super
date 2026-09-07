import 'server-only';

import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
} from 'firebase-admin/app';

import {
  getAuth,
} from 'firebase-admin/auth';

import {
  getFirestore,
} from 'firebase-admin/firestore';

const DEFAULT_APP_NAME =
  '[DEFAULT]';

function normalizeOptionalValue(
  value: string | undefined
): string | null {
  const normalized =
    value?.trim();

  return normalized || null;
}

function getFirebaseProjectId():
  string | null {
  return normalizeOptionalValue(
    process.env
      .FIREBASE_PROJECT_ID
  );
}

function getFirebaseClientEmail():
  string | null {
  return normalizeOptionalValue(
    process.env
      .FIREBASE_CLIENT_EMAIL
  );
}

function getFirebasePrivateKey():
  string | null {
  const raw =
    normalizeOptionalValue(
      process.env
        .FIREBASE_PRIVATE_KEY
    );

  if (!raw) {
    return null;
  }

  return raw
    .replace(
      /\\n/g,
      '\n'
    )
    .trim();
}

function validatePrivateKey(
  privateKey: string
): void {
  if (
    !privateKey.startsWith(
      '-----BEGIN PRIVATE KEY-----'
    ) ||
    !privateKey.endsWith(
      '-----END PRIVATE KEY-----'
    )
  ) {
    throw new Error(
      'FIREBASE_PRIVATE_KEY is not a valid PEM private key.'
    );
  }
}

function getExistingDefaultApp():
  App | null {
  return (
    getApps().find(
      (app) =>
        app.name ===
        DEFAULT_APP_NAME
    ) ?? null
  );
}

function initializeFirebaseAdminApp():
  App {
  const existingApp =
    getExistingDefaultApp();

  if (existingApp) {
    return existingApp;
  }

  const projectId =
    getFirebaseProjectId();

  const clientEmail =
    getFirebaseClientEmail();

  const privateKey =
    getFirebasePrivateKey();

  const hasAnyExplicitCredential =
    Boolean(
      projectId ||
        clientEmail ||
        privateKey
    );

  const hasAllExplicitCredentials =
    Boolean(
      projectId &&
        clientEmail &&
        privateKey
    );

  if (
    hasAnyExplicitCredential &&
    !hasAllExplicitCredentials
  ) {
    throw new Error(
      'FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY must all be configured together.'
    );
  }

  if (
    projectId &&
    clientEmail &&
    privateKey
  ) {
    validatePrivateKey(
      privateKey
    );

    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),

      projectId,
    });
  }

  return initializeApp({
    credential:
      applicationDefault(),
  });
}

const firebaseAdminApp =
  initializeFirebaseAdminApp();

export const adminAuth =
  getAuth(
    firebaseAdminApp
  );

export const adminDb =
  getFirestore(
    firebaseAdminApp
  );
