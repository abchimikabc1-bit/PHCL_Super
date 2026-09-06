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

function json(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

export async function POST(
  request: NextRequest
) {
  try {
    const session =
      verifyAdminSessionToken(
        request.cookies.get(
          ADMIN_SESSION_COOKIE
        )?.value
      );

    if (!session) {
      return json(
        {
          ok: false,
          code: 'UNAUTHENTICATED',
          message:
            'Admin authentication is required.',
        },
        401
      );
    }

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
      400
    );
  }
}