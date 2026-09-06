import 'server-only';

import {
  createHmac,
  timingSafeEqual,
} from 'node:crypto';

export const ADMIN_SESSION_COOKIE =
  'phcl_admin_session';

export type AdminSessionPayload = {
  email: string;
  role: 'admin';
  iat: string;
  exp: string;
  idleExp: string;
};

export function getPositiveAdminNumberEnv(
  name: string,
  fallback: number
): number {
  const raw = process.env[name];
  const value = Number(raw);

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

function sign(value: string): string {
  return createHmac(
    'sha256',
    getSessionSecret()
  )
    .update(value)
    .digest('base64url');
}

export function encodeAdminSessionToken(
  payload: AdminSessionPayload
): string {
  const body = Buffer.from(
    JSON.stringify(payload),
    'utf8'
  ).toString('base64url');

  return `${body}.${sign(body)}`;
}

export function decodeAdminSessionToken(
  token: string
): AdminSessionPayload | null {
  try {
    const [body, signature, extra] =
      token.split('.');

    if (
      !body ||
      !signature ||
      extra !== undefined
    ) {
      return null;
    }

    const expectedSignature = sign(body);

    const providedBuffer = Buffer.from(
      signature,
      'utf8'
    );

    const expectedBuffer = Buffer.from(
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

    const decoded = Buffer.from(
      body,
      'base64url'
    ).toString('utf8');

    const payload = JSON.parse(
      decoded
    ) as AdminSessionPayload;

    if (
      !payload.email ||
      payload.role !== 'admin' ||
      !payload.iat ||
      !payload.exp ||
      !payload.idleExp
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function isAdminSessionActive(
  session: AdminSessionPayload,
  now = Date.now()
): boolean {
  const hardExpiry = Date.parse(
    session.exp
  );

  const idleExpiry = Date.parse(
    session.idleExp
  );

  return (
    Number.isFinite(hardExpiry) &&
    Number.isFinite(idleExpiry) &&
    hardExpiry > now &&
    idleExpiry > now
  );
}

export function verifyAdminSessionToken(
  token: string | undefined | null
): AdminSessionPayload | null {
  if (!token) {
    return null;
  }

  const session =
    decodeAdminSessionToken(token);

  if (
    !session ||
    !isAdminSessionActive(session)
  ) {
    return null;
  }

  return session;
}