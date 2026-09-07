import 'server-only';

import {
  createHmac,
  randomUUID,
} from 'node:crypto';

import {
  FieldValue,
  Timestamp,
} from 'firebase-admin/firestore';

import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
  type WebAuthnCredential,
} from '@simplewebauthn/server';

import { adminDb } from '@/lib/firebase-admin';

import {
  credentialPublicKeyFromBase64,
  getActiveTrustedDevices,
} from '@/lib/admin-device-security';

const AUTH_CHALLENGES_COLLECTION =
  'admin_webauthn_auth_challenges';

const TRUSTED_DEVICES_COLLECTION =
  'trusted_admin_devices';

const TRUSTED_SESSIONS_COLLECTION =
  'trusted_admin_device_sessions';

const CHALLENGE_TTL_MS =
  5 * 60 * 1000;

const TRUSTED_SESSION_TTL_MS =
  60 * 60 * 1000;

const TRUSTED_SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AuthenticationChallengeDocument = {
  challenge: string;
  adminPrincipalId: string;
  purpose: 'verify-trusted-device';
  state: 'pending' | 'reserved';
  createdAtMs: number;
  expiresAtMs: number;
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
    .toLowerCase();
}

function isValidTrustedSessionId(
  trustedSessionId: string
): boolean {
  return (
    trustedSessionId.length <= 64 &&
    TRUSTED_SESSION_ID_PATTERN.test(
      trustedSessionId
    )
  );
}

