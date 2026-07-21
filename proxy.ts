import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'phcl_admin_session';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ruhusu login page na API zipite.
  if (pathname === '/admin/login' || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Linda admin pages.
  if (pathname.startsWith('/admin')) {
    const adminSession = request.cookies.get(COOKIE_NAME)?.value;
    if (!adminSession) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};