import { BuyerProfile, SellerProfile, PackageOffer, TradeEvaluation } from './types.js';

/**
 * Computes the multi-issue utility of an offer from the Buyer's private perspective.
 * Scale: 0.0 (unacceptable / hard boundaries breached) to 1.0 (ideal package).
 */
export function calculateBuyerUtility(offer: PackageOffer, buyer: BuyerProfile): number {
  // Hard constraint 1: Price cannot exceed maxBudget
  if (offer.price > buyer.maxBudget) {
    return 0.0;
  }

  // Hard constraint 2: Delivery cannot exceed latestDeliveryDays
  if (offer.deliveryDays > buyer.latestDeliveryDays) {
    return 0.0;
  }

  // Hard constraint 3: Payment term must be accepted
  if (!buyer.acceptedPaymentTerms.includes(offer.paymentTerms)) {
    return 0.0;
  }

  // Hard constraint 4: Must contain all must-have scope items
  const mustHaves = buyer.scopeItems.filter(s => s.priority === 'must-have').map(s => s.name.toLowerCase());
  const offeredScope = offer.scopeItems.map(s => s.toLowerCase());
  for (const mh of mustHaves) {
    if (!offeredScope.some(s => s.includes(mh) || mh.includes(s))) {
      return 0.0; // Missing must-have deliverable
    }
  }

  // 1. Price Utility (lower price is higher utility)
  const priceRange = Math.max(1, buyer.maxBudget - buyer.targetPrice);
  const priceScore = Math.max(0, Math.min(1, 1 - (offer.price - buyer.targetPrice) / priceRange));

  // 2. Time Utility (shorter delivery is higher utility)
  const timeRange = Math.max(1, buyer.latestDeliveryDays - buyer.idealDeliveryDays);
  const timeScore = Math.max(0, Math.min(1, 1 - (offer.deliveryDays - buyer.idealDeliveryDays) / timeRange));

  // 3. Scope Utility (included nice-to-haves add bonus score)
  const niceToHaves = buyer.scopeItems.filter(s => s.priority === 'nice-to-have');
  let scopeScore = 1.0;
  if (niceToHaves.length > 0) {
    const includedNice = niceToHaves.filter(nth =>
      offeredScope.some(s => s.includes(nth.name.toLowerCase()) || nth.name.toLowerCase().includes(s))
    ).length;
    scopeScore = 0.7 + 0.3 * (includedNice / niceToHaves.length);
  }

  // 4. Payment Terms Utility
  let termsScore = 0.8;
  if (offer.paymentTerms === buyer.preferredPaymentTerm) {
    termsScore = 1.0;
  } else if (offer.paymentTerms === 'upfront') {
    termsScore = 0.7; // Upfront has slightly lower utility for buyer
  }

  // 5. Revisions bonus
  const revisionsScore = Math.min(1.0, 0.7 + (offer.revisions * 0.1));

  // Weighted combination
  const w = buyer.weights;
  const totalWeight = w.price + w.time + w.scope + w.terms;
  const u = (
    (w.price * priceScore) +
    (w.time * timeScore) +
    (w.scope * (scopeScore * 0.85 + revisionsScore * 0.15)) +
    (w.terms * termsScore)
  ) / totalWeight;

  return Math.round(Math.max(0, Math.min(1, u)) * 1000) / 1000;
}

/**
 * Computes the multi-issue utility of an offer from the Seller's private perspective.
 * Scale: 0.0 (unacceptable / hard floor breached) to 1.0 (list price / maximum value).
 */
