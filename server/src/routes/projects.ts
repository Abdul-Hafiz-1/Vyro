import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../db/store.js';
import { config } from '../config/index.js';
import { AuthenticatedRequest, authenticateUser } from '../middleware/rbac.js';
import {
  projectStateMachine,
  ProjectTransitionError,
  formatPlainProjectStage
} from '../services/projects/projectStateMachine.js';
import { saveEvidenceFiles, resolvePrivateEvidenceFilePath } from '../services/projects/fileEvidence.js';
import { disputeService } from '../services/projects/disputeService.js';
import { payoutService, PayoutGateError } from '../services/paypal/payoutService.js';
import { paypalService, PayPalApiException } from '../services/paypal/paypalClient.js';
import { computeFeeAndPayoutCents } from '../services/negotiation/money.js';
import { negotiationOrchestrator } from '../services/negotiation/orchestrator.js';
import { broadcastEvent } from './events.js';
import { reviewWindowWorker } from '../services/projects/reviewWindowWorker.js';

const router = Router();

router.use(authenticateUser);

function sendDomainError(res: Response, err: any) {
  if (err instanceof ProjectTransitionError) {
    return res.status(err.statusCode).json({ success: false, code: err.code, error: err.message });
  }
  if (err instanceof PayoutGateError) {
    return res.status(err.status).json({
      success: false,
      code: err.code,
      error: err.message,
      nextStep: err.nextStep
    });
  }
  if (err instanceof PayPalApiException) {
    return res.status(err.details.status).json({
      success: false,
      code: err.details.code,
      error: err.details.message,
      nextStep: err.details.nextStep
    });
  }
  return res.status(400).json({ success: false, error: err?.message || 'Request failed.' });
}

function buildEnrichedProject(neg: any, viewerUserId: string) {
  const isBuyer = neg.buyerUserId === viewerUserId;
  const isSeller = neg.sellerUserId === viewerUserId;
  const buyerAgent = store.getAgent(neg.buyerAgentId);
  const sellerAgent = store.getAgent(neg.sellerAgentId);
  const rawReq = store.getRequest(neg.requestId);
  const agreement = neg.agreementId ? store.getAgreement(neg.agreementId) : null;
  const tx = agreement ? store.getTransactionByAgreement(agreement.id) : null;
  const payout = store.getPayoutByDeal(neg.id) || null;
  const moneyState = projectStateMachine.getMoneyState(neg.id);
  const cancelReq = store.getCancellationRequest(neg.id) || null;
  const dispute = store.getDisputeByDeal(neg.id) || null;
  const deliveries = store.getDeliveries(neg.id);
  const rawEvents = store.getProjectEvents(neg.id);
  const events = isBuyer && !isSeller
    ? rawEvents.map(ev =>
        ev.toStatus === 'declined' && (ev.actorRole === 'seller' || ev.actorRole === 'system')
          ? { ...ev, reason: neg.sharedRejectNote || null }
          : ev
      )
    : rawEvents;
  const stageMeta = formatPlainProjectStage(neg.projectStatus, isSeller && !isBuyer);
  const dueAt = neg.dueAt || null;
  const isOverdue = Boolean(
    dueAt &&
      new Date(dueAt).getTime() < Date.now() &&
      ['paid_held', 'in_progress', 'revision_requested'].includes(neg.projectStatus)
  );

  // Strict privacy: strip counterparty private pricing
  const serializedReq = rawReq
    ? {
        ...rawReq,
        maxBudget: isSeller && !isBuyer ? undefined : rawReq.maxBudget,
        targetBudget: isSeller && !isBuyer ? undefined : rawReq.targetBudget,
        hardCap: isSeller && !isBuyer ? undefined : rawReq.hardCap,
        flexibility: isSeller && !isBuyer ? undefined : rawReq.flexibility,
        budgetCents: isSeller && !isBuyer ? undefined : rawReq.budgetCents,
        targetPriceCents: isSeller && !isBuyer ? undefined : rawReq.targetPriceCents,
        hardCapCents: isSeller && !isBuyer ? undefined : rawReq.hardCapCents
      }
    : null;

  const grossCents = tx?.amountCents ?? agreement?.finalPriceCents ?? Math.round((neg.currentProposal?.price || rawReq?.maxBudget || 0) * 100);
  const feeCents = tx?.platformFeeCents ?? agreement?.platformFeeCents ?? Math.round(grossCents * (config.platformFeePercent / 100));
  const netSellerCents = Math.max(0, grossCents - feeCents);

  // Neutralize seller private rejection reason for buyer
  const visibleRejectReason = isSeller
    ? neg.rejectReason
    : neg.sharedRejectNote
    ? `This seller can't take it ("${neg.sharedRejectNote}"). I'm looking at other options.`
    : neg.projectStatus === 'declined'
    ? "This seller can't take it. I'm looking at other options."
    : null;

  return {
    ...neg,
    rejectReason: isSeller ? neg.rejectReason : null,
    request: serializedReq,
    buyerAgent: buyerAgent
      ? {
          id: buyerAgent.id,
          name: buyerAgent.name,
          businessName: buyerAgent.businessName
        }
      : null,
    sellerAgent: sellerAgent
      ? {
          id: sellerAgent.id,
          businessName: sellerAgent.businessName,
          name: sellerAgent.name,
          verificationStatus: sellerAgent.verificationStatus
        }
      : null,
    agreement,
    transaction: tx,
    payout,
    moneyState,
    cancellationRequest: cancelReq,
    dispute,
    deliveries,
    events,
    stageMeta,
    isOverdue,
    feeBreakdown: {
      grossCents,
      feeCents,
      netSellerCents,
      feePercent: config.platformFeePercent
    },
    visibleRejectReason,
    viewerRole: isSeller && !isBuyer ? 'seller' : 'buyer'
  };
}

