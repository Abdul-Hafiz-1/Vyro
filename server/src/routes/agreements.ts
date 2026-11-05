import { Router, Request, Response } from 'express';
import { store } from '../db/store.js';
import { negotiationOrchestrator } from '../services/negotiation/orchestrator.js';

const router = Router();

// GET /api/v1/agreements
router.get('/', (req: Request, res: Response) => {
  const agreements = store.getAgreements();
  res.json({ success: true, count: agreements.length, data: agreements });
});

// GET /api/v1/agreements/:id
router.get('/:id', (req: Request, res: Response) => {
  const agreement = store.getAgreement(req.params.id);
  if (!agreement) {
    return res.status(404).json({ success: false, error: 'Agreement not found' });
  }
  const negotiation = store.getNegotiation(agreement.negotiationId);
  const transaction = store.getTransactionByAgreement(agreement.id);

  res.json({
    success: true,
    data: {
      ...agreement,
      negotiation,
      transaction
    }
  });
});

// POST /api/v1/agreements/:id/authorize (Explicit Human Authorization)
router.post('/:id/authorize', (req: Request, res: Response) => {
  try {
    const agreement = negotiationOrchestrator.authorizeAgreement(req.params.id, 'user_main');
    res.json({
      success: true,
      message: 'Agreement explicitly authorized by human purchaser.',
      data: agreement
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
