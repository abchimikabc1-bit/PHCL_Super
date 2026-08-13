import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminAuthAuditLogPath,
  getAdminAuthRateLimitPath,
  readAuthAuditEvents,
  readRateLimitEntries,
} from '@/lib/admin-auth-security';
import { getAdminSession } from '@/lib/admin-session-store';
import {
  ADMIN_SESSION_COOKIE_NAME,
  decodeAdminSessionToken,
  isAdminSessionSecretConfigured,
} from '@/lib/admin-session-token';
const RATE_LIMIT_POLICY = {
  windowMs: 10 * 60 * 1000,
  maxAttempts: 8,
  blockMs: 15 * 60 * 1000,
};

const requireAdminSession = (request: NextRequest) => {
  if (!isAdminSessionSecretConfigured()) return null;

  const token = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = decodeAdminSessionToken(token);
  if (!session) return null;
  return getAdminSession(session.sessionId);
};

export async function GET(request: NextRequest) {
  if (!isAdminSessionSecretConfigured()) {
    return NextResponse.json({ message: 'Admin session secret is not configured.' }, { status: 503 });
  }

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
