import 'server-only';

import { createHmac } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebase-admin';

const COLLECTION = 'admin_login_security';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const BLOCK_MS = 15 * 60 * 1000;

type LoginSecurityRecord = {
  attempts?: number;
  windowStart?: number;
  blockedUntil?: number;
  lastAttemptAt?: number;
};

export type LoginSecurityStatus = {
  allowed: boolean;
  attempts: number;
  blockedUntil: number;
  retryAfterSeconds: number;
};

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

function normalizeEmail(
  email: string
): string {
  return email
    .trim()
    .toLowerCase()
    .slice(0, 180);
}

export function createLoginFingerprint(
  email: string,
  ipAddress: string
): string {
  return createHmac(
    'sha256',
    getSecuritySecret()
  )
    .update(
      `${normalizeEmail(email)}|${ipAddress}`
    )
    .digest('hex');
}

function getRef(
  fingerprint: string
) {
  return adminDb
    .collection(COLLECTION)
    .doc(fingerprint);
}

export async function checkAdminLoginLimit(
  fingerprint: string
): Promise<LoginSecurityStatus> {
  const now = Date.now();

  const snapshot =
    await getRef(
      fingerprint
    ).get();

  if (!snapshot.exists) {
    return {
      allowed: true,
      attempts: 0,
      blockedUntil: 0,
      retryAfterSeconds: 0,
    };
  }

  const data =
    snapshot.data() as LoginSecurityRecord;

  const attempts =
    Number(
      data.attempts ?? 0
    );

  const blockedUntil =
    Number(
      data.blockedUntil ?? 0
    );

  if (
    blockedUntil > now
  ) {
    return {
      allowed: false,
      attempts,
      blockedUntil,
      retryAfterSeconds:
        Math.ceil(
          (
            blockedUntil -
            now
          ) / 1000
        ),
    };
  }

  return {
    allowed: true,
    attempts,
    blockedUntil: 0,
    retryAfterSeconds: 0,
  };
}

export async function recordFailedAdminLogin(
  fingerprint: string
): Promise<LoginSecurityStatus> {
  const ref =
    getRef(
      fingerprint
    );

  const now =
    Date.now();

  return adminDb.runTransaction(
    async (
      transaction
    ) => {
      const snapshot =
        await transaction.get(
          ref
        );

      const current =
        snapshot.exists
          ? (
              snapshot.data() as
                LoginSecurityRecord
            )
          : {};

      let attempts =
        Number(
          current.attempts ??
            0
        );

      let windowStart =
        Number(
          current.windowStart ??
            now
        );

      let blockedUntil =
        Number(
          current.blockedUntil ??
            0
        );

      if (
        blockedUntil >
        now
      ) {
        return {
          allowed: false,
          attempts,
          blockedUntil,
          retryAfterSeconds:
            Math.ceil(
              (
                blockedUntil -
                now
              ) / 1000
            ),
        };
      }

      if (
        now -
          windowStart >=
        WINDOW_MS
      ) {
        attempts = 0;
        windowStart = now;
        blockedUntil = 0;
      }

      attempts += 1;

      if (
        attempts >=
        MAX_ATTEMPTS
      ) {
        blockedUntil =
          now +
          BLOCK_MS;
      }

      transaction.set(
        ref,
        {
          attempts,
          windowStart,
          blockedUntil,
          lastAttemptAt:
            now,
          updatedAt:
            FieldValue.serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      return {
        allowed:
          blockedUntil <=
          now,

        attempts,

        blockedUntil,

        retryAfterSeconds:
          blockedUntil >
          now
            ? Math.ceil(
                (
                  blockedUntil -
                  now
                ) / 1000
              )
            : 0,
      };
    }
  );
}

export async function clearAdminLoginFailures(
  fingerprint: string
): Promise<void> {
  await getRef(
    fingerprint
  ).delete();
}