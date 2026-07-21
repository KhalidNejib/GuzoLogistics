import { Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { AuthRequest } from '../middleware/auth.js';
import { createOrderSchema } from '../validators/orderValidator.js';
import { redis } from '../lib/redis.js';
import { broadcastNotificationToRiders, notifyOrderUpdate, sendPushNotification } from '../lib/notifications.js';
import { sendSMS } from '../lib/sms.js';
import { v2 as cloudinary } from 'cloudinary';
import { cloudinaryConfig, orsConfig } from '../lib/env.js';
import { logger } from '../lib/logger.js';
import mongoose from 'mongoose';
import RiderProfile from '../models/RiderProfile.js';
import { FinanceService } from '../services/financeService.js';
import { calculateDistance } from '../utils/geoUtils.js';

// Configure Cloudinary
if (cloudinaryConfig.apiKey) {
  cloudinary.config({
    cloud_name: cloudinaryConfig.cloudName,
    api_key: cloudinaryConfig.apiKey,
    api_secret: cloudinaryConfig.apiSecret,
  });
  logger.info({ cloudName: cloudinaryConfig.cloudName }, '☁️ [Cloudinary] Configured successfully');
}

/**
 * @route   POST /api/orders
 */
export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.user?._id;
    if (!merchantId) return res.status(401).json({ error: 'Unauthorized user.' });

    const validated = createOrderSchema.parse(req.body);
    const trackingUrlToken = crypto.randomBytes(16).toString('hex');

    const newOrder = new Order({
      merchant: merchantId,
      pickupAddress: { addressText: validated.pickupAddress.addressText, location: { type: 'Point', coordinates: validated.pickupAddress.coordinates } },
      deliveryAddress: { addressText: validated.deliveryAddress.addressText, location: { type: 'Point', coordinates: validated.deliveryAddress.coordinates } },
      customerName: validated.customerName,
      customerPhone: validated.customerPhone,
      itemDetails: validated.itemDetails,
      priceInfo: validated.priceInfo,
      paymentMethod: validated.paymentMethod,
      distanceKm: calculateDistance(validated.pickupAddress.coordinates, validated.deliveryAddress.coordinates),
      trackingUrlToken,
      verificationCode: Math.floor(1000 + Math.random() * 9000).toString(),
      status: 'PENDING',
    });

    await newOrder.save();

    const io = req.app.get('socketio');
    if (io) io.to('riders:fleet').emit('new-order-nearby', newOrder);

    broadcastNotificationToRiders('🚀 New Mission Available', `New pickup at ${newOrder.pickupAddress.addressText}.`, { orderId: newOrder._id, type: 'NEW_ORDER' }, req.user?.serviceCity);

    return res.status(201).json({ message: 'Order created', orderId: newOrder._id, trackingToken: trackingUrlToken });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid input', details: error.errors });
    return res.status(500).json({ error: 'Failed to create order.' });
  }
};

/**
 * @route   GET /api/orders
 */
export const getMerchantOrders = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.user?._id;
    if (!merchantId) return res.status(401).json({ error: 'Unauthorized' });

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find({ merchant: merchantId }).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('rider', 'fullName phoneNumber').lean(),
      Order.countDocuments({ merchant: merchantId })
    ]);

    return res.json({ orders, pagination: { total, page, pages: Math.ceil(total / limit) } });
  } catch (e) { return res.status(500).json({ error: 'Failed' }); }
};

const findNearestRider = async (pickupCoords: [number, number]) => {
  // KEYS blocks the single-threaded Redis server while it scans the entire
  // keyspace — fine on a laptop with a handful of test riders, but on a
  // real fleet it's an O(N) stall on every auto-assign call, and it gets
  // worse as the key count grows (this same DB also holds order-location,
  // history, and proximity keys, all sharing the keyspace). SCAN walks the
  // keyspace in small non-blocking cursor batches instead, so Redis keeps
  // serving other requests (live tracking, settlement flow, etc.) while
  // this runs.
  let nearestRiderId: string | null = null;
  let minDistance = Infinity;
  let cursor = '0';

  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'rider_location:*', 'COUNT', 100);
    cursor = nextCursor;

    if (keys.length > 0) {
      const locations = await redis.mget(...keys);
      keys.forEach((key, i) => {
        const loc = locations[i];
        if (!loc) return;
        const [lat, lng] = JSON.parse(loc);
        const d = calculateDistance(pickupCoords, [lng, lat]);
        if (d < minDistance) { minDistance = d; nearestRiderId = key.split(':')[1]; }
      });
    }
  } while (cursor !== '0');

  return nearestRiderId;
};

