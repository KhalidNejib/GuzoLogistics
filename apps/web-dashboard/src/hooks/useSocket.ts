/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@clerk/clerk-react';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Added connection status for better UI control
type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseSocketReturn {
  socket: Socket | null;
  status: ConnectionStatus;
  error: string | null;
  joinOrder: (orderId: string) => void;
  leaveOrder: (orderId: string) => void;
  emit: (event: string, data?: any) => void; // Added safe emit wrapper
}

export const useSocket = (): UseSocketReturn => {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const socketRef = useRef<Socket | null>(null);
  const isConnecting = useRef(false); // LOCK 1: Prevent race conditions
  const joinedOrders = useRef<Set<string>>(new Set());

  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);

  const connectSocket = useCallback(async () => {
    // Prevent duplicate connection attempts or connecting while already connected
    if (!isLoaded || !isSignedIn || socketRef.current?.connected || isConnecting.current) return;

    isConnecting.current = true;
    setStatus('connecting');

    const socketInstance = io(SOCKET_URL, {
      auth: async (cb) => {
        try {
          const token = await getToken();
          cb({ token });
        } catch (err) {
          console.error('❌ Failed to get auth token', err);
          cb({ token: null }); // Explicitly handle auth failure
        }
      },
      transports: ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    socketInstance.on('connect', () => {
      setStatus('connected');
      setError(null);
      isConnecting.current = false;
      console.info('🟢 Socket connected:', socketInstance.id);

      // Re-sync rooms
      joinedOrders.current.forEach((orderId) => {
        socketInstance.emit('join_order', orderId);
      });
    });

    socketInstance.on('disconnect', (reason) => {
      setStatus('disconnected');
      console.warn('🔌 Socket disconnected:', reason);
    });

    socketInstance.on('connect_error', (err) => {
      setStatus('error');
      setError((prev) => prev ?? `Connection Error: ${err.message}`);
      isConnecting.current = false;
    });

    socketInstance.on('socket_error', (data: { message: string }) => {
      setError(data.message);
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    connectSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [connectSocket]);

  const joinOrder = useCallback((orderId: string) => {
    joinedOrders.current.add(orderId);
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_order', orderId);
    }
  }, []);

  const leaveOrder = useCallback((orderId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave_order', orderId);
      joinedOrders.current.delete(orderId);
    }
  }, []);

  // Safe emit wrapper to prevent errors when disconnected
  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn(`⚠️ Tried to emit "${event}" while disconnected`);
    }
  }, []);

  return {
    socket,
    status,
    error,
    joinOrder,
    leaveOrder,
    emit,
  };
};
