import { Router, Response } from 'express';
import { store } from '../db/store.js';
import { config } from '../config/index.js';
import { AuthenticatedRequest, authenticateUser } from '../middleware/rbac.js';
import { payoutService, PayoutGateError } from '../services/paypal/payoutService.js';

const router = Router();

router.use(authenticateUser);

// GET /api/v1/payouts/account - Current user's own seller payout account
router.get('/account', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const account = payoutService.getSellerPayoutAccount(user.id);
  return res.json({
    success: true,
    data: {
      account,
      platformFeePercent: config.platformFeePercent,
      providerInUse: config.paypal.payoutProvider,
      isSandbox: config.paypal.env !== 'live'
    }
  });
});

// GET /api/v1/payouts/account/:id - Strictly scoped by owner; 404 for others
router.get('/account/:id', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const acct = store.getSellerPayoutAccountById(req.params.id);
  if (!acct || acct.userId !== user.id) {
    return res.status(404).json({ success: false, error: 'Payout account not found' });
  }
  return res.json({ success: true, data: acct });
});

// PUT /api/v1/payouts/account - Validate and save current user's PayPal payout email
router.put('/account', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { paypalEmail } = req.body;
  if (!paypalEmail || typeof paypalEmail !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Please enter your PayPal email address.',
      code: 'VALIDATION_ERROR'
    });
  }

  try {
    const account = await payoutService.setSellerPayoutAccount(user.id, paypalEmail);
    return res.json({
      success: true,
      message: account.provider === 'simulated'
        ? 'PayPal email saved (Test payout, simulated).'
        : 'PayPal payout account verified and ready.',
      data: {
        account,
        platformFeePercent: config.platformFeePercent,
        providerInUse: account.provider === 'simulated' ? 'simulated' : config.paypal.payoutProvider,
        isSandbox: config.paypal.env !== 'live'
      }
    });
  } catch (err: any) {
    if (err instanceof PayoutGateError) {
      return res.status(err.status).json({
        success: false,
        error: err.message,
        code: err.code,
        nextStep: err.nextStep
      });
    }
    return res.status(400).json({ success: false, error: err.message || 'Failed to save payout account' });
  }
});

// PUT /api/v1/payouts/account/:id - Strictly scoped; 404 if targeting someone else's account
router.put('/account/:id', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const target = store.getSellerPayoutAccountById(req.params.id);
  if (!target || target.userId !== user.id) {
    return res.status(404).json({ success: false, error: 'Payout account not found' });
  }
  const { paypalEmail } = req.body;
  if (!paypalEmail || typeof paypalEmail !== 'string') {
    return res.status(400).json({ success: false, error: 'Please enter your PayPal email address.' });
  }
  try {
    const account = await payoutService.setSellerPayoutAccount(user.id, paypalEmail);
    return res.json({ success: true, data: account });
  } catch (err: any) {
    if (err instanceof PayoutGateError) {
      return res.status(err.status).json({ success: false, error: err.message, code: err.code });
    }
    return res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/v1/payouts - List payouts for authenticated seller
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const payouts = store.getPayoutsForSeller(user.id);
  return res.json({
    success: true,
    count: payouts.length,
    data: payouts
  });
});

// POST /api/v1/payouts/release/:dealId - Buyer accepts work and releases payout to seller
router.post('/release/:dealId', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const result = await payoutService.acceptWorkAndReleasePayout(req.params.dealId, user.id);
    return res.json({
      success: true,
      message: result.payout.status === 'failed'
        ? `Payout attempt failed: ${result.payout.failureReason || 'Unknown error'}`
        : 'Work accepted and seller payout initiated.',
      data: result
    });
  } catch (err: any) {
    if (err instanceof PayoutGateError) {
      return res.status(err.status).json({
        success: false,
        error: err.message,
        code: err.code,
        nextStep: err.nextStep
      });
    }
    return res.status(400).json({ success: false, error: err.message || 'Payout release failed' });
  }
});

// POST /api/v1/payouts/:id/retry - Retry a failed payout (seller owner or admin/reviewer)
router.post('/:id/retry', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const existing = store.getPayout(req.params.id);
  if (!existing || (existing.sellerUserId !== user.id && (user as any).role !== 'admin' && (user as any).role !== 'reviewer')) {
    return res.status(404).json({ success: false, error: 'Payout not found' });
  }
  try {
    const updated = await payoutService.retryPayout(existing.id);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    if (err instanceof PayoutGateError) {
      return res.status(err.status).json({ success: false, error: err.message, code: err.code });
    }
    return res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/v1/payouts/:id/refresh - Poll PayPal payout batch status
router.post('/:id/refresh', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const existing = store.getPayout(req.params.id);
  if (!existing || (existing.sellerUserId !== user.id && (user as any).role !== 'admin' && (user as any).role !== 'reviewer')) {
    return res.status(404).json({ success: false, error: 'Payout not found' });
  }
  try {
    const updated = await payoutService.pollPayoutStatus(existing.id);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
