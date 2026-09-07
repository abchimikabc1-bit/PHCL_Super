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

const TRUSTED_DEVICE_MAX_AGE_SECONDS =
  60 * 60;

const NO_STORE_HEADERS = {
  'Cache-Control':
    'no-store, max-age=0',
  Pragma:
    'no-cache',
  Vary:
    'Cookie',
};

type RequestBody = {
  response?:
    AuthenticationResponseJSON;
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

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getTrustedDeviceCookieMaxAge(
  expiresAtMs: number
): number {
  const remainingSeconds =
    Math.floor(
      (
        expiresAtMs -
        Date.now()
      ) / 1000
    );

  if (
    !Number.isFinite(
      remainingSeconds
    ) ||
    remainingSeconds <= 0
  ) {
    throw new Error(
      'Trusted-device session has an invalid expiration time.'
    );
  }

  return Math.max(
    1,
    Math.min(
      TRUSTED_DEVICE_MAX_AGE_SECONDS,
      remainingSeconds
    )
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
      'Admin session verification failed during trusted-device verification:',
      error
    );

    return json(
      {
        ok: false,
        code:
          'TRUSTED_DEVICE_VERIFICATION_UNAVAILABLE',
        message:
          'Trusted-device verification is unavailable.',
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

  let parsedBody:
    unknown;

  try {
    parsedBody =
      await request.json();
  } catch {
    return json(
      {
        ok: false,
        code:
          'INVALID_REQUEST',
        message:
          'Invalid WebAuthn response.',
      },
      400
    );
  }

  if (!isRecord(parsedBody)) {
    return json(
      {
        ok: false,
        code:
          'INVALID_REQUEST',
        message:
          'Invalid WebAuthn response.',
      },
      400
    );
  }

  const body =
    parsedBody as RequestBody;

  if (
    !body.response ||
    !isRecord(
      body.response
    )
  ) {
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

  try {
    /*
     * Verification must consume the
     * outstanding challenge atomically
     * inside the security library.
     *
     * No trusted-device cookie is issued
     * unless cryptographic verification
     * succeeds completely.
     */
    const result =
      await verifyTrustedAdminDevice(
        session.email,
        body.response
      );

    const cookieMaxAge =
      getTrustedDeviceCookieMaxAge(
        result.expiresAtMs
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
        secure:
          process.env.NODE_ENV ===
          'production',
        sameSite:
          'strict',
        path:
          '/',
        maxAge:
          cookieMaxAge,
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