export const autoAssignOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { id: orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order || order.status !== 'PENDING') return res.status(400).json({ error: 'Invalid order state' });

    const pickup = (order.pickupAddress as any).coordinates || (order.pickupAddress as any).location?.coordinates;
    const riderId = await findNearestRider(pickup as [number, number]);
    if (!riderId) return res.status(404).json({ error: 'No riders available' });

    // Atomic: only assign if the order is still PENDING at write time. Without
    // this guard in the query itself, a rider's own acceptOrder (or a second,
    // concurrent auto-assign call) could land between our read above and this
    // write, and we'd silently overwrite whoever claimed it first — the same
    // check-then-write gap we closed in the finance settlement flow.
    const updated = await Order.findOneAndUpdate(
      { _id: orderId, status: 'PENDING' },
      { $set: { rider: new mongoose.Types.ObjectId(riderId), status: 'ACCEPTED', updatedAt: new Date() } },
      { new: true }
    ).populate('rider', 'fullName phoneNumber');

    if (!updated) return res.status(409).json({ error: 'Order was already claimed' });

    const io = req.app.get('socketio');

    notifyOrderUpdate(updated.merchant.toString(), 'MISSION_ACCEPTED', { rider: (updated.rider as any)?.fullName }, { orderId, status: 'ACCEPTED' }, io, updated.customerPhone);
    if (io) io.to(`rider:${riderId}`).emit('notification', { title: '📦 Auto-Assigned Mission!', body: 'New pickup assigned.', orderId });

    return res.json({ message: 'Auto-assigned', riderId });
  } catch (e) { return res.status(500).json({ error: 'Error' }); }
};

