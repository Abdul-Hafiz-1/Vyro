import {
  FlexibilityTier,
  parseMoneyToCents,
  roundNaturalCents,
  formatCents,
  computeBuyerHardCapCents,
  computeSellerAbsoluteMinCents,
} from './money.js';
import { PaymentTerm, BuyerStrategy, SellerStrategy } from './types.js';

export interface DeterministicBuyerInput {
  targetCents: number;
  budgetCents: number;
  flexibility: FlexibilityTier;
  hardCapCents: number;
  idealDeliveryDays: number;
  latestDeliveryDays: number;
  mustHaves: string[];
  niceToHaves: string[];
  strategy: BuyerStrategy;
}

export interface DeterministicSellerInput {
  listPriceCents: number;
  standardLowestCents: number;
  flexibility: FlexibilityTier;
  absoluteMinCents: number;
  minDeliveryDays: number;
  standardDeliveryDays: number;
  capacity: number; // 1-10
  strategy: SellerStrategy;
}

export interface OfferSnapshot {
  round: number;
  senderRole: 'buyer' | 'seller';
  priceCents: number;
  deliveryDays: number;
  scope: string[];
  revisions: number;
  paymentTerms: PaymentTerm;
}

export type AlgorithmAction = 'counter' | 'accept' | 'escalate' | 'decline';

export interface AlgorithmDecision {
  action: AlgorithmAction;
  priceCents: number;
  deliveryDays: number;
  scope: string[];
  revisions: number;
  paymentTerms: PaymentTerm;
  inStretchZone: boolean;
  stretchSide: 'buyer' | 'seller' | null;
  whyMove: string;
  shortReasonForHuman: string;
  tradesMade: string[];
  noOverlapReason?: string;
}

export interface SanityCheckResult {
  valid: boolean;
  reason?: string;
}

/**
 * Rule 6: Sanity guard validating currency, never-cross, 1.5x wrong-direction, and 10x range bounds.
 */
export function validateOfferSanity(params: {
  role: 'buyer' | 'seller';
  proposedPriceInput: string | number;
  counterpartyCurrentPriceCents?: number;
  priorOffersCents: number[];
  buyerHardCapCents?: number;
  sellerAbsoluteMinCents?: number;
}): SanityCheckResult & { parsedCents: number | null } {
  const parsedCents = parseMoneyToCents(params.proposedPriceInput);
  if (parsedCents === null || parsedCents <= 0) {
    return { valid: false, parsedCents: null, reason: 'Invalid or non-positive currency value.' };
  }

  // Never cross
  if (params.role === 'buyer' && params.counterpartyCurrentPriceCents !== undefined) {
    if (parsedCents > params.counterpartyCurrentPriceCents) {
      return {
        valid: false,
        parsedCents,
        reason: `Buyer offer ${formatCents(parsedCents)} exceeds seller ask ${formatCents(params.counterpartyCurrentPriceCents)}.`
      };
    }
    if (parsedCents > params.counterpartyCurrentPriceCents * 1.5) {
      return {
        valid: false,
        parsedCents,
        reason: `Buyer offer exceeds 1.5x counterparty price in wrong direction.`
      };
    }
  }

  if (params.role === 'seller' && params.counterpartyCurrentPriceCents !== undefined) {
    if (parsedCents < params.counterpartyCurrentPriceCents) {
      return {
        valid: false,
        parsedCents,
        reason: `Seller ask ${formatCents(parsedCents)} is below buyer bid ${formatCents(params.counterpartyCurrentPriceCents)}.`
      };
    }
    if (params.counterpartyCurrentPriceCents > 0 && parsedCents < params.counterpartyCurrentPriceCents / 1.5 && params.priorOffersCents.length === 0) {
      return {
        valid: false,
        parsedCents,
        reason: `Seller ask dropped below 1.5x ratio inappropriately.`
      };
    }
  }

  // Within 10x of any prior offer in this negotiation
  for (const prior of params.priorOffersCents) {
    if (prior > 0 && (parsedCents > prior * 10 || parsedCents < prior / 10)) {
      return {
        valid: false,
        parsedCents,
        reason: `Offer ${formatCents(parsedCents)} is outside 10x sanity band of prior offer ${formatCents(prior)}.`
      };
    }
  }

  // Hard zone boundary check
  if (params.role === 'buyer' && params.buyerHardCapCents !== undefined && parsedCents > params.buyerHardCapCents) {
    return {
      valid: false,
      parsedCents,
      reason: `Offer ${formatCents(parsedCents)} exceeds buyer hard cap ${formatCents(params.buyerHardCapCents)}.`
    };
  }
  if (params.role === 'seller' && params.sellerAbsoluteMinCents !== undefined && parsedCents < params.sellerAbsoluteMinCents) {
    return {
      valid: false,
      parsedCents,
      reason: `Ask ${formatCents(parsedCents)} violates seller absolute minimum ${formatCents(params.sellerAbsoluteMinCents)}.`
    };
  }

  return { valid: true, parsedCents };
}

/**
 * Checks if any ZOPA exists considering both sides' stretch caps.
 */
