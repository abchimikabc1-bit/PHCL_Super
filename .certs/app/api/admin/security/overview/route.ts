import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminAuthAuditLogPath,
  getAdminAuthRateLimitPath,
  readAuthAuditEvents,
  readRateLimitEntries,
} from '@/lib/admin-auth-security';

type SessionPayload = {
  sid: string;
  email: string;
  role: 'super_admin' | 'admin' | 'editor';
  name: string;
  iat: number;
  exp: number;
};

const COOKIE_NAME = 'admin_session';
const DEV_SESSION_SECRET = 'phcl_admin_session_secret_dev_only_change_for_production';
const RATE_LIMIT_POLICY = {
  windowMs: 10 * 60 * 1000,
  maxAttempts: 8,
  blockMs: 15 * 60 * 1000,
};

const toBase64Url = (value: Buffer | string) =>
  Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const fromBase64Url = (value: string) => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (padded.length % 4)) % 4;
  return Buffer.from(`${padded}${'='.repeat(padLength)}`, 'base64');
};

const sign = (value: string, sessionSecret: string) =>
  toBase64Url(crypto.createHmac('sha256', sessionSecret).update(value).digest());

const verifyToken = (token: string, sessionSecret: string): SessionPayload | null => {
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) return null;

  const expected = sign(encodedPayload, sessionSecret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload).toString('utf8')) as SessionPayload;
    if (!payload || typeof payload !== 'object') return null;
    if (typeof payload.exp !== 'number' || Date.now() >= payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
};

const requireAdminSession = (request: NextRequest): SessionPayload | null => {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const sessionSecret = process.env.ADMIN_SESSION_SECRET || DEV_SESSION_SECRET;
  return verifyToken(token, sessionSecret);
};

export async function GET(request: NextRequest) {
  const session = requireAdminSession(request);

  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const [auditEvents, rateLimitEntries] = await Promise.all([
    readAuthAuditEvents(80),
    readRateLimitEntries(RATE_LIMIT_POLICY),
  ]);

  const lockouts = rateLimitEntries
    .map((entry) => {
      const key = typeof entry.key === 'string' ? entry.key : '';
      const attempts =
        typeof entry.attempts === 'number' ? entry.attempts : Number(entry.attempts ?? 0);
      const windowStart =
        typeof entry.windowStart === 'number'
          ? entry.windowStart
          : Number(entry.windowStart ?? 0);
      const blockedUntil =
        typeof entry.blockedUntil === 'number'
          ? entry.blockedUntil
          : Number(entry.blockedUntil ?? 0);

      return {
        key,
        attempts,
        windowStart,
        blockedUntil,
        blocked: blockedUntil > Date.now(),
        retryAfterSeconds:
          blockedUntil > Date.now() ? Math.ceil((blockedUntil - Date.now()) / 1000) : 0,
      };
    })
    .sort((a, b) => b.blockedUntil - a.blockedUntil);

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      actor: {
        email: session.email,
        role: session.role,
      },
      summary: {
        auditEventCount: auditEvents.length,
        activeLockouts: lockouts.filter((entry) => entry.blocked).length,
      },
      storage: {
        auditLogPath: getAdminAuthAuditLogPath(),
        rateLimitPath: getAdminAuthRateLimitPath(),
      },
      lockouts,
      auditEvents,
    },
    { status: 200 }
  );
}
