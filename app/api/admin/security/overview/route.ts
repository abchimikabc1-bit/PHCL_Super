import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminAuthAuditLogPath,
  getAdminAuthRateLimitPath,
  readAuthAuditEvents,
  readRateLimitEntries,
} from '@/lib/admin-auth-security';
import { ADMIN_RATE_LIMIT_POLICY, requireAdminSession } from '@/lib/admin-security';

export async function GET(request: NextRequest) {
  const auth = requireAdminSession(request);
  if (auth.response) {
    return auth.response;
  }

  const [auditEvents, rateLimitEntries] = await Promise.all([
    readAuthAuditEvents(80),
    readRateLimitEntries(ADMIN_RATE_LIMIT_POLICY),
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
        email: auth.session?.email || 'unknown',
        role: auth.session?.role || 'admin',
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
