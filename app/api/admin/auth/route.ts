import { compare } from 'bcryptjs';
import {
  NextRequest,
  NextResponse,
} from 'next/server';

import {
  writeAdminAuthAudit,
} from '@/lib/admin-auth-audit';

import {
  revokeTrustedDeviceSession,
} from '@/lib/admin-device-auth-security';

import {
  checkAdminLoginLimit,
  clearAdminLoginFailures,
  createLoginFingerprint,
  recordFailedAdminLogin,
} from '@/lib/admin-login-security';

import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_IDLE_TIMEOUT_SECONDS,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  decodeAdminSessionToken,
  encodeAdminSessionToken,
  isAdminSessionActive,
  type AdminSessionPayload,
} from '@/lib/admin-session-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COOKIE_NAME =
  ADMIN_SESSION_COOKIE;

const TRUSTED_DEVICE_COOKIE =
  'phcl_admin_trusted_device';

const MAX_AGE_SECONDS =
  ADMIN_SESSION_MAX_AGE_SECONDS;

const IDLE_TIMEOUT_SECONDS =
  ADMIN_SESSION_IDLE_TIMEOUT_SECONDS;

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store',
} as const;

function getAdminCredentials() {
  const email =
    process.env.ADMIN_EMAIL
      ?.trim()
      .toLowerCase();

  const passwordHash =
    process.env.ADMIN_PASSWORD_HASH
      ?.trim();

  if (!email || !passwordHash) {
    throw new Error(
      'ADMIN_EMAIL and/or ADMIN_PASSWORD_HASH are not configured.'
    );
  }

  return {
    email,
    passwordHash,
  };
}

function setSessionCookie(
  response: NextResponse,
  token: string,
  maxAge = MAX_AGE_SECONDS
) {
  response.cookies.set(
    COOKIE_NAME,
    token,
    {
      path: '/',
      maxAge,
      httpOnly: true,
      sameSite: 'strict',
      secure:
        process.env.NODE_ENV ===
        'production',
    }
  );
}

