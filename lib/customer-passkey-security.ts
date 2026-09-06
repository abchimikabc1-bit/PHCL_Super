import 'server-only';

import {
  createHash,
  randomUUID,
} from 'node:crypto';

import {
  FieldValue,
  Timestamp,
} from 'firebase-admin/firestore';

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
  type WebAuthnCredential,
} from '@simplewebauthn/server';

import {
  isoUint8Array,
} from '@simplewebauthn/server/helpers';

import {
  adminDb,
} from '@/lib/firebase-admin';

import type {
  AuthenticatedFirebaseUser,
} from '@/lib/firebase-user-auth';

/**
 * ============================================================
 * PHCL SUPER — CUSTOMER PASSKEY SECURITY AUTHORITY
 * ============================================================
 *
 * PURPOSE
 *
 * Server-authoritative WebAuthn / Passkey security for
 * authenticated PHCL customers.
 *
 * SECURITY MODEL
 *
 * - Customer identity comes only from a verified Firebase UID.
 * - Browser-supplied UID is never identity authority.
 * - WebAuthn challenges are:
 *   - random
 *   - owner-bound
 *   - purpose-bound
 *   - short-lived
 *   - one-time-use
 * - User verification is REQUIRED.
 * - RP ID and Origin are verified server-side.
 * - Only public WebAuthn credential material is stored.
 * - PHCL never stores raw fingerprint or face templates.
 * - WebAuthn private keys remain inside the authenticator.
 * - Passkey authentication can create short-lived
 *   strong-auth sessions for sensitive operations.
 *
 * IMPORTANT
 *
 * This module does not:
 *
 * - approve KYC/KYS/KYB
 * - mutate wallet balances
 * - mutate the financial ledger
 * - authorize Admin access
 * - accept browser security checkboxes as authority
 */

const PASSKEY_CREDENTIALS_COLLECTION =
  'customer_passkey_credentials';

const REGISTRATION_CHALLENGES_COLLECTION =
  'customer_passkey_registration_challenges';

const AUTHENTICATION_CHALLENGES_COLLECTION =
  'customer_passkey_auth_challenges';

const STRONG_AUTH_SESSIONS_COLLECTION =
  'customer_strong_auth_sessions';

const REGISTRATION_CHALLENGE_TTL_MS =
  5 * 60 * 1000;

const AUTHENTICATION_CHALLENGE_TTL_MS =
  5 * 60 * 1000;

/**
 * A successful Passkey authentication grants only
 * a short-lived strong-auth session.
 *
 * Financial/security routes must still verify the
 * purpose of the session before performing an action.
 */
const STRONG_AUTH_SESSION_TTL_MS =
  10 * 60 * 1000;

/**
 * First Passkey enrollment must happen shortly after
 * Firebase authentication.
 *
 * NOTE:
 *
 * auth_time is a Firebase authentication freshness
 * signal. It is not treated as proof that a password
 * was manually re-entered at that exact moment.
 */
const FIRST_PASSKEY_RECENT_AUTH_MAX_AGE_MS =
  10 * 60 * 1000;

const MAX_CLOCK_SKEW_MS =
  60 * 1000;

const MAX_UID_LENGTH =
  256;

const MAX_OPAQUE_ID_LENGTH =
  128;

const MAX_LABEL_LENGTH =
  80;

const DEFAULT_PASSKEY_LABEL =
  'Customer Passkey';

const RP_NAME =
  process.env
    .CUSTOMER_WEBAUTHN_RP_NAME
    ?.trim() ||
  'PHCL Super';

export type CustomerStrongAuthPurpose =
  | 'sign-in'
  | 'general'
  | 'wallet-withdrawal'
  | 'wallet-transfer'
  | 'seller-payout'
  | 'security-change';

type StoredRegistrationChallenge = {
  uid: string;

  challenge: string;

  purpose:
    'register-customer-passkey';

  createdAtMs: number;

  expiresAtMs: number;
};

type StoredAuthenticationChallenge = {
  uid: string;

  challenge: string;

  purpose:
    CustomerStrongAuthPurpose;

  createdAtMs: number;

  expiresAtMs: number;
};

export type CustomerPasskeyCredential = {
  id: string;

  uid: string;

  credentialID: string;

  credentialPublicKey: string;

  counter: number;

  transports: string[];

  deviceType: string;

  backedUp: boolean;

  label: string;

  createdAtMs: number;

  lastUsedAtMs:
    number | null;

  revokedAtMs:
    number | null;
};

