import { NextRequest, NextResponse } from 'next/server';
import {
  createAdminSession,
  deleteAdminSession,
  getAdminSession,
  touchAdminSession,
} from '@/lib/admin-session-store';
import {
  ADMIN_SESSION_COOKIE_NAME,
  type AdminSessionPayload,
  decodeAdminSessionToken,
  encodeAdminSessionToken,
  isAdminSessionSecretConfigured,
} from '@/lib/admin-session-token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_AGE_SECONDS = Number(process.env.ADMIN_SESSION_MAX_AGE_SECONDS || 60 * 60 * 8);
const IDLE_TIMEOUT_SECONDS = Number(process.env.ADMIN_SESSION_IDLE_TIMEOUT_SECONDS || 60 * 30);

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
  if (!isAdminSessionSecretConfigured()) {
    return NextResponse.json(
      { ok: false, code: 'SERVER_MISCONFIGURED', message: 'Admin session secret is not configured.' },
      { status: 503 }
    );
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ ok: false, code: 'UNAUTHENTICATED' }, { status: 401 });

  const session = decodeAdminSessionToken(token);
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

  const refreshed: AdminSessionPayload = {
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

  res.cookies.set(ADMIN_SESSION_COOKIE_NAME, encodeAdminSessionToken(refreshed), {
    path: '/',
    maxAge: MAX_AGE_SECONDS,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return res;
}

export async function POST(request: NextRequest) {
  if (!isAdminSessionSecretConfigured()) {
    return NextResponse.json(
      { ok: false, message: 'ADMIN_SESSION_SECRET must be configured before admin login is enabled.' },
      { status: 503 }
    );
  }

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

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();

  if (!adminEmail || !adminPassword) {
    return NextResponse.json(
      { ok: false, message: 'Admin credentials are not configured.' },
      { status: 503 }
    );
  }

  if (email !== adminEmail || password !== adminPassword) {
    return NextResponse.json({ ok: false, message: 'Invalid email or password.' }, { status: 401 });
  }

  const now = Date.now();
  const createdSession = createAdminSession({
    email,
    expiresAt: new Date(now + MAX_AGE_SECONDS * 1000).toISOString(),
    idleExpiresAt: new Date(now + IDLE_TIMEOUT_SECONDS * 1000).toISOString(),
  });
  const payload: AdminSessionPayload = {
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

  res.cookies.set(ADMIN_SESSION_COOKIE_NAME, encodeAdminSessionToken(payload), {
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
  const session = token ? decodeAdminSessionToken(token) : null;
  if (session?.sessionId) {
    deleteAdminSession(session.sessionId);
  }
  const res = NextResponse.json({ ok: true, message: 'Logged out successfully.' });
  clearCookie(res);
  return res;
}