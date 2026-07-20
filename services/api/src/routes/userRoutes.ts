import { Router, Response, Request } from 'express';
import { AuthRequest, requireUser } from '../middleware/auth.js';
import User from '../models/User.js';
import RiderProfile from '../models/RiderProfile.js';
import { redis } from '../lib/redis.js';
import { sendPushNotification } from '../lib/notifications.js';

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

    // Detect a fleet-switch before overwriting: a rider resubmitting
    // onboarding with a different fleetKey unconditionally reassigns
    // RiderProfile.merchant, including while APPROVED and actively working
    // for a different company — and previously the old merchant was never
    // told the rider just left. Not a security hole, but a real
    // business-logic gap for a multi-tenant fleet system. Fetch the prior
    // state up front so we can notify the outgoing merchant after the
    // switch actually happens below.
    const existingProfile = await RiderProfile.findOne({ user: userId }).select('merchant').lean() as any;
    const previousMerchantId = existingProfile?.merchant?.toString();
    const isFleetSwitch = previousMerchantId && previousMerchantId !== merchant._id.toString();

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

    // 🔔 Notify the OUTGOING merchant if this was a fleet-switch — they
    // previously had no way to find out a rider just left for a different
    // company until the rider silently vanished from their roster.
    if (isFleetSwitch) {
      const riderDisplayName = fullName || req.user?.fullName || 'A rider';
      if (io) {
        io.to(`merchant:${previousMerchantId}`).emit('rider_left_fleet', {
          riderId: userId,
          riderName: riderDisplayName,
          newFleetKey: fleetKey.toUpperCase(),
        });
      }
      sendPushNotification(
        previousMerchantId,
        '👋 Rider Left Your Fleet',
        `${riderDisplayName} has switched to a different fleet.`,
        { type: 'RIDER_FLEET_SWITCH', riderId: userId }
      ).catch((err) => console.error('[Onboarding] Failed to notify outgoing merchant of fleet switch:', err));
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

    await User.findByIdAndUpdate(userId, { 
      expoPushToken: token,
      $addToSet: { expoPushTokens: token }
    });
    
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
      const riderProfile: any = await RiderProfile.findOne({ user: userId }).lean();
      (user as unknown as { riderProfile: any }).riderProfile = riderProfile;

      // Attach basic merchant contact info so the app can offer a real
      // "Contact Fleet Manager" action (call/email) instead of a dead label,
      // e.g. on the pending-review / rejected / deactivated gate screens.
      if (riderProfile?.merchant) {
        const merchant = await User.findById(riderProfile.merchant)
          .select('fullName businessName phoneNumber supportEmail email')
          .lean() as any;
        if (merchant) {
          (user as unknown as { fleetContact: any }).fleetContact = {
            name: merchant.businessName || merchant.fullName,
            phoneNumber: merchant.phoneNumber,
            email: merchant.supportEmail || merchant.email,
          };
        }
      }
    }

    return res.json(user);
  } catch (_error) {
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * @route   PATCH /api/user/profile
 * @desc    Self-service profile edit: name, phone, avatar, emergency contact.
 *          Deliberately separate from /rider-onboarding — that route resets
 *          onboardingStatus to IN_REVIEW and requires the full vehicle form,
 *          which is wrong for "I just want to change my photo/phone number."
 *          This route never touches onboardingStatus, fleetKey, or vehicle
 *          fields, so an already-APPROVED rider stays approved.
 * @access  Private
 */
router.patch('/profile', requireUser, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { fullName, phoneNumber, profilePhotoUrl, emergencyContact } = req.body;

    const userUpdate: Record<string, unknown> = {};
    if (typeof fullName === 'string' && fullName.trim()) userUpdate.fullName = fullName.trim();
    if (typeof phoneNumber === 'string' && phoneNumber.trim()) userUpdate.phoneNumber = phoneNumber.trim();

    const updatedUser = Object.keys(userUpdate).length
      ? await User.findByIdAndUpdate(userId, userUpdate, { new: true, runValidators: true }).select('-clerkId').lean() as any
      : await User.findById(userId).select('-clerkId').lean() as any;

    let updatedRiderProfile = null;
    if (req.user?.role === 'RIDER') {
      const profileUpdate: Record<string, unknown> = {};
      if (typeof profilePhotoUrl === 'string' && profilePhotoUrl.trim()) {
        profileUpdate.profilePhotoUrl = profilePhotoUrl.trim();
      }
      if (emergencyContact && typeof emergencyContact === 'object') {
        const { name, phone, relationship } = emergencyContact;
        profileUpdate.emergencyContact = {
          name: typeof name === 'string' ? name.trim() : '',
          phone: typeof phone === 'string' ? phone.trim() : '',
          relationship: typeof relationship === 'string' ? relationship.trim() : '',
        };
      }
      updatedRiderProfile = Object.keys(profileUpdate).length
        ? await RiderProfile.findOneAndUpdate({ user: userId }, profileUpdate, { new: true, runValidators: true }).lean()
        : await RiderProfile.findOne({ user: userId }).lean();
    }

    return res.json({
      message: 'Profile updated.',
      user: updatedUser,
      riderProfile: updatedRiderProfile,
    });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ error: error.message || 'Failed to update profile' });
  }
});

