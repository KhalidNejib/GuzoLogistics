/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';
import User from '../models/User.js';

/**
 * We extend the default Express Request to include our MongoDB User.
 * Any route that uses this middleware will have access to `req.user`.
 */
export interface AuthRequest extends Request {
  user?: any; // We use 'any' here temporarily since it's a Lean Document
}

/**
 * 🔒 Middleware: requireUser
 * Extracts the Clerk Token, verifies it, and attaches the MongoDB User Profile.
 */
export const requireUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // 1. Get the authenticated external ID from Clerk
    const { userId } = getAuth(req);
    const authHeader = req.headers.authorization;

    // 2. Block if no token is provided
    if (!userId) {
      console.warn(
        `🔒 [Auth] Unauthorized access attempt. Header: ${authHeader ? 'Present' : 'Missing'}`
      );
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No valid authentication session found.',
      });
    }

    console.info(`🔓 [Auth] User verified: ${userId}`);

    // 3. Find the user in our Database.
    // .lean() is crucial here: it forces mongoose to return a raw JSON object

    let user = await User.findOne({ clerkId: userId }).lean();

    // 4. DEVELOPMENT AUTO-SYNC: If user exists in Clerk but not our DB, create them on the fly.
    // In production, this is handled by Webhooks, but for localhost, this ensures a smooth experience.
    if (!user) {
      console.info(`🔄 [Auth] User ${userId} not found in DB. Creating on-the-fly...`);
      const newUser = new User({
        clerkId: userId,
        email: `${userId}@ethio-logistics.com`, // Unique per user
        fullName: 'New Merchant',
        role: 'MERCHANT',
        phoneNumber: `+251${Math.floor(Math.random() * 1000000000)}`, // Unique placeholder
      });
      await newUser.save();
      user = newUser.toObject();
    }

    // 5. Attach the profile to the request and continue to the next function
    req.user = user;
    next();
  } catch (error) {
    console.error('CRITICAL: Auth Middleware Failure:', error);
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
};

/**
 * 🔒 Middleware Factory: requireRole
 * A supplementary check to ensure the user has the correct permission level.
 * Example usage: router.post('/orders', requireUser, requireRole('MERCHANT'), ...)
 */
export const requireRole = (allowedRole: 'MERCHANT' | 'RIDER' | 'ADMIN') => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // If they aren't the required role AND they aren't an ADMIN, block them.
    if (req.user?.role !== allowedRole && req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Forbidden',
        message: `This action requires ${allowedRole} privileges. You are registered as a ${req.user?.role}.`,
      });
    }
    next();
  };
};
