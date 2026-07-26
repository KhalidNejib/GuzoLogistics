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
  const [wrongRole, setWrongRole] = useState(false); // true = this account isn't a MERCHANT at all (e.g. signed in with a rider account) — retrying won't help

  const checkStatus = useCallback(async () => {
    if (!isSignedIn) {
      setIsChecking(false);
      return;
    }
    try {
      setIsChecking(true);
      setStatusError(false);
      setWrongRole(false);
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/v1/merchant/onboarding/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOnboardingCompleted(data.onboardingCompleted);
        setIsApproved(data.isApproved);
      } else if (res.status === 403) {
        // A 403 here (as opposed to a network/5xx failure) means we DID reach
        // the server and it explicitly rejected this account — almost always
        // because it's signed in with a non-MERCHANT account (e.g. a RIDER
        // account reused on the web dashboard). This is not transient, so
        // don't lump it in with statusError / suggest retrying — tell the
        // person directly instead.
        setWrongRole(true);
        setOnboardingCompleted(null);
        setIsApproved(false);
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

  return { onboardingCompleted, isApproved, isChecking, markCompleted, statusError, wrongRole, retry: checkStatus };
}