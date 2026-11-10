import { Router, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../db/store.js';
import { config } from '../config/index.js';
import { payoutService } from '../services/paypal/payoutService.js';
import { AuthenticatedRequest, authenticateUser, requireRole } from '../middleware/rbac.js';
import { broadcastEvent } from './events.js';
import { DecisionRecord, DecisionStatus } from '../types/index.js';

const router = Router();

router.use(authenticateUser);

/**
 * GET /api/v1/home
 * Unified dashboard payload for Today view.
 */
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const isPaused = Boolean(user.isAutomationPaused);
  const autoLimit = user.autoApprovalLimit ?? 200;
  const dailyCap = user.dailyBudgetCap ?? 500;
  const balance = user.balance ?? 2500;
  const todaySpend = store.getTodaySpend(user.id);

  // 1. Needs you (Review Queue items pending human decision strictly for this user)
  const isSellerMode = user.activeWorkspace === 'seller';
  const userQueue = store.getReviewQueue('pending', user.id, isSellerMode ? 'seller' : 'buyer');
  const needsYou = userQueue.map(item => {
    const neg = store.getNegotiation(item.negotiationId);
    const reqItem = store.getRequest(item.requestId);
    const seller = store.getAgent(item.sellerId);
    const decision = store.getDecisionByEntity('deal', item.negotiationId);

    // One plain sentence explaining why the AI stopped
    const whyStopped = item.reasons[0] || (
      item.proposedPrice > autoLimit
        ? `Offer $${item.proposedPrice} exceeds your auto-approval limit ($${autoLimit}).`
        : `Requires human review under active policy.`
    );

    return {
      id: item.id,
      negotiationId: item.negotiationId,
      requestId: item.requestId,
      decisionId: decision?.id,
      title: reqItem?.title || 'Commercial Project',
      sellerName: seller?.businessName || 'Verified Partner',
      sellerAvatar: seller?.operatorAvatar || null,
      sellerVerification: seller?.verificationStatus || 'community',
      urgency: item.urgency,
      urgencyScore: item.urgencyScore,
      whyStopped,
      aiRecommendation: item.aiRecommendation,
      confidence: item.confidence,
      reasons: item.reasons,
      proposedPrice: item.proposedPrice,
      userAutoLimit: autoLimit,
      buyerMaxBudget: isSellerMode ? undefined : item.buyerMaxBudget, // Never leak buyer budget to seller!
      deliveryDays: neg?.currentProposal?.deliveryDays || 5,
      currentRound: neg?.currentRound || 1,
      expiresAt: decision?.expiresAt || null,
      createdAt: item.createdAt
    };
  });

  // Sort by urgencyScore desc, then createdAt desc
  needsYou.sort((a, b) => (b.urgencyScore - a.urgencyScore) || (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

  // 2. In progress: active negotiations scoped strictly to this user
  const activeNegotiations = store.getNegotiations({
    userId: user.id,
    status: 'in_negotiation'
  });
  const inProgress = activeNegotiations.map(neg => {
    const reqItem = store.getRequest(neg.requestId);
    let counterpartyName = 'Counterparty';
    if (isSellerMode) {
      const buyer = neg.buyerUserId ? store.getUser(neg.buyerUserId) : undefined;
      counterpartyName = buyer?.displayName || 'Buyer';
    } else {
      const sellerAgent = store.getAgent(neg.sellerAgentId);
      counterpartyName = sellerAgent?.businessName || 'Seller Studio';
    }
    return {
      id: neg.id,
      requestId: neg.requestId,
      title: reqItem?.title || 'Active Procurement',
      sellerName: counterpartyName,
      currentOffer: neg.currentProposal?.price || 0,
      currency: 'USD',
      currentRound: neg.currentRound,
      maxRounds: neg.maxRounds,
      statusLabel: `Negotiating, round ${neg.currentRound}`,
      updatedAt: neg.updatedAt
    };
  });

  // 3. Handled for you: quiet ledger of auto-approved and auto-declined items from the last 7 days for this user
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const recentDecisions = store.getRecentDecisions(100, user.id).filter(
    d => (d.status === 'auto_approved' || d.status === 'auto_declined') && d.createdAt >= sevenDaysAgo
  );

  const handledForYou = recentDecisions.map(d => {
    const neg = store.getNegotiation(d.entityId);
    const reqItem = neg ? store.getRequest(neg.requestId) : null;
    const seller = neg ? store.getAgent(neg.sellerAgentId) : null;
    return {
      id: d.id,
      decisionId: d.id,
      negotiationId: d.entityId,
      title: reqItem?.title || 'Automated Commercial Action',
      sellerName: seller?.businessName || 'Counterparty',
      status: d.status,
      actionLabel: d.status === 'auto_approved' ? 'Auto-approved' : 'Auto-declined',
      amount: d.signals.proposedPrice || 0,
      currency: 'USD',
      reasons: d.reasons,
      confidence: d.confidence,
      createdAt: d.createdAt,
      undoUntil: d.undoUntil || null
    };
  });

  // Top plain sentence that is the whole status
  let statusSentence = 'Everything is handled.';
  if (needsYou.length === 1) {
    statusSentence = '1 item needs your decision.';
  } else if (needsYou.length > 1) {
    statusSentence = `${needsYou.length} things need your decision.`;
  }

  res.json({
    success: true,
    data: {
      statusSentence,
      needsYou,
      inProgress,
      handledForYou,
      stats: {
        todaySpend,
        needsCount: needsYou.length,
        inProgressCount: inProgress.length,
        handledCount: handledForYou.length
      },
      userLimits: {
        autoApprovalLimit: autoLimit,
        dailyBudgetCap: dailyCap,
        balance,
        isAutomationPaused: isPaused
      },
      sellerPayoutAccount: payoutService.getSellerPayoutAccount(user.id),
      platformFeePercent: config.platformFeePercent
    }
  });
});

// POST /api/v1/home/review/:id/approve
router.post('/review/:id/approve', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const item = store.getReviewQueueItem(req.params.id);
  if (!item || (item.buyerId !== user.id && item.sellerId !== user.id)) {
    return res.status(404).json({ success: false, error: 'Review queue item not found' });
  }

  const neg = store.getNegotiation(item.negotiationId);
  const sellerUserId = neg?.sellerUserId;
  if (sellerUserId && !payoutService.isSellerPayoutReady(sellerUserId)) {
    store.addNotification({
      userId: sellerUserId,
      title: 'Add where to send your earnings',
      message: 'A buyer tried to confirm your deal, but your PayPal payout email is missing. Add it in Selling > Payments.',
      type: 'payout_required',
      linkUrl: `/app/deals/${item.negotiationId}`
    });
    return res.status(409).json({
      success: false,
      code: 'SELLER_PAYOUT_NOT_READY',
      error: sellerUserId === user.id
        ? 'Add where to send your earnings before confirming this deal.'
        : 'Waiting for the seller to finish payout setup.'
    });
  }

  const now = new Date().toISOString();

  // 1. Mark review item approved
  item.status = 'approved';
  item.resolvedBy = user.displayName || 'Human Buyer';
  item.resolvedAt = now;
  item.resolutionNote = req.body.note || 'Manually approved by human buyer.';
  store.saveReviewQueueItem(item);

  // 2. Update Decision record
  const decision = store.getDecisionByEntity('deal', item.negotiationId);
  if (decision) {
    store.updateDecisionStatus(decision.id, 'human_approved', 'user', item.resolutionNote || undefined);
  }

  // 3. Mark Agreement approved
  if (neg) {
    neg.status = 'agreement_reached';
    neg.updatedAt = now;
    store.saveNegotiation(neg);

    let agreement = neg.agreementId ? store.getAgreement(neg.agreementId) : null;
    if (!agreement && neg.currentProposal) {
      const seller = store.getAgent(neg.sellerAgentId);
      agreement = store.saveAgreement({
        id: `agr_${uuidv4().substring(0, 8)}`,
        negotiationId: neg.id,
        requestId: neg.requestId,
        buyerAgentId: neg.buyerAgentId,
        sellerAgentId: neg.sellerAgentId,
        buyerUserId: neg.buyerUserId || user.id,
        sellerUserId: neg.sellerUserId,
        sellerBusinessName: seller?.businessName || 'Seller Studio',
        finalPrice: neg.currentProposal.price,
        currency: neg.currentProposal.currency || 'USD',
        finalDeliverables: neg.currentProposal.deliverables,
        deliveryDays: neg.currentProposal.deliveryDays,
        commercialTerms: 'All intellectual property rights assign to buyer upon PayPal capture confirmation.',
        humanApprovalStatus: 'approved',
        humanApprovedAt: now,
        paypalReady: true,
        createdAt: now
      });
      neg.agreementId = agreement.id;
      store.saveNegotiation(neg);
    } else if (agreement) {
      agreement.humanApprovalStatus = 'approved';
      agreement.humanApprovedAt = now;
      agreement.paypalReady = true;
      store.saveAgreement(agreement);
    }
  }

  broadcastEvent('deal_updated', { negotiationId: item.negotiationId, status: 'approved' });
  res.json({ success: true, message: 'Deal approved successfully.', data: item });
});

