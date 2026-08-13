// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_SESSION_COOKIE_NAME } from '@/lib/admin-auth-constants';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    // Kusoma secure httpOnly cookie ya admin session kutoka kwenye kivinjari
    const adminSession = request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;

    if (!adminSession) {
      // Kama session haipo, mfumo unamzuia na kumrudisha kwenye Login mara moja
      const loginUrl = new URL('/admin/login', request.url);
      
      // Mbinu ya Kisasa: Tunahifadhi njia aliyotaka kwenda ili arudishwe huko baada ya kufanikiwa ku-login
      loginUrl.searchParams.set('redirect', pathname);
      
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// Config matcher ya Next.js kulinda njia zote za admin kiotomatiki
export const config = {
  matcher: ['/admin/:path*'],
};
