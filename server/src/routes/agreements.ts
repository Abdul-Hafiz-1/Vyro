import { Router, Response } from 'express';
import { store } from '../db/store.js';
import { negotiationOrchestrator } from '../services/negotiation/orchestrator.js';
import { AuthenticatedRequest, authenticateUser } from '../middleware/rbac.js';

const router = Router();

router.use(authenticateUser);

// GET /api/v1/agreements
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const allAgreements = store.getAgreements();
  const userAgreements = allAgreements.filter(a => a.buyerUserId === user.id || a.sellerUserId === user.id);
  return res.json({ success: true, count: userAgreements.length, data: userAgreements });
});

// GET /api/v1/agreements/:id
router.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const agreement = store.getAgreement(req.params.id);
  if (!agreement || (agreement.buyerUserId !== user.id && agreement.sellerUserId !== user.id)) {
    return res.status(404).json({ success: false, error: 'Agreement not found' });
  }

  const negotiation = store.getNegotiation(agreement.negotiationId);
  const transaction = store.getTransactionByAgreement(agreement.id);

  return res.json({
    success: true,
    data: {
      ...agreement,
      negotiation,
      transaction
    }
  });
});

// POST /api/v1/agreements/:id/authorize
router.post('/:id/authorize', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const agreement = store.getAgreement(req.params.id);
  if (!agreement || agreement.buyerUserId !== user.id) {
    return res.status(404).json({ success: false, error: 'Agreement not found' });
  }

  try {
    const updated = negotiationOrchestrator.authorizeAgreement(req.params.id, user.id);
    return res.json({
      success: true,
      message: 'Agreement explicitly authorized by human purchaser.',
      data: updated
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/v1/agreements/:id/seller-accept
router.post('/:id/seller-accept', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const agreement = store.getAgreement(req.params.id);
  if (!agreement || agreement.sellerUserId !== user.id) {
    return res.status(404).json({ success: false, error: 'Agreement not found' });
  }

  const now = new Date().toISOString();
  agreement.sellerAcceptanceStatus = 'accepted';
  agreement.sellerAcceptedAt = now;
  store.saveAgreement(agreement);

  return res.json({
    success: true,
    message: 'Seller has formally accepted the commercial agreement.',
    data: agreement
  });
});

export default router;
