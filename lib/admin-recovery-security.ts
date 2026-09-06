import 'server-only';

import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

import {
  FieldValue,
} from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebase-admin';

const RECOVERY_COLLECTION =
  'admin_recovery_security';

const RECOVERY_CODE_COUNT = 10;

const RECOVERY_ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

type StoredRecoveryCode = {
  id: string;
  digest: string;
  usedAtMs: number | null;
};

type RecoveryDocument = {
  adminPrincipalId: string;
  version: number;
  codes: StoredRecoveryCode[];
  createdAtMs: number;
  regeneratedAtMs: number | null;
};

export type RecoveryCodeSummary = {
  total: number;
  remaining: number;
  used: number;
  createdAtMs: number | null;
};

function normalizeEmail(
  email: string
): string {
  return email.trim().toLowerCase();
}

function getRecoverySecret(): string {
  const secret =
    process.env.ADMIN_SESSION_SECRET?.trim();

  if (!secret) {
    throw new Error(
      'ADMIN_SESSION_SECRET is not configured.'
    );
  }

  return secret;
}

function createAdminPrincipalId(
  email: string
): string {
  return createHmac(
    'sha256',
    getRecoverySecret()
  )
    .update(
      `phcl-admin-principal:${normalizeEmail(
        email
      )}`
    )
    .digest('base64url');
}

function createRecoveryDocumentId(
  email: string
): string {
  return createHmac(
    'sha256',
    getRecoverySecret()
  )
    .update(
      `phcl-admin-recovery:${normalizeEmail(
        email
      )}`
    )
    .digest('hex');
}

function normalizeRecoveryCode(
  code: string
): string {
  return code
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/-/g, '');
}

function createRecoveryDigest(
  email: string,
  code: string
): string {
  const principalId =
    createAdminPrincipalId(email);

  const normalizedCode =
    normalizeRecoveryCode(code);

  return createHmac(
    'sha256',
    getRecoverySecret()
  )
    .update(
      [
        'phcl-admin-recovery-code',
        principalId,
        normalizedCode,
      ].join(':')
    )
    .digest('base64url');
}

