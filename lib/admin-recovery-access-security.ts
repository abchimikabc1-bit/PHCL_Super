import 'server-only';

import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

import {
  FieldValue,
  Timestamp,
} from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebase-admin';

const RECOVERY_RATE_LIMIT_COLLECTION =
  'admin_recovery_rate_limits';

const RECOVERY_ACCESS_COLLECTION =
  'admin_recovery_access_sessions';

const RECOVERY_AUDIT_COLLECTION =
  'admin_recovery_audit';

const ATTEMPT_WINDOW_MS =
  15 * 60 * 1000;

const BLOCK_DURATION_MS =
  30 * 60 * 1000;

const MAX_ATTEMPTS = 5;

const RECOVERY_ACCESS_TTL_MS =
  10 * 60 * 1000;

type RecoveryRateLimitDocument = {
  attempts: number;
  windowStartedAtMs: number;
  blockedUntilMs: number | null;
};

type RecoveryAccessDocument = {
  adminEmail: string;
  adminPrincipalId: string;
  tokenDigest: string;
  createdAtMs: number;
  expiresAtMs: number;
  usedAtMs: number | null;
  revokedAtMs: number | null;
};

export type RecoveryRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export type RecoveryAccessSession = {
  email: string;
  sessionId: string;
  expiresAtMs: number;
};

function normalizeEmail(
  email: string
): string {
  return email.trim().toLowerCase();
}

function getSecuritySecret(): string {
  const secret =
    process.env.ADMIN_SESSION_SECRET?.trim();

  if (!secret) {
    throw new Error(
      'ADMIN_SESSION_SECRET is not configured.'
    );
  }

  return secret;
}

function hmac(
  value: string
): string {
  return createHmac(
    'sha256',
    getSecuritySecret()
  )
    .update(value)
    .digest('base64url');
}

function safeEqual(
  left: string,
  right: string
): boolean {
  const leftBytes =
    Buffer.from(left, 'utf8');

  const rightBytes =
    Buffer.from(right, 'utf8');

  if (
    leftBytes.length !==
    rightBytes.length
  ) {
    return false;
  }

  return timingSafeEqual(
    leftBytes,
    rightBytes
  );
}

function createAdminPrincipalId(
  email: string
): string {
  return hmac(
    `phcl-admin-principal:${normalizeEmail(
      email
    )}`
  );
}

export function createRecoveryFingerprint(
  email: string,
  ipAddress: string
): string {
  const normalizedEmail =
    normalizeEmail(email);

  const normalizedIp =
    ipAddress.trim() || 'unknown';

  return hmac(
    [
      'phcl-admin-recovery-attempt',
      normalizedEmail,
      normalizedIp,
    ].join(':')
  );
}

function createRateLimitDocumentId(
  fingerprint: string
): string {
  return hmac(
    `phcl-admin-recovery-rate:${fingerprint}`
  );
}

function createRecoverySessionDocumentId(
  rawToken: string
): string {
  return hmac(
    `phcl-admin-recovery-session-id:${rawToken}`
  );
}

function createRecoveryTokenDigest(
  rawToken: string
): string {
  return hmac(
    `phcl-admin-recovery-session-token:${rawToken}`
  );
}

export async function checkAdminRecoveryLimit(
  fingerprint: string
): Promise<RecoveryRateLimitResult> {
  const documentId =
    createRateLimitDocumentId(
      fingerprint
    );

  const documentRef = adminDb
    .collection(
      RECOVERY_RATE_LIMIT_COLLECTION
    )
    .doc(documentId);

  return adminDb.runTransaction(
    async (transaction) => {
      const snapshot =
        await transaction.get(
          documentRef
        );

      if (!snapshot.exists) {
        return {
          allowed: true,
          retryAfterSeconds: 0,
        };
      }

      const data =
        snapshot.data() as
          | RecoveryRateLimitDocument
          | undefined;

      if (!data) {
        return {
          allowed: true,
          retryAfterSeconds: 0,
        };
      }

      const now = Date.now();

      if (
        typeof data.blockedUntilMs ===
          'number' &&
        data.blockedUntilMs > now
      ) {
        return {
          allowed: false,

          retryAfterSeconds:
            Math.max(
              1,
              Math.ceil(
                (
                  data.blockedUntilMs -
                  now
                ) / 1000
              )
            ),
        };
      }

      if (
        now -
          data.windowStartedAtMs >=
        ATTEMPT_WINDOW_MS
      ) {
        transaction.delete(
          documentRef
        );

        return {
          allowed: true,
          retryAfterSeconds: 0,
        };
      }

      if (
        data.attempts >=
        MAX_ATTEMPTS
      ) {
        const blockedUntilMs =
          now +
          BLOCK_DURATION_MS;

        transaction.set(
          documentRef,
          {
            ...data,
            blockedUntilMs,

            updatedAt:
              FieldValue.serverTimestamp(),

            blockedUntil:
              Timestamp.fromMillis(
                blockedUntilMs
              ),
          },
          {
            merge: true,
          }
        );

        return {
          allowed: false,

          retryAfterSeconds:
            Math.ceil(
              BLOCK_DURATION_MS /
                1000
            ),
        };
      }

      return {
        allowed: true,
        retryAfterSeconds: 0,
      };
    }
  );
}

