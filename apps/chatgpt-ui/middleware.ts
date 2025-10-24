import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

/**
 * Clerk authentication middleware for the Weave ChatGPT UI.
 *
 * This middleware uses the same Clerk keys as the next-app to enable
 * Single Sign-On (SSO) across all Weave applications.
 *
 * Configuration:
 * - Public routes: /sign-in, /sign-up, /api/webhook (for Clerk webhooks)
 * - All other routes require authentication
 *
 * @see https://clerk.com/docs/references/nextjs/clerk-middleware
 */

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhook(.*)',
  '/api/proxy(.*)',
  '/api/mcp(.*)',
  '/',
]);

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