function getRpConfig() {
  const rpID =
    process.env.ADMIN_WEBAUTHN_RP_ID?.trim();

  const origin =
    process.env.ADMIN_WEBAUTHN_ORIGIN?.trim();

  if (rpID && origin) {
    return {
      rpID,
      origin,
    };
  }

  if (
    process.env.NODE_ENV !==
    'production'
  ) {
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

function createPrincipalId(
  email: string
): string {
  return createHmac(
    'sha256',
    getSecuritySecret()
  )
    .update(
      `phcl-admin-principal:${normalizeEmail(
        email
      )}`
    )
    .digest('base64url');
}

function createChallengeDocumentId(
  email: string
): string {
  return createHmac(
    'sha256',
    getSecuritySecret()
  )
    .update(
      `admin-device-auth:${normalizeEmail(
        email
      )}`
    )
    .digest('hex');
}

export async function createTrustedDeviceAuthenticationOptions(
  email: string
) {
  const devices =
    await getActiveTrustedDevices(
      email
    );

  if (
    devices.length === 0
  ) {
    throw new Error(
      'NO_TRUSTED_DEVICE'
    );
  }

  const {
    rpID,
  } = getRpConfig();

  const options =
    await generateAuthenticationOptions({
      rpID,
      userVerification:
        'required',

      allowCredentials:
        devices.map(
          (device) => ({
            id:
              device.credentialID,

            transports:
              device.transports as
                WebAuthnCredential['transports'],
          })
        ),
    });

  const now =
    Date.now();

  const challengeId =
    createChallengeDocumentId(
      email
    );

  await adminDb
    .collection(
      AUTH_CHALLENGES_COLLECTION
    )
    .doc(
      challengeId
    )
    .set({
      challenge:
        options.challenge,

      adminPrincipalId:
        createPrincipalId(
          email
        ),

      purpose:
        'verify-trusted-device',

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

export async function verifyTrustedAdminDevice(
  email: string,
  response: AuthenticationResponseJSON
) {
  const normalizedEmail =
    normalizeEmail(
      email
    );

  const challengeId =
    createChallengeDocumentId(
      normalizedEmail
    );

  const challengeRef =
    adminDb
      .collection(
        AUTH_CHALLENGES_COLLECTION
      )
      .doc(
        challengeId
      );

  const expectedPrincipal =
    createPrincipalId(
      normalizedEmail
    );

  /*
   * Reserve the one-time challenge atomically.
   * Only one concurrent request can move it from
   * pending to reserved.
   */
  const challengeData =
    await adminDb.runTransaction(
      async (transaction) => {
        const snapshot =
          await transaction.get(
            challengeRef
          );

        if (!snapshot.exists) {
          throw new Error(
            'AUTH_CHALLENGE_NOT_FOUND'
          );
        }

        const data =
          snapshot.data() as
            | Partial<AuthenticationChallengeDocument>
            | undefined;

        if (
          !data ||
          data.purpose !==
            'verify-trusted-device' ||
          data.state !==
            'pending' ||
          typeof data.challenge !==
            'string' ||
          !data.challenge ||
          data.adminPrincipalId !==
            expectedPrincipal ||
          typeof data.expiresAtMs !==
            'number' ||
          data.expiresAtMs <=
            Date.now()
        ) {
          throw new Error(
            'AUTH_CHALLENGE_INVALID'
          );
        }

        transaction.update(
          challengeRef,
          {
            state:
              'reserved',
            reservedAtMs:
              Date.now(),
            reservedAt:
              FieldValue.serverTimestamp(),
          }
        );

        return data as
          AuthenticationChallengeDocument;
      }
    );

  const devices =
    await getActiveTrustedDevices(
      normalizedEmail
    );

  const device =
    devices.find(
      (candidate) =>
        candidate.credentialID ===
        response.id
    );

  if (!device) {
    throw new Error(
      'UNKNOWN_TRUSTED_DEVICE'
    );
  }

  const credential:
    WebAuthnCredential = {
      id:
        device.credentialID,

      publicKey:
        credentialPublicKeyFromBase64(
          device.credentialPublicKey
        ),

      counter:
        device.counter,

      transports:
        device.transports as
          WebAuthnCredential['transports'],
    };

  const {
    rpID,
    origin,
  } = getRpConfig();

  const verification =
    await verifyAuthenticationResponse({
      response,

      expectedChallenge:
        challengeData.challenge,

      expectedOrigin:
        origin,

      expectedRPID:
        rpID,

      credential,

      requireUserVerification:
        true,
    });

  if (
    !verification.verified
  ) {
    throw new Error(
      'TRUSTED_DEVICE_VERIFICATION_FAILED'
    );
  }

  const newCounter =
    verification
      .authenticationInfo
      .newCounter;

  const now =
    Date.now();

  await adminDb
    .collection(
      TRUSTED_DEVICES_COLLECTION
    )
    .doc(
      device.id
    )
    .update({
      counter:
        newCounter,

      lastUsedAtMs:
        now,

      lastUsedAt:
        FieldValue.serverTimestamp(),

      updatedAt:
        FieldValue.serverTimestamp(),
    });

  const trustedSessionId =
    randomUUID();

  const expiresAtMs =
    now +
    TRUSTED_SESSION_TTL_MS;

  await adminDb
    .collection(
      TRUSTED_SESSIONS_COLLECTION
    )
    .doc(
      trustedSessionId
    )
    .create({
      adminPrincipalId:
        expectedPrincipal,

      deviceId:
        device.id,

      createdAtMs:
        now,

      expiresAtMs,

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
    verified: true,
    trustedSessionId,
    deviceId:
      device.id,
    expiresAtMs,
  };
}

export async function createTrustedDeviceSessionForDevice(
  email: string,
  deviceId: string
): Promise<{
  trustedSessionId: string;
  deviceId: string;
  expiresAtMs: number;
}> {
  const normalizedEmail =
    normalizeEmail(
      email
    );

  const adminPrincipalId =
    createPrincipalId(
      normalizedEmail
    );

  const deviceSnapshot =
    await adminDb
      .collection(
        TRUSTED_DEVICES_COLLECTION
      )
      .doc(
        deviceId
      )
      .get();

  if (
    !deviceSnapshot.exists
  ) {
    throw new Error(
      'TRUSTED_DEVICE_NOT_FOUND'
    );
  }

  const deviceData =
    deviceSnapshot.data();

  if (
    !deviceData ||
    deviceData.adminPrincipalId !==
      adminPrincipalId ||
    (
      deviceData.revokedAtMs !==
        null &&
      deviceData.revokedAtMs !==
        undefined
    )
  ) {
    throw new Error(
      'TRUSTED_DEVICE_INVALID'
    );
  }

  const now =
    Date.now();

  const trustedSessionId =
    randomUUID();

  const expiresAtMs =
    now +
    TRUSTED_SESSION_TTL_MS;

  await adminDb
    .collection(
      TRUSTED_SESSIONS_COLLECTION
    )
    .doc(
      trustedSessionId
    )
    .create({
      adminPrincipalId,

      deviceId,

      createdAtMs:
        now,

      expiresAtMs,

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
    trustedSessionId,
    deviceId,
    expiresAtMs,
  };
}

export async function verifyTrustedDeviceSession(
  email: string,
  trustedSessionId: string
): Promise<boolean> {
  if (
    !isValidTrustedSessionId(
      trustedSessionId
    )
  ) {
    return false;
  }

  const snapshot =
    await adminDb
      .collection(
        TRUSTED_SESSIONS_COLLECTION
      )
      .doc(
        trustedSessionId
      )
      .get();

  if (
    !snapshot.exists
  ) {
    return false;
  }

  const data =
    snapshot.data();

  if (!data) {
    return false;
  }

  if (
    data.adminPrincipalId !==
      createPrincipalId(
        email
      ) ||
    typeof data.expiresAtMs !==
      'number' ||
    data.expiresAtMs <=
      Date.now() ||
    data.revokedAtMs !==
      null
  ) {
    return false;
  }

  return true;
}

/*
 * Revoke one specific trusted-device session.
 *
 * Used for a normal logout so another valid
 * trusted-device session is not unnecessarily
 * revoked.
 */
export async function revokeTrustedDeviceSession(
  email: string,
  trustedSessionId: string
): Promise<boolean> {
  if (
    !isValidTrustedSessionId(
      trustedSessionId
    )
  ) {
    return false;
  }

  const ref =
    adminDb
      .collection(
        TRUSTED_SESSIONS_COLLECTION
      )
      .doc(
        trustedSessionId
      );

  const snapshot =
    await ref.get();

  if (
    !snapshot.exists
  ) {
    return false;
  }

  const data =
    snapshot.data();

  if (
    !data ||
    data.adminPrincipalId !==
      createPrincipalId(
        email
      )
  ) {
    return false;
  }

  if (
    data.revokedAtMs !==
      null &&
    data.revokedAtMs !==
      undefined
  ) {
    return true;
  }

  const now =
    Date.now();

  await ref.set(
    {
      revokedAtMs:
        now,

      revokedAt:
        FieldValue.serverTimestamp(),

      updatedAt:
        FieldValue.serverTimestamp(),

      revocationReason:
        'admin-logout',
    },
    {
      merge: true,
    }
  );

  return true;
}

/*
 * Revoke every trusted-device session for
 * this Admin principal.
 *
 * Emergency recovery intentionally performs
 * broader revocation than a normal logout.
 */
export async function revokeAllTrustedDeviceSessions(
  email: string
): Promise<number> {
  const adminPrincipalId =
    createPrincipalId(
      email
    );

  const snapshot =
    await adminDb
      .collection(
        TRUSTED_SESSIONS_COLLECTION
      )
      .where(
        'adminPrincipalId',
        '==',
        adminPrincipalId
      )
      .get();

  if (
    snapshot.empty
  ) {
    return 0;
  }

  const now =
    Date.now();

  const batch =
    adminDb.batch();

  let revokedCount =
    0;

  for (
    const document
    of snapshot.docs
  ) {
    const data =
      document.data();

    if (
      data.revokedAtMs !==
        null &&
      data.revokedAtMs !==
        undefined
    ) {
      continue;
    }

    batch.set(
      document.ref,
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

    revokedCount +=
      1;
  }

  if (
    revokedCount > 0
  ) {
    await batch.commit();
  }

  return revokedCount;
}

/*
 * Emergency recovery replacement policy:
 *
 * - keep ONLY the newly registered device
 * - revoke every older trusted device
 * - revoke every previously issued trusted
 *   device session
 */
export async function finalizeRecoveryDeviceReplacement(
  email: string,
  newDeviceId: string
): Promise<{
  revokedDevices: number;
  revokedSessions: number;
}> {
  const normalizedEmail =
    normalizeEmail(
      email
    );

  const adminPrincipalId =
    createPrincipalId(
      normalizedEmail
    );

  const newDeviceRef =
    adminDb
      .collection(
        TRUSTED_DEVICES_COLLECTION
      )
      .doc(
        newDeviceId
      );

  const newDeviceSnapshot =
    await newDeviceRef.get();

  if (
    !newDeviceSnapshot.exists
  ) {
    throw new Error(
      'RECOVERY_NEW_DEVICE_NOT_FOUND'
    );
  }

  const newDeviceData =
    newDeviceSnapshot.data();

  if (
    !newDeviceData ||
    newDeviceData.adminPrincipalId !==
      adminPrincipalId ||
    (
      newDeviceData.revokedAtMs !==
        null &&
      newDeviceData.revokedAtMs !==
        undefined
    )
  ) {
    throw new Error(
      'RECOVERY_NEW_DEVICE_INVALID'
    );
  }

  const devicesSnapshot =
    await adminDb
      .collection(
        TRUSTED_DEVICES_COLLECTION
      )
      .where(
        'adminPrincipalId',
        '==',
        adminPrincipalId
      )
      .get();

  const now =
    Date.now();

  const deviceBatch =
    adminDb.batch();

  let revokedDevices =
    0;

  for (
    const document
    of devicesSnapshot.docs
  ) {
    if (
      document.id ===
      newDeviceId
    ) {
      continue;
    }

    const data =
      document.data();

    if (
      data.revokedAtMs !==
        null &&
      data.revokedAtMs !==
        undefined
    ) {
      continue;
    }

    deviceBatch.set(
      document.ref,
      {
        revokedAtMs:
          now,

        revokedAt:
          FieldValue.serverTimestamp(),

        updatedAt:
          FieldValue.serverTimestamp(),

        replacementDeviceId:
          newDeviceId,

        revocationReason:
          'emergency-recovery-replacement',
      },
      {
        merge: true,
      }
    );

    revokedDevices +=
      1;
  }

  deviceBatch.set(
    newDeviceRef,
    {
      active:
        true,

      registrationMethod:
        newDeviceData
          .registrationMethod ||
        'recovery',

      recoveryPrimary:
        true,

      updatedAt:
        FieldValue.serverTimestamp(),
    },
    {
      merge: true,
    }
  );

  await deviceBatch.commit();

  const revokedSessions =
    await revokeAllTrustedDeviceSessions(
      normalizedEmail
    );

  return {
    revokedDevices,
    revokedSessions,
  };
}
