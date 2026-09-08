import 'server-only';

import {
  createHmac,
} from 'node:crypto';

import {
  adminDb,
} from '@/lib/firebase-admin';

const COLLECTION =
  'transfer_rate_limits';

const DEFAULT_WINDOW_SECONDS =
  10 * 60;

const DEFAULT_BLOCK_SECONDS =
  15 * 60;

const DEFAULT_MAX_ACCOUNT_REQUESTS =
  8;

const DEFAULT_MAX_NETWORK_REQUESTS =
  30;

const MAX_KEY_LENGTH =
  512;

type StoredRateLimit = {
  count?: unknown;

  windowStartMs?: unknown;

  blockedUntilMs?: unknown;
};

type EvaluatedBucket = {
  allowed: boolean;

  count: number;

  remaining: number;

  windowStartMs: number;

  resetAtMs: number;

  blockedUntilMs: number;

  retryAfterSeconds: number;
};

export type TransferRateLimitResult = {
  allowed: boolean;

  remaining: number;

  resetAtMs: number;

  retryAfterSeconds: number;
};

function readPositiveIntegerEnv(
  name: string,
  fallback: number,
): number {
  const raw =
    process.env[name];

  const value =
    Number(raw);

  if (
    !raw ||
    !Number.isSafeInteger(
      value,
    ) ||
    value <= 0
  ) {
    return fallback;
  }

  return value;
}

function getTransferRateLimitSecret():
  string {
  const secret =
    process.env
      .TRANSFER_RATE_LIMIT_SECRET
      ?.trim();

  if (!secret) {
    throw new Error(
      'TRANSFER_RATE_LIMIT_SECRET_NOT_CONFIGURED',
    );
  }

  if (
    secret.length < 32
  ) {
    throw new Error(
      'TRANSFER_RATE_LIMIT_SECRET_TOO_SHORT',
    );
  }

  return secret;
}

function normalizeKey(
  value: string,
): string {
  const normalized =
    value
      .trim()
      .slice(
        0,
        MAX_KEY_LENGTH,
      );

  return normalized ||
    'unknown';
}

function createFingerprint(
  scope:
    'account' |
    'network',
  value: string,
): string {
  return createHmac(
    'sha256',
    getTransferRateLimitSecret(),
  )
    .update(
      [
        'phcl_transfer_rate_limit_v1',
        scope,
        normalizeKey(
          value,
        ),
      ].join('|'),
      'utf8',
    )
    .digest('hex');
}

function readSafeInteger(
  value: unknown,
): number {
  return (
    typeof value ===
      'number' &&
    Number.isSafeInteger(
      value,
    ) &&
    value >= 0
  )
    ? value
    : 0;
}

function evaluateBucket(
  stored:
    StoredRateLimit |
    undefined,
  now: number,
  windowMs: number,
  blockMs: number,
  maximumRequests: number,
): EvaluatedBucket {
  const existingCount =
    readSafeInteger(
      stored?.count,
    );

  const existingWindowStart =
    readSafeInteger(
      stored?.windowStartMs,
    );

  const existingBlockedUntil =
    readSafeInteger(
      stored?.blockedUntilMs,
    );

  if (
    existingBlockedUntil >
      now
  ) {
    return {
      allowed: false,

      count:
        existingCount,

      remaining: 0,

      windowStartMs:
        existingWindowStart ||
        now,

      resetAtMs:
        existingBlockedUntil,

      blockedUntilMs:
        existingBlockedUntil,

      retryAfterSeconds:
        Math.max(
          1,
          Math.ceil(
            (
              existingBlockedUntil -
              now
            ) /
              1000,
          ),
        ),
    };
  }

  const windowExpired =
    existingWindowStart <= 0 ||
    now -
      existingWindowStart >=
      windowMs;

  const windowStartMs =
    windowExpired
      ? now
      : existingWindowStart;

  const currentCount =
    windowExpired
      ? 0
      : existingCount;

  const normalResetAt =
    windowStartMs +
    windowMs;

  if (
    currentCount >=
      maximumRequests
  ) {
    const blockedUntilMs =
      now +
      blockMs;

    return {
      allowed: false,

      count:
        currentCount,

      remaining: 0,

      windowStartMs,

      resetAtMs:
        blockedUntilMs,

      blockedUntilMs,

      retryAfterSeconds:
        Math.max(
          1,
          Math.ceil(
            blockMs /
              1000,
          ),
        ),
    };
  }

  const nextCount =
    currentCount +
    1;

  return {
    allowed: true,

    count:
      nextCount,

    remaining:
      Math.max(
        0,
        maximumRequests -
          nextCount,
      ),

    windowStartMs,

    resetAtMs:
      normalResetAt,

    blockedUntilMs: 0,

    retryAfterSeconds: 0,
  };
}

