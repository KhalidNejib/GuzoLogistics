import { Server, Socket } from 'socket.io';
import { verifyToken } from '@clerk/express';
import { clerkConfig } from '@ethio-logistics/env';
import Order from './models/Order.js';

// --- Types ---
interface SocketData {
  userId: string;
}

// --- Validation Helpers ---
const isValidObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);
const isValidZone = (id: string) => /^[a-zA-Z0-9-_]{2,50}$/.test(id);

// --- Basic In-Memory Rate Limiter (Prevents DB Spams) ---
const rateLimits = new Map<string, number>();
const RATE_LIMIT_MS = 2000; // 2 seconds between order join requests

export const initializeSocket = (io: Server) => {
  // 1. Connection Authentication Middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) return next(new Error('Authentication error: Missing Clerk token'));

      const decoded = await verifyToken(token, {
        secretKey: clerkConfig.secretKey,
      });

      // Type-safe assignment
      (socket.data as SocketData).userId = decoded.sub;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  // 2. Verified Connection Logic
  io.on('connection', (socket: Socket) => {
    const userId = (socket.data as SocketData).userId;
    console.info(`🔌 [Socket] Connected: ${socket.id} (User: ${userId})`);

    // ============================================
    // SECURE ORDER TRACKING
    // ============================================
    socket.on('join_order', async (orderId: string) => {
      try {
        // Validation Check
        if (!orderId || !isValidObjectId(orderId)) {
          return socket.emit('socket_error', { message: 'Invalid Order ID' });
        }

        // Rate Limiter Check
        const lastRequest = rateLimits.get(userId) || 0;
        if (Date.now() - lastRequest < RATE_LIMIT_MS) {
          return socket.emit('socket_error', { message: 'Too many requests. Please wait.' });
        }
        rateLimits.set(userId, Date.now());

        // Database Ownership Check
        // Note: Day 7 will introduce Redis to cache this instead of hitting MongoDB every time
        const order = (await Order.findById(orderId).select('merchant rider').lean()) as {
          merchant?: { toString: () => string };
          rider?: { toString: () => string };
        } | null;

        if (!order) {
          return socket.emit('socket_error', { message: 'Order not found' });
        }

        const isMerchant = order.merchant?.toString() === userId;
        const isRider = order.rider?.toString() === userId;

        if (!isMerchant && !isRider) {
          return socket.emit('socket_error', { message: 'Unauthorized to track this order' });
        }

        const roomName = `order:${orderId}`;
        socket.join(roomName);
        socket.emit('joined_room', { room: roomName });
      } catch (error) {
        console.error('[Socket Join Error]:', error);
        socket.emit('socket_error', { message: 'Internal server error while verifying order' });
      }
    });

    socket.on('leave_order', (orderId: string) => {
      if (orderId && isValidObjectId(orderId)) {
        socket.leave(`order:${orderId}`);
      }
    });

    // ============================================
    // GEOGRAPHIC ZONE LOGIC
    // ============================================
    socket.on('join_zone', (zoneId: string) => {
      // Notice we are using isValidZone here!
      if (zoneId && isValidZone(zoneId)) {
        socket.join(`zone:${zoneId}`);
        console.info(`[Socket Room] User ${userId} listening to zone: ${zoneId}`);
      }
    });

    socket.on('leave_zone', (zoneId: string) => {
      if (zoneId && isValidZone(zoneId)) {
        socket.leave(`zone:${zoneId}`);
      }
    });

    socket.on('disconnect', () => {
      console.info(`🔌 [Socket] Disconnected: ${socket.id}`);
      rateLimits.delete(userId); // Memory cleanup
    });
  });
};
