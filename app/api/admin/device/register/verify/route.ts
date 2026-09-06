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

function noStoreJson(
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

type RegistrationRequestBody = {
  response?: RegistrationResponseJSON;
  label?: string;
};

export async function POST(
  request: NextRequest
) {
  try {
    const token =
      request.cookies.get(
        ADMIN_SESSION_COOKIE
      )?.value;

    const session =
      verifyAdminSessionToken(token);

    if (!session) {
      return noStoreJson(
        {
          ok: false,
          code: 'UNAUTHENTICATED',
          message:
            'Admin authentication is required.',
        },
        401
      );
    }

    let body: RegistrationRequestBody;

    try {
      body =
        (await request.json()) as RegistrationRequestBody;
    } catch {
      return noStoreJson(
        {
          ok: false,
          code: 'INVALID_REQUEST',
          message:
            'Invalid registration payload.',
        },
        400
      );
    }

    if (!body.response) {
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

    const result =
      await verifyAdminDeviceRegistration(
        session.email,
        body.response,
        body.label
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

    if (
      knownError ===
        'REGISTRATION_CHALLENGE_NOT_FOUND' ||
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
      400
    );
  }
}