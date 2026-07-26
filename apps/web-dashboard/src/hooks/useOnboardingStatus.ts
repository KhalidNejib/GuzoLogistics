import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { getApiUrl } from '@/lib/utils';

const API_URL = getApiUrl();

export function useOnboardingStatus() {
  const { getToken, isSignedIn } = useAuth();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null); // null = loading
  const [isApproved, setIsApproved] = useState<boolean | null>(null); // null = loading
  const [isChecking, setIsChecking] = useState(true);
  const [statusError, setStatusError] = useState(false); // true = the status check itself failed (network/5xx), not a real pending state

  const checkStatus = useCallback(async () => {
    if (!isSignedIn) {
      setIsChecking(false);
      return;
    }
    try {
      setIsChecking(true);
      setStatusError(false);
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/v1/merchant/onboarding/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOnboardingCompleted(data.onboardingCompleted);
        setIsApproved(data.isApproved);
      } else {
        // FAIL CLOSED. This used to fail open (treat the merchant as
        // onboarded + approved) whenever this request failed for any reason —
        // a slow Render cold start, a transient 5xx, a CORS misconfig, etc.
        // That meant an unregistered or unapproved merchant could get straight
        // into the full dashboard just by having this one request fail, which
        // is exactly the "anyone can enter the merchant dashboard" bug.
        // Treating an unknown status as "not yet approved" is the safe default;
        // the retry button below lets them recover from a real transient error.
        setStatusError(true);
        setOnboardingCompleted(null);
        setIsApproved(false);
      }
    } catch {
      // Network error — same reasoning as above: fail closed, don't grant access.
      setStatusError(true);
      setOnboardingCompleted(null);
      setIsApproved(false);
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

  return { onboardingCompleted, isApproved, isChecking, markCompleted, statusError, retry: checkStatus };
}