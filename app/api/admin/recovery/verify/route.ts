import {
  NextRequest,
  NextResponse,
} from 'next/server';

import { compare } from 'bcryptjs';

import {
  consumeAdminRecoveryCode,
} from '@/lib/admin-recovery-security';

import {
  checkAdminRecoveryLimit,
  clearAdminRecoveryFailures,
  createAdminRecoveryAccessSession,
  createRecoveryFingerprint,
  recordFailedAdminRecoveryAttempt,
  writeAdminRecoveryAudit,
} from '@/lib/admin-recovery-access-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RECOVERY_ACCESS_COOKIE =
  'phcl_admin_recovery_access';

type RecoveryRequestBody = {
  email?: string;
  password?: string;
  recoveryCode?: string;
};

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

function getClientIp(
  request: NextRequest
): string {
  const forwardedFor =
    request.headers.get(
      'x-forwarded-for'
    );

  if (forwardedFor) {
    return (
      forwardedFor
        .split(',')[0]
        ?.trim() || 'unknown'
    );
  }

  const realIp =
    request.headers.get(
      'x-real-ip'
    );

  return (
    realIp?.trim() ||
    'unknown'
  );
}

function getAdminCredentials() {
  const email =
    process.env.ADMIN_EMAIL
      ?.trim()
      .toLowerCase();

  const passwordHash =
    process.env.ADMIN_PASSWORD_HASH
      ?.trim();

  if (
    !email ||
    !passwordHash
  ) {
    throw new Error(
      'ADMIN_EMAIL and/or ADMIN_PASSWORD_HASH are not configured.'
    );
  }

  return {
    email,
    passwordHash,
  };
}

async function recordRecoveryFailure(
  fingerprint: string,
  email: string,
  ipAddress: string,
  reason: string
): Promise<void> {
  await recordFailedAdminRecoveryAttempt(
    fingerprint
  );

  await writeAdminRecoveryAudit(
    'recovery_failed',
    {
      email,
      ipAddress,
      success: false,
      reason,
    }
  );
}

export async function POST(
  request: NextRequest
) {
  const ipAddress =
    getClientIp(request);

  let email = '';

  try {
    let body: RecoveryRequestBody;

    try {
      body =
        (await request.json()) as RecoveryRequestBody;
    } catch {
      return json(
        {
          ok: false,
          code: 'INVALID_REQUEST',
          message:
            'Invalid recovery request.',
        },
        400
      );
    }

    email =
      body.email
        ?.trim()
        .toLowerCase() || '';

    const password =
      body.password || '';

    const recoveryCode =
      body.recoveryCode?.trim() || '';

    if (
      !email ||
      !password ||
      !recoveryCode
    ) {
      return json(
        {
          ok: false,
          code:
            'RECOVERY_CREDENTIALS_REQUIRED',
          message:
            'Recovery verification failed.',
        },
        400
      );
    }

    const fingerprint =
      createRecoveryFingerprint(
        email,
        ipAddress
      );

    const limit =
      await checkAdminRecoveryLimit(
        fingerprint
      );

    if (!limit.allowed) {
      await writeAdminRecoveryAudit(
        'recovery_rate_limited',
        {
          email,
          ipAddress,
          success: false,
          reason:
            'rate_limit_exceeded',
        }
      );

      const response =
        json(
          {
            ok: false,
            code:
              'RECOVERY_RATE_LIMITED',
            message:
              'Recovery verification is temporarily unavailable.',
          },
          429
        );

      response.headers.set(
        'Retry-After',
        String(
          limit.retryAfterSeconds
        )
      );

      return response;
    }

    await writeAdminRecoveryAudit(
      'recovery_attempt',
      {
        email,
        ipAddress,
      }
    );

    const credentials =
      getAdminCredentials();

    /*
     * Verify email and password BEFORE
     * consuming a one-time recovery code.
     *
     * This prevents a valid recovery code
     * from being burned by a request that
     * does not also possess the Admin
     * password.
     */
    const emailMatches =
      email === credentials.email;

    const passwordMatches =
      await compare(
        password,
        credentials.passwordHash
      );

    if (
      !emailMatches ||
      !passwordMatches
    ) {
      await recordRecoveryFailure(
        fingerprint,
        email,
        ipAddress,
        'invalid_recovery_credentials'
      );

      return json(
        {
          ok: false,
          code:
            'RECOVERY_VERIFICATION_FAILED',
          message:
            'Recovery verification failed.',
        },
        401
      );
    }

    /*
     * Only consume the one-time code after
     * the Admin password has been verified.
     */
    const recoveryCodeAccepted =
      await consumeAdminRecoveryCode(
        email,
        recoveryCode
      );

    if (!recoveryCodeAccepted) {
      await recordRecoveryFailure(
        fingerprint,
        email,
        ipAddress,
        'invalid_recovery_code'
      );

      return json(
        {
          ok: false,
          code:
            'RECOVERY_VERIFICATION_FAILED',
          message:
            'Recovery verification failed.',
        },
        401
      );
    }

    await clearAdminRecoveryFailures(
      fingerprint
    );

    await writeAdminRecoveryAudit(
      'recovery_code_accepted',
      {
        email,
        ipAddress,
        success: true,
      }
    );

    const recoverySession =
      await createAdminRecoveryAccessSession(
        email
      );

    await writeAdminRecoveryAudit(
      'recovery_session_created',
      {
        email,
        ipAddress,
        success: true,
      }
    );

    const response =
      json({
        ok: true,
        recoveryAuthorized: true,
        expiresAtMs:
          recoverySession.expiresAtMs,
      });

    response.cookies.set(
      RECOVERY_ACCESS_COOKIE,
      recoverySession.sessionId,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 10 * 60,
      }
    );

    return response;
  } catch (error) {
    console.error(
      'Admin recovery verification failed:',
      error
    );

    await writeAdminRecoveryAudit(
      'recovery_failed',
      {
        email:
          email || undefined,
        ipAddress,
        success: false,
        reason:
          'server_error',
      }
    ).catch(() => {
      // Do not replace the primary error.
    });

    return json(
      {
        ok: false,
        code:
          'RECOVERY_VERIFICATION_FAILED',
        message:
          'Recovery verification failed.',
      },
      500
    );
  }
}