export type CustomerStrongAuthSession = {
  sessionId: string;

  uid: string;

  credentialId: string;

  factor:
    'PASSKEY';

  assurance:
    'USER_VERIFIED';

  purpose:
    CustomerStrongAuthPurpose;

  createdAtMs: number;

  expiresAtMs: number;
};

function normalizeUid(
  value: string,
): string {
  const uid =
    typeof value ===
      'string'
      ? value.trim()
      : '';

  if (
    !uid ||
    uid.length >
      MAX_UID_LENGTH ||
    uid.includes('/')
  ) {
    throw new Error(
      'INVALID_CUSTOMER_IDENTITY',
    );
  }

  return uid;
}

function normalizeOpaqueId(
  value: string,
): string {
  const normalized =
    typeof value ===
      'string'
      ? value.trim()
      : '';

  if (
    !normalized ||
    normalized.length >
      MAX_OPAQUE_ID_LENGTH ||
    normalized.includes('/')
  ) {
    throw new Error(
      'INVALID_SECURITY_REFERENCE',
    );
  }

  return normalized;
}

function normalizeLabel(
  value?: string,
): string {
  if (
    typeof value !==
      'string'
  ) {
    return DEFAULT_PASSKEY_LABEL;
  }

  const normalized =
    value.trim();

  return (
    normalized
      .slice(
        0,
        MAX_LABEL_LENGTH,
      ) ||
    DEFAULT_PASSKEY_LABEL
  );
}

function normalizePurpose(
  value:
    CustomerStrongAuthPurpose,
): CustomerStrongAuthPurpose {
  switch (value) {
    case 'sign-in':
    case 'general':
    case 'wallet-withdrawal':
    case 'wallet-transfer':
    case 'seller-payout':
    case 'security-change':
      return value;

    default:
      throw new Error(
        'INVALID_STRONG_AUTH_PURPOSE',
      );
  }
}

function getRpConfig(): {
  rpID: string;

  origin: string;
} {
  const configuredRpID =
    process.env
      .CUSTOMER_WEBAUTHN_RP_ID
      ?.trim();

  const configuredOrigin =
    process.env
      .CUSTOMER_WEBAUTHN_ORIGIN
      ?.trim();

  if (
    configuredRpID &&
    configuredOrigin
  ) {
    return {
      rpID:
        configuredRpID,

      origin:
        configuredOrigin,
    };
  }

  if (
    process.env.NODE_ENV !==
    'production'
  ) {
    return {
      rpID:
        'localhost',

      origin:
        'http://localhost:3000',
    };
  }

  return {
    rpID:
      'phclsuper.com',

    origin:
      'https://www.phclsuper.com',
  };
}

function credentialPublicKeyToBase64(
  publicKey: Uint8Array,
): string {
  return Buffer.from(
    publicKey,
  ).toString(
    'base64url',
  );
}

export function credentialPublicKeyFromBase64(
  value: string,
): Uint8Array<ArrayBuffer> {
  const bytes =
    Buffer.from(
      value,
      'base64url',
    );

  return Uint8Array.from(
    bytes,
  );
}

/**
 * Credential IDs are already public WebAuthn
 * identifiers, but using a SHA-256 document ID gives:
 *
 * - deterministic global uniqueness
 * - no raw credential ID in Firestore document paths
 * - atomic duplicate rejection through .create()
 */
function createCredentialDocumentId(
  credentialID: string,
): string {
  return createHash(
    'sha256',
  )
    .update(
      credentialID,
    )
    .digest(
      'hex',
    );
}

function readCustomerPasskeyCredential(
  id: string,
  data:
    FirebaseFirestore.DocumentData,
): CustomerPasskeyCredential {
  return {
    id,

    uid:
      String(
        data.uid || '',
      ),

    credentialID:
      String(
        data.credentialID ||
          '',
      ),

    credentialPublicKey:
      String(
        data
          .credentialPublicKey ||
          '',
      ),

    counter:
      Number(
        data.counter || 0,
      ),

    transports:
      Array.isArray(
        data.transports,
      )
        ? data.transports.map(
            String,
          )
        : [],

    deviceType:
      String(
        data.deviceType ||
          '',
      ),

    backedUp:
      Boolean(
        data.backedUp,
      ),

    label:
      String(
        data.label ||
          DEFAULT_PASSKEY_LABEL,
      ),

    createdAtMs:
      Number(
        data.createdAtMs ||
          0,
      ),

    lastUsedAtMs:
      data.lastUsedAtMs ==
      null
        ? null
        : Number(
            data.lastUsedAtMs,
          ),

    revokedAtMs:
      data.revokedAtMs ==
      null
        ? null
        : Number(
            data.revokedAtMs,
          ),
  };
}

