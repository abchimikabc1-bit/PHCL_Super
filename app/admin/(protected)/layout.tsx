import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from '@/lib/admin-session-security';

import {
  verifyTrustedDeviceSession,
} from '@/lib/admin-device-auth-security';

const TRUSTED_DEVICE_COOKIE =
  'phcl_admin_trusted_device';

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  const adminSessionToken =
    cookieStore.get(
      ADMIN_SESSION_COOKIE
    )?.value;

  const adminSession =
    verifyAdminSessionToken(
      adminSessionToken
    );

  if (!adminSession) {
    redirect('/admin/login');
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

  const trustedDeviceValid =
    await verifyTrustedDeviceSession(
      adminSession.email,
      trustedSessionId
    );

  if (!trustedDeviceValid) {
    redirect(
      '/admin/security/verify-device'
    );
  }

  return children;
}
