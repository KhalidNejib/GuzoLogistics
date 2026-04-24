import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { CreateOrderInput } from '@/lib/orderSchema';

export function useCreateOrder() {
  const { getToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOrder = async (data: CreateOrderInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();

      const response = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create order');
      }

      return result;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { createOrder, isLoading, error };
}
