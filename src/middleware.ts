// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Kurasa zote za usimamizi (admin) zinazotakiwa kulindwa Edge
const protectedRoutes = [
  '/admin/dashboard', 
  '/admin/products', 
  '/admin/currencies', 
  '/admin/languages', 
  '/admin/analytics', 
  '/admin/users', 
  '/admin/settings'
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Angalia kama njia inayotafutwa ipo kwenye orodha ya kulindwa
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    // Kusoma secure httpOnly cookie ya admin session kutoka kwenye kivinjari
    const adminSession = request.cookies.get('admin_session')?.value;

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
