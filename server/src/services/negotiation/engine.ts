import { v4 as uuidv4 } from 'uuid';
import {
  BuyerProfile,
  SellerProfile,
  PackageOffer,
  PaymentTerm,
  NegotiationResult
} from './types.js';
import { calculateBuyerUtility, calculateSellerUtility, analyzeTrade } from './utility.js';

export class NegotiationEngine {
  /**
   * Generates the Seller's opening package proposal (Round 1).
   */
  public generateOpeningSellerOffer(seller: SellerProfile, buyer: BuyerProfile): PackageOffer {
    // Opening price is listPrice
    const price = seller.listPrice;
    const deliveryDays = seller.standardDeliveryDays;
    const scopeItems = buyer.scopeItems.map(s => s.name);
    const revisions = 2;
    const paymentTerms: PaymentTerm = 'escrow_milestone';

    const offer: PackageOffer = {
      id: `prop_${uuidv4().substring(0, 8)}`,
      round: 1,
      senderRole: 'seller',
      senderAgentId: seller.agentId,
      price,
      deliveryDays,
      scopeItems,
      revisions,
      paymentTerms,
      validUntil: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      tradesMade: ['Opening catalog quote with standard turnaround and full scope'],
      rationale: `Standard commercial offering for ${seller.businessName}.`
    };

    offer.utilitySeller = calculateSellerUtility(offer, seller);
    offer.utilityBuyer = calculateBuyerUtility(offer, buyer);
    return offer;
  }

