import fs from 'fs';
import path from 'path';
import {
  BuyerProfile,
  SellerProfile,
  PackageOffer,
  PaymentTerm,
  BuyerStrategy,
  SellerStrategy
} from './types.js';
import { negotiationEngine } from './engine.js';
import { calculateBuyerUtility, calculateSellerUtility } from './utility.js';

export interface SimulationResult {
  totalNegotiations: number;
  agreementsReached: number;
  agreementRatePct: number;
  averageRoundsToAgreement: number;
  softFloorDealsCount: number;
  softFloorDealsPct: number;
  cleanNoDealsCount: number;
  cleanNoDealsPct: number;
  tradesDistribution: {
    deadlineTrades: number;
    scopeTrades: number;
    paymentTermTrades: number;
    priceConcessions: number;
  };
  sampleTranscripts: {
    normalDeal: any;
    softFloorDeal: any;
    cleanNoDeal: any;
  };
}

const BUYER_STRATEGIES: BuyerStrategy[] = ['conceder', 'linear', 'hard-line'];
const SELLER_STRATEGIES: SellerStrategy[] = ['value-trader', 'volume-seeker', 'firm'];

export function runNegotiationSimulation(count = 100): SimulationResult {
  let agreements = 0;
  let totalRounds = 0;
  let softFloorCount = 0;
  let emptyZopaCount = 0;

  const trades = {
    deadlineTrades: 0,
    scopeTrades: 0,
    paymentTermTrades: 0,
    priceConcessions: 0
  };

  let normalDealTranscript: any = null;
  let softFloorDealTranscript: any = null;
  let cleanNoDealTranscript: any = null;

  for (let i = 0; i < count; i++) {
    // 15% of simulations are designed with truly incompatible constraints / empty ZOPA
    const isEmptyZopaCase = i < 15;
    const isSoftFloorCase = i >= 15 && i < 45;

    // Buyer constraints
    const maxBudget = isEmptyZopaCase ? Math.floor(90 + Math.random() * 25) : Math.floor(160 + Math.random() * 80); // 90-115 vs 160-240
    const targetPrice = Math.floor(maxBudget * 0.70);
    const latestDays = isEmptyZopaCase && Math.random() > 0.5 ? 2 : Math.floor(5 + Math.random() * 5); // 5-9 days
    const idealDays = Math.max(2, latestDays - 2);

    const buyerStrategy = isSoftFloorCase ? 'conceder' : BUYER_STRATEGIES[i % BUYER_STRATEGIES.length];

    const buyer: BuyerProfile = {
      id: `sim_buyer_${i}`,
      userId: `usr_b_${i}`,
      agentId: `agt_b_${i}`,
      displayName: `Buyer ${i}`,
      targetPrice,
      maxBudget,
      idealDeliveryDays: idealDays,
      latestDeliveryDays: latestDays,
      scopeItems: [
        { id: 's1', name: 'Core Architecture', priority: 'must-have' },
        { id: 's2', name: 'API Integration', priority: 'must-have' },
        { id: 's3', name: 'Performance Benchmarks', priority: 'nice-to-have' }
      ],
      acceptedPaymentTerms: ['escrow_milestone', 'upfront'],
      preferredPaymentTerm: 'escrow_milestone',
      weights: { price: 0.50, time: 0.25, scope: 0.15, terms: 0.10 },
      strategy: buyerStrategy
    };

    // Seller constraints
    const listPrice = Math.floor(maxBudget * (isEmptyZopaCase ? 1.5 : 1.15));
    const standardFloor = Math.floor(isEmptyZopaCase ? maxBudget + 30 : maxBudget * 0.85);
    const stretchPct = 0.12;
    const hardFloor = Math.round(standardFloor * (1 - stretchPct));
    const capacity = isSoftFloorCase ? 8 : Math.floor(3 + Math.random() * 7);

    const sellerStrategy = SELLER_STRATEGIES[i % SELLER_STRATEGIES.length];

    const seller: SellerProfile = {
      id: `sim_seller_${i}`,
      userId: `usr_s_${i}`,
      agentId: `agt_s_${i}`,
      businessName: `Seller Studio ${i}`,
      listPrice,
      standardFloor,
      stretchPct,
      hardFloor,
      capacity,
      minDeliveryDays: isEmptyZopaCase && latestDays === 2 ? 4 : 2,
      standardDeliveryDays: 5,
      rushFeePctPerDay: 0.10,
      discounts: {
        longerDeadlinePctPerDay: 0.02,
        scopeReductionPctPerItem: 0.08,
        repeatBuyerPct: 0.05,
        upfrontPaymentPct: 0.06,
        bundlePct: 0.05
      },
      weights: { price: 0.50, time: 0.25, scope: 0.15, terms: 0.10 },
      strategy: sellerStrategy
    };

    // Run bilateral autonomous multi-issue loop
    const transcript: any[] = [];
    let currentRound = 1;
    let agreementReached = false;
    let dealPrice = 0;

    // Round 1: Seller opening proposal
    let currentOffer = negotiationEngine.generateOpeningSellerOffer(seller, buyer);
    transcript.push({
      turn: 1,
      round: 1,
      sender: seller.businessName,
      role: 'seller',
      action: 'opening_proposal',
      offer: {
        price: currentOffer.price,
        deliveryDays: currentOffer.deliveryDays,
        scopeItems: currentOffer.scopeItems,
        paymentTerms: currentOffer.paymentTerms
      },
      tradesMade: currentOffer.tradesMade,
      utility: currentOffer.utilitySeller
    });

    while (currentRound <= 4 && !agreementReached) {
      // Buyer response
      const buyerAction = negotiationEngine.generateBuyerResponse(buyer, seller, currentOffer, currentRound);
      if (buyerAction.action === 'acceptance') {
        agreementReached = true;
        dealPrice = currentOffer.price;
        transcript.push({
          turn: currentRound * 2,
          round: currentRound,
          sender: buyer.displayName,
          role: 'buyer',
          action: 'acceptance',
          acceptedOffer: { price: currentOffer.price, deliveryDays: currentOffer.deliveryDays }
        });
        break;
      }

      if (buyerAction.action === 'rejection') {
        transcript.push({
          turn: currentRound * 2,
          round: currentRound,
          sender: buyer.displayName,
          role: 'buyer',
          action: 'rejection',
          reason: buyerAction.reason
        });
        if (buyerAction.reason?.includes('ZOPA') || buyerAction.reason?.includes('timeline')) {
          emptyZopaCount++;
        }
        break;
      }

      // Buyer counteroffer
      const buyerOffer = buyerAction.offer!;
      currentOffer = buyerOffer;
      if (buyerOffer.deliveryDays > buyer.idealDeliveryDays) trades.deadlineTrades++;
      if (buyerOffer.scopeItems.length < buyer.scopeItems.length) trades.scopeTrades++;
      if (buyerOffer.paymentTerms === 'upfront') trades.paymentTermTrades++;
      trades.priceConcessions++;

      transcript.push({
        turn: currentRound * 2,
        round: currentRound,
        sender: buyer.displayName,
        role: 'buyer',
        action: 'counteroffer',
        offer: {
          price: buyerOffer.price,
          deliveryDays: buyerOffer.deliveryDays,
          scopeItems: buyerOffer.scopeItems,
          paymentTerms: buyerOffer.paymentTerms
        },
        tradesMade: buyerOffer.tradesMade,
        utility: buyerOffer.utilityBuyer
      });

      // Seller response
      const sellerAction = negotiationEngine.generateSellerResponse(seller, buyer, buyerOffer, currentRound);
      if (sellerAction.action === 'acceptance') {
        agreementReached = true;
        dealPrice = buyerOffer.price;
        transcript.push({
          turn: currentRound * 2 + 1,
          round: currentRound,
          sender: seller.businessName,
          role: 'seller',
          action: 'acceptance',
          acceptedOffer: { price: buyerOffer.price, deliveryDays: buyerOffer.deliveryDays }
        });
        break;
      }

      if (sellerAction.action === 'rejection') {
        transcript.push({
          turn: currentRound * 2 + 1,
          round: currentRound,
          sender: seller.businessName,
          role: 'seller',
          action: 'rejection',
          reason: sellerAction.reason
        });
        break;
      }

      // Seller counteroffer
      currentOffer = sellerAction.offer!;
      trades.priceConcessions++;
      if (currentOffer.deliveryDays !== seller.standardDeliveryDays) trades.deadlineTrades++;

      transcript.push({
        turn: currentRound * 2 + 1,
        round: currentRound,
        sender: seller.businessName,
        role: 'seller',
        action: 'counteroffer',
        offer: {
          price: currentOffer.price,
          deliveryDays: currentOffer.deliveryDays,
          scopeItems: currentOffer.scopeItems,
          paymentTerms: currentOffer.paymentTerms
        },
        tradesMade: currentOffer.tradesMade,
        utility: currentOffer.utilitySeller
      });

      currentRound++;
    }

    if (agreementReached) {
      agreements++;
      totalRounds += currentRound;
      const isSoft = dealPrice < seller.standardFloor;
      if (isSoft) {
        softFloorCount++;
      }

      if (isSoft && !softFloorDealTranscript) {
        softFloorDealTranscript = {
          title: 'Transcript 2: Soft-Floor Deal (Dipped below standard floor in exchange for non-price concessions)',
          buyer: { budget: buyer.maxBudget, target: buyer.targetPrice, strategy: buyer.strategy },
          seller: { standardFloor: seller.standardFloor, hardFloor: seller.hardFloor, listPrice: seller.listPrice, capacity: seller.capacity },
          finalPrice: dealPrice,
          rounds: currentRound,
          turns: transcript
        };
      } else if (!isSoft && !normalDealTranscript && currentRound >= 2) {
        normalDealTranscript = {
          title: 'Transcript 1: Normal Multi-Issue Deal (Price and timeline traded)',
          buyer: { budget: buyer.maxBudget, target: buyer.targetPrice, strategy: buyer.strategy },
          seller: { standardFloor: seller.standardFloor, hardFloor: seller.hardFloor, listPrice: seller.listPrice },
          finalPrice: dealPrice,
          rounds: currentRound,
          turns: transcript
        };
      }
    } else {
      if (!cleanNoDealTranscript && transcript.some(t => t.action === 'rejection')) {
        cleanNoDealTranscript = {
          title: 'Transcript 3: Clean No-Deal (Requirements incompatible / Empty ZOPA)',
          buyer: { budget: buyer.maxBudget, latestDays: buyer.latestDeliveryDays },
          seller: { hardFloor: seller.hardFloor, minDays: seller.minDeliveryDays },
          rounds: currentRound,
          turns: transcript
        };
      }
    }
  }

  return {
    totalNegotiations: count,
    agreementsReached: agreements,
    agreementRatePct: Math.round((agreements / count) * 100),
    averageRoundsToAgreement: agreements > 0 ? Math.round((totalRounds / agreements) * 10) / 10 : 0,
    softFloorDealsCount: softFloorCount,
    softFloorDealsPct: agreements > 0 ? Math.round((softFloorCount / agreements) * 100) : 0,
    cleanNoDealsCount: count - agreements,
    cleanNoDealsPct: Math.round(((count - agreements) / count) * 100),
    tradesDistribution: trades,
    sampleTranscripts: {
      normalDeal: normalDealTranscript,
      softFloorDeal: softFloorDealTranscript,
      cleanNoDeal: cleanNoDealTranscript
    }
  };
}