export function checkOverlap(
  buyerHardCapCents: number,
  sellerAbsoluteMinCents: number,
  buyerLatestDays: number,
  sellerMinDays: number
): { hasOverlap: boolean; reason?: string } {
  if (sellerAbsoluteMinCents > buyerHardCapCents) {
    return {
      hasOverlap: false,
      reason: `No deal because the seller's lowest possible rate (${formatCents(sellerAbsoluteMinCents)}) is above your hard stretch limit (${formatCents(buyerHardCapCents)}).`
    };
  }
  if (sellerMinDays > buyerLatestDays) {
    return {
      hasOverlap: false,
      reason: `No deal because the seller's fastest turnaround (${sellerMinDays} days) exceeds your deadline (${buyerLatestDays} days).`
    };
  }
  return { hasOverlap: true };
}

function getStrategyMultiplier(strategy: BuyerStrategy | SellerStrategy, round: number): number {
  const t = Math.min(1, Math.max(0, (round - 1) / 6));
  if (strategy === 'conceder' || strategy === 'volume-seeker') {
    return 1.2 - 0.3 * t;
  }
  if (strategy === 'hard-line' || strategy === 'firm') {
    return 0.72 + 0.45 * t;
  }
  return 1.0 - 0.1 * t; // linear / value-trader
}

/**
 * Ensures nextPrice moves strictly toward counterparty by at least $1 while staying inside [minBound, maxBound].
 */
function pickMonotonicStepUp(
  prevSelfCents: number,
  desiredCents: number,
  maxBoundCents: number,
  gapCents: number
): number {
  if (prevSelfCents >= maxBoundCents) return maxBoundCents;
  const allowFine = gapCents < 2500 || (maxBoundCents - prevSelfCents) < 1000;
  let candidate = roundNaturalCents(desiredCents, allowFine);
  if (candidate <= prevSelfCents) {
    candidate = roundNaturalCents(prevSelfCents + (allowFine ? 100 : 500), allowFine);
  }
  if (candidate <= prevSelfCents) {
    candidate = prevSelfCents + 100;
  }
  return Math.min(maxBoundCents, candidate);
}

function pickMonotonicStepDown(
  prevSelfCents: number,
  desiredCents: number,
  minBoundCents: number,
  gapCents: number
): number {
  if (prevSelfCents <= minBoundCents) return minBoundCents;
  const allowFine = gapCents < 2500 || (prevSelfCents - minBoundCents) < 1000;
  let candidate = roundNaturalCents(desiredCents, allowFine);
  if (candidate >= prevSelfCents) {
    candidate = roundNaturalCents(prevSelfCents - (allowFine ? 100 : 500), allowFine);
  }
  if (candidate >= prevSelfCents) {
    candidate = prevSelfCents - 100;
  }
  return Math.max(minBoundCents, candidate);
}

/**
 * Computes Seller's deterministic turn. Never sees buyer's private budget or target!
 */
