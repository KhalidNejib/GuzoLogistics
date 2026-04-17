import { Router } from 'express';
import { requireUser, requireRole } from '../middleware/auth.js';
import { createOrder, getMerchantOrders, acceptOrder } from '../controllers/orderController.js';

const router: Router = Router();

// Merchant creates a new delivery order
router.post('/', requireUser, requireRole('MERCHANT'), createOrder);

// Merchant views their order history (with pagination)
router.get('/', requireUser, requireRole('MERCHANT'), getMerchantOrders);

// Rider accepts a pending order
router.post('/:id/accept', requireUser, requireRole('RIDER'), acceptOrder);

export default router;
