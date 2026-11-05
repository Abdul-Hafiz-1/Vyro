import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../db/store.js';
import { geminiService } from '../services/ai/gemini.js';
import { CommerceRequest } from '../types/index.js';

const router = Router();

// POST /api/v1/requests/parse
router.post('/parse', async (req: Request, res: Response) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ success: false, error: 'A natural language purchasing prompt is required.' });
  }

  try {
    const parsed = await geminiService.parsePurchasingPrompt(prompt);
    res.json({ success: true, data: parsed });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to parse request' });
  }
});

const createRequestSchema = z.object({
  buyerAgentId: z.string(),
  rawInput: z.string(),
  title: z.string().min(3),
  category: z.string(),
  requiredCapabilities: z.array(z.string()),
  deliverables: z.array(z.string()),
  maxBudget: z.number().positive(),
  currency: z.string().default('USD'),
  deadlineDays: z.number().positive(),
  qualityRequirements: z.string(),
  additionalConditions: z.string().optional()
});

// POST /api/v1/requests
router.post('/', (req: Request, res: Response) => {
  const parsed = createRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.format() });
  }

  const now = new Date().toISOString();
  const newRequest: CommerceRequest = {
    ...parsed.data,
    id: `req_${uuidv4().substring(0, 8)}`,
    userId: 'user_main',
    status: 'analyzed',
    createdAt: now,
    updatedAt: now
  };

  store.saveRequest(newRequest);

  store.logActivity({
    type: 'request_created',
    title: `Purchasing Request Created: "${newRequest.title}"`,
    description: `Budget ceiling: $${newRequest.maxBudget} | Deadline: ${newRequest.deadlineDays} days | Scope: ${newRequest.deliverables.length} deliverables.`,
    severity: 'info'
  });

  res.status(201).json({ success: true, data: newRequest });
});

// GET /api/v1/requests
router.get('/', (req: Request, res: Response) => {
  const requests = store.getRequests('user_main');
  res.json({ success: true, count: requests.length, data: requests });
});

// GET /api/v1/requests/:id
router.get('/:id', (req: Request, res: Response) => {
  const request = store.getRequest(req.params.id);
  if (!request) {
    return res.status(404).json({ success: false, error: 'Commerce request not found' });
  }
  res.json({ success: true, data: request });
});

export default router;