export function computeDeterministicSellerTurn(params: {
  seller: DeterministicSellerInput;
  round: number;
  history: OfferSnapshot[];
  buyerLastOffer?: OfferSnapshot;
  availableDeliverables: string[];
  requestedDeadlineDays: number;
}): AlgorithmDecision {
  const { seller, round, history, buyerLastOffer, availableDeliverables, requestedDeadlineDays } = params;
  const sellerHistory = history.filter(h => h.senderRole === 'seller');
  const buyerHistory = history.filter(h => h.senderRole === 'buyer');
  const prevSeller = sellerHistory[sellerHistory.length - 1];
  const prevBuyer = buyerHistory.length >= 2 ? buyerHistory[buyerHistory.length - 2] : undefined;

  // Rule 1: Round 1 Opening (95-100% of list price, natural rounding)
  if (round === 1 || !buyerLastOffer) {
    const openDays = Math.max(
      seller.minDeliveryDays,
      Math.min(seller.standardDeliveryDays, requestedDeadlineDays || seller.standardDeliveryDays)
    );
    const openCents = roundNaturalCents(seller.listPriceCents, seller.listPriceCents < 10000);
    const safeOpen = Math.max(seller.standardLowestCents, openCents);
    return {
      action: 'counter',
      priceCents: safeOpen,
      deliveryDays: openDays,
      scope: availableDeliverables,
      revisions: 2,
      paymentTerms: 'escrow_milestone',
      inStretchZone: false,
      stretchSide: null,
      whyMove: `Opened at our standard catalogue rate (${formatCents(safeOpen)}) for ${openDays}-day delivery.`,
      shortReasonForHuman: `Opening ask set at ${formatCents(safeOpen)} (${openDays}d delivery).`,
      tradesMade: ['Standard catalogue quote'],
    };
  }

  const buyerBid = buyerLastOffer.priceCents;
  const lastSellerAsk = prevSeller ? prevSeller.priceCents : seller.listPriceCents;
  const gapCents = Math.max(0, lastSellerAsk - buyerBid);

  // Rule 4: If buyer bid already meets or exceeds seller's comfortable floor (or last ask) -> accept!
  if (buyerBid >= lastSellerAsk || (buyerBid >= seller.standardLowestCents && round >= 2)) {
    return {
      action: 'accept',
      priceCents: buyerBid,
      deliveryDays: Math.max(seller.minDeliveryDays, buyerLastOffer.deliveryDays),
      scope: buyerLastOffer.scope.length > 0 ? buyerLastOffer.scope : availableDeliverables,
      revisions: buyerLastOffer.revisions,
      paymentTerms: buyerLastOffer.paymentTerms,
      inStretchZone: false,
      stretchSide: null,
      whyMove: `Accepted buyer's ${formatCents(buyerBid)} offer since it meets our target margin.`,
      shortReasonForHuman: `Buyer offer of ${formatCents(buyerBid)} meets standard lowest (${formatCents(seller.standardLowestCents)}).`,
      tradesMade: ['Accepted compliant offer'],
    };
  }

  // Check if buyer gave non-price concessions (upfront pay, extra days, trimmed scope)
  const buyerUpfront = buyerLastOffer.paymentTerms === 'upfront';
  const buyerExtraDays = Math.max(0, buyerLastOffer.deliveryDays - seller.standardDeliveryDays);
  const buyerReducedScope = buyerLastOffer.scope.length > 0 && buyerLastOffer.scope.length < availableDeliverables.length;
  const hasTrades = buyerUpfront || buyerExtraDays >= 1 || buyerReducedScope;

  // Only dip into stretch zone (below standardLowest) after testing standardLowest (round >= 5 and buyer offered trades)
  const canUseStretch = seller.flexibility !== 'strict' && round >= 5 && (prevSeller?.priceCents ?? seller.listPriceCents) <= seller.standardLowestCents;
  const activeFloorCents = canUseStretch ? seller.absoluteMinCents : seller.standardLowestCents;

  // If buyer bid is inside stretch zone [absoluteMin, standardLowest) and round >= 5:
  if (buyerBid >= seller.absoluteMinCents && buyerBid < seller.standardLowestCents && canUseStretch) {
    if (gapCents <= Math.round(lastSellerAsk * 0.05) || (hasTrades && round >= 5)) {
      return {
        action: 'escalate',
        priceCents: buyerBid,
        deliveryDays: Math.max(seller.minDeliveryDays, buyerLastOffer.deliveryDays),
        scope: buyerLastOffer.scope.length > 0 ? buyerLastOffer.scope : availableDeliverables,
        revisions: buyerLastOffer.revisions,
        paymentTerms: buyerLastOffer.paymentTerms,
        inStretchZone: true,
        stretchSide: 'seller',
        whyMove: `Buyer's ${formatCents(buyerBid)} offer sits inside our stretch zone.`,
        shortReasonForHuman: `Buyer offered ${formatCents(buyerBid)}, which is ${formatCents(seller.standardLowestCents - buyerBid)} below your standard lowest (${formatCents(seller.standardLowestCents)}).`,
        tradesMade: [
          ...(buyerUpfront ? ['Upfront payment discount'] : []),
          ...(buyerExtraDays > 0 ? [`+${buyerExtraDays}d extra delivery time`] : []),
          ...(buyerReducedScope ? ['Simplified deliverable scope'] : []),
        ],
      };
    }
  }

  // Rule 2 & 3: Calculate concession step toward buyerBid, paced by remaining margin so Seller doesn't dump 100% margin in Round 2
  const buyerMoveCents = prevBuyer ? Math.max(0, buyerBid - prevBuyer.priceCents) : Math.round(gapCents * 0.25);
  const minMoveCents = Math.max(100, Math.round(gapCents * 0.08));
  const reciprocityCents = buyerMoveCents > 0 ? Math.round(buyerMoveCents * 0.55) : Math.round(gapCents * 0.22);
  const curve = getStrategyMultiplier(seller.strategy, round);
  let rawStepCents = Math.max(minMoveCents, Math.round((reciprocityCents * 0.6 + gapCents * 0.25) * curve));
  const remainingMarginCents = Math.max(0, lastSellerAsk - activeFloorCents);
  if (remainingMarginCents > 1000 && round <= 4) {
    const pacedMax = Math.max(minMoveCents, Math.round(remainingMarginCents * 0.45));
    rawStepCents = Math.min(rawStepCents, pacedMax);
  }

  // Rule 5: Split the difference when gap <= 5%
  let desiredAsk = gapCents <= Math.round(lastSellerAsk * 0.05)
    ? Math.round((buyerBid + lastSellerAsk) / 2)
    : lastSellerAsk - rawStepCents;

  // Ensure never crosses below buyerBid or below activeFloor
  if (desiredAsk <= buyerBid) {
    if (buyerBid >= activeFloorCents) {
      return {
        action: buyerBid < seller.standardLowestCents ? 'escalate' : 'accept',
        priceCents: buyerBid,
        deliveryDays: Math.max(seller.minDeliveryDays, buyerLastOffer.deliveryDays),
        scope: buyerLastOffer.scope,
        revisions: buyerLastOffer.revisions,
        paymentTerms: buyerLastOffer.paymentTerms,
        inStretchZone: buyerBid < seller.standardLowestCents,
        stretchSide: buyerBid < seller.standardLowestCents ? 'seller' : null,
        whyMove: `Met buyer at ${formatCents(buyerBid)} to close the remaining gap.`,
        shortReasonForHuman: `Agreed on ${formatCents(buyerBid)} after mutual concessions.`,
        tradesMade: ['Split final gap'],
      };
    }
    desiredAsk = activeFloorCents;
  }

  let nextAskCents = pickMonotonicStepDown(lastSellerAsk, desiredAsk, activeFloorCents, gapCents);
  let nextDays = prevSeller ? prevSeller.deliveryDays : seller.standardDeliveryDays;
  let nextTerms: PaymentTerm = buyerLastOffer.paymentTerms;
  let nextRevisions = buyerLastOffer.revisions || 2;
  const tradesMade: string[] = [];

  // Rule 2: Never repeat previous price; unlock stretch zone or escalate/decline cleanly
  if (nextAskCents >= lastSellerAsk) {
    if (seller.flexibility !== 'strict' && seller.absoluteMinCents < lastSellerAsk) {
      nextAskCents = pickMonotonicStepDown(lastSellerAsk, Math.max(seller.absoluteMinCents, buyerBid), seller.absoluteMinCents, gapCents);
      nextDays = Math.min(seller.standardDeliveryDays + 2, buyerLastOffer.deliveryDays + 1);
      nextTerms = 'upfront';
      tradesMade.push(`Adjusted to ${nextDays}d & upfront release to unlock ${formatCents(nextAskCents)}`);
    } else if (buyerBid >= seller.absoluteMinCents) {
      // Price reached floor and buyer bid is inside stretch -> escalate to human with recommendation
      return {
        action: buyerBid >= seller.standardLowestCents ? 'accept' : 'escalate',
        priceCents: buyerBid,
        deliveryDays: Math.max(seller.minDeliveryDays, buyerLastOffer.deliveryDays),
        scope: buyerLastOffer.scope.length > 0 ? buyerLastOffer.scope : availableDeliverables,
        revisions: nextRevisions,
        paymentTerms: nextTerms,
        inStretchZone: buyerBid < seller.standardLowestCents,
        stretchSide: buyerBid < seller.standardLowestCents ? 'seller' : null,
        whyMove: `Reached our minimum limit (${formatCents(lastSellerAsk)}) and flagged ${formatCents(buyerBid)} for your review.`,
        shortReasonForHuman: `Buyer offered ${formatCents(buyerBid)} vs your standard lowest ${formatCents(seller.standardLowestCents)}.`,
        tradesMade: [`Escalated at minimum threshold`],
      };
    } else if (round >= 8) {
      return {
        action: 'decline',
        priceCents: lastSellerAsk,
        deliveryDays: nextDays,
        scope: availableDeliverables,
        revisions: nextRevisions,
        paymentTerms: nextTerms,
        inStretchZone: false,
        stretchSide: null,
        whyMove: `Reached our absolute minimum (${formatCents(seller.absoluteMinCents)}) without bridging the gap to ${formatCents(buyerBid)}.`,
        shortReasonForHuman: `No deal because buyer stayed at ${formatCents(buyerBid)}, below your absolute minimum (${formatCents(seller.absoluteMinCents)}).`,
        tradesMade: ['Reached absolute minimum without overlap'],
        noOverlapReason: `No deal because buyer offered ${formatCents(buyerBid)}, below your absolute minimum of ${formatCents(seller.absoluteMinCents)}.`,
      };
    } else {
      // Cannot repeat same price and still before round 8: escalate cleanly with current gap instead of premature decline or zero-move
      return {
        action: 'escalate',
        priceCents: lastSellerAsk,
        deliveryDays: nextDays,
        scope: availableDeliverables,
        revisions: nextRevisions,
        paymentTerms: nextTerms,
        inStretchZone: lastSellerAsk < seller.standardLowestCents,
        stretchSide: lastSellerAsk < seller.standardLowestCents ? 'seller' : 'buyer',
        whyMove: `Reached our limit at ${formatCents(lastSellerAsk)} while buyer offered ${formatCents(buyerBid)}. Escalating for owner decision.`,
        shortReasonForHuman: `Negotiation reached ${formatCents(lastSellerAsk)} ask vs ${formatCents(buyerBid)} offer — needs human decision.`,
        tradesMade: ['Escalated near floor limit'],
      };
    }
  }

  // Rule 4: If counteroffer would match or cross buyerBid -> accept or escalate instead!
  if (nextAskCents <= buyerBid) {
    return {
      action: buyerBid < seller.standardLowestCents ? 'escalate' : 'accept',
      priceCents: buyerBid,
      deliveryDays: Math.max(seller.minDeliveryDays, buyerLastOffer.deliveryDays),
      scope: buyerLastOffer.scope.length > 0 ? buyerLastOffer.scope : availableDeliverables,
      revisions: nextRevisions,
      paymentTerms: nextTerms,
      inStretchZone: buyerBid < seller.standardLowestCents,
      stretchSide: buyerBid < seller.standardLowestCents ? 'seller' : null,
      whyMove: `Met buyer at ${formatCents(buyerBid)} to close the remaining gap.`,
      shortReasonForHuman: buyerBid < seller.standardLowestCents
        ? `Buyer's ${formatCents(buyerBid)} offer needs your OK (below ${formatCents(seller.standardLowestCents)}).`
        : `Agreed on ${formatCents(buyerBid)}.`,
      tradesMade: ['Closed gap'],
    };
  }

  // Never allow below absolute min
  nextAskCents = Math.max(seller.absoluteMinCents, nextAskCents);

  const sellerDrop = Math.max(0, lastSellerAsk - nextAskCents);
  const inStretch = nextAskCents < seller.standardLowestCents;

  // Rule 7 & 8: If round >= 8 and still below absolute min:
  // If seller still has unused stretch room and buyer is within reach (~15%), test absoluteMinCents in Round 8 before rejecting.
  if (round >= 8 && buyerBid < seller.absoluteMinCents) {
    if (
      seller.flexibility !== 'strict' &&
      lastSellerAsk > seller.absoluteMinCents &&
      buyerBid >= Math.round(seller.absoluteMinCents * 0.85)
    ) {
      const stretchDays = Math.min(seller.standardDeliveryDays + 2, buyerLastOffer.deliveryDays + 1);
      const stretchAsk = seller.absoluteMinCents;
      const stretchDrop = Math.max(0, lastSellerAsk - stretchAsk);
      return {
        action: 'counter',
        priceCents: stretchAsk,
        deliveryDays: stretchDays,
        scope: buyerLastOffer.scope.length > 0 ? buyerLastOffer.scope : availableDeliverables,
        revisions: nextRevisions,
        paymentTerms: 'upfront',
        inStretchZone: true,
        stretchSide: 'seller',
        whyMove: `I came down ${formatCents(stretchDrop)} to my final limit (${formatCents(stretchAsk)}) with ${stretchDays}d turnaround and upfront release.`,
        shortReasonForHuman: `Extended final stretch quote of ${formatCents(stretchAsk)} vs buyer's ${formatCents(buyerBid)}.`,
        tradesMade: [`Final stretch concession to ${formatCents(stretchAsk)}`],
      };
    }
    return {
      action: 'decline',
      priceCents: nextAskCents,
      deliveryDays: nextDays,
      scope: availableDeliverables,
      revisions: nextRevisions,
      paymentTerms: nextTerms,
      inStretchZone: false,
      stretchSide: null,
      whyMove: `We reached our absolute minimum (${formatCents(seller.absoluteMinCents)}) without bridging the gap to ${formatCents(buyerBid)}.`,
      shortReasonForHuman: `No deal because buyer stayed at ${formatCents(buyerBid)}, below our absolute minimum.`,
      tradesMade: ['Reached absolute minimum without overlap'],
      noOverlapReason: `No deal because buyer stayed at ${formatCents(buyerBid)} below your absolute minimum of ${formatCents(seller.absoluteMinCents)}.`
    };
  }

  const whyMove = sellerDrop > 0
    ? `I came down ${formatCents(sellerDrop)}${buyerMoveCents > 0 ? ` because you moved up ${formatCents(buyerMoveCents)}` : ''}.`
    : tradesMade[0] || `Held our minimum feasible rate of ${formatCents(nextAskCents)} while sweetening terms.`;

  return {
    action: 'counter',
    priceCents: nextAskCents,
    deliveryDays: nextDays,
    scope: buyerLastOffer.scope.length > 0 ? buyerLastOffer.scope : availableDeliverables,
    revisions: nextRevisions,
    paymentTerms: nextTerms,
    inStretchZone: inStretch,
    stretchSide: inStretch ? 'seller' : null,
    whyMove,
    shortReasonForHuman: sellerDrop > 0
      ? `Lowered ask by ${formatCents(sellerDrop)} to ${formatCents(nextAskCents)}.`
      : `Offered extra value at ${formatCents(nextAskCents)} (${nextDays}d).`,
    tradesMade: tradesMade.length > 0 ? tradesMade : (sellerDrop > 0 ? [`Lowered by ${formatCents(sellerDrop)}`] : ['Adjusted delivery & terms']),
  };
}

