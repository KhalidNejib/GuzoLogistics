import { Router } from 'express';
import { requireUser, requireRole } from '../middleware/auth.js';
import User from '../models/User.js';

const router: Router = Router();

/**
 * GET /api/v1/admin/users
 * Lists all users. Supports ?role=MERCHANT|RIDER|ADMIN and ?status=pending|active.
 * ADMIN-only.
 *
 * Query params:
 *   role    — filter by role (MERCHANT | RIDER | ADMIN)
 *   status  — 'pending'  => onboardingCompleted: true, isApproved: false, not disabled/deleted
 *                           (submitted their info, awaiting admin review — matches the
 *                           "Pending" badge and pendingCount shown in the dashboard UI)
 *             'active'   => isApproved: true, not disabled/deleted
 *             (omit for all, including soft-deleted and still-onboarding users)
 *   page    — page number (default: 1)
 *   limit   — results per page (default: 50, max: 200)
 *   search  — partial match on fullName or email
 */
router.get('/users', requireUser, requireRole('ADMIN'), async (req: any, res: any) => {
  try {
    const { role, status, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};

    if (role && ['MERCHANT', 'RIDER', 'ADMIN'].includes((role as string).toUpperCase())) {
      filter.role = (role as string).toUpperCase();
    }

    if (status === 'pending') {
      filter.onboardingCompleted = true;
      filter.isApproved = false;
      filter.disabled = { $ne: true };
      filter.deletedAt = null;
    } else if (status === 'active') {
      filter.isApproved = true;
      filter.disabled = { $ne: true };
      filter.deletedAt = null;
    }

    if (search) {
      const re = new RegExp(search as string, 'i');
      filter.$or = [{ fullName: re }, { email: re }];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('[Admin] listUsers error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * PATCH /api/v1/admin/users/:id/role
 * Update a user's role. ADMIN-only.
 * Body: { role: 'MERCHANT' | 'RIDER' | 'ADMIN' }
 */
router.patch('/users/:id/role', requireUser, requireRole('ADMIN'), async (req: any, res: any) => {
  try {
    const { role } = req.body;
    if (!['MERCHANT', 'RIDER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be MERCHANT, RIDER, or ADMIN.' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-__v').lean();

    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  } catch (err: any) {
    console.error('[Admin] updateRole error:', err.message);
    return res.status(500).json({ error: 'Failed to update role' });
  }
});

/**
 * PATCH /api/v1/admin/users/:id/disable
 * Soft-disable or re-enable a user. ADMIN-only.
 * Body: { disabled: true | false }
 */
router.patch('/users/:id/disable', requireUser, requireRole('ADMIN'), async (req: any, res: any) => {
  try {
    const { disabled } = req.body;
    if (typeof disabled !== 'boolean') {
      return res.status(400).json({ error: '`disabled` must be a boolean.' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { disabled },
      { new: true, runValidators: true }
    ).select('-__v').lean();

    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  } catch (err: any) {
    console.error('[Admin] disableUser error:', err.message);
    return res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * PATCH /api/v1/admin/users/:id/approve
 * Approve or revoke approval for a user (specifically MERCHANTS). ADMIN-only.
 * Body: { isApproved: true | false }
 */
router.patch('/users/:id/approve', requireUser, requireRole('ADMIN'), async (req: any, res: any) => {
  try {
    const { isApproved } = req.body;
    if (typeof isApproved !== 'boolean') {
      return res.status(400).json({ error: '`isApproved` must be a boolean.' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isApproved },
      { new: true, runValidators: true }
    ).select('-__v').lean();

    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  } catch (err: any) {
    console.error('[Admin] approveUser error:', err.message);
    return res.status(500).json({ error: 'Failed to update user approval status' });
  }
});

export default router;