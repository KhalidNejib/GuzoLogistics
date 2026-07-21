/**
 * ═══════════════════════════════════════════════════════════════
 *  ETHIO LOGISTICS V3  —  BRIDGE (socketService.ts)
 *  Elite real-time data layer.  Clean room rebuild.
 *
 *  Key improvements over V2:
 *  ✅ Multi-handler support — registerEventHandler no longer
 *     clobbers previous listeners; each event holds an array.
 *  ✅ Auth token refresh loop with exponential back-off cap.
 *  ✅ Persistent room membership — activeRooms tracks every order
 *     room the app should be in regardless of connection state, and
 *     is replayed in full on EVERY connect (first connect AND every
 *     reconnect), since the server has no memory of prior rooms.
 *  ✅ Typed public API — no more `any` leaking out.
 *  ✅ Clean teardown — removeHandler() for scoped components.
 * ═══════════════════════════════════════════════════════════════
 */

import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './apiConfig';

const OFFLINE_BUFFER_KEY = 'rider_offline_location_buffer';

// ── Types ────────────────────────────────────────────────────────
export interface LocationPayload {
  orderId: string;
  lat: number;
  lng: number;
  battery?: number;
  speed?: number;
  riderName?: string;
  riderPhone?: string;
}

export interface OrderStatusPayload {
  orderId: string;
  status: string;
}

export interface OrderClaimedPayload {
  orderId: string;
}

export interface FinancePayload {
  balance: number;
  cashHeld: number;
  todayEarnings?: number;
}

type AnyHandler = (...args: unknown[]) => void;

// ── Service ──────────────────────────────────────────────────────
class SocketService {
  private socket: Socket | null = null;
  private getTokenFn: (() => Promise<string | null>) | null = null;

  /**
   * Multi-handler registry.
   * Map<eventName, Set<handler>>
   * Using a Set prevents accidental duplicate registrations
   * from StrictMode double-invocations.
   */
  private registry: Map<string, Set<AnyHandler>> = new Map();

  /**
   * Order rooms the app currently wants to be a member of, regardless of
   * connection state. This is the single source of truth for room
   * membership — it's replayed in full on EVERY 'connect' event (initial
   * connect *and* every reconnect), not just the first one. Rooms only
   * live server-side for the lifetime of a single socket connection, so
   * anything joined before a drop is otherwise silently lost the moment
   * the client reconnects with a new socket id.
   */
  private activeRooms: Set<string> = new Set();

  /** Buffer for offline location updates */
  private locationBuffer: LocationPayload[] = [];
  private isFlushing = false;

  // ── Connection ─────────────────────────────────────────────────