export async function recordFailedAdminRecoveryAttempt(
  fingerprint: string
): Promise<void> {
  const documentId =
    createRateLimitDocumentId(
      fingerprint
    );

  const documentRef = adminDb
    .collection(
      RECOVERY_RATE_LIMIT_COLLECTION
    )
    .doc(documentId);

  await adminDb.runTransaction(
    async (transaction) => {
      const snapshot =
        await transaction.get(
          documentRef
        );

      const now = Date.now();

      if (!snapshot.exists) {
        transaction.set(
          documentRef,
          {
            attempts: 1,

            windowStartedAtMs:
              now,

            blockedUntilMs:
              null,

            createdAt:
              FieldValue.serverTimestamp(),

            updatedAt:
              FieldValue.serverTimestamp(),
          }
        );

        return;
      }

      const data =
        snapshot.data() as
          | RecoveryRateLimitDocument
          | undefined;

      if (
        !data ||
        now -
          data.windowStartedAtMs >=
          ATTEMPT_WINDOW_MS
      ) {
        transaction.set(
          documentRef,
          {
            attempts: 1,

            windowStartedAtMs:
              now,

            blockedUntilMs:
              null,

            updatedAt:
              FieldValue.serverTimestamp(),
          },
          {
            merge: true,
          }
        );

        return;
      }

      const nextAttempts =
        Math.max(
          0,
          data.attempts
        ) + 1;

      const shouldBlock =
        nextAttempts >=
        MAX_ATTEMPTS;

      const blockedUntilMs =
        shouldBlock
          ? now +
            BLOCK_DURATION_MS
          : data.blockedUntilMs ??
            null;

      transaction.set(
        documentRef,
        {
          attempts:
            nextAttempts,

          blockedUntilMs,

          updatedAt:
            FieldValue.serverTimestamp(),

          ...(blockedUntilMs
            ? {
                blockedUntil:
                  Timestamp.fromMillis(
                    blockedUntilMs
                  ),
              }
            : {}),
        },
        {
          merge: true,
        }
      );
    }
  );
}

export async function clearAdminRecoveryFailures(
  fingerprint: string
): Promise<void> {
  const documentId =
    createRateLimitDocumentId(
      fingerprint
    );

  await adminDb
    .collection(
      RECOVERY_RATE_LIMIT_COLLECTION
    )
    .doc(documentId)
    .delete()
    .catch(() => {
      /*
       * Clearing rate-limit state after a
       * successful recovery should not
       * invalidate the successful recovery.
       */
    });
}

export async function createAdminRecoveryAccessSession(
  email: string
): Promise<RecoveryAccessSession> {
  const normalizedEmail =
    normalizeEmail(email);

  const rawToken =
    randomBytes(32).toString(
      'base64url'
    );

  const sessionId =
    createRecoverySessionDocumentId(
      rawToken
    );

  const tokenDigest =
    createRecoveryTokenDigest(
      rawToken
    );

  const now = Date.now();

  const expiresAtMs =
    now +
    RECOVERY_ACCESS_TTL_MS;

  await adminDb
    .collection(
      RECOVERY_ACCESS_COLLECTION
    )
    .doc(sessionId)
    .create({
      adminEmail:
        normalizedEmail,

      adminPrincipalId:
        createAdminPrincipalId(
          normalizedEmail
        ),

      tokenDigest,

      createdAtMs:
        now,

      expiresAtMs,

      usedAtMs:
        null,

      revokedAtMs:
        null,

      createdAt:
        FieldValue.serverTimestamp(),

      expiresAt:
        Timestamp.fromMillis(
          expiresAtMs
        ),
    });

  return {
    email:
      normalizedEmail,

    /*
     * Cookie receives the raw random token.
     * Firestore receives only its digest.
     */
    sessionId:
      rawToken,

    expiresAtMs,
  };
}

