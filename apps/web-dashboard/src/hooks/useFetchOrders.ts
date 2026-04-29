/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';

export function useFetchOrders() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const retryCount = useRef(0);
  const maxRetries = 3;

  const fetchOrders = useCallback(async () => {
    // If Clerk isn't loaded yet, don't even try.
    if (!isLoaded) return;

    // If user is not signed in, we can stop loading.
    if (!isSignedIn) {
      setIsLoading(false);
      return;
    }

    // We only set isLoading to true if it's the first time or a refetch.
    // If we already have orders, we can fetch in the background.
    if (orders.length === 0) setIsLoading(true);

    try {
      const token = await getToken();

      if (!token) {
        // If no token, wait 500ms and try again (up to maxRetries)
        if (retryCount.current < maxRetries) {
          retryCount.current++;
          setTimeout(fetchOrders, 500);
          return;
        }
        setIsLoading(false);
        return;
      }

      const response = await fetch('http://localhost:5000/api/orders', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Handle session expiration or race conditions
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
      retryCount.current = 0; // Reset on success
    } catch (err: any) {
      console.error('Fetch Orders Error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn, orders.length]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchOrders();
    } else if (isLoaded && !isSignedIn) {
      setIsLoading(false);
    }
  }, [isLoaded, isSignedIn]);

  return {
    orders,
    isLoading,
    error,
    refetch: fetchOrders,
  };
}