/**
 * Return all active Passkeys owned by one
 * authenticated Firebase customer.
 */
export async function getActiveCustomerPasskeys(
  rawUid: string,
): Promise<
  CustomerPasskeyCredential[]
> {
  const uid =
    normalizeUid(
      rawUid,
    );

  const snapshot =
    await adminDb
      .collection(
        PASSKEY_CREDENTIALS_COLLECTION,
      )
      .where(
        'uid',
        '==',
        uid,
      )
      .get();

  return snapshot.docs
    .map(
      (
        document,
      ) =>
        readCustomerPasskeyCredential(
          document.id,
          document.data(),
        ),
    )
    .filter(
      (
        credential,
      ) =>
        credential.uid ===
          uid &&
        credential
          .revokedAtMs ===
          null &&
        Boolean(
          credential
            .credentialID,
        ) &&
        Boolean(
          credential
            .credentialPublicKey,
        ),
    );
}

export async function hasActiveCustomerPasskey(
  rawUid: string,
): Promise<boolean> {
  const credentials =
    await getActiveCustomerPasskeys(
      rawUid,
    );

  return (
    credentials.length > 0
  );
}

/**
 * First Passkey enrollment bootstrap policy.
 *
 * Requirements:
 *
 * 1. Firebase user must be authenticated.
 * 2. Email must be verified.
 * 3. Firebase auth_time must be recent.
 * 4. auth_time must not be unreasonably in future.
 *
 * Existing Passkey holders should eventually use
 * existing strong authentication for adding another
 * credential instead of this bootstrap path.
 */
export async function assertFirstPasskeyEnrollmentAllowed(
  user:
    AuthenticatedFirebaseUser,
): Promise<void> {
  const uid =
    normalizeUid(
      user.uid,
    );

  if (
    !user.emailVerified
  ) {
    throw new Error(
      'EMAIL_VERIFICATION_REQUIRED',
    );
  }

  const existing =
    await hasActiveCustomerPasskey(
      uid,
    );

  if (existing) {
    throw new Error(
      'EXISTING_PASSKEY_REQUIRES_STRONG_AUTH',
    );
  }

  const authTimeSeconds =
    typeof user.token
      .auth_time ===
      'number'
      ? user.token
          .auth_time
      : NaN;

  if (
    !Number.isFinite(
      authTimeSeconds,
    ) ||
    authTimeSeconds <= 0
  ) {
    throw new Error(
      'RECENT_AUTHENTICATION_REQUIRED',
    );
  }

  const authTimeMs =
    authTimeSeconds *
    1000;

  const now =
    Date.now();

  if (
    authTimeMs >
    now +
      MAX_CLOCK_SKEW_MS
  ) {
    throw new Error(
      'INVALID_AUTHENTICATION_TIME',
    );
  }

  if (
    now -
      authTimeMs >
    FIRST_PASSKEY_RECENT_AUTH_MAX_AGE_MS
  ) {
    throw new Error(
      'RECENT_AUTHENTICATION_REQUIRED',
    );
  }
}

/**
 * Create first customer Passkey registration
 * options.
 *
 * The caller must pass an already verified
 * Firebase user from authenticateFirebaseUser().
 */
