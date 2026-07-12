import { Response } from 'express';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { cloudinaryConfig } from '../lib/env.js';
import User from '../models/User.js';
import RiderProfile from '../models/RiderProfile.js';
import Payout from '../models/Payout.js';
import Transaction from '../models/Transaction.js';
import { AuthRequest } from '../middleware/auth.js';
import { sendPushNotification } from '../lib/notifications.js';
import { generateTransactionId, generatePayoutId } from '../lib/idGenerator.js';
import { Server } from 'socket.io';

if (cloudinaryConfig.apiKey) {
  cloudinary.config({
    cloud_name: cloudinaryConfig.cloudName,
    api_key: cloudinaryConfig.apiKey,
    api_secret: cloudinaryConfig.apiSecret,
  });
}

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

    const { 
      businessName, 
      supportEmail, 
      businessAddress, 
      phoneNumber,
      notificationSettings,
      preferences,
      deliveryPricing
    } = req.body;

    const updatedMerchant = await User.findByIdAndUpdate(
      merchantId,
      {
        businessName,
        supportEmail,
        businessAddress,
        phoneNumber,
        notificationSettings,
        preferences,
        deliveryPricing,
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
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
};

/**
 * @route   PATCH /api/merchant/riders/:id/name
 * @desc    Merchant renames a Rider to fix the "New User" OTP signup bug
 * @access  Private (Merchant only)
 */
export const renameRider = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.user?._id;
    if (!merchantId) return res.status(401).json({ error: 'Unauthorized user.' });

    const { fullName } = req.body;
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0) {
      return res.status(400).json({ error: 'Valid full name is required.' });
    }

    const riderId = req.params.id;
    if (req.user?.role !== 'ADMIN') {
      const ownsRider = await RiderProfile.exists({ user: riderId, merchant: merchantId });
      if (!ownsRider) {
        return res.status(403).json({ error: 'This rider does not belong to your fleet.' });
      }
    }

    const updatedRider = await User.findOneAndUpdate(
      { _id: riderId, role: 'RIDER' },
      { fullName: fullName.trim() },
      { new: true, runValidators: true }
    ).select('-clerkId');

    if (!updatedRider) {
      return res.status(404).json({ error: 'Rider not found.' });
    }

    return res.status(200).json({ message: 'Rider officially renamed.', rider: updatedRider });
  } catch (error) {
    console.error('Error renaming rider:', error);
    return res.status(500).json({ error: 'Failed to rename rider.' });
  }
};

/**
 * @route   POST /api/v1/merchant/onboarding
 * @desc    Complete the new merchant self-onboarding wizard
 * @access  Private (Merchant only)
 */