function clearSessionCookie(
  response: NextResponse
) {
  response.cookies.set(
    COOKIE_NAME,
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
) {
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

function unauthorizedResponse(
  code: string,
  message: string
) {
  return NextResponse.json(
    {
      ok: false,
      authenticated: false,
      code,
      message,
    },
    {
      status: 401,
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

  const realIp =
    request.headers
      .get('x-real-ip')
      ?.trim()
      .slice(0, 100);

  return realIp || 'unknown';
}

async function safeWriteAudit(
  event:
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'LOGIN_RATE_LIMITED'
    | 'LOGOUT',
  email: string,
  ipAddress: string
): Promise<void> {
  try {
    await writeAdminAuthAudit({
      event,
      email,
      ipAddress,
    });
  } catch (error) {
    /*
     * Authentication must not fail merely because
     * audit persistence is temporarily unavailable.
     */
    console.error(
      'Unable to persist Admin authentication audit event:',
      error
    );
  }
}

async function safeRevokeTrustedDeviceSession(
  email: string,
  trustedSessionId: string
): Promise<void> {
  try {
    await revokeTrustedDeviceSession(
      email,
      trustedSessionId
    );
  } catch (error) {
    /*
     * Browser cookies must still be cleared even if
     * Firestore is temporarily unavailable.
     */
    console.error(
      'Unable to revoke Admin trusted-device session:',
      error
    );
  }
}

export async function GET(
  request: NextRequest
) {
  try {
    const token =
      request.cookies.get(
        COOKIE_NAME
      )?.value;

    if (!token) {
      return unauthorizedResponse(
        'UNAUTHENTICATED',
        'No admin session found.'
      );
    }

    const session =
      decodeAdminSessionToken(
        token
      );

    if (
      !session ||
      !isAdminSessionActive(
        session
      )
    ) {
      const response =
        unauthorizedResponse(
          'INVALID_OR_EXPIRED_SESSION',
          'Invalid or expired admin session.'
        );

      clearSessionCookie(
        response
      );

      return response;
    }

    const now =
      Date.now();

    const hardExpiryMs =
      Date.parse(
        session.exp
      );

    if (
      !Number.isFinite(
        hardExpiryMs
      )
    ) {
      const response =
        unauthorizedResponse(
          'INVALID_SESSION',
          'Invalid admin session.'
        );

      clearSessionCookie(
        response
      );

      return response;
    }

    const refreshedIdleExpiryMs =
      Math.min(
        hardExpiryMs,
        now +
          IDLE_TIMEOUT_SECONDS *
            1000
      );

    const refreshedPayload:
      AdminSessionPayload = {
        ...session,

        idleExp:
          new Date(
            refreshedIdleExpiryMs
          ).toISOString(),
      };

    const response =
      NextResponse.json(
        {
          ok: true,
          authenticated: true,

          session: {
            email:
              refreshedPayload.email,

            role:
              refreshedPayload.role,

            issuedAt:
              refreshedPayload.iat,

            expiresAt:
              refreshedPayload.exp,

            idleExpiresAt:
              refreshedPayload.idleExp,
          },
        },
        {
          headers:
            NO_STORE_HEADERS,
        }
      );

    const remainingHardLifetimeSeconds =
      Math.max(
        1,
        Math.ceil(
          (
            hardExpiryMs -
            now
          ) / 1000
        )
      );

    setSessionCookie(
      response,

      encodeAdminSessionToken(
        refreshedPayload
      ),

      Math.min(
        MAX_AGE_SECONDS,
        remainingHardLifetimeSeconds
      )
    );

    return response;
  } catch (error) {
    console.error(
      'Admin session validation failed:',
      error
    );

    return NextResponse.json(
      {
        ok: false,
        authenticated: false,
        code: 'SERVER_ERROR',

        message:
          'Unable to validate admin session.',
      },
      {
        status: 500,

        headers:
          NO_STORE_HEADERS,
      }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    let body: {
      email?: string;
      password?: string;
    };

    try {
      body =
        (await request.json()) as {
          email?: string;
          password?: string;
        };
    } catch {
      return NextResponse.json(
        {
          ok: false,

          code:
            'INVALID_REQUEST',

          message:
            'Invalid request body.',
        },
        {
          status: 400,

          headers:
            NO_STORE_HEADERS,
        }
      );
    }

    const email =
      String(
        body.email || ''
      )
        .trim()
        .toLowerCase();

    const password =
      String(
        body.password || ''
      );

    if (
      !email ||
      !password
    ) {
      return NextResponse.json(
        {
          ok: false,

          code:
            'MISSING_CREDENTIALS',

          message:
            'Email and password are required.',
        },
        {
          status: 400,

          headers:
            NO_STORE_HEADERS,
        }
      );
    }

    const clientIp =
      getClientIp(
        request
      );

    const loginFingerprint =
      createLoginFingerprint(
        email,
        clientIp
      );

    const ipFingerprint =
      createLoginFingerprint(
        '__ip_rate_limit__',
        clientIp
      );

    const emailFingerprint =
      createLoginFingerprint(
        email,
        '__email_rate_limit__'
      );

    const [
      loginLimit,
      ipLimit,
      emailLimit,
    ] =
      await Promise.all([
        checkAdminLoginLimit(
          loginFingerprint
        ),

        checkAdminLoginLimit(
          ipFingerprint
        ),

        checkAdminLoginLimit(
          emailFingerprint
        ),
      ]);

    const activeLimit =
      [
        loginLimit,
        ipLimit,
        emailLimit,
      ].find(
        (limit) =>
          !limit.allowed
      );

    if (activeLimit) {
      const retryAfter =
        Math.max(
          1,

          activeLimit
            .retryAfterSeconds
        );

      await safeWriteAudit(
        'LOGIN_RATE_LIMITED',
        email,
        clientIp
      );

      return NextResponse.json(
        {
          ok: false,

          code:
            'TOO_MANY_ATTEMPTS',

          message:
            'Too many login attempts. Please try again later.',

          retryAfterSeconds:
            retryAfter,
        },
        {
          status: 429,

          headers: {
            ...NO_STORE_HEADERS,

            'Retry-After':
              String(
                retryAfter
              ),
          },
        }
      );
    }

    const credentials =
      getAdminCredentials();

    const emailMatches =
      email ===
      credentials.email;

    /*
     * Always execute bcrypt comparison after the
     * rate-limit checks so the credential path
     * remains uniform.
     */
    const passwordMatches =
      await compare(
        password,
        credentials.passwordHash
      );

    if (
      !emailMatches ||
      !passwordMatches
    ) {
      const [
        loginFailure,
        ipFailure,
        emailFailure,
      ] =
        await Promise.all([
          recordFailedAdminLogin(
            loginFingerprint
          ),

          recordFailedAdminLogin(
            ipFingerprint
          ),

          recordFailedAdminLogin(
            emailFingerprint
          ),
        ]);

      await safeWriteAudit(
        'LOGIN_FAILED',
        email,
        clientIp
      );

      console.warn(
        'Failed admin login attempt.'
      );

      const blockedFailure =
        [
          loginFailure,
          ipFailure,
          emailFailure,
        ].find(
          (result) =>
            !result.allowed
        );

      if (blockedFailure) {
        const retryAfter =
          Math.max(
            1,

            blockedFailure
              .retryAfterSeconds
          );

        return NextResponse.json(
          {
            ok: false,

            code:
              'TOO_MANY_ATTEMPTS',

            message:
              'Too many login attempts. Please try again later.',

            retryAfterSeconds:
              retryAfter,
          },
          {
            status: 429,

            headers: {
              ...NO_STORE_HEADERS,

              'Retry-After':
                String(
                  retryAfter
                ),
            },
          }
        );
      }

      return NextResponse.json(
        {
          ok: false,

          code:
            'INVALID_CREDENTIALS',

          message:
            'Invalid email or password.',
        },
        {
          status: 401,

          headers:
            NO_STORE_HEADERS,
        }
      );
    }

    await Promise.all([
      clearAdminLoginFailures(
        loginFingerprint
      ),

      clearAdminLoginFailures(
        ipFingerprint
      ),

      clearAdminLoginFailures(
        emailFingerprint
      ),
    ]);

    const now =
      Date.now();

    const payload:
      AdminSessionPayload = {
        email:
          credentials.email,

        role:
          'admin',

        iat:
          new Date(
            now
          ).toISOString(),

        exp:
          new Date(
            now +
              MAX_AGE_SECONDS *
                1000
          ).toISOString(),

        idleExp:
          new Date(
            Math.min(
              now +
                MAX_AGE_SECONDS *
                  1000,

              now +
                IDLE_TIMEOUT_SECONDS *
                  1000
            )
          ).toISOString(),
      };

    const response =
      NextResponse.json(
        {
          ok: true,

          authenticated:
            true,

          message:
            'Login successful.',

          adminSetupComplete:
            true,

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
        },
        {
          headers:
            NO_STORE_HEADERS,
        }
      );

    setSessionCookie(
      response,

      encodeAdminSessionToken(
        payload
      )
    );

    await safeWriteAudit(
      'LOGIN_SUCCESS',
      credentials.email,
      clientIp
    );

    console.info(
      'Admin login successful.'
    );

    return response;
  } catch (error) {
    console.error(
      'Admin login failed:',
      error
    );

    return NextResponse.json(
      {
        ok: false,

        code:
          'SERVER_ERROR',

        message:
          'Admin authentication is currently unavailable.',
      },
      {
        status: 500,

        headers:
          NO_STORE_HEADERS,
      }
    );
  }
}

export async function DELETE(
  request: NextRequest
) {
  const token =
    request.cookies.get(
      COOKIE_NAME
    )?.value;

  const trustedSessionId =
    request.cookies.get(
      TRUSTED_DEVICE_COOKIE
    )?.value;

  const session =
    token
      ? decodeAdminSessionToken(
          token
        )
      : null;

  if (
    session &&
    isAdminSessionActive(
      session
    )
  ) {
    if (
      trustedSessionId
    ) {
      await safeRevokeTrustedDeviceSession(
        session.email,
        trustedSessionId
      );
    }

    await safeWriteAudit(
      'LOGOUT',
      session.email,
      getClientIp(
        request
      )
    );
  }

  const response =
    NextResponse.json(
      {
        ok: true,

        authenticated:
          false,

        message:
          'Logged out successfully.',
      },
      {
        headers:
          NO_STORE_HEADERS,
      }
    );

  clearSessionCookie(
    response
  );

  clearTrustedDeviceCookie(
    response
  );

  return response;
}