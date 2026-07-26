/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from 'express';
import { getAuth, verifyToken, createClerkClient } from '@clerk/express';
import { clerkConfig } from '../lib/env.js';
import User from '../models/User.js';

/**
 * We extend the default Express Request to include our MongoDB User.
 */
export interface AuthRequest extends Request {
  user?: any;
}

/**
 * 🔒 Middleware: requireUser
 */
export const requireUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let { userId } = getAuth(req);
    const authHeader = req.headers.authorization;

    // FALLBACK: Manual Bearer token verification (for mobile clients)
    if (!userId && authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = await verifyToken(token, {
          secretKey: clerkConfig.secretKey,
          clockSkewInMs: 300000,
        });
        userId = decoded.sub;
      } catch (e: any) {
        console.warn(`🔒 [Auth] Manual verification failed: ${e.message}`);
      }
    }

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized', message: 'No valid authentication session found.' });
    }

    let user = await User.findOne({ clerkId: userId });

    // AUTO-SYNC: Create or refresh user from Clerk if missing/stale
    if (!user || ['New User', 'Rider', 'Awaiting Name'].includes(user.fullName)) {
      try {
        const clerk = createClerkClient({ secretKey: clerkConfig.secretKey });
        const clerkUser = await clerk.users.getUser(userId);
        const fullName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Rider';
        const email = clerkUser.emailAddresses?.[0]?.emailAddress || `${userId}@ethio-logistics.com`;
        const phoneNumber = clerkUser.phoneNumbers?.[0]?.phoneNumber || '+251900000000';
        const rawRole = (clerkUser.publicMetadata?.role as string)?.toUpperCase();
        const rawUnsafeRole = (clerkUser.unsafeMetadata?.role as string)?.toUpperCase();
        // hasExplicitRoleHint distinguishes "Clerk told us the role" from "we
        // fell back to a default" — see the role-assignment note below for
        // why that distinction matters.
        const hasExplicitRoleHint = ['MERCHANT', 'RIDER', 'ADMIN'].includes(rawRole);
        // unsafeMetadata is client-writable at Clerk signUp.create() time (the
        // web dashboard stamps { role: 'MERCHANT' } there, the mobile rider
        // app stamps { role: 'RIDER' } there — see clerkWebhook.ts for the
        // matching logic on the webhook side). We only trust it for MERCHANT
        // and RIDER, never ADMIN.
        //
        // This check used to be missing entirely, which meant a brand-new
        // merchant could get created HERE — by this synchronous auto-sync,
        // firing on their very first authenticated API call right after
        // sign-up — before Clerk's async user.created webhook had a chance
        // to land. This fallback only ever looked at publicMetadata (which
        // the web dashboard never sets — it only sets unsafeMetadata), so it
        // always defaulted new merchants to RIDER. By the time the webhook
        // did arrive, the user already existed, so the webhook's (correct,
        // deliberate) "never silently overwrite an existing role from an
        // untrusted hint" rule left them stuck as RIDER permanently.
        const hasTrustedUnsafeRoleHint = ['MERCHANT', 'RIDER'].includes(rawUnsafeRole);
        // Default to RIDER — merchants are created via the web dashboard only
        const role = hasExplicitRoleHint ? rawRole : hasTrustedUnsafeRoleHint ? rawUnsafeRole : 'RIDER';

        // SMARTER SYNC: First try to find by clerkId, then by email
        user = await User.findOne({ $or: [{ clerkId: userId }, { email }] });

        if (user) {
          // Update existing account with latest Clerk info
          user.clerkId = userId;
          user.fullName = fullName;
          user.email = email;
          user.phoneNumber = phoneNumber;
          // Role changes here must come from an explicit, trusted Clerk
          // publicMetadata hint — never from the RIDER default above. This
          // used to run unconditionally whenever the *default* resolved to
          // RIDER (i.e. `user.role === 'MERCHANT' && role === 'RIDER'`),
          // which silently demoted real merchants back to RIDER on their
          // next login any time their Clerk profile had no publicMetadata
          // role set — which is the normal case, since merchants are
          // promoted via direct DB writes, not through Clerk. Only trust
          // an explicit hint now, and never use it to downgrade silently.
          if (hasExplicitRoleHint) {
            user.role = role;
          }
          await user.save();
        } else {
          // Create brand new account
          user = await User.create({ clerkId: userId, email, fullName, role, phoneNumber });
        }
      } catch (clerkErr: any) {
        console.warn(`⚠️ [Auth] Clerk lookup failed for ${userId}: ${clerkErr.message}`);
        if (!user) {
          user = await User.create({
            clerkId: userId,
            email: `${userId}@ethio-logistics.com`,
            fullName: 'Rider',
            role: 'RIDER', // Default fallback — merchants come from the web dashboard
            phoneNumber: '+251900000000',
          });
        }
      }
    }

    if (user.deletedAt || user.disabled) {
      return res.status(403).json({ error: 'Forbidden', message: 'Your account is deactivated or disabled.' });
    }

    req.user = user!.toObject();
    next();
  } catch (error: any) {
    console.error('CRITICAL: Auth Middleware Failure:', error.message);
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
};

/**
 * 🔒 Middleware Factory: requireRole
 */
export const requireRole = (allowedRole: 'MERCHANT' | 'RIDER' | 'ADMIN') => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    console.info(`🔐 [Auth] Role Check: User=${req.user?._id}, Role=${userRole}, Required=${allowedRole}`);

    if (userRole === 'ADMIN') return next();
    if (userRole === allowedRole) {
      // Gate every merchant route behind admin approval — not just the ones reached
      // after onboarding. This used to also require `req.user?.onboardingCompleted`,
      // which meant a brand-new merchant (isApproved: false, onboardingCompleted: false,
      // i.e. someone who just signed up and never even opened the onboarding wizard)
      // sailed straight past this check and got full merchant-dashboard access.
      // /onboarding and /onboarding/status stay exempt so an unapproved merchant can
      // still submit their business details and poll their own approval status.
      if (
        allowedRole === 'MERCHANT' &&
        !req.user?.isApproved &&
        !req.path.endsWith('/onboarding') &&
        !req.path.endsWith('/onboarding/status')
      ) {
        return res.status(403).json({
          error: 'PendingVerification',
          message: 'Your merchant account is pending verification by our administrative team.',
        });
      }
      return next();
    }



    return res.status(403).json({
      error: 'Forbidden',
      message: `This action requires ${allowedRole} privileges. You are registered as a ${userRole}.`,
    });
  };
};