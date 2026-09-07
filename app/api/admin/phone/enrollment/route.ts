import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  writeAdminAuthAudit,
  type AdminAuthAuditEvent,
  type AdminAuthAuditReason,
} from '@/lib/admin-auth-audit';

import {
  adminAuth,
} from '@/lib/firebase-admin';

import {
  ADMIN_PHONE_ENROLLMENT_COOKIE,
  consumeAdminPhoneEnrollmentSession,
  recordFailedAdminPhoneEnrollmentAttempt,
  revokeAdminPhoneEnrollmentSession,
  verifyAdminPhoneEnrollmentSession,
} from '@/lib/admin-phone-enrollment-security';

import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_IDLE_TIMEOUT_SECONDS,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  ADMIN_SESSION_SECURITY_VERSION,
  encodeAdminSessionToken,
  type AdminSessionPayload,
} from '@/lib/admin-session-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TRUSTED_DEVICE_COOKIE =
  'phcl_admin_trusted_device';

const MAX_ID_TOKEN_LENGTH =
  16_384;

const NO_STORE_HEADERS = {
  'Cache-Control':
    'no-store, max-age=0',
  Pragma: 'no-cache',
  Vary: 'Cookie',
} as const;

type VerifyPhoneBody = {
  idToken?: string;
};

function json(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,
      headers:
        NO_STORE_HEADERS,
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
    const firstIp =
      forwardedFor
        .split(',')[0]
        ?.trim()
        .slice(0, 100);

    if (firstIp) {
      return firstIp;
    }
  }

  return (
    request.headers
      .get('x-real-ip')
      ?.trim()
      .slice(0, 100) ||
    'unknown'
  );
}

function normalizeEmail(
  email: string
): string {
  return email
    .trim()
    .toLowerCase();
}

function getSafeErrorName(
  error: unknown
): string {
  return error instanceof Error
    ? error.name
    : 'UNKNOWN_ERROR';
}

async function safeRevokeEnrollment(
  sessionId: string | undefined
): Promise<void> {
  if (!sessionId) {
    return;
  }

  try {
    await revokeAdminPhoneEnrollmentSession(
      sessionId
    );
  } catch (error) {
    console.error(
      'Unable to revoke Admin phone enrollment:',
      getSafeErrorName(error)
    );
  }
}

function clearPhoneEnrollmentCookie(
  response: NextResponse
): void {
  response.cookies.set(
    ADMIN_PHONE_ENROLLMENT_COOKIE,
    '',
    {
      path: '/',
      maxAge: 0,
      httpOnly: true,
      sameSite: 'strict',
      secure:
        process.env.NODE_ENV ===
        'production',
    }
  );
}

function clearTrustedDeviceCookie(
  response: NextResponse
): void {
  response.cookies.set(
    TRUSTED_DEVICE_COOKIE,
    '',
    {
      path: '/',
      maxAge: 0,
      httpOnly: true,
      sameSite: 'strict',
      secure:
        process.env.NODE_ENV ===
        'production',
    }
  );
}

function setAdminSessionCookie(
  response: NextResponse,
  token: string
): void {
  response.cookies.set(
    ADMIN_SESSION_COOKIE,
    token,
    {
      path: '/',
      maxAge:
        ADMIN_SESSION_MAX_AGE_SECONDS,
      httpOnly: true,
      sameSite: 'strict',
      secure:
        process.env.NODE_ENV ===
        'production',
    }
  );
}

async function safeWriteAudit(
  event: AdminAuthAuditEvent,
  email: string,
  ipAddress: string,
  reason?: AdminAuthAuditReason
): Promise<void> {
  try {
    await writeAdminAuthAudit({
      event,
      email,
      ipAddress,
      reason,
    });
  } catch (error) {
    console.error(
      'Unable to persist Admin phone audit event:',
      getSafeErrorName(error)
    );
  }
}

