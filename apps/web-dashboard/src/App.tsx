import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, useClerk } from '@clerk/clerk-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Toaster } from 'sonner';

// Auth & onboarding — always eagerly loaded (critical path)
import SignInPage from '@/pages/auth/SignInPage';
import SignUpPage from '@/pages/auth/SignUpPage';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

// Route-level code splitting — lazy load each page
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const OrdersPage = lazy(() => import('@/pages/orders/OrdersPage'));
const TrackingPage = lazy(() => import('@/pages/tracking/TrackingPage'));
const PublicTrackingPage = lazy(() => import('@/pages/tracking/PublicTrackingPage'));
const FleetPage = lazy(() => import('@/pages/fleet/FleetPage'));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'));

function PageLoader() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center animate-pulse">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z"/>
          </svg>
        </div>
        <p className="text-white/60 text-sm font-bold animate-pulse">Loading...</p>
      </div>
    </div>
  );
}


function ProtectedApp() {
  const { onboardingCompleted, isApproved, isChecking, markCompleted } = useOnboardingStatus();
  const { signOut } = useClerk();

  // Fullscreen loading while we check onboarding status
  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center animate-pulse">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z"/>
            </svg>
          </div>
          <p className="text-white/60 text-sm font-bold animate-pulse">Initializing your account...</p>
        </div>
      </div>
    );
  }

  // New merchant — show wizard fullscreen
  if (onboardingCompleted === false) {
    return <OnboardingWizard onComplete={markCompleted} />;
  }

  // Merchant pending verification — show gorgeous locked screen
  if (isApproved === false) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center">
          {/* Pulsing Shield Icon */}
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-6 animate-pulse">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">Pending Verification</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Thank you for completing your onboarding! Our administrative team is currently verifying your business documents. We will notify you by email once your merchant account is active.
          </p>

          {/* Contact Details Card */}
          <div className="w-full bg-slate-950/50 border border-slate-800/60 rounded-2xl p-4 mb-8 text-left text-xs gap-3 flex flex-col">
            <div className="flex items-center gap-3 text-slate-400">
              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>support@guzologistics.com</span>
            </div>
            <div className="flex items-center gap-3 text-slate-400">
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>+251 900 11 22 33</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-3">
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-white transition-colors duration-200"
            >
              Refresh Status
            </button>
            <button 
              onClick={() => signOut()}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-slate-300 transition-colors duration-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Existing merchant — show full dashboard
  return (
    <AdminLayout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route index element={<DashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="tracking" element={<TrackingPage />} />
          <Route path="fleet" element={<FleetPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AdminLayout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors closeButton />
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/sign-in/*" element={<SignInPage />} />
        <Route path="/sign-up/*" element={<SignUpPage />} />
        <Route path="/track/:token" element={
          <Suspense fallback={<PageLoader />}>
            <PublicTrackingPage />
          </Suspense>
        } />

        {/* PROTECTED ROUTES */}
        <Route
          path="/*"
          element={
            <>
              <SignedIn>
                <ProtectedApp />
              </SignedIn>
              <SignedOut>
                <Navigate to="/sign-in" replace />
              </SignedOut>
            </>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