  connect(getToken: () => Promise<string | null>): void {
    this.getTokenFn = getToken;

    if (this.socket) {
      if (this.socket.connected) {
        this.rejoinActiveRooms();
        this.loadAndFlushLocationBuffer();
      } else {
        this.socket.connect();
      }
      return;
    }


    console.info('🔌 [Socket] Connecting →', API_URL);

    this.socket = io(API_URL, {
      auth: async (cb) => {
        try {
          let token = null;
          let retries = 3;
          while (retries > 0) {
            token = await getToken();
            if (token) break;
            console.warn(`🔑 [Socket] Token is null, retries left: ${retries - 1}`);
            if (retries > 1) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
            retries--;
          }
          cb({ token });
        } catch (err: any) {
          console.error('❌ [Socket Auth] Error in getToken:', err?.message || err);
          cb({ token: null });
        }
      },
      transports: ['websocket', 'polling'], // WEBSOCKET FIRST for speed, polling for stability
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000, // FAST RECONNECT
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: true,
      autoConnect: true,
    });

    // ── Lifecycle ────────────────────────────────────────────────
    this.socket.on('connect', () => {
      console.info('🟢 [Socket] Connected:', this.socket?.id);
      // Auto-join global fleet radar so idle location updates reach the dashboard
      this.activeRooms.add('global');
      this.reattachAllHandlers();
      // Every connect — first time AND every reconnect — gets a fresh socket
      // id server-side with zero room membership. Replay the full set of
      // rooms we're supposed to be in, not just ones queued while offline.
      this.rejoinActiveRooms();
      this.loadAndFlushLocationBuffer();
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('🔌 [Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.error(`❌ [Socket] Connection error to ${API_URL}:`, err.message);
      
      // Check for common ngrok/windows issues
      if (err.message.includes('xhr poll error')) {
        console.warn('💡 [Socket] Tip: This often means the ngrok tunnel is down or port 5000 is not reachable.');
      }

      if (err.message.includes('account-deactivated')) {
        console.warn('❌ [Socket] Account deactivated. Revoking auth...');
        this.socket?.disconnect();
        const handlers = this.registry.get('auth_revoked');
        if (handlers) {
          handlers.forEach((h) => h({ reason: 'Your pilot credentials have been deactivated by fleet command.' }));
        }
        return;
      }

      const isAuthError =
        err.message.includes('Authentication error') ||
        err.message.includes('token-expired') ||
        err.message.includes('jwt expired') ||
        err.message.includes('Unauthorized');

      if (isAuthError && this.getTokenFn) {
        console.warn('🔑 [Socket] Auth failure — refreshing token in 2 s…');
        this.socket?.disconnect();
        setTimeout(() => {
          if (this.getTokenFn) this.connect(this.getTokenFn);
        }, 2_000);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.registry.clear();
    this.activeRooms.clear();
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getSocketId(): string | null {
    return this.socket?.id ?? null;
  }

  // ── Room management ────────────────────────────────────────────

  joinOrder(orderId: string): void {
    // Record intent first — this is what makes the room survive a future
    // disconnect/reconnect cycle, not just the current connection.
    this.activeRooms.add(orderId);
    if (this.socket?.connected) {
      this.socket.emit('join_order', orderId);
      console.info('🛰️ [Socket] Joined order room:', orderId);
    }
  }

  joinGlobal(): void {
    this.activeRooms.add('global');
    if (this.socket?.connected) {
      this.socket.emit('join_order', 'global');
    }
  }

  leaveOrder(orderId: string): void {
    this.activeRooms.delete(orderId);
    if (this.socket?.connected) {
      this.socket.emit('leave_order', orderId);
    }
  }

  // ── Emitters ───────────────────────────────────────────────────

  sendLocation(payload: LocationPayload): void {
    if (this.socket?.connected) {
      this.socket.emit('location-update', payload);
    } else {
      console.info('📡 [Socket] Offline — buffering location update');
      this.bufferLocation(payload);
    }
  }

  // Note: order status changes go through the REST API (PATCH /:id/status), not
  // this socket connection — see the comment in socket.ts. There used to be an
  // updateOrderStatus() emitter here ('order-status-update'), but the server has
  // no listener for that event, so it was a silent no-op. Removed to avoid a
  // future caller assuming it does something.

  // ── Event subscriptions ────────────────────────────────────────

  /**
   * Add a handler for an event.
   * Multiple calls with different handlers all get registered — none
   * overwrites another.  Returns an unsubscribe function for cleanup.
   */
  on<T = unknown>(event: string, handler: (data: T) => void): () => void {
    if (!this.registry.has(event)) {
      this.registry.set(event, new Set());
    }
    this.registry.get(event)!.add(handler as AnyHandler);

    // If already connected, bind immediately
    if (this.socket?.connected) {
      this.socket.on(event, handler as AnyHandler);
    }

    return () => this.off(event, handler);
  }

  off<T = unknown>(event: string, handler: (data: T) => void): void {
    this.registry.get(event)?.delete(handler as AnyHandler);
    this.socket?.off(event, handler as AnyHandler);
  }

  // Convenience wrappers (typed) ──────────────────────────────────

  onNewOrder(cb: (order: unknown) => void): () => void {
    return this.on('new-order-nearby', cb);
  }

  onOrderStatusChanged(cb: (data: OrderStatusPayload) => void): () => void {
    return this.on('order_status_changed', cb);
  }

  onOrderClaimed(cb: (data: OrderClaimedPayload) => void): () => void {
    return this.on('order-claimed', cb);
  }

  onFinanceUpdate(cb: (data: FinancePayload) => void): () => void {
    return this.on('finance_update', cb);
  }

  onRiderMoved(cb: (data: { orderId: string; lat: number; lng: number }) => void): () => void {
    return this.on('rider_moved', cb);
  }

  onOrdersWiped(cb: () => void): () => void {
    return this.on('orders-wiped', cb as AnyHandler);
  }

  onOrderCancelled(cb: (data: { orderId: string }) => void): () => void {
    return this.on('order-cancelled', cb);
  }

  onOrderDeleted(cb: (data: { orderId: string }) => void): () => void {
    return this.on('order_deleted', cb);
  }

  onAccountReactivated(cb: (data: { message: string }) => void): () => void {
    return this.on('account_reactivated', cb);
  }

  onNotification(cb: (data: { title: string; body: string; orderId?: string; type?: string }) => void): () => void {
    return this.on('notification', cb);
  }

  onSocketError(cb: (data: { message: string }) => void): () => void {
    return this.on('socket_error', cb);
  }

  onProfileUpdate(cb: (data: { rating?: number }) => void): () => void {
    return this.on('profile_update', cb);
  }

  // ── Private helpers ────────────────────────────────────────────

  /** Re-bind every registered handler after a reconnect */
  private reattachAllHandlers(): void {
    if (!this.socket) return;
    this.registry.forEach((handlers, event) => {
      // Remove stale native listeners first
      this.socket!.off(event);
      handlers.forEach((h) => this.socket!.on(event, h));
    });
  }

  /**
   * Emit join_order for every room the app currently wants to be in.
   * Safe to call repeatedly — join_order is idempotent server-side — and
   * it's exactly what needs to run after any reconnect, since the server
   * has no memory of which rooms this identity was in before the drop.
   */
  private rejoinActiveRooms(): void {
    if (!this.socket?.connected) return;
    this.activeRooms.forEach((orderId) => {
      this.socket!.emit('join_order', orderId);
    });
  }

  private async bufferLocation(payload: LocationPayload): Promise<void> {
    try {
      this.locationBuffer.push(payload);
      // Optional: Cap buffer size
      if (this.locationBuffer.length > 100) this.locationBuffer.shift();
      
      await AsyncStorage.setItem(OFFLINE_BUFFER_KEY, JSON.stringify(this.locationBuffer));
    } catch (err) {
      console.error('❌ [Socket] Failed to buffer location:', err);
    }
  }

  private async loadAndFlushLocationBuffer(): Promise<void> {
    if (this.isFlushing || !this.socket?.connected) return;
    this.isFlushing = true;

    try {
      const stored = await AsyncStorage.getItem(OFFLINE_BUFFER_KEY);
      if (stored) {
        this.locationBuffer = JSON.parse(stored);
      }

      if (this.locationBuffer.length === 0) {
        this.isFlushing = false;
        return;
      }

      console.info(`🚀 [Socket] Flushing ${this.locationBuffer.length} buffered location points...`);
      
      // Send one by one with a tiny delay to prevent overwhelming the socket
      for (const payload of this.locationBuffer) {
        this.socket.emit('location-update', payload);
        // Small delay
        await new Promise(r => setTimeout(r, 50));
      }

      this.locationBuffer = [];
      await AsyncStorage.removeItem(OFFLINE_BUFFER_KEY);
      console.info('✅ [Socket] Offline buffer flushed and cleared');
    } catch (err) {
      console.error('❌ [Socket] Flush failed:', err);
    } finally {
      this.isFlushing = false;
    }
  }
}

export const socketService = new SocketService();