export async function createCustomerPasskeyRegistrationOptions(
  user:
    AuthenticatedFirebaseUser,
): Promise<{
  challengeId: string;

  options:
    Awaited<
      ReturnType<
        typeof generateRegistrationOptions
      >
    >;
}> {
  await assertFirstPasskeyEnrollmentAllowed(
    user,
  );

  const uid =
    normalizeUid(
      user.uid,
    );

  const existingCredentials =
    await getActiveCustomerPasskeys(
      uid,
    );

  const {
    rpID,
  } =
    getRpConfig();

  const userName =
    user.email?.trim() ||
    uid;

  const options =
    await generateRegistrationOptions({
      rpName:
        RP_NAME,

      rpID,

      userName,

      userDisplayName:
        userName,

      userID:
        isoUint8Array
          .fromUTF8String(
            uid,
          ),

      attestationType:
        'none',

      authenticatorSelection: {
        residentKey:
          'preferred',

        userVerification:
          'required',
      },

      excludeCredentials:
        existingCredentials.map(
          (
            credential,
          ) => ({
            id:
              credential
                .credentialID,

            transports:
              credential
                .transports as
                WebAuthnCredential['transports'],
          }),
        ),
    });

  const challengeId =
    randomUUID();

  const now =
    Date.now();

  const expiresAtMs =
    now +
    REGISTRATION_CHALLENGE_TTL_MS;

  const storedChallenge:
    StoredRegistrationChallenge =
    {
      uid,

      challenge:
        options.challenge,

      purpose:
        'register-customer-passkey',

      createdAtMs:
        now,

      expiresAtMs,
    };

  await adminDb
    .collection(
      REGISTRATION_CHALLENGES_COLLECTION,
    )
    .doc(
      challengeId,
    )
    .create({
      ...storedChallenge,

      createdAt:
        FieldValue
          .serverTimestamp(),

      expiresAt:
        Timestamp.fromMillis(
          expiresAtMs,
        ),
    });

  return {
    challengeId,

    options,
  };
}

/**
 * Atomically consume a customer registration
 * challenge.
 *
 * The document is deleted BEFORE WebAuthn
 * verification completes.
 *
 * Therefore an assertion cannot be replayed,
 * even when verification fails.
 */
async function consumeRegistrationChallenge(
  rawUid: string,
  rawChallengeId: string,
): Promise<
  StoredRegistrationChallenge
> {
  const uid =
    normalizeUid(
      rawUid,
    );

  const challengeId =
    normalizeOpaqueId(
      rawChallengeId,
    );

  const ref =
    adminDb
      .collection(
        REGISTRATION_CHALLENGES_COLLECTION,
      )
      .doc(
        challengeId,
      );

  return adminDb.runTransaction(
    async (
      transaction,
    ) => {
      const snapshot =
        await transaction.get(
          ref,
        );

      if (
        !snapshot.exists
      ) {
        throw new Error(
          'REGISTRATION_CHALLENGE_NOT_FOUND',
        );
      }

      const data =
        snapshot.data();

      transaction.delete(
        ref,
      );

      if (
        !data ||
        data.uid !==
          uid ||
        data.purpose !==
          'register-customer-passkey' ||
        typeof data.challenge !==
          'string' ||
        !data.challenge ||
        typeof data.expiresAtMs !==
          'number' ||
        data.expiresAtMs <=
          Date.now()
      ) {
        throw new Error(
          'REGISTRATION_CHALLENGE_INVALID',
        );
      }

      return {
        uid,

        challenge:
          data.challenge,

        purpose:
          'register-customer-passkey',

        createdAtMs:
          typeof data.createdAtMs ===
            'number'
            ? data.createdAtMs
            : 0,

        expiresAtMs:
          data.expiresAtMs,
      };
    },
  );
}

/**
 * Verify and store the customer's first
 * Passkey credential.
 *
 * Only the public credential is persisted.
 */
