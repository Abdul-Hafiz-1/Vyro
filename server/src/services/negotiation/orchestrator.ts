import { v4 as uuidv4 } from 'uuid';
import { store } from '../../db/store.js';
import { geminiService } from '../ai/gemini.js';
import { decisionEngine } from '../decision/engine.js';
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
import { negotiationEngine } from './engine.js';
import { calculateBuyerUtility, calculateSellerUtility, analyzeTrade } from './utility.js';

export function buildSellerProfile(seller: Agent, request: CommerceRequest): SellerProfile {
  const catalogItem = seller.catalog[0];
  const listPrice = seller.pricingConstraints?.startingPrice || catalogItem?.startingPrice || 180;
  const standardFloor = seller.pricingConstraints?.minAcceptablePrice || catalogItem?.minPrice || 145;
  const stretchPct = 0.12;
  const hardFloor = Math.round(standardFloor * (1 - stretchPct));
  const capacity = seller.reputationScore ? Math.round(seller.reputationScore * 10) : 7;
  const standardDeliveryDays = catalogItem?.deliveryDays || 5;
  const minDeliveryDays = 2;

  return {
    id: `sp_${seller.id}`,
    userId: seller.ownerId,
    agentId: seller.id,
    businessName: seller.businessName,
    listPrice,
    standardFloor,
    stretchPct,
    hardFloor,
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
  const maxBudget = request.maxBudget || 150;
  const targetPrice = Math.round(maxBudget * 0.75);
  const idealDeliveryDays = Math.max(2, request.deadlineDays - 2);
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
    targetPrice,
    maxBudget,
    idealDeliveryDays,
    latestDeliveryDays,
    scopeItems,
    acceptedPaymentTerms: ['escrow_milestone', 'upfront'],
    preferredPaymentTerm: 'escrow_milestone',
    weights: { price: 0.50, time: 0.25, scope: 0.15, terms: 0.10 },
    strategy: 'conceder'
  };
}

