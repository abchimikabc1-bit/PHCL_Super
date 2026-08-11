/**
 * Shared admin session verification utility.
 *
 * Uses the canonical `phcl_admin_session` cookie that is set by
 * /api/admin/auth (POST).  Every API route that must be admin-only
 * should call `requireAdminSession(request)` and return 401 when the
 * result is null.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { getAdminSession } from '@/lib/admin-session-store';

export const ADMIN_COOKIE_NAME = 'phcl_admin_session';

type SessionPayload = {
  sessionId: string;
  email: string;
  role: 'admin';
  iat: string;
  exp: string;
  idleExp: string;
};

function getSecret(): string {
  return process.env.ADMIN_SESSION_SECRET?.trim() || 'dev-only-secret-change-in-production';
}

function sign(value: string): string {
  return createHmac('sha256', getSecret()).update(value).digest('base64url');
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

/**
 * Returns the validated session payload when the request carries a valid,
 * unexpired admin session cookie.  Returns `null` when unauthenticated.
 */
export function requireAdminSession(request: NextRequest): SessionPayload | null {
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = decodeToken(token);
  if (!session) return null;

  const now = Date.now();
  const hardExp = Date.parse(session.exp);
  const idleExp = Date.parse(session.idleExp);

  if (Number.isNaN(hardExp) || Number.isNaN(idleExp) || hardExp <= now || idleExp <= now) {
    return null;
  }

  const storedSession = getAdminSession(session.sessionId);
  if (!storedSession) return null;

  return session;
}
