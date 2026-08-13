import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_PROTECTED_PATHS = [
  '/admin/dashboard',
  '/admin/products',
  '/admin/currencies',
  '/admin/languages',
  '/admin/analytics',
  '/admin/users',
  '/admin/settings',
];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get('host') || '';
  const normalizedHost = host.toLowerCase();
  const isAppHostingDefaultDomain = normalizedHost.endsWith('.hosted.app');

  if (
    normalizedHost &&
    !normalizedHost.startsWith('localhost') &&
    !normalizedHost.startsWith('127.0.0.1') &&
    !normalizedHost.startsWith('[::1]') &&
    !normalizedHost.startsWith('www.') &&
    !isAppHostingDefaultDomain
  ) {
    const targetLocation = pathname === '/'
      ? `https://www.phclsuper.com${search}`
      : `https://www.phclsuper.com${pathname}${search}`;
    return new NextResponse(null, {
      status: 308,
      headers: {
        Location: targetLocation,
      },
    });
  }

  if (ADMIN_PROTECTED_PATHS.some((route) => pathname.startsWith(route))) {
    const adminSession = request.cookies.get('phcl_admin_session')?.value;
    if (!adminSession) {
      return new NextResponse(null, {
        status: 307,
        headers: {
          Location: new URL('/admin/login', request.url).toString(),
        },
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
