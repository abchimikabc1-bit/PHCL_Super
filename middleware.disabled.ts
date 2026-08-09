import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protected admin routes
const protectedRoutes = ['/admin/dashboard', '/admin/products', '/admin/currencies', '/admin/languages', '/admin/analytics', '/admin/users', '/admin/settings'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route is protected
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    // Check for admin session in cookies
    const adminSession = request.cookies.get('admin_session')?.value;

    if (!adminSession) {
      // Redirect to login if no session
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
