import { v4 as uuidv4 } from 'uuid';
import { store } from '../../db/store.js';
import { config } from '../../config/index.js';
import { geminiService } from '../ai/gemini.js';
import { decisionEngine, PROHIBITED_CATEGORIES } from '../decision/engine.js';
import { payoutService } from '../paypal/payoutService.js';
import { projectStateMachine } from '../projects/projectStateMachine.js';
import { broadcastEvent } from '../../routes/events.js';
import {
  Negotiation,
  NegotiationMessage,
  Proposal,
  Agreement,
  CommerceRequest,
  Agent,
  MultiProposalComparison
} from '../../types/index.js';
import {
  SellerProfile,
  BuyerProfile,
  PackageOffer,
  PaymentTerm
} from './types.js';
import {
  FlexibilityTier,
  FLEXIBILITY_PCT,
  dollarsToCents,
  centsToDollars,
  formatCents,
  computeBuyerHardCapCents,
  computeSellerAbsoluteMinCents,
  computeFeeAndPayoutCents,
} from './money.js';
import {
  OfferSnapshot,
  DeterministicBuyerInput,
  DeterministicSellerInput,
  computeDeterministicSellerTurn,
  computeDeterministicBuyerTurn,
  validateOfferSanity,
  checkOverlap,
} from './algorithm.js';
import { calculateBuyerUtility, calculateSellerUtility } from './utility.js';

export function buildSellerProfile(seller: Agent, request?: CommerceRequest): SellerProfile {
  const listings = store.getListings({ sellerId: seller.ownerId, status: 'active' });
  const matchedListing = request
    ? listings.find(l => l.sellerAgentId === seller.id && l.category.toLowerCase() === request.category.toLowerCase()) ||
      listings.find(l => l.sellerAgentId === seller.id)
    : listings.find(l => l.sellerAgentId === seller.id);

  const catalogItem = seller.catalog[0];
  const listPrice = matchedListing?.price || seller.pricingConstraints?.startingPrice || catalogItem?.startingPrice || 180;
  const standardFloor = matchedListing?.minAcceptablePrice || seller.pricingConstraints?.minAcceptablePrice || catalogItem?.minPrice || 145;
  const flexibility: FlexibilityTier = matchedListing?.flexibility || 'flexible';
  const stretchPct = FLEXIBILITY_PCT[flexibility] ?? 0.10;
  const listPriceCents = matchedListing?.askingPriceCents ?? dollarsToCents(listPrice);
  const standardFloorCents = matchedListing?.floorPriceCents ?? dollarsToCents(standardFloor);
  const hardFloorCents = matchedListing?.absoluteMinCents ?? computeSellerAbsoluteMinCents(standardFloorCents, flexibility);
  const hardFloor = centsToDollars(hardFloorCents);
  const capacity = (seller as any).reputationScore ? Math.round((seller as any).reputationScore * 10) : 7;
  const standardDeliveryDays = matchedListing?.deliveryDays || catalogItem?.deliveryDays || 5;
  const minDeliveryDays = 2;

  return {
    id: `sp_${seller.id}`,
    userId: seller.ownerId,
    agentId: seller.id,
    businessName: seller.businessName,
    listPrice,
    standardFloor,
    flexibility,
    stretchPct,
    hardFloor,
    listPriceCents,
    standardFloorCents,
    hardFloorCents,
    capacity,
    minDeliveryDays,
    standardDeliveryDays,
    rushFeePctPerDay: 0.10,
    discounts: {
      longerDeadlinePctPerDay: 0.02,
      scopeReductionPctPerItem: 0.08,
      repeatBuyerPct: 0.05,
      upfrontPaymentPct: 0.06,
      bundlePct: 0.05
    },
    weights: { price: 0.50, time: 0.25, scope: 0.15, terms: 0.10 },
    strategy: 'value-trader'
  };
}

export function buildBuyerProfile(buyer: Agent, request: CommerceRequest): BuyerProfile {
  const budgetDollars = request.maxBudget || 150;
  const budgetCents = request.budgetCents ?? dollarsToCents(budgetDollars);
  const targetDollars = request.targetBudget ?? Math.round(budgetDollars * 0.8);
  const targetPriceCents = request.targetPriceCents ?? dollarsToCents(targetDollars);
  const flexibility: FlexibilityTier = request.flexibility || 'flexible';
  const stretchPct = FLEXIBILITY_PCT[flexibility] ?? 0.10;
  const hardCapCents = request.hardCapCents ?? computeBuyerHardCapCents(budgetCents, flexibility);
  const hardCap = centsToDollars(hardCapCents);

  const idealDeliveryDays = Math.max(2, (request.deadlineDays || 5) - 2);
  const latestDeliveryDays = request.deadlineDays || 5;

  const scopeItems = request.deliverables.map((d, i) => ({
    id: `scope_${i}`,
    name: d,
    priority: (i === 0 ? 'must-have' : 'nice-to-have') as 'must-have' | 'nice-to-have'
  }));

  return {
    id: `bp_${buyer.id}`,
    userId: request.userId,
    agentId: buyer.id,
    displayName: buyer.name,
    targetPrice: centsToDollars(targetPriceCents),
    maxBudget: budgetDollars,
    flexibility,
    stretchPct,
    hardCap,
    targetPriceCents,
    budgetCents,
    hardCapCents,
    idealDeliveryDays,
    latestDeliveryDays,
    scopeItems,
    acceptedPaymentTerms: ['escrow_milestone', 'upfront'],
    preferredPaymentTerm: 'escrow_milestone',
    weights: { price: 0.50, time: 0.25, scope: 0.15, terms: 0.10 },
    strategy: 'conceder'
  };
}

function toAlgorithmBuyer(bp: BuyerProfile): DeterministicBuyerInput {
  const mustHaves = bp.scopeItems.filter(s => s.priority === 'must-have').map(s => s.name);
  const niceToHaves = bp.scopeItems.filter(s => s.priority === 'nice-to-have').map(s => s.name);
  const budgetCents = bp.budgetCents ?? dollarsToCents(bp.maxBudget);
  return {
    targetCents: bp.targetPriceCents ?? dollarsToCents(bp.targetPrice),
    budgetCents,
    flexibility: bp.flexibility || 'flexible',
    hardCapCents: bp.hardCapCents ?? computeBuyerHardCapCents(budgetCents, bp.flexibility || 'flexible'),
    idealDeliveryDays: bp.idealDeliveryDays,
    latestDeliveryDays: bp.latestDeliveryDays,
    mustHaves,
    niceToHaves,
    strategy: bp.strategy,
  };
}

