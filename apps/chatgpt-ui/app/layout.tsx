import './globals.css';
import { ClerkProvider, SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';

export const metadata = { title: 'Weave - Memory Platform' };

/**
 * Root layout with Clerk authentication integration.
 *
 * This layout wraps the entire application with ClerkProvider to enable
 * Single Sign-On (SSO) with the next-app using shared Clerk keys.
 *
 * Features:
 * - ClerkProvider: Enables authentication across the app
 * - UserButton: Shows user profile/sign-out when authenticated
 * - SignInButton: Shows sign-in option when not authenticated
 *
 * @see https://clerk.com/docs/components/authentication/signed-in
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <header className="fixed top-0 right-0 p-4 z-50">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

