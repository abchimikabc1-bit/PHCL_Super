import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from '@/lib/admin-session-security';

import {
  verifyTrustedDeviceSession,
} from '@/lib/admin-device-auth-security';

import {
  generateAdminRecoveryCodes,
} from '@/lib/admin-recovery-security';

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
        Pragma: 'no-cache',
      },
    }
  );
}

export async function POST(
  request: NextRequest
) {
  try {
    const adminSession =
      verifyAdminSessionToken(
        request.cookies.get(
          ADMIN_SESSION_COOKIE
        )?.value
      );

    if (!adminSession) {
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

    const trustedSessionId =
      request.cookies.get(
        TRUSTED_DEVICE_COOKIE
      )?.value;

    if (!trustedSessionId) {
      return json(
        {
          ok: false,
          code:
            'TRUSTED_DEVICE_REQUIRED',
          message:
            'Trusted-device verification is required.',
        },
        403
      );
    }

    const trusted =
      await verifyTrustedDeviceSession(
        adminSession.email,
        trustedSessionId
      );

    if (!trusted) {
      const response =
        json(
          {
            ok: false,
            code:
              'TRUSTED_DEVICE_SESSION_INVALID',
            message:
              'Trusted-device verification is required.',
          },
          403
        );

      response.cookies.set(
        TRUSTED_DEVICE_COOKIE,
        '',
        {
          httpOnly: true,
          sameSite: 'strict',
          secure:
            process.env.NODE_ENV ===
            'production',
          path: '/',
          maxAge: 0,
        }
      );

      return response;
    }

    const codes =
      await generateAdminRecoveryCodes(
        adminSession.email
      );

    return json({
      ok: true,
      codes,
      count: codes.length,
      warning:
        'These recovery codes will only be shown once. Store them securely offline.',
    });
  } catch (error) {
    console.error(
      'Unable to generate Admin recovery codes:',
      error
    );

    return json(
      {
        ok: false,
        code:
          'RECOVERY_GENERATION_FAILED',
        message:
          'Unable to generate recovery codes.',
      },
      500
    );
  }
}