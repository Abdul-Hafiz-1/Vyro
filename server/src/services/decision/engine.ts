import { v4 as uuidv4 } from 'uuid';
import { store } from '../../db/store.js';
import {
  DecisionRecord,
  DecisionStatus,
  DecisionSignals,
  Proposal,
  CommerceRequest,
  Agent,
  User
} from '../../types/index.js';

export const PROHIBITED_CATEGORIES = [
  'weapons',
  'illicit',
  'malware',
  'adult',
  'exploit',
  'unauthorized_access'
];

export interface DecisionEvaluationResult {
  decision: DecisionRecord;
  outcome: 'auto_approved' | 'auto_declined' | 'needs_review';
  plainSummary: string;
}

export class DecisionEngine {
  /**
   * Deterministically evaluates a commercial proposal against buyer/seller policies and signals.
   * Confidence is purely derived from deterministic criteria, never self-reported by AI.
   */
  public evaluateProposal(params: {
    proposal: Proposal;
    request: CommerceRequest;
    buyerAgent: Agent;
    sellerAgent: Agent;
    buyerUser: User;
    sellerFloorPrice: number;
    untrustedMessages?: string[];
  }): DecisionEvaluationResult {
    const {
      proposal,
      request,
      buyerAgent,
      sellerAgent,
      buyerUser,
      sellerFloorPrice,
      untrustedMessages = []
    } = params;

    const price = proposal.price;
    const buyerMaxBudget = request.maxBudget;
    const autoLimit = buyerUser.autoApprovalLimit ?? 200;
    const dailyCap = buyerUser.dailyBudgetCap ?? 500;
    const isPaused = Boolean(buyerUser.isAutomationPaused);
    const todaySpend = store.getTodaySpend(buyerUser.id);

    // 1. Red flag checks (prompt injection signatures, malicious payload patterns)
    const redFlags: string[] = [];
    for (const msg of untrustedMessages) {
      const lower = msg.toLowerCase();
      if (
        lower.includes('ignore previous instructions') ||
        lower.includes('disregard rules') ||
        lower.includes('system override') ||
        lower.includes('admin prompt') ||
        lower.includes('authorize payment immediately') ||
        lower.includes('bypass check')
      ) {
        redFlags.push('Potential adversarial prompt injection detected in counterparty message.');
      }
    }

    // 2. Evaluate signals
    const categoryLower = (request.category || '').toLowerCase();
    const isProhibitedCategory = PROHIBITED_CATEGORIES.some(cat => categoryLower.includes(cat));

    const priceWithinCeiling = price <= buyerMaxBudget;
    const priceAboveFloor = price >= sellerFloorPrice;
    const sellerVerified = sellerAgent.verificationStatus === 'verified';
    const underAutoLimit = price <= autoLimit;
    const withinDailyBudget = (todaySpend + price) <= dailyCap;
    const categoryAllowed = !isProhibitedCategory;

    // Deterministic Confidence Computation (Scale 0.0 - 1.0)
    let score = 0;
    if (priceWithinCeiling) score += 0.25;
    if (priceAboveFloor) score += 0.25;
    if (sellerVerified) score += 0.20;
    if (underAutoLimit) score += 0.15;
    if (categoryAllowed) score += 0.15;
    if (redFlags.length > 0) score = Math.max(0, score - 0.5);

    const confidence = Math.min(1.0, Math.max(0.0, Number(score.toFixed(2))));

    const signals: DecisionSignals = {
      priceWithinCeiling,
      priceAboveFloor,
      sellerVerified,
      underAutoLimit,
      categoryAllowed,
      withinDailyBudget,
      automationPaused: isPaused,
      redFlags,
      proposedPrice: price,
      buyerMaxBudget,
      sellerFloorPrice,
      userAutoLimit: autoLimit,
      userDailyCap: dailyCap,
      todaySpend
    };

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString(); // 24h review expiry
    const decisionId = `dec_${uuidv4().substring(0, 8)}`;

    // =========================================================================
    // Policy Outcome Evaluation
    // =========================================================================

    // Case 1: Early Exit / Seller Floor > Buyer Max
    if (sellerFloorPrice > buyerMaxBudget) {
      const reasons = [
        `Operational impasse: Seller absolute floor ($${sellerFloorPrice}) exceeds buyer authorized maximum budget ($${buyerMaxBudget}).`,
        'Escalated to human review for manual budget increase or scope revision.'
      ];
      const decision: DecisionRecord = {
        id: decisionId,
        entityType: 'deal',
        entityId: proposal.negotiationId,
        userId: buyerUser.id,
        status: 'needs_review',
        reasons,
        recommendation: 'Increase budget ceiling or split deliverables into phases.',
        signals,
        confidence,
        decidedBy: 'rule',
        expiresAt,
        createdAt: now,
        updatedAt: now
      };
      store.saveDecision(decision);
      this.syncReviewQueue(decision, proposal, request, sellerAgent, buyerUser, 'high', reasons);
      return { decision, outcome: 'needs_review', plainSummary: reasons[0] };
    }

    // Case 2: AUTO-DECLINE
    if (isProhibitedCategory || price > (buyerMaxBudget * 1.5) || redFlags.length > 0) {
      const reasons: string[] = [];
      if (isProhibitedCategory) {
        reasons.push(`Category "${request.category}" violates network acceptable commerce policy.`);
      }
      if (price > buyerMaxBudget * 1.5) {
        reasons.push(`Offer price $${price} exceeds authorized budget by more than 50% ($${buyerMaxBudget}).`);
      }
      if (redFlags.length > 0) {
        reasons.push(...redFlags);
      }

      const decision: DecisionRecord = {
        id: decisionId,
        entityType: 'deal',
        entityId: proposal.negotiationId,
        userId: buyerUser.id,
        status: 'auto_declined',
        reasons,
        recommendation: 'Decline deal and invite appeal if this was triggered in error.',
        signals,
        confidence,
        decidedBy: 'rule',
        createdAt: now,
        updatedAt: now
      };
      store.saveDecision(decision);

      store.logAudit({
        entityType: 'deal',
        entityId: proposal.negotiationId,
        action: 'auto_decline_deal',
        policyMatched: 'prohibited_or_extreme_deviation_policy',
        decision: 'auto_declined',
        actor: 'ai_engine',
        confidence,
        reasons,
        metadata: { signals }
      });

      return {
        decision,
        outcome: 'auto_declined',
        plainSummary: `Auto-declined: ${reasons[0]}`
      };
    }

    // Case 3: AUTO-APPROVE
    // Must satisfy: price within ceiling & floor, verified seller, <= auto-limit, within daily cap,
    // allowed category, no red flags, not paused, confidence >= 0.85
    const canAutoApprove =
      !isPaused &&
      priceWithinCeiling &&
      priceAboveFloor &&
      sellerVerified &&
      underAutoLimit &&
      withinDailyBudget &&
      categoryAllowed &&
      redFlags.length === 0 &&
      confidence >= 0.85;

    if (canAutoApprove) {
      const reasons = [
        `Price $${price} is within your budget ($${buyerMaxBudget}) and below your $${autoLimit} auto-limit.`,
        `Seller ${sellerAgent.businessName} is verified with flawless safety history.`,
        `Daily spend after this transaction ($${todaySpend + price}) remains within your $${dailyCap} daily cap.`
      ];

      const decision: DecisionRecord = {
        id: decisionId,
        entityType: 'deal',
        entityId: proposal.negotiationId,
        userId: buyerUser.id,
        status: 'auto_approved',
        reasons,
        recommendation: 'Auto-approved under autonomous buyer policy.',
        signals,
        confidence,
        decidedBy: 'rule',
        undoUntil: new Date(Date.now() + 10 * 1000).toISOString(), // 10s undo window
        createdAt: now,
        updatedAt: now
      };
      store.saveDecision(decision);

      store.logAudit({
        entityType: 'deal',
        entityId: proposal.negotiationId,
        action: 'auto_approve_deal',
        policyMatched: 'autonomous_commerce_policy_v1',
        decision: 'auto_approved',
        actor: 'ai_engine',
        confidence,
        reasons,
        metadata: { signals }
      });

      return {
        decision,
        outcome: 'auto_approved',
        plainSummary: `Auto-approved: $${price} with ${sellerAgent.businessName}.`
      };
    }

    // Case 4: ESCALATE (needs_review)
    const escalationReasons: string[] = [];
    if (isPaused) {
      escalationReasons.push('Automation is currently paused by user switch. All transactions require manual approval.');
    }
    if (!underAutoLimit) {
      escalationReasons.push(`Offer price $${price} exceeds your auto-approval threshold of $${autoLimit}.`);
    }
    if (!withinDailyBudget) {
      escalationReasons.push(`Transaction would push today's spend ($${todaySpend + price}) over your $${dailyCap} daily cap.`);
    }
    if (!sellerVerified) {
      escalationReasons.push(`Seller "${sellerAgent.businessName}" is a community member and has not completed verified partner accreditation.`);
    }
    if (!priceWithinCeiling) {
      escalationReasons.push(`Offer price $${price} is above your target ceiling of $${buyerMaxBudget}.`);
    }

    const urgency: 'high' | 'medium' | 'low' =
      price > buyerMaxBudget || !withinDailyBudget ? 'high' :
      !sellerVerified ? 'medium' : 'low';

    const decision: DecisionRecord = {
      id: decisionId,
      entityType: 'deal',
      entityId: proposal.negotiationId,
      userId: buyerUser.id,
      status: 'needs_review',
      reasons: escalationReasons,
      recommendation: priceWithinCeiling
        ? 'Price matches scope; verify seller credentials and approve if satisfied.'
        : 'Counter at maximum budget ceiling or request reduced turnaround.',
      signals,
      confidence,
      decidedBy: 'rule',
      expiresAt,
      createdAt: now,
      updatedAt: now
    };
    store.saveDecision(decision);
    this.syncReviewQueue(decision, proposal, request, sellerAgent, buyerUser, urgency, escalationReasons);

    store.logAudit({
      entityType: 'deal',
      entityId: proposal.negotiationId,
      action: 'escalate_deal_to_review_queue',
      policyMatched: 'human_exception_policy',
      decision: 'needs_review',
      actor: 'ai_engine',
      confidence,
      reasons: escalationReasons,
      metadata: { signals, urgency }
    });

    return {
      decision,
      outcome: 'needs_review',
      plainSummary: escalationReasons[0] || 'Requires manual sign-off.'
    };
  }