export const acceptOrder = async (req: AuthRequest, res: Response) => {
  const riderId = req.user?._id;
  const orderId = req.params.id;
  if (!riderId) return res.status(401).json({ error: 'Unauthorized' });

  const session = await mongoose.startSession();
  let order: any = null;
  let capacityReached = false;

  try {
    await session.withTransaction(async () => {
      // Touch the rider's own User doc first, inside the transaction. This has
      // no business meaning by itself — it exists purely so two concurrent
      // accept requests from the same rider write-conflict on this one shared
      // document instead of sailing through independently. Without it, the
      // count check below and the claim further down touch two *different*
      // Order documents when a rider double-taps two different orders, so
      // MongoDB has nothing to detect a conflict on — both requests could read
      // "capacity available" before either claim commits, letting the rider
      // end up above the cap.
      await User.findByIdAndUpdate(riderId, { $set: { lastAcceptAttemptAt: new Date() } }, { session });

      const activeCount = await Order.countDocuments(
        { rider: riderId, status: { $in: ['ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED'] } },
        { session }
      );
      if (activeCount >= 2) {
        capacityReached = true;
        return;
      }

      order = await Order.findOneAndUpdate(
        { _id: orderId, $or: [{ status: 'PENDING' }, { status: 'ACCEPTED', rider: riderId }] },
        { $set: { status: 'ACCEPTED', rider: riderId, updatedAt: new Date() } },
        { new: true, session }
      ).populate('rider', 'fullName phoneNumber');
    });
  } catch (e) {
    return res.status(500).json({ error: 'Error' });
  } finally {
    await session.endSession();
  }

  if (capacityReached) return res.status(400).json({ error: 'Capacity reached' });
  if (!order) return res.status(400).json({ error: 'Not available' });

  const io = req.app.get('socketio');
  notifyOrderUpdate(order.merchant.toString(), 'MISSION_ACCEPTED', { rider: (order.rider as any)?.fullName }, { orderId, status: 'ACCEPTED' }, io, order.customerPhone);
  if (io) {
      io.to(`order:${orderId}`).emit('order_status_changed', { orderId, status: 'ACCEPTED', order });
      io.to('riders:fleet').emit('order-claimed', { orderId });
  }

  return res.status(200).json(order);
};

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const riderId = req.user?._id;
    const orderId = req.params.id;
    const { status, verificationCode, photoBase64 } = req.body;
    if (!riderId) return res.status(401).json({ error: 'Unauthorized' });

    const order = await Order.findOne({ _id: orderId, rider: riderId });
    if (!order) return res.status(404).json({ error: 'Not found' });

    if (status === 'DELIVERED' && verificationCode !== order.verificationCode) {
      return res.status(400).json({ error: 'Invalid code' });
    }

    // Idempotency guard: a retried/duplicated "mark as DELIVERED" request
    // (double-tap, network retry, etc.) must not re-enter the settlement
    // flow below. If the order is already DELIVERED, treat this as a
    // no-op success rather than running the update+settlement again.
    if (status === 'DELIVERED' && order.status === 'DELIVERED') {
      return res.status(200).json(order);
    }

    const updateData: any = { status, updatedAt: new Date() };
    if (status === 'DELIVERED') updateData.deliveredAt = new Date();
    if (status === 'PICKED_UP') updateData['itemDetails.isPickedUp'] = true;

    const findFilter: any = { _id: orderId, rider: riderId };
    if (status === 'DELIVERED') findFilter.status = { $ne: 'DELIVERED' };

    const updated = await Order.findOneAndUpdate(findFilter, { $set: updateData }, { new: true }).populate('rider');
    if (!updated) {
      // Someone else (a concurrent duplicate request) won the race and
      // already flipped this order to DELIVERED between our check above
      // and this update — treat it the same way: no-op success.
      if (status === 'DELIVERED') {
        const current = await Order.findById(orderId).populate('rider');
        if (current) return res.status(200).json(current);
      }
      return res.status(500).json({ error: 'Update failed' });
    }

    setImmediate(async () => {
      const io = req.app.get('socketio');

      if (status === 'DELIVERED') {
        // Settlement, photo upload, and the finance socket push are independent
        // concerns. Previously they were all one unguarded async chain — if
        // settleOrder() threw, everything after it (including the merchant/
        // rider status notifications further below) silently never ran, and
        // nothing recorded that the money never moved even though the order
        // was already marked DELIVERED to the rider. Each is now isolated so
        // one failure can't take out the others, and settlement failures are
        // both logged and flagged on the order for manual reconciliation.
        try {
          await FinanceService.settleOrder(orderId, riderId.toString());
        } catch (err) {
          logger.error(
            { err, orderId, riderId },
            '❌ [Settlement] settleOrder failed after order marked DELIVERED — money has not moved, needs manual reconciliation'
          );
          await Order.updateOne({ _id: orderId }, { $set: { 'financeSnapshot.settlementFailed': true } }).catch((e) => {
            logger.error({ e, orderId }, '❌ [Settlement] Failed to even flag settlementFailed on order');
          });
        }

        if (photoBase64 && cloudinaryConfig.apiKey) {
          try {
            const uploadRes = await cloudinary.uploader.upload(`data:image/jpeg;base64,${photoBase64}`, {
              folder: 'ethio-logistics/pod',
              transformation: [{ quality: 'auto', fetch_format: 'auto' }]
            });
            await Order.updateOne({ _id: orderId }, { $set: { podImageUrl: uploadRes.secure_url } });
            if (io) {
              io.to(`merchant:${updated.merchant}`).emit('order_photo_ready', { orderId, podImageUrl: uploadRes.secure_url });
              const freshOrder = await Order.findById(orderId).populate('rider').lean();
              io.to(`order:${orderId}`).emit('order_status_changed', { orderId, status: 'DELIVERED', order: freshOrder });
            }
          } catch (err) {
            logger.error({ err, orderId }, '❌ [POD Upload] Failed to upload proof-of-delivery photo');
          }
        }

        if (io) {
          try {
            const u = await User.findById(riderId).select('finance');
            if (u?.finance) {
              const balance = u.finance.balance || 0;
              const cashHeld = u.finance.cashHeld || 0;
              const totalEarned = u.finance.totalEarned || 0;
              const orderEarning = updated.priceInfo?.riderEarning || updated.priceInfo?.amount || 0;

              io.to(`rider:${riderId}`).emit('finance_update', {
                balance,
                cashHeld,
                todayEarnings: (u.finance as any).todayEarnings || 0,
                totalEarned,
              });

              // Push notification with earning summary
              const cashLine = cashHeld > 0 ? ` | Cash Held: ETB ${cashHeld}` : '';
              sendPushNotification(
                riderId.toString(),
                '✅ Mission Complete!',
                `+ETB ${orderEarning} earned · Balance: ETB ${balance}${cashLine}`,
                { type: 'MISSION_SUCCESS', orderId }
              ).catch(() => {});
            }
          } catch (err) {
            logger.error({ err, riderId }, '❌ Failed to push finance_update to rider socket');
          }
        }
      }

      try {
        let finalUpdated = updated;
        if (status === 'DELIVERED') {
          const freshOrder = await Order.findById(orderId).populate('rider');
          if (freshOrder) finalUpdated = freshOrder;
        }
        const riderName = (finalUpdated.rider as any)?.fullName || 'Rider';
        notifyOrderUpdate(finalUpdated.merchant.toString(), status, { rider: riderName, orderId: orderId.slice(-6) }, { orderId, status }, io, finalUpdated.customerPhone);
        if (io) {
          io.to(`merchant:${finalUpdated.merchant}`).emit('order_status_changed', { orderId, status, order: finalUpdated });
          io.to(`order:${orderId}`).emit('order_status_changed', { orderId, status, order: finalUpdated });
        }
      } catch (err) {
        logger.error({ err, orderId, status }, '❌ Failed to send order status notifications');
      }
    });

    return res.status(200).json(updated);
  } catch (e) { return res.status(500).json({ error: 'Error' }); }
};

