import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const CANONICAL_HOSTNAME =
  'www.phclsuper.com';

const APEX_HOSTNAME =
  'phclsuper.com';

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
   * Handle IPv6 hosts such as [::1]:3000
   * without breaking on the embedded colons.
   */
  if (host.startsWith('[')) {
    const closingBracket =
      host.indexOf(']');

    if (closingBracket !== -1) {
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

export function middleware(
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

  /*
   * Canonical production-domain redirect only.
   *
   * Do not use middleware as the Admin security
   * authority. Protected Admin routes are enforced
   * by the server-side protected Admin layout, which
   * validates both the signed Admin session and the
   * trusted-device session against Firestore.
   */
  if (hostname === APEX_HOSTNAME) {
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
