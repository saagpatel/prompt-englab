import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { generateCsrfToken } from '@/lib/middleware/csrf';
import { securityHeaders } from '@/lib/middleware/security';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();

  // Add security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  response.headers.set('x-request-id', requestId);

  // Generate CSRF token for each request if not present
  if (!request.cookies.has('csrf-token')) {
    const token = generateCsrfToken();
    response.cookies.set('csrf-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
