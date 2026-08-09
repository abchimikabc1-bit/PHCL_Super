import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  createAdminSession,
  deleteAdminSession,
  getAdminSession,
  touchAdminSession,
} from '@/lib/admin-session-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'phcl_admin_session';
const MAX_AGE_SECONDS = Number(process.env.ADMIN_SESSION_MAX_AGE_SECONDS || 60 * 60 * 8);
const IDLE_TIMEOUT_SECONDS = Number(process.env.ADMIN_SESSION_IDLE_TIMEOUT_SECONDS || 60 * 30);

type SessionPayload = {
  sessionId: string;
  email: string;
  role: 'admin';
  iat: string;
  exp: string;
  idleExp: string;
};

function getSecret() {
  return process.env.ADMIN_SESSION_SECRET?.trim() || 'dev-only-secret-change-in-production';
}

function sign(value: string) {
  return createHmac('sha256', getSecret()).update(value).digest('base64url');
}

function encodeToken(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = sign(body);
  return `${body}.${sig}`;
}

function decodeToken(token: string): SessionPayload | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;

  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;

  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
  } catch {
    return null;
  }
}

function clearCookie(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ ok: false, code: 'UNAUTHENTICATED' }, { status: 401 });

  const session = decodeToken(token);
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

  const refreshed: SessionPayload = {
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

  res.cookies.set(COOKIE_NAME, encodeToken(refreshed), {
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

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@phclsuper.com').trim().toLowerCase();
  const adminPassword = (process.env.ADMIN_PASSWORD || 'StrongPass123!').trim();

  if (email !== adminEmail || password !== adminPassword) {
    return NextResponse.json({ ok: false, message: 'Invalid email or password.' }, { status: 401 });
  }

  const now = Date.now();
  const createdSession = createAdminSession({
    email,
    expiresAt: new Date(now + MAX_AGE_SECONDS * 1000).toISOString(),
    idleExpiresAt: new Date(now + IDLE_TIMEOUT_SECONDS * 1000).toISOString(),
  });
  const payload: SessionPayload = {
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

  res.cookies.set(COOKIE_NAME, encodeToken(payload), {
    path: '/',
    maxAge: MAX_AGE_SECONDS,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return res;
}

export async function DELETE(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? decodeToken(token) : null;
  if (session?.sessionId) {
    deleteAdminSession(session.sessionId);
  }
  const res = NextResponse.json({ ok: true, message: 'Logged out successfully.' });
  clearCookie(res);
  return res;
}