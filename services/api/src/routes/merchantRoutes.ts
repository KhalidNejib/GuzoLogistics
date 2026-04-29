import { Router } from 'express';
import { requireUser, requireRole } from '../middleware/auth.js';
import { getProfile, updateProfile } from '../controllers/merchantController.js';

const router: Router = Router();

// Get merchant profile
router.get('/profile', requireUser, requireRole('MERCHANT'), getProfile);

// Update merchant profile
router.put('/profile', requireUser, requireRole('MERCHANT'), updateProfile);

export default router;