export async function verifyCustomerPasskeyRegistration(
  user:
    AuthenticatedFirebaseUser,

  rawChallengeId:
    string,

  response:
    RegistrationResponseJSON,

  label =
    DEFAULT_PASSKEY_LABEL,
): Promise<{
  verified: true;

  credentialId: string;

  deviceType: string;

  backedUp: boolean;
}> {
  /**
   * Re-check bootstrap policy at verification
   * time to close races between options and verify.
   */
  await assertFirstPasskeyEnrollmentAllowed(
    user,
  );

  const uid =
    normalizeUid(
      user.uid,
    );

  const stored =
    await consumeRegistrationChallenge(
      uid,
      rawChallengeId,
    );

  const {
    rpID,
    origin,
  } =
    getRpConfig();

  const verification =
    await verifyRegistrationResponse({
      response,

      expectedChallenge:
        stored.challenge,

      expectedOrigin:
        origin,

      expectedRPID:
        rpID,

      requireUserVerification:
        true,
    });

  if (
    !verification.verified ||
    !verification
      .registrationInfo
  ) {
    throw new Error(
      'PASSKEY_REGISTRATION_FAILED',
    );
  }

  const {
    credential,
    credentialDeviceType,
    credentialBackedUp,
  } =
    verification
      .registrationInfo;

  if (
    !credential.id ||
    !credential.publicKey
  ) {
    throw new Error(
      'PASSKEY_CREDENTIAL_INVALID',
    );
  }

  const credentialDocumentId =
    createCredentialDocumentId(
      credential.id,
    );

  const credentialRef =
    adminDb
      .collection(
        PASSKEY_CREDENTIALS_COLLECTION,
      )
      .doc(
        credentialDocumentId,
      );

  const now =
    Date.now();

  /**
   * Firestore .create() provides global
   * credential-ID uniqueness.
   *
   * If the same credential already exists
   * for any customer, this write fails.
   */
  await credentialRef.create({
    uid,

    credentialID:
      credential.id,

    credentialPublicKey:
      credentialPublicKeyToBase64(
        credential.publicKey,
      ),

    counter:
      credential.counter,

    transports:
      credential.transports ??
      [],

    deviceType:
      credentialDeviceType,

    backedUp:
      credentialBackedUp,

    label:
      normalizeLabel(
        label,
      ),

    active:
      true,

    createdAtMs:
      now,

    lastUsedAtMs:
      null,

    revokedAtMs:
      null,

    createdAt:
      FieldValue
        .serverTimestamp(),

    updatedAt:
      FieldValue
        .serverTimestamp(),
  });

  return {
    verified:
      true,

    credentialId:
      credentialDocumentId,

    deviceType:
      credentialDeviceType,

    backedUp:
      credentialBackedUp,
  };
}

/**
 * Create WebAuthn authentication options for
 * an existing customer Passkey.
 *
 * purpose binds the ceremony to the intended
 * security operation.
 */
export async function createCustomerPasskeyAuthenticationOptions(
  rawUid: string,

  requestedPurpose:
    CustomerStrongAuthPurpose =
    'general',
): Promise<{
  challengeId: string;

  options:
    Awaited<
      ReturnType<
        typeof generateAuthenticationOptions
      >
    >;
}> {
  const uid =
    normalizeUid(
      rawUid,
    );

  const purpose =
    normalizePurpose(
      requestedPurpose,
    );

  const credentials =
    await getActiveCustomerPasskeys(
      uid,
    );

  if (
    credentials.length ===
    0
  ) {
    throw new Error(
      'NO_CUSTOMER_PASSKEY',
    );
  }

  const {
    rpID,
  } =
    getRpConfig();

  const options =
    await generateAuthenticationOptions({
      rpID,

      userVerification:
        'required',

      allowCredentials:
        credentials.map(
          (
            credential,
          ) => ({
            id:
              credential
                .credentialID,

            transports:
              credential
                .transports as
                WebAuthnCredential['transports'],
          }),
        ),
    });

  const challengeId =
    randomUUID();

  const now =
    Date.now();

  const expiresAtMs =
    now +
    AUTHENTICATION_CHALLENGE_TTL_MS;

  const storedChallenge:
    StoredAuthenticationChallenge =
    {
      uid,

      challenge:
        options.challenge,

      purpose,

      createdAtMs:
        now,

      expiresAtMs,
    };

  await adminDb
    .collection(
      AUTHENTICATION_CHALLENGES_COLLECTION,
    )
    .doc(
      challengeId,
    )
    .create({
      ...storedChallenge,

      createdAt:
        FieldValue
          .serverTimestamp(),

      expiresAt:
        Timestamp.fromMillis(
          expiresAtMs,
        ),
    });

  return {
    challengeId,

    options,
  };
}

async function consumeAuthenticationChallenge(
  rawUid: string,

  rawChallengeId: string,

  requestedPurpose:
    CustomerStrongAuthPurpose,
): Promise<
  StoredAuthenticationChallenge
> {
  const uid =
    normalizeUid(
      rawUid,
    );

  const challengeId =
    normalizeOpaqueId(
      rawChallengeId,
    );

  const purpose =
    normalizePurpose(
      requestedPurpose,
    );

  const ref =
    adminDb
      .collection(
        AUTHENTICATION_CHALLENGES_COLLECTION,
      )
      .doc(
        challengeId,
      );

  return adminDb.runTransaction(
    async (
      transaction,
    ) => {
      const snapshot =
        await transaction.get(
          ref,
        );

      if (
        !snapshot.exists
      ) {
        throw new Error(
          'AUTH_CHALLENGE_NOT_FOUND',
        );
      }

      const data =
        snapshot.data();

      transaction.delete(
        ref,
      );

      if (
        !data ||
        data.uid !==
          uid ||
        data.purpose !==
          purpose ||
        typeof data.challenge !==
          'string' ||
        !data.challenge ||
        typeof data.expiresAtMs !==
          'number' ||
        data.expiresAtMs <=
          Date.now()
      ) {
        throw new Error(
          'AUTH_CHALLENGE_INVALID',
        );
      }

      return {
        uid,

        challenge:
          data.challenge,

        purpose,

        createdAtMs:
          typeof data.createdAtMs ===
            'number'
            ? data.createdAtMs
            : 0,

        expiresAtMs:
          data.expiresAtMs,
      };
    },
  );
}

