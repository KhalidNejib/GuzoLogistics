import { Router, Response, Request } from 'express';
import { AuthRequest, requireUser } from '../middleware/auth.js';
import User from '../models/User.js';
import RiderProfile from '../models/RiderProfile.js';
import { redis } from '../lib/redis.js';

const router: Router = Router();

/**
 * @route   PATCH /api/user/rider-onboarding
 * @desc    Submit rider identity and vehicle info for verification
 * @access  Private (Rider Only)
 */
router.patch('/rider-onboarding', requireUser, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Ensure only RIDERS can onboard here
    if (req.user?.role !== 'RIDER') {
      return res.status(403).json({ error: 'Access denied. Riders only.' });
    }

    const {
      fleetKey,
      vehicleType,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      vehicleColor,
      licensePlate,
      licenseNumber,
      licensePhotoUrl,
      profilePhotoUrl,
      idPhotoUrl,
      faydaIdPhotoUrl,
      vehiclePhotoUrl,
      emergencyContact,
    } = req.body;

    // 0. Validate Fleet Key
    if (!fleetKey) return res.status(400).json({ error: 'Company Fleet Key is required.' });
    const merchant = await User.findOne({ fleetKey: fleetKey.toUpperCase(), role: 'MERCHANT' });
    if (!merchant) return res.status(404).json({ error: 'Invalid Fleet Key. Please contact your company admin.' });

    // 1. Update/Create Rider Profile
    const profile = await RiderProfile.findOneAndUpdate(
      { user: userId },
      {
        merchant: merchant._id,
        vehicleType,
        vehicleMake,
        vehicleModel,
        vehicleYear,
        vehicleColor,
        licensePlate,
        licenseNumber,
        profilePhotoUrl,
        licensePhotoUrl,
        idPhotoUrl,
        faydaIdPhotoUrl,
        vehiclePhotoUrl,
        emergencyContact,
        onboardingStatus: 'IN_REVIEW', // Move to review phase
        currentLocation: { type: 'Point', coordinates: [38.7578, 8.9806] } // Default to Addis Ababa
      },
      { upsert: true, new: true, runValidators: true }
    );

    // 2. Mark User as onboarding completed and update profile info
    const { fullName, phoneNumber } = req.body;
    const userUpdate: any = { onboardingCompleted: true };
    if (fullName) userUpdate.fullName = fullName;
    if (phoneNumber) userUpdate.phoneNumber = phoneNumber;

    await User.findByIdAndUpdate(userId, userUpdate);

    console.info(`🛡️ [Onboarding] Rider ${userId} submitted documents for review.`);

    // 🔔 Real-time Dashboard Update for Merchant
    const io = req.app.get('socketio');
    if (io && merchant) {
      io.to(`merchant:${merchant._id}`).emit('new_pilot_application', {
        user: {
          _id: userId,
          fullName: fullName || req.user?.fullName, // Use fresh data from submission
          phoneNumber: phoneNumber || req.user?.phoneNumber, // Use fresh data from submission
          email: req.user?.email
        },
        vehicleType,
        vehicleMake, // Added missing manufacturer info
        vehicleModel,
        licensePlate,
        profilePhotoUrl,
        licensePhotoUrl,
        faydaIdPhotoUrl: faydaIdPhotoUrl || idPhotoUrl,
        vehiclePhotoUrl,
        emergencyContact,
        onboardingStatus: 'IN_REVIEW'
      });
    }

    return res.status(200).json({ 
      message: 'Onboarding data submitted successfully. Your profile is now under review.',
      profile 
    });
  } catch (error: any) {
    console.error('Error during rider onboarding:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit onboarding data' });
  }
});


/**
 * @route   PATCH /api/user/push-token
 * @desc    Save Expo Push Token for the authenticated user
 * @access  Private
 */
