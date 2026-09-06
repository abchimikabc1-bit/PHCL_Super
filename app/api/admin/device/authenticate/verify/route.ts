import type {
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';

import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from '@/lib/admin-session-security';

import {
  verifyTrustedAdminDevice,
} from '@/lib/admin-device-auth-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TRUSTED_DEVICE_COOKIE =
  'phcl_admin_trusted_device';

function json(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}

type RequestBody = {
  response?: AuthenticationResponseJSON;
};

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

    let body: RequestBody;

    try {
      body =
        (await request.json()) as RequestBody;
    } catch {
      return json(
        {
          ok: false,
          code: 'INVALID_REQUEST',
          message:
            'Invalid WebAuthn response.',
        },
        400
      );
    }

    if (!body.response) {
      return json(
        {
          ok: false,
          code:
            'MISSING_AUTHENTICATION_RESPONSE',
          message:
            'WebAuthn response is required.',
        },
        400
      );
    }

    const result =
      await verifyTrustedAdminDevice(
        session.email,
        body.response
      );

    const response =
      json({
        ok: true,
        verified: true,
        expiresAtMs:
          result.expiresAtMs,
      });

    response.cookies.set(
      TRUSTED_DEVICE_COOKIE,
      result.trustedSessionId,
      {
        httpOnly: true,
        sameSite: 'strict',
        secure:
          process.env.NODE_ENV ===
          'production',
        path: '/',
        maxAge: 60 * 60,
      }
    );

    return response;
  } catch (error) {
    console.error(
      'Trusted Admin device verification failed:',
      error
    );

    return json(
      {
        ok: false,
        code:
          'TRUSTED_DEVICE_VERIFICATION_FAILED',
        message:
          'Trusted-device verification failed.',
      },
      400
    );
  }
}