import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { getApiUrl } from '@/lib/utils';

const API_URL = getApiUrl();

export function useOnboardingStatus() {
  const { getToken, isSignedIn } = useAuth();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null); // null = loading
  const [isApproved, setIsApproved] = useState<boolean | null>(null); // null = loading
  const [isChecking, setIsChecking] = useState(true);

  const checkStatus = useCallback(async () => {
    if (!isSignedIn) {
      setIsChecking(false);
      return;
    }
    try {
      setIsChecking(true);
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/v1/merchant/onboarding/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOnboardingCompleted(data.onboardingCompleted);
        setIsApproved(data.isApproved);
      } else {
        // If endpoint fails (e.g. server down), don't block the user
        setOnboardingCompleted(true);
        setIsApproved(true);
      }
    } catch {
      // Network error — don't force onboarding, just let them in
      setOnboardingCompleted(true);
      setIsApproved(true);
    } finally {
      setIsChecking(false);
    }
  }, [getToken, isSignedIn]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const markCompleted = () => {
    setOnboardingCompleted(true);
    setIsApproved(false); // Once onboarding is completed, they enter review/not yet approved
  };

  return { onboardingCompleted, isApproved, isChecking, markCompleted };
}