function toAlgorithmSeller(sp: SellerProfile): DeterministicSellerInput {
  const stdCents = sp.standardFloorCents ?? dollarsToCents(sp.standardFloor);
  return {
    listPriceCents: sp.listPriceCents ?? dollarsToCents(sp.listPrice),
    standardLowestCents: stdCents,
    flexibility: sp.flexibility || 'flexible',
    absoluteMinCents: sp.hardFloorCents ?? computeSellerAbsoluteMinCents(stdCents, sp.flexibility || 'flexible'),
    minDeliveryDays: sp.minDeliveryDays,
    standardDeliveryDays: sp.standardDeliveryDays,
    capacity: sp.capacity,
    strategy: sp.strategy,
  };
}

export class NegotiationOrchestrator {
  private buildOfferSnapshots(negotiation: Negotiation, proposals: Proposal[]): OfferSnapshot[] {
    return proposals.map(p => ({
      round: p.round,
      senderRole: p.senderAgentId === negotiation.sellerAgentId ? 'seller' : 'buyer',
      priceCents: p.priceCents ?? dollarsToCents(p.price),
      deliveryDays: p.deliveryDays,
      scope: p.deliverables,
      revisions: p.revisions ?? 2,
      paymentTerms: (p.paymentTerms as PaymentTerm) || 'escrow_milestone',
    }));
  }