export const getMyOrders = async (req: AuthRequest, res: Response) => {
  try {
    const riderId = req.user?._id;
    if (!riderId) return res.status(401).json({ error: 'Unauthorized' });
    const profile = await RiderProfile.findOne({ user: riderId }).lean() as any;
    const orders = await Order.find({ $or: [{ rider: riderId }, { merchant: profile?.merchant, status: 'PENDING' }] }).sort({ createdAt: -1 }).limit(50).lean();
    return res.json(orders);
  } catch (e) { return res.status(500).json({ error: 'Failed' }); }
};

export const getOrderById = async (req: AuthRequest, res: Response) => {
  const riderId = req.user?._id;
  if (!riderId) return res.status(401).json({ error: 'Unauthorized' });

  const orderId = req.params.id;
  let query: Record<string, unknown> = { _id: orderId };

  // ADMIN can view any order. Otherwise, scope to the same access rule as
  // getMyOrders: the rider's own assigned order, or a still-open PENDING
  // order belonging to their own merchant's fleet. Without this, any rider
  // could view any order in the system by ID — including delivered orders
  // with another merchant's customer name, phone number, and addresses.
  if (req.user?.role !== 'ADMIN') {
    const profile = await RiderProfile.findOne({ user: riderId }).lean() as any;
    query = { _id: orderId, $or: [{ rider: riderId }, { merchant: profile?.merchant, status: 'PENDING' }] };
  }

  const order = await Order.findOne(query).populate('merchant', 'fullName phoneNumber').populate('rider', 'fullName phoneNumber').lean();
  return order ? res.json(order) : res.status(404).json({ error: 'Not found' });
};

export const getOrderByToken = async (req: Request, res: Response) => {
  const token = req.params.token;

  // Strict check: Only query by tracking token, never by enumerable _id
  const raw = await Order.findOne({ trackingUrlToken: token })
    .populate('rider', 'fullName phoneNumber rating vehicleType')
    .lean();
  if (!raw) return res.status(404).json({ error: 'Invalid tracking token.' });
  
  const order = raw as any;

  // Retrieve rider's last known location from Redis cache for instant load
  try {
    const orderId = order._id.toString();
    const cachedLoc = await redis.get(`order:location:${orderId}`);
    if (cachedLoc) {
      const parsed = JSON.parse(cachedLoc);
      order.lastRiderLocation = { lat: parsed.lat, lng: parsed.lng };
    } else if (order.rider?._id) {
      const riderLoc = await redis.get(`rider_location:${order.rider._id.toString()}`);
      if (riderLoc) {
        const parsed = JSON.parse(riderLoc);
        order.lastRiderLocation = { lat: parsed[0], lng: parsed[1] };
      }
    }
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to fetch cached location from Redis in getOrderByToken');
  }

  if (order.status === 'CANCELLED') {
    return res.status(410).json({ error: 'Tracking link has expired.' });
  }

  if (order.status === 'DELIVERED') {
    const deliveredTime = order.deliveredAt ? new Date(order.deliveredAt).getTime() : new Date(order.updatedAt).getTime();
    const isPast24Hours = Date.now() - deliveredTime > 24 * 60 * 60 * 1000;
    const isAlreadyRated = order.customerRating !== undefined && order.customerRating !== null;
    
    if (isPast24Hours || isAlreadyRated) {
      return res.status(410).json({ error: 'Tracking link has expired.' });
    }
  }

  // Slim down projection to hide internal sensitive details (margin data, profit figures, customer details)
  const safeOrder = {
    _id: order._id,
    status: order.status,
    trackingUrlToken: order.trackingUrlToken,
    pickupAddress: {
      addressText: order.pickupAddress?.addressText,
      coordinates: order.pickupAddress?.coordinates || order.pickupAddress?.location?.coordinates,
    },
    deliveryAddress: {
      addressText: order.deliveryAddress?.addressText,
      coordinates: order.deliveryAddress?.coordinates || order.deliveryAddress?.location?.coordinates,
    },
    rider: order.rider ? {
      _id: order.rider._id,
      fullName: order.rider.fullName,
      phoneNumber: order.rider.phoneNumber,
      rating: order.rider.rating || 5.0,
      vehicleType: order.rider.vehicleType || 'Scooter',
    } : null,
    verificationCode: order.verificationCode,
    customerRating: order.customerRating,
    podImageUrl: order.podImageUrl,
    routeHistory: order.routeHistory,
    createdAt: order.createdAt,
    deliveredAt: order.deliveredAt,
    updatedAt: order.updatedAt,
    lastRiderLocation: order.lastRiderLocation || null,
  };

  return res.json({ order: safeOrder });
};