export class NegotiationOrchestrator {
  /**
   * Initializes a multi-issue negotiation between a buyer and a seller for a specific commerce request.
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
      currentRound: 1,
      maxRounds: 4,
      currentProposal: null,
      messages: [],
      agreementId: null,
      createdAt: now,
      updatedAt: now
    };

    // 1. Initial Request Discovery Message from Buyer Agent to Seller Agent
    const buyerIntroMsg: NegotiationMessage = {
      id: `msg_${uuidv4().substring(0, 8)}`,
      negotiationId,
      senderAgentId: buyer.id,
      recipientAgentId: seller.id,
      senderRole: 'buyer',
      round: 1,
      messageType: 'request',
      content: `Hello ${seller.businessName}. On behalf of our team, we are requesting a commercial proposal for "${request.title}". Target turnaround: ${buyerProfile.idealDeliveryDays}-${buyerProfile.latestDeliveryDays} days. Deliverables: ${request.deliverables.join(', ')}.`,
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

    // 2. Seller Agent calculates Opening Multi-Issue Package Offer
    const engineOffer = negotiationEngine.generateOpeningSellerOffer(sellerProfile, buyerProfile);
    const validation = negotiationEngine.validateAndClampProposal(engineOffer, buyerProfile, sellerProfile);
    const validOffer = validation.clampedOffer;

    const openingProposal: Proposal = {
      id: `prop_${uuidv4().substring(0, 8)}`,
      negotiationId,
      senderAgentId: seller.id,
      round: 1,
      price: validOffer.price,
      currency: 'USD',
      deliverables: validOffer.scopeItems,
      deliveryDays: validOffer.deliveryDays,
      terms: validOffer.paymentTerms === 'upfront' ? 'Instant upfront settlement' : 'Verified milestone escrow via PayPal Sandbox',
      validUntil: validOffer.validUntil,
      status: 'pending',
      revisions: validOffer.revisions,
      paymentTerms: validOffer.paymentTerms,
      tradesMade: validOffer.tradesMade,
      utilityScore: validOffer.utilitySeller,
      whyThisOffer: `Opening catalogue quote with standard turnaround (${validOffer.deliveryDays}d) and full scope.`,
      createdAt: now
    };

    negotiation.currentProposal = openingProposal;
    negotiation.status = 'in_negotiation';
    store.saveNegotiation(negotiation);
    store.saveProposal(openingProposal);

    // Natural message text generated or synthesized
    const messageContent = `${seller.businessName} submits formal proposal: $${openingProposal.price} with ${openingProposal.deliveryDays}-day delivery and ${openingProposal.revisions || 2} revisions.`;

    const sellerProposalMsg: NegotiationMessage = {
      id: `msg_${uuidv4().substring(0, 8)}`,
      negotiationId,
      senderAgentId: seller.id,
      recipientAgentId: buyer.id,
      senderRole: 'seller',
      round: 1,
      messageType: 'proposal',
      content: messageContent,
      payload: {
        proposalId: openingProposal.id,
        price: openingProposal.price,
        deliveryDays: openingProposal.deliveryDays,
        deliverables: openingProposal.deliverables,
        revisions: openingProposal.revisions,
        paymentTerms: openingProposal.paymentTerms,
        tradesMade: openingProposal.tradesMade,
        utilityScore: openingProposal.utilityScore,
        whyThisOffer: openingProposal.whyThisOffer
      },
      timestamp: now
    };
    negotiation.messages.push(sellerProposalMsg);

    // 3. Autonomous Decision Evaluation
    const buyerUser = store.getUser(request.userId) || store.getUsers()[0];
    const sellerFloor = sellerProfile.standardFloor;
    const evalResult = decisionEngine.evaluateProposal({
      proposal: openingProposal,
      request,
      buyerAgent: buyer,
      sellerAgent: seller,
      buyerUser,
      sellerFloorPrice: sellerFloor,
      untrustedMessages: [messageContent]
    });

    if (evalResult.outcome === 'auto_declined') {
      negotiation.status = 'rejected';
    } else if (evalResult.outcome === 'needs_review') {
      negotiation.status = 'escalated';
    }

    store.saveNegotiation(negotiation);
    broadcastEvent('deal_updated', { negotiationId, status: negotiation.status });

    store.logActivity({
      type: 'negotiation_started',
      title: `Negotiation Initiated: ${buyer.name} ↔ ${seller.businessName}`,
      description: `Opening proposal submitted at $${openingProposal.price} with ${openingProposal.deliveryDays}-day turnaround. Package utility: ${(validOffer.utilitySeller || 0) * 100}%.`,
      agentId: seller.id,
      negotiationId,
      amount: openingProposal.price,
      currency: 'USD',
      severity: 'info'
    });

    return negotiation;
  }

  /**
   * Advances a negotiation by one conversational turn with multi-issue packages and concessions.
   */
  async stepNegotiation(negotiationId: string): Promise<Negotiation> {
    const negotiation = store.getNegotiation(negotiationId);
    if (!negotiation) throw new Error(`Negotiation "${negotiationId}" not found`);

    if (negotiation.status === 'agreement_reached' || negotiation.status === 'completed' || negotiation.status === 'rejected') {
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

    const lastMsg = negotiation.messages[negotiation.messages.length - 1];
    const now = new Date().toISOString();

    // Turn A: Last message was from Seller -> Buyer takes action
    if (lastMsg.senderRole === 'seller') {
      const currentProp = negotiation.currentProposal;
      if (!currentProp) throw new Error('No active proposal to evaluate');

      const currentOffer: PackageOffer = {
        id: currentProp.id,
        round: currentProp.round,
        senderRole: 'seller',
        senderAgentId: seller.id,
        price: currentProp.price,
        deliveryDays: currentProp.deliveryDays,
        scopeItems: currentProp.deliverables,
        revisions: currentProp.revisions || 2,
        paymentTerms: (currentProp.paymentTerms as PaymentTerm) || 'escrow_milestone',
        validUntil: currentProp.validUntil
      };

      const response = negotiationEngine.generateBuyerResponse(
        buyerProfile,
        sellerProfile,
        currentOffer,
        negotiation.currentRound
      );

      if (response.action === 'acceptance') {
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
          content: `${buyer.name} accepts the terms: $${currentProp.price} with ${currentProp.deliveryDays}-day delivery. Terms finalized.`,
          payload: { agreedPrice: currentProp.price, deliverables: currentProp.deliverables, deliveryDays: currentProp.deliveryDays },
          timestamp: now
        };
        negotiation.messages.push(buyerAcceptMsg);

        const agreement = this.createAgreement(negotiation, request, buyer, seller, currentProp, [
          `Settled at $${currentProp.price} (${currentProp.deliveryDays}d delivery)`
        ]);
        negotiation.agreementId = agreement.id;
        negotiation.status = 'agreement_reached';
        negotiation.updatedAt = now;

        store.saveNegotiation(negotiation);
        return negotiation;
      } else if (response.action === 'rejection') {
        negotiation.status = 'rejected';
        negotiation.updatedAt = now;

        const rejectMsg: NegotiationMessage = {
          id: `msg_${uuidv4().substring(0, 8)}`,
          negotiationId,
          senderAgentId: buyer.id,
          recipientAgentId: seller.id,
          senderRole: 'buyer',
          round: negotiation.currentRound,
          messageType: 'rejection',
          content: response.reason || 'Negotiation declined due to irreconcilable constraints.',
          payload: { reason: response.reason },
          timestamp: now
        };
        negotiation.messages.push(rejectMsg);
        store.saveNegotiation(negotiation);
        return negotiation;
      } else {
        // Buyer counteroffers
        currentProp.status = 'countered';
        store.saveProposal(currentProp);

        const validation = negotiationEngine.validateAndClampProposal(response.offer!, buyerProfile, sellerProfile);
        const validCounter = validation.clampedOffer;

        const counterProp: Proposal = {
          id: validCounter.id,
          negotiationId,
          senderAgentId: buyer.id,
          round: negotiation.currentRound,
          price: validCounter.price,
          currency: 'USD',
          deliverables: validCounter.scopeItems,
          deliveryDays: validCounter.deliveryDays,
          terms: validCounter.paymentTerms,
          validUntil: validCounter.validUntil,
          status: 'pending',
          revisions: validCounter.revisions,
          paymentTerms: validCounter.paymentTerms,
          tradesMade: validCounter.tradesMade,
          utilityScore: validCounter.utilityBuyer,
          whyThisOffer: validCounter.rationale,
          createdAt: now
        };
        store.saveProposal(counterProp);
        negotiation.currentProposal = counterProp;

        const tradeAnalysis = analyzeTrade(currentOffer, validCounter);

        const buyerCounterMsg: NegotiationMessage = {
          id: `msg_${uuidv4().substring(0, 8)}`,
          negotiationId,
          senderAgentId: buyer.id,
          recipientAgentId: seller.id,
          senderRole: 'buyer',
          round: negotiation.currentRound,
          messageType: 'counteroffer',
          content: `${buyer.name} counters with package: $${validCounter.price} (${validCounter.deliveryDays}d delivery, ${validCounter.scopeItems.length} deliverables). Trades: ${validCounter.tradesMade?.join(', ') || 'rebalanced terms'}.`,
          payload: {
            counterPrice: validCounter.price,
            deliveryDays: validCounter.deliveryDays,
            deliverables: validCounter.scopeItems,
            tradesMade: validCounter.tradesMade,
            tradeSummary: tradeAnalysis.summary,
            utilityScore: validCounter.utilityBuyer,
            whyThisOffer: validCounter.rationale
          },
          timestamp: now
        };
        negotiation.messages.push(buyerCounterMsg);
        negotiation.updatedAt = now;

        store.saveNegotiation(negotiation);
        return negotiation;
      }
    }

    // Turn B: Last message was from Buyer (counteroffer) -> Seller responds
    if (lastMsg.senderRole === 'buyer' && lastMsg.messageType === 'counteroffer') {
      negotiation.currentRound += 1;
      const currentProp = negotiation.currentProposal;
      if (!currentProp) throw new Error('No active proposal to evaluate');

      const buyerOffer: PackageOffer = {
        id: currentProp.id,
        round: negotiation.currentRound - 1,
        senderRole: 'buyer',
        senderAgentId: buyer.id,
        price: currentProp.price,
        deliveryDays: currentProp.deliveryDays,
        scopeItems: currentProp.deliverables,
        revisions: currentProp.revisions || 2,
        paymentTerms: (currentProp.paymentTerms as PaymentTerm) || 'escrow_milestone',
        validUntil: currentProp.validUntil
      };

      const response = negotiationEngine.generateSellerResponse(
        sellerProfile,
        buyerProfile,
        buyerOffer,
        negotiation.currentRound
      );

      if (response.action === 'acceptance') {
        const agreedProposal: Proposal = {
          id: `prop_${uuidv4().substring(0, 8)}`,
          negotiationId,
          senderAgentId: seller.id,
          round: negotiation.currentRound,
          price: buyerOffer.price,
          currency: 'USD',
          deliverables: buyerOffer.scopeItems,
          deliveryDays: buyerOffer.deliveryDays,
          terms: 'Standard Verified Escrow via PayPal Sandbox',
          validUntil: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
          status: 'accepted',
          revisions: buyerOffer.revisions,
          paymentTerms: buyerOffer.paymentTerms,
          tradesMade: ['Seller confirmed consensus on buyer package'],
          utilityScore: calculateSellerUtility(buyerOffer, sellerProfile),
          createdAt: now
        };
        store.saveProposal(agreedProposal);
        negotiation.currentProposal = agreedProposal;

        const sellerAcceptMsg: NegotiationMessage = {
          id: `msg_${uuidv4().substring(0, 8)}`,
          negotiationId,
          senderAgentId: seller.id,
          recipientAgentId: buyer.id,
          senderRole: 'seller',
          round: negotiation.currentRound,
          messageType: 'acceptance',
          content: `${seller.businessName} accepts counteroffer at $${agreedProposal.price} with ${agreedProposal.deliveryDays}-day turnaround. Agreement ready for authorization.`,
          payload: { agreedPrice: agreedProposal.price, deliveryDays: agreedProposal.deliveryDays },
          timestamp: now
        };
        negotiation.messages.push(sellerAcceptMsg);

        const agreement = this.createAgreement(negotiation, request, buyer, seller, agreedProposal, agreedProposal.tradesMade);
        negotiation.agreementId = agreement.id;
        negotiation.status = 'agreement_reached';
        negotiation.updatedAt = now;

        store.saveNegotiation(negotiation);
        return negotiation;
      } else if (response.action === 'rejection') {
        negotiation.status = 'rejected';
        negotiation.updatedAt = now;

        const rejectMsg: NegotiationMessage = {
          id: `msg_${uuidv4().substring(0, 8)}`,
          negotiationId,
          senderAgentId: seller.id,
          recipientAgentId: buyer.id,
          senderRole: 'seller',
          round: negotiation.currentRound,
          messageType: 'rejection',
          content: response.reason || 'Negotiation ended without consensus.',
          payload: { reason: response.reason },
          timestamp: now
        };
        negotiation.messages.push(rejectMsg);
        store.saveNegotiation(negotiation);
        return negotiation;
      } else {
        // Seller counters with adjusted package
        const validation = negotiationEngine.validateAndClampProposal(response.offer!, buyerProfile, sellerProfile);
        const validCounter = validation.clampedOffer;

        const counterProp: Proposal = {
          id: validCounter.id,
          negotiationId,
          senderAgentId: seller.id,
          round: negotiation.currentRound,
          price: validCounter.price,
          currency: 'USD',
          deliverables: validCounter.scopeItems,
          deliveryDays: validCounter.deliveryDays,
          terms: 'Standard Verified Escrow via PayPal Sandbox',
          validUntil: validCounter.validUntil,
          status: 'pending',
          revisions: validCounter.revisions,
          paymentTerms: validCounter.paymentTerms,
          tradesMade: validCounter.tradesMade,
          utilityScore: validCounter.utilitySeller,
          whyThisOffer: validCounter.rationale,
          createdAt: now
        };
        store.saveProposal(counterProp);
        negotiation.currentProposal = counterProp;

        const tradeAnalysis = analyzeTrade(buyerOffer, validCounter);

        const sellerCounterMsg: NegotiationMessage = {
          id: `msg_${uuidv4().substring(0, 8)}`,
          negotiationId,
          senderAgentId: seller.id,
          recipientAgentId: buyer.id,
          senderRole: 'seller',
          round: negotiation.currentRound,
          messageType: 'counteroffer',
          content: `${seller.businessName} proposes adjusted package: $${validCounter.price} with ${validCounter.deliveryDays}-day delivery. Trades: ${validCounter.tradesMade?.join(', ') || 'value rebalanced'}.`,
          payload: {
            counterPrice: validCounter.price,
            deliveryDays: validCounter.deliveryDays,
            deliverables: validCounter.scopeItems,
            tradesMade: validCounter.tradesMade,
            tradeSummary: tradeAnalysis.summary,
            utilityScore: validCounter.utilitySeller,
            whyThisOffer: validCounter.rationale
          },
          timestamp: now
        };
        negotiation.messages.push(sellerCounterMsg);
        negotiation.updatedAt = now;

        store.saveNegotiation(negotiation);
        return negotiation;
      }
    }

    return negotiation;
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
      while (neg.status === 'in_negotiation' && turns < 6) {
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
    tradesSummary?: string[]
  ): Agreement {
    const agreementId = `agr_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();

    const decision = store.getDecisionByEntity('deal', negotiation.id);
    const isAutoApproved = decision?.status === 'auto_approved';

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
        title: `Deal Auto-Approved by Policy: $${agreement.finalPrice}`,
        description: `Autonomous decision policy verified price, verified seller ${seller.businessName}, and budget limits. Cleared for PayPal Sandbox capture.`,
        negotiationId: negotiation.id,
        amount: agreement.finalPrice,
        currency: agreement.currency,
        severity: 'success'
      });
    } else {
      store.logActivity({
        type: 'approval_requested',
        title: `Deal Escalated to Review Queue: $${agreement.finalPrice}`,
        description: `${buyer.name} and ${seller.businessName} reached agreement. Routed to human review queue under policy exception rule.`,
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
      description: `Buyer confirmed final terms ($${agreement.finalPrice} ${agreement.currency}). Transaction is now cleared for PayPal Sandbox processing.`,
      negotiationId: agreement.negotiationId,
      amount: agreement.finalPrice,
      currency: agreement.currency,
      severity: 'success'
    });

    return agreement;
  }
}

export const negotiationOrchestrator = new NegotiationOrchestrator();