function safeDigestEqual(
  left: string,
  right: string
): boolean {
  const leftBuffer =
    Buffer.from(left, 'utf8');

  const rightBuffer =
    Buffer.from(right, 'utf8');

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

function generateRandomCharacters(
  length: number
): string {
  const bytes =
    randomBytes(length);

  let output = '';

  for (const byte of bytes) {
    output +=
      RECOVERY_ALPHABET[
        byte %
          RECOVERY_ALPHABET.length
      ];
  }

  return output;
}

function formatRecoveryCode(
  raw: string
): string {
  const groups =
    raw.match(/.{1,4}/g);

  if (!groups) {
    throw new Error(
      'Unable to format recovery code.'
    );
  }

  return `PHCL-${groups.join('-')}`;
}

function createRecoveryCode(): string {
  /*
   * 20 chars from a 32-character alphabet
   * gives approximately 100 bits of entropy.
   */
  const randomPart =
    generateRandomCharacters(20);

  return formatRecoveryCode(
    randomPart
  );
}

function createRecoveryCodeId(): string {
  return randomBytes(12).toString(
    'base64url'
  );
}

export async function generateAdminRecoveryCodes(
  email: string
): Promise<string[]> {
  const normalizedEmail =
    normalizeEmail(email);

  const principalId =
    createAdminPrincipalId(
      normalizedEmail
    );

  const codes = Array.from(
    {
      length: RECOVERY_CODE_COUNT,
    },
    () => createRecoveryCode()
  );

  const storedCodes:
    StoredRecoveryCode[] =
    codes.map((code) => ({
      id: createRecoveryCodeId(),
      digest:
        createRecoveryDigest(
          normalizedEmail,
          code
        ),
      usedAtMs: null,
    }));

  const documentId =
    createRecoveryDocumentId(
      normalizedEmail
    );

  const documentRef = adminDb
    .collection(
      RECOVERY_COLLECTION
    )
    .doc(documentId);

  const existing =
    await documentRef.get();

  const now = Date.now();

  const existingData =
    existing.exists
      ? (existing.data() as
          | RecoveryDocument
          | undefined)
      : undefined;

  const nextVersion =
    typeof existingData?.version ===
      'number'
      ? existingData.version + 1
      : 1;

  await documentRef.set({
    adminPrincipalId:
      principalId,

    version:
      nextVersion,

    codes:
      storedCodes,

    createdAtMs:
      now,

    regeneratedAtMs:
      existing.exists
        ? now
        : null,

    updatedAt:
      FieldValue.serverTimestamp(),

    createdAt:
      FieldValue.serverTimestamp(),
  });

  /*
   * Plaintext codes are returned ONLY
   * to the caller at generation time.
   * Firestore stores only HMAC digests.
   */
  return codes;
}

export async function getAdminRecoveryCodeSummary(
  email: string
): Promise<RecoveryCodeSummary> {
  const documentId =
    createRecoveryDocumentId(email);

  const snapshot = await adminDb
    .collection(
      RECOVERY_COLLECTION
    )
    .doc(documentId)
    .get();

  if (!snapshot.exists) {
    return {
      total: 0,
      remaining: 0,
      used: 0,
      createdAtMs: null,
    };
  }

  const data =
    snapshot.data() as
      | RecoveryDocument
      | undefined;

  if (
    !data ||
    !Array.isArray(data.codes)
  ) {
    return {
      total: 0,
      remaining: 0,
      used: 0,
      createdAtMs: null,
    };
  }

  const total =
    data.codes.length;

  const used =
    data.codes.filter(
      (code) =>
        typeof code.usedAtMs ===
          'number' &&
        code.usedAtMs > 0
    ).length;

  return {
    total,
    used,
    remaining:
      Math.max(0, total - used),
    createdAtMs:
      typeof data.createdAtMs ===
        'number'
        ? data.createdAtMs
        : null,
  };
}

export async function consumeAdminRecoveryCode(
  email: string,
  suppliedCode: string
): Promise<boolean> {
  const normalizedEmail =
    normalizeEmail(email);

  const normalizedCode =
    normalizeRecoveryCode(
      suppliedCode
    );

  if (
    !normalizedCode.startsWith(
      'PHCL'
    ) ||
    normalizedCode.length !== 24
  ) {
    return false;
  }

  const suppliedDigest =
    createRecoveryDigest(
      normalizedEmail,
      suppliedCode
    );

  const documentId =
    createRecoveryDocumentId(
      normalizedEmail
    );

  const documentRef = adminDb
    .collection(
      RECOVERY_COLLECTION
    )
    .doc(documentId);

  return adminDb.runTransaction(
    async (transaction) => {
      const snapshot =
        await transaction.get(
          documentRef
        );

      if (!snapshot.exists) {
        return false;
      }

      const data =
        snapshot.data() as
          | RecoveryDocument
          | undefined;

      if (
        !data ||
        data.adminPrincipalId !==
          createAdminPrincipalId(
            normalizedEmail
          ) ||
        !Array.isArray(data.codes)
      ) {
        return false;
      }

      const codeIndex =
        data.codes.findIndex(
          (storedCode) =>
            storedCode.usedAtMs ===
              null &&
            safeDigestEqual(
              storedCode.digest,
              suppliedDigest
            )
        );

      if (codeIndex < 0) {
        return false;
      }

      const now = Date.now();

      const updatedCodes =
        data.codes.map(
          (
            storedCode,
            index
          ) =>
            index === codeIndex
              ? {
                  ...storedCode,
                  usedAtMs: now,
                }
              : storedCode
        );

      transaction.update(
        documentRef,
        {
          codes:
            updatedCodes,

          lastUsedAtMs:
            now,

          lastUsedAt:
            FieldValue.serverTimestamp(),

          updatedAt:
            FieldValue.serverTimestamp(),
        }
      );

      return true;
    }
  );
}