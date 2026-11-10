import { Router, Response } from 'express';
import { store } from '../db/store.js';
import { config } from '../config/index.js';
import { AuthenticatedRequest, authenticateUser } from '../middleware/rbac.js';

const router = Router();

router.use(authenticateUser);

// GET /api/v1/transactions
// Strictly scoped to caller as buyer or seller
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const transactions = store.getTransactions(user.id).map(tx => {
    const payout = store.getPayoutByDeal(tx.negotiationId) || null;
    return {
      ...tx,
      payout,
      platformFeePercent: config.platformFeePercent,
      viewerRole: tx.buyerUserId === user.id ? 'buyer' : 'seller'
    };
  });
  return res.json({ success: true, count: transactions.length, data: transactions });
});

// GET /api/v1/transactions/:id
// Returns 404 if caller is neither buyer nor seller
router.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const tx = store.getTransaction(req.params.id);
  if (!tx || (tx.buyerUserId !== user.id && tx.sellerUserId !== user.id)) {
    return res.status(404).json({ success: false, error: 'Transaction record not found' });
  }

  const agreement = store.getAgreement(tx.agreementId);
  const negotiation = store.getNegotiation(tx.negotiationId);
  const sellerAgent = store.getAgent(tx.sellerAgentId);
  const payout = store.getPayoutByDeal(tx.negotiationId) || null;
  const ledger = store.getLedgerEntriesForDeal(tx.negotiationId);
  const isSeller = tx.sellerUserId === user.id;
  const payoutAccount = isSeller ? store.getSellerPayoutAccount(user.id) : undefined;

  return res.json({
    success: true,
    data: {
      ...tx,
      agreement,
      negotiation,
      sellerAgent,
      payout,
      ledger,
      platformFeePercent: config.platformFeePercent,
      viewerRole: isSeller ? 'seller' : 'buyer',
      sellerPayoutEmail: isSeller ? payoutAccount?.paypalEmail : undefined
    }
  });
});

export default router;
