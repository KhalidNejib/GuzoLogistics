import { Response } from 'express';
import User from '../models/User.js';
import { AuthRequest } from '../middleware/auth.js';

/**
 * @route   GET /api/merchant/profile
 * @desc    Get current merchant's profile data
 * @access  Private (Merchant only)
 */
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.user?._id;
    if (!merchantId) {
      return res.status(401).json({ error: 'Unauthorized user.' });
    }

    const merchant = await User.findById(merchantId).select('-clerkId').lean();
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found.' });
    }

    return res.status(200).json({ merchant });
  } catch (error) {
    console.error('Error fetching merchant profile:', error);
    return res.status(500).json({ error: 'Failed to fetch profile.' });
  }
};

/**
 * @route   PUT /api/merchant/profile
 * @desc    Update merchant's profile data
 * @access  Private (Merchant only)
 */
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.user?._id;
    if (!merchantId) {
      return res.status(401).json({ error: 'Unauthorized user.' });
    }

    const { businessName, supportEmail, businessAddress, phoneNumber } = req.body;

    const updatedMerchant = await User.findByIdAndUpdate(
      merchantId,
      {
        businessName,
        supportEmail,
        businessAddress,
        phoneNumber,
      },
      { new: true, runValidators: true }
    ).select('-clerkId');

    if (!updatedMerchant) {
      return res.status(404).json({ error: 'Merchant not found.' });
    }

    return res.status(200).json({
      message: 'Profile updated successfully',
      merchant: updatedMerchant,
    });
  } catch (error) {
    console.error('Error updating merchant profile:', error);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
};