// GET /api/v1/projects - List buyer or seller projects with capacity & stage metadata
router.get('/', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const workspace = req.query.role === 'seller' || req.query.role === 'buyer'
    ? String(req.query.role)
    : user.activeWorkspace === 'seller'
    ? 'seller'
    : 'buyer';

  const allUserNegs = store.getNegotiations({ userId: user.id });
  const scoped = allUserNegs.filter(n =>
    workspace === 'seller' ? n.sellerUserId === user.id : n.buyerUserId === user.id
  );

  const projects = scoped.map(n => buildEnrichedProject(n, user.id));
  const sellerCapacity = projectStateMachine.getSellerCapacity(user.id);

  return res.json({
    success: true,
    count: projects.length,
    sellerCapacity,
    data: projects
  });
});

// GET /api/v1/projects/disputes/admin - Mediator disputes queue + 30-day abuse signals
router.get('/disputes/admin', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const all = store.getAllDisputes();
  const visible =
    user.role === 'admin'
      ? all
      : all.filter(d => d.openedByUserId === user.id || d.respondentUserId === user.id);

  const enriched = visible.map(d => {
    const neg = store.getNegotiation(d.dealId);
    const reqItem = neg ? store.getRequest(neg.requestId) : null;
    const agreement = neg?.agreementId ? store.getAgreement(neg.agreementId) : null;
    const deliveries = store.getDeliveries(d.dealId);
    const moneyState = projectStateMachine.getMoneyState(d.dealId);
    const buyerId = d.openedByRole === 'buyer' ? d.openedByUserId : d.respondentUserId;
    const sellerId = d.openedByRole === 'seller' ? d.openedByUserId : d.respondentUserId;
    const buyerAbuse = disputeService.getUserAbuseSummary(buyerId);
    const sellerAbuse = disputeService.getUserAbuseSummary(sellerId);

    return {
      ...d,
      projectTitle: reqItem?.title || 'Project',
      projectStatus: neg?.projectStatus || 'disputed',
      agreement,
      deliveries,
      moneyState,
      buyerAbuse,
      sellerAbuse
    };
  });

  return res.json({ success: true, count: enriched.length, data: enriched });
});

// PATCH /api/v1/projects/seller/rules - Update seller auto-reject & capacity settings
router.patch('/seller/rules', (req: AuthenticatedRequest, res: Response) => {
  const user = store.getUser(req.user!.id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });

  const { minBudget, blockedCategories, minDeadlineDays, autoRejectWhenFull, reviewIncomingManually, maxConcurrentProjects } = req.body || {};
  user.sellerAutoRules = {
    ...(user.sellerAutoRules || {}),
    ...(typeof minBudget === 'number' || minBudget === null ? { minBudget: minBudget || undefined } : {}),
    ...(Array.isArray(blockedCategories) ? { blockedCategories: blockedCategories.map(String) } : {}),
    ...(typeof minDeadlineDays === 'number' || minDeadlineDays === null ? { minDeadlineDays: minDeadlineDays || undefined } : {}),
    ...(typeof autoRejectWhenFull === 'boolean' ? { autoRejectWhenFull } : {}),
    ...(typeof reviewIncomingManually === 'boolean' ? { reviewIncomingManually } : {})
  };
  if (typeof maxConcurrentProjects === 'number' && maxConcurrentProjects >= 1 && maxConcurrentProjects <= 25) {
    user.sellerProfile = {
      ...(user.sellerProfile || {
        businessName: user.displayName,
        headline: '',
        description: '',
        categories: [],
        location: '',
        serviceCoverage: 'Global',
        availabilityStatus: 'immediate',
        maxConcurrentProjects: 5,
        activeProjects: 0,
        rating: 5,
        reviewCount: 0,
        replyPoints: 0,
        avgResponseTime: 'Fast'
      }),
      maxConcurrentProjects: Math.round(maxConcurrentProjects)
    };
  }
  store.saveUser(user);
  return res.json({
    success: true,
    data: {
      sellerAutoRules: user.sellerAutoRules,
      sellerCapacity: projectStateMachine.getSellerCapacity(user.id)
    }
  });
});

