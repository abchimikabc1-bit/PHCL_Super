import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'phcl_admin_session';

function getPositiveNumberEnv(name: string, fallback: number) {
  const raw = process.env[name];
  const value = Number(raw);

  if (!raw || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
}

const MAX_AGE_SECONDS = getPositiveNumberEnv(
  'ADMIN_SESSION_MAX_AGE_SECONDS',
  60 * 60 * 8
);

const IDLE_TIMEOUT_SECONDS = getPositiveNumberEnv(
  'ADMIN_SESSION_IDLE_TIMEOUT_SECONDS',
  60 * 30
);

type SessionPayload = {
  email: string;
  role: 'admin';
  iat: string;
  exp: string;
  idleExp: string;
};

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();

  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET is not configured.');
  }

  return secret;
}

function getAdminCredentials() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'ADMIN_EMAIL and/or ADMIN_PASSWORD are not configured.'
    );
  }

  return { email, password };
}

function sign(value: string) {
  return createHmac('sha256', getSessionSecret())
    .update(value)
    .digest('base64url');
}

function encodeToken(payload: SessionPayload) {
  const body = Buffer.from(
    JSON.stringify(payload),
    'utf8'
  ).toString('base64url');

  const signature = sign(body);

  return `${body}.${signature}`;
}

function decodeToken(token: string): SessionPayload | null {
  try {
    const [body, signature] = token.split('.');

    if (!body || !signature) {
      return null;
    }

    const expectedSignature = sign(body);

    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (providedBuffer.length !== expectedBuffer.length) {
      return null;
    }

    if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
      return null;
    }

    const decoded = Buffer.from(
      body,
      'base64url'
    ).toString('utf8');

    const payload = JSON.parse(decoded) as SessionPayload;

    if (
      !payload.email ||
      payload.role !== 'admin' ||
      !payload.iat ||
      !payload.exp ||
      !payload.idleExp
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function setSessionCookie(
  response: NextResponse,
  token: string,
  maxAge = MAX_AGE_SECONDS
) {
  response.cookies.set(COOKIE_NAME, token, {
    path: '/',
    maxAge,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

function clearSessionCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
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
    { status: 401 }
  );
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
      return unauthorizedResponse(
        'UNAUTHENTICATED',
        'No admin session found.'
      );
    }

    const session = decodeToken(token);

    if (!session) {
      const response = unauthorizedResponse(
        'INVALID_SESSION',
        'Invalid admin session.'
      );

      clearSessionCookie(response);

      return response;
    }

    const now = Date.now();

    const hardExpiry = Date.parse(session.exp);
    const idleExpiry = Date.parse(session.idleExp);

    if (
      Number.isNaN(hardExpiry) ||
      Number.isNaN(idleExpiry)
    ) {
      const response = unauthorizedResponse(
        'INVALID_SESSION',
        'Invalid session expiry data.'
      );

      clearSessionCookie(response);

      return response;
    }

    if (
      hardExpiry <= now ||
      idleExpiry <= now
    ) {
      const response = unauthorizedResponse(
        'SESSION_EXPIRED',
        'Admin session has expired.'
      );

      clearSessionCookie(response);

      return response;
    }

    const refreshedPayload: SessionPayload = {
      ...session,
      idleExp: new Date(
        now + IDLE_TIMEOUT_SECONDS * 1000
      ).toISOString(),
    };

    const response = NextResponse.json({
      ok: true,
      authenticated: true,
      session: {
        email: refreshedPayload.email,
        role: refreshedPayload.role,
        issuedAt: refreshedPayload.iat,
        expiresAt: refreshedPayload.exp,
        idleExpiresAt: refreshedPayload.idleExp,
      },
    });

    setSessionCookie(
      response,
      encodeToken(refreshedPayload)
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
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: {
      email?: string;
      password?: string;
    };

    try {
      body = (await request.json()) as {
        email?: string;
        password?: string;
      };
    } catch {
      return NextResponse.json(
        {
          ok: false,
          code: 'INVALID_REQUEST',
          message: 'Invalid request body.',
        },
        { status: 400 }
      );
    }

    const email = String(
      body.email || ''
    )
      .trim()
      .toLowerCase();

    const password = String(
      body.password || ''
    );

    if (!email || !password) {
      return NextResponse.json(
        {
          ok: false,
          code: 'MISSING_CREDENTIALS',
          message:
            'Email and password are required.',
        },
        { status: 400 }
      );
    }

    const credentials = getAdminCredentials();

    if (
      email !== credentials.email ||
      password !== credentials.password
    ) {
      console.warn(
        `Failed admin login attempt for: ${email}`
      );

      return NextResponse.json(
        {
          ok: false,
          code: 'INVALID_CREDENTIALS',
          message:
            'Invalid email or password.',
        },
        { status: 401 }
      );
    }

    const now = Date.now();

    const payload: SessionPayload = {
      email,
      role: 'admin',
      iat: new Date(now).toISOString(),
      exp: new Date(
        now + MAX_AGE_SECONDS * 1000
      ).toISOString(),
      idleExp: new Date(
        now + IDLE_TIMEOUT_SECONDS * 1000
      ).toISOString(),
    };

    const response = NextResponse.json({
      ok: true,
      authenticated: true,
      message: 'Login successful.',
      adminSetupComplete: true,
      session: {
        email: payload.email,
        role: payload.role,
        issuedAt: payload.iat,
        expiresAt: payload.exp,
        idleExpiresAt: payload.idleExp,
      },
    });

    setSessionCookie(
      response,
      encodeToken(payload)
    );

    console.info(
      `Admin login successful for: ${email}`
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
        code: 'SERVER_ERROR',
        message:
          'Admin authentication is currently unavailable.',
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({
    ok: true,
    message: 'Logged out successfully.',
  });

  clearSessionCookie(response);

  return response;
}