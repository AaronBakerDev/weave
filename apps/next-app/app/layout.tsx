/**
 * Root Layout with ChatGPT Sandbox Patches
 *
 * This layout includes 7 critical browser patches for ChatGPT's triple-iframe sandbox:
 * 1. Asset loading (baseURI)
 * 2. History interception (prevent URL leakage)
 * 3. Fetch rewriting (same-origin requests)
 * 4. External link handling (open in new window)
 * 5. DOM mutation handling
 * 6. CORS headers
 * 7. Base URL resolution
 */

import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { ClerkProvider, SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export const metadata: Metadata = {
  title: "Weave - Memory Canvas",
  description: "Explorable memory space inside ChatGPT",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
      <head>
        {/* Patch 1: Set base URL for asset loading in ChatGPT sandbox */}
        <base href={process.env.NEXT_PUBLIC_ASSET_PREFIX || "/"} />

        {/* Patches 2-7: JavaScript sandbox compatibility */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Patch 2: Intercept history.pushState to prevent URL leakage
                const originalPushState = history.pushState;
                const originalReplaceState = history.replaceState;

                history.pushState = function(...args) {
                  if (window.openai) return; // Inside ChatGPT, skip
                  return originalPushState.apply(this, args);
                };

                history.replaceState = function(...args) {
                  if (window.openai) return; // Inside ChatGPT, skip
                  return originalReplaceState.apply(this, args);
                };

                // Patch 3: Rewrite fetch for same-origin requests
                const originalFetch = window.fetch;
                window.fetch = function(url, options) {
                  if (typeof url === 'string' && url.startsWith('/')) {
                    const baseUrl = new URL(document.baseURI);
                    url = baseUrl.origin + url;
                  }
                  return originalFetch.apply(this, arguments);
                };

                // Patch 4: Handle external links (open in new window in ChatGPT)
                document.addEventListener('click', (e) => {
                  const link = e.target.closest('a');
                  if (link && link.href && link.target !== '_blank') {
                    const isExternal = !link.href.startsWith('/') &&
                                      !link.href.startsWith(window.location.origin);
                    if (isExternal) {
                      e.preventDefault();
                      window.open(link.href, '_blank');
                    }
                  }
                }, true);

                // Patch 5: Handle DOM mutations (prevent errors from third-party code)
                if (window.MutationObserver) {
                  const originalMO = window.MutationObserver;
                  window.MutationObserver = class extends originalMO {
                    constructor(callback) {
                      super((...args) => {
                        try {
                          callback(...args);
                        } catch (e) {
                          console.warn('MutationObserver error (ignored):', e);
                        }
                      });
                    }
                  };
                }

                // Patch 6: Ensure CORS headers for cross-origin requests
                const originalXHR = window.XMLHttpRequest;
                window.XMLHttpRequest = class extends originalXHR {
                  setRequestHeader(header, value) {
                    if (header.toLowerCase() === 'x-requested-with') {
                      return; // Skip to avoid CORS issues
                    }
                    return super.setRequestHeader(header, value);
                  }
                };

                // Patch 7: Expose window context for ChatGPT detection
                if (!window.openai) {
                  window.openai = { isInSandbox: true };
                }
              })();
            `,
          }}
        />
      </head>
      <body className="bg-white text-gray-900">
        <Providers>
          <header className="border-b border-gray-200">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
              <a href="/" className="flex items-center gap-2">
                <span className="text-2xl">✨</span>
                <span className="text-lg font-semibold">Weave</span>
              </a>
              <nav className="text-sm flex items-center gap-4">
                <a href="/canvas" className="text-blue-700 hover:underline">Canvas</a>
                <a href="/search" className="text-blue-700 hover:underline">Search</a>
                <a href="/u/demo" className="text-gray-700 hover:underline">Profile</a>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="text-blue-700 hover:underline">Sign In</button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700">Sign Up</button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <UserButton afterSignOutUrl="/" />
                </SignedIn>
              </nav>
            </div>
          </header>
          {children}
        </Providers>
      </body>
    </html>
    </ClerkProvider>
  );
}
