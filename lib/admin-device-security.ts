import 'server-only';

import { createHmac } from 'node:crypto';

import {
  FieldValue,
  Timestamp,
  type DocumentReference,
} from 'firebase-admin/firestore';

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  type RegistrationResponseJSON,
  type WebAuthnCredential,
} from '@simplewebauthn/server';

import { isoUint8Array } from '@simplewebauthn/server/helpers';

import { adminDb } from '@/lib/firebase-admin';

const TRUSTED_DEVICES_COLLECTION =
  'trusted_admin_devices';

const CHALLENGES_COLLECTION =
  'admin_webauthn_challenges';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

const RP_NAME =
  process.env.ADMIN_WEBAUTHN_RP_NAME?.trim() ||
  'PHCL Super Admin';

function getSessionSecret(): string {
  const secret =
    process.env.ADMIN_SESSION_SECRET?.trim();

  if (!secret) {
    throw new Error(
      'ADMIN_SESSION_SECRET is not configured.'
    );
  }

  return secret;
}

function getRpConfig() {
  const configuredRpID =
    process.env.ADMIN_WEBAUTHN_RP_ID?.trim();

  const configuredOrigin =
    process.env.ADMIN_WEBAUTHN_ORIGIN?.trim();

  if (configuredRpID && configuredOrigin) {
    return {
      rpID: configuredRpID,
      origin: configuredOrigin,
    };
  }

  if (process.env.NODE_ENV !== 'production') {
    return {
      rpID: 'localhost',
      origin: 'http://localhost:3000',
    };
  }

  return {
    rpID: 'phclsuper.com',
    origin: 'https://www.phclsuper.com',
  };
}

function createAdminPrincipalId(
  email: string
): string {
  return createHmac(
    'sha256',
    getSessionSecret()
  )
    .update(
      `phcl-admin-principal:${email
        .trim()
        .toLowerCase()}`
    )
    .digest('base64url');
}

function getChallengeDocumentId(
  email: string
): string {
  return createHmac(
    'sha256',
    getSessionSecret()
  )
    .update(
      `registration-challenge:${email
        .trim()
        .toLowerCase()}`
    )
    .digest('hex');
}

type StoredChallenge = {
  challenge: string;
  adminPrincipalId: string;
  createdAtMs: number;
  expiresAtMs: number;
  purpose:
    | 'register-device'
    | 'recovery-register-device';
  state: 'pending' | 'reserved';
};

export type TrustedAdminDevice = {
  id: string;
  adminPrincipalId: string;
  credentialID: string;
  credentialPublicKey: string;
  counter: number;
  transports: string[];
  deviceType: string;
  backedUp: boolean;
  label: string;
  createdAtMs: number;
  lastUsedAtMs: number | null;
  revokedAtMs: number | null;
};

function credentialPublicKeyToBase64(
  publicKey: Uint8Array
): string {
  return Buffer.from(publicKey).toString(
    'base64url'
  );
}

function getCredentialDocumentId(
  credentialID: string
): string {
  return createHmac(
    'sha256',
    getSessionSecret()
  )
    .update(
      `phcl-admin-webauthn-credential:${credentialID}`
    )
    .digest('hex');
}

