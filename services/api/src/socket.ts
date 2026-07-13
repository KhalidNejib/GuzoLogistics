/* eslint-disable @typescript-eslint/no-explicit-any */
import { redis } from './lib/redis.js';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '@clerk/express';
import { clerkConfig } from './lib/env.js';
import Order from './models/Order.js';
import User from './models/User.js';
import { logger } from './lib/logger.js';

import { notifyOrderUpdate } from './lib/notifications.js';

// --- Types ---
interface SocketData {
  userId: string;
  mongoId?: string;
  riderName?: string;
}

// --- Helpers ---
const calculateDistance = (coords1: [number, number], coords2: [number, number]) => {
  const R = 6371; // km
  const dLat = (coords2[1] - coords1[1]) * (Math.PI / 180);
  const dLon = (coords2[0] - coords1[0]) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coords1[1] * (Math.PI / 180)) *
      Math.cos(coords2[1] * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// --- Validation Helpers ---
const isValidObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

export const initializeSocket = (io: Server) => {
  // 1. Authentication Middleware
  io.use(async (socket: Socket, next) => {
    try {
      // 🔓 Public Tracking Bypass
      if (socket.handshake.auth?.trackingToken) {
        const trkOrder = await Order.findOne({ trackingUrlToken: socket.handshake.auth.trackingToken });
        if (trkOrder) {
          (socket.data as SocketData).userId = 'tracker';
          (socket.data as SocketData).mongoId = 'tracker';
          socket.join(`order:${trkOrder._id.toString()}`);
          return next();
        }
      }

      const token =
        socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        logger.warn({ auth: socket.handshake.auth, headers: socket.handshake.headers }, '⚠️ [Socket Auth] No token received');
        return next(new Error('Authentication error: Missing Clerk token'));
      }

      let decoded;
      try {
        decoded = await verifyToken(token, {
          secretKey: clerkConfig.secretKey,
          clockSkewInMs: 300000,
        });
      } catch (err: any) {
        logger.error({ err: err.message }, '❌ [Socket Auth Error]');
        return next(new Error('token-expired'));
      }

      // 🛡️ Resolve & Auto-Sync User Identity
      let user = await User.findOne({ clerkId: decoded.sub });

      if (!user) {
        // Fallback: If not found by ID, don't try to upsert with findOneAndUpdate which causes E11000
        // Instead, just create a skeleton and let the REST API (auth.ts) fill in details later.
        // Default to RIDER — merchants are created via the web dashboard only, and this
        // matches the same default used in auth.ts/clerkWebhook.ts. Hardcoding MERCHANT here
        // previously meant a rider whose socket connects before their first REST call (and
        // whose Clerk token already carries a real name, not the 'Rider' placeholder) would
        // get stuck as MERCHANT forever, since requireUser's auto-correction only fires for
        // placeholder full names.
        user = await User.create({
          clerkId: decoded.sub,
          fullName: decoded.name || 'Rider',
          role: 'RIDER',
          phoneNumber: `+251${Math.floor(100000000 + Math.random() * 900000000)}`,
        });
      }

      if (!user?._id) {
        return next(new Error('Authentication error: User document sync failed.'));
      }

      if (user.deletedAt || (user as any).disabled) {
        if (user.deletedAt) {
          logger.warn({ clerkId: decoded.sub }, '🔒 [Socket Auth] Blocked connection: User is deleted');
          return next(new Error('account-deactivated'));
        }
        
        // Allowed to connect in restricted mode for real-time activation alerts
        (socket.data as SocketData).userId = decoded.sub;
        (socket.data as SocketData).mongoId = user._id.toString();
        (socket.data as any).disabled = true; // Mark as disabled
        socket.join(`rider:${user._id.toString()}`);
        logger.info({ userId: user._id }, `🔒 [Socket] Deactivated rider connected in restricted mode`);
        return next();
      }

      (socket.data as SocketData).userId = decoded.sub;
      (socket.data as SocketData).mongoId = user._id.toString();
      // Cache the verified name from our DB — used for fleet radar so we never
      // display an email address or Clerk placeholder on the dashboard.
      (socket.data as SocketData).riderName = user.fullName || 'Rider';

      const city = user.serviceCity || 'Default';

      // 🚀 ROLE-BASED ROOM ISOLATION + CITY GROUPING
      if (user.role === 'RIDER') {
        socket.join(`rider:${user._id.toString()}`);
        socket.join('riders:fleet');
        socket.join(`city:fleet:${city}`);
        logger.info({ userId: user._id, city }, `🏍️ [Socket] Rider joined ${city} fleet and private room`);
      } else {
        const merchantRoom = `merchant:${user._id.toString()}`;
        socket.join(merchantRoom);
        socket.join(`city:fleet:${city}`); // Merchants listen to their city fleet
        logger.info({ userId: user._id, city }, `🔑 [Socket] Merchant joined ${city} radar`);
      }
      
      (socket.data as any).city = city;
      next();
    } catch (error: any) {
      logger.error({ err: error.message }, '❌ [Socket Auth Error]');
      next(new Error('Authentication error: Invalid token or database failure'));
    }
  });

  // 2. Connection Logic
  io.on('connection', (socket: Socket) => {
    const userId = (socket.data as SocketData).userId;
    const mongoId = (socket.data as SocketData).mongoId;
    logger.info({ socketId: socket.id, userId, mongoId }, `🔌 [Socket] Connected`);

    // ============================================
    // SECURE ORDER TRACKING (Proven Logic)
    // ============================================
    socket.on('join_order', async (orderId: string) => {
      try {
        if ((socket.data as any).disabled) return;
        if (!orderId || (!isValidObjectId(orderId) && orderId !== 'global')) return;

        if (orderId === 'global') {
          // 🛡️ Security Check: Only Riders can join the global tracking fleet
          const user = await User.findById(mongoId).select('role').lean() as any;
          if (user?.role !== 'RIDER') {
             console.warn(`[Security] Blocked global join: ${mongoId} is not a rider`);
             return;
          }
          socket.join('riders:global');
          socket.emit('joined_room', { room: 'riders:global' });
          logger.info({ mongoId }, '🌍 [Room] Rider joined global fleet room');
          return;
        }

        const order = (await Order.findById(orderId).select('merchant rider').lean()) as any;
        if (!order) return;

        // 🛡️ Security Check (Compare with MongoDB ID)
        const isMerchant = order.merchant?.toString() === mongoId;
        const isRider = order.rider?.toString() === mongoId;
        const isTracker = mongoId === 'tracker';

        if (!isMerchant && !isRider && !isTracker) {
          console.warn(`[Security] Blocked join: ${mongoId} -> Order ${orderId}`);
          return;
        }

        socket.join(`order:${orderId}`);
        socket.emit('joined_room', { room: `order:${orderId}` });
        logger.info({ orderId, mongoId }, `🛰️ [Room] User joined order room`);
      } catch (error: any) {
        logger.error({ err: error.message, orderId }, '[Join Order Error]');
      }
    });

    socket.on('leave_order', (orderId: string) => {
      if ((socket.data as any).disabled) return;
      if (orderId && isValidObjectId(orderId)) {
        socket.leave(`order:${orderId}`);
      }
    });

    // ============================================
    // LIVE TRACKING
    // ============================================
    socket.on('location-update', async (data: { orderId: string; lat: number; lng: number; battery?: number; speed?: number; riderName?: string; riderPhone?: string }) => {
      try {
        if ((socket.data as any).disabled) return;
        const { orderId, lat, lng, battery, speed, riderName, riderPhone } = data;
        const isGlobal = orderId === 'global';
        if (!orderId || (!isValidObjectId(orderId) && !isGlobal)) return;


        // 🛡️ Security Check: only the order's actually-assigned rider may broadcast
        // location for it. Without this, join_order's ownership check (below) is
        // meaningless — any connected socket could still emit location-update directly
        // for an orderId it never joined, spoofing position data into the order room,
        // the merchant's fleet radar, and the customer-facing "rider nearby" alert.
        let orderMerchantId: string | null = null;
        if (!isGlobal) {
          const ownedOrder = await Order.findById(orderId).select('merchant rider').lean() as any;
          if (!ownedOrder || ownedOrder.rider?.toString() !== mongoId) {
            logger.warn({ mongoId, orderId }, '[Security] Blocked location-update: not the assigned rider');
            return;
          }
          orderMerchantId = ownedOrder.merchant?.toString() || null;
        }

        // Broadcast to specific order room or global fleet room
        const room = isGlobal ? 'riders:global' : `order:${orderId}`;
        io.to(room).emit('rider_moved', { orderId, lat, lng, battery, speed, riderName, riderPhone });

        // 📡 FLEET RADAR: Broadcast to specific merchant (if on mission) OR city fleet (if idle)
        const city = (socket.data as any).city || 'Default';
        
        if (isGlobal) {
            // 🌍 Idle rider -> Notify city-wide radar
            // Use the server-verified name (from our DB) — not the client payload
            const verifiedName = (socket.data as SocketData).riderName || riderName || 'Rider';
            io.to(`city:fleet:${city}`).emit('fleet_radar_update', {
                riderId: mongoId,
                orderId: 'IDLE',
                lat,
                lng,
                speed,
                riderName: verifiedName
            });
        } else if (isValidObjectId(orderId)) {
           // 🔒 Active rider -> Notify specific merchant.
           const merchantId = orderMerchantId;
           const verifiedName = (socket.data as SocketData).riderName || riderName || 'Rider';

           if (merchantId) {
              io.to(`merchant:${merchantId}`).emit('fleet_radar_update', {
                 riderId: mongoId,
                 orderId,
                 lat,
                 lng,
                 speed,
                 riderName: verifiedName
              });
           }
        }

        // 📏 NEARBY TRIGGER: Notify when rider is within 500m of the active target
        if (!isGlobal) {
          const proximityKey = `order:notified_nearby:${orderId}`;
          const isAlreadyNotified = await redis.get(proximityKey);

          if (!isAlreadyNotified) {
             const order = await Order.findById(orderId).select('status pickupAddress deliveryAddress merchant itemDetails').lean() as any;
             if (order && !['DELIVERED', 'CANCELLED'].includes(order.status)) {
                const isTransit = order.itemDetails?.isPickedUp || order.status === 'IN_TRANSIT';
                const target = isTransit ? order.deliveryAddress : order.pickupAddress;
                const dist = calculateDistance([lng, lat], [target.location.coordinates[0], target.location.coordinates[1]]);

                if (dist <= 0.5) { // 500 meters
                   const location = isTransit ? 'your address' : 'pickup point';
                   logger.info({ orderId, dist }, '🎯 [Nearby] Triggering proximity alert');
                   
                   // Notify Merchant
                   await notifyOrderUpdate(order.merchant.toString(), 'RIDER_NEARBY', { location }, { orderId, type: 'NEARBY' }, io);
                   
                   // Notify Customer via socket
                   io.to(`order:${orderId}`).emit('notification', {
                      title: 'Rider is Nearby!',
                      body: `Your rider is less than 500m away from the ${location}.`,
                   });

                   // Mark as notified for 15 mins to avoid spam
                   await redis.set(proximityKey, 'true', 'EX', 900);
                }
             }
          }
        }

        // 📍 Update Redis cache (per-order telemetry)
        const locationKey = `order:location:${orderId}`;
        const historyKey = `order:history:points:${orderId}`;
        
        const telemetry = JSON.stringify({ lat, lng, battery, speed, riderName, lastSeen: Date.now() });
        
        await redis.set(locationKey, telemetry, 'EX', 60);
        
        // Push to history list for background sync to MongoDB
        if (!isGlobal) {
          await redis.lpush(historyKey, telemetry);
          await redis.ltrim(historyKey, 0, 49); // Keep latest 50 points in Redis
          await redis.expire(historyKey, 3600); // 1 hour TTL for history list
        }

        // 🤖 AUTO-ASSIGN INDEX: Store rider's live position so the nearest-rider engine can find them
        if (mongoId) {
          await redis.set(`rider_location:${mongoId}`, JSON.stringify([lat, lng]), 'EX', 120); // 2-minute TTL
        }
      } catch (error: any) {
        logger.error({ err: error.message, orderId: data.orderId }, '[Location Update Error]');
      }
    });

    // ============================================
    // STATUS UPDATES ARE HANDLED STRICTLY VIA REST API 
    // TO GUARANTEE ATOMIC INTEGRITY AND P.O.D. VALIDATION
    // ============================================

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, `🔌 [Socket] Disconnected`);
    });
  });
};
