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
import {
  ADMIN_RATE_LIMIT_POLICY,
  applyCsrfCookie,
  getClientIp,
  safeEqualText,
  validateCsrf,
} from '@/lib/admin-security';
import {
  appendAuthAuditEvent,
  getRateLimitState,
  registerRateLimitResult,
} from '@/lib/admin-auth-security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_AGE_SECONDS = Number(process.env.ADMIN_SESSION_MAX_AGE_SECONDS || 60 * 60 * 8);
const IDLE_TIMEOUT_SECONDS = Number(process.env.ADMIN_SESSION_IDLE_TIMEOUT_SECONDS || 60 * 30);

function withNoStore(response: NextResponse) {
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  return response;
}

function setSessionCookie(res: NextResponse, payload: AdminSessionPayload) {
  res.cookies.set(ADMIN_SESSION_COOKIE_NAME, encodeAdminSessionToken(payload), {
    path: '/',
    maxAge: MAX_AGE_SECONDS,
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });
}

function clearCookie(res: NextResponse) {
  res.cookies.set(ADMIN_SESSION_COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });
}

function getAuditContext(request: NextRequest, email?: string, detail?: string, statusCode = 200) {
  return {
    action: 'admin_auth',
    statusCode,
    ip: getClientIp(request),
    userAgent: request.headers.get('user-agent')?.slice(0, 240) || 'unknown',
    email,
    detail,
    at: new Date().toISOString(),
  };
}

function getRateLimitKey(request: NextRequest, email: string): string {
  return `${getClientIp(request)}:${email || 'unknown'}`;
}

function getCurrentSession(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = decodeAdminSessionToken(token);
  if (!session) return null;

  const storedSession = getAdminSession(session.sessionId);
  if (!storedSession) return null;

  const now = Date.now();
  const hardExp = Date.parse(session.exp);
  const idleExp = Date.parse(session.idleExp);
  if (Number.isNaN(hardExp) || Number.isNaN(idleExp) || hardExp <= now || idleExp <= now) {
    return null;
  }

  return { token: session, storedSession };
}

export async function GET(request: NextRequest) {
  const activeSession = getCurrentSession(request);

  if (!isAdminSessionSecretConfigured()) {
    return withNoStore(
      NextResponse.json(
        { ok: false, authenticated: false, code: 'SERVER_MISCONFIGURED', message: 'Admin session secret is not configured.' },
        { status: 503 }
      )
    );
  }

  if (!activeSession) {
    const res = withNoStore(
      NextResponse.json({ ok: false, authenticated: false, code: 'UNAUTHENTICATED' }, { status: 401 })
    );
    applyCsrfCookie(res, request.cookies.get('admin_csrf')?.value);
    return res;
  }

  const now = Date.now();
  const refreshed: AdminSessionPayload = {
    ...activeSession.token,
    idleExp: new Date(now + IDLE_TIMEOUT_SECONDS * 1000).toISOString(),
  };
  touchAdminSession(activeSession.token.sessionId, refreshed.idleExp);

  const res = withNoStore(
    NextResponse.json({
      ok: true,
      authenticated: true,
      user: {
        id: refreshed.sessionId,
        email: refreshed.email,
        role: 'super_admin',
        name: 'Administrator',
      },
      session: {
        sessionId: refreshed.sessionId,
        email: refreshed.email,
        role: refreshed.role,
        issuedAt: refreshed.iat,
        expiresAt: refreshed.exp,
        idleExpiresAt: refreshed.idleExp,
        ageMs: now - Date.parse(refreshed.iat),
        expiresInMs: Date.parse(refreshed.idleExp) - now,
      },
    })
  );

  setSessionCookie(res, refreshed);
  applyCsrfCookie(res, request.cookies.get('admin_csrf')?.value);
  return res;
}