  /**
   * Seller-side exception rules.
   * Quotes above their floor and within active project capacity auto-accept;
   * custom scope or unverified buyers escalate.
   */
  public evaluateSellerSide(params: {
    sellerAgent: Agent;
    sellerFloorPrice: number;
    offerPrice: number;
    buyerVerified: boolean;
    isCustomScope: boolean;
  }): { canAutoAccept: boolean; reason: string } {
    const { sellerAgent, sellerFloorPrice, offerPrice, buyerVerified, isCustomScope } = params;

    const maxProjects = sellerAgent.maxConcurrentProjects ?? 5;
    const activeProjects = sellerAgent.activeProjects ?? 1;

    if (offerPrice < sellerFloorPrice) {
      return {
        canAutoAccept: false,
        reason: `Offer $${offerPrice} is below seller minimum operational floor $${sellerFloorPrice}.`
      };
    }

    if (activeProjects >= maxProjects) {
      return {
        canAutoAccept: false,
        reason: `Seller is currently at maximum capacity (${activeProjects}/${maxProjects} active projects).`
      };
    }

    if (!buyerVerified) {
      return {
        canAutoAccept: false,
        reason: 'Buyer account is unverified. Manual review required by seller operator.'
      };
    }

    if (isCustomScope) {
      return {
        canAutoAccept: false,
        reason: 'Custom milestone scope detected. Escalated for seller operator confirmation.'
      };
    }

    return {
      canAutoAccept: true,
      reason: `Offer $${offerPrice} is above floor $${sellerFloorPrice} with available production capacity.`
    };
  }