  /**
   * Initializes a multi-issue negotiation between a buyer and a seller.
   */
  async initiateNegotiation(requestId: string, sellerAgentId: string): Promise<Negotiation> {
    const request = store.getRequest(requestId);
    if (!request) {
      throw new Error(`Commerce request "${requestId}" not found`);
    }

    const buyer = store.getAgent(request.buyerAgentId);
    if (!buyer) {
      throw new Error(`Buyer agent "${request.buyerAgentId}" not found`);
    }

    const seller = store.getAgent(sellerAgentId);
    if (!seller || seller.status !== 'active') {
      throw new Error(`Seller agent "${sellerAgentId}" is currently unavailable or inactive`);
    }

    // Strict Multi-User Isolation Invariant: Self-dealing is prohibited
    if (buyer.ownerId === seller.ownerId || request.userId === seller.ownerId) {
      throw new Error('Self-dealing prohibited: You cannot purchase or negotiate with your own listing or agent.');
    }

    const negotiationId = `neg_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();

    const sellerProfile = buildSellerProfile(seller, request);
    const buyerProfile = buildBuyerProfile(buyer, request);

    const negotiation: Negotiation = {
      id: negotiationId,
      requestId,
      buyerAgentId: buyer.id,
      sellerAgentId: seller.id,
      buyerUserId: request.userId,
      sellerUserId: seller.ownerId,
      status: 'initiated',
      projectStatus: 'negotiating',
      revisionsAllowed: 1,
      revisionsUsed: 0,
      currentRound: 1,
      maxRounds: 8,
      currentProposal: null,
      messages: [],
      agreementId: null,
      createdAt: now,
      updatedAt: now
    };

    // 1. Initial Request Discovery Message from Buyer Agent (NO private budget/target leaked)
    const buyerIntroMsg: NegotiationMessage = {
      id: `msg_${uuidv4().substring(0, 8)}`,
      negotiationId,
      senderAgentId: buyer.id,
      recipientAgentId: seller.id,
      senderRole: 'buyer',
      round: 1,
      messageType: 'request',
      content: `Hello ${seller.businessName}. On behalf of ${buyer.name}, we are requesting a commercial proposal for "${request.title}". Target turnaround: ${buyerProfile.idealDeliveryDays}–${buyerProfile.latestDeliveryDays} days covering: ${request.deliverables.join(', ')}.`,
      payload: {
        deadlineDays: request.deadlineDays,
        deliverables: request.deliverables
      },
      toolCalls: [
        {
          name: 'initiate_negotiation',
          args: { sellerAgentId: seller.id, requestId: request.id },
          result: { status: 'dispatched' },
          timestamp: now
        }
      ],
      timestamp: now
    };
    negotiation.messages.push(buyerIntroMsg);

    // 2. Prohibited category policy gate before seller engages
    const categoryLower = (request.category || '').toLowerCase();
    if (PROHIBITED_CATEGORIES.some(cat => categoryLower.includes(cat))) {
      negotiation.status = 'rejected';
      negotiation.projectStatus = 'declined';
      negotiation.rejectReason = `Category "${request.category}" violates network acceptable commerce policy.`;
      negotiation.messages.push({
        id: `msg_${uuidv4().substring(0, 8)}`,
        negotiationId,
        senderAgentId: buyer.id,
        recipientAgentId: seller.id,
        senderRole: 'system',
        round: 1,
        messageType: 'rejection',
        content: `Category "${request.category}" violates network acceptable commerce policy.`,
        timestamp: now
      });
      store.saveNegotiation(negotiation);
      store.addProjectEvent({
        dealId: negotiationId,
        actorUserId: request.userId,
        actorRole: 'system',
        fromStatus: 'request_sent',
        toStatus: 'declined',
        summary: 'Request blocked by commerce safety policy.',
        reason: negotiation.rejectReason,
        createdAt: now
      });
      return negotiation;
    }

    // 2b. Seller auto-reject rules check
    if (seller.ownerId) {
      const autoRule = projectStateMachine.evaluateSellerAutoRules(seller.ownerId, {
        category: request.category || '',
        maxBudget: request.maxBudget,
        deadlineDays: request.deadlineDays
      });
      if (autoRule.matched) {
        negotiation.status = 'rejected';
        negotiation.projectStatus = 'declined';
        negotiation.rejectReason = autoRule.reason;
        negotiation.sharedRejectNote = "This seller can't take it. I'm looking at other options.";
        negotiation.messages.push({
          id: `msg_${uuidv4().substring(0, 8)}`,
          negotiationId,
          senderAgentId: seller.id,
          recipientAgentId: buyer.id,
          senderRole: 'seller',
          round: 1,
          messageType: 'rejection',
          content: "This seller can't take it. I'm looking at other options.",
          timestamp: now
        });
        store.saveNegotiation(negotiation);
        store.addProjectEvent({
          dealId: negotiationId,
          actorUserId: seller.ownerId,
          actorRole: 'system',
          fromStatus: 'request_sent',
          toStatus: 'declined',
          summary: autoRule.reason || 'Declined by seller automation rules.',
          reason: autoRule.reason,
          createdAt: now
        });
        return negotiation;
      }
    }

    // 3. Deterministic Seller Opening Quote (95-100% of list price, zero buyer info revealed)
    const sellerCanary = `canary_seller_${uuidv4().substring(0, 8)}`;
    const sellerDecision = computeDeterministicSellerTurn({
      seller: toAlgorithmSeller(sellerProfile),
      round: 1,
      history: [],
      availableDeliverables: request.deliverables,
      requestedDeadlineDays: request.deadlineDays,
    });

    const sanity = validateOfferSanity({
      role: 'seller',
      proposedPriceInput: centsToDollars(sellerDecision.priceCents),
      priorOffersCents: [],
      sellerAbsoluteMinCents: sellerProfile.hardFloorCents,
    });
    if (!sanity.valid) {
      store.logAudit({
        entityType: 'deal',
        entityId: negotiationId,
        action: 'sanity_guard_rejected',
        policyMatched: 'offer_sanity_guard',
        decision: 'auto_declined',
        actor: 'ai_engine',
        confidence: 1,
        reasons: [sanity.reason || 'Sanity check failed'],
        metadata: {},
      });
    }

    const phrased = await geminiService.phraseDeterministicTurn({
      role: 'seller',
      partyName: seller.businessName,
      counterpartyName: buyer.name,
      requestTitle: request.title,
      round: 1,
      action: 'counter',
      priceCents: sellerDecision.priceCents,
      deliveryDays: sellerDecision.deliveryDays,
      scope: sellerDecision.scope,
      paymentTerms: sellerDecision.paymentTerms,
      whyMove: sellerDecision.whyMove,
      tradesMade: sellerDecision.tradesMade,
      counterpartyMessage: buyerIntroMsg.content,
      canaryToken: sellerCanary,
      privateNumbersToGuard: [sellerProfile.standardFloor, sellerProfile.hardFloor],
    });

    const openingPriceDollars = centsToDollars(sellerDecision.priceCents);
    const openingOfferObj: PackageOffer = {
      id: `prop_${uuidv4().substring(0, 8)}`,
      round: 1,
      senderRole: 'seller',
      senderAgentId: seller.id,
      price: openingPriceDollars,
      deliveryDays: sellerDecision.deliveryDays,
      scopeItems: sellerDecision.scope,
      revisions: sellerDecision.revisions,
      paymentTerms: sellerDecision.paymentTerms,
      validUntil: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      tradesMade: sellerDecision.tradesMade,
      rationale: sellerDecision.whyMove,
    };

    const openingProposal: Proposal = {
      id: openingOfferObj.id,
      negotiationId,
      senderAgentId: seller.id,
      round: 1,
      price: openingPriceDollars,
      priceCents: sellerDecision.priceCents,
      currency: 'USD',
      deliverables: sellerDecision.scope,
      deliveryDays: sellerDecision.deliveryDays,
      terms: sellerDecision.paymentTerms === 'upfront' ? 'Instant upfront settlement' : 'Verified milestone escrow via PayPal Sandbox',
      validUntil: openingOfferObj.validUntil,
      status: 'pending',
      revisions: sellerDecision.revisions,
      paymentTerms: sellerDecision.paymentTerms,
      tradesMade: sellerDecision.tradesMade,
      utilityScore: calculateSellerUtility(openingOfferObj, sellerProfile),
      whyThisOffer: sellerDecision.whyMove,
      whyMove: sellerDecision.whyMove,
      createdAt: now
    };

    negotiation.currentProposal = openingProposal;
    if (phrased.llmUnavailable) {
      negotiation.status = 'waiting_retry';
      store.saveNegotiation(negotiation);
      store.saveProposal(openingProposal);
      broadcastEvent('deal_updated', { negotiationId, status: 'waiting_retry' });
      return negotiation;
    }

    negotiation.status = 'in_negotiation';
    store.saveNegotiation(negotiation);
    store.saveProposal(openingProposal);

    const sellerProposalMsg: NegotiationMessage = {
      id: `msg_${uuidv4().substring(0, 8)}`,
      negotiationId,
      senderAgentId: seller.id,
      recipientAgentId: buyer.id,
      senderRole: 'seller',
      round: 1,
      messageType: 'proposal',
      content: phrased.messageToCounterparty,
      payload: {
        proposalId: openingProposal.id,
        price: openingProposal.price,
        priceCents: openingProposal.priceCents,
        deliveryDays: openingProposal.deliveryDays,
        deliverables: openingProposal.deliverables,
        revisions: openingProposal.revisions,
        paymentTerms: openingProposal.paymentTerms,
        tradesMade: openingProposal.tradesMade,
        utilityScore: openingProposal.utilityScore,
        whyThisOffer: openingProposal.whyThisOffer,
        whyMove: openingProposal.whyMove,
        isAiGenerated: phrased.isAiGenerated,
        canaryChecked: phrased.canaryChecked,
        canaryLeaked: phrased.canaryLeaked
      },
      timestamp: now
    };
    negotiation.messages.push(sellerProposalMsg);

    store.saveNegotiation(negotiation);
    broadcastEvent('deal_updated', { negotiationId, status: negotiation.status });

    store.logActivity({
      type: 'negotiation_started',
      title: `Negotiation Initiated: ${buyer.name} ↔ ${seller.businessName}`,
      description: `Opening proposal submitted at ${formatCents(sellerDecision.priceCents)} with ${openingProposal.deliveryDays}-day turnaround.`,
      agentId: seller.id,
      negotiationId,
      amount: openingProposal.price,
      currency: 'USD',
      severity: 'info'
    });

    return negotiation;
  }

  /**
   * Advances a negotiation by one turn using deterministic integer-cents algorithm + LLM phrasing.
   */
  async stepNegotiation(negotiationId: string): Promise<Negotiation> {
    const negotiation = store.getNegotiation(negotiationId);
    if (!negotiation) throw new Error(`Negotiation "${negotiationId}" not found`);

    if (
      negotiation.status === 'agreement_reached' ||
      negotiation.status === 'completed' ||
      negotiation.status === 'rejected' ||
      negotiation.status === 'escalated'
    ) {
      return negotiation;
    }

    const request = store.getRequest(negotiation.requestId);
    const buyer = store.getAgent(negotiation.buyerAgentId);
    const seller = store.getAgent(negotiation.sellerAgentId);

    if (!request || !buyer || !seller) {
      throw new Error('Incomplete negotiation participants or request data');
    }

    const sellerProfile = buildSellerProfile(seller, request);
    const buyerProfile = buildBuyerProfile(buyer, request);
    const algBuyer = toAlgorithmBuyer(buyerProfile);
    const algSeller = toAlgorithmSeller(sellerProfile);

    const proposals = store.getProposals(negotiationId);
    const history = this.buildOfferSnapshots(negotiation, proposals);
    const priorPricesCents = history.map(h => h.priceCents);

    const lastMsg = negotiation.messages[negotiation.messages.length - 1];
    const now = new Date().toISOString();

    // Early Exit Check (Rule 7): Only allowed before Round 5 if NO overlap exists even within stretch limits!
    const overlap = checkOverlap(
      algBuyer.hardCapCents,
      algSeller.absoluteMinCents,
      algBuyer.latestDeliveryDays,
      algSeller.minDeliveryDays
    );
    if (!overlap.hasOverlap && proposals.length >= 2) {
      negotiation.status = 'rejected';
      negotiation.projectStatus = 'declined';
      negotiation.updatedAt = now;
      negotiation.messages.push({
        id: `msg_${uuidv4().substring(0, 8)}`,
        negotiationId,
        senderAgentId: buyer.id,
        recipientAgentId: seller.id,
        senderRole: 'system',
        round: negotiation.currentRound,
        messageType: 'rejection',
        content: overlap.reason || 'No overlap exists within configured stretch limits.',
        payload: { reason: overlap.reason, earlyExit: true },
        timestamp: now
      });
      store.saveNegotiation(negotiation);
      broadcastEvent('deal_updated', { negotiationId, status: 'rejected' });
      return negotiation;
    }

    // Turn A: Last message was from Seller -> Buyer responds deterministically + LLM prose
    if (lastMsg.senderRole === 'seller') {
      const currentProp = negotiation.currentProposal;
      if (!currentProp) throw new Error('No active proposal to evaluate');

      const sellerSnapshot: OfferSnapshot = {
        round: currentProp.round,
        senderRole: 'seller',
        priceCents: currentProp.priceCents ?? dollarsToCents(currentProp.price),
        deliveryDays: currentProp.deliveryDays,
        scope: currentProp.deliverables,
        revisions: currentProp.revisions ?? 2,
        paymentTerms: (currentProp.paymentTerms as PaymentTerm) || 'escrow_milestone',
      };

      // If no overlap even within stretch limits, early exit cleanly right after seller opening
      if (!overlap.hasOverlap) {
        negotiation.status = 'rejected';
        negotiation.projectStatus = 'declined';
        negotiation.updatedAt = now;
        negotiation.messages.push({
          id: `msg_${uuidv4().substring(0, 8)}`,
          negotiationId,
          senderAgentId: buyer.id,
          recipientAgentId: seller.id,
          senderRole: 'buyer',
          round: negotiation.currentRound,
          messageType: 'rejection',
          content: overlap.reason!,
          payload: { reason: overlap.reason, earlyExit: true },
          timestamp: now
        });
        store.saveNegotiation(negotiation);
        broadcastEvent('deal_updated', { negotiationId, status: 'rejected' });
        return negotiation;
      }

      const buyerDecision = computeDeterministicBuyerTurn({
        buyer: algBuyer,
        round: negotiation.currentRound,
        history,
        sellerLastOffer: sellerSnapshot,
      });

      const sanity = validateOfferSanity({
        role: 'buyer',
        proposedPriceInput: centsToDollars(buyerDecision.priceCents),
        counterpartyCurrentPriceCents: sellerSnapshot.priceCents,
        priorOffersCents: priorPricesCents,
        buyerHardCapCents: algBuyer.hardCapCents,
      });
      if (!sanity.valid) {
        store.logAudit({
          entityType: 'deal',
          entityId: negotiationId,
          action: 'sanity_guard_rejected',
          policyMatched: 'offer_sanity_guard',
          decision: 'auto_declined',
          actor: 'ai_engine',
          confidence: 1,
          reasons: [sanity.reason || 'Buyer sanity failure'],
          metadata: {},
        });
        throw new Error(`Buyer offer violated sanity guard: ${sanity.reason}`);
      }

      const buyerCanary = `canary_buyer_${uuidv4().substring(0, 8)}`;
      const phrased = await geminiService.phraseDeterministicTurn({
        role: 'buyer',
        partyName: buyer.name,
        counterpartyName: seller.businessName,
        requestTitle: request.title,
        round: negotiation.currentRound,
        action: buyerDecision.action,
        priceCents: buyerDecision.priceCents,
        deliveryDays: buyerDecision.deliveryDays,
        scope: buyerDecision.scope,
        paymentTerms: buyerDecision.paymentTerms,
        whyMove: buyerDecision.whyMove,
        tradesMade: buyerDecision.tradesMade,
        counterpartyMessage: lastMsg.content,
        canaryToken: buyerCanary,
        privateNumbersToGuard: [
          buyerProfile.targetPrice,
          buyerProfile.maxBudget,
          buyerProfile.hardCap || buyerProfile.maxBudget,
        ],
        noOverlapReason: buyerDecision.noOverlapReason,
      });

      if (phrased.llmUnavailable) {
        negotiation.status = 'waiting_retry';
        negotiation.updatedAt = now;
        store.saveNegotiation(negotiation);
        broadcastEvent('deal_updated', { negotiationId, status: 'waiting_retry' });
        return negotiation;
      }

      if (buyerDecision.action === 'accept') {
        currentProp.status = 'accepted';
        store.saveProposal(currentProp);

        const buyerAcceptMsg: NegotiationMessage = {
          id: `msg_${uuidv4().substring(0, 8)}`,
          negotiationId,
          senderAgentId: buyer.id,
          recipientAgentId: seller.id,
          senderRole: 'buyer',
          round: negotiation.currentRound,
          messageType: 'acceptance',
          content: phrased.messageToCounterparty,
          payload: {
            agreedPrice: currentProp.price,
            priceCents: currentProp.priceCents,
            deliverables: currentProp.deliverables,
            deliveryDays: currentProp.deliveryDays,
            paymentTerms: currentProp.paymentTerms,
            shortReasonForHuman: buyerDecision.shortReasonForHuman,
            whyMove: buyerDecision.whyMove,
            tradesMade: buyerDecision.tradesMade,
            isAiGenerated: phrased.isAiGenerated,
            canaryChecked: phrased.canaryChecked,
            canaryLeaked: phrased.canaryLeaked,
          },
          timestamp: now
        };
        negotiation.messages.push(buyerAcceptMsg);

        const agreement = this.createAgreement(
          negotiation,
          request,
          buyer,
          seller,
          currentProp,
          buyerDecision.tradesMade,
          sellerProfile.hardFloor,
          buyerDecision.stretchSide
        );
        negotiation.agreementId = agreement.id;
        negotiation.status = 'agreement_reached';
        negotiation.projectStatus = 'agreed';
        negotiation.revisionsAllowed = agreement.revisions ?? 1;
        negotiation.updatedAt = now;

        store.saveNegotiation(negotiation);
        store.addProjectEvent({
          dealId: negotiation.id,
          actorUserId: negotiation.buyerUserId || buyer.ownerId,
          actorRole: 'system',
          fromStatus: 'negotiating',
          toStatus: 'agreed',
          summary: `Agreed at $${agreement.finalPrice} for ${agreement.deliveryDays} days. Waiting for payment.`,
          createdAt: now
        });
        broadcastEvent('deal_updated', { negotiationId, status: negotiation.status, agreementId: agreement.id });
        return negotiation;
      }

      if (buyerDecision.action === 'decline') {
        negotiation.status = 'rejected';
        negotiation.projectStatus = 'declined';
        negotiation.updatedAt = now;

        negotiation.messages.push({
          id: `msg_${uuidv4().substring(0, 8)}`,
          negotiationId,
          senderAgentId: buyer.id,
          recipientAgentId: seller.id,
          senderRole: 'buyer',
          round: negotiation.currentRound,
          messageType: 'rejection',
          content: buyerDecision.noOverlapReason || phrased.messageToCounterparty,
          payload: {
            reason: buyerDecision.shortReasonForHuman,
            isAiGenerated: phrased.isAiGenerated,
            canaryChecked: phrased.canaryChecked,
            canaryLeaked: phrased.canaryLeaked,
          },
          timestamp: now
        });
        store.saveNegotiation(negotiation);
        broadcastEvent('deal_updated', { negotiationId, status: 'rejected' });
        return negotiation;
      }

      if (buyerDecision.action === 'escalate') {
        negotiation.status = 'escalated';
        negotiation.updatedAt = now;

        negotiation.messages.push({
          id: `msg_${uuidv4().substring(0, 8)}`,
          negotiationId,
          senderAgentId: buyer.id,
          recipientAgentId: seller.id,
          senderRole: 'buyer',
          round: negotiation.currentRound,
          messageType: 'human_escalation',
          requiresHumanResponse: true,
          content: phrased.messageToCounterparty,
          payload: {
            reason: buyerDecision.shortReasonForHuman,
            whyMove: buyerDecision.whyMove,
            proposedPrice: centsToDollars(buyerDecision.priceCents),
            priceCents: buyerDecision.priceCents,
            deliveryDays: buyerDecision.deliveryDays,
            inStretchZone: true,
            stretchSide: buyerDecision.stretchSide,
            isAiGenerated: phrased.isAiGenerated,
            canaryChecked: phrased.canaryChecked,
            canaryLeaked: phrased.canaryLeaked,
          },
          timestamp: now
        });

        this.recordHumanEscalation(
          negotiation,
          request,
          buyer,
          seller,
          currentProp,
          sellerProfile.hardFloor,
          buyerDecision.shortReasonForHuman,
          'buyer'
        );
        store.saveNegotiation(negotiation);
        broadcastEvent('deal_updated', { negotiationId, status: 'escalated' });
        return negotiation;
      }

      // Buyer counteroffer
      currentProp.status = 'countered';
      store.saveProposal(currentProp);

      const counterDollars = centsToDollars(buyerDecision.priceCents);
      const offerObj: PackageOffer = {
        id: `prop_${uuidv4().substring(0, 8)}`,
        round: negotiation.currentRound,
        senderRole: 'buyer',
        senderAgentId: buyer.id,
        price: counterDollars,
        deliveryDays: buyerDecision.deliveryDays,
        scopeItems: buyerDecision.scope,
        revisions: buyerDecision.revisions,
        paymentTerms: buyerDecision.paymentTerms,
        validUntil: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        tradesMade: buyerDecision.tradesMade,
        rationale: buyerDecision.whyMove,
      };

      const counterProp: Proposal = {
        id: offerObj.id,
        negotiationId,
        senderAgentId: buyer.id,
        round: negotiation.currentRound,
        price: counterDollars,
        priceCents: buyerDecision.priceCents,
        currency: 'USD',
        deliverables: buyerDecision.scope,
        deliveryDays: buyerDecision.deliveryDays,
        terms: buyerDecision.paymentTerms,
        validUntil: offerObj.validUntil,
        status: 'pending',
        revisions: buyerDecision.revisions,
        paymentTerms: buyerDecision.paymentTerms,
        tradesMade: buyerDecision.tradesMade,
        utilityScore: calculateBuyerUtility(offerObj, buyerProfile),
        whyThisOffer: buyerDecision.shortReasonForHuman,
        whyMove: buyerDecision.whyMove,
        createdAt: now
      };
      store.saveProposal(counterProp);
      negotiation.currentProposal = counterProp;

      negotiation.messages.push({
        id: `msg_${uuidv4().substring(0, 8)}`,
        negotiationId,
        senderAgentId: buyer.id,
        recipientAgentId: seller.id,
        senderRole: 'buyer',
        round: negotiation.currentRound,
        messageType: 'counteroffer',
        content: phrased.messageToCounterparty,
        payload: {
          counterPrice: counterDollars,
          priceCents: buyerDecision.priceCents,
          deliveryDays: buyerDecision.deliveryDays,
          deliverables: buyerDecision.scope,
          paymentTerms: buyerDecision.paymentTerms,
          tradesMade: buyerDecision.tradesMade,
          whyThisOffer: buyerDecision.shortReasonForHuman,
          whyMove: buyerDecision.whyMove,
          isAiGenerated: phrased.isAiGenerated,
          canaryChecked: phrased.canaryChecked,
          canaryLeaked: phrased.canaryLeaked,
        },
        timestamp: now
      });
      negotiation.updatedAt = now;
      store.saveNegotiation(negotiation);
      broadcastEvent('deal_updated', { negotiationId, status: negotiation.status });
      return negotiation;
    }

    // Turn B: Last message was from Buyer -> Seller responds deterministically + LLM prose
    if (lastMsg.senderRole === 'buyer' && (lastMsg.messageType === 'counteroffer' || lastMsg.messageType === 'request' || lastMsg.messageType === 'clarification')) {
      negotiation.currentRound += 1;
      const currentProp = negotiation.currentProposal;
      if (!currentProp) throw new Error('No active proposal to evaluate');

      const buyerSnapshot: OfferSnapshot = {
        round: currentProp.round,
        senderRole: 'buyer',
        priceCents: currentProp.priceCents ?? dollarsToCents(currentProp.price),
        deliveryDays: currentProp.deliveryDays,
        scope: currentProp.deliverables,
        revisions: currentProp.revisions ?? 2,
        paymentTerms: (currentProp.paymentTerms as PaymentTerm) || 'escrow_milestone',
      };

      const sellerDecision = computeDeterministicSellerTurn({
        seller: algSeller,
        round: negotiation.currentRound,
        history,
        buyerLastOffer: buyerSnapshot,
        availableDeliverables: request.deliverables,
        requestedDeadlineDays: request.deadlineDays,
      });

      const sanity = validateOfferSanity({
        role: 'seller',
        proposedPriceInput: centsToDollars(sellerDecision.priceCents),
        counterpartyCurrentPriceCents: buyerSnapshot.priceCents,
        priorOffersCents: priorPricesCents,
        sellerAbsoluteMinCents: algSeller.absoluteMinCents,
      });
      if (!sanity.valid) {
        store.logAudit({
          entityType: 'deal',
          entityId: negotiationId,
          action: 'sanity_guard_rejected',
          policyMatched: 'offer_sanity_guard',
          decision: 'auto_declined',
          actor: 'ai_engine',
          confidence: 1,
          reasons: [sanity.reason || 'Seller sanity failure'],
          metadata: {},
        });
        throw new Error(`Seller offer violated sanity guard: ${sanity.reason}`);
      }

      const sellerCanary = `canary_seller_${uuidv4().substring(0, 8)}`;
      const phrased = await geminiService.phraseDeterministicTurn({
        role: 'seller',
        partyName: seller.businessName,
        counterpartyName: buyer.name,
        requestTitle: request.title,
        round: negotiation.currentRound,
        action: sellerDecision.action,
        priceCents: sellerDecision.priceCents,
        deliveryDays: sellerDecision.deliveryDays,
        scope: sellerDecision.scope,
        paymentTerms: sellerDecision.paymentTerms,
        whyMove: sellerDecision.whyMove,
        tradesMade: sellerDecision.tradesMade,
        counterpartyMessage: lastMsg.content,
        canaryToken: sellerCanary,
        privateNumbersToGuard: [sellerProfile.standardFloor, sellerProfile.hardFloor],
        noOverlapReason: sellerDecision.noOverlapReason,
      });

      if (phrased.llmUnavailable) {
        negotiation.status = 'waiting_retry';
        negotiation.updatedAt = now;
        store.saveNegotiation(negotiation);
        broadcastEvent('deal_updated', { negotiationId, status: 'waiting_retry' });
        return negotiation;
      }

      if (sellerDecision.action === 'accept') {
        const agreedDollars = centsToDollars(sellerDecision.priceCents);
        const agreedProposal: Proposal = {
          id: `prop_${uuidv4().substring(0, 8)}`,
          negotiationId,
          senderAgentId: seller.id,
          round: negotiation.currentRound,
          price: agreedDollars,
          priceCents: sellerDecision.priceCents,
          currency: 'USD',
          deliverables: sellerDecision.scope,
          deliveryDays: sellerDecision.deliveryDays,
          terms: sellerDecision.paymentTerms === 'upfront' ? 'Instant upfront settlement' : 'Standard Verified Escrow via PayPal Sandbox',
          validUntil: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
          status: 'accepted',
          revisions: sellerDecision.revisions,
          paymentTerms: sellerDecision.paymentTerms,
          tradesMade: sellerDecision.tradesMade,
          whyThisOffer: sellerDecision.shortReasonForHuman,
          whyMove: sellerDecision.whyMove,
          createdAt: now
        };
        store.saveProposal(agreedProposal);
        negotiation.currentProposal = agreedProposal;

        negotiation.messages.push({
          id: `msg_${uuidv4().substring(0, 8)}`,
          negotiationId,
          senderAgentId: seller.id,
          recipientAgentId: buyer.id,
          senderRole: 'seller',
          round: negotiation.currentRound,
          messageType: 'acceptance',
          content: phrased.messageToCounterparty,
          payload: {
            agreedPrice: agreedDollars,
            priceCents: sellerDecision.priceCents,
            deliveryDays: sellerDecision.deliveryDays,
            deliverables: sellerDecision.scope,
            paymentTerms: sellerDecision.paymentTerms,
            shortReasonForHuman: sellerDecision.shortReasonForHuman,
            whyMove: sellerDecision.whyMove,
            tradesMade: sellerDecision.tradesMade,
            isAiGenerated: phrased.isAiGenerated,
            canaryChecked: phrased.canaryChecked,
            canaryLeaked: phrased.canaryLeaked,
          },
          timestamp: now
        });

        const agreement = this.createAgreement(
          negotiation,
          request,
          buyer,
          seller,
          agreedProposal,
          sellerDecision.tradesMade,
          sellerProfile.hardFloor,
          sellerDecision.stretchSide
        );
        negotiation.agreementId = agreement.id;
        negotiation.status = 'agreement_reached';
        negotiation.projectStatus = 'agreed';
        negotiation.revisionsAllowed = agreement.revisions ?? 1;
        negotiation.updatedAt = now;

        store.saveNegotiation(negotiation);
        store.addProjectEvent({
          dealId: negotiation.id,
          actorUserId: negotiation.sellerUserId || seller.ownerId,
          actorRole: 'system',
          fromStatus: 'negotiating',
          toStatus: 'agreed',
          summary: `Agreed at $${agreement.finalPrice} for ${agreement.deliveryDays} days. Waiting for payment.`,
          createdAt: now
        });
        broadcastEvent('deal_updated', { negotiationId, status: negotiation.status, agreementId: agreement.id });
        return negotiation;
      }

      if (sellerDecision.action === 'decline') {
        negotiation.status = 'rejected';
        negotiation.projectStatus = 'declined';
        negotiation.updatedAt = now;

        negotiation.messages.push({
          id: `msg_${uuidv4().substring(0, 8)}`,
          negotiationId,
          senderAgentId: seller.id,
          recipientAgentId: buyer.id,
          senderRole: 'seller',
          round: negotiation.currentRound,
          messageType: 'rejection',
          content: sellerDecision.noOverlapReason || phrased.messageToCounterparty,
          payload: {
            reason: sellerDecision.shortReasonForHuman,
            isAiGenerated: phrased.isAiGenerated,
            canaryChecked: phrased.canaryChecked,
            canaryLeaked: phrased.canaryLeaked,
          },
          timestamp: now
        });
        store.saveNegotiation(negotiation);
        broadcastEvent('deal_updated', { negotiationId, status: 'rejected' });
        return negotiation;
      }

      if (sellerDecision.action === 'escalate') {
        negotiation.status = 'escalated';
        negotiation.updatedAt = now;

        negotiation.messages.push({
          id: `msg_${uuidv4().substring(0, 8)}`,
          negotiationId,
          senderAgentId: seller.id,
          recipientAgentId: buyer.id,
          senderRole: 'seller',
          round: negotiation.currentRound,
          messageType: 'human_escalation',
          requiresHumanResponse: true,
          content: phrased.messageToCounterparty,
          payload: {
            reason: sellerDecision.shortReasonForHuman,
            whyMove: sellerDecision.whyMove,
            proposedPrice: centsToDollars(sellerDecision.priceCents),
            priceCents: sellerDecision.priceCents,
            deliveryDays: sellerDecision.deliveryDays,
            inStretchZone: true,
            stretchSide: sellerDecision.stretchSide || 'seller',
            isAiGenerated: phrased.isAiGenerated,
            canaryChecked: phrased.canaryChecked,
            canaryLeaked: phrased.canaryLeaked,
          },
          timestamp: now
        });

        this.recordHumanEscalation(
          negotiation,
          request,
          buyer,
          seller,
          currentProp,
          sellerProfile.hardFloor,
          sellerDecision.shortReasonForHuman,
          'seller'
        );
        store.saveNegotiation(negotiation);
        broadcastEvent('deal_updated', { negotiationId, status: 'escalated' });
        return negotiation;
      }

      // Seller counteroffer
      currentProp.status = 'countered';
      store.saveProposal(currentProp);

      const counterDollars = centsToDollars(sellerDecision.priceCents);
      const offerObj: PackageOffer = {
        id: `prop_${uuidv4().substring(0, 8)}`,
        round: negotiation.currentRound,
        senderRole: 'seller',
        senderAgentId: seller.id,
        price: counterDollars,
        deliveryDays: sellerDecision.deliveryDays,
        scopeItems: sellerDecision.scope,
        revisions: sellerDecision.revisions,
        paymentTerms: sellerDecision.paymentTerms,
        validUntil: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        tradesMade: sellerDecision.tradesMade,
        rationale: sellerDecision.whyMove,
      };

      const counterProp: Proposal = {
        id: offerObj.id,
        negotiationId,
        senderAgentId: seller.id,
        round: negotiation.currentRound,
        price: counterDollars,
        priceCents: sellerDecision.priceCents,
        currency: 'USD',
        deliverables: sellerDecision.scope,
        deliveryDays: sellerDecision.deliveryDays,
        terms: sellerDecision.paymentTerms === 'upfront' ? 'Instant upfront settlement' : 'Standard Verified Escrow via PayPal Sandbox',
        validUntil: offerObj.validUntil,
        status: 'pending',
        revisions: sellerDecision.revisions,
        paymentTerms: sellerDecision.paymentTerms,
        tradesMade: sellerDecision.tradesMade,
        utilityScore: calculateSellerUtility(offerObj, sellerProfile),
        whyThisOffer: sellerDecision.shortReasonForHuman,
        whyMove: sellerDecision.whyMove,
        createdAt: now
      };
      store.saveProposal(counterProp);
      negotiation.currentProposal = counterProp;

      negotiation.messages.push({
        id: `msg_${uuidv4().substring(0, 8)}`,
        negotiationId,
        senderAgentId: seller.id,
        recipientAgentId: buyer.id,
        senderRole: 'seller',
        round: negotiation.currentRound,
        messageType: 'counteroffer',
        content: phrased.messageToCounterparty,
        payload: {
          counterPrice: counterDollars,
          priceCents: sellerDecision.priceCents,
          deliveryDays: sellerDecision.deliveryDays,
          deliverables: sellerDecision.scope,
          paymentTerms: sellerDecision.paymentTerms,
          tradesMade: sellerDecision.tradesMade,
          whyThisOffer: sellerDecision.shortReasonForHuman,
          whyMove: sellerDecision.whyMove,
          isAiGenerated: phrased.isAiGenerated,
          canaryChecked: phrased.canaryChecked,
          canaryLeaked: phrased.canaryLeaked,
        },
        timestamp: now
      });
      negotiation.updatedAt = now;

      // Max rounds (8) guardrail: escalate if inside stretch zone, else decline
      if (negotiation.currentRound >= negotiation.maxRounds) {
        if (sellerDecision.priceCents <= algBuyer.hardCapCents) {
          negotiation.status = 'escalated';
          this.recordHumanEscalation(
            negotiation,
            request,
            buyer,
            seller,
            counterProp,
            sellerProfile.hardFloor,
            `Reached round ${negotiation.currentRound} with seller at ${formatCents(sellerDecision.priceCents)} (inside your ${formatCents(algBuyer.hardCapCents)} stretch cap). Needs your OK.`,
            'buyer'
          );
        } else {
          negotiation.status = 'rejected';
          negotiation.projectStatus = 'declined';
        }
      }

      store.saveNegotiation(negotiation);
      broadcastEvent('deal_updated', { negotiationId, status: negotiation.status });
      return negotiation;
    }

    return negotiation;
  }

  private recordHumanEscalation(
    negotiation: Negotiation,
    request: CommerceRequest,
    buyer: Agent,
    seller: Agent,
    proposal: Proposal,
    sellerFloorPrice: number,
    customReason?: string,
    stretchSide: 'buyer' | 'seller' = 'buyer'
  ): void {
    const buyerUser = store.getUser(request.userId) || store.getUsers()[0];
    const evalResult = decisionEngine.evaluateProposal({
      proposal,
      request,
      buyerAgent: buyer,
      sellerAgent: seller,
      buyerUser,
      sellerFloorPrice,
      untrustedMessages: negotiation.messages.map(m => m.content)
    });

    const isVerifiedSeller = seller.verificationStatus === 'verified';
    const baseReasons: string[] = [];
    if (isVerifiedSeller) {
      baseReasons.push(`${seller.businessName} is verified and offers ${proposal.revisions || 2} revisions.`);
    }
    if (customReason) baseReasons.push(customReason);
    else if (evalResult.decision.reasons.length > 0) baseReasons.push(...evalResult.decision.reasons);

    const now = new Date().toISOString();
    const reasons = baseReasons.length > 0 ? baseReasons : ['Negotiation reached your stretch zone and wants your decision.'];
    store.saveDecision({
      ...evalResult.decision,
      status: 'needs_review',
      reasons,
      recommendation: stretchSide === 'buyer'
        ? `Approve ${formatCents(proposal.priceCents ?? dollarsToCents(proposal.price))} or counter toward ${formatCents(dollarsToCents(request.maxBudget))}.`
        : `Approve ${formatCents(proposal.priceCents ?? dollarsToCents(proposal.price))} with adjusted terms or counter higher.`,
      updatedAt: now
    });
    store.saveReviewQueueItem({
      id: `rq_${negotiation.id}`,
      negotiationId: negotiation.id,
      requestId: request.id,
      sellerId: seller.ownerId || seller.id,
      buyerId: buyerUser.id,
      urgency: 'medium',
      urgencyScore: 0.7,
      aiRecommendation: (proposal.priceCents ?? dollarsToCents(proposal.price)) <= (request.hardCapCents ?? dollarsToCents(request.maxBudget) * 1.1) ? 'approve' : 'adjust_price',
      confidence: evalResult.decision.confidence,
      reasons,
      proposedPrice: proposal.price,
      buyerMaxBudget: request.maxBudget,
      sellerFloorPrice,
      status: 'pending',
      createdAt: now
    });
    store.saveNotification({
      id: `notif_${uuidv4().substring(0, 8)}`,
      userId: buyerUser.id,
      title: 'Action Needed: Deal Needs Your OK',
      message: reasons.join(' '),
      type: 'action_required',
      linkUrl: `/app/deals/${negotiation.id}`,
      read: false,
      createdAt: now
    });
  }

  /**
   * Runs negotiations to completion across multiple candidate sellers, then runs Evaluator Agent.
   */
  async runMultiAgentNegotiation(requestId: string, sellerIds: string[]): Promise<{
    negotiations: Negotiation[];
    evaluation: MultiProposalComparison;
  }> {
    const request = store.getRequest(requestId);
    if (!request) throw new Error(`Commerce request "${requestId}" not found`);

    const validSellerIds = sellerIds.filter(sId => {
      const s = store.getAgent(sId);
      return s && s.ownerId !== request.userId;
    });

    if (validSellerIds.length === 0) {
      throw new Error('Self-dealing prohibited: Candidate seller agents belong to your account.');
    }

    const negotiations: Negotiation[] = [];

    for (const sellerId of validSellerIds) {
      let neg = await this.initiateNegotiation(requestId, sellerId);
      
      let turns = 0;
      while (neg.status === 'in_negotiation' && turns < 18) {
        neg = await this.stepNegotiation(neg.id);
        turns++;
      }
      negotiations.push(neg);
    }

    const currentReq = store.getRequest(requestId);
    if (!currentReq) throw new Error('Request not found');

    const proposalsForEval: Array<{ negotiationId: string; seller: Agent; proposal: Proposal }> = [];
    for (const neg of negotiations) {
      const seller = store.getAgent(neg.sellerAgentId);
      if (seller && neg.currentProposal) {
        proposalsForEval.push({
          negotiationId: neg.id,
          seller,
          proposal: neg.currentProposal
        });
      }
    }

    const evalResult = await geminiService.evaluateMultipleProposals(request, proposalsForEval);
    const comparison: MultiProposalComparison = {
      requestId,
      evaluations: evalResult.evaluations,
      recommendedNegotiationId: evalResult.recommendedNegotiationId,
      summaryVerdict: evalResult.summaryVerdict,
      evaluatedAt: new Date().toISOString()
    };
    store.saveEvaluation(comparison);

    request.status = 'agreement_reached';
    request.selectedSellerAgentIds = sellerIds;
    store.saveRequest(request);

    store.logActivity({
      type: 'agreement_reached',
      title: 'Autonomous Multi-Agent Evaluation Complete',
      description: `Evaluator Agent recommended negotiation ${comparison.recommendedNegotiationId}. ${comparison.summaryVerdict}`,
      severity: 'success'
    });

    return {
      negotiations,
      evaluation: comparison
    };
  }

  private createAgreement(
    negotiation: Negotiation,
    request: CommerceRequest,
    buyer: Agent,
    seller: Agent,
    proposal: Proposal,
    tradesSummary?: string[],
    sellerHardFloor?: number,
    stretchSide?: 'buyer' | 'seller' | null
  ): Agreement {
    const agreementId = `agr_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();

    const buyerUser = store.getUser(request.userId) || store.getUsers()[0];
    const finalCents = proposal.priceCents ?? dollarsToCents(proposal.price);
    const buyerBudgetCents = request.budgetCents ?? dollarsToCents(request.maxBudget);
    const savingsVsBudgetCents = Math.max(0, buyerBudgetCents - finalCents);
    const inBuyerStretch = finalCents > buyerBudgetCents;
    const effectiveStretchSide = stretchSide || (inBuyerStretch ? 'buyer' : null);
    const { feeCents, payoutCents } = computeFeeAndPayoutCents(finalCents, config.platformFeePercent);

    let decision = store.getDecisionByEntity('deal', negotiation.id);
    if (!decision) {
      const evalRes = decisionEngine.evaluateProposal({
        proposal,
        request,
        buyerAgent: buyer,
        sellerAgent: seller,
        buyerUser,
        sellerFloorPrice: sellerHardFloor ?? Math.min(proposal.price, request.maxBudget),
        untrustedMessages: negotiation.messages.map(m => m.content)
      });
      decision = evalRes.decision;
    }
    const sellerOwnerUser = seller.ownerId ? store.getUser(seller.ownerId) : undefined;
    const sellerPayoutReady = !sellerOwnerUser || payoutService.isSellerPayoutReady(seller.ownerId);
    const isAutoApproved = decision.status === 'auto_approved' && !effectiveStretchSide && sellerPayoutReady;

    if (!sellerPayoutReady && seller.ownerId) {
      store.addNotification({
        userId: seller.ownerId,
        title: 'Add where to send your earnings',
        message: `You reached agreement on "${request.title}", but it cannot be confirmed until you add your PayPal email in Selling > Payments.`,
        type: 'payout_required',
        linkUrl: `/app/deals/${negotiation.id}`
      });
    }

    const agreement: Agreement = {
      id: agreementId,
      negotiationId: negotiation.id,
      requestId: request.id,
      buyerAgentId: buyer.id,
      sellerAgentId: seller.id,
      buyerUserId: request.userId,
      sellerUserId: seller.ownerId,
      sellerBusinessName: seller.businessName,
      finalPrice: proposal.price,
      finalPriceCents: finalCents,
      savingsVsBudgetCents,
      stretchZoneSide: effectiveStretchSide,
      platformFeeCents: feeCents,
      sellerPayoutCents: payoutCents,
      currency: proposal.currency || 'USD',
      finalDeliverables: proposal.deliverables,
      deliveryDays: proposal.deliveryDays,
      commercialTerms: 'All intellectual property rights assign to buyer upon PayPal capture confirmation. Turnaround strictly guaranteed.',
      tradesSummary: tradesSummary || proposal.tradesMade || [],
      paymentTerms: proposal.paymentTerms || 'escrow_milestone',
      revisions: proposal.revisions || 2,
      humanApprovalStatus: isAutoApproved ? 'approved' : 'pending',
      humanApprovedAt: isAutoApproved ? now : undefined,
      paypalReady: isAutoApproved,
      createdAt: now
    };

    store.saveAgreement(agreement);

    if (isAutoApproved) {
      store.logActivity({
        type: 'approval_granted',
        title: `Deal Auto-Approved by Policy: ${formatCents(finalCents)}`,
        description: `Verified seller ${seller.businessName} within budget (${formatCents(buyerBudgetCents)}). Cleared for PayPal Checkout.`,
        negotiationId: negotiation.id,
        amount: agreement.finalPrice,
        currency: agreement.currency,
        severity: 'success'
      });
    } else {
      store.logActivity({
        type: 'approval_requested',
        title: `Deal Escalated to Review Queue: ${formatCents(finalCents)}`,
        description: `${buyer.name} and ${seller.businessName} reached terms needing human review.`,
        negotiationId: negotiation.id,
        amount: agreement.finalPrice,
        currency: agreement.currency,
        severity: 'warning'
      });
    }

    broadcastEvent('deal_updated', { negotiationId: negotiation.id, agreementId: agreement.id, status: agreement.humanApprovalStatus });
    return agreement;
  }

  /**
   * Explicit human authorization of an agreement.
   * Required before any PayPal order creation or capture.
   */
  authorizeAgreement(agreementId: string, userId: string): Agreement {
    const agreement = store.getAgreement(agreementId);
    if (!agreement) throw new Error(`Agreement "${agreementId}" not found`);

    if (agreement.humanApprovalStatus === 'approved') {
      return agreement;
    }

    const now = new Date().toISOString();
    agreement.humanApprovalStatus = 'approved';
    agreement.humanApprovedAt = now;
    agreement.paypalReady = true;

    store.saveAgreement(agreement);

    store.logActivity({
      type: 'approval_granted',
      title: `Human Authorization Granted for Agreement ${agreement.id}`,
      description: `Buyer confirmed final terms (${formatCents(agreement.finalPriceCents ?? dollarsToCents(agreement.finalPrice))}). Cleared for PayPal processing.`,
      negotiationId: agreement.negotiationId,
      amount: agreement.finalPrice,
      currency: agreement.currency,
      severity: 'success'
    });

    return agreement;
  }
}

export const negotiationOrchestrator = new NegotiationOrchestrator();
