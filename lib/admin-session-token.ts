import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_SESSION_COOKIE_NAME = 'phcl_admin_session';

export type AdminSessionPayload = {
  sessionId: string;
  email: string;
  role: 'admin';
  iat: string;
  exp: string;
  idleExp: string;
};

const getSessionSecret = (): string | null => {
  const value = process.env.ADMIN_SESSION_SECRET?.trim();
  return value ? value : null;
};

export const isAdminSessionSecretConfigured = (): boolean => getSessionSecret() !== null;

const sign = (value: string, secret: string) =>
  createHmac('sha256', secret).update(value).digest('base64url');

export const encodeAdminSessionToken = (payload: AdminSessionPayload): string => {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET is not configured.');
  }

  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${body}.${sign(body, secret)}`;
};

export const decodeAdminSessionToken = (token: string): AdminSessionPayload | null => {
  const secret = getSessionSecret();
  if (!secret) return null;

  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  const expected = sign(body, secret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as AdminSessionPayload;
    if (!payload || typeof payload !== 'object') return null;
    if (typeof payload.sessionId !== 'string' || typeof payload.email !== 'string') return null;
    if (payload.role !== 'admin') return null;
    if (typeof payload.exp !== 'string' || typeof payload.idleExp !== 'string') return null;
    return payload;
  } catch {
    return null;
  }
};
