import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { store } from '../db/store.js';
import { negotiationOrchestrator } from '../services/negotiation/orchestrator.js';

const router = Router();

// GET /api/v1/negotiations
router.get('/', (req: Request, res: Response) => {
  const { requestId, agentId, status } = req.query;
  const list = store.getNegotiations({
    requestId: requestId as string,
    agentId: agentId as string,
    status: status as string
  });
  res.json({ success: true, count: list.length, data: list });
});

// GET /api/v1/negotiations/:id
router.get('/:id', (req: Request, res: Response) => {
  const neg = store.getNegotiation(req.params.id);
  if (!neg) {
    return res.status(404).json({ success: false, error: 'Negotiation not found' });
  }
  const proposals = store.getProposals(neg.id);
  const buyerAgent = store.getAgent(neg.buyerAgentId);
  const sellerAgent = store.getAgent(neg.sellerAgentId);
  const request = store.getRequest(neg.requestId);
  const agreement = neg.agreementId ? store.getAgreement(neg.agreementId) : null;

  res.json({
    success: true,
    data: {
      ...neg,
      buyerAgent,
      sellerAgent,
      request,
      proposals,
      agreement
    }
  });
});

// POST /api/v1/negotiations/initiate
router.post('/initiate', async (req: Request, res: Response) => {
  const { requestId, sellerAgentId } = req.body;
  if (!requestId || !sellerAgentId) {
    return res.status(400).json({ success: false, error: 'requestId and sellerAgentId are required' });
  }

  try {
    const negotiation = await negotiationOrchestrator.initiateNegotiation(requestId, sellerAgentId);
    res.status(201).json({ success: true, data: negotiation });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/v1/negotiations/:id/step
router.post('/:id/step', async (req: Request, res: Response) => {
  try {
    const negotiation = await negotiationOrchestrator.stepNegotiation(req.params.id);
    res.json({ success: true, data: negotiation });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/v1/negotiations/multi-agent (The premier multi-agent discovery & competitive negotiation engine)
router.post('/multi-agent', async (req: Request, res: Response) => {
  const schema = z.object({
    requestId: z.string(),
    sellerIds: z.array(z.string()).min(1)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.format() });
  }

  try {
    const result = await negotiationOrchestrator.runMultiAgentNegotiation(
      parsed.data.requestId,
      parsed.data.sellerIds
    );
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/negotiations/evaluation/:requestId
router.get('/evaluation/:requestId', (req: Request, res: Response) => {
  const evaluation = store.getEvaluation(req.params.requestId);
  if (!evaluation) {
    return res.status(404).json({ success: false, error: 'No proposal evaluation found for this request' });
  }
  res.json({ success: true, data: evaluation });
});

export default router;
