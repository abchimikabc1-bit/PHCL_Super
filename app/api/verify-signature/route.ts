import {
  NextResponse,
} from 'next/server';

export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';

const NO_STORE_HEADERS = {
  'Cache-Control':
    'no-store, max-age=0',
  Pragma:
    'no-cache',
};

export async function POST():
  Promise<NextResponse> {
  /*
   * SECURITY LOCKDOWN:
   *
   * Legacy wallet-signature verification
   * is intentionally disabled.
   *
   * It must not issue Firebase custom
   * tokens until Web3 authentication has:
   *
   * - an EIP-4361-style signed message
   * - secure server-generated nonce
   * - domain, URI and chain binding
   * - expiration and issued-at validation
   * - atomic one-time nonce consumption
   * - replay and concurrency protection
   * - wallet uniqueness enforcement
   * - rate limiting and audit logging
   * - server-controlled Firebase identity
   * - safe customer-profile association
   */
  return NextResponse.json(
    {
      ok: false,
      code:
        'WEB3_AUTH_TEMPORARILY_DISABLED',
      message:
        'Web3 Wallet Login is temporarily unavailable while security verification is being completed.',
    },
    {
      status: 503,
      headers: {
        ...NO_STORE_HEADERS,
        'Retry-After':
          '3600',
      },
    }
  );
}