/**
 * @route   PATCH /api/user/documents
 * @desc    Rider re-submits a single compliance document (license, ID, or
 *          vehicle photo) after rejection or expiry. Unlike /profile, this
 *          intentionally DOES flip the rider back to IN_REVIEW — compliance
 *          documents need a human to re-check them — but it does so without
 *          requiring the whole onboarding form again.
 * @access  Private (Rider Only)
 */
router.patch('/documents', requireUser, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user?.role !== 'RIDER') return res.status(403).json({ error: 'Riders only.' });

    const { licensePhotoUrl, idPhotoUrl, faydaIdPhotoUrl, vehiclePhotoUrl } = req.body;
    const update: Record<string, unknown> = {};
    if (typeof licensePhotoUrl === 'string' && licensePhotoUrl.trim()) update.licensePhotoUrl = licensePhotoUrl.trim();
    if (typeof idPhotoUrl === 'string' && idPhotoUrl.trim()) update.idPhotoUrl = idPhotoUrl.trim();
    if (typeof faydaIdPhotoUrl === 'string' && faydaIdPhotoUrl.trim()) update.faydaIdPhotoUrl = faydaIdPhotoUrl.trim();
    if (typeof vehiclePhotoUrl === 'string' && vehiclePhotoUrl.trim()) update.vehiclePhotoUrl = vehiclePhotoUrl.trim();

    if (!Object.keys(update).length) {
      return res.status(400).json({ error: 'No document provided.' });
    }

    update.onboardingStatus = 'IN_REVIEW';
    update.rejectionReason = null;

    const profile = await RiderProfile.findOneAndUpdate({ user: userId }, update, { new: true, runValidators: true });
    if (!profile) return res.status(404).json({ error: 'Rider profile not found.' });

    const io = req.app.get('socketio');
    if (io && profile.merchant) {
      io.to(`merchant:${profile.merchant.toString()}`).emit('pilot_document_resubmitted', {
        riderId: userId,
        riderName: req.user?.fullName,
        updatedFields: Object.keys(update).filter((k) => k !== 'onboardingStatus' && k !== 'rejectionReason'),
      });
    }

    return res.json({ message: 'Document submitted for review.', profile });
  } catch (error: any) {
    console.error('Error updating documents:', error);
    return res.status(500).json({ error: error.message || 'Failed to update documents' });
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

    // Resolve ownership once, up front, and reuse it for both the socket
    // broadcast and the Redis writes below. Previously the ownership check
    // ("only the assigned rider may broadcast") only wrapped the socket.io
    // emit — the Redis writes for order:location:${orderId} ran
    // unconditionally just below it, regardless of whether this rider
    // actually owned that order. Nothing currently reads that key back out,
    // so it wasn't exploitable yet, but the first read path added against
    // it (e.g. the public tracking page) would let any authenticated rider
    // inject fake location data into an order that isn't theirs.
    let ownedOrder: any = null;
    if (!isGlobal) {
      ownedOrder = await (await import('../models/Order.js')).default
        .findById(safeOrderId).select('merchant rider').lean() as any;
    }
    const ownsOrder = isGlobal || (ownedOrder && ownedOrder.rider?.toString() === mongoId);

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
      } else if (ownsOrder) {
        io.to(`order:${safeOrderId}`).emit('rider_moved', payload);
        if (ownedOrder.merchant) {
          io.to(`merchant:${ownedOrder.merchant.toString()}`).emit('fleet_radar_update', {
            riderId: mongoId, orderId: safeOrderId, lat, lng, speed, riderName: verifiedName
          });
        }
      }
    }

    // ── 2. Update Redis cache ────────────────────────────────────────────
    const telemetry = JSON.stringify({ lat, lng, battery, speed, riderName, lastSeen: Date.now() });
    // rider_location is keyed by the rider's own mongoId — no order
    // ownership question, always safe to write.
    await redis.set(`rider_location:${mongoId}`, JSON.stringify([lat, lng]), 'EX', 120);

    if (isGlobal || ownsOrder) {
      await redis.set(`order:location:${safeOrderId || 'global'}`, telemetry, 'EX', 60);

      if (safeOrderId) {
        const historyKey = `order:history:points:${safeOrderId}`;
        await redis.lpush(historyKey, telemetry);
        await redis.ltrim(historyKey, 0, 49);
        await redis.expire(historyKey, 3600);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('[BG Location HTTP] Error:', error.message);
    return res.status(500).json({ error: 'Failed to process location update' });
  }
});

export default router;
