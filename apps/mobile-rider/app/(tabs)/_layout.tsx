import React, { useEffect, useState, useCallback } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { View, Text, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { socketService } from '../../services/socketService';
import { OnboardingModal } from '../../components/OnboardingModal';
import { useLanguage } from '../../services/i18n';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

export const unstable_settings = {
  initialRouteName: 'index',
};

type ApprovalStatus = 'LOADING' | 'PENDING_DATA' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'WRONG_ROLE' | 'DEACTIVATED';

export default function TabLayout() {
  const { isSignedIn, isLoaded, getToken, signOut } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();

  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>('LOADING');
  const [isTerminalInitialized, setIsTerminalInitialized] = useState<boolean | null>(null);
  const [networkStatus, setNetworkStatus] = useState<'LOADING' | 'STABLE' | 'ERROR'>('LOADING');
  const [riderProfile, setRiderProfile] = useState<any>(null);
  const [showOrientation, setShowOrientation] = useState(false);
  const [deactivationError, setDeactivationError] = useState<string>('');

  // Refs to prevent infinite hook dependency updates from unstable helper functions
  const getTokenRef = React.useRef(getToken);
  const isTerminalInitializedRef = React.useRef(isTerminalInitialized);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    isTerminalInitializedRef.current = isTerminalInitialized;
  }, [isTerminalInitialized]);

  // Load persisted terminal initialization state
  useEffect(() => {
    SecureStore.getItemAsync('rider_terminal_initialized').then((val) => {
      setIsTerminalInitialized(val === 'true');
    });
  }, []);

  // ─── Connection Check ─────────────────────────────────────────────────────
  const checkConnection = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${API_URL}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) setNetworkStatus('STABLE');
      else setNetworkStatus('ERROR');
    } catch {
      setNetworkStatus('ERROR');
    }
  }, []);

  // ─── Fetch / refresh approval status ──────────────────────────────────────
  const checkVerification = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      setNetworkStatus('LOADING');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const token = await getTokenRef.current();
      const res = await fetch(`${API_URL}/api/v1/user/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'localtunnel-skip-clearing-house': 'true'
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        setNetworkStatus('STABLE');
        const data = await res.json();
        if (data.role === 'MERCHANT') { setApprovalStatus('WRONG_ROLE'); return; }
        const status: ApprovalStatus = data.riderProfile?.onboardingStatus || 'PENDING_DATA';
        setRiderProfile(data.riderProfile || null);
        if (status === 'APPROVED' && isTerminalInitializedRef.current === false) {
          setShowOrientation(true);
        }
        setApprovalStatus(status);
      } else if (res.status === 403) {
        const errorData = await res.json().catch(() => ({}));
        setNetworkStatus('STABLE');
        setDeactivationError(errorData.message || 'Your account has been deactivated or disabled.');
        setApprovalStatus('DEACTIVATED');
      } else {
        setNetworkStatus('ERROR');
        setApprovalStatus(prev => prev === 'LOADING' ? 'LOADING' : prev);
      }
    } catch {
      setNetworkStatus('ERROR');
      console.warn('Network connection failed during verification check.');
      setApprovalStatus(prev => prev === 'LOADING' ? 'LOADING' : prev);
    }
  }, [isSignedIn]);

  // ─── Submit onboarding from inside the gate (keeps map unmounted) ─────────
  const handleOnboardingSubmit = async (data: any) => {
    const token = await getToken();
    if (!token) throw new Error('Authentication required');
    const res = await fetch(`${API_URL}/api/v1/user/rider-onboarding`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Submission failed');
    }
    // After submit → reload status (will become IN_REVIEW)
    await checkVerification();
  };

  // ─── Verification Check on Mount/Login ─────────────────────────────────────
  useEffect(() => {
    if (isLoaded && !isSignedIn) { router.replace('/(auth)/login'); return; }
    if (isSignedIn && isTerminalInitialized !== null && approvalStatus === 'LOADING') {
      checkVerification();
    }
  }, [isLoaded, isSignedIn, isTerminalInitialized]);

  // ─── Listen for Onboarding Status Changes ──────────────────────────────────
  useEffect(() => {
    if (isSignedIn) {
      const unsub = socketService.on('onboarding_status_changed', (payload: any) => {
        if (payload.status === 'APPROVED' && isTerminalInitializedRef.current === false) {
          setShowOrientation(true);
        }
        setApprovalStatus(payload.status);
      });
      return () => { unsub(); };
    }
  }, [isSignedIn]);


  // ─── Socket Connection ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isSignedIn) {
      socketService.connect(() => getToken());
    }
  }, [isSignedIn, getToken]);

  // ─── Listen for Deactivation (Auth Revocation) ─────────────────────────────
  // Do NOT call signOut() here — that would navigate to login, giving a back route.
  // Instead, lock the UI in-place with the DEACTIVATED wall and let the socket connection
  // receive the real-time reactivation event.
  useEffect(() => {
    if (isSignedIn) {
      const unsub = socketService.on('auth_revoked', (payload: any) => {
        const reason = payload?.reason || 'Your pilot credentials have been suspended or deleted by fleet command.';
        setDeactivationError(reason);
        setNetworkStatus('STABLE'); // prevent network error screen from showing instead
        setApprovalStatus('DEACTIVATED');
      });
      return () => { unsub(); };
    }
  }, [isSignedIn]);


  // ─── Listen for Re-activation ──────────────────────────────────────────────
  useEffect(() => {
    if (isSignedIn) {
      const unsub = socketService.on('account_reactivated', (_payload: any) => {
        // Clear the deactivated gate and re-verify with the server
        setDeactivationError('');
        setApprovalStatus('LOADING');
        checkVerification();
      });
      return () => { unsub(); };
    }
  }, [isSignedIn, checkVerification]);

  // ─── LOADING ──────────────────────────────────────────────────────────────
  if (networkStatus === 'ERROR') {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', padding: 40 }}>
        <View style={{ backgroundColor: 'rgba(244, 63, 94, 0.1)', padding: 20, borderRadius: 30, marginBottom: 20 }}>
          <Feather name="wifi-off" size={40} color="#f43f5e" />
        </View>
        <Text style={{ color: 'white', fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 12 }}>
          {t('startup.connection_failed')}
        </Text>
        <Text style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', marginBottom: 10 }}>
          {t('startup.offline_warning')}
        </Text>

        <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 12, marginBottom: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
          <Text style={{ color: '#6366f1', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginBottom: 4 }}>Target Uplink</Text>
          <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>{API_URL}</Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            checkVerification();
          }}
          style={{ backgroundColor: '#4f46e5', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 16, width: '100%', alignItems: 'center' }}
        >
          <Text style={{ color: 'white', fontWeight: '900' }}>Retry Connection</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setNetworkStatus('STABLE')}
          style={{ marginTop: 20 }}
        >
          <Text style={{ color: '#64748b', fontWeight: 'bold' }}>Try Anyway (Offline Mode)</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (networkStatus === 'LOADING') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={{ marginTop: 16, color: '#475569', fontWeight: 'bold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2 }}>
          {t('home.establishing_uplink')}
        </Text>
      </View>
    );
  }

  // ─── PENDING_DATA: Show registration form — NO map rendered at all ─────────
  if (approvalStatus === 'PENDING_DATA') {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
        <OnboardingModal
          visible={true}
          getToken={getToken}
          initialData={riderProfile}
          onComplete={handleOnboardingSubmit}
        />
      </View>
    );
  }

  // ─── DEACTIVATED: Must be checked FIRST — before network error screen ────────
  // This prevents the "Try Anyway" network error button from bypassing the wall.
  if (approvalStatus === 'DEACTIVATED') {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center', padding: 32 }}>

        {/* Pulsing danger icon */}
        <View style={{ width: 110, height: 110, backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 55, alignItems: 'center', justifyContent: 'center', marginBottom: 28, borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.25)' }}>
          <MaterialCommunityIcons name="shield-lock" size={54} color="#ef4444" />
        </View>

        {/* Title */}
        <Text style={{ fontSize: 22, fontWeight: '900', color: '#ef4444', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
          Access Revoked
        </Text>

        <Text style={{ fontSize: 13, fontWeight: '900', color: '#64748b', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 24 }}>
          Fleet Command Decision
        </Text>

        {/* Reason box */}
        <View style={{ backgroundColor: 'rgba(239,68,68,0.07)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', borderRadius: 20, padding: 20, marginBottom: 36, width: '100%' }}>
          <Text style={{ color: '#94a3b8', textAlign: 'center', fontWeight: '500', lineHeight: 22, fontSize: 13 }}>
            {deactivationError || 'Your pilot credentials have been permanently suspended by fleet command.'}
          </Text>
        </View>

        {/* Contact info chip */}
        <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 100, paddingHorizontal: 20, paddingVertical: 10, marginBottom: 40 }}>
          <Text style={{ color: '#334155', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 }}>
            Contact Your Fleet Manager
          </Text>
        </View>
      </View>
    );
  }

  // ─── BLOCKED: IN_REVIEW / REJECTED / WRONG_ROLE ──────────────────────────
  if (approvalStatus !== 'APPROVED') {
    const isRejected = approvalStatus === 'REJECTED';
    const isWrongRole = approvalStatus === 'WRONG_ROLE';

    const iconName = isWrongRole ? 'store-off' : isRejected ? 'alert-octagon' : 'account-clock';
    const iconColor = isWrongRole ? '#f59e0b' : isRejected ? '#ef4444' : '#6366f1';
    const iconBg = isWrongRole ? '#1c1700' : isRejected ? '#1c0000' : '#1e1b4b';

    const title = isWrongRole ? 'Wrong Terminal'
      : isRejected ? 'Application Rejected'
        : 'Awaiting Clearance';

    const message = isWrongRole
      ? 'You are signed in as a Merchant. This app is for Logistics Pilots only.'
      : isRejected
        ? 'Your pilot application was not approved. Contact your fleet manager for details.'
        : 'Your registration was submitted and is being reviewed by your fleet manager.\n\nThe map, orders, profile, and all features are completely locked until you are approved.';

    return (
      <View style={{ flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 32 }}>

        {/* Icon */}
        <View style={{ width: 96, height: 96, backgroundColor: iconBg, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 28, shadowColor: iconColor, shadowOpacity: 0.5, shadowRadius: 24 }}>
          <MaterialCommunityIcons name={iconName as any} size={50} color={iconColor} />
        </View>

        {/* Title */}
        <Text style={{ fontSize: 22, fontWeight: '900', color: 'white', textAlign: 'center', textTransform: 'uppercase', letterSpacing: -0.5, marginBottom: 14 }}>
          {title}
        </Text>

        {/* Message */}
        <Text style={{ color: '#475569', textAlign: 'center', fontWeight: '500', lineHeight: 22, fontSize: 13, marginBottom: 40, maxWidth: 300 }}>
          {message}
        </Text>

        {/* Status chip */}
        <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 100, paddingHorizontal: 20, paddingVertical: 10, marginBottom: 36 }}>
          <Text style={{ color: '#334155', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 }}>
            STATUS: {approvalStatus.replace('_', ' ')}
          </Text>
        </View>

        {/* "Check Status" — only for IN_REVIEW */}
        {approvalStatus === 'IN_REVIEW' && (
          <TouchableOpacity
            onPress={checkVerification}
            style={{ width: '100%', backgroundColor: '#4f46e5', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 12 }}
          >
            <Text style={{ color: 'white', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, fontSize: 11 }}>
              🔄  Check Approval Status
            </Text>
          </TouchableOpacity>
        )}

        {/* Sign out — only escape */}
        <TouchableOpacity onPress={() => signOut()} style={{ paddingVertical: 14, paddingHorizontal: 32 }}>
          <Text style={{ color: '#334155', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1.5, fontSize: 10 }}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── APPROVED: First-time welcome screen ───────────────────────────────────
  if (showOrientation) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <BlurView intensity={20} tint="dark" style={{ position: 'absolute', width: '100%', height: '100%' }} />
        <View style={{ width: 120, height: 120, backgroundColor: '#10b981', borderRadius: 60, alignItems: 'center', justifyContent: 'center', shadowColor: '#10b981', shadowOpacity: 0.5, shadowRadius: 24, marginBottom: 32 }}>
          <MaterialCommunityIcons name="check-decagram" size={64} color="white" />
        </View>
        <Text style={{ fontSize: 26, fontWeight: '900', color: 'white', textAlign: 'center', textTransform: 'uppercase', letterSpacing: -1, marginBottom: 16 }}>
          Welcome to the Fleet
        </Text>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 40 }}>
          <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>Deployment Notice</Text>
          <Text style={{ color: 'white', fontSize: 14, fontWeight: '500', lineHeight: 22, marginBottom: 20 }}>
            Your application has been verified. You are now authorized to accept missions.
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <Ionicons name="shield-checkmark" size={20} color="#10b981" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'white', fontSize: 13, fontWeight: '900', marginBottom: 4 }}>Legal Compliance</Text>
              <Text style={{ color: '#94a3b8', fontSize: 11, lineHeight: 18 }}>
                Before your first mission, review the{' '}
                <Text style={{ color: '#6366f1', fontWeight: 'bold' }}>National Logistics Laws</Text>
                {' '}in your profile.
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={async () => {
            await SecureStore.setItemAsync('rider_terminal_initialized', 'true');
            setIsTerminalInitialized(true);
            setShowOrientation(false);
          }}
          style={{ width: '100%', backgroundColor: '#10b981', paddingVertical: 20, borderRadius: 20, alignItems: 'center' }}
        >
          <Text style={{ color: 'white', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, fontSize: 12 }}>
            Initialize Terminal
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── APPROVED + orientation done → full app (map loads here for first time) ─
  return (
    <Tabs screenOptions={{ tabBarShowLabel: false, tabBarStyle: { display: 'none' }, headerShown: false }}>
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="two" options={{ href: null }} />
    </Tabs>
  );
}