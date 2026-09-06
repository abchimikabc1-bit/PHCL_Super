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
  readAuthAuditEvents,
  readRateLimitEntries,
} from '@/lib/admin-auth-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TRUSTED_DEVICE_COOKIE =
  'phcl_admin_trusted_device';

const RATE_LIMIT_POLICY = {
  windowMs: 10 * 60 * 1000,
  maxAttempts: 8,
  blockMs: 15 * 60 * 1000,
};

function noStoreJson(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        'Cache-Control':
          'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    }
  );
}

export async function GET(
  request: NextRequest
) {
  try {
    const sessionToken =
      request.cookies.get(
        ADMIN_SESSION_COOKIE
      )?.value;

    const session =
      verifyAdminSessionToken(
        sessionToken
      );

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

    const trustedSessionId =
      request.cookies.get(
        TRUSTED_DEVICE_COOKIE
      )?.value;

    if (!trustedSessionId) {
      return noStoreJson(
        {
          ok: false,
          code:
            'TRUSTED_DEVICE_REQUIRED',
          message:
            'Trusted Admin device verification is required.',
        },
        403
      );
    }

    const trustedDevice =
      await verifyTrustedDeviceSession(
        session.email,
        trustedSessionId
      );

    if (!trustedDevice) {
      return noStoreJson(
        {
          ok: false,
          code:
            'TRUSTED_DEVICE_REQUIRED',
          message:
            'Trusted Admin device verification is required.',
        },
        403
      );
    }

    const [
      auditEvents,
      rateLimitEntries,
    ] = await Promise.all([
      readAuthAuditEvents(80),
      readRateLimitEntries(
        RATE_LIMIT_POLICY
      ),
    ]);

    const now = Date.now();

    const lockouts =
      rateLimitEntries
        .map((entry) => {
          const attempts =
            typeof entry.attempts ===
            'number'
              ? entry.attempts
              : Number(
                  entry.attempts ?? 0
                );

          const windowStart =
            typeof entry.windowStart ===
            'number'
              ? entry.windowStart
              : Number(
                  entry.windowStart ?? 0
                );

          const blockedUntil =
            typeof entry.blockedUntil ===
            'number'
              ? entry.blockedUntil
              : Number(
                  entry.blockedUntil ?? 0
                );

          const blocked =
            blockedUntil > now;

          return {
            attempts:
              Number.isFinite(attempts)
                ? attempts
                : 0,

            windowStart:
              Number.isFinite(
                windowStart
              )
                ? windowStart
                : 0,

            blockedUntil:
              Number.isFinite(
                blockedUntil
              )
                ? blockedUntil
                : 0,

            blocked,

            retryAfterSeconds:
              blocked
                ? Math.max(
                    0,
                    Math.ceil(
                      (
                        blockedUntil -
                        now
                      ) / 1000
                    )
                  )
                : 0,
          };
        })
        .sort(
          (a, b) =>
            b.blockedUntil -
            a.blockedUntil
        );

    return noStoreJson({
      ok: true,

      generatedAt:
        new Date().toISOString(),

      actor: {
        role: session.role,
      },

      trustedDevice: {
        verified: true,
      },

      summary: {
        auditEventCount:
          auditEvents.length,

        activeLockouts:
          lockouts.filter(
            (entry) =>
              entry.blocked
          ).length,
      },

      lockouts,

      auditEvents,
    });
  } catch (error) {
    console.error(
      'Unable to load Admin security overview:',
      error
    );

    return noStoreJson(
      {
        ok: false,
        code:
          'SECURITY_OVERVIEW_UNAVAILABLE',
        message:
          'Unable to load Admin security overview.',
      },
      500
    );
  }
}