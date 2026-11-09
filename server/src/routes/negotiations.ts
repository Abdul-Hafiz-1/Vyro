import { Router, Response } from 'express';
import { z } from 'zod';
import { store } from '../db/store.js';
import { negotiationOrchestrator } from '../services/negotiation/orchestrator.js';
import { AuthenticatedRequest, authenticateUser } from '../middleware/rbac.js';
import { broadcastEvent } from './events.js';

const router = Router();

router.use(authenticateUser);

// GET /api/v1/negotiations
// Strictly scoped to negotiations where caller is buyer or seller
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { requestId, agentId, status } = req.query;
  const list = store.getNegotiations({
    userId: req.user!.id,
    requestId: requestId as string,
    agentId: agentId as string,
    status: status as string
  });
  return res.json({ success: true, count: list.length, data: list });
});

// GET /api/v1/negotiations/:id
// Returns 404 if caller is not a party to the deal. Enforces strict buyer/seller DTO serialization.
router.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const neg = store.getNegotiation(req.params.id);
  if (!neg || (neg.buyerUserId !== user.id && neg.sellerUserId !== user.id)) {
    return res.status(404).json({ success: false, error: 'Negotiation not found' });
  }

  const proposals = store.getProposals(neg.id);
  const buyerAgent = store.getAgent(neg.buyerAgentId);
  const sellerAgent = store.getAgent(neg.sellerAgentId);
  const rawRequest = store.getRequest(neg.requestId);
  const agreement = neg.agreementId ? store.getAgreement(neg.agreementId) : null;
  const rawDecision = store.getDecisionByEntity('deal', neg.id);
  const rawQueueItem = store.getReviewQueueItemByNegotiation(neg.id);

  const isBuyer = neg.buyerUserId === user.id;
  const isSeller = neg.sellerUserId === user.id;

  // DTO Serialization Boundary:
  // Buyer NEVER sees seller floor price.
  // Seller NEVER sees buyer max budget ceiling.
  const serializedRequest = rawRequest ? {
    ...rawRequest,
    maxBudget: isSeller ? undefined : rawRequest.maxBudget
  } : undefined;

  const sanitizedBuyerAgent = buyerAgent ? {
    ...buyerAgent,
    pricingConstraints: isSeller ? {
      ...buyerAgent.pricingConstraints,
      maxBudget: undefined,
      defaultBudget: undefined
    } : buyerAgent.pricingConstraints
  } : undefined;

  const sanitizedSellerAgent = sellerAgent ? {
    ...sellerAgent,
    pricingConstraints: isBuyer ? {
      ...sellerAgent.pricingConstraints,
      minAcceptablePrice: undefined,
      flexibilityPercent: undefined
    } : sellerAgent.pricingConstraints
  } : undefined;

  const sanitizedQueueItem = rawQueueItem ? {
    ...rawQueueItem,
    buyerMaxBudget: isSeller ? undefined : rawQueueItem.buyerMaxBudget,
    sellerFloorPrice: isBuyer ? undefined : rawQueueItem.sellerFloorPrice
  } : undefined;

  const sanitizedDecision = rawDecision ? {
    ...rawDecision,
    signals: {
      ...rawDecision.signals,
      buyerMaxBudget: isSeller ? undefined : rawDecision.signals.buyerMaxBudget,
      sellerFloorPrice: isBuyer ? undefined : rawDecision.signals.sellerFloorPrice
    }
  } : undefined;

  // Decision record is private to its owner
  const decisionForUser = (rawDecision && rawDecision.userId === user.id) ? sanitizedDecision : undefined;

  // Queue item is only visible to the user responsible for actioning it
  const queueItemForUser = (rawQueueItem && rawQueueItem.buyerId === user.id)
    ? sanitizedQueueItem
    : undefined;

  return res.json({
    success: true,
    data: {
      ...neg,
      buyerAgent: sanitizedBuyerAgent,
      sellerAgent: sanitizedSellerAgent,
      request: serializedRequest,
      proposals,
      agreement,
      decision: decisionForUser,
      queueItem: queueItemForUser,
      userRole: isBuyer ? 'buyer' : 'seller'
    }
  });
});

