import { v4 as uuidv4 } from 'uuid';
import { store } from '../../db/store.js';
import { geminiService } from '../ai/gemini.js';
import {
  Negotiation,
  NegotiationMessage,
  Proposal,
  Agreement,
  CommerceRequest,
  Agent,
  MultiProposalComparison
} from '../../types/index.js';

export class NegotiationOrchestrator {
  /**
   * Initializes a negotiation between a buyer and a seller for a specific commerce request.
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

    const negotiationId = `neg_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();

    const negotiation: Negotiation = {
      id: negotiationId,
      requestId,
      buyerAgentId: buyer.id,
      sellerAgentId: seller.id,
      status: 'initiated',
      currentRound: 1,
      maxRounds: 4,
      currentProposal: null,
      messages: [],
      agreementId: null,
      createdAt: now,
      updatedAt: now
    };

    // 1. Initial Discovery/Request Message from Buyer Agent to Seller Agent
    const buyerIntroMsg: NegotiationMessage = {
      id: `msg_${uuidv4().substring(0, 8)}`,
      negotiationId,
      senderAgentId: buyer.id,
      recipientAgentId: seller.id,
      senderRole: 'buyer',
      round: 1,
      messageType: 'request',
      content: `Hello ${seller.businessName}. On behalf of our team, we are requesting a commercial proposal for "${request.title}". Maximum authorized budget: $${request.maxBudget}. Target turnaround: ${request.deadlineDays} days. Deliverables: ${request.deliverables.join(', ')}.`,
      payload: {
        maxBudget: request.maxBudget,
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

    // 2. Seller Agent inspects catalog & generates Opening Proposal
    const sellerResp = await geminiService.generateSellerResponse(seller, request, 1);
    
    const openingProposal: Proposal = {
      id: `prop_${uuidv4().substring(0, 8)}`,
      negotiationId,
      senderAgentId: seller.id,
      round: 1,
      price: sellerResp.proposedPrice,
      currency: 'USD',
      deliverables: sellerResp.deliverables,
      deliveryDays: sellerResp.deliveryDays,
      terms: 'Milestone escrow through PayPal Sandbox. Full source code upon final review.',
      validUntil: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    store.saveProposal(openingProposal);
    negotiation.currentProposal = openingProposal;
    negotiation.status = 'in_negotiation';

    const sellerProposalMsg: NegotiationMessage = {
      id: `msg_${uuidv4().substring(0, 8)}`,
      negotiationId,
      senderAgentId: seller.id,
      recipientAgentId: buyer.id,
      senderRole: 'seller',
      round: 1,
      messageType: 'proposal',
      content: sellerResp.message,
      payload: {
        proposalId: openingProposal.id,
        price: openingProposal.price,
        deliveryDays: openingProposal.deliveryDays,
        deliverables: openingProposal.deliverables
      },
      toolCalls: [sellerResp.toolCallTrace ? { ...sellerResp.toolCallTrace, timestamp: new Date().toISOString() } : undefined].filter(Boolean) as any,
      timestamp: new Date().toISOString()
    };
    negotiation.messages.push(sellerProposalMsg);

    store.saveNegotiation(negotiation);

    store.logActivity({
      type: 'negotiation_started',
      title: `Negotiation Initiated: ${buyer.name} ↔ ${seller.businessName}`,
      description: `Opening proposal submitted at $${openingProposal.price} with ${openingProposal.deliveryDays}-day delivery turnaround.`,
      agentId: seller.id,
      negotiationId,
      amount: openingProposal.price,
      currency: 'USD',
      severity: 'info'
    });

    return negotiation;
  }

  /**
   * Advances a negotiation by one conversational turn.
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

    const lastMsg = negotiation.messages[negotiation.messages.length - 1];
    const now = new Date().toISOString();

    // Turn A: Last message was from Seller -> Buyer takes action
    if (lastMsg.senderRole === 'seller') {
      const currentProp = negotiation.currentProposal;
      if (!currentProp) throw new Error('No active proposal to evaluate');

      const buyerResp = await geminiService.generateBuyerResponse(
        buyer,
        request,
        currentProp,
        negotiation.currentRound
      );

      if (buyerResp.action === 'acceptance') {
        // Buyer accepts the current proposal!
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
          content: buyerResp.message,
          payload: { agreedPrice: currentProp.price, deliverables: currentProp.deliverables },
          toolCalls: [{ ...buyerResp.toolCallTrace, timestamp: now }],
          timestamp: now
        };
        negotiation.messages.push(buyerAcceptMsg);

        // Create Agreement
        const agreement = this.createAgreement(negotiation, request, buyer, seller, currentProp);
        negotiation.agreementId = agreement.id;
        negotiation.status = 'agreement_reached';
        negotiation.updatedAt = now;

        store.saveNegotiation(negotiation);
        return negotiation;
      } else {
        // Buyer counteroffers
        currentProp.status = 'countered';
        store.saveProposal(currentProp);

        const counterPrice = buyerResp.counterPrice || request.maxBudget;

        const buyerCounterMsg: NegotiationMessage = {
          id: `msg_${uuidv4().substring(0, 8)}`,
          negotiationId,
          senderAgentId: buyer.id,
          recipientAgentId: seller.id,
          senderRole: 'buyer',
          round: negotiation.currentRound,
          messageType: 'counteroffer',
          content: buyerResp.message,
          payload: { counterPrice },
          toolCalls: [{ ...buyerResp.toolCallTrace, timestamp: now }],
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
      const buyerOffer = lastMsg.payload?.counterPrice || request.maxBudget;

      const sellerResp = await geminiService.generateSellerResponse(
        seller,
        request,
        negotiation.currentRound,
        buyerOffer
      );

      if (sellerResp.action === 'acceptance') {
        const agreedProposal: Proposal = {
          id: `prop_${uuidv4().substring(0, 8)}`,
          negotiationId,
          senderAgentId: seller.id,
          round: negotiation.currentRound,
          price: sellerResp.proposedPrice,
          currency: 'USD',
          deliverables: sellerResp.deliverables,
          deliveryDays: sellerResp.deliveryDays,
          terms: 'Standard Verified Escrow via PayPal Sandbox',
          validUntil: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
          status: 'accepted',
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
          content: sellerResp.message,
          payload: { agreedPrice: agreedProposal.price },
          toolCalls: [{ ...sellerResp.toolCallTrace, timestamp: now }],
          timestamp: now
        };
        negotiation.messages.push(sellerAcceptMsg);

        const agreement = this.createAgreement(negotiation, request, buyer, seller, agreedProposal);
        negotiation.agreementId = agreement.id;
        negotiation.status = 'agreement_reached';
        negotiation.updatedAt = now;

        store.saveNegotiation(negotiation);
        return negotiation;
      } else {
        // Seller counters again
        const counterProp: Proposal = {
          id: `prop_${uuidv4().substring(0, 8)}`,
          negotiationId,
          senderAgentId: seller.id,
          round: negotiation.currentRound,
          price: sellerResp.proposedPrice,
          currency: 'USD',
          deliverables: sellerResp.deliverables,
          deliveryDays: sellerResp.deliveryDays,
          terms: 'Standard Verified Escrow via PayPal Sandbox',
          validUntil: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
          status: 'pending',
          createdAt: now
        };
        store.saveProposal(counterProp);
        negotiation.currentProposal = counterProp;

        const sellerCounterMsg: NegotiationMessage = {
          id: `msg_${uuidv4().substring(0, 8)}`,
          negotiationId,
          senderAgentId: seller.id,
          recipientAgentId: buyer.id,
          senderRole: 'seller',
          round: negotiation.currentRound,
          messageType: 'counteroffer',
          content: sellerResp.message,
          payload: { counterPrice: counterProp.price },
          toolCalls: [{ ...sellerResp.toolCallTrace, timestamp: now }],
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
    const negotiations: Negotiation[] = [];

    for (const sellerId of sellerIds) {
      let neg = await this.initiateNegotiation(requestId, sellerId);
      
      // Step through rounds until agreement or terminal state
      let turns = 0;
      while (neg.status === 'in_negotiation' && turns < 6) {
        neg = await this.stepNegotiation(neg.id);
        turns++;
      }
      negotiations.push(neg);
    }

    const request = store.getRequest(requestId);
    if (!request) throw new Error('Request not found');

    // Run Evaluator Agent across all proposals
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

    // Update request status
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
    proposal: Proposal
  ): Agreement {
    const agreementId = `agr_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();

    const agreement: Agreement = {
      id: agreementId,
      negotiationId: negotiation.id,
      requestId: request.id,
      buyerAgentId: buyer.id,
      sellerAgentId: seller.id,
      buyerUserId: request.userId,
      sellerBusinessName: seller.businessName,
      finalPrice: proposal.price,
      currency: proposal.currency || 'USD',
      finalDeliverables: proposal.deliverables,
      deliveryDays: proposal.deliveryDays,
      commercialTerms: 'All intellectual property rights assign to buyer upon PayPal capture confirmation. 5 business day delivery guarantee.',
      humanApprovalStatus: 'pending',
      paypalReady: false,
      createdAt: now
    };

    store.saveAgreement(agreement);

    store.logActivity({
      type: 'approval_requested',
      title: `Agreement Awaiting Human Authorization: $${agreement.finalPrice}`,
      description: `${buyer.name} and ${seller.businessName} reached commercial consensus for "${request.title}". Awaiting explicit buyer authorization before PayPal capture.`,
      negotiationId: negotiation.id,
      amount: agreement.finalPrice,
      currency: agreement.currency,
      severity: 'warning'
    });

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
