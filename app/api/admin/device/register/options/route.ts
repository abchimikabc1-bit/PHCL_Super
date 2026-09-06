import { NextRequest, NextResponse } from 'next/server';

import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from '@/lib/admin-session-security';

import {
  createAdminDeviceRegistrationOptions,
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

    const options =
      await createAdminDeviceRegistrationOptions(
        session.email
      );

    return noStoreJson({
      ok: true,
      options,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
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
        code: 'SERVER_ERROR',
        message:
          'Unable to start trusted-device registration.',
      },
      500
    );
  }
}