// POST /api/v1/negotiations/initiate
router.post('/initiate', async (req: AuthenticatedRequest, res: Response) => {
  const { requestId, sellerAgentId } = req.body;
  if (!requestId || !sellerAgentId) {
    return res.status(400).json({ success: false, error: 'requestId and sellerAgentId are required' });
  }

  const user = req.user!;
  const request = store.getRequest(requestId);
  if (!request || (request.userId !== user.id && request.buyerUserId !== user.id)) {
    return res.status(404).json({ success: false, error: 'Commerce request not found' });
  }

  try {
    const negotiation = await negotiationOrchestrator.initiateNegotiation(requestId, sellerAgentId);
    return res.status(201).json({ success: true, data: negotiation });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/v1/negotiations/:id/step
router.post('/:id/step', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const neg = store.getNegotiation(req.params.id);
  if (!neg || (neg.buyerUserId !== user.id && neg.sellerUserId !== user.id)) {
    return res.status(404).json({ success: false, error: 'Negotiation not found' });
  }

  try {
    const updated = await negotiationOrchestrator.stepNegotiation(req.params.id);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/v1/negotiations/multi-agent
router.post('/multi-agent', async (req: AuthenticatedRequest, res: Response) => {
  const schema = z.object({
    requestId: z.string(),
    sellerIds: z.array(z.string()).min(1).optional(),
    sellerAgentIds: z.array(z.string()).min(1).optional()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.format() });
  }

  const user = req.user!;
  const request = store.getRequest(parsed.data.requestId);
  if (!request || (request.userId !== user.id && request.buyerUserId !== user.id)) {
    return res.status(404).json({ success: false, error: 'Commerce request not found' });
  }

  let sellerIds = parsed.data.sellerIds || parsed.data.sellerAgentIds;
  if (!sellerIds || sellerIds.length === 0) {
    // Autonomous Matchmaking: Resolve sellers from marketplace listings matching category/specs
    const userAgents = store.getAgents({ ownerId: user.id });
    const userAgentIds = userAgents.map(a => a.id);

    const candidateListings = store.getListings({
      category: request.category,
      status: 'active'
    });

    const matchedSellerAgentIds = candidateListings
      .map(l => l.sellerAgentId)
      .filter((id): id is string => Boolean(id) && !userAgentIds.includes(id));

    sellerIds = Array.from(new Set(matchedSellerAgentIds));

    // Fallback: If no direct category match, search all verified third-party seller agents
    if (sellerIds.length === 0) {
      const allSellerAgents = store.getAgents({ type: 'seller' })
        .filter(a => a.ownerId !== user.id && !userAgentIds.includes(a.id));
      sellerIds = allSellerAgents.slice(0, 3).map(a => a.id);
    }
  }

  if (!sellerIds || sellerIds.length === 0) {
    return res.status(404).json({
      success: false,
      error: 'No available seller agents found in the marketplace. Create a seller listing or wait for suppliers to join.'
    });
  }

  try {
    const result = await negotiationOrchestrator.runMultiAgentNegotiation(
      parsed.data.requestId,
      sellerIds
    );
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/v1/negotiations/:id/approve - Direct Human Approval from Deal Cockpit
router.post('/:id/approve', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const neg = store.getNegotiation(req.params.id);
  if (!neg || (neg.buyerUserId !== user.id && neg.sellerUserId !== user.id)) {
    return res.status(404).json({ success: false, error: 'Negotiation not found' });
  }

  const now = new Date().toISOString();
  const note = req.body?.note || 'Manually approved by human buyer.';

  // 1. Update Decision status if present
  const decision = store.getDecisionByEntity('negotiation', neg.id) || (neg.agreementId ? store.getDecisionByEntity('agreement', neg.agreementId) : undefined);
  if (decision) {
    store.updateDecisionStatus(decision.id, 'human_approved', 'user', note);
  }

  // 2. Update Agreement status
  if (neg.agreementId) {
    const agreement = store.getAgreement(neg.agreementId);
    if (agreement) {
      agreement.humanApprovalStatus = 'approved';
      agreement.humanApprovedAt = now;
      agreement.rejectionReason = null;
      store.saveAgreement(agreement);
    }
  }

  // 3. Update Negotiation status
  neg.status = 'completed';
  neg.updatedAt = now;
  neg.messages.push({
    id: `msg_app_${Date.now().toString(36)}`,
    negotiationId: neg.id,
    senderAgentId: neg.buyerAgentId,
    recipientAgentId: neg.sellerAgentId,
    senderRole: 'buyer',
    round: neg.currentRound,
    messageType: 'agreement_accepted',
    content: `[Human Approval Confirmed] ${note}`,
    timestamp: now
  });
  store.saveNegotiation(neg);

  broadcastEvent('deal_updated', { negotiationId: neg.id, status: 'approved' });
  return res.json({ success: true, message: 'Deal approved successfully.', data: neg });
});

// POST /api/v1/negotiations/:id/decline - Direct Human Decline
router.post('/:id/decline', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const neg = store.getNegotiation(req.params.id);
  if (!neg || (neg.buyerUserId !== user.id && neg.sellerUserId !== user.id)) {
    return res.status(404).json({ success: false, error: 'Negotiation not found' });
  }

  const now = new Date().toISOString();
  const reason = req.body?.reason || 'Manually declined by user.';

  const decision = store.getDecisionByEntity('negotiation', neg.id) || (neg.agreementId ? store.getDecisionByEntity('agreement', neg.agreementId) : undefined);
  if (decision) {
    store.updateDecisionStatus(decision.id, 'human_declined', 'user', reason);
  }

  if (neg.agreementId) {
    const agreement = store.getAgreement(neg.agreementId);
    if (agreement) {
      agreement.humanApprovalStatus = 'declined';
      agreement.rejectionReason = reason;
      store.saveAgreement(agreement);
    }
  }

  neg.status = 'declined';
  neg.updatedAt = now;
  neg.messages.push({
    id: `msg_dec_${Date.now().toString(36)}`,
    negotiationId: neg.id,
    senderAgentId: neg.buyerAgentId,
    recipientAgentId: neg.sellerAgentId,
    senderRole: 'buyer',
    round: neg.currentRound,
    messageType: 'proposal_rejected',
    content: `[Human Declined] ${reason}`,
    timestamp: now
  });
  store.saveNegotiation(neg);

  broadcastEvent('deal_updated', { negotiationId: neg.id, status: 'declined' });
  return res.json({ success: true, message: 'Deal declined.', data: neg });
});

// POST /api/v1/negotiations/:id/appeal - Human Appeal for Auto-Declined Deals
router.post('/:id/appeal', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const neg = store.getNegotiation(req.params.id);
  if (!neg || (neg.buyerUserId !== user.id && neg.sellerUserId !== user.id)) {
    return res.status(404).json({ success: false, error: 'Negotiation not found' });
  }

  const { reason } = req.body;
  if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
    return res.status(400).json({
      success: false,
      error: 'A detailed appeal justification (at least 5 characters) is required.'
    });
  }

  const now = new Date().toISOString();
  const appealNote = reason.trim();

  // 1. Reopen Decision
  const decision = store.getDecisionByEntity('negotiation', neg.id) || (neg.agreementId ? store.getDecisionByEntity('agreement', neg.agreementId) : undefined);
  if (decision) {
    store.updateDecisionStatus(decision.id, 'needs_review', 'user', `[Appealed by user]: ${appealNote}`);
  }

  // 2. Reopen Agreement
  if (neg.agreementId) {
    const agreement = store.getAgreement(neg.agreementId);
    if (agreement) {
      agreement.humanApprovalStatus = 'pending_review';
      agreement.rejectionReason = null;
      store.saveAgreement(agreement);
    }
  }

  // 3. Transition Negotiation to Escalated for Human Review
  neg.status = 'escalated';
  neg.updatedAt = now;
  neg.messages.push({
    id: `msg_app_${Date.now().toString(36)}`,
    negotiationId: neg.id,
    senderAgentId: neg.buyerAgentId,
    recipientAgentId: neg.sellerAgentId,
    senderRole: 'buyer',
    round: neg.currentRound,
    messageType: 'appeal',
    content: `[Human Appeal Submitted] ${appealNote}`,
    timestamp: now
  });
  store.saveNegotiation(neg);

  broadcastEvent('deal_updated', { negotiationId: neg.id, status: 'appealed' });
  return res.json({
    success: true,
    message: 'Appeal submitted successfully. Deal reopened and escalated for human review.',
    data: neg
  });
});

// GET /api/v1/negotiations/evaluation/:requestId
router.get('/evaluation/:requestId', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const request = store.getRequest(req.params.requestId);
  if (!request || (request.userId !== user.id && request.buyerUserId !== user.id)) {
    return res.status(404).json({ success: false, error: 'No proposal evaluation found for this request' });
  }

  const evaluation = store.getEvaluation(req.params.requestId);
  if (!evaluation) {
    return res.status(404).json({ success: false, error: 'No proposal evaluation found for this request' });
  }
  return res.json({ success: true, data: evaluation });
});

// POST /api/v1/negotiations/:id/message
router.post('/:id/message', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const { content } = req.body;
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ success: false, error: 'Message content is required.' });
  }

  const neg = store.getNegotiation(req.params.id);
  if (!neg || (neg.buyerUserId !== user.id && neg.sellerUserId !== user.id)) {
    return res.status(404).json({ success: false, error: 'Negotiation not found' });
  }

  // Derive sender role strictly from session user
  const senderRole = neg.buyerUserId === user.id ? 'buyer' : 'seller';
  const now = new Date().toISOString();
  const lower = content.toLowerCase();

  const triggersEscalation =
    senderRole === 'buyer' &&
    (lower.includes('nda') || lower.includes('ip transfer') || lower.includes('custom license') || lower.includes('can you deliver by tomorrow') || lower.includes('warranty'));

  const newMessage: any = {
    id: `msg_direct_${Date.now().toString(36)}`,
    negotiationId: neg.id,
    senderAgentId: senderRole === 'buyer' ? neg.buyerAgentId : neg.sellerAgentId,
    recipientAgentId: senderRole === 'buyer' ? neg.sellerAgentId : neg.buyerAgentId,
    senderRole,
    round: neg.currentRound,
    messageType: triggersEscalation ? 'human_escalation' : 'clarification',
    content: content.trim(),
    requiresHumanResponse: triggersEscalation,
    humanResponded: senderRole === 'seller',
    timestamp: now
  };

  neg.messages.push(newMessage);
  neg.updatedAt = now;
  store.saveNegotiation(neg);

  return res.json({ success: true, data: newMessage, negotiation: neg });
});

export default router;
