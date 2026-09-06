import 'server-only';

import { Timestamp } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebase-admin';

type JsonObject = Record<string, unknown>;

type RateLimitPolicy = {
  windowMs: number;
  maxAttempts: number;
  blockMs: number;
};

type LoginSecurityRecord = {
  attempts?: number;
  windowStart?: number;
  blockedUntil?: number;
  lastAttemptAt?: number;
  updatedAt?: Timestamp;
};

type AuthAuditRecord = Record<string, unknown> & {
  createdAt?: Timestamp;
  createdAtMs?: number;
};

const LOGIN_SECURITY_COLLECTION =
  'admin_login_security';

const AUTH_AUDIT_COLLECTION =
  'admin_auth_audit';

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

function normalizeLimit(
  value: number
): number {
  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return DEFAULT_LIMIT;
  }

  return Math.min(
    Math.floor(value),
    MAX_LIMIT
  );
}

function toSafeNumber(
  value: unknown
): number {
  const numberValue =
    typeof value === 'number'
      ? value
      : Number(value ?? 0);

  return Number.isFinite(numberValue)
    ? numberValue
    : 0;
}

function timestampToMillis(
  value: unknown
): number {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }

  return 0;
}

export async function readAuthAuditEvents(
  limit = DEFAULT_LIMIT
): Promise<JsonObject[]> {
  const safeLimit =
    normalizeLimit(limit);

  try {
    const snapshot =
      await adminDb
        .collection(
          AUTH_AUDIT_COLLECTION
        )
        .orderBy(
          'createdAt',
          'desc'
        )
        .limit(
          safeLimit
        )
        .get();

    return snapshot.docs.map(
      (document) => {
        const data =
          document.data() as AuthAuditRecord;

        const createdAtMs =
          toSafeNumber(
            data.createdAtMs
          ) ||
          timestampToMillis(
            data.createdAt
          );

        const safeEvent: JsonObject = {
          ...data,
        };

        delete safeEvent.createdAt;

        if (createdAtMs > 0) {
          safeEvent.createdAtMs =
            createdAtMs;

          safeEvent.createdAt =
            new Date(
              createdAtMs
            ).toISOString();
        }

        return safeEvent;
      }
    );
  } catch (error) {
    console.error(
      'Unable to read Admin authentication audit events:',
      error
    );

    return [];
  }
}

export async function readRateLimitEntries(
  limitOrPolicy:
    | number
    | RateLimitPolicy =
    DEFAULT_LIMIT
): Promise<JsonObject[]> {
  const limit =
    normalizeLimit(
      typeof limitOrPolicy ===
        'number'
        ? limitOrPolicy
        : DEFAULT_LIMIT
    );

  try {
    const snapshot =
      await adminDb
        .collection(
          LOGIN_SECURITY_COLLECTION
        )
        .orderBy(
          'lastAttemptAt',
          'desc'
        )
        .limit(
          limit
        )
        .get();

    return snapshot.docs.map(
      (document) => {
        const data =
          document.data() as LoginSecurityRecord;

        const attempts =
          toSafeNumber(
            data.attempts
          );

        const windowStart =
          toSafeNumber(
            data.windowStart
          );

        const blockedUntil =
          toSafeNumber(
            data.blockedUntil
          );

        const lastAttemptAt =
          toSafeNumber(
            data.lastAttemptAt
          );

        const updatedAtMs =
          timestampToMillis(
            data.updatedAt
          );

        return {
          attempts,
          windowStart,
          blockedUntil,
          lastAttemptAt,
          updatedAtMs,
        };
      }
    );
  } catch (error) {
    console.error(
      'Unable to read Admin login rate-limit records:',
      error
    );

    return [];
  }
}