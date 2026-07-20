import { Router } from 'express';
import { requireUser, requireRole } from '../middleware/auth.js';
import { getProfile, updateProfile, renameRider, completeOnboarding, collectCashFromRider, requestPayout, processPayout, getFinanceHistory, uploadImage, uploadSettlementProof, requestSettlement, getPendingSettlements, verifySettlement, getPendingPilots, approvePilot, togglePilotActive, deletePilot } from '../controllers/merchantController.js';
import { getMerchantAnalytics, getRiderLeaderboard } from '../controllers/orderController.js';

const router: Router = Router();

// Get merchant profile
router.get('/profile', requireUser, requireRole('MERCHANT'), getProfile);

// Update merchant profile
router.put('/profile', requireUser, requireRole('MERCHANT'), updateProfile);

// Analytics: daily stats, revenue, delivery success rate
router.get('/analytics', requireUser, requireRole('MERCHANT'), getMerchantAnalytics);

// Rider Performance Leaderboard
router.get('/rider-leaderboard', requireUser, requireRole('MERCHANT'), getRiderLeaderboard);

// Rename Rider
router.patch('/riders/:id/name', requireUser, requireRole('MERCHANT'), renameRider);

// Onboarding
router.post('/onboarding', requireUser, requireRole('MERCHANT'), completeOnboarding);
router.get('/onboarding/status', requireUser, requireRole('MERCHANT'), async (req: any, res: any) => {
  res.json({
    onboardingCompleted: req.user?.onboardingCompleted ?? false,
    isApproved: req.user?.isApproved ?? false,
  });
});

// Pilot Management
router.get('/pending-pilots', requireUser, requireRole('MERCHANT'), getPendingPilots);
router.patch('/approve-pilot/:id', requireUser, requireRole('MERCHANT'), approvePilot);
router.patch('/riders/:id/toggle-active', requireUser, requireRole('MERCHANT'), togglePilotActive);
router.delete('/riders/:id', requireUser, requireRole('MERCHANT'), deletePilot);

// Finance
router.post('/finance/collect/:riderId', requireUser, requireRole('MERCHANT'), collectCashFromRider);
router.post('/finance/payout', requireUser, requireRole('MERCHANT'), requestPayout);
router.patch('/finance/payouts/:id', requireUser, requireRole('ADMIN'), processPayout);
router.get('/finance/history', requireUser, getFinanceHistory);

// Digital Settlement (Repaying debt via Telebirr) — rider only, they're the ones with cash debt to settle
router.post('/finance/upload-proof', requireUser, requireRole('RIDER'), uploadSettlementProof);
router.post('/upload-image', requireUser, requireRole('RIDER'), uploadImage);
router.post('/finance/settle-request', requireUser, requireRole('RIDER'), requestSettlement);
router.get('/finance/pending-settlements', requireUser, requireRole('MERCHANT'), getPendingSettlements);
router.post('/finance/verify-settlement/:id', requireUser, requireRole('MERCHANT'), verifySettlement);

export default router;