async function reserveRegistrationChallenge(
  email: string,
  expectedPurpose: StoredChallenge['purpose']
): Promise<{
  challenge: StoredChallenge;
  challengeRef: DocumentReference;
}> {
  const normalizedEmail =
    email.trim().toLowerCase();

  const challengeRef = adminDb
    .collection(CHALLENGES_COLLECTION)
    .doc(
      getChallengeDocumentId(
        normalizedEmail
      )
    );

  const expectedPrincipalId =
    createAdminPrincipalId(
      normalizedEmail
    );

  const challenge =
    await adminDb.runTransaction(
      async (transaction) => {
        const snapshot =
          await transaction.get(
            challengeRef
          );

        if (!snapshot.exists) {
          throw new Error(
            'REGISTRATION_CHALLENGE_NOT_FOUND'
          );
        }

        const data =
          snapshot.data() as
            | Partial<StoredChallenge>
            | undefined;

        if (
          !data ||
          data.purpose !==
            expectedPurpose ||
          data.state !== 'pending' ||
          typeof data.challenge !==
            'string' ||
          !data.challenge ||
          data.adminPrincipalId !==
            expectedPrincipalId ||
          typeof data.createdAtMs !==
            'number' ||
          typeof data.expiresAtMs !==
            'number' ||
          data.expiresAtMs <=
            Date.now()
        ) {
          throw new Error(
            'REGISTRATION_CHALLENGE_INVALID'
          );
        }

        transaction.update(
          challengeRef,
          {
            state: 'reserved',
            reservedAtMs:
              Date.now(),
            reservedAt:
              FieldValue.serverTimestamp(),
          }
        );

        return data as StoredChallenge;
      }
    );

  return {
    challenge,
    challengeRef,
  };
}

export function credentialPublicKeyFromBase64(
  value: string
): Uint8Array<ArrayBuffer> {
  const bytes = Buffer.from(
    value,
    'base64url'
  );

  return Uint8Array.from(bytes);
}

export async function getActiveTrustedDevices(
  email: string
): Promise<TrustedAdminDevice[]> {
  const adminPrincipalId =
    createAdminPrincipalId(email);

  const snapshot = await adminDb
    .collection(TRUSTED_DEVICES_COLLECTION)
    .where(
      'adminPrincipalId',
      '==',
      adminPrincipalId
    )
    .get();

  return snapshot.docs
    .map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        adminPrincipalId:
          String(data.adminPrincipalId || ''),
        credentialID:
          String(data.credentialID || ''),
        credentialPublicKey:
          String(data.credentialPublicKey || ''),
        counter: Number(data.counter || 0),
        transports: Array.isArray(
          data.transports
        )
          ? data.transports.map(String)
          : [],
        deviceType:
          String(data.deviceType || ''),
        backedUp:
          Boolean(data.backedUp),
        label:
          String(data.label || 'Admin Device'),
        createdAtMs:
          Number(data.createdAtMs || 0),
        lastUsedAtMs:
          data.lastUsedAtMs == null
            ? null
            : Number(data.lastUsedAtMs),
        revokedAtMs:
          data.revokedAtMs == null
            ? null
            : Number(data.revokedAtMs),
      };
    })
    .filter(
      (device) =>
        device.revokedAtMs === null &&
        Boolean(device.credentialID)
    );
}

export async function createAdminDeviceRegistrationOptions(
  email: string
) {
  const normalizedEmail =
    email.trim().toLowerCase();

  const existingDevices =
    await getActiveTrustedDevices(
      normalizedEmail
    );

  /*
   * Bootstrap policy:
   * The first trusted device may be enrolled using
   * an already-authenticated Admin session.
   *
   * Once a trusted device exists, this bootstrap
   * registration path is closed. Future devices
   * must use trusted-device verification or the
   * recovery flow.
   */
  if (existingDevices.length > 0) {
    throw new Error(
      'TRUSTED_DEVICE_ALREADY_EXISTS'
    );
  }

  const adminPrincipalId =
    createAdminPrincipalId(normalizedEmail);

  const { rpID } = getRpConfig();

  const options =
    await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID,
      userName: 'PHCL Super Administrator',
      userDisplayName:
        'PHCL Super Administrator',
      userID:
        isoUint8Array.fromUTF8String(
          adminPrincipalId
        ),
      attestationType: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'preferred',
        userVerification: 'required',
      },
      excludeCredentials:
        existingDevices.map((device) => ({
          id: device.credentialID,
          transports:
            device.transports as WebAuthnCredential['transports'],
        })),
    });

  const now = Date.now();

  const challenge: StoredChallenge = {
    challenge: options.challenge,
    adminPrincipalId,
    createdAtMs: now,
    expiresAtMs:
      now + CHALLENGE_TTL_MS,
    purpose: 'register-device',
    state: 'pending',
  };

  const challengeId =
    getChallengeDocumentId(
      normalizedEmail
    );

  await adminDb
    .collection(CHALLENGES_COLLECTION)
    .doc(challengeId)
    .set({
      ...challenge,
      createdAt:
        FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(
        challenge.expiresAtMs
      ),
    });

  return options;
}