// POST /api/v1/projects/inquire - Create an incoming request in request_sent (or auto-decline per seller rules)
router.post('/inquire', (req: AuthenticatedRequest, res: Response) => {
  const buyer = req.user!;
  const { requestId, listingId, title, description, maxBudget, deadlineDays } = req.body || {};
  if (!listingId) {
    return res.status(400).json({ success: false, error: 'listingId is required.' });
  }
  const listing = store.getListing(listingId);
  if (!listing) {
    return res.status(404).json({ success: false, error: 'Listing not found.' });
  }

  let request = requestId ? store.getRequest(requestId) : undefined;
  if (requestId && (!request || (request.userId !== buyer.id && request.buyerUserId !== buyer.id))) {
    return res.status(404).json({ success: false, error: 'Request not found.' });
  }

  if (!request) {
    const nowReq = new Date().toISOString();
    let buyerAgent = store.getAgents({ ownerId: buyer.id, type: 'buyer' })[0];
    if (!buyerAgent) {
      buyerAgent = store.saveAgent({
        id: `agt_buy_${uuidv4().substring(0, 8)}`,
        ownerId: buyer.id,
        userId: buyer.id,
        businessName: `${buyer.displayName} Procurement`,
        name: `${buyer.displayName} Buyer Agent`,
        type: 'buyer',
        description: 'Buyer procurement assistant',
        category: listing.category || 'Development',
        capabilities: ['Procurement'],
        status: 'active',
        verificationStatus: 'verified',
        catalog: [],
        pricingConstraints: { maxBudget: typeof maxBudget === 'number' ? maxBudget : listing.price },
        negotiationStrategy: 'balanced',
        approvalPolicy: 'explicit_human_required',
        createdAt: nowReq,
        updatedAt: nowReq
      });
    }
    const budgetVal = typeof maxBudget === 'number' && maxBudget > 0 ? maxBudget : listing.price;
    const daysVal = typeof deadlineDays === 'number' && deadlineDays > 0 ? Math.round(deadlineDays) : (listing.deliveryDays || 5);
    request = store.saveRequest({
      id: `req_${uuidv4().substring(0, 8)}`,
      userId: buyer.id,
      buyerUserId: buyer.id,
      buyerAgentId: buyerAgent.id,
      rawInput: String(description || listing.description || listing.title),
      title: String(title || listing.title),
      category: listing.category || 'Development',
      requiredCapabilities: listing.tags || [],
      deliverables: Array.isArray(listing.deliverables) && listing.deliverables.length > 0 ? listing.deliverables : [listing.title],
      maxBudget: budgetVal,
      currency: listing.currency || 'USD',
      deadlineDays: daysVal,
      qualityRequirements: 'Agreed deliverables',
      status: 'active',
      createdAt: nowReq,
      updatedAt: nowReq
    });
  }
  if ((listing.sellerUserId || listing.sellerId) === buyer.id) {
    return res.status(409).json({ success: false, error: 'Cannot send a request to your own listing.' });
  }
  if (listing.status === 'paused') {
    return res.status(409).json({ success: false, error: 'This listing is currently paused by the seller.' });
  }

  const sellerUserId = listing.sellerUserId || listing.sellerId;
  const capacity = projectStateMachine.getSellerCapacity(sellerUserId);
  const autoRuleCheck = projectStateMachine.evaluateSellerAutoRules(sellerUserId, {
    category: request.category,
    maxBudget: request.maxBudget,
    deadlineDays: request.deadlineDays
  });

  if (capacity.isFull && !autoRuleCheck.matched) {
    return res.status(409).json({
      success: false,
      code: 'SELLER_AT_CAPACITY',
      error: 'This seller is currently at full project capacity.'
    });
  }

  const now = new Date().toISOString();
  const negId = `neg_${uuidv4().substring(0, 8)}`;
  const buyerAgent = store.getAgent(request.buyerAgentId);
  const sellerAgentId = listing.sellerAgentId || store.getAgents({ ownerId: sellerUserId, type: 'seller' })[0]?.id || `agt_sel_${uuidv4().substring(0, 6)}`;

  const neg = store.saveNegotiation({
    id: negId,
    requestId: request.id,
    buyerAgentId: buyerAgent?.id || request.buyerAgentId,
    sellerAgentId,
    buyerUserId: buyer.id,
    sellerUserId,
    listingId: listing.id,
    status: autoRuleCheck.matched ? 'rejected' : 'initiated',
    projectStatus: autoRuleCheck.matched ? 'declined' : 'request_sent',
    rejectReason: autoRuleCheck.matched ? autoRuleCheck.reason || null : null,
    currentRound: 1,
    maxRounds: 6,
    currentProposal: {
      id: `prop_${uuidv4().substring(0, 8)}`,
      negotiationId: negId,
      senderAgentId: buyerAgent?.id || request.buyerAgentId,
      round: 1,
      price: request.targetBudget || request.maxBudget,
      priceCents: Math.round((request.targetBudget || request.maxBudget) * 100),
      currency: 'USD',
      deliverables: request.deliverables,
      deliveryDays: request.deadlineDays,
      terms: 'Standard escrow milestone delivery',
      validUntil: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
      status: autoRuleCheck.matched ? 'rejected' : 'pending',
      createdAt: now
    },
    messages: [],
    agreementId: null,
    createdAt: now,
    updatedAt: now
  });

  store.addProjectEvent({
    dealId: neg.id,
    actorUserId: buyer.id,
    actorRole: 'buyer',
    fromStatus: null,
    toStatus: neg.projectStatus,
    summary: autoRuleCheck.matched
      ? autoRuleCheck.reason!
      : `Buyer sent project inquiry for "${request.title}".`,
    reason: autoRuleCheck.matched ? autoRuleCheck.reason : null
  });

  if (!autoRuleCheck.matched) {
    store.addNotification({
      userId: sellerUserId,
      title: 'New project request',
      message: `New request for "${request.title}" (${request.deadlineDays} days). Accept, counter, or reject in Projects.`,
      type: 'offer_received',
      linkUrl: `/app/projects/${neg.id}`
    });
  } else {
    store.addNotification({
      userId: buyer.id,
      title: 'Seller unavailable for this request',
      message: "This seller can't take it. I'm looking at other options.",
      type: 'system',
      linkUrl: `/app/projects/${neg.id}`
    });
  }

  broadcastEvent('project_updated', { dealId: neg.id, projectStatus: neg.projectStatus });
  return res.status(201).json({ success: true, data: buildEnrichedProject(neg, buyer.id) });
});

