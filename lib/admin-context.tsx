'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import {
  signInWithEmailAndPassword,
  signOut,
  type Auth,
} from 'firebase/auth';

import {
  getAdminFirebaseAuth,
} from '@/lib/admin-firebase-client';

export type AdminLoginNextStep =
  | 'ADMIN_SESSION'
  | 'PHONE_ENROLLMENT';

export type LoginResult = {
  success: boolean;
  authenticated: boolean;
  nextStep:
    AdminLoginNextStep | null;
  code?: string;
  message?: string;
};

type SessionDebug = {
  hasSession: boolean;
  sessionAgeMs:
    number | null;
  expiresInMs:
    number | null;
};

type AdminUserLike = {
  name?: string;
  email?: string;
} | null;

type SessionInfo = {
  email: string;
  role: 'admin';
  issuedAt: string;
  expiresAt: string;
  idleExpiresAt: string;
};

interface AdminContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshSession:
    () => void;
  sessionDebug:
    SessionDebug;
  adminUser:
    AdminUserLike;

  login: (
    email: string,
    password: string
  ) => Promise<LoginResult>;

  logout:
    () => Promise<void>;

  checkAuth:
    () => Promise<boolean>;
}

const AdminContext =
  createContext<
    AdminContextType | undefined
  >(undefined);

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getOptionalString(
  value: unknown
): string | undefined {
  return typeof value ===
    'string'
    ? value
    : undefined;
}

function parseSessionInfo(
  value: unknown
): SessionInfo | null {
  if (!isRecord(value)) {
    return null;
  }

  const email =
    getOptionalString(
      value.email
    )
      ?.trim()
      .toLowerCase();

  const role =
    getOptionalString(
      value.role
    );

  const issuedAt =
    getOptionalString(
      value.issuedAt
    );

  const expiresAt =
    getOptionalString(
      value.expiresAt
    );

  const idleExpiresAt =
    getOptionalString(
      value.idleExpiresAt
    );

  if (
    !email ||
    role !== 'admin' ||
    !issuedAt ||
    !expiresAt ||
    !idleExpiresAt
  ) {
    return null;
  }

  const issuedAtMs =
    Date.parse(
      issuedAt
    );

  const expiresAtMs =
    Date.parse(
      expiresAt
    );

  const idleExpiresAtMs =
    Date.parse(
      idleExpiresAt
    );

  const now =
    Date.now();

  if (
    !Number.isFinite(
      issuedAtMs
    ) ||
    !Number.isFinite(
      expiresAtMs
    ) ||
    !Number.isFinite(
      idleExpiresAtMs
    ) ||
    issuedAtMs >
      now + 60_000 ||
    expiresAtMs <=
      now ||
    idleExpiresAtMs <=
      now ||
    expiresAtMs <=
      issuedAtMs ||
    idleExpiresAtMs <=
      issuedAtMs ||
    idleExpiresAtMs >
      expiresAtMs
  ) {
    return null;
  }

  return {
    email,
    role:
      'admin',
    issuedAt,
    expiresAt,
    idleExpiresAt,
  };
}

function getResponseMessage(
  data: unknown,
  fallback: string
): string {
  if (!isRecord(data)) {
    return fallback;
  }

  const message =
    getOptionalString(
      data.message
    )?.trim();

  return message || fallback;
}

function getResponseCode(
  data: unknown
): string | undefined {
  if (!isRecord(data)) {
    return undefined;
  }

  return getOptionalString(
    data.code
  );
}

function getLoginNextStep(
  data: unknown
): AdminLoginNextStep | null {
  if (!isRecord(data)) {
    return null;
  }

  const nextStep =
    getOptionalString(
      data.nextStep
    );

  if (
    nextStep ===
      'ADMIN_SESSION' ||
    nextStep ===
      'PHONE_ENROLLMENT'
  ) {
    return nextStep;
  }

  return null;
}

async function safeSignOut(
  auth:
    Auth | null
): Promise<void> {
  if (!auth) {
    return;
  }

  try {
    await signOut(auth);
  } catch {
    /*
     * Local Admin state must still
     * be cleared even if Firebase
     * sign-out is unavailable.
     */
  }
}

