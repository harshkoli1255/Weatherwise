
import { NextResponse, type NextRequest } from 'next/server';

// This is a placeholder middleware to ensure the server starts.
// Authentication functionality is temporarily disabled.
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