export function calculateSellerUtility(offer: PackageOffer, seller: SellerProfile): number {
  // Hard constraint 1: Price cannot be below hardFloor
  if (offer.price < seller.hardFloor) {
    return 0.0;
  }

  // Hard constraint 2: Delivery cannot be faster than minDeliveryDays
  if (offer.deliveryDays < seller.minDeliveryDays) {
    return 0.0;
  }

  // 1. Price Utility (higher price is higher utility)
  const priceRange = Math.max(1, seller.listPrice - seller.hardFloor);
  const priceScore = Math.max(0, Math.min(1, (offer.price - seller.hardFloor) / priceRange));

  // 2. Time Utility (more delivery days gives seller more breathing room / higher utility)
  const timeScore = Math.max(0, Math.min(1,
    (offer.deliveryDays - seller.minDeliveryDays) / Math.max(1, seller.standardDeliveryDays * 1.5 - seller.minDeliveryDays)
  ));

  // 3. Scope Utility (smaller scope requested for given price gives seller higher margin)
  // Standard baseline = 3 deliverables
  const scopeCount = Math.max(1, offer.scopeItems.length);
  const scopeScore = Math.max(0, Math.min(1, 1 - (scopeCount - 1) * 0.15));

  // 4. Payment Terms Utility (upfront instant capture gives seller highest security)
  let termsScore = 0.7;
  if (offer.paymentTerms === 'upfront') {
    termsScore = 1.0;
  } else if (offer.paymentTerms === 'escrow_milestone') {
    termsScore = 0.85;
  } else if (offer.paymentTerms === 'net_30') {
    termsScore = 0.5;
  }

  // 5. Capacity adjustment (spare capacity makes concessions more acceptable)
  const capacityMultiplier = 0.9 + (seller.capacity / 50); // 0.92 to 1.1

  const w = seller.weights;
  const totalWeight = w.price + w.time + w.scope + w.terms;
  const u = ((
    (w.price * priceScore) +
    (w.time * timeScore) +
    (w.scope * scopeScore) +
    (w.terms * termsScore)
  ) / totalWeight) * capacityMultiplier;

  return Math.round(Math.max(0, Math.min(1, u)) * 1000) / 1000;
}

/**
 * Evaluates the specific trade exchange between an outgoing offer and a counteroffer.
 */
export function analyzeTrade(prevOffer: PackageOffer, newOffer: PackageOffer): TradeEvaluation {
  const priceDelta = newOffer.price - prevOffer.price;
  const timeDelta = newOffer.deliveryDays - prevOffer.deliveryDays;
  
  const prevScope = new Set(prevOffer.scopeItems);
  const newScope = new Set(newOffer.scopeItems);
  const removedScope = prevOffer.scopeItems.filter(s => !newScope.has(s));
  const addedScope = newOffer.scopeItems.filter(s => !prevScope.has(s));

  const termsChanged = prevOffer.paymentTerms !== newOffer.paymentTerms;

  const buyerGave: string[] = [];
  const sellerGave: string[] = [];

  if (newOffer.senderRole === 'buyer') {
    if (priceDelta > 0) buyerGave.push(`+$${priceDelta} price increase`);
    if (timeDelta > 0) buyerGave.push(`+${timeDelta} extra turnaround days`);
    if (removedScope.length > 0) buyerGave.push(`Relinquished scope: ${removedScope.join(', ')}`);
    if (newOffer.paymentTerms === 'upfront') buyerGave.push('Offered upfront payment');

    if (priceDelta < 0) sellerGave.push(`-$${Math.abs(priceDelta)} discount requested`);
    if (addedScope.length > 0) sellerGave.push(`Requested additional deliverables`);
  } else {
    // Sender is seller
    if (priceDelta < 0) sellerGave.push(`-$${Math.abs(priceDelta)} price concession`);
    if (timeDelta < 0) sellerGave.push(`${Math.abs(timeDelta)} days expedited delivery`);
    if (addedScope.length > 0) sellerGave.push(`Added scope deliverables: ${addedScope.join(', ')}`);

    if (timeDelta > 0) buyerGave.push(`Accepted +${timeDelta} delivery days`);
    if (removedScope.length > 0) buyerGave.push(`Accepted simplified scope`);
  }

  const summary = newOffer.senderRole === 'buyer'
    ? (buyerGave.length > 0 ? `Buyer conceded: ${buyerGave.join('; ')}` : 'Buyer adjusted target')
    : (sellerGave.length > 0 ? `Seller conceded: ${sellerGave.join('; ')}` : 'Seller updated terms');

  return {
    priceDelta,
    timeDelta,
    scopeDelta: [...addedScope.map(s => `+${s}`), ...removedScope.map(s => `-${s}`)],
    termsChanged,
    buyerGave,
    sellerGave,
    summary
  };
}