// Standalone execution when invoked directly via node/tsx
if (process.argv[1]?.includes('simulate')) {
  console.log('=== Running 100 Autonomous Multi-Issue Negotiations ===');
  const results = runNegotiationSimulation(100);
  console.log(`Total Negotiations: ${results.totalNegotiations}`);
  console.log(`Agreements Reached: ${results.agreementsReached} (${results.agreementRatePct}%)`);
  console.log(`Average Rounds to Agreement: ${results.averageRoundsToAgreement}`);
  console.log(`Soft-Floor Deals (price < standard floor): ${results.softFloorDealsCount} (${results.softFloorDealsPct}% of closed deals)`);
  console.log(`Clean No-Deals (incompatible constraints): ${results.cleanNoDealsCount} (${results.cleanNoDealsPct}%)`);
  console.log('\nTrades Distribution:');
  console.log(`- Deadline / Turnaround Days Traded: ${results.tradesDistribution.deadlineTrades}`);
  console.log(`- Scope Items Conceded / Added: ${results.tradesDistribution.scopeTrades}`);
  console.log(`- Upfront Payment Terms Traded: ${results.tradesDistribution.paymentTermTrades}`);
  console.log(`- Direct Price Concessions: ${results.tradesDistribution.priceConcessions}`);

  // Write transcripts to brain/artifacts directory
  const outDir = 'C:/Users/User/.gemini/antigravity/brain/907977bc-7293-4960-b427-dba2a6d2f786';
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(path.join(outDir, 'transcript_normal_deal.json'), JSON.stringify(results.sampleTranscripts.normalDeal, null, 2));
  fs.writeFileSync(path.join(outDir, 'transcript_soft_floor_deal.json'), JSON.stringify(results.sampleTranscripts.softFloorDeal, null, 2));
  fs.writeFileSync(path.join(outDir, 'transcript_no_deal.json'), JSON.stringify(results.sampleTranscripts.cleanNoDeal, null, 2));
  console.log('\nSuccessfully saved sample transcripts to artifacts directory.');
}