export async function verifyAdminRecoveryAccessSession(
  rawToken:
    | string
    | undefined
    | null
): Promise<{
  email: string;
  expiresAtMs: number;
} | null> {
  if (!rawToken) {
    return null;
  }

  const sessionId =
    createRecoverySessionDocumentId(
      rawToken
    );

  const snapshot = await adminDb
    .collection(
      RECOVERY_ACCESS_COLLECTION
    )
    .doc(sessionId)
    .get();

  if (!snapshot.exists) {
    return null;
  }

  const data =
    snapshot.data() as
      | RecoveryAccessDocument
      | undefined;

  if (!data) {
    return null;
  }

  const now = Date.now();

  if (
    typeof data.adminEmail !==
      'string' ||
    typeof data.tokenDigest !==
      'string' ||
    typeof data.expiresAtMs !==
      'number' ||
    data.expiresAtMs <= now ||
    data.usedAtMs !== null ||
    data.revokedAtMs !== null
  ) {
    return null;
  }

  const suppliedDigest =
    createRecoveryTokenDigest(
      rawToken
    );

  if (
    !safeEqual(
      suppliedDigest,
      data.tokenDigest
    )
  ) {
    return null;
  }

  if (
    data.adminPrincipalId !==
    createAdminPrincipalId(
      data.adminEmail
    )
  ) {
    return null;
  }

  return {
    email:
      normalizeEmail(
        data.adminEmail
      ),

    expiresAtMs:
      data.expiresAtMs,
  };
}

export async function consumeAdminRecoveryAccessSession(
  rawToken: string
): Promise<{
  email: string;
} | null> {
  if (!rawToken) {
    return null;
  }

  const sessionId =
    createRecoverySessionDocumentId(
      rawToken
    );

  const documentRef = adminDb
    .collection(
      RECOVERY_ACCESS_COLLECTION
    )
    .doc(sessionId);

  return adminDb.runTransaction(
    async (transaction) => {
      const snapshot =
        await transaction.get(
          documentRef
        );

      if (!snapshot.exists) {
        return null;
      }

      const data =
        snapshot.data() as
          | RecoveryAccessDocument
          | undefined;

      if (!data) {
        return null;
      }

      const now =
        Date.now();

      if (
        typeof data.adminEmail !==
          'string' ||
        typeof data.tokenDigest !==
          'string' ||
        typeof data.expiresAtMs !==
          'number' ||
        data.expiresAtMs <= now ||
        data.usedAtMs !== null ||
        data.revokedAtMs !== null
      ) {
        return null;
      }

      const suppliedDigest =
        createRecoveryTokenDigest(
          rawToken
        );

      if (
        !safeEqual(
          suppliedDigest,
          data.tokenDigest
        )
      ) {
        return null;
      }

      if (
        data.adminPrincipalId !==
        createAdminPrincipalId(
          data.adminEmail
        )
      ) {
        return null;
      }

      transaction.update(
        documentRef,
        {
          usedAtMs:
            now,

          usedAt:
            FieldValue.serverTimestamp(),

          updatedAt:
            FieldValue.serverTimestamp(),
        }
      );

      return {
        email:
          normalizeEmail(
            data.adminEmail
          ),
      };
    }
  );
}

export async function revokeAdminRecoveryAccessSession(
  rawToken: string
): Promise<void> {
  if (!rawToken) {
    return;
  }

  const sessionId =
    createRecoverySessionDocumentId(
      rawToken
    );

  const documentRef = adminDb
    .collection(
      RECOVERY_ACCESS_COLLECTION
    )
    .doc(sessionId);

  const snapshot =
    await documentRef.get();

  if (!snapshot.exists) {
    return;
  }

  const now =
    Date.now();

  await documentRef.set(
    {
      revokedAtMs:
        now,

      revokedAt:
        FieldValue.serverTimestamp(),

      updatedAt:
        FieldValue.serverTimestamp(),
    },
    {
      merge: true,
    }
  );
}

export async function writeAdminRecoveryAudit(
  event:
    | 'recovery_attempt'
    | 'recovery_failed'
    | 'recovery_rate_limited'
    | 'recovery_code_accepted'
    | 'recovery_session_created'
    | 'recovery_session_used'
    | 'recovery_session_revoked'
    | 'recovery_device_registered',
  details?: {
    email?: string;
    ipAddress?: string;
    success?: boolean;
    reason?: string;
  }
): Promise<void> {
  const normalizedEmail =
    details?.email
      ? normalizeEmail(
          details.email
        )
      : null;

  const adminPrincipalId =
    normalizedEmail
      ? createAdminPrincipalId(
          normalizedEmail
        )
      : null;

  const ipFingerprint =
    details?.ipAddress
      ? hmac(
          `phcl-admin-recovery-ip:${details.ipAddress.trim()}`
        )
      : null;

  await adminDb
    .collection(
      RECOVERY_AUDIT_COLLECTION
    )
    .add({
      event,

      adminPrincipalId,

      /*
       * Do not store raw recovery codes,
       * passwords or raw IP addresses here.
       */
      ipFingerprint,

      success:
        details?.success ??
        null,

      reason:
        details?.reason ??
        null,

      occurredAtMs:
        Date.now(),

      occurredAt:
        FieldValue.serverTimestamp(),
    });
}