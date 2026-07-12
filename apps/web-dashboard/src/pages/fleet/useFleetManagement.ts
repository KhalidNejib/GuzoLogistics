/* eslint-disable @typescript-eslint/no-explicit-any, no-empty, @typescript-eslint/no-unused-vars */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useSocket } from '@/hooks/useSocket';
import { getApiUrl } from '@/lib/utils';

const API_URL = getApiUrl();

export interface RiderStat {
  riderId: string;
  fullName: string;
  phoneNumber?: string;
  totalDeliveries: number;
  totalRevenue: number;
  avgDeliveryTimeMs?: number;
  cashHeld: number;
  balance: number;
  disabled?: boolean;
  profilePhotoUrl?: string;
  vehicle?: string;
  vehicleDetails?: {
    make: string;
    model: string;
    color: string;
    plate: string;
    year: number;
    faydaIdPhotoUrl?: string;
    licensePhotoUrl?: string;
    licenseNumber?: string;
    vehiclePhotoUrl?: string;
    emergencyContact?: {
      name: string;
      phone: string;
      relationship: string;
    };
  };
  onboardingStatus?: 'PENDING_DATA' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';
}

export function useFleetManagement() {
  const { getToken } = useAuth();
  const { socket } = useSocket();

  const [riders, setRiders] = useState<RiderStat[]>([]);
  const [pendingPilots, setPendingPilots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchRiders = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();

      const [ridersRes, pendingRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/merchant/rider-leaderboard`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/v1/merchant/pending-pilots`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (ridersRes.ok) setRiders(await ridersRes.json());
      if (pendingRes.ok) setPendingPilots(await pendingRes.json());
    } catch (err) {
      console.error('Failed to fetch fleet data', err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchRiders();
  }, [fetchRiders]);

  useEffect(() => {
    if (!socket) return;

    // New application submitted by a rider
    const handleNewPilot = (payload: any) => {
      setPendingPilots((prev) => {
        if (prev.find((p) => p.user._id === payload.user._id)) return prev;
        return [payload, ...prev];
      });
      setMessage({ text: `New Pilot Application from ${payload.user.fullName}!`, type: 'success' });
      setTimeout(() => setMessage(null), 8000);
    };

    // Pilot approved → move from pending to active fleet instantly
    const handlePilotApproved = (payload: any) => {
      // Add to riders list
      setRiders((prev) => {
        if (prev.find((r) => r.riderId?.toString() === payload.riderId?.toString())) return prev;
        return [payload as RiderStat, ...prev];
      });
      // Remove from pending list
      setPendingPilots((prev) =>
        prev.filter((p) => p.user?._id?.toString() !== payload.riderId?.toString())
      );
    };

    socket.on('new_pilot_application', handleNewPilot);
    socket.on('pilot_approved', handlePilotApproved);

    return () => {
      socket.off('new_pilot_application', handleNewPilot);
      socket.off('pilot_approved', handlePilotApproved);
    };
  }, [socket]);

  const approvePilot = async (
    riderId: string,
    status: 'APPROVED' | 'REJECTED',
    reason?: string
  ) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/v1/merchant/approve-pilot/${riderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, rejectionReason: reason }),
      });

      if (res.ok) {
        setMessage({ text: `Pilot ${status.toLowerCase()} Successfully.`, type: 'success' });
        setPendingPilots((prev) => prev.filter((p) => p.user._id !== riderId));
        fetchRiders();
        setTimeout(() => setMessage(null), 5000);
        return true;
      }
    } catch (err) {
      setMessage({ text: 'Approval failed.', type: 'error' });
    }
    return false;
  };

  const settleCash = async (riderId: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/v1/merchant/finance/collect/${riderId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setRiders((prev) => prev.map((r) => (r.riderId === riderId ? { ...r, cashHeld: 0 } : r)));
        return true;
      }
    } catch (err) {
      console.error('Settlement failed', err);
    }
    return false;
  };

  const updateRiderName = async (id: string, name: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/v1/merchant/riders/${id}/name`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fullName: name }),
      });
      if (res.ok) {
        setRiders((prev) =>
          prev.map((r) => (r.riderId === id ? { ...r, fullName: name.trim() } : r))
        );
        return true;
      }
    } catch (err) {}
    return false;
  };

  const togglePilotActive = async (id: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/v1/merchant/riders/${id}/toggle-active`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRiders((prev) =>
          prev.map((r) => (r.riderId === id ? { ...r, disabled: data.disabled } : r))
        );
        setMessage({
          text: `Pilot successfully ${data.disabled ? 'deactivated' : 'activated'}.`,
          type: 'success',
        });
        setTimeout(() => setMessage(null), 5000);
        return true;
      }
    } catch (err) {}
    return false;
  };

  const deletePilot = async (id: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/v1/merchant/riders/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setRiders((prev) => prev.filter((r) => r.riderId !== id));
        setMessage({ text: 'Pilot successfully removed from fleet.', type: 'success' });
        setTimeout(() => setMessage(null), 5000);
        return true;
      }
    } catch (err) {}
    return false;
  };

  return {
    riders,
    pendingPilots,
    loading,
    message,
    setMessage,
    fetchRiders,
    approvePilot,
    settleCash,
    updateRiderName,
    togglePilotActive,
    deletePilot,
  };
}