  /**
   * Generates the Buyer's response / counteroffer to a Seller proposal.
   */
  public generateBuyerResponse(
    buyer: BuyerProfile,
    seller: SellerProfile,
    sellerOffer: PackageOffer,
    round: number
  ): { action: 'acceptance' | 'counteroffer' | 'rejection'; offer?: PackageOffer; reason?: string } {
    const buyerUtility = calculateBuyerUtility(sellerOffer, buyer);

    // Acceptance condition: utility is high enough or round 4 and acceptable
    const utilityThreshold = round >= 3 ? 0.65 : 0.78;
    if (buyerUtility >= utilityThreshold && sellerOffer.price <= buyer.maxBudget) {
      return { action: 'acceptance' };
    }

    // Check if hard deadline is breached and cannot be reconciled
    if (seller.minDeliveryDays > buyer.latestDeliveryDays) {
      return {
        action: 'rejection',
        reason: `Incompatible timeline: Seller minimum turnaround is ${seller.minDeliveryDays} days, but Buyer hard deadline is ${buyer.latestDeliveryDays} days.`
      };
    }

    // Check if seller's hard floor is above buyer's max budget (Empty ZOPA)
    if (seller.hardFloor > buyer.maxBudget) {
      return {
        action: 'rejection',
        reason: `Empty ZOPA: Buyer maximum budget ($${buyer.maxBudget}) is below Seller absolute hard floor ($${seller.hardFloor}).`
      };
    }

    // If max rounds reached and still unacceptable
    if (round > 4) {
      return {
        action: 'rejection',
        reason: `Maximum negotiation rounds (4) completed without mutual consensus.`
      };
    }

    // Generate Concession based on Strategy
    let proposedPrice: number;
    let proposedDays: number;
    let proposedScope: string[];
    let proposedTerms: PaymentTerm = 'escrow_milestone';
    const tradesMade: string[] = [];

    const priceSpan = buyer.maxBudget - buyer.targetPrice;
    const mustHaves = buyer.scopeItems.filter(s => s.priority === 'must-have').map(s => s.name);
    const niceToHaves = buyer.scopeItems.filter(s => s.priority === 'nice-to-have').map(s => s.name);

    if (buyer.strategy === 'conceder') {
      // Concedes on delivery time and nice-to-have scope early to anchor a low price
      const priceFraction = round === 1 ? 0.15 : round === 2 ? 0.35 : 0.60;
      proposedPrice = Math.round(buyer.targetPrice + priceSpan * priceFraction);
      
      // Concede +2 to +3 extra days immediately to give seller breathing room
      proposedDays = Math.min(buyer.latestDeliveryDays, buyer.idealDeliveryDays + 2 + round);
      tradesMade.push(`Offered +${proposedDays - buyer.idealDeliveryDays} days turnaround`);

      // Offer upfront payment in round 2+ to earn a discount
      if (round >= 2 && buyer.acceptedPaymentTerms.includes('upfront')) {
        proposedTerms = 'upfront';
        tradesMade.push('Offered instant upfront payment');
      }

      // If still far on price in round 2+, drop a nice-to-have scope item
      if (round >= 2 && niceToHaves.length > 0) {
        proposedScope = [...mustHaves];
        tradesMade.push(`Relinquished optional deliverable: ${niceToHaves[0]}`);
      } else {
        proposedScope = buyer.scopeItems.map(s => s.name);
      }
    } else if (buyer.strategy === 'hard-line') {
      // Holds strict target price and all scope until round 3
      if (round <= 2) {
        proposedPrice = Math.round(buyer.targetPrice + (round === 2 ? 10 : 0));
        proposedDays = buyer.idealDeliveryDays;
        proposedScope = buyer.scopeItems.map(s => s.name);
        tradesMade.push('Standing firm on baseline specifications');
      } else {
        // Concede in late rounds
        proposedPrice = Math.round(buyer.targetPrice + priceSpan * 0.70);
        proposedDays = Math.min(buyer.latestDeliveryDays, buyer.idealDeliveryDays + 2);
        proposedScope = buyer.scopeItems.map(s => s.name);
        tradesMade.push(`Conceded +$${proposedPrice - buyer.targetPrice} and +2 days to close deal`);
      }
    } else {
      // Linear Strategy: evenly steps concessions across rounds
      const progress = (round - 1) / 3; // 0, 0.33, 0.66, 1.0
      proposedPrice = Math.round(buyer.targetPrice + priceSpan * (0.2 + 0.6 * progress));
      const daysSpan = buyer.latestDeliveryDays - buyer.idealDeliveryDays;
      proposedDays = Math.min(buyer.latestDeliveryDays, Math.round(buyer.idealDeliveryDays + daysSpan * progress));
      proposedScope = buyer.scopeItems.map(s => s.name);
      tradesMade.push(`Even trade: adjusted price to $${proposedPrice} with ${proposedDays}-day timeline`);
    }

    // Clamping & Deterministic Guardrails
    proposedPrice = Math.min(proposedPrice, buyer.maxBudget);
    proposedDays = Math.min(proposedDays, buyer.latestDeliveryDays);

    const counterOffer: PackageOffer = {
      id: `prop_${uuidv4().substring(0, 8)}`,
      round,
      senderRole: 'buyer',
      senderAgentId: buyer.agentId,
      price: proposedPrice,
      deliveryDays: proposedDays,
      scopeItems: proposedScope,
      revisions: 2,
      paymentTerms: proposedTerms,
      validUntil: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      tradesMade,
      rationale: `Buyer proposal calibrated to ${buyer.strategy} stance.`
    };

    counterOffer.utilityBuyer = calculateBuyerUtility(counterOffer, buyer);
    counterOffer.utilitySeller = calculateSellerUtility(counterOffer, seller);

    return { action: 'counteroffer', offer: counterOffer };
  }

