import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  createRecoveryDeviceRegistrationOptions,
} from '@/lib/admin-device-security';

import {
  verifyAdminRecoveryAccessSession,
} from '@/lib/admin-recovery-access-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RECOVERY_ACCESS_COOKIE =
  'phcl_admin_recovery_access';

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
        Pragma: 'no-cache',
      },
    }
  );
}

function clearRecoveryCookie(
  response: NextResponse
): void {
  response.cookies.set(
    RECOVERY_ACCESS_COOKIE,
    '',
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    }
  );
}

export async function POST(
  request: NextRequest
) {
  const recoveryToken =
    request.cookies.get(
      RECOVERY_ACCESS_COOKIE
    )?.value;

  if (!recoveryToken) {
    return noStoreJson(
      {
        ok: false,
        code:
          'RECOVERY_AUTHORIZATION_REQUIRED',
        message:
          'Recovery authorization is required.',
      },
      401
    );
  }

  try {
    const recoverySession =
      await verifyAdminRecoveryAccessSession(
        recoveryToken
      );

    if (!recoverySession) {
      const response = noStoreJson(
        {
          ok: false,
          code:
            'RECOVERY_AUTHORIZATION_INVALID',
          message:
            'Recovery authorization is invalid or expired.',
        },
        401
      );

      clearRecoveryCookie(response);

      return response;
    }

    const options =
      await createRecoveryDeviceRegistrationOptions(
        recoverySession.email
      );

    return noStoreJson({
      ok: true,
      options,
      expiresAtMs:
        recoverySession.expiresAtMs,
    });
  } catch (error) {
    console.error(
      'Unable to create recovery device registration options:',
      error
    );

    return noStoreJson(
      {
        ok: false,
        code:
          'RECOVERY_DEVICE_OPTIONS_FAILED',
        message:
          'Unable to start recovery device registration.',
      },
      500
    );
  }
}