// POST /api/v1/home/review/:id/decline
router.post('/review/:id/decline', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const item = store.getReviewQueueItem(req.params.id);
  if (!item || (item.buyerId !== user.id && item.sellerId !== user.id)) {
    return res.status(404).json({ success: false, error: 'Review queue item not found' });
  }

  const now = new Date().toISOString();

  item.status = 'rejected';
  item.resolvedBy = user.displayName || 'Human Buyer';
  item.resolvedAt = now;
  item.resolutionNote = req.body.note || 'Declined by human buyer.';
  store.saveReviewQueueItem(item);

  const decision = store.getDecisionByEntity('deal', item.negotiationId);
  if (decision) {
    store.updateDecisionStatus(decision.id, 'human_declined', 'user', item.resolutionNote || undefined);
  }

  const neg = store.getNegotiation(item.negotiationId);
  if (neg) {
    neg.status = 'rejected';
    neg.updatedAt = now;
    store.saveNegotiation(neg);
  }

  broadcastEvent('deal_updated', { negotiationId: item.negotiationId, status: 'declined' });
  res.json({ success: true, message: 'Deal declined.', data: item });
});

// POST /api/v1/home/review/:id/counter
router.post('/review/:id/counter', (req: AuthenticatedRequest, res: Response) => {
  const { counterPrice, note } = req.body;
  if (!counterPrice || typeof counterPrice !== 'number' || counterPrice <= 0) {
    return res.status(400).json({ success: false, error: 'Valid numeric counterPrice is required.' });
  }

  const user = req.user!;
  const item = store.getReviewQueueItem(req.params.id);
  if (!item || (item.buyerId !== user.id && item.sellerId !== user.id)) {
    return res.status(404).json({ success: false, error: 'Review queue item not found' });
  }

  const now = new Date().toISOString();

  item.status = 'overridden';
  item.resolvedBy = user.displayName || 'Human Buyer';
  item.resolvedAt = now;
  item.resolutionNote = `Human counteroffer submitted at $${counterPrice}. ${note || ''}`.trim();
  store.saveReviewQueueItem(item);

  const neg = store.getNegotiation(item.negotiationId);
  if (neg) {
    neg.status = 'in_negotiation';
    neg.currentRound += 1;
    neg.messages.push({
      id: `msg_counter_${Date.now()}`,
      negotiationId: neg.id,
      senderAgentId: neg.buyerAgentId,
      recipientAgentId: neg.sellerAgentId,
      senderRole: 'buyer',
      round: neg.currentRound,
      messageType: 'counteroffer',
      content: `Human principal issued a counteroffer of $${counterPrice}. ${note || ''}`.trim(),
      payload: { price: counterPrice },
      timestamp: now
    });
    store.saveNegotiation(neg);
  }

  broadcastEvent('deal_updated', { negotiationId: item.negotiationId, status: 'countered' });
  res.json({ success: true, message: `Counteroffer of $${counterPrice} dispatched.`, data: item });
});

