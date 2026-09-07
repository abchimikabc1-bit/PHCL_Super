import 'server-only';

import {
  createHmac,
  timingSafeEqual,
} from 'node:crypto';

export const ADMIN_SESSION_COOKIE =
  'phcl_admin_session';

export const ADMIN_SESSION_SECURITY_VERSION =
  2 as const;

const MAX_SESSION_TOKEN_LENGTH =
  32_768;

const MAX_CLOCK_SKEW_MS =
  60 * 1000;

export type AdminSessionPayload = {
  securityVersion:
    typeof ADMIN_SESSION_SECURITY_VERSION;

  firebaseUid: string;

  email: string;

  emailVerified: true;

  phoneVerified: true;

  role: 'admin';

  iat: string;

  exp: string;

  idleExp: string;
};

export function getPositiveAdminNumberEnv(
  name: string,
  fallback: number
): number {
  const raw =
    process.env[name];

  const value =
    Number(raw);

  if (
    !raw ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return fallback;
  }

  return value;
}

export const ADMIN_SESSION_MAX_AGE_SECONDS =
  getPositiveAdminNumberEnv(
    'ADMIN_SESSION_MAX_AGE_SECONDS',
    60 * 60 * 8
  );

export const ADMIN_SESSION_IDLE_TIMEOUT_SECONDS =
  getPositiveAdminNumberEnv(
    'ADMIN_SESSION_IDLE_TIMEOUT_SECONDS',
    60 * 30
  );

function getSessionSecret():
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

function sign(
  value: string
): string {
  return createHmac(
    'sha256',
    getSessionSecret()
  )
    .update(
      `phcl-admin-session-v2:${value}`
    )
    .digest('base64url');
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value ===
      'object' &&
    value !== null
  );
}

function isValidPayloadShape(
  value: unknown
): value is AdminSessionPayload {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.securityVersion ===
      ADMIN_SESSION_SECURITY_VERSION &&
    typeof value.firebaseUid ===
      'string' &&
    value.firebaseUid.trim().length >
      0 &&
    value.firebaseUid.length <=
      128 &&
    typeof value.email ===
      'string' &&
    value.email.trim().length >
      0 &&
    value.email.length <=
      180 &&
    value.email ===
      value.email
        .trim()
        .toLowerCase() &&
    value.emailVerified ===
      true &&
    value.phoneVerified ===
      true &&
    value.role ===
      'admin' &&
    typeof value.iat ===
      'string' &&
    typeof value.exp ===
      'string' &&
    typeof value.idleExp ===
      'string'
  );
}

export function encodeAdminSessionToken(
  payload: AdminSessionPayload
): string {
  if (
    !isValidPayloadShape(
      payload
    )
  ) {
    throw new Error(
      'Invalid Admin session payload.'
    );
  }

  const body =
    Buffer.from(
      JSON.stringify(
        payload
      ),
      'utf8'
    ).toString(
      'base64url'
    );

  return `${body}.${sign(body)}`;
}

export function decodeAdminSessionToken(
  token: string
): AdminSessionPayload | null {
  try {
    if (
      !token ||
      token.length >
        MAX_SESSION_TOKEN_LENGTH
    ) {
      return null;
    }

    const [
      body,
      signature,
      extra,
    ] = token.split('.');

    if (
      !body ||
      !signature ||
      extra !== undefined
    ) {
      return null;
    }

    const expectedSignature =
      sign(body);

    const providedBuffer =
      Buffer.from(
        signature,
        'utf8'
      );

    const expectedBuffer =
      Buffer.from(
        expectedSignature,
        'utf8'
      );

    if (
      providedBuffer.length !==
      expectedBuffer.length
    ) {
      return null;
    }

    if (
      !timingSafeEqual(
        providedBuffer,
        expectedBuffer
      )
    ) {
      return null;
    }

    const decoded =
      Buffer.from(
        body,
        'base64url'
      ).toString(
        'utf8'
      );

    const parsed:
      unknown =
      JSON.parse(
        decoded
      );

    if (
      !isValidPayloadShape(
        parsed
      )
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function isAdminSessionActive(
  session: AdminSessionPayload,
  now = Date.now()
): boolean {
  if (
    session.securityVersion !==
      ADMIN_SESSION_SECURITY_VERSION ||
    session.emailVerified !== true ||
    session.phoneVerified !== true
  ) {
    return false;
  }

  const issuedAt =
    Date.parse(
      session.iat
    );

  const hardExpiry =
    Date.parse(
      session.exp
    );

  const idleExpiry =
    Date.parse(
      session.idleExp
    );

  return (
    Number.isFinite(
      issuedAt
    ) &&
    Number.isFinite(
      hardExpiry
    ) &&
    Number.isFinite(
      idleExpiry
    ) &&
    issuedAt <=
      now +
        MAX_CLOCK_SKEW_MS &&
    hardExpiry > now &&
    idleExpiry > now &&
    hardExpiry >
      issuedAt &&
    idleExpiry >
      issuedAt &&
    idleExpiry <=
      hardExpiry
  );
}

export function verifyAdminSessionToken(
  token:
    string |
    undefined |
    null
): AdminSessionPayload | null {
  if (!token) {
    return null;
  }

  const session =
    decodeAdminSessionToken(
      token
    );

  if (
    !session ||
    !isAdminSessionActive(
      session
    )
  ) {
    return null;
  }

  return session;
}