function getSafeFirebaseLoginMessage(
  error: unknown
): string {
  if (
    typeof error !==
      'object' ||
    error === null
  ) {
    return (
      'Imeshindikana kuthibitisha taarifa za Admin.'
    );
  }

  const record =
    error as Record<
      string,
      unknown
    >;

  const code =
    typeof record.code ===
      'string'
      ? record.code
      : '';

  if (
    code ===
      'auth/too-many-requests'
  ) {
    return (
      'Majaribio yamezidi. Subiri kidogo kabla ya kujaribu tena.'
    );
  }

  if (
    code ===
      'auth/network-request-failed'
  ) {
    return (
      'Tatizo la mtandao limetokea. Tafadhali jaribu tena.'
    );
  }

  /*
   * Invalid email, nonexistent user
   * and invalid password intentionally
   * use the same public message.
   */
  return (
    'Email au password si sahihi.'
  );
}

export function AdminProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    isAuthenticated,
    setIsAuthenticated,
  ] = useState(false);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    sessionInfo,
    setSessionInfo,
  ] = useState<
    SessionInfo | null
  >(null);

  const clearLocalSession =
    useCallback(() => {
      setIsAuthenticated(
        false
      );

      setSessionInfo(
        null
      );
    }, []);

  const checkAuth =
    useCallback(
      async (): Promise<boolean> => {
        try {
          const response =
            await fetch(
              '/api/admin/auth',
              {
                method:
                  'GET',
                credentials:
                  'include',
                cache:
                  'no-store',
                headers: {
                  Accept:
                    'application/json',
                },
              }
            );

          const data:
            unknown =
            await response
              .json()
              .catch(
                () => null
              );

          if (
            !response.ok ||
            !isRecord(data) ||
            data.ok !== true ||
            data.authenticated !==
              true
          ) {
            clearLocalSession();
            return false;
          }

          const parsedSession =
            parseSessionInfo(
              data.session
            );

          if (
            !parsedSession
          ) {
            clearLocalSession();
            return false;
          }

          setSessionInfo(
            parsedSession
          );

          setIsAuthenticated(
            true
          );

          return true;
        } catch (error) {
          console.error(
            'Admin session verification failed:',
            error instanceof Error
              ? error.name
              : 'UNKNOWN_ERROR'
          );

          clearLocalSession();
          return false;
        } finally {
          setIsLoading(
            false
          );
        }
      },
      [clearLocalSession]
    );

  const login =
    useCallback(
      async (
        email: string,
        password: string
      ): Promise<LoginResult> => {
        const normalizedEmail =
          email
            .trim()
            .toLowerCase();

        const adminAuth =
          getAdminFirebaseAuth();

        if (!adminAuth) {
          clearLocalSession();

          return {
            success:
              false,
            authenticated:
              false,
            nextStep:
              null,
            code:
              'FIREBASE_CONFIGURATION_ERROR',
            message:
              'Mfumo wa Firebase Admin haujaandaliwa kikamilifu.',
          };
        }

        /*
         * Remove a stale Admin-only
         * Firebase session before starting
         * a fresh login ceremony.
         */
        await safeSignOut(
          adminAuth
        );

        try {
          const credential =
            await signInWithEmailAndPassword(
              adminAuth,
              normalizedEmail,
              password
            );

          const firebaseIdToken =
            await credential.user
              .getIdToken(
                true
              );

          const response =
            await fetch(
              '/api/admin/auth',
              {
                method:
                  'POST',

                headers: {
                  Accept:
                    'application/json',
                  'Content-Type':
                    'application/json',
                  Authorization:
                    `Bearer ${firebaseIdToken}`,
                },

                credentials:
                  'include',

                cache:
                  'no-store',

                body:
                  JSON.stringify({
                    email:
                      normalizedEmail,
                    password,
                  }),
              }
            );

          const data:
            unknown =
            await response
              .json()
              .catch(
                () => null
              );

          const code =
            getResponseCode(
              data
            );

          const nextStep =
            getLoginNextStep(
              data
            );

          if (!response.ok) {
            await safeSignOut(
              adminAuth
            );

            clearLocalSession();

            return {
              success:
                false,
              authenticated:
                false,
              nextStep:
                null,
              code,
              message:
                getResponseMessage(
                  data,
                  'Login failed. Please try again.'
                ),
            };
          }

          if (
            nextStep ===
              'PHONE_ENROLLMENT'
          ) {
            /*
             * Keep this dedicated
             * Firebase session alive.
             * The phone-enrollment page
             * needs currentUser in order
             * to link the phone credential.
             */
            clearLocalSession();

            return {
              success:
                true,
              authenticated:
                false,
              nextStep:
                'PHONE_ENROLLMENT',
              code,
              message:
                getResponseMessage(
                  data,
                  'Phone verification is required.'
                ),
            };
          }

          if (
            !isRecord(data) ||
            data.ok !== true ||
            data.authenticated !==
              true ||
            nextStep !==
              'ADMIN_SESSION'
          ) {
            await safeSignOut(
              adminAuth
            );

            clearLocalSession();

            return {
              success:
                false,
              authenticated:
                false,
              nextStep:
                null,
              code:
                code ||
                'INVALID_AUTH_RESPONSE',
              message:
                'Admin authentication response was invalid.',
            };
          }

          const parsedSession =
            parseSessionInfo(
              data.session
            );

          if (
            !parsedSession
          ) {
            await safeSignOut(
              adminAuth
            );

            clearLocalSession();

            return {
              success:
                false,
              authenticated:
                false,
              nextStep:
                null,
              code:
                'INVALID_SESSION_RESPONSE',
              message:
                'Admin session response was invalid.',
            };
          }

          /*
           * The HttpOnly server session
           * is now authoritative. Remove
           * the temporary Admin-only
           * Firebase client session.
           */
          await safeSignOut(
            adminAuth
          );

          setSessionInfo(
            parsedSession
          );

          setIsAuthenticated(
            true
          );

          return {
            success:
              true,
            authenticated:
              true,
            nextStep:
              'ADMIN_SESSION',
            code,
            message:
              getResponseMessage(
                data,
                'Login successful.'
              ),
          };
        } catch (error) {
          await safeSignOut(
            adminAuth
          );

          console.error(
            'Admin Firebase login failed:',
            typeof error ===
                'object' &&
              error !== null &&
              'code' in error
              ? String(
                  error.code
                )
              : 'UNKNOWN_ERROR'
          );

          clearLocalSession();

          return {
            success:
              false,
            authenticated:
              false,
            nextStep:
              null,
            code:
              'ADMIN_LOGIN_FAILED',
            message:
              getSafeFirebaseLoginMessage(
                error
              ),
          };
        }
      },
      [clearLocalSession]
    );

  const logout =
    useCallback(
      async (): Promise<void> => {
        const adminAuth =
          getAdminFirebaseAuth();

        try {
          await fetch(
            '/api/admin/auth',
            {
              method:
                'DELETE',
              credentials:
                'include',
              cache:
                'no-store',
              headers: {
                Accept:
                  'application/json',
              },
            }
          );
        } catch (error) {
          console.error(
            'Admin logout failed:',
            error instanceof Error
              ? error.name
              : 'UNKNOWN_ERROR'
          );
        } finally {
          await safeSignOut(
            adminAuth
          );

          clearLocalSession();
        }
      },
      [clearLocalSession]
    );

  const refreshSession =
    useCallback(() => {
      void checkAuth();
    }, [checkAuth]);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const sessionDebug:
    SessionDebug = {
    hasSession:
      isAuthenticated &&
      sessionInfo !== null,

    sessionAgeMs:
      sessionInfo?.issuedAt
        ? Date.now() -
          Date.parse(
            sessionInfo
              .issuedAt
          )
        : null,

    expiresInMs:
      sessionInfo
        ?.idleExpiresAt
        ? Date.parse(
            sessionInfo
              .idleExpiresAt
          ) -
          Date.now()
        : null,
  };

  const adminUser:
    AdminUserLike =
    sessionInfo
      ? {
          email:
            sessionInfo.email,
          name:
            'Administrator',
        }
      : null;

  const value:
    AdminContextType = {
    isAuthenticated,
    isLoading,
    refreshSession,
    sessionDebug,
    adminUser,
    login,
    logout,
    checkAuth,
  };

  return (
    <AdminContext.Provider
      value={value}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context =
    useContext(
      AdminContext
    );

  if (!context) {
    throw new Error(
      'useAdmin must be used within AdminProvider'
    );
  }

  return context;
}