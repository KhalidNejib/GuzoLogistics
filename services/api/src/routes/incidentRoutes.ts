import { Router } from 'express';
import { requireUser, requireRole } from '../middleware/auth.js';
import { createIncident, getIncidents, resolveIncident } from '../controllers/incidentController.js';

const router: Router = Router();

router.post('/', requireUser, createIncident);
router.get('/', requireUser, getIncidents);
// MERCHANT-or-ADMIN only (requireRole always allows ADMIN through). The
// controller does its own tenant-ownership check on top of this — a
// merchant can only resolve incidents raised by riders in their own fleet.
router.patch('/:id/resolve', requireUser, requireRole('MERCHANT'), resolveIncident);

export default router;
