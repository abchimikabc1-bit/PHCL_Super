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
   * Legacy Web3 authentication is
   * intentionally disabled until the
   * following controls are complete:
   *
   * - cryptographically secure nonce
   * - domain and URI binding
   * - chain binding
   * - short expiration
   * - atomic one-time consumption
   * - wallet uniqueness
   * - rate limiting
   * - audit logging
   * - server-controlled user creation
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