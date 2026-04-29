import { Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import Order from '../models/Order.js';
import { AuthRequest } from '../middleware/auth.js';
import { createOrderSchema } from '../validators/orderValidator.js';

/**
 * @route   POST /api/orders
 * @desc    Create a new delivery order (Merchant Dispatch)
 * @access  Private (Merchant only)
 */

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.user?._id;

    if (!merchantId) {
      return res.status(401).json({
        error: 'Unauthorized user.',
      });
    }

    const validated = createOrderSchema.parse(req.body);

    const trackingUrlToken = crypto.randomBytes(16).toString('hex');

    const newOrder = new Order({
      merchant: merchantId,
      pickupAddress: {
        addressText: validated.pickupAddress.addressText,
        location: {
          type: 'Point',
          coordinates: validated.pickupAddress.coordinates,
        },
      },
      deliveryAddress: {
        addressText: validated.deliveryAddress.addressText,
        location: {
          type: 'Point',
          coordinates: validated.deliveryAddress.coordinates,
        },
      },
      itemDetails: validated.itemDetails,
      priceInfo: validated.priceInfo,
      trackingUrlToken,
      status: 'PENDING',
    });

    await newOrder.save();

    return res.status(201).json({
      message: 'Order created successfully',
      orderId: newOrder._id,
      trackingToken: trackingUrlToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input',
        details: error.errors,
      });
    }
    console.error('Error creating order:', error);
    return res.status(500).json({ error: 'Failed to create order.' });
  }
};

/**
 * @route   GET /api/orders
 * @desc    Get all orders for the authenticated merchant (with pagination)
 * @access  Private (Merchant only)
 */
export const getMerchantOrders = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.user?._id;
    if (!merchantId) {
      return res.status(401).json({ error: 'Unauthorized user.' });
    }
    // Basic pagination from query params (e.g., ?page=1&limit=10)
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    // Fetch orders, sorted by newest first
    // .populate() auto-fills rider details if a rider is assigned
    const orders = await Order.find({ merchant: merchantId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('rider', 'fullName phoneNumber vehicleType rating')
      .lean();
    const totalOrders = await Order.countDocuments({ merchant: merchantId });
    return res.status(200).json({
      orders,
      pagination: {
        total: totalOrders,
        page,
        pages: Math.ceil(totalOrders / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching merchant orders:', error);
    return res.status(500).json({ error: 'Failed to fetch orders.' });
  }
};
/**
 * @route   POST /api/orders/:id/accept
 * @desc    Rider accepts a pending order
 * @access  Private (Rider only)
 */
export const acceptOrder = async (req: AuthRequest, res: Response) => {
  try {
    const riderId = req.user?._id;
    const orderId = req.params.id;
    if (!riderId) {
      return res.status(401).json({ error: 'Unauthorized user.' });
    }
    // Atomically find and update: only works if status is still PENDING
    // This prevents two riders from accepting the same order
    const order = await Order.findOneAndUpdate(
      { _id: orderId, status: 'PENDING' },
      { status: 'ACCEPTED', rider: riderId },
      { new: true }
    );
    if (!order) {
      return res.status(400).json({ error: 'Order is no longer available or does not exist.' });
    }

    // BROADCAST STATUS CHANGE: Let the merchant know their order was accepted
    const io = req.app.get('socketio');
    if (io) {
      io.to(`order:${orderId}`).emit('order_status_changed', {
        orderId,
        status: 'ACCEPTED',
      });
    }

    return res.status(200).json({ message: 'Order accepted successfully', order });
  } catch (error) {
    console.error('Error accepting order:', error);
    return res.status(500).json({ error: 'Failed to accept order.' });
  }
};
/**
 * @route   GET /api/orders/track/:token
 * @desc    Get order details by tracking token (Public)
 * @access  Public
 */
export const getOrderByToken = async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.params;
    const order = await Order.findOne({ trackingUrlToken: token })
      .populate('rider', 'fullName phoneNumber vehicleType rating')
      .lean();

    if (!order) {
      return res.status(404).json({ error: 'Tracking link invalid or expired.' });
    }

    return res.status(200).json({ order });
  } catch (error) {
    console.error('Error fetching public order:', error);
    return res.status(500).json({ error: 'Failed to retrieve tracking info.' });
  }
};
