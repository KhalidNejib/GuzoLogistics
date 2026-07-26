/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';

import { getApiUrl } from '@/lib/utils';
const API_URL = getApiUrl();

export function useFetchOrders() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const retryCount = useRef(0);
  const maxRetries = 3;

  const fetchOrders = useCallback(async () => {
    // If Clerk isn't loaded yet, don't even try.
    if (!isLoaded || !isSignedIn) {
      if (isLoaded && !isSignedIn) setIsLoading(false);
      return;
    }

    // We can use a functional check or just use the current state since we are in a callback
    // To avoid dependency loop, we don't include orders.length in the dependency array
    setIsLoading(true);

    try {
      const token = await getToken();

      if (!token) {
        if (retryCount.current < maxRetries) {
          retryCount.current++;
          await new Promise((r) => setTimeout(r, 1000));
          return fetchOrders();
        }
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/api/v1/orders?limit=500&t=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401 && retryCount.current < maxRetries) {
        retryCount.current++;
        await new Promise((r) => setTimeout(r, 1000));
        return fetchOrders();
      }

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();
      setOrders(data.orders || []);
      setError(null);
      retryCount.current = 0;
    } catch (err: any) {
      console.error('Fetch Orders Error:', err);

      // If it's a network error (Failed to fetch), retry
      if (err.message === 'Failed to fetch' && retryCount.current < maxRetries) {
        retryCount.current++;
        await new Promise((r) => setTimeout(r, 1500));
        return fetchOrders();
      }

      setError(err.message);
    } finally {
      // Only set loading to false if we are not retrying
      if (retryCount.current === 0 || retryCount.current >= maxRetries) {
        setIsLoading(false);
      }
    }
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchOrders();
    } else if (isLoaded && !isSignedIn) {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  return {
    orders,
    setOrders,
    isLoading,
    error,
    refetch: fetchOrders,
  };
}