  /**
   * Generates the Seller's response / counteroffer to a Buyer offer.
   */
  public generateSellerResponse(
    seller: SellerProfile,
    buyer: BuyerProfile,
    buyerOffer: PackageOffer,
    round: number
  ): { action: 'acceptance' | 'counteroffer' | 'rejection'; offer?: PackageOffer; reason?: string } {
    const sellerUtility = calculateSellerUtility(buyerOffer, seller);

    // Determine Seller Effective Floor for this proposal
    // SOFT FLOOR LOGIC:
    // Can go below standardFloor (down to hardFloor) ONLY if:
    // 1. Buyer gave extra turnaround days (>= 2 days over standard), OR
    // 2. Buyer relinquished >= 1 scope item, OR
    // 3. Buyer offered upfront payment, OR
    // 4. Seller has spare capacity (>= 7)
    let effectiveFloor = seller.standardFloor;
    const buyerExtraDays = buyerOffer.deliveryDays - seller.standardDeliveryDays;
    const scopeReduced = buyerOffer.scopeItems.length < buyer.scopeItems.length;
    const isUpfront = buyerOffer.paymentTerms === 'upfront';
    const hasSpareCapacity = seller.capacity >= 7;

    const buyerGaveConcessions = (buyerExtraDays >= 2) || scopeReduced || isUpfront || hasSpareCapacity;

    if (buyerGaveConcessions) {
      let allowedDiscountPct = 0;
      if (buyerExtraDays >= 2) allowedDiscountPct += seller.discounts.longerDeadlinePctPerDay * buyerExtraDays;
      if (scopeReduced) allowedDiscountPct += seller.discounts.scopeReductionPctPerItem;
      if (isUpfront) allowedDiscountPct += seller.discounts.upfrontPaymentPct;
      if (hasSpareCapacity) allowedDiscountPct += 0.04;

      // Bound discount by stretchPct
      const actualDiscountPct = Math.min(seller.stretchPct, allowedDiscountPct);
      effectiveFloor = Math.max(seller.hardFloor, Math.round(seller.standardFloor * (1 - actualDiscountPct)));
    }

    // Acceptance condition: price >= effectiveFloor and utility meets threshold
    // When buyer conceded significant non-price value (unlocked soft floor), acceptance is facilitated
    const utilityThreshold = buyerGaveConcessions
      ? (round >= 3 ? 0.45 : 0.55)
      : (round >= 3 ? 0.55 : 0.65);

    if (buyerOffer.price >= effectiveFloor && sellerUtility >= utilityThreshold) {
      return { action: 'acceptance' };
    }

    // If buyer offer is below hard floor and round >= 4
    if (round >= 4 && buyerOffer.price < effectiveFloor) {
      return {
        action: 'rejection',
        reason: `Impasse: Buyer's best offer ($${buyerOffer.price}) remains below Seller's authorized floor ($${effectiveFloor}).`
      };
    }

    // Generate Seller Counteroffer
    let counterPrice: number;
    let counterDays: number;
    let counterScope = [...buyerOffer.scopeItems];
    const tradesMade: string[] = [];

    const priceSpan = seller.listPrice - effectiveFloor;

    if (seller.strategy === 'value-trader') {
      // Trades days or scope before making large price drops
      if (round <= 2) {
        counterPrice = Math.round(seller.listPrice - priceSpan * 0.35);
        counterDays = Math.max(seller.minDeliveryDays, buyerOffer.deliveryDays);
        tradesMade.push(`Value trade: adjusted turnaround to ${counterDays}d with premium revisions`);
      } else {
        // Concede more in later rounds, reaching into soft floor if justified
        const lateProgress = buyerGaveConcessions ? 0.85 : 0.65;
        counterPrice = Math.max(effectiveFloor, Math.round(seller.listPrice - priceSpan * lateProgress));
        counterDays = Math.max(seller.minDeliveryDays, buyerOffer.deliveryDays);
        tradesMade.push(`Conceded price to $${counterPrice} meeting buyer timeline`);
      }
    } else if (seller.strategy === 'volume-seeker') {
      // Fast concessions to lock in the deal
      const progress = round / 4;
      const volProgress = buyerGaveConcessions ? 0.5 + 0.45 * progress : 0.4 + 0.4 * progress;
      counterPrice = Math.max(effectiveFloor, Math.round(seller.listPrice - priceSpan * volProgress));
      counterDays = Math.max(seller.minDeliveryDays, buyerOffer.deliveryDays);
      tradesMade.push(`Aggressive volume price: $${counterPrice}`);
    } else {
      // Firm: Protects margin, makes small measured concessions
      const progress = (round - 1) / 3;
      const firmProgress = buyerGaveConcessions ? 0.3 + 0.5 * progress : 0.15 + 0.35 * progress;
      counterPrice = Math.max(effectiveFloor, Math.round(seller.listPrice - priceSpan * firmProgress));
      counterDays = Math.max(seller.minDeliveryDays, buyerOffer.deliveryDays);
      tradesMade.push(`Firm margin quote: $${counterPrice}`);
    }

    // Check if buyer concessions justified soft floor
    if (counterPrice < seller.standardFloor) {
      tradesMade.push(`Soft-floor unlocked ($${counterPrice} < standard floor $${seller.standardFloor}) due to buyer non-price trades`);
    }

    // Clamping to absolute hard floor
    counterPrice = Math.max(seller.hardFloor, counterPrice);

    const counterOffer: PackageOffer = {
      id: `prop_${uuidv4().substring(0, 8)}`,
      round,
      senderRole: 'seller',
      senderAgentId: seller.agentId,
      price: counterPrice,
      deliveryDays: counterDays,
      scopeItems: counterScope,
      revisions: 2,
      paymentTerms: buyerOffer.paymentTerms,
      validUntil: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      tradesMade,
      rationale: `Seller counteroffer calibrated to ${seller.strategy} stance (effective floor $${effectiveFloor}).`
    };

    counterOffer.utilitySeller = calculateSellerUtility(counterOffer, seller);
    counterOffer.utilityBuyer = calculateBuyerUtility(counterOffer, buyer);

    return { action: 'counteroffer', offer: counterOffer };
  }