export const rateOrder = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { rating } = req.body;

    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be a number between 1 and 5.' });
    }

    // Strict check: Only query by tracking token, never by enumerable _id
    const order = await Order.findOne({ trackingUrlToken: token });
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (order.status !== 'DELIVERED') {
      return res.status(400).json({ error: 'Only delivered orders can be rated.' });
    }

    if ((order as any).customerRating !== undefined && (order as any).customerRating !== null) {
      return res.status(400).json({ error: 'This order has already been rated.' });
    }

    (order as any).customerRating = rating;
    await order.save();

    // Recalculate average rating of the rider
    const riderId = order.rider;
    if (riderId) {
      const avgResult = await Order.aggregate([
        { $match: { rider: riderId, customerRating: { $exists: true, $ne: null } } },
        { $group: { _id: '$rider', avgRating: { $avg: '$customerRating' } } }
      ]);

      const newAvgRating = avgResult.length > 0 ? parseFloat(avgResult[0].avgRating.toFixed(1)) : 5;
      await RiderProfile.findOneAndUpdate({ user: riderId }, { $set: { rating: newAvgRating } });
      
      // Emit socket notification to rider
      const io = req.app.get('socketio');
      if (io) {
        io.to(`rider:${riderId.toString()}`).emit('profile_update', { rating: newAvgRating });
      }
    }

    const io = req.app.get('socketio');
    if (io) {
      // Send socket event to merchant for this order rating
      io.to(`merchant:${order.merchant.toString()}`).emit('order_rated', {
        orderId: order._id,
        rating,
        riderId: order.rider,
      });

      // Broadcast order_status_changed with the rated order object to the order room
      const populatedOrder = await Order.findById(order._id).populate('rider', 'fullName').lean();
      io.to(`order:${order._id.toString()}`).emit('order_status_changed', {
        orderId: order._id,
        status: order.status,
        order: populatedOrder
      });
    }

    return res.json({ message: 'Rating submitted successfully.', rating });
  } catch (error: any) {
    logger.error({ err: (error as Error).message }, 'Failed to rate order');
    return res.status(500).json({ error: 'Failed to submit rating.' });
  }
};

export const cancelOrder = async (req: AuthRequest, res: Response) => {
  const order = await Order.findOneAndUpdate({ _id: req.params.id, merchant: req.user?._id, status: 'PENDING' }, { $set: { status: 'CANCELLED' } }, { new: true });
  if (order) req.app.get('socketio')?.to('riders:fleet').emit('order-cancelled', { orderId: order._id });
  return order ? res.json(order) : res.status(400).json({ error: 'Cannot cancel' });
};

