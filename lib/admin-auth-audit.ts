import 'server-only';

import { createHmac, randomUUID } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebase-admin';

const COLLECTION = 'admin_auth_audit';

export type AdminAuthAuditEvent =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGIN_RATE_LIMITED'
  | 'LOGOUT';

type WriteAdminAuthAuditInput = {
  event: AdminAuthAuditEvent;
  email?: string;
  ipAddress?: string;
};

function getAuditSecret(): string {
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

function createAuditFingerprint(
  email: string,
  ipAddress: string
): string {
  return createHmac(
    'sha256',
    getAuditSecret()
  )
    .update(
      `${normalizeEmail(email)}|${ipAddress}`
    )
    .digest('hex');
}

export async function writeAdminAuthAudit(
  input: WriteAdminAuthAuditInput
): Promise<void> {
  const email =
    input.email?.trim().toLowerCase() || '';

  const ipAddress =
    input.ipAddress?.trim().slice(0, 100) ||
    'unknown';

  const principalFingerprint =
    createAuditFingerprint(
      email || '__unknown_admin__',
      ipAddress
    );

  await adminDb
    .collection(COLLECTION)
    .doc(randomUUID())
    .set({
      event: input.event,
      principalFingerprint,
      createdAtMs: Date.now(),
      createdAt:
        FieldValue.serverTimestamp(),
    });
}