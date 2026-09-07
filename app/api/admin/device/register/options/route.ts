import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from '@/lib/admin-session-security';

import {
  createAdminDeviceRegistrationOptions,
} from '@/lib/admin-device-security';

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

function noStoreJson(
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
      'Admin session verification failed during device registration:',
      error
    );

    return noStoreJson(
      {
        ok: false,
        code:
          'DEVICE_REGISTRATION_UNAVAILABLE',
        message:
          'Unable to start trusted-device registration.',
      },
      500
    );
  }

  if (!session) {
    return noStoreJson(
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
     * A valid Version 2 Admin session
     * already guarantees:
     *
     * - Firebase UID is present
     * - Admin email is verified
     * - Admin phone is verified
     */
    const options =
      await createAdminDeviceRegistrationOptions(
        session.email
      );

    return noStoreJson({
      ok: true,
      options,
    });
  } catch (error) {
    const knownError =
      error instanceof Error
        ? error.message
        : '';

    if (
      knownError ===
      'TRUSTED_DEVICE_ALREADY_EXISTS'
    ) {
      return noStoreJson(
        {
          ok: false,
          code:
            'TRUSTED_DEVICE_ALREADY_EXISTS',
          message:
            'A trusted Admin device is already registered.',
        },
        409
      );
    }

    console.error(
      'Unable to create Admin device registration options:',
      error
    );

    return noStoreJson(
      {
        ok: false,
        code:
          'DEVICE_REGISTRATION_UNAVAILABLE',
        message:
          'Unable to start trusted-device registration.',
      },
      500
    );
  }
}