// POST /api/v1/home/review/:id/undo (10-second Undo window)
router.post('/review/:id/undo', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const item = store.getReviewQueueItem(req.params.id);
  if (!item || (item.buyerId !== user.id && item.sellerId !== user.id)) {
    return res.status(404).json({ success: false, error: 'Review queue item not found' });
  }

  const now = new Date().toISOString();
  item.status = 'pending';
  item.resolvedBy = undefined;
  item.resolvedAt = undefined;
  item.resolutionNote = undefined;
  store.saveReviewQueueItem(item);

  const decision = store.getDecisionByEntity('deal', item.negotiationId);
  if (decision) {
    store.updateDecisionStatus(decision.id, 'needs_review', 'user', 'Action undone within 10s window.');
  }

  const neg = store.getNegotiation(item.negotiationId);
  if (neg) {
    neg.status = 'escalated';
    neg.updatedAt = now;
    if (neg.agreementId) {
      const agr = store.getAgreement(neg.agreementId);
      if (agr) {
        agr.humanApprovalStatus = 'pending';
        agr.paypalReady = false;
        store.saveAgreement(agr);
      }
    }
    store.saveNegotiation(neg);
  }

  broadcastEvent('deal_updated', { negotiationId: item.negotiationId, status: 'needs_review' });
  res.json({ success: true, message: 'Decision undone. Returned to your review queue.', data: item });
});

