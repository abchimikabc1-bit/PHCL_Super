'use client';

import {
  getApps,
  initializeApp,
  type FirebaseApp,
  type FirebaseOptions,
} from 'firebase/app';

import {
  browserSessionPersistence,
  getAuth,
  initializeAuth,
  type Auth,
} from 'firebase/auth';

const ADMIN_FIREBASE_APP_NAME =
  'phcl-admin-auth';

const adminFirebaseConfig:
  FirebaseOptions = {
  apiKey:
    process.env
      .NEXT_PUBLIC_FIREBASE_API_KEY,

  authDomain:
    process.env
      .NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,

  projectId:
    process.env
      .NEXT_PUBLIC_FIREBASE_PROJECT_ID,

  storageBucket:
    process.env
      .NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,

  messagingSenderId:
    process.env
      .NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,

  appId:
    process.env
      .NEXT_PUBLIC_FIREBASE_APP_ID,
};

let cachedAdminAuth:
  Auth | null = null;

function hasRequiredAdminFirebaseConfig(): boolean {
  return Boolean(
    adminFirebaseConfig.apiKey &&
      adminFirebaseConfig.authDomain &&
      adminFirebaseConfig.projectId &&
      adminFirebaseConfig.appId
  );
}

function getExistingAdminApp():
  FirebaseApp | null {
  return (
    getApps().find(
      (firebaseApp) =>
        firebaseApp.name ===
        ADMIN_FIREBASE_APP_NAME
    ) ?? null
  );
}

function getFirebaseErrorCode(
  error: unknown
): string {
  if (
    typeof error !==
      'object' ||
    error === null
  ) {
    return '';
  }

  const record =
    error as Record<
      string,
      unknown
    >;

  return typeof record.code ===
    'string'
    ? record.code
    : '';
}

/**
 * Returns a dedicated Firebase Auth
 * instance used only by Admin phone
 * verification.
 *
 * SECURITY:
 *
 * - It uses a named Firebase app, so it
 *   cannot replace the customer's default
 *   Firebase Auth session.
 * - SESSION persistence clears when the
 *   browser tab/session is closed.
 * - It does not initialize Firestore or
 *   Storage for the Admin Firebase app.
 */
export function getAdminFirebaseAuth():
  Auth | null {
  if (
    typeof window ===
    'undefined'
  ) {
    return null;
  }

  if (cachedAdminAuth) {
    return cachedAdminAuth;
  }

  if (
    !hasRequiredAdminFirebaseConfig()
  ) {
    console.error(
      'Admin Firebase Auth configuration is incomplete.'
    );

    return null;
  }

  const existingApp =
    getExistingAdminApp();

  const adminApp =
    existingApp ??
    initializeApp(
      adminFirebaseConfig,
      ADMIN_FIREBASE_APP_NAME
    );

  try {
    cachedAdminAuth =
      initializeAuth(
        adminApp,
        {
          persistence:
            browserSessionPersistence,

          popupRedirectResolver:
            undefined,
        }
      );
  } catch (error) {
    const code =
      getFirebaseErrorCode(
        error
      );

    /*
     * During development, Fast Refresh
     * can preserve the named Firebase app
     * and its Auth instance.
     */
    if (
      code !==
      'auth/already-initialized'
    ) {
      throw error;
    }

    cachedAdminAuth =
      getAuth(adminApp);
  }

  return cachedAdminAuth;
}