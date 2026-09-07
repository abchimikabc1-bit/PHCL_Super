import 'server-only';

import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

import {
  FieldValue,
} from 'firebase-admin/firestore';

import {
  adminDb,
} from '@/lib/firebase-admin';

export const ADMIN_PHONE_ENROLLMENT_COOKIE =
  'phcl_admin_phone_enrollment';

export const ADMIN_PHONE_ENROLLMENT_MAX_AGE_SECONDS =
  10 * 60;

const COLLECTION =
  'admin_phone_enrollment_security';

const MAX_FAILED_ATTEMPTS =
  5;

type PhoneEnrollmentDocument = {
  email: string;
  firebaseUid: string;
  tokenDigest: string;
  createdAtMs: number;
  expiresAtMs: number;
  failedAttempts: number;
  consumedAtMs: number | null;
  revokedAtMs: number | null;
};

export type AdminPhoneEnrollmentSession = {
  email: string;
  firebaseUid: string;
  expiresAtMs: number;
  failedAttempts: number;
};

function normalizeEmail(
  email: string
): string {
  return email
    .trim()
    .toLowerCase()
    .slice(0, 180);
}

function normalizeFirebaseUid(
  firebaseUid: string
): string {
  return firebaseUid
    .trim()
    .slice(0, 128);
}

function getSecuritySecret():
  string {
  const secret =
    process.env
      .ADMIN_SESSION_SECRET
      ?.trim();

  if (!secret) {
    throw new Error(
      'ADMIN_SESSION_SECRET is not configured.'
    );
  }

  return secret;
}

function createPrincipalId(
  email: string
): string {
  return createHmac(
    'sha256',
    getSecuritySecret()
  )
    .update(
      `phcl-admin-phone-principal:${normalizeEmail(
        email
      )}`
    )
    .digest('hex');
}

function createTokenDigest(
  principalId: string,
  token: string
): string {
  return createHmac(
    'sha256',
    getSecuritySecret()
  )
    .update(
      [
        'phcl-admin-phone-enrollment',
        principalId,
        token,
      ].join(':')
    )
    .digest('base64url');
}

function safeEqual(
  left: string,
  right: string
): boolean {
  const leftBuffer =
    Buffer.from(
      left,
      'utf8'
    );

  const rightBuffer =
    Buffer.from(
      right,
      'utf8'
    );

  if (
    leftBuffer.length !==
    rightBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    leftBuffer,
    rightBuffer
  );
}

function parseSessionId(
  sessionId: string
): {
  principalId: string;
  token: string;
} | null {
  const [
    principalId,
    token,
    extra,
  ] = sessionId.split('.');

  if (
    !principalId ||
    !token ||
    extra !== undefined ||
    !/^[a-f0-9]{64}$/.test(
      principalId
    ) ||
    token.length < 32 ||
    token.length > 100
  ) {
    return null;
  }

  return {
    principalId,
    token,
  };
}

function getDocumentRef(
  principalId: string
) {
  return adminDb
    .collection(
      COLLECTION
    )
    .doc(principalId);
}

function isValidDocument(
  value: unknown
): value is PhoneEnrollmentDocument {
  if (
    typeof value !==
      'object' ||
    value === null
  ) {
    return false;
  }

  const record =
    value as Record<
      string,
      unknown
    >;

  return (
    typeof record.email ===
      'string' &&
    typeof record.firebaseUid ===
      'string' &&
    typeof record.tokenDigest ===
      'string' &&
    typeof record.createdAtMs ===
      'number' &&
    typeof record.expiresAtMs ===
      'number' &&
    typeof record.failedAttempts ===
      'number' &&
    (
      record.consumedAtMs ===
        null ||
      typeof record.consumedAtMs ===
        'number'
    ) &&
    (
      record.revokedAtMs ===
        null ||
      typeof record.revokedAtMs ===
        'number'
    )
  );
}

function validateActiveDocument(
  data: PhoneEnrollmentDocument,
  suppliedDigest: string,
  now: number
): boolean {
  return (
    safeEqual(
      data.tokenDigest,
      suppliedDigest
    ) &&
    data.expiresAtMs > now &&
    data.consumedAtMs === null &&
    data.revokedAtMs === null &&
    data.failedAttempts <
      MAX_FAILED_ATTEMPTS
  );
}

export async function createAdminPhoneEnrollmentSession(
  email: string,
  firebaseUid: string
): Promise<{
  sessionId: string;
  expiresAtMs: number;
}> {
  const normalizedEmail =
    normalizeEmail(email);

  const normalizedUid =
    normalizeFirebaseUid(
      firebaseUid
    );

  if (
    !normalizedEmail ||
    !normalizedUid
  ) {
    throw new Error(
      'Admin email and Firebase UID are required.'
    );
  }

  const principalId =
    createPrincipalId(
      normalizedEmail
    );

  const token =
    randomBytes(32).toString(
      'base64url'
    );

  const tokenDigest =
    createTokenDigest(
      principalId,
      token
    );

  const now =
    Date.now();

  const expiresAtMs =
    now +
    ADMIN_PHONE_ENROLLMENT_MAX_AGE_SECONDS *
      1000;

  await getDocumentRef(
    principalId
  ).set({
    email:
      normalizedEmail,

    firebaseUid:
      normalizedUid,

    tokenDigest,

    createdAtMs:
      now,

    expiresAtMs,

    failedAttempts:
      0,

    consumedAtMs:
      null,

    revokedAtMs:
      null,

    createdAt:
      FieldValue.serverTimestamp(),

    updatedAt:
      FieldValue.serverTimestamp(),
  });

  return {
    sessionId:
      `${principalId}.${token}`,

    expiresAtMs,
  };
}

