import { createHmac, timingSafeEqual } from 'node:crypto';

export type AdminSessionTokenPayload = {
  sessionId: string;
  email: string;
  role: 'admin';
  iat: string;
  exp: string;
  idleExp: string;
};

const sign = (value: string, secret: string) =>
  createHmac('sha256', secret).update(value).digest('base64url');

export function encodeAdminSessionToken(payload: AdminSessionTokenPayload, secret: string) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${body}.${sign(body, secret)}`;
}

export function decodeAdminSessionToken(
  token: string,
  secret: string
): AdminSessionTokenPayload | null {
  const [body, sig] = token.split('.');
  if (!body || !sig || !secret) return null;

  const expected = sign(body, secret);
  const actualBuffer = Buffer.from(sig);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(actualBuffer, expectedBuffer)) return null;

  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as AdminSessionTokenPayload;
  } catch {
    return null;
  }
}
