import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  createAdminSession,
  deleteAdminSession,
  getAdminSession,
  touchAdminSession,
} from '@/lib/admin-session-store';
import {
  appendAuthAuditEvent,
  clearAuthRateLimitKey,
  readRateLimitState,
  registerAuthFailure,
} from '@/lib/admin-auth-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'phcl_admin_session';
const MAX_AGE_SECONDS = Number(process.env.ADMIN_SESSION_MAX_AGE_SECONDS || 60 * 60 * 8);
const IDLE_TIMEOUT_SECONDS = Number(process.env.ADMIN_SESSION_IDLE_TIMEOUT_SECONDS || 60 * 30);
const RATE_LIMIT_POLICY = {
  windowMs: 10 * 60 * 1000,
  maxAttempts: 8,
  blockMs: 15 * 60 * 1000,
};

type SessionPayload = {
  sessionId: string;
  email: string;
  role: 'admin';
  iat: string;
  exp: string;
  idleExp: string;
};

function getSecret() {
  const fromEnv = process.env.ADMIN_SESSION_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === 'production') return null;
  return 'dev-only-secret-change-in-production';
}

function sign(value: string) {
  const secret = getSecret();
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET is required in production.');
  }
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function encodeToken(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = sign(body);
  return `${body}.${sig}`;
}

function decodeToken(token: string): SessionPayload | null {
  const secret = getSecret();
  if (!secret) return null;

  const [body, sig] = token.split('.');
  if (!body || !sig) return null;

  const expected = createHmac('sha256', secret).update(body).digest('base64url');
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

function resolveClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

function getAuthKey(ip: string, email: string): string {
  return `${ip}:${email || 'unknown'}`;
}

function getAdminCredentials() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() || '';
  const adminPassword = process.env.ADMIN_PASSWORD?.trim() || '';

  if (process.env.NODE_ENV === 'production' && (!adminEmail || !adminPassword)) {
    return null;
  }

  if (!adminEmail || !adminPassword) {
    return {
      email: 'admin@phclsuper.com',
      password: 'StrongPass123!',
    };
  }

  return {
    email: adminEmail,
    password: adminPassword,
  };
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ ok: false, code: 'UNAUTHENTICATED' }, { status: 401 });

  const session = decodeToken(token);
  if (!session) {
    await appendAuthAuditEvent({
      timestamp: new Date().toISOString(),
      action: 'session_invalid',
      ip: resolveClientIp(request),
      reason: 'invalid-session-token',
    });
    const res = NextResponse.json({ ok: false, code: 'INVALID_SESSION' }, { status: 401 });
    clearCookie(res);
    return res;
  }

  const now = Date.now();
  const hardExp = Date.parse(session.exp);
  const idleExp = Date.parse(session.idleExp);
  const storedSession = getAdminSession(session.sessionId);

  if (!storedSession || Number.isNaN(hardExp) || Number.isNaN(idleExp) || hardExp <= now || idleExp <= now) {
    await appendAuthAuditEvent({
      timestamp: new Date().toISOString(),
      action: 'session_invalid',
      email: session.email,
      ip: resolveClientIp(request),
      sessionId: session.sessionId,
      reason: 'expired-or-missing-session',
    });
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
  const clientIp = resolveClientIp(request);
  const authKey = getAuthKey(clientIp, email);

  const rateLimitState = await readRateLimitState(authKey, RATE_LIMIT_POLICY);
  if (rateLimitState.blocked) {
    await appendAuthAuditEvent({
      timestamp: new Date().toISOString(),
      action: 'login_blocked',
      email,
      ip: clientIp,
      reason: `locked-${rateLimitState.retryAfterSeconds}s`,
    });
    return NextResponse.json(
      {
        ok: false,
        message: `Too many failed attempts. Retry in ${rateLimitState.retryAfterSeconds} seconds.`,
      },
      { status: 429 }
    );
  }

  if (!email || !password) {
    await registerAuthFailure(getAuthKey(clientIp, email || 'missing'), RATE_LIMIT_POLICY);
    await appendAuthAuditEvent({
      timestamp: new Date().toISOString(),
      action: 'login_failed',
      email,
      ip: clientIp,
      reason: 'missing-credentials',
    });
    return NextResponse.json({ ok: false, message: 'Email and password are required.' }, { status: 400 });
  }

  const credentials = getAdminCredentials();
  if (!credentials) {
    await appendAuthAuditEvent({
      timestamp: new Date().toISOString(),
      action: 'config_error',
      email,
      ip: clientIp,
      reason: 'missing-admin-credentials',
    });
    return NextResponse.json(
      { ok: false, message: 'Admin auth is not configured on this environment.' },
      { status: 500 }
    );
  }

  if (email !== credentials.email || password !== credentials.password) {
    const failure = await registerAuthFailure(authKey, RATE_LIMIT_POLICY);
    await appendAuthAuditEvent({
      timestamp: new Date().toISOString(),
      action: 'login_failed',
      email,
      ip: clientIp,
      reason: failure.blocked ? `lockout-${failure.retryAfterSeconds}s` : `attempt-${failure.attempts}`,
    });
    return NextResponse.json({ ok: false, message: 'Invalid email or password.' }, { status: 401 });
  }

  await clearAuthRateLimitKey(authKey);

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

  await appendAuthAuditEvent({
    timestamp: new Date().toISOString(),
    action: 'login_success',
    email,
    ip: clientIp,
    sessionId: payload.sessionId,
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
  const clientIp = resolveClientIp(request);
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? decodeToken(token) : null;
  if (session?.sessionId) {
    deleteAdminSession(session.sessionId);
    await appendAuthAuditEvent({
      timestamp: new Date().toISOString(),
      action: 'logout',
      email: session.email,
      ip: clientIp,
      sessionId: session.sessionId,
    });
  }
  const res = NextResponse.json({ ok: true, message: 'Logged out successfully.' });
  clearCookie(res);
  return res;
}