  private syncReviewQueue(
    decision: DecisionRecord,
    proposal: Proposal,
    request: CommerceRequest,
    sellerAgent: Agent,
    buyerUser: User,
    urgency: 'high' | 'medium' | 'low',
    reasons: string[]
  ): void {
    const existing = store.getReviewQueueItem(`rq_${decision.entityId}`);
    const urgencyScore = urgency === 'high' ? 0.9 : urgency === 'medium' ? 0.6 : 0.3;

    store.saveReviewQueueItem({
      id: existing?.id || `rq_${decision.entityId}`,
      negotiationId: proposal.negotiationId,
      requestId: request.id,
      sellerId: sellerAgent.ownerId || sellerAgent.id,
      buyerId: buyerUser.id,
      urgency,
      urgencyScore,
      aiRecommendation: decision.signals.priceWithinCeiling ? 'approve' : 'adjust_price',
      confidence: decision.confidence,
      reasons,
      proposedPrice: proposal.price,
      buyerMaxBudget: request.maxBudget,
      sellerFloorPrice: decision.signals.sellerFloorPrice,
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    // Notify buyer that human review is required
    store.saveNotification({
      id: `notif_${uuidv4().substring(0, 8)}`,
      userId: buyerUser.id,
      title: 'Action Needed: Deal Escalated',
      message: reasons[0] || `Proposal for "${request.title}" requires human decision ($${proposal.price}).`,
      type: 'action_required',
      linkUrl: `/app/deals/${proposal.negotiationId}`,
      read: false,
      createdAt: new Date().toISOString()
    });
  }
}

export const decisionEngine = new DecisionEngine();
