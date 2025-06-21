
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Protect the alerts page, making it accessible only to signed-in users.
const isProtectedRoute = createRouteMatcher([
  '/alerts(.*)',
]);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) {
    auth().protect();
  }
});

export const config = {
  // The following matcher runs middleware on all routes
  // except static assets.
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
