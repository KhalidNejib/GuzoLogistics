/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Sentry from '@sentry/react';
import { ClerkProvider, ClerkLoaded } from '@clerk/clerk-react';
import { clerkConfig } from '@ethio-logistics/env';
import { ReactNode, useMemo } from 'react';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';

// Initialise Sentry — graceful no-op if VITE_SENTRY_DSN is not configured
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN as string,
    environment: import.meta.env.MODE,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,
    // Don't send events during development unless DSN explicitly set
    enabled: import.meta.env.PROD,
  });
}

function GlobalErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-destructive/5 p-6 text-center text-destructive">
      <h1 className="text-2xl font-bold mb-2">System Error</h1>
      <p className="max-w-md opacity-80 mb-4">
        {(error as any)?.message || 'An unexpected runtime error occurred.'}
      </p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-colors"
      >
        Reload Dashboard
      </button>
    </div>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const PUBLISHABLE_KEY = useMemo(() => clerkConfig.publishableKey, []);

  if (!PUBLISHABLE_KEY) {
    const errorMsg = '❌ CRITICAL: Missing VITE_CLERK_PUBLISHABLE_KEY in .env';
    console.error(errorMsg);
    if (import.meta.env.DEV) throw new Error(errorMsg);
  }

  return (
    <ErrorBoundary
      FallbackComponent={GlobalErrorFallback}
      onError={(error, info) => {
        // Forward caught React tree errors to Sentry
        Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
      }}
    >
      <ClerkProvider
        publishableKey={PUBLISHABLE_KEY}
        afterSignOutUrl="/"
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
      >
        {/* This wrapper ensures the App only renders AFTER Clerk is ready */}
        <ClerkLoaded>{children}</ClerkLoaded>
      </ClerkProvider>
    </ErrorBoundary>
  );
}

