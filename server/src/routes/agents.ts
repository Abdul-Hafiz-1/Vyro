import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../db/store.js';
import { Agent } from '../types/index.js';

const router = Router();

const agentSchema = z.object({
  name: z.string().min(2),
  businessName: z.string().min(2),
  type: z.enum(['buyer', 'seller']),
  description: z.string().min(5),
  category: z.string().min(2),
  capabilities: z.array(z.string()).default([]),
  status: z.enum(['active', 'paused']).default('active'),
  verificationStatus: z.enum(['verified', 'community']).default('community'),
  catalog: z.array(z.object({
    id: z.string().optional(),
    name: z.string(),
    description: z.string(),
    startingPrice: z.number().positive(),
    minPrice: z.number().positive(),
    deliveryDays: z.number().positive(),
    includedDeliverables: z.array(z.string())
  })).default([]),
  pricingConstraints: z.object({
    defaultBudget: z.number().optional(),
    maxBudget: z.number().optional(),
    startingPrice: z.number().optional(),
    minAcceptablePrice: z.number().optional(),
    flexibilityPercent: z.number().optional(),
  }).default({}),
  negotiationStrategy: z.enum(['balanced', 'aggressive_cost', 'quality_first', 'expedited']).default('balanced'),
  approvalPolicy: z.literal('explicit_human_required').default('explicit_human_required')
});

// GET /api/v1/agents
router.get('/', (req: Request, res: Response) => {
  const { type, category, status } = req.query;
  const agents = store.getAgents({
    type: type as any,
    category: category as string,
    status: status as any
  });
  res.json({ success: true, count: agents.length, data: agents });
});

// GET /api/v1/agents/:id
router.get('/:id', (req: Request, res: Response) => {
  const agent = store.getAgent(req.params.id);
  if (!agent) {
    return res.status(404).json({ success: false, error: 'Agent not found' });
  }
  res.json({ success: true, data: agent });
});

// POST /api/v1/agents
router.post('/', (req: Request, res: Response) => {
  const parsed = agentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.format() });
  }

  const now = new Date().toISOString();
  const newAgent: Agent = {
    ...parsed.data,
    id: `agent_${uuidv4().substring(0, 8)}`,
    ownerId: 'user_main',
    catalog: parsed.data.catalog.map(item => ({
      ...item,
      id: item.id || `cat_${uuidv4().substring(0, 8)}`
    })),
    createdAt: now,
    updatedAt: now
  };

  store.saveAgent(newAgent);
  store.logActivity({
    type: 'agent_discovered',
    title: `Agent Created: ${newAgent.name}`,
    description: `Registered new ${newAgent.type} agent under ${newAgent.businessName} (${newAgent.category}).`,
    agentId: newAgent.id,
    severity: 'info'
  });

  res.status(201).json({ success: true, data: newAgent });
});

// PATCH /api/v1/agents/:id
router.patch('/:id', (req: Request, res: Response) => {
  const agent = store.getAgent(req.params.id);
  if (!agent) {
    return res.status(404).json({ success: false, error: 'Agent not found' });
  }

  const allowedUpdates = req.body;
  const updated: Agent = {
    ...agent,
    ...allowedUpdates,
    id: agent.id, // Immutable
    updatedAt: new Date().toISOString()
  };

  store.saveAgent(updated);
  res.json({ success: true, data: updated });
});

// DELETE /api/v1/agents/:id (Safe archive)
router.delete('/:id', (req: Request, res: Response) => {
  const success = store.deleteAgent(req.params.id);
  if (!success) {
    return res.status(404).json({ success: false, error: 'Agent not found' });
  }
  res.json({ success: true, message: 'Agent paused and archived to protect historical transactions' });
});

export default router;
