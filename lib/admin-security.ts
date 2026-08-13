import { randomBytes, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { AdminSessionRecord } from '@/lib/admin-session-store';
import { getAdminSession } from '@/lib/admin-session-store';
import {
  ADMIN_SESSION_COOKIE_NAME,
  decodeAdminSessionToken,
  isAdminSessionSecretConfigured,
} from '@/lib/admin-session-token';

export const ADMIN_CSRF_COOKIE_NAME = 'admin_csrf';
export const ADMIN_RATE_LIMIT_POLICY = {
  windowMs: 10 * 60 * 1000,
  maxAttempts: 8,
  blockMs: 15 * 60 * 1000,
};

const isProduction = process.env.NODE_ENV === 'production';

const toComparableBuffer = (value: string): Buffer => Buffer.from(value, 'utf8');

export const safeEqualText = (left: string, right: string): boolean => {
  const leftBuffer = toComparableBuffer(left);
  const rightBuffer = toComparableBuffer(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
};

export const getClientIp = (request: NextRequest): string => {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  return request.headers.get('x-real-ip')?.trim() || 'unknown';
};

export const createCsrfToken = (): string => randomBytes(32).toString('hex');

export const applyCsrfCookie = (response: NextResponse, token?: string): string => {
  const value = token || createCsrfToken();
  response.cookies.set(ADMIN_CSRF_COOKIE_NAME, value, {
    path: '/',
    httpOnly: false,
    sameSite: 'strict',
    secure: isProduction,
    maxAge: 60 * 60 * 8,
  });
  return value;
};

export const validateCsrf = (request: NextRequest): boolean => {
  const cookieToken = request.cookies.get(ADMIN_CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get('x-csrf-token')?.trim();
  if (!cookieToken || !headerToken) return false;
  return safeEqualText(cookieToken, headerToken);
};

export const getAdminSessionFromRequest = (request: NextRequest): AdminSessionRecord | null => {
  if (!isAdminSessionSecretConfigured()) return null;

  const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = decodeAdminSessionToken(token);
  if (!payload) return null;

  const session = getAdminSession(payload.sessionId);
  if (!session) return null;

  const now = Date.now();
  const hardExp = Date.parse(session.expiresAt);
  const idleExp = Date.parse(session.idleExpiresAt);
  if (Number.isNaN(hardExp) || Number.isNaN(idleExp) || hardExp <= now || idleExp <= now) {
    return null;
  }

  return session;
};

export const requireAdminSession = (
  request: NextRequest
): { session: AdminSessionRecord | null; response?: NextResponse } => {
  if (!isAdminSessionSecretConfigured()) {
    return {
      session: null,
      response: NextResponse.json(
        { ok: false, code: 'SERVER_MISCONFIGURED', message: 'Admin session secret is not configured.' },
        { status: 503 }
      ),
    };
  }

  const session = getAdminSessionFromRequest(request);
  if (!session) {
    return {
      session: null,
      response: NextResponse.json({ ok: false, code: 'UNAUTHENTICATED', message: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { session };
};