// GET /api/v1/projects/:id - Enriched project detail (strict party scope; 404 otherwise)
router.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const neg = store.getNegotiation(req.params.id);
  if (!neg || (neg.buyerUserId !== user.id && neg.sellerUserId !== user.id && user.role !== 'admin')) {
    return res.status(404).json({ success: false, error: 'Project not found' });
  }
  return res.json({ success: true, data: buildEnrichedProject(neg, user.id) });
});

// POST /api/v1/projects/:id/accept-request - Seller accepts an incoming request_sent onto the same project
router.post('/:id/accept-request', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const neg = store.getNegotiation(req.params.id);
    if (!neg || (neg.buyerUserId !== user.id && neg.sellerUserId !== user.id)) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    if (neg.sellerUserId !== user.id) {
      return res.status(409).json({ success: false, error: 'Only the seller can accept incoming requests.' });
    }

    const request = store.getRequest(neg.requestId);
    const sellerAgent = store.getAgent(neg.sellerAgentId);
    const price = neg.currentProposal?.price || request?.maxBudget || 100;
    const priceCents = neg.currentProposal?.priceCents || Math.round(price * 100);
    const { feeCents, payoutCents } = computeFeeAndPayoutCents(priceCents, config.platformFeePercent);
    const now = new Date().toISOString();

    projectStateMachine.transitionStatus({
      dealId: neg.id,
      actorUserId: user.id,
      actorRole: 'seller',
      toStatus: 'negotiating',
      allowedFrom: ['request_sent'],
      summary: 'Seller accepted incoming buyer inquiry.',
      mutate: (n) => {
        n.status = 'in_negotiation';
      }
    });

    const agreementId = `agr_${uuidv4().substring(0, 8)}`;
    const sellerPayoutReady = payoutService.isSellerPayoutReady(user.id);
    store.saveAgreement({
      id: agreementId,
      negotiationId: neg.id,
      requestId: neg.requestId,
      buyerAgentId: neg.buyerAgentId,
      sellerAgentId: neg.sellerAgentId,
      buyerUserId: neg.buyerUserId || '',
      sellerUserId: user.id,
      sellerBusinessName: sellerAgent?.businessName || user.displayName,
      finalPrice: price,
      finalPriceCents: priceCents,
      platformFeeCents: feeCents,
      sellerPayoutCents: payoutCents,
      currency: 'USD',
      finalDeliverables: neg.currentProposal?.deliverables || request?.deliverables || ['Project delivery'],
      deliveryDays: neg.currentProposal?.deliveryDays || request?.deadlineDays || 5,
      commercialTerms: 'Escrow-protected delivery. IP assigns to buyer upon work acceptance.',
      revisions: neg.revisionsAllowed ?? 1,
      humanApprovalStatus: 'approved',
      humanApprovedAt: now,
      sellerAcceptanceStatus: 'accepted',
      sellerAcceptedAt: now,
      paypalReady: sellerPayoutReady,
      createdAt: now
    });

    const out = projectStateMachine.transitionStatus({
      dealId: neg.id,
      actorUserId: user.id,
      actorRole: 'seller',
      toStatus: 'agreed',
      allowedFrom: ['negotiating'],
      summary: `Terms agreed at $${price} (${neg.currentProposal?.deliveryDays || request?.deadlineDays || 5}d). Ready for PayPal checkout.`,
      mutate: (n) => {
        n.agreementId = agreementId;
        n.status = 'agreement_reached';
        if (n.currentProposal) n.currentProposal.status = 'accepted';
      }
    });

    if (neg.buyerUserId) {
      store.addNotification({
        userId: neg.buyerUserId,
        title: 'Seller accepted your request',
        message: `${sellerAgent?.businessName || 'Seller'} accepted your request for "${request?.title || 'Project'}". You can pay with PayPal to begin.`,
        type: 'agreement_ready',
        linkUrl: `/app/projects/${neg.id}`
      });
    }

    broadcastEvent('project_updated', { dealId: neg.id, projectStatus: 'agreed' });
    return res.json({ success: true, data: buildEnrichedProject(out.negotiation, user.id) });
  } catch (err: any) {
    return sendDomainError(res, err);
  }
});

