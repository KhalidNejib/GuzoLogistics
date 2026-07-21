/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { getApiUrl } from '@/lib/utils';

// Force dynamic resolution to bypass cached .env values during HMR
const API_URL = getApiUrl();

export function useMerchantProfile() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/merchant/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch profile');
      const data = await response.json();
      setProfile(data.merchant);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn]);

  const updateProfile = async (updates: any) => {
    setIsUpdating(true);
    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/api/merchant/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update profile');
      const data = await response.json();
      setProfile(data.merchant);
      return data;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchProfile();
    }
  }, [isLoaded, isSignedIn]);

  return { profile, isLoading, isUpdating, error, updateProfile, refetch: fetchProfile };
}
