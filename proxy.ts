import type {
  NextRequest,
} from 'next/server';

import {
  NextResponse,
} from 'next/server';

const CANONICAL_HOSTNAME =
  'www.phclsuper.com';

const APEX_HOSTNAME =
  'phclsuper.com';

/**
 * Resolves the request hostname while
 * safely handling reverse proxies,
 * explicit ports and IPv6 addresses.
 */
function getRequestHostname(
  request: NextRequest
): string {
  const forwardedHost =
    request.headers
      .get('x-forwarded-host')
      ?.split(',')[0]
      ?.trim();

  const host =
    forwardedHost ||
    request.headers
      .get('host')
      ?.trim() ||
    request.nextUrl.host;

  if (!host) {
    return '';
  }

  /*
   * Handle IPv6 hosts such as
   * [::1]:3000 without splitting
   * the embedded colons.
   */
  if (host.startsWith('[')) {
    const closingBracket =
      host.indexOf(']');

    if (
      closingBracket !== -1
    ) {
      return host
        .slice(
          1,
          closingBracket
        )
        .toLowerCase();
    }
  }

  return host
    .split(':')[0]
    .toLowerCase();
}

/**
 * Next.js 16 network-boundary proxy.
 *
 * This proxy performs only the
 * production canonical-host redirect.
 *
 * It is not the Admin authorization
 * authority. Protected Admin routes
 * remain enforced by the server-side
 * protected Admin layout.
 */
export function proxy(
  request: NextRequest
) {
  const {
    pathname,
    search,
  } = request.nextUrl;

  const hostname =
    getRequestHostname(
      request
    );

  if (
    hostname ===
    APEX_HOSTNAME
  ) {
    const targetLocation =
      `https://${CANONICAL_HOSTNAME}${pathname}${search}`;

    return new NextResponse(
      null,
      {
        status: 308,

        headers: {
          Location:
            targetLocation,
        },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next|.*\\..*).*)',
  ],
};