router.patch('/push-token', requireUser, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { token } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!token) return res.status(400).json({ error: 'Token is required' });

    await User.findByIdAndUpdate(userId, { expoPushToken: token });
    
    console.info(`📲 [Push] Saved token for user ${userId}`);
    return res.status(200).json({ message: 'Push token saved successfully' });
  } catch (error) {
    console.error('Error saving push token:', error);
    return res.status(500).json({ error: 'Failed to save push token' });
  }
});

/**
 * @route   GET /api/user/me
 * @desc    Get current user profile (including finance and rider profile)
 * @access  Private
 */
router.get('/me', requireUser, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Populate rider profile if the user is a rider
    const user = await User.findById(userId).select('-clerkId').lean() as any;
    
    if (user?.role === 'RIDER') {
      const riderProfile = await RiderProfile.findOne({ user: userId }).lean();
      (user as unknown as { riderProfile: any }).riderProfile = riderProfile;
    }

    return res.json(user);
  } catch (_error) {
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * @route   POST /api/v1/user/location
 * @desc    HTTP fallback for background location — used when the socket is dead (Android kills WS in background).
 *          Writes to Redis cache and fans out rider_moved + fleet_radar_update via socket.io so the
 *          merchant dashboard and public tracking page stay live even when the rider app is backgrounded.
 * @access  Private (Rider Only)
 */
router.post('/location', requireUser, async (req: AuthRequest, res: Response) => {
  try {
    const mongoId = req.user?._id?.toString();
    const userId  = req.user;
    if (!mongoId) return res.status(401).json({ error: 'Unauthorized' });
    if (userId?.role !== 'RIDER') return res.status(403).json({ error: 'Riders only' });

    const { orderId, lat, lng, speed, battery, riderName } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'lat and lng are required numbers' });
    }

    const safeOrderId = orderId && /^[0-9a-fA-F]{24}$/.test(orderId) ? orderId : null;
    const isGlobal   = !safeOrderId;
    const city       = (req.user as any)?.serviceCity || 'Default';

    // ── 1. Fan out via socket.io (if server has io instance) ────────────
    const io = req.app.get('socketio');
    if (io) {
      const verifiedName = req.user?.fullName || riderName || 'Rider';
      const payload = { orderId: safeOrderId || 'IDLE', lat, lng, speed, battery, riderName: verifiedName };

      if (isGlobal) {
        io.to('riders:global').emit('rider_moved', { orderId: 'global', lat, lng, speed, riderName: verifiedName });
        io.to(`city:fleet:${city}`).emit('fleet_radar_update', {
          riderId: mongoId, orderId: 'IDLE', lat, lng, speed, riderName: verifiedName
        });
      } else {
        // Security: only the assigned rider may broadcast
        const order = await (await import('../models/Order.js')).default
          .findById(safeOrderId).select('merchant rider').lean() as any;
        if (order && order.rider?.toString() === mongoId) {
          io.to(`order:${safeOrderId}`).emit('rider_moved', payload);
          if (order.merchant) {
            io.to(`merchant:${order.merchant.toString()}`).emit('fleet_radar_update', {
              riderId: mongoId, orderId: safeOrderId, lat, lng, speed, riderName: verifiedName
            });
          }
        }
      }
    }

    // ── 2. Update Redis cache ────────────────────────────────────────────
    const telemetry = JSON.stringify({ lat, lng, battery, speed, riderName, lastSeen: Date.now() });
    await redis.set(`order:location:${safeOrderId || 'global'}`, telemetry, 'EX', 60);
    await redis.set(`rider_location:${mongoId}`, JSON.stringify([lat, lng]), 'EX', 120);

    if (safeOrderId) {
      const historyKey = `order:history:points:${safeOrderId}`;
      await redis.lpush(historyKey, telemetry);
      await redis.ltrim(historyKey, 0, 49);
      await redis.expire(historyKey, 3600);
    }

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('[BG Location HTTP] Error:', error.message);
    return res.status(500).json({ error: 'Failed to process location update' });
  }
});

export default router;