export async function verifyAdminDeviceRegistration(
  email: string,
  response: RegistrationResponseJSON,
  label = 'Primary Admin Device'
) {
  const normalizedEmail =
    email.trim().toLowerCase();

  /*
   * Re-check bootstrap state during verification.
   * This closes a race where two registration
   * ceremonies are attempted simultaneously.
   */
  const existingDevices =
    await getActiveTrustedDevices(
      normalizedEmail
    );

  if (existingDevices.length > 0) {
    throw new Error(
      'TRUSTED_DEVICE_ALREADY_EXISTS'
    );
  }

  const {
    challenge: stored,
    challengeRef,
  } = await reserveRegistrationChallenge(
    normalizedEmail,
    'register-device'
  );

  const expectedPrincipalId =
    createAdminPrincipalId(
      normalizedEmail
    );

  if (
    stored.adminPrincipalId !==
    expectedPrincipalId
  ) {
    throw new Error(
      'REGISTRATION_PRINCIPAL_MISMATCH'
    );
  }

  const { rpID, origin } =
    getRpConfig();

  const verification =
    await verifyRegistrationResponse({
      response,
      expectedChallenge:
        stored.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

  if (
    !verification.verified ||
    !verification.registrationInfo
  ) {
    throw new Error(
      'DEVICE_REGISTRATION_FAILED'
    );
  }

  const {
    credential,
    credentialDeviceType,
    credentialBackedUp,
  } = verification.registrationInfo;

  const deviceId =
    getCredentialDocumentId(
      credential.id
    );
  const now = Date.now();

  /*
   * WebAuthn private keys never reach PHCL.
   * Only the public credential is stored here.
   */
  const deviceRef = adminDb
    .collection(TRUSTED_DEVICES_COLLECTION)
    .doc(deviceId);

  const batch = adminDb.batch();

  batch.create(deviceRef, {
      adminPrincipalId:
        expectedPrincipalId,
      credentialID:
        credential.id,
      credentialPublicKey:
        credentialPublicKeyToBase64(
          credential.publicKey
        ),
      counter:
        credential.counter,
      transports:
        credential.transports ?? [],
      deviceType:
        credentialDeviceType,
      backedUp:
        credentialBackedUp,
      label:
        label
          .trim()
          .slice(0, 80) ||
        'Primary Admin Device',
      createdAtMs: now,
      lastUsedAtMs: null,
      revokedAtMs: null,
      createdAt:
        FieldValue.serverTimestamp(),
      updatedAt:
        FieldValue.serverTimestamp(),
  });

  batch.delete(challengeRef);

  await batch.commit();

  return {
    verified: true,
    deviceId,
    deviceType:
      credentialDeviceType,
    backedUp:
      credentialBackedUp,
  };
}

export async function createRecoveryDeviceRegistrationOptions(
  email: string
) {
  const normalizedEmail =
    email.trim().toLowerCase();

  const adminPrincipalId =
    createAdminPrincipalId(
      normalizedEmail
    );

  const { rpID } = getRpConfig();

  /*
   * Emergency replacement deliberately does NOT
   * send excludeCredentials.
   *
   * The current platform authenticator may already
   * contain the credential being replaced. Sending
   * that credential in excludeCredentials causes
   * Windows Hello to reject the recovery ceremony
   * with "The authenticator was previously
   * registered".
   *
   * Recovery is already gated by the separate
   * password + one-time recovery-code authorization.
   * The newly created credential is verified below,
   * and the replacement flow later revokes all older
   * trusted devices and trusted-device sessions.
   */
  const options =
    await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID,
      userName:
        'PHCL Super Administrator',
      userDisplayName:
        'PHCL Super Administrator',
      userID:
        isoUint8Array.fromUTF8String(
          adminPrincipalId
        ),
      attestationType:
        'none',
      authenticatorSelection: {
        authenticatorAttachment:
          'platform',
        residentKey:
          'preferred',
        userVerification:
          'required',
      },
    });

  const now = Date.now();

  const challengeId =
    getChallengeDocumentId(
      normalizedEmail
    );

  await adminDb
    .collection(
      CHALLENGES_COLLECTION
    )
    .doc(challengeId)
    .set({
      challenge:
        options.challenge,
      adminPrincipalId,
      purpose:
        'recovery-register-device',
      state:
        'pending',
      createdAtMs:
        now,
      expiresAtMs:
        now +
        CHALLENGE_TTL_MS,
      createdAt:
        FieldValue.serverTimestamp(),
      expiresAt:
        Timestamp.fromMillis(
          now +
            CHALLENGE_TTL_MS
        ),
    });

  return options;
}

