import { Router, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../db/store.js';
import { geminiService } from '../services/ai/gemini.js';
import { CommerceRequest } from '../types/index.js';
import { AuthenticatedRequest, authenticateUser } from '../middleware/rbac.js';

const router = Router();

// POST /api/v1/requests/parse
router.post('/parse', async (req: AuthenticatedRequest, res: Response) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ success: false, error: 'A natural language purchasing prompt is required.' });
  }

  try {
    const parsed = await geminiService.parsePurchasingPrompt(prompt);
    return res.json({ success: true, data: parsed });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to parse request' });
  }
});

const createRequestSchema = z.object({
  buyerAgentId: z.string().optional(),
  rawInput: z.string(),
  title: z.string().min(3),
  category: z.string(),
  requiredCapabilities: z.array(z.string()).default([]),
  deliverables: z.array(z.string()).default(['Standard Implementation Deliverable']),
  maxBudget: z.number().positive(),
  currency: z.string().default('USD'),
  deadlineDays: z.number().positive(),
  qualityRequirements: z.string().default('Verified production quality.'),
  additionalConditions: z.string().optional()
});

// POST /api/v1/requests
router.post('/', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const parsed = createRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.format() });
  }

  const user = req.user!;
  const now = new Date().toISOString();

  // Find or attach user's buyer agent
  let agentId = parsed.data.buyerAgentId;
  const userAgents = store.getAgents({ ownerId: user.id });
  if (!agentId || !userAgents.some(a => a.id === agentId)) {
    const buyerAgent = userAgents.find(a => a.type === 'buyer') || userAgents[0];
    agentId = buyerAgent ? buyerAgent.id : `agt_${uuidv4().substring(0, 8)}`;
    if (!buyerAgent) {
      store.saveAgent({
        id: agentId,
        ownerId: user.id,
        userId: user.id,
        businessName: user.displayName,
        name: `${user.displayName} Buyer Agent`,
        type: 'buyer',
        description: `Autonomous purchasing representative for ${user.displayName}.`,
        category: 'Procurement',
        capabilities: ['Autonomous Negotiation', 'Price Convergence'],
        status: 'active',
        verificationStatus: 'community',
        catalog: [],
        pricingConstraints: { defaultBudget: 200, maxBudget: 500 },
        negotiationStrategy: 'balanced',
        approvalPolicy: 'explicit_human_required',
        createdAt: now,
        updatedAt: now
      });
    }
  }

  const newRequest: CommerceRequest = {
    ...parsed.data,
    id: `req_${uuidv4().substring(0, 8)}`,
    userId: user.id,
    buyerUserId: user.id,
    buyerAgentId: agentId,
    status: 'analyzed',
    createdAt: now,
    updatedAt: now
  };

  store.saveRequest(newRequest);

  return res.status(201).json({ success: true, data: newRequest });
});

// GET /api/v1/requests
router.get('/', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const requests = store.getRequests(req.user!.id);
  return res.json({ success: true, count: requests.length, data: requests });
});

// GET /api/v1/requests/:id
router.get('/:id', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const request = store.getRequest(req.params.id);
  if (!request || (request.userId !== req.user!.id && request.buyerUserId !== req.user!.id)) {
    return res.status(404).json({ success: false, error: 'Commerce request not found' });
  }
  return res.json({ success: true, data: request });
});

export default router;
