import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Toaster } from 'sonner';

// Pages
import DashboardPage from '@/pages/dashboard/DashboardPage';
import OrdersPage from '@/pages/orders/OrdersPage';
import TrackingPage from '@/pages/tracking/TrackingPage';
import PublicTrackingPage from '@/pages/tracking/PublicTrackingPage';
import FleetPage from '@/pages/fleet/FleetPage';
import SettingsPage from '@/pages/settings/SettingsPage';
import SignInPage from '@/pages/auth/SignInPage';
import SignUpPage from '@/pages/auth/SignUpPage';

// Onboarding
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

function ProtectedApp() {
  const { onboardingCompleted, isChecking, markCompleted } = useOnboardingStatus();

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

  // Existing merchant — show full dashboard
  return (
    <AdminLayout>
      <Routes>
        <Route index element={<DashboardPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="tracking" element={<TrackingPage />} />
        <Route path="fleet" element={<FleetPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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
        <Route path="/track/:token" element={<PublicTrackingPage />} />

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