export async function verifyRecoveryDeviceRegistration(
  email: string,
  response: RegistrationResponseJSON,
  label = 'Recovered Admin Device'
) {
  const normalizedEmail =
    email.trim().toLowerCase();

  const {
    challenge: data,
    challengeRef,
  } = await reserveRegistrationChallenge(
    normalizedEmail,
    'recovery-register-device'
  );

  const adminPrincipalId =
    createAdminPrincipalId(
      normalizedEmail
    );

  if (
    data.adminPrincipalId !==
    adminPrincipalId
  ) {
    throw new Error(
      'RECOVERY_PRINCIPAL_MISMATCH'
    );
  }

  const { rpID, origin } =
    getRpConfig();

  const verification =
    await verifyRegistrationResponse({
      response,
      expectedChallenge:
        data.challenge,
      expectedOrigin:
        origin,
      expectedRPID:
        rpID,
      requireUserVerification:
        true,
    });

  if (
    !verification.verified ||
    !verification.registrationInfo
  ) {
    throw new Error(
      'RECOVERY_DEVICE_REGISTRATION_FAILED'
    );
  }

  const {
    credential,
    credentialDeviceType,
    credentialBackedUp,
  } =
    verification.registrationInfo;

  /*
   * Reject a credential ID that is already stored
   * as an active PHCL trusted device. Recovery must
   * produce a newly registered credential, not
   * silently reuse an existing server-side record.
   */
  const existingDevices =
    await getActiveTrustedDevices(
      normalizedEmail
    );

  if (
    existingDevices.some(
      (device) =>
        device.credentialID ===
        credential.id
    )
  ) {
    throw new Error(
      'RECOVERY_CREDENTIAL_ALREADY_ACTIVE'
    );
  }

  const now = Date.now();

  const deviceRef = adminDb
    .collection(
      TRUSTED_DEVICES_COLLECTION
    )
    .doc(
      getCredentialDocumentId(
        credential.id
      )
    );

  const batch = adminDb.batch();

  batch.create(deviceRef, {
    adminPrincipalId,
    credentialID:
      credential.id,
    credentialPublicKey:
      credentialPublicKeyToBase64(
        credential.publicKey
      ),
    counter:
      credential.counter,
    transports:
      credential.transports ?? [],
    deviceType:
      credentialDeviceType,
    backedUp:
      credentialBackedUp,
    label:
      label
        .trim()
        .slice(0, 80) ||
      'Recovered Admin Device',
    active:
      true,
    registrationMethod:
      'recovery',
    createdAtMs:
      now,
    lastUsedAtMs:
      null,
    revokedAtMs:
      null,
    createdAt:
      FieldValue.serverTimestamp(),
    updatedAt:
      FieldValue.serverTimestamp(),
  });

  batch.delete(challengeRef);

  await batch.commit();

  return {
    verified: true,
    deviceId:
      deviceRef.id,
    credentialID:
      credential.id,
    credentialDeviceType,
    credentialBackedUp,
  };
}
