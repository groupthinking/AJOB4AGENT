import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Admin-only routes
    if (path.startsWith('/admin') && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    // Premium-only routes
    if (path.startsWith('/premium') && !['ADMIN', 'PREMIUM'].includes(token?.role as string)) {
      return NextResponse.redirect(new URL('/upgrade', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/settings/:path*',
    '/applications/:path*',
    '/admin/:path*',
    '/premium/:path*',
  ],
};