// POST /api/v1/home/review/:id/override
router.post('/review/:id/override', (req: AuthenticatedRequest, res: Response) => {
  const { action, note, suggestRule } = req.body;
  const user = req.user!;
  const item = store.getReviewQueueItem(req.params.id);
  if (!item || (item.buyerId !== user.id && item.sellerId !== user.id)) {
    return res.status(404).json({ success: false, error: 'Review queue item not found' });
  }

  const now = new Date().toISOString();

  // Log tuning override
  store.logTuningOverride({
    queueItemId: item.id,
    originalRecommendation: item.aiRecommendation,
    overrideAction: action || 'override_approve',
    overrideNote: note || 'Explicit human decision override.',
    suggestedPolicyChange: suggestRule ? `Consider adjusting auto-limit or seller tier for ${item.sellerId}` : undefined,
    status: 'logged'
  });

  item.status = 'overridden';
  item.resolvedBy = user.displayName || 'Human Buyer';
  item.resolvedAt = now;
  item.resolutionNote = note || 'Overridden by human';
  store.saveReviewQueueItem(item);

  broadcastEvent('deal_updated', { negotiationId: item.negotiationId, status: 'overridden' });
  res.json({ success: true, message: 'Override logged for policy tuning.', data: item });
});

// PATCH /api/v1/home/automation-pause
router.patch('/automation-pause', (req: AuthenticatedRequest, res: Response) => {
  const { isPaused } = req.body;
  if (typeof isPaused !== 'boolean') {
    return res.status(400).json({ success: false, error: 'isPaused boolean is required' });
  }

  const updated = store.setAutomationPaused(req.user!.id, isPaused);
  broadcastEvent('user_limits_updated', { isAutomationPaused: isPaused });
  res.json({
    success: true,
    message: isPaused ? 'Automation paused: all deals will route to human review.' : 'Automation resumed.',
    data: { isAutomationPaused: updated?.isAutomationPaused }
  });
});

// PATCH /api/v1/home/limits
router.patch('/limits', (req: AuthenticatedRequest, res: Response) => {
  const schema = z.object({
    autoApprovalLimit: z.number().min(0).max(10000),
    dailyBudgetCap: z.number().min(0).max(50000)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.format() });
  }

  const updated = store.updateUserLimits(
    req.user!.id,
    parsed.data.autoApprovalLimit,
    parsed.data.dailyBudgetCap
  );

  broadcastEvent('user_limits_updated', {
    autoApprovalLimit: updated?.autoApprovalLimit,
    dailyBudgetCap: updated?.dailyBudgetCap
  });

  res.json({
    success: true,
    message: 'Limits updated successfully.',
    data: {
      autoApprovalLimit: updated?.autoApprovalLimit,
      dailyBudgetCap: updated?.dailyBudgetCap
    }
  });
});

// GET /api/v1/home/overrides
router.get('/overrides', (req: AuthenticatedRequest, res: Response) => {
  const overrides = store.getTuningOverrides();
  res.json({
    success: true,
    count: overrides.length,
    data: overrides
  });
});

// POST /api/v1/home/overrides/:id/apply
router.post('/overrides/:id/apply', (req: AuthenticatedRequest, res: Response) => {
  const overrides = store.getTuningOverrides();
  const override = overrides.find(o => o.id === req.params.id);
  if (!override) {
    return res.status(404).json({ success: false, error: 'Override record not found' });
  }

  // Convert suggested policy into explicit user rule
  if (override.suggestedPolicyChange) {
    store.saveMemoryItem({
      id: `mem_rule_${Date.now().toString(36)}`,
      userId: req.user!.id,
      role: 'buyer',
      type: 'decision_rule',
      key: `Rule from Override: ${override.overrideAction.toUpperCase()}`,
      value: override.suggestedPolicyChange,
      source: 'user_provided',
      confidence: 1.0,
      verifiedByUser: true,
      createdAt: new Date().toISOString()
    });
  }

  store.updateTuningOverrideStatus(override.id, 'applied');

  res.json({
    success: true,
    message: 'Rule applied from override suggestion.'
  });
});

export default router;