async function rejectVerification(
  sessionId: string,
  email: string,
  ipAddress: string,
  reason: AdminAuthAuditReason
): Promise<NextResponse> {
  const attempt =
    await recordFailedAdminPhoneEnrollmentAttempt(
      sessionId
    );

  await safeWriteAudit(
    'PHONE_VERIFICATION_FAILED',
    email,
    ipAddress,
    attempt.allowed
      ? reason
      : 'PHONE_ENROLLMENT_ATTEMPTS_EXCEEDED'
  );

  const response = json(
    {
      ok: false,
      authenticated: false,
      code: attempt.allowed
        ? 'PHONE_VERIFICATION_FAILED'
        : 'PHONE_ENROLLMENT_LOCKED',
      message: attempt.allowed
        ? 'Phone verification failed.'
        : 'Phone enrollment authorization is no longer valid.',
    },
    attempt.allowed
      ? 401
      : 429
  );

  if (!attempt.allowed) {
    clearPhoneEnrollmentCookie(
      response
    );
  }

  return response;
}

export async function GET(
  request: NextRequest
) {
  const sessionId =
    request.cookies.get(
      ADMIN_PHONE_ENROLLMENT_COOKIE
    )?.value;

  const session =
    await verifyAdminPhoneEnrollmentSession(
      sessionId
    );

  if (!session) {
    await safeRevokeEnrollment(
      sessionId
    );

    const response = json(
      {
        ok: false,
        authorized: false,
        code:
          'PHONE_ENROLLMENT_AUTHORIZATION_REQUIRED',
        message:
          'Phone enrollment authorization is invalid or expired.',
      },
      401
    );

    clearPhoneEnrollmentCookie(
      response
    );

    return response;
  }

  try {
    const firebaseUser =
      await adminAuth.getUser(
        session.firebaseUid
      );

    const firebaseEmail =
      normalizeEmail(
        firebaseUser.email || ''
      );

    if (
      firebaseUser.disabled ||
      !firebaseUser.emailVerified ||
      firebaseEmail !==
        normalizeEmail(
          session.email
        )
    ) {
      await safeRevokeEnrollment(
        sessionId
      );

      const response = json(
        {
          ok: false,
          authorized: false,
          code:
            'ADMIN_ACCOUNT_VERIFICATION_FAILED',
          message:
            'Admin account verification failed.',
        },
        403
      );

      clearPhoneEnrollmentCookie(
        response
      );

      return response;
    }

    return json({
      ok: true,
      authorized: true,
      expiresAtMs:
        session.expiresAtMs,
    });
  } catch (error) {
    console.error(
      'Unable to validate Admin phone enrollment:',
      getSafeErrorName(error)
    );

    return json(
      {
        ok: false,
        authorized: false,
        code:
          'PHONE_ENROLLMENT_UNAVAILABLE',
        message:
          'Phone enrollment is temporarily unavailable.',
      },
      500
    );
  }
}

