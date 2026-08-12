// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_LOGIN_PATH = '/admin/login';
const ADMIN_AUTH_API_PATH = '/api/admin/auth';
const ADMIN_COOKIE_NAME = 'phcl_admin_session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminSession = request.cookies.get(ADMIN_COOKIE_NAME)?.value;

  if (pathname.startsWith('/api/admin')) {
    if (pathname === ADMIN_AUTH_API_PATH) {
      return NextResponse.next();
    }
    if (!adminSession) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  if (pathname === ADMIN_LOGIN_PATH) {
    if (adminSession) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    return NextResponse.next();
  }

  if (!adminSession) {
    const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
    loginUrl.searchParams.set('redirect', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
