/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@clerk/clerk-react';

const getApiUrl = () => {
  // Force dynamic resolution to bypass cached .env values during HMR
  return `http://${window.location.hostname}:5000`;
};
const SOCKET_URL = getApiUrl();

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
          // Use getToken from the latest render via a ref if needed, or just call it directly
          // Since we are in a closure, we can just use the getToken from the scope
          const token = await getToken({ skipCache: true });
          cb({ token });
        } catch (err) {
          console.error('❌ Failed to get auth token', err);
          cb({ token: null });
        }
      },
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    socketInstance.on('connect', () => {
      setStatus('connected');
      setError(null);
      isConnecting.current = false;
      console.info('🟢 Socket connected:', socketInstance.id);

      socketInstance.onAny((eventName, ...args) => {
        console.info(`🔥 [Socket Signal] Event: ${eventName}`, args);
      });

      joinedOrders.current.forEach((orderId) => {
        socketInstance.emit('join_order', orderId);
      });
    });

    socketInstance.on('disconnect', (reason) => {
      setStatus('disconnected');
      console.warn('🔌 Socket disconnected:', reason);
    });

    socketInstance.on('connect_error', async (err) => {
      if (err.message.includes('Authentication error')) {
        console.warn('🔑 [Socket] Auth failed, refreshing token and retrying...');
        try {
          const newToken = await getToken({ skipCache: true });
          socketInstance.auth = { token: newToken };
          socketInstance.connect();
          return;
        } catch (refreshErr) {
          console.error('❌ [Socket] Token refresh failed:', refreshErr);
        }
      }
      
      setStatus('error');
      setError((prev) => prev ?? `Connection Error: ${err.message}`);
      isConnecting.current = false;
    });

    socketInstance.on('socket_error', (data: { message: string }) => {
      setError(data.message);
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);
  }, [isLoaded, isSignedIn]); // Removed getToken

  const { userId } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn && userId) {
      connectSocket();
    }
    
    return () => {
      if (socketRef.current) {
        const currentSocket = socketRef.current;
        setTimeout(() => {
          if (socketRef.current !== currentSocket) {
            currentSocket.removeAllListeners();
            currentSocket.disconnect();
          }
        }, 100);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, userId]); // Removed connectSocket

  const joinOrder = useCallback((orderId: string) => {
    if (!orderId) return;
    const cleanId = orderId.trim();
    
    // Global room bypass
    if (cleanId === 'global') {
      joinedOrders.current.add(cleanId);
      if (socketRef.current?.connected) {
        socketRef.current.emit('join_order', cleanId);
      }
      return;
    }
    
    // 🛡️ SANITY CHECK: MongoDB IDs are exactly 24 chars
    if (cleanId.length !== 24) {
      console.warn(`⚠️ [Socket] Fixing corrupted Order ID: ${cleanId} -> ${cleanId.slice(0, 24)}`);
    }
    
    const targetId = cleanId.slice(0, 24);
    joinedOrders.current.add(targetId);
    
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_order', targetId);
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