  /**
   * Deterministic Validator Wrapper:
   * Inspects any proposal (including LLM generated) and strictly clamps or rejects violations
   * BEFORE it is dispatched to the counterparty agent.
   */
  public validateAndClampProposal(
    proposal: PackageOffer,
    buyer: BuyerProfile,
    seller: SellerProfile
  ): { isValid: boolean; clampedOffer: PackageOffer; violations: string[] } {
    const violations: string[] = [];
    const clamped = { ...proposal };

    // 1. Seller Hard Floor Violation
    if (clamped.senderRole === 'seller' && clamped.price < seller.hardFloor) {
      violations.push(`Seller price ($${clamped.price}) was below absolute hard floor ($${seller.hardFloor}). Clamped to $${seller.hardFloor}.`);
      clamped.price = seller.hardFloor;
    }

    // 2. Buyer Max Budget Violation
    if (clamped.senderRole === 'buyer' && clamped.price > buyer.maxBudget) {
      violations.push(`Buyer offer ($${clamped.price}) exceeded maximum budget ($${buyer.maxBudget}). Clamped to $${buyer.maxBudget}.`);
      clamped.price = buyer.maxBudget;
    }

    // 3. Minimum Turnaround Violation
    if (clamped.deliveryDays < seller.minDeliveryDays) {
      violations.push(`Delivery days (${clamped.deliveryDays}) below seller minimum (${seller.minDeliveryDays}). Clamped to ${seller.minDeliveryDays}.`);
      clamped.deliveryDays = seller.minDeliveryDays;
    }

    // 4. Must-Have Deliverables Preservation
    const mustHaves = buyer.scopeItems.filter(s => s.priority === 'must-have').map(s => s.name);
    for (const mh of mustHaves) {
      if (!clamped.scopeItems.some(s => s.toLowerCase().includes(mh.toLowerCase()) || mh.toLowerCase().includes(s.toLowerCase()))) {
        violations.push(`Offer was missing mandatory must-have scope "${mh}". Re-injected into scope.`);
        clamped.scopeItems.push(mh);
      }
    }

    clamped.utilityBuyer = calculateBuyerUtility(clamped, buyer);
    clamped.utilitySeller = calculateSellerUtility(clamped, seller);

    return {
      isValid: violations.length === 0,
      clampedOffer: clamped,
      violations
    };
  }
}

export const negotiationEngine = new NegotiationEngine();
