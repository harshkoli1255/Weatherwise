
import { clerkMiddleware } from '@clerk/nextjs/server';

// This is the most basic Clerk middleware configuration.
// It initializes Clerk on all routes but does not protect any of them by default.
// This simplified version is being used to ensure the application can start without crashing.
export default clerkMiddleware();

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
