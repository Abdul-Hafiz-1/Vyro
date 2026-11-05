import { Router, Request, Response } from 'express';
import { store } from '../db/store.js';

const router = Router();

// GET /api/v1/transactions
router.get('/', (req: Request, res: Response) => {
  const transactions = store.getTransactions('user_main');
  res.json({ success: true, count: transactions.length, data: transactions });
});

// GET /api/v1/transactions/:id
router.get('/:id', (req: Request, res: Response) => {
  const tx = store.getTransaction(req.params.id);
  if (!tx) {
    return res.status(404).json({ success: false, error: 'Transaction record not found' });
  }

  const agreement = store.getAgreement(tx.agreementId);
  const negotiation = store.getNegotiation(tx.negotiationId);
  const sellerAgent = store.getAgent(tx.sellerAgentId);

  res.json({
    success: true,
    data: {
      ...tx,
      agreement,
      negotiation,
      sellerAgent
    }
  });
});

export default router;