/**
 * Computes Buyer's deterministic turn.
 * Aims at target (and market-anchored opening ask), never drifts upward toward excessive budget, never crosses seller ask!
 */
export function computeDeterministicBuyerTurn(params: {
  buyer: DeterministicBuyerInput;
  round: number;
  history: OfferSnapshot[];
  sellerLastOffer: OfferSnapshot;
}): AlgorithmDecision {
  const { buyer, round, history, sellerLastOffer } = params;
  const buyerHistory = history.filter(h => h.senderRole === 'buyer');
  const sellerHistory = history.filter(h => h.senderRole === 'seller');
  const prevBuyer = buyerHistory[buyerHistory.length - 1];
  const prevSeller = sellerHistory.length >= 2 ? sellerHistory[sellerHistory.length - 2] : undefined;

  const sellerAsk = sellerLastOffer.priceCents;
  const openingAskCents = sellerHistory[0]?.priceCents || sellerAsk;

  // Market-anchored effective target prevents high-budget buyers from overpaying
  // against a much lower seller ask (Sensitivity Rule: $200 vs $500 stays within <=10%).
  const marketAnchorCents = Math.round(openingAskCents * 0.72);
  const effectiveTargetCents = Math.min(buyer.targetCents, Math.max(500, marketAnchorCents));

  // If seller ask ALREADY <= effective target and meets hard deadline on Round 1+, accept immediately!
  if (sellerAsk <= effectiveTargetCents && sellerLastOffer.deliveryDays <= buyer.latestDeliveryDays) {
    return {
      action: 'accept',
      priceCents: sellerAsk,
      deliveryDays: sellerLastOffer.deliveryDays,
      scope: sellerLastOffer.scope,
      revisions: sellerLastOffer.revisions,
      paymentTerms: sellerLastOffer.paymentTerms,
      inStretchZone: false,
      stretchSide: null,
      whyMove: `Accepted ${formatCents(sellerAsk)} immediately because it already beats our target.`,
      shortReasonForHuman: `Seller ask (${formatCents(sellerAsk)}) fits comfortably below your target.`,
      tradesMade: [`Saved ${formatCents(Math.max(0, buyer.budgetCents - sellerAsk))} vs budget`],
    };
  }

  // Round 1: Buyer opens at 70-85% of effectiveTarget (strictly <= min(budgetCents, sellerAsk - 100))
  if (!prevBuyer) {
    const rawOpen = Math.round(effectiveTargetCents * 0.78);
    const maxAllowedOpen = Math.min(buyer.budgetCents, Math.max(100, sellerAsk - 500));
    let openBid = Math.min(maxAllowedOpen, roundNaturalCents(rawOpen, rawOpen < 10000));
    if (openBid >= sellerAsk) {
      openBid = Math.max(100, sellerAsk - 500);
    }
    if (openBid > buyer.budgetCents) openBid = buyer.budgetCents;

    return {
      action: 'counter',
      priceCents: openBid,
      deliveryDays: Math.min(buyer.latestDeliveryDays, Math.max(buyer.idealDeliveryDays, sellerLastOffer.deliveryDays)),
      scope: sellerLastOffer.scope.length > 0 ? sellerLastOffer.scope : buyer.mustHaves,
      revisions: sellerLastOffer.revisions || 2,
      paymentTerms: 'escrow_milestone',
      inStretchZone: false,
      stretchSide: null,
      whyMove: `Opened at ${formatCents(openBid)} (${Math.round((openBid / Math.max(1, sellerAsk)) * 100)}% of seller's ${formatCents(sellerAsk)} ask) to leave room to negotiate.`,
      shortReasonForHuman: `Opening offer at ${formatCents(openBid)} against ${formatCents(sellerAsk)} ask.`,
      tradesMade: ['Anchored opening offer'],
    };
  }

  const prevBid = prevBuyer.priceCents;
  const gapCents = Math.max(0, sellerAsk - prevBid);
  const sellerDropCents = prevSeller ? Math.max(0, prevSeller.priceCents - sellerAsk) : 0;

  // Check if seller ask is now acceptable without overspending!
  const comfortableToClose =
    sellerAsk <= buyer.budgetCents &&
    sellerLastOffer.deliveryDays <= buyer.latestDeliveryDays &&
    (sellerAsk <= effectiveTargetCents * 1.05 || (round >= 2 && gapCents <= Math.round(sellerAsk * 0.05)) || round >= 3);

  if (comfortableToClose) {
    return {
      action: 'accept',
      priceCents: sellerAsk,
      deliveryDays: sellerLastOffer.deliveryDays,
      scope: sellerLastOffer.scope,
      revisions: sellerLastOffer.revisions,
      paymentTerms: sellerLastOffer.paymentTerms,
      inStretchZone: false,
      stretchSide: null,
      whyMove: `Accepted ${formatCents(sellerAsk)} because it sits inside your ${formatCents(buyer.budgetCents)} budget with good value.`,
      shortReasonForHuman: `Agreed at ${formatCents(sellerAsk)} (saved ${formatCents(buyer.budgetCents - sellerAsk)} vs budget).`,
      tradesMade: [`Saved ${formatCents(buyer.budgetCents - sellerAsk)} vs budget`],
    };
  }

  // If seller ask is inside buyer's stretch zone (budget < sellerAsk <= hardCap)
  if (sellerAsk > buyer.budgetCents && sellerAsk <= buyer.hardCapCents && buyer.flexibility !== 'strict') {
    if ((round >= 4 && gapCents <= Math.round(sellerAsk * 0.08)) || round >= 5) {
      return {
        action: 'escalate',
        priceCents: sellerAsk,
        deliveryDays: sellerLastOffer.deliveryDays,
        scope: sellerLastOffer.scope,
        revisions: sellerLastOffer.revisions,
        paymentTerms: sellerLastOffer.paymentTerms,
        inStretchZone: true,
        stretchSide: 'buyer',
        whyMove: `Seller came down to ${formatCents(sellerAsk)}, which is inside your stretch cap (${formatCents(buyer.hardCapCents)}). Asking for your OK.`,
        shortReasonForHuman: `Seller ask of ${formatCents(sellerAsk)} is ${formatCents(sellerAsk - buyer.budgetCents)} over your ${formatCents(buyer.budgetCents)} budget (within ${formatCents(buyer.hardCapCents)} stretch limit).`,
        tradesMade: ['Escalated stretch-zone offer for your OK'],
      };
    }
  }

  // Calculate buyer's concession step:
  // Note: cap soft round target so buyer with high budget ($500) negotiates calmly toward ~75% of seller's opening ask before climbing higher!
  const allowStretchNow = round >= 5 && buyer.flexibility !== 'strict' && sellerAsk > buyer.budgetCents;
  const activeCapCents = allowStretchNow
    ? buyer.hardCapCents
    : Math.min(buyer.budgetCents, Math.max(effectiveTargetCents + 1500, sellerAsk));

  const minMoveCents = Math.max(100, Math.round(gapCents * 0.08));
  const reciprocityCents = sellerDropCents > 0 ? Math.round(sellerDropCents * 0.45) : Math.round(gapCents * 0.22);
  const curve = getStrategyMultiplier(buyer.strategy, round);
  let rawStepCents = Math.max(minMoveCents, Math.round((reciprocityCents * 0.6 + gapCents * 0.22) * curve));
  const remainingHeadroom = Math.max(0, activeCapCents - prevBid);
  if (remainingHeadroom > 500 && round <= 6) {
    const pacedMax = Math.max(minMoveCents, Math.round(remainingHeadroom * 0.40));
    rawStepCents = Math.min(rawStepCents, pacedMax);
  }

  // Rule 5: Split difference if gap <= 5%
  let desiredBid = gapCents <= Math.round(sellerAsk * 0.05)
    ? Math.round((prevBid + sellerAsk) / 2)
    : prevBid + rawStepCents;

  // Never cross sellerAsk!
  if (desiredBid >= sellerAsk) {
    if (sellerAsk <= buyer.budgetCents) {
      return {
        action: 'accept',
        priceCents: sellerAsk,
        deliveryDays: sellerLastOffer.deliveryDays,
        scope: sellerLastOffer.scope,
        revisions: sellerLastOffer.revisions,
        paymentTerms: sellerLastOffer.paymentTerms,
        inStretchZone: false,
        stretchSide: null,
        whyMove: `Closed the remaining gap and accepted ${formatCents(sellerAsk)}.`,
        shortReasonForHuman: `Agreed at ${formatCents(sellerAsk)}.`,
        tradesMade: [`Saved ${formatCents(buyer.budgetCents - sellerAsk)} vs budget`],
      };
    }
    if (sellerAsk <= buyer.hardCapCents && buyer.flexibility !== 'strict') {
      return {
        action: 'escalate',
        priceCents: sellerAsk,
        deliveryDays: sellerLastOffer.deliveryDays,
        scope: sellerLastOffer.scope,
        revisions: sellerLastOffer.revisions,
        paymentTerms: sellerLastOffer.paymentTerms,
        inStretchZone: true,
        stretchSide: 'buyer',
        whyMove: `Recommended ${formatCents(sellerAsk)} for your OK (within stretch limit).`,
        shortReasonForHuman: `${formatCents(sellerAsk)} is within your ${formatCents(buyer.hardCapCents)} stretch cap.`,
        tradesMade: ['Requested human OK in stretch zone'],
      };
    }
    desiredBid = Math.min(activeCapCents, sellerAsk - 100);
  }

  let nextBidCents = pickMonotonicStepUp(prevBid, desiredBid, Math.min(activeCapCents, sellerAsk), gapCents);
  let nextDays = prevBuyer.deliveryDays;
  let nextTerms: PaymentTerm = prevBuyer.paymentTerms;
  let nextScope = prevBuyer.scope;
  const tradesMade: string[] = [];

  // Never repeat previous price: unlock stretch zone, escalate, or decline cleanly
  if (nextBidCents <= prevBid) {
    if (buyer.flexibility !== 'strict' && buyer.hardCapCents > prevBid) {
      const stretchTarget = Math.min(buyer.hardCapCents, sellerAsk);
      nextBidCents = pickMonotonicStepUp(prevBid, Math.min(stretchTarget, prevBid + Math.max(100, Math.round(gapCents * 0.15))), stretchTarget, gapCents);
      if (nextDays < buyer.latestDeliveryDays) {
        nextDays = buyer.latestDeliveryDays;
        tradesMade.push(`Changed delivery ${prevBuyer.deliveryDays} → ${nextDays} days`);
      }
      if (nextTerms !== 'upfront') {
        nextTerms = 'upfront';
        tradesMade.push('Offered upfront escrow release');
      }
    }
  }

  // If STILL cannot move price upward cleanly (pinned at hardCap), escalate if seller ask <= hardCap or close within stretch
  if (nextBidCents <= prevBid) {
    if (sellerAsk <= buyer.hardCapCents) {
      return {
        action: sellerAsk <= buyer.budgetCents ? 'accept' : 'escalate',
        priceCents: sellerAsk,
        deliveryDays: sellerLastOffer.deliveryDays,
        scope: sellerLastOffer.scope,
        revisions: sellerLastOffer.revisions,
        paymentTerms: sellerLastOffer.paymentTerms,
        inStretchZone: sellerAsk > buyer.budgetCents,
        stretchSide: sellerAsk > buyer.budgetCents ? 'buyer' : null,
        whyMove: `Reached cap at ${formatCents(prevBid)}; escalating seller's ${formatCents(sellerAsk)} ask for your OK.`,
        shortReasonForHuman: `${formatCents(sellerAsk)} is ${formatCents(sellerAsk - buyer.budgetCents)} over your ${formatCents(buyer.budgetCents)} budget (within ${formatCents(buyer.hardCapCents)} stretch limit).`,
        tradesMade: ['Escalated stretch-zone offer for your OK'],
      };
    }
    if (round < 8 && sellerAsk <= Math.round(buyer.hardCapCents * 1.15)) {
      return {
        action: 'escalate',
        priceCents: sellerAsk,
        deliveryDays: sellerLastOffer.deliveryDays,
        scope: sellerLastOffer.scope,
        revisions: sellerLastOffer.revisions,
        paymentTerms: sellerLastOffer.paymentTerms,
        inStretchZone: true,
        stretchSide: 'buyer',
        whyMove: `Reached cap at ${formatCents(prevBid)}; seller ask (${formatCents(sellerAsk)}) is close enough for human review.`,
        shortReasonForHuman: `Seller asks ${formatCents(sellerAsk)} vs your ${formatCents(buyer.budgetCents)} budget (hard cap ${formatCents(buyer.hardCapCents)}).`,
        tradesMade: ['Escalated close gap for human decision'],
      };
    }
    return {
      action: 'decline',
      priceCents: prevBid,
      deliveryDays: nextDays,
      scope: nextScope,
      revisions: sellerLastOffer.revisions,
      paymentTerms: nextTerms,
      inStretchZone: false,
      stretchSide: null,
      whyMove: `Reached hard cap (${formatCents(buyer.hardCapCents)}) with seller at ${formatCents(sellerAsk)}.`,
      shortReasonForHuman: `No deal because seller stayed at ${formatCents(sellerAsk)}, above your hard cap (${formatCents(buyer.hardCapCents)}).`,
      tradesMade: ['Reached hard cap without overlap'],
      noOverlapReason: `No deal because seller's lowest offer (${formatCents(sellerAsk)}) exceeds your hard cap of ${formatCents(buyer.hardCapCents)}.`
    };
  }

  // Rule 4: If counteroffer would match or cross sellerAsk -> accept or escalate!
  if (nextBidCents >= sellerAsk) {
    if (sellerAsk <= buyer.budgetCents) {
      return {
        action: 'accept',
        priceCents: sellerAsk,
        deliveryDays: sellerLastOffer.deliveryDays,
        scope: sellerLastOffer.scope,
        revisions: sellerLastOffer.revisions,
        paymentTerms: sellerLastOffer.paymentTerms,
        inStretchZone: false,
        stretchSide: null,
        whyMove: `Closed the remaining gap and accepted ${formatCents(sellerAsk)}.`,
        shortReasonForHuman: `Agreed at ${formatCents(sellerAsk)} (saved ${formatCents(buyer.budgetCents - sellerAsk)} vs budget).`,
        tradesMade: [`Saved ${formatCents(buyer.budgetCents - sellerAsk)} vs budget`],
      };
    }
    return {
      action: 'escalate',
      priceCents: sellerAsk,
      deliveryDays: sellerLastOffer.deliveryDays,
      scope: sellerLastOffer.scope,
      revisions: sellerLastOffer.revisions,
      paymentTerms: sellerLastOffer.paymentTerms,
      inStretchZone: true,
      stretchSide: 'buyer',
      whyMove: `Recommended ${formatCents(sellerAsk)} for your OK (within stretch limit).`,
      shortReasonForHuman: `${formatCents(sellerAsk)} is ${formatCents(sellerAsk - buyer.budgetCents)} over your budget (${formatCents(buyer.budgetCents)}).`,
      tradesMade: ['Requested human OK in stretch zone'],
    };
  }

  const buyerRise = Math.max(0, nextBidCents - prevBid);
  const inStretch = nextBidCents > buyer.budgetCents;

  // Also check if trading terms makes package attractive
  if (round === 2 && nextTerms !== 'upfront' && sellerAsk > buyer.budgetCents) {
    nextTerms = 'upfront';
    tradesMade.push('Offered upfront escrow release');
  }
  if (round >= 2 && nextDays < buyer.latestDeliveryDays && sellerAsk > effectiveTargetCents) {
    const oldD = nextDays;
    nextDays = Math.min(buyer.latestDeliveryDays, oldD + 2);
    if (nextDays > oldD) tradesMade.push(`Changed delivery ${oldD} → ${nextDays} days`);
  }

  const whyMove = buyerRise > 0
    ? `I came up ${formatCents(buyerRise)}${sellerDropCents > 0 ? ` because you moved down ${formatCents(sellerDropCents)}` : ' to bridge the gap'}.`
    : tradesMade[0] || `Held at ${formatCents(nextBidCents)} while offering better delivery/payment terms.`;

  return {
    action: 'counter',
    priceCents: nextBidCents,
    deliveryDays: nextDays,
    scope: nextScope,
    revisions: sellerLastOffer.revisions || 2,
    paymentTerms: nextTerms,
    inStretchZone: inStretch,
    stretchSide: inStretch ? 'buyer' : null,
    whyMove,
    shortReasonForHuman: buyerRise > 0
      ? `Raised offer by ${formatCents(buyerRise)} to ${formatCents(nextBidCents)}.`
      : `Sweetened non-price terms at ${formatCents(nextBidCents)}.`,
    tradesMade: tradesMade.length > 0 ? tradesMade : (buyerRise > 0 ? [`Raised by ${formatCents(buyerRise)}`] : ['Adjusted delivery & payment terms']),
  };
}

export { computeBuyerHardCapCents, computeSellerAbsoluteMinCents };