// POST /api/v1/projects/:id/counter-request - Seller sends inline counter price/days on incoming request
router.post('/:id/counter-request', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const { price, deliveryDays, note } = req.body || {};
    if (typeof price !== 'number' || price <= 0) {
      return res.status(400).json({ success: false, error: 'A valid positive counter price is required.' });
    }
    const neg = store.getNegotiation(req.params.id);
    if (!neg || (neg.buyerUserId !== user.id && neg.sellerUserId !== user.id)) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    if (neg.sellerUserId !== user.id) {
      return res.status(409).json({ success: false, error: 'Only the seller can counter this request.' });
    }
    const days = typeof deliveryDays === 'number' && deliveryDays > 0 ? Math.round(deliveryDays) : (neg.currentProposal?.deliveryDays || 5);
    const result = projectStateMachine.transitionStatus({
      dealId: neg.id,
      actorUserId: user.id,
      actorRole: 'seller',
      toStatus: 'negotiating',
      allowedFrom: ['request_sent'],
      summary: `Seller countered with $${Math.round(price)} for ${days}-day delivery.`,
      reason: note,
      mutate: (n, now) => {
        n.status = 'in_negotiation';
        n.currentRound = (n.currentRound || 1) + 1;
        n.currentProposal = {
          id: `prop_${uuidv4().substring(0, 8)}`,
          negotiationId: n.id,
          senderAgentId: n.sellerAgentId,
          round: n.currentRound,
          price: Math.round(price),
          priceCents: Math.round(price * 100),
          currency: 'USD',
          deliverables: n.currentProposal?.deliverables || ['Project delivery'],
          deliveryDays: days,
          terms: 'Escrow milestone delivery',
          validUntil: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
          status: 'pending',
          createdAt: now
        };
      }
    });
    if (neg.buyerUserId) {
      store.addNotification({
        userId: neg.buyerUserId,
        title: 'Seller sent a counteroffer',
        message: `Seller proposed $${Math.round(price)} with ${days}-day turnaround.`,
        type: 'offer_received',
        linkUrl: `/app/projects/${neg.id}`
      });
    }
    broadcastEvent('project_updated', { dealId: neg.id, projectStatus: 'negotiating' });
    return res.json({ success: true, data: buildEnrichedProject(result.negotiation, user.id) });
  } catch (err: any) {
    return sendDomainError(res, err);
  }
});

// POST /api/v1/projects/:id/reject - Seller or Buyer rejects request or walks away before payment
router.post('/:id/reject', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const { reasonChip, note, shareNote } = req.body || {};
    const out = projectStateMachine.rejectBeforePayment(req.params.id, user.id, {
      reasonChip,
      note,
      shareNote: Boolean(shareNote)
    });

    // If seller rejected, help buyer find another active listing cleanly
    let alternativeCount = 0;
    const neg = out.negotiation;
    if (neg.sellerUserId === user.id) {
      const reqItem = store.getRequest(neg.requestId);
      const otherListings = store.getListings({ status: 'active' }).filter(
        l =>
          l.sellerUserId !== neg.buyerUserId &&
          l.sellerUserId !== user.id &&
          l.category?.toLowerCase() === (reqItem?.category || '').toLowerCase() &&
          !projectStateMachine.getSellerCapacity(l.sellerUserId || l.sellerId).isFull
      );
      alternativeCount = otherListings.length;
    }

    return res.json({
      success: true,
      alternativeCount,
      data: buildEnrichedProject(out.negotiation, user.id)
    });
  } catch (err: any) {
    return sendDomainError(res, err);
  }
});