/**
 * Verify an existing customer Passkey.
 *
 * A successful assertion:
 *
 * - verifies credential ownership
 * - verifies RP ID / Origin
 * - requires local user verification
 * - updates WebAuthn counter
 * - creates a short-lived strong-auth session
 */
export async function verifyCustomerPasskeyAuthentication(
  rawUid: string,

  rawChallengeId:
    string,

  response:
    AuthenticationResponseJSON,

  requestedPurpose:
    CustomerStrongAuthPurpose =
    'general',
): Promise<{
  verified: true;

  strongAuthSessionId:
    string;

  credentialId: string;

  purpose:
    CustomerStrongAuthPurpose;

  expiresAtMs: number;
}> {
  const uid =
    normalizeUid(
      rawUid,
    );

  const purpose =
    normalizePurpose(
      requestedPurpose,
    );

  const stored =
    await consumeAuthenticationChallenge(
      uid,
      rawChallengeId,
      purpose,
    );

  const credentialDocumentId =
    createCredentialDocumentId(
      response.id,
    );

  const credentialRef =
    adminDb
      .collection(
        PASSKEY_CREDENTIALS_COLLECTION,
      )
      .doc(
        credentialDocumentId,
      );

  const credentialSnapshot =
    await credentialRef.get();

  if (
    !credentialSnapshot.exists
  ) {
    throw new Error(
      'UNKNOWN_CUSTOMER_PASSKEY',
    );
  }

  const credentialData =
    credentialSnapshot.data();

  if (
    !credentialData
  ) {
    throw new Error(
      'CUSTOMER_PASSKEY_INVALID',
    );
  }

  const storedCredential =
    readCustomerPasskeyCredential(
      credentialSnapshot.id,
      credentialData,
    );

  if (
    storedCredential.uid !==
      uid ||
    storedCredential
      .revokedAtMs !==
      null ||
    storedCredential
      .credentialID !==
      response.id ||
    !storedCredential
      .credentialPublicKey
  ) {
    throw new Error(
      'CUSTOMER_PASSKEY_INVALID',
    );
  }

  const credential:
    WebAuthnCredential =
    {
      id:
        storedCredential
          .credentialID,

      publicKey:
        credentialPublicKeyFromBase64(
          storedCredential
            .credentialPublicKey,
        ),

      counter:
        storedCredential
          .counter,

      transports:
        storedCredential
          .transports as
          WebAuthnCredential['transports'],
    };

  const {
    rpID,
    origin,
  } =
    getRpConfig();

  const verification =
    await verifyAuthenticationResponse({
      response,

      expectedChallenge:
        stored.challenge,

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
      'PASSKEY_AUTHENTICATION_FAILED',
    );
  }

  const newCounter =
    verification
      .authenticationInfo
      .newCounter;

  const now =
    Date.now();

  await credentialRef.update({
    counter:
      newCounter,

    lastUsedAtMs:
      now,

    lastUsedAt:
      FieldValue
        .serverTimestamp(),

    updatedAt:
      FieldValue
        .serverTimestamp(),
  });

  const strongAuthSessionId =
    randomUUID();

  const expiresAtMs =
    now +
    STRONG_AUTH_SESSION_TTL_MS;

  await adminDb
    .collection(
      STRONG_AUTH_SESSIONS_COLLECTION,
    )
    .doc(
      strongAuthSessionId,
    )
    .create({
      uid,

      credentialId:
        credentialDocumentId,

      factor:
        'PASSKEY',

      assurance:
        'USER_VERIFIED',

      purpose,

      createdAtMs:
        now,

      expiresAtMs,

      revokedAtMs:
        null,

      createdAt:
        FieldValue
          .serverTimestamp(),

      expiresAt:
        Timestamp.fromMillis(
          expiresAtMs,
        ),
    });

  return {
    verified:
      true,

    strongAuthSessionId,

    credentialId:
      credentialDocumentId,

    purpose,

    expiresAtMs,
  };
}

