import 'server-only';

import {
  createHmac,
  randomUUID,
} from 'node:crypto';

import {
  FieldValue,
} from 'firebase-admin/firestore';

import {
  adminDb,
} from '@/lib/firebase-admin';

const COLLECTION =
  'admin_auth_audit';

export type AdminAuthAuditEvent =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGIN_RATE_LIMITED'
  | 'LOGOUT'
  | 'PHONE_ENROLLMENT_REQUIRED'
  | 'PHONE_ENROLLMENT_STARTED'
  | 'PHONE_VERIFICATION_FAILED'
  | 'PHONE_VERIFIED'
  | 'PHONE_ENROLLMENT_CONSUMED';

export type AdminAuthAuditReason =
  | 'ADMIN_PHONE_NOT_LINKED'
  | 'PHONE_ENROLLMENT_SESSION_CREATED'
  | 'PHONE_ENROLLMENT_SESSION_INVALID'
  | 'PHONE_ID_TOKEN_INVALID'
  | 'PHONE_IDENTITY_MISMATCH'
  | 'PHONE_NUMBER_NOT_VERIFIED'
  | 'PHONE_ENROLLMENT_ATTEMPTS_EXCEEDED'
  | 'PHONE_ENROLLMENT_COMPLETED'
  | 'ADMIN_ACCOUNT_DISABLED'
  | 'ADMIN_EMAIL_NOT_VERIFIED'
  | 'ADMIN_FIREBASE_ACCOUNT_MISMATCH';

type WriteAdminAuthAuditInput = {
  event:
    AdminAuthAuditEvent;

  email?: string;

  ipAddress?: string;

  reason?:
    AdminAuthAuditReason;
};

function getAuditSecret():
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

function normalizeEmail(
  email: string
): string {
  return email
    .trim()
    .toLowerCase()
    .slice(0, 180);
}

function normalizeIpAddress(
  ipAddress: string
): string {
  return (
    ipAddress
      .trim()
      .slice(0, 100) ||
    'unknown'
  );
}

function createAuditFingerprint(
  email: string,
  ipAddress: string
): string {
  return createHmac(
    'sha256',
    getAuditSecret()
  )
    .update(
      [
        'phcl-admin-auth-audit',
        normalizeEmail(
          email
        ),
        normalizeIpAddress(
          ipAddress
        ),
      ].join(':')
    )
    .digest('hex');
}

export async function writeAdminAuthAudit(
  input:
    WriteAdminAuthAuditInput
): Promise<void> {
  const email =
    normalizeEmail(
      input.email ||
        '__unknown_admin__'
    );

  const ipAddress =
    normalizeIpAddress(
      input.ipAddress ||
        'unknown'
    );

  const principalFingerprint =
    createAuditFingerprint(
      email,
      ipAddress
    );

  await adminDb
    .collection(
      COLLECTION
    )
    .doc(
      randomUUID()
    )
    .set({
      event:
        input.event,

      principalFingerprint,

      ...(input.reason
        ? {
            reason:
              input.reason,
          }
        : {}),

      createdAtMs:
        Date.now(),

      createdAt:
        FieldValue.serverTimestamp(),
    });
}