// POST /api/v1/projects/:id/override-auto-decline - Seller overrides rule auto-decline
router.post('/:id/override-auto-decline', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const out = projectStateMachine.overrideAutoDecline(req.params.id, user.id);
    return res.json({ success: true, data: buildEnrichedProject(out.negotiation, user.id) });
  } catch (err: any) {
    return sendDomainError(res, err);
  }
});

// POST /api/v1/projects/:id/cancel - Cancel before payment OR immediate full refund if paid_held
router.post('/:id/cancel', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const neg = store.getNegotiation(req.params.id);
    if (!neg || (neg.buyerUserId !== user.id && neg.sellerUserId !== user.id)) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    const reason = String(req.body?.reason || '').trim();

    if (neg.projectStatus === 'paid_held') {
      if (!neg.agreementId) {
        return res.status(409).json({ success: false, error: 'Agreement missing for paid deal.' });
      }
      const isSeller = neg.sellerUserId === user.id;
      const refundReason = reason || (isSeller ? 'Seller cancelled paid project before starting work' : 'Buyer cancelled before seller started work');
      await paypalService.refundPayment(neg.agreementId, refundReason, user.id, {
        enforceStageRules: true,
        actorRole: isSeller ? 'seller' : 'buyer'
      });

      const otherId = isSeller ? neg.buyerUserId : neg.sellerUserId;
      if (otherId) {
        store.addNotification({
          userId: otherId,
          title: 'Project cancelled & refunded',
          message: isSeller
            ? 'The seller cancelled before starting work. A full PayPal refund has been issued.'
            : 'The buyer cancelled before work started. A full refund was issued to the buyer.',
          type: 'system',
          linkUrl: `/app/projects/${neg.id}`
        });
      }
      return res.json({
        success: true,
        data: buildEnrichedProject(store.getNegotiation(neg.id)!, user.id)
      });
    }

    const out = projectStateMachine.cancelBeforePayment(neg.id, user.id, reason);
    return res.json({ success: true, data: buildEnrichedProject(out.negotiation, user.id) });
  } catch (err: any) {
    return sendDomainError(res, err);
  }
});

// POST /api/v1/projects/:id/start - Seller clicks "Start work" (paid_held -> in_progress)
router.post('/:id/start', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const out = projectStateMachine.startWork(req.params.id, user.id);
    return res.json({ success: true, data: buildEnrichedProject(out.negotiation, user.id) });
  } catch (err: any) {
    return sendDomainError(res, err);
  }
});

// POST /api/v1/projects/:id/deliver - Seller submits delivery (note, links, allowlisted files with SHA-256)
router.post('/:id/deliver', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const { note, links, files } = req.body || {};
    const savedFiles = saveEvidenceFiles(files);
    const out = projectStateMachine.deliverWork(req.params.id, user.id, {
      note,
      links: Array.isArray(links) ? links : [],
      files: savedFiles
    });
    return res.json({
      success: true,
      delivery: out.delivery,
      data: buildEnrichedProject(out.negotiation, user.id)
    });
  } catch (err: any) {
    return sendDomainError(res, err);
  }
});