export const getRiderLeaderboard = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.user?._id;

    // ─── Start from RiderProfile so ALL approved riders appear ─────────────
    // (not just those who have made deliveries)
    const roster = await RiderProfile.aggregate([
      // 1. Only this merchant's approved pilots
      { $match: { merchant: merchantId, onboardingStatus: 'APPROVED' } },

      // 2. Bring in User identity & finance
      { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'u' } },
      { $unwind: { path: '$u', preserveNullAndEmptyArrays: false } },

      // 3. LEFT JOIN order stats for this merchant (delivered only)
      { $lookup: {
          from: 'orders',
          let: { riderId: '$user', merchantId: merchantId },
          pipeline: [
            { $match: { $expr: { $and: [
              { $eq: ['$rider', '$$riderId'] },
              { $eq: ['$merchant', '$$merchantId'] },
              { $eq: ['$status', 'DELIVERED'] }
            ]}}},
            { $group: {
                _id: null,
                totalDeliveries: { $sum: 1 },
                totalRevenue: { $sum: '$priceInfo.amount' },
                avgDeliveryTimeMs: { $avg: { $subtract: ['$deliveredAt', '$createdAt'] } }
            }}
          ],
          as: 'stats'
      }},
      { $unwind: { path: '$stats', preserveNullAndEmptyArrays: true } },

      // 4. Shape the output
      { $project: {
          riderId: '$user',
          fullName: '$u.fullName',
          phoneNumber: '$u.phoneNumber',
          cashHeld: { $ifNull: ['$u.finance.cashHeld', 0] },
          balance: { $ifNull: ['$u.finance.balance', 0] },
          disabled: { $ifNull: ['$u.disabled', false] },
          totalDeliveries: { $ifNull: ['$stats.totalDeliveries', 0] },
          totalRevenue: { $ifNull: ['$stats.totalRevenue', 0] },
          avgDeliveryTimeMs: { $ifNull: ['$stats.avgDeliveryTimeMs', null] },
          profilePhotoUrl: 1,
          vehicleType: 1,
          vehicleMake: 1,
          vehicleModel: 1,
          vehicleYear: 1,
          vehicleColor: 1,
          licensePlate: 1,
          licenseNumber: 1,
          licensePhotoUrl: 1,
          faydaIdPhotoUrl: { $ifNull: ['$faydaIdPhotoUrl', '$idPhotoUrl'] },
          vehiclePhotoUrl: 1,
          emergencyContact: 1,
          onboardingStatus: 1,
          isAvailable: 1,
      }},
      { $sort: { totalDeliveries: -1 } }
    ]);

    return res.json(roster);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load fleet roster' });
  }
};

export const getMerchantAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const mId = req.user?._id;
    const range = Math.min(Math.max(parseInt(req.query.range as string) || 7, 1), 365);

    const since = new Date();
    since.setDate(since.getDate() - range);
    since.setHours(0, 0, 0, 0);

    // ── Daily breakdown (grouping by createdAt date) ────────────────────────
    const daily = await Order.aggregate([
      {
        $match: {
          merchant: mId,
          createdAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          totalOrders: { $sum: 1 },
          totalRevenue: {
            $sum: {
              $cond: [{ $eq: ['$status', 'DELIVERED'] }, { $ifNull: ['$priceInfo.amount', 0] }, 0],
            },
          },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] } },
          // Average time from creation to delivery (ms) – only for delivered orders
          avgMs: {
            $avg: {
              $cond: [
                { $and: [{ $eq: ['$status', 'DELIVERED'] }, { $ne: ['$deliveredAt', null] }] },
                { $subtract: ['$deliveredAt', '$createdAt'] },
                null,
              ],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // ── Overall summary for the period ─────────────────────────────────────
    const totals = daily.reduce(
      (acc, d) => ({
        totalOrders: acc.totalOrders + d.totalOrders,
        totalRevenue: acc.totalRevenue + d.totalRevenue,
        delivered: acc.delivered + d.delivered,
        cancelled: acc.cancelled + d.cancelled,
      }),
      { totalOrders: 0, totalRevenue: 0, delivered: 0, cancelled: 0 }
    );

    const closedOrders = totals.delivered + totals.cancelled;
    const successRate =
      closedOrders > 0 ? Math.round((totals.delivered / closedOrders) * 100) : 0;

    // Avg delivery minutes across days that have data
    const daysWithTiming = daily.filter(d => d.avgMs != null);
    const avgDeliveryMinutes =
      daysWithTiming.length > 0
        ? Math.round(
            daysWithTiming.reduce((s, d) => s + d.avgMs, 0) /
              daysWithTiming.length /
              60_000
          )
        : null;

    return res.json({
      daily,
      summary: {
        ...totals,
        successRate,
        avgDeliveryMinutes,
      },
    });
  } catch (err) {
    console.error('[getMerchantAnalytics]', err);
    return res.status(500).json({ error: 'Failed to compute analytics' });
  }
};


export const debugClearAllOrders = async (req: AuthRequest, res: Response) => {
  // Hard block in production regardless of auth — this endpoint should not
  // exist in a live environment at all. 404 instead of 403 so it doesn't even
  // confirm the route exists to anyone probing for it.
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  await Order.deleteMany({});
  await User.updateMany({}, { $set: { 'finance.balance': 0, 'finance.cashHeld': 0 } });
  return res.json({ message: 'Wiped' });
};

export const deleteOrder = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.user?._id;
    const orderId = req.params.id;

    const order = await Order.findOneAndDelete({ _id: orderId, merchant: merchantId });
    if (!order) return res.status(404).json({ error: 'Order not found or unauthorized' });

    const io = req.app.get('socketio');
    if (io) {
      // Notify the order room (public tracking page, etc.)
      io.to(`order:${orderId}`).emit('order_status_changed', { orderId, status: 'CANCELLED', order: null });
      // Broadcast to whole fleet so any rider who had it pending removes it
      io.to('riders:fleet').emit('order_deleted', { orderId });
      // If the order was assigned to a specific rider, notify them directly too
      if (order.rider) {
        const riderIdStr = order.rider.toString();
        io.to(`rider:${riderIdStr}`).emit('order_deleted', { orderId });
        // Also send a push notification so rider knows even if app is backgrounded
        sendPushNotification(
          riderIdStr,
          '🗑️ Order Removed',
          `Order #${orderId.slice(-6).toUpperCase()} was deleted by the merchant. Please return to base.`,
          { type: 'ORDER_DELETED', orderId }
        ).catch(() => {});
      }
    }

    return res.status(200).json({ message: 'Order deleted successfully', orderId });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to delete order.' });
  }
};

