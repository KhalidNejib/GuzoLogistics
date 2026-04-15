import { Router } from 'express';
import { handleClerkWebhook } from '../controllers/clerkWebhook.js';

const router: Router = Router();

/**
 * Route: POST /api/webhooks/clerk
 * Purpose: Receives real-time updates from Clerk via webhooks.
 * This is the production-hardened route that uses raw body verification.
 */
router.post('/clerk', handleClerkWebhook);

export default router;
