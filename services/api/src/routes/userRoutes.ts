import { Router, Response } from 'express';
import { AuthRequest, requireUser } from '../middleware/auth.js';
import User from '../models/User.js';
import RiderProfile from '../models/RiderProfile.js';

const router = Router();

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
    const user = await User.findById(userId).select('-clerkId').lean();
    
    if (user?.role === 'RIDER') {
      const riderProfile = await RiderProfile.findOne({ user: userId }).lean();
      (user as unknown as { riderProfile: any }).riderProfile = riderProfile;
    }

    return res.json(user);
  } catch (_error) {
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;
