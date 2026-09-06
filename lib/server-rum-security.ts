import 'server-only';

import {
  createHmac,
} from 'node:crypto';

import {
  adminDb,
} from '@/lib/firebase-admin';

const RUM_RATE_LIMIT_COLLECTION =
  'rum_rate_limits';

const DEFAULT_WINDOW_MS =
  60 * 1000;

const DEFAULT_MAX_REQUESTS =
  60;

const MAX_CLIENT_KEY_LENGTH =
  200;

export type RumRateLimitResult =
  | {
      allowed: true;
      remaining: number;
      resetAt: number;
    }
  | {
      allowed: false;
      remaining: 0;
      resetAt: number;
    };

function readPositiveIntegerEnv(
  name: string,
  fallback: number,
): number {
  const raw =
    process.env[name];

  const parsed =
    Number(raw);

  if (
    !raw ||
    !Number.isSafeInteger(parsed) ||
    parsed <= 0
  ) {
    return fallback;
  }

  return parsed;
}

function getRumRateLimitSecret(): string {
  const secret =
    process.env
      .RUM_RATE_LIMIT_SECRET
      ?.trim();

  if (!secret) {
    throw new Error(
      'RUM_RATE_LIMIT_SECRET_NOT_CONFIGURED',
    );
  }

  if (secret.length < 32) {
    throw new Error(
      'RUM_RATE_LIMIT_SECRET_TOO_SHORT',
    );
  }

  return secret;
}

function normalizeClientKey(
  value: string,
): string {
  const normalized =
    value
      .trim()
      .slice(
        0,
        MAX_CLIENT_KEY_LENGTH,
      );

  return normalized || 'unknown';
}

function createClientFingerprint(
  clientKey: string,
): string {
  return createHmac(
    'sha256',
    getRumRateLimitSecret(),
  )
    .update(
      normalizeClientKey(
        clientKey,
      ),
      'utf8',
    )
    .digest('hex');
}

export async function checkRumRateLimit(
  clientKey: string,
  now = Date.now(),
): Promise<RumRateLimitResult> {
  const windowMs =
    readPositiveIntegerEnv(
      'RUM_RATE_LIMIT_WINDOW_MS',
      DEFAULT_WINDOW_MS,
    );

  const maxRequests =
    readPositiveIntegerEnv(
      'RUM_RATE_LIMIT_MAX_REQUESTS',
      DEFAULT_MAX_REQUESTS,
    );

  const fingerprint =
    createClientFingerprint(
      clientKey,
    );

  const documentReference =
    adminDb
      .collection(
        RUM_RATE_LIMIT_COLLECTION,
      )
      .doc(fingerprint);

  return adminDb.runTransaction(
    async (transaction) => {
      const snapshot =
        await transaction.get(
          documentReference,
        );

      const existing =
        snapshot.exists
          ? snapshot.data()
          : undefined;

      const existingWindowStart =
        typeof existing
          ?.windowStartMs ===
          'number' &&
        Number.isFinite(
          existing.windowStartMs,
        )
          ? existing.windowStartMs
          : 0;

      const existingCount =
        typeof existing?.count ===
          'number' &&
        Number.isSafeInteger(
          existing.count,
        ) &&
        existing.count >= 0
          ? existing.count
          : 0;

      const windowExpired =
        existingWindowStart <= 0 ||
        now - existingWindowStart >=
          windowMs;

      const windowStartMs =
        windowExpired
          ? now
          : existingWindowStart;

      const currentCount =
        windowExpired
          ? 0
          : existingCount;

      const resetAt =
        windowStartMs +
        windowMs;

      if (
        currentCount >=
        maxRequests
      ) {
        transaction.set(
          documentReference,
          {
            windowStartMs,
            count:
              currentCount,
            updatedAt:
              new Date(now),
            expiresAt:
              new Date(
                resetAt +
                  windowMs,
              ),
          },
          {
            merge: true,
          },
        );

        return {
          allowed: false,
          remaining: 0,
          resetAt,
        };
      }

      const nextCount =
        currentCount + 1;

      transaction.set(
        documentReference,
        {
          windowStartMs,
          count: nextCount,
          updatedAt:
            new Date(now),

          /*
           * This field can later be used
           * with Firestore TTL cleanup.
           */
          expiresAt:
            new Date(
              resetAt +
                windowMs,
            ),
        },
        {
          merge: true,
        },
      );

      return {
        allowed: true,
        remaining:
          Math.max(
            0,
            maxRequests -
              nextCount,
          ),
        resetAt,
      };
    },
  );
}