function toStoredDocument(
  bucket:
    EvaluatedBucket,
  now: number,
  windowMs: number,
) {
  const expiryBase =
    Math.max(
      bucket.resetAtMs,
      bucket.blockedUntilMs,
    );

  return {
    count:
      bucket.count,

    windowStartMs:
      bucket.windowStartMs,

    blockedUntilMs:
      bucket.blockedUntilMs,

    updatedAt:
      new Date(
        now,
      ),

    /**
     * Configure Firestore TTL against
     * expiresAt when operational
     * infrastructure is ready.
     */
    expiresAt:
      new Date(
        expiryBase +
          windowMs,
      ),
  };
}

/**
 * Creates a network key without
 * persisting the raw forwarding headers.
 *
 * The value is HMAC-hashed before it
 * becomes a Firestore document ID.
 */
export function getTransferNetworkKey(
  request: Request,
): string {
  const forwardedFor =
    request.headers
      .get('x-forwarded-for')
      ?.trim() ??
    '';

  const realIp =
    request.headers
      .get('x-real-ip')
      ?.trim() ??
    '';

  const forwardedHost =
    request.headers
      .get('x-forwarded-host')
      ?.trim() ??
    '';

  return normalizeKey(
    [
      forwardedFor,
      realIp,
      forwardedHost,
    ].join('|'),
  );
}

/**
 * Atomically consumes both:
 *
 * - a per-account request slot
 * - a per-network request slot
 *
 * No UID, IP address, email, token or
 * Authorization header is stored.
 */
export async function consumeTransferRateLimit(
  uid: string,
  networkKey: string,
  now = Date.now(),
): Promise<TransferRateLimitResult> {
  const cleanUid =
    uid.trim();

  if (
    !cleanUid ||
    cleanUid.length >
      256 ||
    cleanUid.includes(
      '/',
    )
  ) {
    throw new Error(
      'INVALID_TRANSFER_RATE_LIMIT_ACCOUNT',
    );
  }

  const windowSeconds =
    readPositiveIntegerEnv(
      'TRANSFER_RATE_LIMIT_WINDOW_SECONDS',
      DEFAULT_WINDOW_SECONDS,
    );

  const blockSeconds =
    readPositiveIntegerEnv(
      'TRANSFER_RATE_LIMIT_BLOCK_SECONDS',
      DEFAULT_BLOCK_SECONDS,
    );

  const maxAccountRequests =
    readPositiveIntegerEnv(
      'TRANSFER_RATE_LIMIT_MAX_ACCOUNT_REQUESTS',
      DEFAULT_MAX_ACCOUNT_REQUESTS,
    );

  const maxNetworkRequests =
    readPositiveIntegerEnv(
      'TRANSFER_RATE_LIMIT_MAX_NETWORK_REQUESTS',
      DEFAULT_MAX_NETWORK_REQUESTS,
    );

  const windowMs =
    windowSeconds *
    1000;

  const blockMs =
    blockSeconds *
    1000;

  const accountFingerprint =
    createFingerprint(
      'account',
      cleanUid,
    );

  const networkFingerprint =
    createFingerprint(
      'network',
      networkKey,
    );

  const accountRef =
    adminDb
      .collection(
        COLLECTION,
      )
      .doc(
        `account_${accountFingerprint}`,
      );

  const networkRef =
    adminDb
      .collection(
        COLLECTION,
      )
      .doc(
        `network_${networkFingerprint}`,
      );

  return adminDb.runTransaction(
    async (
      transaction,
    ) => {
      /**
       * Firestore transaction reads
       * happen before all writes.
       */
      const [
        accountSnapshot,
        networkSnapshot,
      ] =
        await Promise.all([
          transaction.get(
            accountRef,
          ),

          transaction.get(
            networkRef,
          ),
        ]);

      const accountBucket =
        evaluateBucket(
          accountSnapshot.exists
            ? (
                accountSnapshot.data() as
                  StoredRateLimit
              )
            : undefined,
          now,
          windowMs,
          blockMs,
          maxAccountRequests,
        );

      const networkBucket =
        evaluateBucket(
          networkSnapshot.exists
            ? (
                networkSnapshot.data() as
                  StoredRateLimit
              )
            : undefined,
          now,
          windowMs,
          blockMs,
          maxNetworkRequests,
        );

      transaction.set(
        accountRef,
        toStoredDocument(
          accountBucket,
          now,
          windowMs,
        ),
        {
          merge: true,
        },
      );

      transaction.set(
        networkRef,
        toStoredDocument(
          networkBucket,
          now,
          windowMs,
        ),
        {
          merge: true,
        },
      );

      const allowed =
        accountBucket.allowed &&
        networkBucket.allowed;

      const retryAfterSeconds =
        allowed
          ? 0
          : Math.max(
              accountBucket
                .retryAfterSeconds,
              networkBucket
                .retryAfterSeconds,
              1,
            );

      return {
        allowed,

        remaining:
          allowed
            ? Math.min(
                accountBucket
                  .remaining,
                networkBucket
                  .remaining,
              )
            : 0,

        resetAtMs:
          Math.max(
            accountBucket
              .resetAtMs,
            networkBucket
              .resetAtMs,
          ),

        retryAfterSeconds,
      };
    },
  );
}