export const snatchOrder = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.user?._id;
    const orderId = req.params.id;

    const order = await Order.findOne({ _id: orderId, merchant: merchantId });
    if (!order) return res.status(404).json({ error: 'Order not found or unauthorized' });

    if (order.status === 'DELIVERED') {
      return res.status(400).json({ error: 'Cannot snatch an order that is already delivered.' });
    }
    if (order.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Cannot snatch an order that is cancelled.' });
    }

    const previousRiderId = order.rider;

    order.status = 'PENDING';
    order.rider = undefined; 
    await order.save();

    const io = req.app.get('socketio');
    if (io) {
      io.to(`order:${orderId}`).emit('order_status_changed', { orderId, status: 'PENDING', order });
      
      if (previousRiderId) {
        const riderIdStr = previousRiderId.toString();
        io.to(`rider:${riderIdStr}`).emit('notification', {
          title: '⚠️ Mission Recalled',
          body: `Order #${orderId.slice(-6).toUpperCase()} was unassigned by the merchant.`
        });
        io.to(`rider:${riderIdStr}`).emit('order-cancelled', { orderId });
      }

      io.to('riders:fleet').emit('order_created', order);
    }

    return res.status(200).json(order);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to snatch order from rider.' });
  }
};

export const getRouteGeometry = async (req: Request, res: Response) => {
  try {
    const { coordinates } = req.body;
    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
      return res.status(400).json({ error: 'At least two coordinates are required' });
    }

    const orsKey = orsConfig.apiKey;
    if (!orsKey) {
      logger.error('[Routing] ORS_API_KEY is not set — refusing to call OpenRouteService without it');
      return res.status(500).json({ error: 'Routing service is not configured.' });
    }
    const orsUrl = `https://api.openrouteservice.org/v2/directions/driving-car/geojson`;

    const response = await fetch(orsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': orsKey,
      },
      body: JSON.stringify({ coordinates }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: 'ORS API Error', details: errText });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: 'Routing failed', message: err.message });
  }
};

export const debugSendSMS = async (req: AuthRequest, res: Response) => {
  // Same hard block as debugClearAllOrders: this endpoint should not exist in a
  // live environment at all, regardless of role. 404 instead of 403 so it doesn't
  // confirm the route exists to anyone probing for it.
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    const { to, message } = req.body;
    if (!to || !message) {
      return res.status(400).json({ error: 'Phone number (to) and message are required' });
    }
    const result = await sendSMS(to, message);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to send debug SMS', message: err.message });
  }
};