export async function POST(
  request: NextRequest
) {
  const ipAddress =
    getClientIp(request);

  const sessionId =
    request.cookies.get(
      ADMIN_PHONE_ENROLLMENT_COOKIE
    )?.value;

  const session =
    await verifyAdminPhoneEnrollmentSession(
      sessionId
    );

  if (
    !sessionId ||
    !session
  ) {
    await safeRevokeEnrollment(
      sessionId
    );

    const response = json(
      {
        ok: false,
        authenticated: false,
        code:
          'PHONE_ENROLLMENT_AUTHORIZATION_REQUIRED',
        message:
          'Phone enrollment authorization is invalid or expired.',
      },
      401
    );

    clearPhoneEnrollmentCookie(
      response
    );

    return response;
  }

  let body: VerifyPhoneBody;

  try {
    body =
      (await request.json()) as VerifyPhoneBody;
  } catch {
    return rejectVerification(
      sessionId,
      session.email,
      ipAddress,
      'PHONE_ID_TOKEN_INVALID'
    );
  }

  const idToken =
    typeof body.idToken ===
      'string'
      ? body.idToken.trim()
      : '';

  if (
    !idToken ||
    idToken.length >
      MAX_ID_TOKEN_LENGTH
  ) {
    return rejectVerification(
      sessionId,
      session.email,
      ipAddress,
      'PHONE_ID_TOKEN_INVALID'
    );
  }

  try {
    let decodedToken;

    try {
      decodedToken =
        await adminAuth.verifyIdToken(
          idToken,
          true
        );
    } catch {
      return rejectVerification(
        sessionId,
        session.email,
        ipAddress,
        'PHONE_ID_TOKEN_INVALID'
      );
    }

    const tokenEmail =
      normalizeEmail(
        typeof decodedToken.email ===
          'string'
          ? decodedToken.email
          : ''
      );

    const tokenPhone =
      typeof decodedToken.phone_number ===
        'string'
        ? decodedToken.phone_number.trim()
        : '';

    if (
      decodedToken.uid !==
        session.firebaseUid ||
      tokenEmail !==
        normalizeEmail(
          session.email
        ) ||
      decodedToken.email_verified !==
        true
    ) {
      return rejectVerification(
        sessionId,
        session.email,
        ipAddress,
        'PHONE_IDENTITY_MISMATCH'
      );
    }

    if (!tokenPhone) {
      return rejectVerification(
        sessionId,
        session.email,
        ipAddress,
        'PHONE_NUMBER_NOT_VERIFIED'
      );
    }

    const firebaseUser =
      await adminAuth.getUser(
        session.firebaseUid
      );

    const recordEmail =
      normalizeEmail(
        firebaseUser.email || ''
      );

    const recordPhone =
      firebaseUser.phoneNumber
        ?.trim() || '';

    if (
      firebaseUser.disabled ||
      !firebaseUser.emailVerified ||
      recordEmail !== tokenEmail ||
      recordPhone !== tokenPhone
    ) {
      return rejectVerification(
        sessionId,
        session.email,
        ipAddress,
        'PHONE_IDENTITY_MISMATCH'
      );
    }

    const consumed =
      await consumeAdminPhoneEnrollmentSession(
        sessionId
      );

    if (!consumed) {
      const response = json(
        {
          ok: false,
          authenticated: false,
          code:
            'PHONE_ENROLLMENT_ALREADY_USED',
          message:
            'Phone enrollment authorization has already been used or expired.',
        },
        409
      );

      clearPhoneEnrollmentCookie(
        response
      );

      return response;
    }

    const now =
      Date.now();

    const payload:
      AdminSessionPayload = {
      securityVersion:
        ADMIN_SESSION_SECURITY_VERSION,

      firebaseUid:
        consumed.firebaseUid,

      email:
        consumed.email,

      emailVerified:
        true,

      phoneVerified:
        true,

      role:
        'admin',
      iat:
        new Date(now)
          .toISOString(),
      exp:
        new Date(
          now +
            ADMIN_SESSION_MAX_AGE_SECONDS *
              1000
        ).toISOString(),
      idleExp:
        new Date(
          Math.min(
            now +
              ADMIN_SESSION_MAX_AGE_SECONDS *
                1000,
            now +
              ADMIN_SESSION_IDLE_TIMEOUT_SECONDS *
                1000
          )
        ).toISOString(),
    };

    const response = json({
      ok: true,
      authenticated: true,
      nextStep:
        'ADMIN_SESSION',
      message:
        'Admin phone verification completed.',
      session: {
        email:
          payload.email,
        role:
          payload.role,
        issuedAt:
          payload.iat,
        expiresAt:
          payload.exp,
        idleExpiresAt:
          payload.idleExp,
      },
    });

    setAdminSessionCookie(
      response,
      encodeAdminSessionToken(
        payload
      )
    );

    clearPhoneEnrollmentCookie(
      response
    );

    clearTrustedDeviceCookie(
      response
    );

    await safeWriteAudit(
      'PHONE_VERIFIED',
      consumed.email,
      ipAddress,
      'PHONE_ENROLLMENT_COMPLETED'
    );

    await safeWriteAudit(
      'PHONE_ENROLLMENT_CONSUMED',
      consumed.email,
      ipAddress,
      'PHONE_ENROLLMENT_COMPLETED'
    );

    await safeWriteAudit(
      'LOGIN_SUCCESS',
      consumed.email,
      ipAddress
    );

    return response;
  } catch (error) {
    console.error(
      'Admin phone verification failed:',
      getSafeErrorName(error)
    );

    return json(
      {
        ok: false,
        authenticated: false,
        code:
          'PHONE_VERIFICATION_UNAVAILABLE',
        message:
          'Phone verification is temporarily unavailable.',
      },
      500
    );
  }
}