// GET /api/v1/projects/:id/files/:fileId - Private delivery/dispute file access (404 for third parties)
router.get('/:id/files/:fileId', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const neg = store.getNegotiation(req.params.id);
  if (!neg || (neg.buyerUserId !== user.id && neg.sellerUserId !== user.id && user.role !== 'admin')) {
    return res.status(404).json({ success: false, error: 'File not found' });
  }

  const deliveries = store.getDeliveries(neg.id);
  const dispute = store.getDisputeByDeal(neg.id);
  const allFiles = [
    ...deliveries.flatMap(d => d.files || []),
    ...(dispute?.evidenceFiles || []),
    ...(dispute?.respondentEvidenceFiles || [])
  ];
  const fileMeta = allFiles.find(f => f.id === req.params.fileId);
  if (!fileMeta) {
    return res.status(404).json({ success: false, error: 'File not found' });
  }

  const fullPath = resolvePrivateEvidenceFilePath(fileMeta.storedName);
  if (!fullPath) {
    return res.status(404).json({ success: false, error: 'File no longer available' });
  }

  res.setHeader('Content-Disposition', `attachment; filename="${fileMeta.originalName}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.sendFile(fullPath);
});

// POST /api/v1/projects/:id/request-changes - Buyer requests revision (delivered -> revision_requested)
router.post('/:id/request-changes', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const message = String(req.body?.message || '');
    const out = projectStateMachine.requestRevision(req.params.id, user.id, message);
    return res.json({ success: true, data: buildEnrichedProject(out.negotiation, user.id) });
  } catch (err: any) {
    return sendDomainError(res, err);
  }
});

// POST /api/v1/projects/:id/accept-work - Buyer accepts delivered work & triggers seller payout
router.post('/:id/accept-work', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const result = await payoutService.acceptWorkAndReleasePayout(req.params.id, user.id, {
      requireDelivered: true
    });
    return res.json({
      success: true,
      payout: result.payout,
      ledger: result.ledger,
      data: buildEnrichedProject(store.getNegotiation(req.params.id)!, user.id)
    });
  } catch (err: any) {
    return sendDomainError(res, err);
  }
});

// POST /api/v1/projects/:id/remind - Seller sends rate-limited reminder on delivered project
router.post('/:id/remind', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const out = projectStateMachine.sendReviewReminder(req.params.id, user.id);
    return res.json({ success: true, data: out });
  } catch (err: any) {
    return sendDomainError(res, err);
  }
});

// POST /api/v1/projects/:id/request-cancel - Buyer in in_progress requests mutual cancellation
router.post('/:id/request-cancel', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const neg = store.getNegotiation(req.params.id);
    if (!neg || (neg.buyerUserId !== user.id && neg.sellerUserId !== user.id)) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    if (neg.buyerUserId !== user.id) {
      return res.status(409).json({ success: false, error: 'Only the buyer can request cancellation.' });
    }
    if (neg.projectStatus !== 'in_progress') {
      return res.status(409).json({ success: false, error: 'Mutual cancellation requests are only needed while work is in progress.' });
    }
    const existing = store.getCancellationRequest(neg.id);
    if (existing && existing.status === 'pending') {
      return res.status(409).json({ success: false, error: 'A cancellation request is already pending the seller’s decision.' });
    }
    const reason = String(req.body?.reason || '').trim();
    if (reason.length < 3) {
      return res.status(400).json({ success: false, error: 'Please explain why you want to cancel.' });
    }
    const now = new Date().toISOString();
    const cancelReq = store.saveCancellationRequest({
      id: `crq_${uuidv4().substring(0, 10)}`,
      dealId: neg.id,
      buyerUserId: neg.buyerUserId!,
      sellerUserId: neg.sellerUserId!,
      reason,
      status: 'pending',
      respondDueAt: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
      createdAt: now
    });
    store.addProjectEvent({
      dealId: neg.id,
      actorUserId: user.id,
      actorRole: 'buyer',
      fromStatus: 'in_progress',
      toStatus: 'in_progress',
      summary: 'Buyer requested cancellation while work is in progress.',
      reason
    });
    if (neg.sellerUserId) {
      store.addNotification({
        userId: neg.sellerUserId,
        title: 'Cancellation request — Needs your decision',
        message: `Buyer asked to cancel: "${reason}". Agree to a refund or decline in Projects.`,
        type: 'action_required',
        linkUrl: `/app/projects/${neg.id}`
      });
    }
    broadcastEvent('project_updated', { dealId: neg.id, projectStatus: neg.projectStatus });
    return res.json({ success: true, cancellationRequest: cancelReq, data: buildEnrichedProject(neg, user.id) });
  } catch (err: any) {
    return sendDomainError(res, err);
  }
});

// POST /api/v1/projects/:id/respond-cancel - Seller agrees (full/partial refund) or declines cancellation
router.post('/:id/respond-cancel', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const neg = store.getNegotiation(req.params.id);
    if (!neg || !neg.agreementId || (neg.buyerUserId !== user.id && neg.sellerUserId !== user.id)) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    if (neg.sellerUserId !== user.id) {
      return res.status(409).json({ success: false, error: 'Only the seller can respond to a cancellation request.' });
    }
    const cancelReq = store.getCancellationRequest(neg.id);
    if (!cancelReq || cancelReq.status !== 'pending') {
      return res.status(409).json({ success: false, error: 'No pending cancellation request found.' });
    }

    const { action, partialRefundCents, note } = req.body || {};
    const now = new Date().toISOString();

    if (action === 'decline') {
      cancelReq.status = 'declined';
      cancelReq.sellerNote = note ? String(note).trim() : null;
      cancelReq.resolvedAt = now;
      store.saveCancellationRequest(cancelReq);
      store.addProjectEvent({
        dealId: neg.id,
        actorUserId: user.id,
        actorRole: 'seller',
        fromStatus: 'in_progress',
        toStatus: 'in_progress',
        summary: 'Seller declined buyer cancellation request.',
        reason: cancelReq.sellerNote || undefined
      });
      if (neg.buyerUserId) {
        store.addNotification({
          userId: neg.buyerUserId,
          title: 'Cancellation request declined',
          message: 'The seller declined cancellation and money remains held. You can wait for delivery or open a dispute.',
          type: 'action_required',
          linkUrl: `/app/projects/${neg.id}`
        });
      }
      broadcastEvent('project_updated', { dealId: neg.id, projectStatus: neg.projectStatus });
      return res.json({ success: true, data: buildEnrichedProject(store.getNegotiation(neg.id)!, user.id) });
    }

    if (action === 'agree_full') {
      await paypalService.refundPayment(neg.agreementId, `Seller agreed to full refund: ${note || cancelReq.reason}`, user.id, {
        enforceStageRules: false,
        actorRole: 'seller'
      });
      cancelReq.status = 'approved_full';
      cancelReq.sellerNote = note || null;
      cancelReq.resolvedAt = now;
      store.saveCancellationRequest(cancelReq);
      return res.json({ success: true, data: buildEnrichedProject(store.getNegotiation(neg.id)!, user.id) });
    }

    if (action === 'agree_partial') {
      const amountCents = Math.round(Number(partialRefundCents || 0));
      await paypalService.refundPayment(neg.agreementId, `Seller agreed to partial refund: ${note || cancelReq.reason}`, user.id, {
        amountCents,
        enforceStageRules: false,
        actorRole: 'seller'
      });
      cancelReq.status = 'approved_partial';
      cancelReq.refundCents = amountCents;
      cancelReq.sellerNote = note || null;
      cancelReq.resolvedAt = now;
      store.saveCancellationRequest(cancelReq);
      return res.json({ success: true, data: buildEnrichedProject(store.getNegotiation(neg.id)!, user.id) });
    }

    return res.status(400).json({ success: false, error: 'Action must be agree_full, agree_partial, or decline.' });
  } catch (err: any) {
    return sendDomainError(res, err);
  }
});

// POST /api/v1/projects/:id/voluntary-refund - Seller refunds full or partial before payout release
router.post('/:id/voluntary-refund', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const neg = store.getNegotiation(req.params.id);
    if (!neg || !neg.agreementId || (neg.buyerUserId !== user.id && neg.sellerUserId !== user.id)) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    if (neg.sellerUserId !== user.id) {
      return res.status(409).json({ success: false, error: 'Only the seller can issue a voluntary refund.' });
    }
    const { amountCents, reason } = req.body || {};
    await paypalService.refundPayment(neg.agreementId, reason || 'Seller issued voluntary refund', user.id, {
      amountCents: typeof amountCents === 'number' ? Math.round(amountCents) : undefined,
      enforceStageRules: true,
      actorRole: 'seller'
    });
    return res.json({ success: true, data: buildEnrichedProject(store.getNegotiation(neg.id)!, user.id) });
  } catch (err: any) {
    return sendDomainError(res, err);
  }
});

// POST /api/v1/projects/:id/disputes - Open a dispute (Phase 3)
router.post('/:id/disputes', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const { reasonChip, description, evidenceLinks, files } = req.body || {};
    const savedFiles = saveEvidenceFiles(files);
    const dispute = disputeService.openDispute(req.params.id, user.id, {
      reasonChip,
      description,
      evidenceLinks: Array.isArray(evidenceLinks) ? evidenceLinks : [],
      evidenceFiles: savedFiles
    });
    return res.status(201).json({
      success: true,
      dispute,
      data: buildEnrichedProject(store.getNegotiation(req.params.id)!, user.id)
    });
  } catch (err: any) {
    return sendDomainError(res, err);
  }
});

// POST /api/v1/projects/:id/disputes/respond - Counterparty submits dispute response + evidence
router.post('/:id/disputes/respond', (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    const { note, evidenceLinks, files } = req.body || {};
    const savedFiles = saveEvidenceFiles(files);
    const dispute = disputeService.respondToDispute(req.params.id, user.id, {
      note,
      evidenceLinks: Array.isArray(evidenceLinks) ? evidenceLinks : [],
      evidenceFiles: savedFiles
    });
    return res.json({
      success: true,
      dispute,
      data: buildEnrichedProject(store.getNegotiation(req.params.id)!, user.id)
    });
  } catch (err: any) {
    return sendDomainError(res, err);
  }
});

// POST /api/v1/projects/:id/disputes/resolve - Admin/mediator resolves dispute (release / refund / split)
router.post('/:id/disputes/resolve', async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  try {
    // Allow explicit admin role, or test-mode demo mediator if configured
    if (user.role !== 'admin' && config.nodeEnv === 'production') {
      return res.status(403).json({ success: false, error: 'Only an administrator/mediator can resolve disputes in production.' });
    }
    const { outcome, sellerPercent, reason, payoutProviderOverride } = req.body || {};
    const out = await disputeService.resolveDispute(req.params.id, user.id, {
      outcome,
      sellerPercent,
      reason,
      payoutProviderOverride
    });
    return res.json({
      success: true,
      dispute: out.dispute,
      data: buildEnrichedProject(store.getNegotiation(req.params.id)!, user.id)
    });
  } catch (err: any) {
    return sendDomainError(res, err);
  }
});

// POST /api/v1/projects/worker/tick - Trigger review window poll (useful for deterministic testing)
router.post('/worker/tick', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const out = await reviewWindowWorker.tick();
    return res.json({ success: true, data: out });
  } catch (err: any) {
    return sendDomainError(res, err);
  }
});

export default router;
