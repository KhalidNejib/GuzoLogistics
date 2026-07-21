import { Router } from 'express';
import { requireUser, requireRole } from '../middleware/auth.js';
import {
  createOrder,
  getMerchantOrders,
  acceptOrder,
  updateOrderStatus,
  getOrderByToken,
  rateOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  autoAssignOrder,
  debugClearAllOrders,
  deleteOrder,
  snatchOrder,
  getRouteGeometry,
  debugSendSMS,
} from '../controllers/orderController.js';
import { rateLimit } from 'express-rate-limit';

const acceptOrderLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  message: { error: 'Too many accept attempts. Please wait.' }
});

const router: Router = Router();

router.post('/route-geom', requireUser, getRouteGeometry);

// 🛠️ DEBUG ONLY — not registered in production; the controller also hard-blocks
// them, but keeping them out of the route table is cleaner.
if (process.env.NODE_ENV !== 'production') {
  router.post('/debug/send-sms', requireUser, requireRole('ADMIN'), debugSendSMS);
}


// Merchant creates a new delivery order
router.post('/', requireUser, requireRole('MERCHANT'), createOrder);

// Merchant views their order history (with pagination)
router.get('/', requireUser, requireRole('MERCHANT'), getMerchantOrders);

// Rider accepts a pending order
router.post('/:id/accept', requireUser, requireRole('RIDER'), acceptOrderLimiter, acceptOrder);

// Rider updates order status (Picked Up, In Transit, etc.)
router.patch('/:id/status', requireUser, requireRole('RIDER'), updateOrderStatus);

// Rider views their relevant orders
router.get('/my-orders', requireUser, requireRole('RIDER'), getMyOrders);

// Rider views a specific order by ID
router.get('/:id', requireUser, requireRole('RIDER'), getOrderById);

// Merchant cancels a pending order
router.patch('/:id/cancel', requireUser, requireRole('MERCHANT'), cancelOrder);

// Merchant deletes an order completely
router.delete('/:id', requireUser, requireRole('MERCHANT'), deleteOrder);

// Merchant snatches/unassigns an order from a rider
router.post('/:id/snatch', requireUser, requireRole('MERCHANT'), snatchOrder);

// Merchant auto-assigns a pending order to the nearest rider
router.post('/:id/auto-assign', requireUser, requireRole('MERCHANT'), autoAssignOrder);

// Public Tracking
router.get('/track/:token', getOrderByToken);
router.post('/track/:token/rate', rateOrder);

if (process.env.NODE_ENV !== 'production') {
  router.delete('/debug/clear-all', requireUser, requireRole('ADMIN'), debugClearAllOrders);
}

export default router;
