import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Toaster } from 'sonner';

// Pages
import DashboardPage from '@/pages/dashboard/DashboardPage';
import OrdersPage from '@/pages/orders/OrdersPage';
import TrackingPage from '@/pages/tracking/TrackingPage';
import PublicTrackingPage from '@/pages/tracking/PublicTrackingPage';
import SettingsPage from '@/pages/settings/SettingsPage';
import SignInPage from '@/pages/auth/SignInPage';
import SignUpPage from '@/pages/auth/SignUpPage';

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
                <AdminLayout>
                  <Routes>
                    <Route index element={<DashboardPage />} />
                    <Route path="orders" element={<OrdersPage />} />
                    <Route path="tracking" element={<TrackingPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </AdminLayout>
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
