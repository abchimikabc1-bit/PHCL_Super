import 'server-only';

import type {
  ReactNode,
} from 'react';

import {
  cookies,
} from 'next/headers';

import {
  redirect,
} from 'next/navigation';

import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
  type AdminSessionPayload,
} from '@/lib/admin-session-security';

import {
  verifyTrustedDeviceSession,
} from '@/lib/admin-device-auth-security';

import {
  adminAuth,
} from '@/lib/firebase-admin';

const TRUSTED_DEVICE_COOKIE =
  'phcl_admin_trusted_device';

function normalizeEmail(
  email: string
): string {
  return email
    .trim()
    .toLowerCase();
}

async function verifyLiveFirebaseAdmin(
  session: AdminSessionPayload
): Promise<boolean> {
  try {
    const firebaseUser =
      await adminAuth.getUser(
        session.firebaseUid
      );

    const firebaseEmail =
      typeof firebaseUser.email ===
        'string'
        ? normalizeEmail(
            firebaseUser.email
          )
        : '';

    const hasVerifiedPhone =
      typeof firebaseUser.phoneNumber ===
        'string' &&
      firebaseUser.phoneNumber
        .trim()
        .length > 0;

    return (
      firebaseUser.disabled !== true &&
      firebaseUser.uid ===
        session.firebaseUid &&
      firebaseEmail ===
        session.email &&
      firebaseUser.emailVerified ===
        true &&
      hasVerifiedPhone &&
      session.emailVerified ===
        true &&
      session.phoneVerified ===
        true
    );
  } catch (error) {
    /*
     * Fail closed:
     * Firebase lookup failures must never
     * grant access to protected Admin pages.
     *
     * Do not log Firebase user records,
     * phone numbers, tokens or credentials.
     */
    console.error(
      'Unable to verify live Admin security status:',
      error instanceof Error
        ? error.name
        : 'UNKNOWN_ERROR'
    );

    return false;
  }
}

export default async function ProtectedAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore =
    await cookies();

  const adminSessionToken =
    cookieStore.get(
      ADMIN_SESSION_COOKIE
    )?.value;

  let adminSession:
    AdminSessionPayload | null;

  try {
    adminSession =
      verifyAdminSessionToken(
        adminSessionToken
      );
  } catch {
    adminSession = null;
  }

  if (!adminSession) {
    redirect(
      '/admin/login'
    );
  }

  /*
   * Reconfirm the Firebase account on
   * every protected Admin navigation.
   *
   * This immediately rejects access if:
   * - the Admin account is disabled/deleted
   * - Firebase UID no longer matches
   * - the Admin email changes or is unverified
   * - the verified phone is removed
   */
  const firebaseAdminValid =
    await verifyLiveFirebaseAdmin(
      adminSession
    );

  if (!firebaseAdminValid) {
    redirect(
      '/admin/login'
    );
  }

  const trustedSessionId =
    cookieStore.get(
      TRUSTED_DEVICE_COOKIE
    )?.value;

  if (!trustedSessionId) {
    redirect(
      '/admin/security/verify-device'
    );
  }

  let trustedDeviceValid =
    false;

  try {
    trustedDeviceValid =
      await verifyTrustedDeviceSession(
        adminSession.email,
        trustedSessionId
      );
  } catch (error) {
    /*
     * Firestore or validation failure
     * must fail closed.
     */
    console.error(
      'Unable to verify trusted Admin device session:',
      error instanceof Error
        ? error.name
        : 'UNKNOWN_ERROR'
    );
  }

  if (!trustedDeviceValid) {
    redirect(
      '/admin/security/verify-device'
    );
  }

  return children;
}