import {
  NextRequest,
  NextResponse,
} from 'next/server';

import { compare } from 'bcryptjs';

import {
  completeAdminRecoveryCodeReservation,
  releaseAdminRecoveryCodeReservation,
  reserveAdminRecoveryCode,
  type RecoveryCodeReservation,
} from '@/lib/admin-recovery-security';

import {
  checkAdminRecoveryLimit,
  clearAdminRecoveryFailures,
  createAdminRecoveryAccessSession,
  createRecoveryFingerprint,
  recordFailedAdminRecoveryAttempt,
  revokeAdminRecoveryAccessSession,
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

  await safeWriteRecoveryAudit(
    'recovery_failed',
    {
      email,
      ipAddress,
      success: false,
      reason,
    }
  );
}

async function safeWriteRecoveryAudit(
  event:
    | 'recovery_attempt'
    | 'recovery_failed'
    | 'recovery_rate_limited'
    | 'recovery_code_accepted'
    | 'recovery_session_created',
  details: {
    email?: string;
    ipAddress: string;
    success?: boolean;
    reason?: string;
  }
): Promise<void> {
  try {
    await writeAdminRecoveryAudit(
      event,
      details
    );
  } catch (error) {
    console.error(
      'Unable to persist Admin recovery audit event:',
      error
    );
  }
}

export async function POST(
  request: NextRequest
) {
  const ipAddress =
    getClientIp(request);

  let email = '';

  let codeReservation:
    | RecoveryCodeReservation
    | null = null;

  let recoverySession:
    | Awaited<
        ReturnType<
          typeof createAdminRecoveryAccessSession
        >
      >
    | null = null;

  let codeReservationCompleted =
    false;

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
      await safeWriteRecoveryAudit(
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

    await safeWriteRecoveryAudit(
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
     * Reserve the one-time code after the Admin
     * password is verified. The code is consumed
     * only after the recovery-access session has
     * been created successfully.
     */
    codeReservation =
      await reserveAdminRecoveryCode(
        email,
        recoveryCode
      );

    if (!codeReservation) {
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

    recoverySession =
      await createAdminRecoveryAccessSession(
        email
      );

    codeReservationCompleted =
      await completeAdminRecoveryCodeReservation(
        email,
        codeReservation.reservationId
      );

    if (!codeReservationCompleted) {
      await revokeAdminRecoveryAccessSession(
        recoverySession.sessionId
      ).catch(() => {
        /*
         * The raw session token is never disclosed
         * when reservation completion fails.
         */
      });

      await releaseAdminRecoveryCodeReservation(
        email,
        codeReservation.reservationId
      ).catch(() => {
        // The short reservation expires automatically.
      });

      return json(
        {
          ok: false,
          code:
            'RECOVERY_AUTHORIZATION_CONFLICT',
          message:
            'Recovery authorization could not be completed. Please try again.',
        },
        409
      );
    }

    await clearAdminRecoveryFailures(
      fingerprint
    );

    await safeWriteRecoveryAudit(
      'recovery_code_accepted',
      {
        email,
        ipAddress,
        success: true,
      }
    );

    await safeWriteRecoveryAudit(
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
        maxAge:
          Math.max(
            1,
            Math.ceil(
              (
                recoverySession
                  .expiresAtMs -
                Date.now()
              ) / 1000
            )
          ),
      }
    );

    return response;
  } catch (error) {
    console.error(
      'Admin recovery verification failed:',
      error
    );

    if (
      codeReservation &&
      !codeReservationCompleted
    ) {
      await releaseAdminRecoveryCodeReservation(
        email,
        codeReservation.reservationId
      ).catch(() => {
        // The short reservation expires automatically.
      });
    }

    if (
      recoverySession &&
      !codeReservationCompleted
    ) {
      await revokeAdminRecoveryAccessSession(
        recoverySession.sessionId
      ).catch(() => {
        // The raw session token was never disclosed.
      });
    }

    await safeWriteRecoveryAudit(
      'recovery_failed',
      {
        email:
          email || undefined,
        ipAddress,
        success: false,
        reason:
          'server_error',
      }
    );

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
