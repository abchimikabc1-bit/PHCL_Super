import { NextRequest, NextResponse } from 'next/server';
import {
  createAdminSession,
  deleteAdminSession,
  getAdminSession,
  touchAdminSession,
} from '@/lib/admin-session-store';
import { ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-auth-constants';
import {
  decodeAdminSessionToken,
  encodeAdminSessionToken,
  type AdminSessionTokenPayload,
} from '@/lib/admin-session-token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_AGE_SECONDS = Number(process.env.ADMIN_SESSION_MAX_AGE_SECONDS || 60 * 60 * 8);
const IDLE_TIMEOUT_SECONDS = Number(process.env.ADMIN_SESSION_IDLE_TIMEOUT_SECONDS || 60 * 30);

function getConfiguredSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  return secret ? secret : null;
}

function getConfiguredAdminCredentials() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD?.trim();

  if (!email || !password) {
    return null;
  }

  return { email, password };
}

function getSecret() {
  return getConfiguredSecret() || '';
}

function clearCookie(res: NextResponse) {
  res.cookies.set(ADMIN_SESSION_COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ ok: false, code: 'UNAUTHENTICATED' }, { status: 401 });

  if (!getConfiguredSecret()) {
    const res = NextResponse.json(
      { ok: false, code: 'AUTH_NOT_CONFIGURED', message: 'Admin authentication is not configured.' },
      { status: 503 }
    );
    clearCookie(res);
    return res;
  }

  const session = decodeAdminSessionToken(token, getSecret());
  if (!session) {
    const res = NextResponse.json({ ok: false, code: 'INVALID_SESSION' }, { status: 401 });
    clearCookie(res);
    return res;
  }

  const now = Date.now();
  const hardExp = Date.parse(session.exp);
  const idleExp = Date.parse(session.idleExp);
  const storedSession = getAdminSession(session.sessionId);

  if (!storedSession || Number.isNaN(hardExp) || Number.isNaN(idleExp) || hardExp <= now || idleExp <= now) {
    const res = NextResponse.json({ ok: false, code: 'SESSION_EXPIRED' }, { status: 401 });
    clearCookie(res);
    return res;
  }

  const refreshed: AdminSessionTokenPayload = {
    ...session,
    idleExp: new Date(now + IDLE_TIMEOUT_SECONDS * 1000).toISOString(),
  };
  touchAdminSession(session.sessionId, refreshed.idleExp);

  const res = NextResponse.json({
    ok: true,
    session: {
      sessionId: refreshed.sessionId,
      email: refreshed.email,
      role: refreshed.role,
      issuedAt: refreshed.iat,
      expiresAt: refreshed.exp,
      idleExpiresAt: refreshed.idleExp,
    },
  });

  res.cookies.set(ADMIN_SESSION_COOKIE_NAME, encodeAdminSessionToken(refreshed, getSecret()), {
    path: '/',
    maxAge: MAX_AGE_SECONDS,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return res;
}

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string } = {};
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid request body.' }, { status: 400 });
  }

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!email || !password) {
    return NextResponse.json({ ok: false, message: 'Email and password are required.' }, { status: 400 });
  }

  const configuredCredentials = getConfiguredAdminCredentials();
  const sessionSecret = getConfiguredSecret();

  if (!configuredCredentials || !sessionSecret) {
    return NextResponse.json(
      { ok: false, code: 'AUTH_NOT_CONFIGURED', message: 'Admin authentication is not configured.' },
      { status: 503 }
    );
  }

  if (email !== configuredCredentials.email || password !== configuredCredentials.password) {
    return NextResponse.json({ ok: false, message: 'Invalid email or password.' }, { status: 401 });
  }

  const now = Date.now();
  const createdSession = createAdminSession({
    email,
    expiresAt: new Date(now + MAX_AGE_SECONDS * 1000).toISOString(),
    idleExpiresAt: new Date(now + IDLE_TIMEOUT_SECONDS * 1000).toISOString(),
  });
  const payload: AdminSessionTokenPayload = {
    sessionId: createdSession.sessionId,
    email,
    role: 'admin',
    iat: createdSession.issuedAt,
    exp: createdSession.expiresAt,
    idleExp: createdSession.idleExpiresAt,
  };

  const res = NextResponse.json({
    ok: true,
    message: 'Login successful.',
    session: {
      sessionId: payload.sessionId,
      email: payload.email,
      role: payload.role,
      issuedAt: payload.iat,
      expiresAt: payload.exp,
      idleExpiresAt: payload.idleExp,
    },
  });

  res.cookies.set(ADMIN_SESSION_COOKIE_NAME, encodeAdminSessionToken(payload, getSecret()), {
    path: '/',
    maxAge: MAX_AGE_SECONDS,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return res;
}

export async function DELETE(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  const session = token ? decodeAdminSessionToken(token, getSecret()) : null;
  if (session?.sessionId) {
    deleteAdminSession(session.sessionId);
  }
  const res = NextResponse.json({ ok: true, message: 'Logged out successfully.' });
  clearCookie(res);
  return res;
}