/**
 * Verify a short-lived customer strong-auth
 * session before a sensitive server operation.
 *
 * IMPORTANT:
 *
 * The requested purpose MUST match the purpose
 * originally verified by WebAuthn.
 */
export async function verifyCustomerStrongAuthSession(
  rawUid: string,

  rawSessionId: string,

  requestedPurpose:
    CustomerStrongAuthPurpose,
): Promise<boolean> {
  let uid:
    string;

  let sessionId:
    string;

  let purpose:
    CustomerStrongAuthPurpose;

  try {
    uid =
      normalizeUid(
        rawUid,
      );

    sessionId =
      normalizeOpaqueId(
        rawSessionId,
      );

    purpose =
      normalizePurpose(
        requestedPurpose,
      );
  } catch {
    return false;
  }

  const snapshot =
    await adminDb
      .collection(
        STRONG_AUTH_SESSIONS_COLLECTION,
      )
      .doc(
        sessionId,
      )
      .get();

  if (
    !snapshot.exists
  ) {
    return false;
  }

  const data =
    snapshot.data();

  if (
    !data ||
    data.uid !==
      uid ||
    data.factor !==
      'PASSKEY' ||
    data.assurance !==
      'USER_VERIFIED' ||
    data.purpose !==
      purpose ||
    typeof data.expiresAtMs !==
      'number' ||
    data.expiresAtMs <=
      Date.now() ||
    (
      data.revokedAtMs !==
        null &&
      data.revokedAtMs !==
        undefined
    )
  ) {
    return false;
  }

  return true;
}

/**
 * Revoke one customer strong-auth session.
 */
export async function revokeCustomerStrongAuthSession(
  rawUid: string,

  rawSessionId: string,
): Promise<boolean> {
  let uid:
    string;

  let sessionId:
    string;

  try {
    uid =
      normalizeUid(
        rawUid,
      );

    sessionId =
      normalizeOpaqueId(
        rawSessionId,
      );
  } catch {
    return false;
  }

  const ref =
    adminDb
      .collection(
        STRONG_AUTH_SESSIONS_COLLECTION,
      )
      .doc(
        sessionId,
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
    data.uid !==
      uid
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
        FieldValue
          .serverTimestamp(),

      updatedAt:
        FieldValue
          .serverTimestamp(),
    },
    {
      merge:
        true,
    },
  );

  return true;
}

/**
 * Revoke all strong-auth sessions belonging
 * to one Firebase customer.
 *
 * Intended for:
 *
 * - logout
 * - account recovery
 * - password/security reset
 * - suspected compromise
 */
export async function revokeAllCustomerStrongAuthSessions(
  rawUid: string,
): Promise<number> {
  const uid =
    normalizeUid(
      rawUid,
    );

  const snapshot =
    await adminDb
      .collection(
        STRONG_AUTH_SESSIONS_COLLECTION,
      )
      .where(
        'uid',
        '==',
        uid,
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
    const document of
      snapshot.docs
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
          FieldValue
            .serverTimestamp(),

        updatedAt:
          FieldValue
            .serverTimestamp(),
      },
      {
        merge:
          true,
      },
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

/**
 * Revoke one customer Passkey.
 *
 * This does not delete historical credential
 * metadata. Revocation remains auditable.
 *
 * Existing strong-auth sessions are also
 * revoked so a removed Passkey cannot leave
 * behind active authorization.
 */
export async function revokeCustomerPasskey(
  rawUid: string,

  rawCredentialDocumentId:
    string,
): Promise<boolean> {
  const uid =
    normalizeUid(
      rawUid,
    );

  const credentialDocumentId =
    normalizeOpaqueId(
      rawCredentialDocumentId,
    );

  const ref =
    adminDb
      .collection(
        PASSKEY_CREDENTIALS_COLLECTION,
      )
      .doc(
        credentialDocumentId,
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
    data.uid !==
      uid
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
      active:
        false,

      revokedAtMs:
        now,

      revokedAt:
        FieldValue
          .serverTimestamp(),

      updatedAt:
        FieldValue
          .serverTimestamp(),
    },
    {
      merge:
        true,
    },
  );

  await revokeAllCustomerStrongAuthSessions(
    uid,
  );

  return true;
}