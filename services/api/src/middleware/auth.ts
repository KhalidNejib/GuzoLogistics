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

    // 2. Block if no token is provided
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No valid authentication session found.',
      });
    }

    // 3. Find the user in our Database.
    // .lean() is crucial here: it forces mongoose to return a raw JSON object
    // instead of a massive Mongoose Document network, saving RAM and CPU.
    const user = await User.findOne({ clerkId: userId }).lean();

    // 4. Block if they authenticated via Clerk, but the webhook hasn't saved them yet.
    if (!user) {
      return res.status(403).json({
        error: 'Profile Pending',
        message:
          'Your account synchronization is still pending. Please try again in a few seconds.',
      });
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