export const completeOnboarding = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.user?._id;
    if (!merchantId) return res.status(401).json({ error: 'Unauthorized user.' });

    const { businessName, businessAddress, supportEmail, phoneNumber, serviceCity, logoUrl, deliveryPricing } = req.body;

    if (!businessName?.trim()) {
      return res.status(400).json({ error: 'Business name is required.' });
    }

    const updated = await User.findByIdAndUpdate(
      merchantId,
      {
        businessName: businessName.trim(),
        businessAddress: businessAddress?.trim() || '',
        supportEmail: supportEmail?.trim() || '',
        phoneNumber: phoneNumber?.trim() || req.user?.phoneNumber,
        serviceCity: serviceCity?.trim() || '',
        logoUrl: logoUrl || null,
        deliveryPricing: {
          baseFare: Number(deliveryPricing?.baseFare) || 50,
          perKmRate: Number(deliveryPricing?.perKmRate) || 10,
          currency: 'ETB',
        },
        fleetKey: req.user?.fleetKey || `ETHIO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        onboardingCompleted: true,
      },
      { new: true, runValidators: true }
    ).select('-clerkId');

    if (!updated) return res.status(404).json({ error: 'Merchant not found.' });

    return res.status(200).json({ message: 'Onboarding complete! Welcome aboard.', merchant: updated });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    return res.status(500).json({ error: 'Failed to complete onboarding.' });
  }
};

/**
 * @route   POST /api/v1/merchant/finance/collect/:riderId
 * @desc    Collect all cash held by a specific rider (Shift settlement)
 * @access  Private (Merchant only)
 */
export const collectCashFromRider = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const merchantId = req.user?._id;
    const { riderId } = req.params;

    const [rider, ownsRider] = await Promise.all([
      User.findById(riderId).session(session),
      RiderProfile.exists({ user: riderId, merchant: merchantId }).session(session),
    ]);
    if (!rider || rider.role !== 'RIDER') {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Rider not found.' });
    }
    if (!ownsRider) {
      await session.abortTransaction();
      return res.status(403).json({ error: 'This rider does not belong to your fleet.' });
    }

    const cashAmount = rider.finance?.cashHeld || 0;
    if (cashAmount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Rider has no cash to collect.' });
    }

    await User.updateOne(
      { _id: riderId },
      { $set: { 'finance.cashHeld': 0 } },
      { session }
    );

    await User.updateOne(
      { _id: merchantId },
      { 
        $inc: { 
          'finance.codBalance': -cashAmount,
          'finance.balance': cashAmount 
        } 
      },
      { session }
    );

    // Create a transaction record for both parties
    await Transaction.create([{
        user: riderId,
        type: 'CASH_COLLECTED',
        amount: cashAmount,
        status: 'COMPLETED',
        description: `Cash handover to merchant: ${req.user?.businessName || req.user?.fullName}`,
        referenceId: generateTransactionId('CH'),
        paymentMethod: 'CASH'
    }, {
        user: merchantId,
        type: 'CASH_COLLECTED',
        amount: cashAmount,
        status: 'COMPLETED',
        description: `Cash collected from rider: ${rider.fullName}`,
        referenceId: generateTransactionId('CC'),
        paymentMethod: 'CASH'
    }], { session });

    await session.commitTransaction();
    return res.status(200).json({ 
      message: `Successfully collected ETB ${cashAmount.toLocaleString()} from ${rider.fullName}`,
      collectedAmount: cashAmount
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Error settling cash:', error);
    return res.status(500).json({ error: 'Settle attempt failed.' });
  } finally {
    session.endSession();
  }
};

/**
 * @route   POST /api/v1/merchant/finance/payout
 * @desc    Request a payout from the available balance
 * @access  Private (Merchant only)
 */
export const requestPayout = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const merchantId = req.user?._id;
    const { amount, bankDetails } = req.body;

    if (!amount || amount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Invalid payout amount.' });
    }

    const merchant = await User.findById(merchantId).session(session);
    if (!merchant || (merchant.finance?.balance || 0) < amount) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Insufficient balance for this withdrawal.' });
    }

    if (amount < 100) {
        await session.abortTransaction();
        return res.status(400).json({ error: 'Minimum payout amount is ETB 100.' });
    }

    await User.updateOne(
      { _id: merchantId },
      { $inc: { 'finance.balance': -amount } },
      { session }
    );

    const payoutId = generatePayoutId();
    const payout = await Payout.create([{
      merchant: merchantId,
      amount,
      referenceId: payoutId,
      status: 'PENDING',
      method: 'Bank Transfer',
      bankDetails: bankDetails || {
          bankName: 'CBE',
          accountNumber: merchant.phoneNumber,
          accountName: merchant.businessName || merchant.fullName
      }
    }], { session });

    await Transaction.create([{
        user: merchantId,
        type: 'PAYOUT',
        amount: amount,
        status: 'PENDING',
        referenceId: payoutId,
        description: `Payout request to ${bankDetails?.bankName || 'CBE'}`
    }], { session });

    await session.commitTransaction();
    return res.status(200).json({ 
      message: 'Payout request received.', 
      payout: payout[0] 
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Payout error:', error);
    return res.status(500).json({ error: 'Failed to request payout.' });
  } finally {
    session.endSession();
  }
};

/**
 * @route   PATCH /api/v1/merchant/finance/payouts/:id
 * @desc    Admin resolves a pending payout after the bank transfer is actually
 *          sent (or rejects it). Nothing else in this system ever moves a
 *          Payout out of PENDING, so this is the only place that happens.
 * @access  Private (Admin only)
 */
export const processPayout = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { status, notes } = req.body as { status?: string; notes?: string };
    const payoutId = req.params.id;

    if (!['PROCESSING', 'PAID', 'REJECTED'].includes(status || '')) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'status must be PROCESSING, PAID, or REJECTED.' });
    }

    const payout = await Payout.findById(payoutId).session(session);
    if (!payout || payout.status === 'PAID' || payout.status === 'REJECTED') {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Payout not found or already finalized.' });
    }

    if (status === 'REJECTED') {
      // requestPayout debits the merchant's balance immediately on request,
      // so a rejection has to give that money back.
      await User.findByIdAndUpdate(payout.merchant, { $inc: { 'finance.balance': payout.amount } }, { session });
    }

    payout.status = status as any;
    if (notes) payout.notes = notes;
    if (status === 'PAID') payout.processedAt = new Date();
    await payout.save({ session });

    if (payout.referenceId) {
      await Transaction.updateOne(
        { referenceId: payout.referenceId, type: 'PAYOUT' },
        { $set: { status: status === 'PAID' ? 'COMPLETED' : status === 'REJECTED' ? 'FAILED' : 'PROCESSING' } },
        { session }
      );
    }

    await session.commitTransaction();

    const io: Server = req.app.get('socketio');
    if (io) io.to(`merchant:${payout.merchant}`).emit('payout_update', { payoutId: payout._id, status: payout.status });

    return res.status(200).json({ message: 'Payout updated.', payout });
  } catch (error) {
    await session.abortTransaction();
    console.error('Process payout error:', error);
    return res.status(500).json({ error: 'Failed to update payout.' });
  } finally {
    session.endSession();
  }
};

/**
 * @route   POST /api/v1/merchant/finance/upload-proof
 * @desc    Rider uploads a Telebirr payment screenshot to Cloudinary
 * @access  Private (Rider only)
 */
export const uploadSettlementProof = async (req: AuthRequest, res: Response) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'No image provided.' });
    }

    const formatted = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    const result = await cloudinary.uploader.upload(formatted, {
      folder: 'ethio-logistics/settlements',
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    });

    return res.status(200).json({ url: result.secure_url });
  } catch (error) {
    console.error('Proof upload error:', error);
    return res.status(500).json({ error: 'Image upload failed.' });
  }
};

/**
 * @route   GET /api/v1/merchant/finance/history
 * @desc    Get all financial history
 */
export const getFinanceHistory = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.user?._id;
    if (!merchantId) return res.status(401).json({ error: 'Unauthorized' });

    const transactions = await Transaction.find({ user: merchantId }).sort({ createdAt: -1 }).limit(50);
    const payouts = await Payout.find({ merchant: merchantId }).sort({ createdAt: -1 }).limit(50);

    return res.json({ transactions, payouts });
  } catch (error) {
    return res.status(500).json({ error: 'Failed' });
  }
};

/**
 * @route   POST /api/v1/merchant/finance/settle-request
 * @desc    Rider submits a digital settlement request (Repaying debt via Telebirr)
 */
export const requestSettlement = async (req: AuthRequest, res: Response) => {
  try {
    const riderId = req.user?._id;
    const { amount, referenceId, method, proofImageUrl } = req.body;

    if (!amount || amount <= 0 || !referenceId) {
      return res.status(400).json({ error: 'All fields required.' });
    }

    const existing = await Transaction.findOne({ referenceId, status: { $ne: 'FAILED' } });
    if (existing) {
        return res.status(400).json({ error: 'Duplicate Transaction ID.' });
    }

    let transaction;
    try {
      transaction = await Transaction.create({
        user: riderId,
        type: 'SETTLEMENT',
        amount,
        referenceId,
        proofImageUrl,
        paymentMethod: method || 'TELEBIRR',
        status: 'PENDING',
        description: `Debt settlement via Telebirr (TX: ${referenceId})`
      });
    } catch (err: any) {
      // The findOne check above is a fast-path convenience only — it isn't
      // atomic, so two requests with the same referenceId can both pass it.
      // The unique index on Transaction.referenceId is what actually
      // prevents the duplicate from being written; this just turns that
      // into a clean 400 instead of a raw 500.
      if (err?.code === 11000) {
        return res.status(400).json({ error: 'Duplicate Transaction ID.' });
      }
      throw err;
    }

    // 🔔 Notify all merchants via Socket.io
    const io: Server = req.app.get('socketio');
    if (io) {
        io.emit('new_settlement_request', {
            id: transaction._id,
            riderName: req.user?.fullName,
            amount,
            referenceId,
            proofImageUrl: transaction.proofImageUrl
        });
    }

    return res.status(201).json({ message: 'Submitted!', transaction });
  } catch (error) {
      console.error(error);
    return res.status(500).json({ error: 'Failed' });
  }
};

/**
 * @route   GET /api/v1/merchant/finance/pending-settlements
 * @desc    Merchant views pending requests
 */
export const getPendingSettlements = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.user?._id;
    const myRiderIds = await RiderProfile.find({ merchant: merchantId }).distinct('user');

    const settlements = await Transaction.find({
      type: 'SETTLEMENT',
      status: 'PENDING',
      user: { $in: myRiderIds },
    }).populate('user', 'fullName phoneNumber').sort({ createdAt: -1 });

    return res.status(200).json(settlements);
  } catch (error) {
    return res.status(500).json({ error: 'Failed' });
  }
};

/**
 * @route   POST /api/v1/merchant/finance/verify-settlement/:id
 * @desc    Merchant confirms or rejects a digital settlement
 */
export const verifySettlement = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const merchantId = req.user?._id;
    const { status } = req.body;
    const transactionId = req.params.id;

    const transaction = await Transaction.findById(transactionId).session(session);
    if (!transaction || transaction.status !== 'PENDING' || transaction.type !== 'SETTLEMENT') {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Invalid request.' });
    }

    const ownsRider = await RiderProfile.exists({ user: transaction.user, merchant: merchantId }).session(session);
    if (!ownsRider) {
      await session.abortTransaction();
      return res.status(403).json({ error: 'This settlement does not belong to your fleet.' });
    }

    if (status === 'COMPLETED') {
        const amount = transaction.amount;
        // Atomic: only debit cashHeld if the rider actually owes at least this
        // much, so a fabricated/oversized settlement amount can't push their
        // debt negative.
        const debited = await User.findOneAndUpdate(
          { _id: transaction.user, 'finance.cashHeld': { $gte: amount } },
          { $inc: { 'finance.cashHeld': -amount } },
          { session, new: true }
        );
        if (!debited) {
          await session.abortTransaction();
          return res.status(400).json({ error: "Settlement amount exceeds rider's recorded cash debt." });
        }
        await User.findByIdAndUpdate(merchantId, { 
            $inc: { 'finance.codBalance': -amount, 'finance.balance': amount } 
        }, { session });

        transaction.status = 'COMPLETED';
    } else {
        transaction.status = 'FAILED';
        transaction.referenceActive = false;
    }

    await transaction.save({ session });
    await session.commitTransaction();

    // 🔔 Notify Rider via Push & Socket
    const riderId = transaction.user?.toString();
    const amount  = transaction.amount?.toLocaleString() || '0';
    if (riderId) {
      const io: Server = req.app.get('socketio');
      const finalRider = await User.findById(riderId).select('finance');
      
      if (io && finalRider) {
        io.to(`rider:${riderId}`).emit('finance_update', {
            balance: finalRider.finance?.balance || 0,
            cashHeld: finalRider.finance?.cashHeld || 0,
            todayEarnings: finalRider.finance?.todayEarnings || 0
        });
      }

      if (status === 'COMPLETED') {
        await sendPushNotification(
          riderId,
          '💚 Debt Cleared!',
          `Your ETB ${amount} Telebirr repayment was approved. Debt settled! ✅`,
          { type: 'SETTLEMENT_APPROVED', amount }
        );
      } else {
        await sendPushNotification(
          riderId,
          '❌ Settlement Rejected',
          `Your ETB ${amount} repayment was rejected. Please resubmit with a valid Reference ID.`,
          { type: 'SETTLEMENT_REJECTED', amount }
        );
      }
    }

    return res.status(200).json({ message: 'Success' });
  } catch (error) {
    await session.abortTransaction();
    return res.status(500).json({ error: 'Failed' });
  } finally {
    session.endSession();
  }
};

/**
 * @route   GET /api/v1/merchant/pending-pilots
 * @desc    Get riders who applied to join this merchant's fleet
 */
export const getPendingPilots = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.user?._id;
    const pilots = await RiderProfile.find({ 
      merchant: merchantId, 
      onboardingStatus: 'IN_REVIEW' 
    }).populate('user', 'fullName phoneNumber email').lean();

    return res.json(pilots);
  } catch (_error) {
    return res.status(500).json({ error: 'Failed to fetch pending pilots' });
  }
};

/**
 * @route   PATCH /api/v1/merchant/approve-pilot/:id
 * @desc    Approve or Reject a rider's application to the fleet
 */
export const approvePilot = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.user?._id;
    const { status, rejectionReason } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status update.' });
    }

    const profile = await RiderProfile.findOneAndUpdate(
      { user: req.params.id, merchant: merchantId },
      { 
        onboardingStatus: status,
        rejectionReason: status === 'REJECTED' ? rejectionReason : null
      },
      { new: true }
    ).populate('user', 'fullName phoneNumber email');

    if (!profile) return res.status(404).json({ error: 'Pilot request not found.' });

    const io = req.app.get('socketio');
    if (io) {
      const riderId = req.params.id;

      // 📡 Notify the RIDER instantly (unlocks the app)
      io.to(`rider:${riderId}`).emit('notification', {
        title: status === 'APPROVED' ? '🚀 Mission Ready!' : '❌ Application Update',
        body: status === 'APPROVED' 
          ? 'Your pilot profile has been approved. You are now authorized to go online.' 
          : `Your application was rejected: ${rejectionReason || 'Contact support'}`
      });
      io.to(`rider:${riderId}`).emit('onboarding_status_changed', { status });

      // 📡 Notify the MERCHANT instantly (updates fleet roster without refresh)
      if (status === 'APPROVED') {
        const user = profile.user as any;
        io.to(`merchant:${merchantId}`).emit('pilot_approved', {
          riderId: user._id,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          profilePhotoUrl: (profile as any).profilePhotoUrl,
          vehicleType: (profile as any).vehicleType,
          vehicleMake: (profile as any).vehicleMake,
          vehicleModel: (profile as any).vehicleModel,
          vehicleYear: (profile as any).vehicleYear,
          vehicleColor: (profile as any).vehicleColor,
          licensePlate: (profile as any).licensePlate,
          licenseNumber: (profile as any).licenseNumber,
          licensePhotoUrl: (profile as any).licensePhotoUrl,
          faydaIdPhotoUrl: (profile as any).faydaIdPhotoUrl,
          vehiclePhotoUrl: (profile as any).vehiclePhotoUrl,
          emergencyContact: (profile as any).emergencyContact,
          totalDeliveries: 0,
          totalRevenue: 0,
          cashHeld: 0,
          balance: 0,
          onboardingStatus: 'APPROVED',
          isAvailable: false,
        });
      }
    }

    return res.json({ message: `Pilot ${status.toLowerCase()} successfully.`, profile });
  } catch (_error) {
    return res.status(500).json({ error: 'Failed to update pilot status.' });
  }
};

/**
 * @route   PATCH /api/v1/merchant/riders/:id/toggle-active
 * @desc    Toggle a rider's active/disabled status
 */
export const togglePilotActive = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.user?._id;
    const riderId = req.params.id;

    const profile = await RiderProfile.findOne({ user: riderId, merchant: merchantId });
    if (!profile) return res.status(404).json({ error: 'Rider not found in your fleet.' });

    const user = await User.findById(riderId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const newDisabled = !user.disabled;
    user.disabled = newDisabled;
    await user.save();

    const io = req.app.get('socketio');
    if (io) {
      if (newDisabled) {
        io.to(`rider:${riderId}`).emit('notification', {
          title: '❌ Account Suspended',
          body: 'Your pilot account has been suspended by your fleet administrator.'
        });
        io.to(`rider:${riderId}`).emit('auth_revoked', {
          reason: 'Your pilot account has been suspended by fleet command.'
        });
        const socketRoom = io.sockets.adapter.rooms.get(`rider:${riderId}`);
        if (socketRoom) {
          for (const socketId of socketRoom) {
            io.sockets.sockets.get(socketId)?.disconnect(true);
          }
        }
      } else {
        // Account re-activated — notify rider if still connected
        io.to(`rider:${riderId}`).emit('account_reactivated', {
          message: 'Your pilot account has been reinstated by fleet command.'
        });
      }
      io.to(`merchant:${merchantId}`).emit('pilot_active_toggled', { riderId, disabled: newDisabled });
    }

    return res.status(200).json({ message: `Pilot ${newDisabled ? 'deactivated' : 'activated'} successfully.`, disabled: newDisabled });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to toggle pilot active state.' });
  }
};

/**
 * @route   DELETE /api/v1/merchant/riders/:id
 * @desc    Soft-delete a rider (marks as deleted, blocks further access)
 */
export const deletePilot = async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = req.user?._id;
    const riderId = req.params.id;

    const profile = await RiderProfile.findOne({ user: riderId, merchant: merchantId });
    if (!profile) return res.status(404).json({ error: 'Rider not found in your fleet.' });

    const user = await User.findById(riderId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    user.deletedAt = new Date();
    user.disabled = true; 
    await user.save();

    profile.onboardingStatus = 'REJECTED'; 
    await profile.save();

    const io = req.app.get('socketio');
    if (io) {
      io.to(`rider:${riderId}`).emit('notification', {
        title: '❌ Account Terminated',
        body: 'Your pilot profile has been removed from the fleet.'
      });
      io.to(`rider:${riderId}`).emit('auth_revoked');
      
      const socketRoom = io.sockets.adapter.rooms.get(`rider:${riderId}`);
      if (socketRoom) {
        for (const socketId of socketRoom) {
          io.sockets.sockets.get(socketId)?.disconnect(true);
        }
      }
      io.to(`merchant:${merchantId}`).emit('pilot_deleted', { riderId });
    }

    return res.status(200).json({ message: 'Pilot successfully removed from fleet.', riderId });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to remove pilot from fleet.' });
  }
};
