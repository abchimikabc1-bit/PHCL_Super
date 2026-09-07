import type {
  RegistrationResponseJSON,
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
  verifyAdminDeviceRegistration,
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

type RegistrationRequestBody = {
  response?:
    RegistrationResponseJSON;
  label?: string;
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

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
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
          'Trusted-device registration is unavailable.',
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

  let parsedBody:
    unknown;

  try {
    parsedBody =
      await request.json();
  } catch {
    return noStoreJson(
      {
        ok: false,
        code:
          'INVALID_REQUEST',
        message:
          'Invalid registration payload.',
      },
      400
    );
  }

  if (!isRecord(parsedBody)) {
    return noStoreJson(
      {
        ok: false,
        code:
          'INVALID_REQUEST',
        message:
          'Invalid registration payload.',
      },
      400
    );
  }

  const body =
    parsedBody as RegistrationRequestBody;

  if (
    !body.response ||
    !isRecord(
      body.response
    )
  ) {
    return noStoreJson(
      {
        ok: false,
        code:
          'MISSING_REGISTRATION_RESPONSE',
        message:
          'Registration response is required.',
      },
      400
    );
  }

  if (
    body.label !== undefined &&
    typeof body.label !== 'string'
  ) {
    return noStoreJson(
      {
        ok: false,
        code:
          'INVALID_DEVICE_LABEL',
        message:
          'The device label is invalid.',
      },
      400
    );
  }

  const label =
    typeof body.label === 'string'
      ? body.label
          .trim()
          .slice(0, 80)
      : undefined;

  try {
    const result =
      await verifyAdminDeviceRegistration(
        session.email,
        body.response,
        label
      );

    return noStoreJson({
      ok: true,
      ...result,
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

    /*
     * These errors intentionally share
     * one external response so callers
     * cannot distinguish which challenge
     * validation check failed.
     */
    if (
      knownError ===
        'REGISTRATION_CHALLENGE_NOT_FOUND' ||
      knownError ===
        'REGISTRATION_CHALLENGE_INVALID' ||
      knownError ===
        'REGISTRATION_CHALLENGE_EXPIRED' ||
      knownError ===
        'REGISTRATION_PRINCIPAL_MISMATCH'
    ) {
      return noStoreJson(
        {
          ok: false,
          code:
            'INVALID_REGISTRATION_CHALLENGE',
          message:
            'The registration challenge is invalid or expired.',
        },
        400
      );
    }

    if (
      knownError ===
      'DEVICE_REGISTRATION_FAILED'
    ) {
      return noStoreJson(
        {
          ok: false,
          code:
            'DEVICE_REGISTRATION_FAILED',
          message:
            'Trusted-device registration could not be completed.',
        },
        400
      );
    }

    console.error(
      'Trusted Admin device registration failed:',
      error
    );

    return noStoreJson(
      {
        ok: false,
        code:
          'DEVICE_REGISTRATION_FAILED',
        message:
          'Trusted-device registration could not be completed.',
      },
      500
    );
  }
}