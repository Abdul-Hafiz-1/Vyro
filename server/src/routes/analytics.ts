import { Router, Request, Response } from 'express';
import { store } from '../db/store.js';

const router = Router();

// GET /api/v1/analytics
router.get('/', (req: Request, res: Response) => {
  const stats = store.getNetworkStats();
  
  // Breakdown by category
  const allAgents = store.getAgents();
  const categoryCounts: Record<string, number> = {};
  for (const agent of allAgents) {
    categoryCounts[agent.category] = (categoryCounts[agent.category] || 0) + 1;
  }

  // Transactions by status
  const allTxs = store.getTransactions();
  const txStatusCounts: Record<string, number> = {};
  for (const tx of allTxs) {
    txStatusCounts[tx.paymentStatus] = (txStatusCounts[tx.paymentStatus] || 0) + 1;
  }

  res.json({
    success: true,
    data: {
      stats,
      categoryDistribution: categoryCounts,
      transactionStatusDistribution: txStatusCounts,
      recentVolume: stats.totalTransactionVolume,
      agentCount: allAgents.length
    }
  });
});

export default router;