export async function POST(request: NextRequest) {
  if (!isAdminSessionSecretConfigured()) {
    return withNoStore(
      NextResponse.json(
        { ok: false, authenticated: false, message: 'ADMIN_SESSION_SECRET must be configured before admin login is enabled.' },
        { status: 503 }
      )
    );
  }

  if (!validateCsrf(request)) {
    const res = withNoStore(
      NextResponse.json({ ok: false, authenticated: false, message: 'CSRF validation failed.' }, { status: 403 })
    );
    applyCsrfCookie(res);
    await appendAuthAuditEvent(getAuditContext(request, undefined, 'csrf_validation_failed', 403));
    return res;
  }

  let body: { email?: string; password?: string } = {};
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return withNoStore(
      NextResponse.json({ ok: false, authenticated: false, message: 'Invalid request body.' }, { status: 400 })
    );
  }

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) {
    return withNoStore(
      NextResponse.json({ ok: false, authenticated: false, message: 'Email and password are required.' }, { status: 400 })
    );
  }

  const rateLimitKey = getRateLimitKey(request, email);
  const rateState = await getRateLimitState(rateLimitKey, ADMIN_RATE_LIMIT_POLICY);
  if (rateState.blockedUntil > Date.now()) {
    const retryAfterSeconds = Math.max(1, Math.ceil((rateState.blockedUntil - Date.now()) / 1000));
    await appendAuthAuditEvent(
      getAuditContext(request, email, `rate_limited:${retryAfterSeconds}`, 429)
    );
    return withNoStore(
      NextResponse.json(
        {
          ok: false,
          authenticated: false,
          message: `Too many login attempts. Try again in ${retryAfterSeconds} seconds.`,
          retryAfterSeconds,
        },
        { status: 429 }
      )
    );
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  if (!adminEmail || !adminPassword) {
    return withNoStore(
      NextResponse.json({ ok: false, authenticated: false, message: 'Admin credentials are not configured.' }, { status: 503 })
    );
  }

  const validEmail = safeEqualText(email, adminEmail);
  const validPassword = safeEqualText(password, adminPassword);
  if (!validEmail || !validPassword) {
    const updatedState = await registerRateLimitResult(rateLimitKey, ADMIN_RATE_LIMIT_POLICY, false);
    const retryAfterSeconds =
      updatedState.blockedUntil > Date.now()
        ? Math.max(1, Math.ceil((updatedState.blockedUntil - Date.now()) / 1000))
        : 0;
    await appendAuthAuditEvent(
      getAuditContext(
        request,
        email,
        retryAfterSeconds > 0 ? `invalid_credentials_blocked:${retryAfterSeconds}` : 'invalid_credentials',
        401
      )
    );
    return withNoStore(
      NextResponse.json(
        {
          ok: false,
          authenticated: false,
          message:
            retryAfterSeconds > 0
              ? `Invalid email or password. Login is temporarily blocked for ${retryAfterSeconds} seconds.`
              : 'Invalid email or password.',
        },
        { status: retryAfterSeconds > 0 ? 429 : 401 }
      )
    );
  }

  await registerRateLimitResult(rateLimitKey, ADMIN_RATE_LIMIT_POLICY, true);

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

  await appendAuthAuditEvent(getAuditContext(request, email, 'login_success', 200));

  const res = withNoStore(
    NextResponse.json({
      ok: true,
      authenticated: true,
      message: 'Login successful.',
      user: {
        id: payload.sessionId,
        email: payload.email,
        role: 'super_admin',
        name: 'Administrator',
      },
      session: {
        sessionId: payload.sessionId,
        email: payload.email,
        role: payload.role,
        issuedAt: payload.iat,
        expiresAt: payload.exp,
        idleExpiresAt: payload.idleExp,
        ageMs: 0,
        expiresInMs: IDLE_TIMEOUT_SECONDS * 1000,
      },
    })
  );

  setSessionCookie(res, payload);
  applyCsrfCookie(res, request.cookies.get('admin_csrf')?.value);
  return res;
}

export async function DELETE(request: NextRequest) {
  if (!validateCsrf(request)) {
    const res = withNoStore(
      NextResponse.json({ ok: false, message: 'CSRF validation failed.' }, { status: 403 })
    );
    applyCsrfCookie(res);
    return res;
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  const session = token ? decodeAdminSessionToken(token) : null;
  if (session?.sessionId) {
    deleteAdminSession(session.sessionId);
    await appendAuthAuditEvent(getAuditContext(request, session.email, 'logout', 200));
  }

  const res = withNoStore(NextResponse.json({ ok: true, message: 'Logged out successfully.' }));
  clearCookie(res);
  applyCsrfCookie(res, request.cookies.get('admin_csrf')?.value);
  return res;
}