export async function verifyAdminPhoneEnrollmentSession(
  sessionId:
    string | null | undefined
): Promise<
  AdminPhoneEnrollmentSession | null
> {
  if (!sessionId) {
    return null;
  }

  const parsed =
    parseSessionId(
      sessionId
    );

  if (!parsed) {
    return null;
  }

  const snapshot =
    await getDocumentRef(
      parsed.principalId
    ).get();

  if (!snapshot.exists) {
    return null;
  }

  const data =
    snapshot.data();

  if (!isValidDocument(data)) {
    return null;
  }

  const suppliedDigest =
    createTokenDigest(
      parsed.principalId,
      parsed.token
    );

  if (
    !validateActiveDocument(
      data,
      suppliedDigest,
      Date.now()
    )
  ) {
    return null;
  }

  if (
    createPrincipalId(
      data.email
    ) !==
    parsed.principalId
  ) {
    return null;
  }

  return {
    email:
      data.email,

    firebaseUid:
      data.firebaseUid,

    expiresAtMs:
      data.expiresAtMs,

    failedAttempts:
      data.failedAttempts,
  };
}

export async function recordFailedAdminPhoneEnrollmentAttempt(
  sessionId: string
): Promise<{
  allowed: boolean;
  attempts: number;
}> {
  const parsed =
    parseSessionId(
      sessionId
    );

  if (!parsed) {
    return {
      allowed: false,
      attempts:
        MAX_FAILED_ATTEMPTS,
    };
  }

  const documentRef =
    getDocumentRef(
      parsed.principalId
    );

  const suppliedDigest =
    createTokenDigest(
      parsed.principalId,
      parsed.token
    );

  return adminDb.runTransaction(
    async (transaction) => {
      const snapshot =
        await transaction.get(
          documentRef
        );

      if (!snapshot.exists) {
        return {
          allowed: false,
          attempts:
            MAX_FAILED_ATTEMPTS,
        };
      }

      const data =
        snapshot.data();

      if (
        !isValidDocument(
          data
        ) ||
        !validateActiveDocument(
          data,
          suppliedDigest,
          Date.now()
        )
      ) {
        return {
          allowed: false,
          attempts:
            MAX_FAILED_ATTEMPTS,
        };
      }

      const attempts =
        data.failedAttempts +
        1;

      const shouldRevoke =
        attempts >=
        MAX_FAILED_ATTEMPTS;

      transaction.update(
        documentRef,
        {
          failedAttempts:
            attempts,

          revokedAtMs:
            shouldRevoke
              ? Date.now()
              : null,

          updatedAt:
            FieldValue.serverTimestamp(),
        }
      );

      return {
        allowed:
          !shouldRevoke,

        attempts,
      };
    }
  );
}

export async function consumeAdminPhoneEnrollmentSession(
  sessionId: string
): Promise<
  AdminPhoneEnrollmentSession | null
> {
  const parsed =
    parseSessionId(
      sessionId
    );

  if (!parsed) {
    return null;
  }

  const documentRef =
    getDocumentRef(
      parsed.principalId
    );

  const suppliedDigest =
    createTokenDigest(
      parsed.principalId,
      parsed.token
    );

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
        snapshot.data();

      const now =
        Date.now();

      if (
        !isValidDocument(
          data
        ) ||
        !validateActiveDocument(
          data,
          suppliedDigest,
          now
        ) ||
        createPrincipalId(
          data.email
        ) !==
          parsed.principalId
      ) {
        return null;
      }

      transaction.update(
        documentRef,
        {
          consumedAtMs:
            now,

          updatedAt:
            FieldValue.serverTimestamp(),
        }
      );

      return {
        email:
          data.email,

        firebaseUid:
          data.firebaseUid,

        expiresAtMs:
          data.expiresAtMs,

        failedAttempts:
          data.failedAttempts,
      };
    }
  );
}

export async function revokeAdminPhoneEnrollmentSession(
  sessionId:
    string | null | undefined
): Promise<void> {
  if (!sessionId) {
    return;
  }

  const parsed =
    parseSessionId(
      sessionId
    );

  if (!parsed) {
    return;
  }

  const documentRef =
    getDocumentRef(
      parsed.principalId
    );

  const suppliedDigest =
    createTokenDigest(
      parsed.principalId,
      parsed.token
    );

  await adminDb.runTransaction(
    async (transaction) => {
      const snapshot =
        await transaction.get(
          documentRef
        );

      if (!snapshot.exists) {
        return;
      }

      const data =
        snapshot.data();

      if (
        !isValidDocument(
          data
        ) ||
        !safeEqual(
          data.tokenDigest,
          suppliedDigest
        ) ||
        data.consumedAtMs !==
          null ||
        data.revokedAtMs !==
          null
      ) {
        return;
      }

      transaction.update(
        documentRef,
        {
          revokedAtMs:
            Date.now(),

          updatedAt:
            FieldValue.serverTimestamp(),
        }
      );
    }
  );
}