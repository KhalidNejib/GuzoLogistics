import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

export function useFetchOrders() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!isLoaded || !isSignedIn) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Give Clerk a tiny moment to stabilize session on refresh
      await new Promise((r) => setTimeout(r, 100));

      const token = await getToken();

      if (!token) {
        console.warn('⚠️ [useFetchOrders] No token available yet.');
        setIsLoading(false);
        return;
      }

      console.debug('📡 [useFetchOrders] Fetching orders...', {
        url: 'http://localhost:5000/api/orders',
        tokenPrefix: token.slice(0, 10),
      });

      let response = await fetch('http://localhost:5000/api/orders', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // 2. RETRY LOGIC: If we get a 401, wait a bit and try one more time.
      // This helps with race conditions where the session is transitioning.
      if (response.status === 401) {
        console.warn('⚠️ [useFetchOrders] Got 401, retrying in 800ms...');
        await new Promise((r) => setTimeout(r, 800));
        const newToken = await getToken();
        response = await fetch('http://localhost:5000/api/orders', {
          headers: {
            Authorization: `Bearer ${newToken}`,
          },
        });
      }

      if (!response.ok) {
        const result = await response.json();
        console.error('❌ [useFetchOrders] API Error:', response.status, result);
        throw new Error(result.error || 'Failed to fetch orders');
      }

      const result = await response.json();
      setOrders(result.orders || []);
    } catch (err) {
      console.error('❌ [useFetchOrders] Fetch Error:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    if (isSignedIn && isLoaded) {
      fetchOrders();
    }
  }, [isSignedIn, isLoaded]); // Simplified dependency array to prevent loops

  return { orders, isLoading, error, refetch: fetchOrders };
}
