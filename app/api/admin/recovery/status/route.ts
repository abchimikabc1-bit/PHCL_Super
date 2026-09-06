import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from '@/lib/admin-session-security';

import {
  getAdminRecoveryCodeSummary,
} from '@/lib/admin-recovery-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

export async function GET(
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
        },
        401
      );
    }

    const summary =
      await getAdminRecoveryCodeSummary(
        adminSession.email
      );

    return json({
      ok: true,
      summary,
    });
  } catch (error) {
    console.error(
      'Unable to read recovery-code status:',
      error
    );

    return json(
      {
        ok: false,
        code:
          'RECOVERY_STATUS_FAILED',
      },
      500
    );
  }
}