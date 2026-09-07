import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from '@/lib/admin-session-security';

import {
  createTrustedDeviceAuthenticationOptions,
} from '@/lib/admin-device-auth-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control':
    'no-store, max-age=0',
  Pragma:
    'no-cache',
  Vary:
    'Cookie',
};

function json(
  body: Record<string, unknown>,
  status = 200
): NextResponse {
  return NextResponse.json(
    body,
    {
      status,
      headers:
        NO_STORE_HEADERS,
    }
  );
}

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  const sessionToken =
    request.cookies.get(
      ADMIN_SESSION_COOKIE
    )?.value;

  let session;

  try {
    session =
      verifyAdminSessionToken(
        sessionToken
      );
  } catch (error) {
    console.error(
      'Admin session verification failed while creating device options:',
      error
    );

    return json(
      {
        ok: false,
        code:
          'DEVICE_AUTHENTICATION_UNAVAILABLE',
        message:
          'Unable to start trusted-device verification.',
      },
      500
    );
  }

  if (!session) {
    return json(
      {
        ok: false,
        code:
          'UNAUTHENTICATED',
        message:
          'Admin authentication is required.',
      },
      401
    );
  }

  try {
    /*
     * The Admin Session Version 2
     * guarantees that:
     *
     * - Firebase UID exists
     * - Admin email is verified
     * - Admin phone is verified
     *
     * The WebAuthn challenge is then
     * created for that verified Admin.
     */
    const options =
      await createTrustedDeviceAuthenticationOptions(
        session.email
      );

    return json({
      ok: true,
      options,
    });
  } catch (error) {
    console.error(
      'Unable to create trusted-device authentication options:',
      error
    );

    return json(
      {
        ok: false,
        code:
          'DEVICE_AUTHENTICATION_UNAVAILABLE',
        message:
          'Unable to start trusted-device verification.',
      },
      500
    );
  }
}