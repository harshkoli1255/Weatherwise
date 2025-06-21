
import { clerkMiddleware } from '@clerk/nextjs/server';

// This is the most basic Clerk middleware configuration.
// It will initialize Clerk on all routes but does not protect any of them by default.
// We are using this simplified version to ensure the application starts without crashing.
export default clerkMiddleware();

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
