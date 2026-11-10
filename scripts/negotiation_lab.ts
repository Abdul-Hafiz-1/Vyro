import fs from 'node:fs';
import path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../server/src/db/store.js';
import { seedDatabase } from '../server/src/db/seed.js';
import { geminiService } from '../server/src/services/ai/gemini.js';
import { negotiationOrchestrator, buildSellerProfile } from '../server/src/services/negotiation/orchestrator.js';
import {
  FlexibilityTier,
  dollarsToCents,
  centsToDollars,
  formatCents,
  computeBuyerHardCapCents,
  computeSellerAbsoluteMinCents,
} from '../server/src/services/negotiation/money.js';
import {
  OfferSnapshot,
  computeDeterministicBuyerTurn,
  computeDeterministicSellerTurn,
  checkOverlap,
  validateOfferSanity,
} from '../server/src/services/negotiation/algorithm.js';
import { Agent, CommerceRequest, Negotiation } from '../server/src/types/index.js';

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function run300PairLab() {
  console.log('=== PART 5A: 300 RANDOMIZED BUYER/SELLER PAIRS LAB ===');
  const rand = mulberry32(20261110);
  const flexTiers: FlexibilityTier[] = ['strict', 'flexible', 'very_flexible'];

  let agreements = 0;
  let escalations = 0;
  let declines = 0;
  let falseDeclines = 0;
  const falseDeclineExamples: any[] = [];
  let totalRounds = 0;
  let repeatedPrices = 0;
  let crossingOffers = 0;
  let buyerAboveAsk = 0;
  let canaryLeaks = 0;

  for (let i = 0; i < 300; i++) {
    const sellerStd = (Math.floor(rand() * 45) + 8) * 1000; // $80 - $520
    const sellerList = Math.round(sellerStd * (1.2 + rand() * 0.55));
    const sellerFlex = flexTiers[Math.floor(rand() * flexTiers.length)];
    const sellerAbsMin = computeSellerAbsoluteMinCents(sellerStd, sellerFlex);

    const buyerBudget = (Math.floor(rand() * 55) + 6) * 1000; // $60 - $600
    const buyerTarget = Math.round(buyerBudget * (0.7 + rand() * 0.15));
    const buyerFlex = flexTiers[Math.floor(rand() * flexTiers.length)];
    const buyerHardCap = computeBuyerHardCapCents(buyerBudget, buyerFlex);

    const canarySeller = `CANARY_S_${i}_9182`;
    const canaryBuyer = `CANARY_B_${i}_7364`;

    const history: OfferSnapshot[] = [];
    let buyerLast: OfferSnapshot | undefined;
    let sellerLast: OfferSnapshot | undefined;
    let prevSellerPrice: number | null = null;
    let prevBuyerPrice: number | null = null;

    let finalOutcome: 'agreed' | 'escalated' | 'declined' = 'declined';
    let roundsTaken = 0;

    for (let round = 1; round <= 8; round++) {
      roundsTaken = round;
      // Seller turn
      const sDec = computeDeterministicSellerTurn({
        seller: {
          listPriceCents: sellerList,
          standardLowestCents: sellerStd,
          flexibility: sellerFlex,
          absoluteMinCents: sellerAbsMin,
          minDeliveryDays: 2,
          standardDeliveryDays: 5,
          capacity: 7,
          strategy: 'value-trader',
        },
        round,
        history,
        buyerLastOffer: buyerLast,
        availableDeliverables: ['Core Deliverable', 'Source Files', 'QA Report'],
        requestedDeadlineDays: 6,
      });

      const phrasedS = await geminiService.phraseDeterministicTurn({
        role: 'seller',
        partyName: `SellerStudio_${i}`,
        counterpartyName: `Buyer_${i}`,
        requestTitle: `Lab Task ${i}`,
        round,
        action: sDec.action,
        priceCents: sDec.priceCents,
        deliveryDays: sDec.deliveryDays,
        scope: sDec.scope,
        paymentTerms: sDec.paymentTerms,
        whyMove: sDec.whyMove,
        tradesMade: sDec.tradesMade,
        counterpartyMessage: 'Proposal inquiry',
        canaryToken: canarySeller,
        privateNumbersToGuard: [sellerStd / 100, sellerAbsMin / 100],
        noOverlapReason: sDec.noOverlapReason,
      });
      if (phrasedS.canaryLeaked || phrasedS.messageToCounterparty.includes(canarySeller)) canaryLeaks++;

      if (buyerLast && sDec.priceCents < buyerLast.priceCents) crossingOffers++;
      if (sDec.action === 'counter') {
        if (prevSellerPrice !== null && sDec.priceCents === prevSellerPrice) repeatedPrices++;
        prevSellerPrice = sDec.priceCents;
        sellerLast = {
          round,
          senderRole: 'seller',
          priceCents: sDec.priceCents,
          deliveryDays: sDec.deliveryDays,
          scope: sDec.scope,
          revisions: sDec.revisions,
          paymentTerms: sDec.paymentTerms,
        };
        history.push(sellerLast);
      } else {
        if (sDec.action === 'accept') finalOutcome = 'agreed';
        else if (sDec.action === 'escalate') finalOutcome = 'escalated';
        else finalOutcome = 'declined';
        break;
      }

      const overlap = checkOverlap(buyerHardCap, sellerAbsMin, 7, 2);
      if (!overlap.hasOverlap) {
        finalOutcome = 'declined';
        break;
      }

      // Buyer turn
      const bDec = computeDeterministicBuyerTurn({
        buyer: {
          targetCents: buyerTarget,
          budgetCents: buyerBudget,
          flexibility: buyerFlex,
          hardCapCents: buyerHardCap,
          idealDeliveryDays: 3,
          latestDeliveryDays: 7,
          mustHaves: ['Core Deliverable'],
          niceToHaves: ['QA Report'],
          strategy: 'conceder',
        },
        round,
        history,
        sellerLastOffer: sellerLast,
      });

      const phrasedB = await geminiService.phraseDeterministicTurn({
        role: 'buyer',
        partyName: `Buyer_${i}`,
        counterpartyName: `SellerStudio_${i}`,
        requestTitle: `Lab Task ${i}`,
        round,
        action: bDec.action,
        priceCents: bDec.priceCents,
        deliveryDays: bDec.deliveryDays,
        scope: bDec.scope,
        paymentTerms: bDec.paymentTerms,
        whyMove: bDec.whyMove,
        tradesMade: bDec.tradesMade,
        counterpartyMessage: phrasedS.messageToCounterparty,
        canaryToken: canaryBuyer,
        privateNumbersToGuard: [buyerTarget / 100, buyerBudget / 100, buyerHardCap / 100],
        noOverlapReason: bDec.noOverlapReason,
      });
      if (phrasedB.canaryLeaked || phrasedB.messageToCounterparty.includes(canaryBuyer)) canaryLeaks++;

      if (bDec.priceCents > sellerLast.priceCents) {
        crossingOffers++;
        buyerAboveAsk++;
      }

      if (bDec.action === 'counter') {
        if (prevBuyerPrice !== null && bDec.priceCents === prevBuyerPrice) repeatedPrices++;
        prevBuyerPrice = bDec.priceCents;
        buyerLast = {
          round,
          senderRole: 'buyer',
          priceCents: bDec.priceCents,
          deliveryDays: bDec.deliveryDays,
          scope: bDec.scope,
          revisions: bDec.revisions,
          paymentTerms: bDec.paymentTerms,
        };
        history.push(buyerLast);
      } else {
        if (bDec.action === 'accept') finalOutcome = 'agreed';
        else if (bDec.action === 'escalate') finalOutcome = 'escalated';
        else finalOutcome = 'declined';
        break;
      }
    }

    totalRounds += roundsTaken;
    const overlapExisted = sellerAbsMin <= buyerHardCap;
    if (finalOutcome === 'agreed') agreements++;
    else if (finalOutcome === 'escalated') escalations++;
    else {
      declines++;
      if (overlapExisted) {
        falseDeclines++;
        falseDeclineExamples.push({
          trial: i,
          buyerBudget: formatCents(buyerBudget),
          buyerHardCap: formatCents(buyerHardCap),
          sellerStd: formatCents(sellerStd),
          sellerAbsMin: formatCents(sellerAbsMin),
        });
      }
    }
  }

  const metrics = {
    totalPairs: 300,
    agreements,
    agreementRatePct: Number(((agreements / 300) * 100).toFixed(1)),
    escalations,
    escalatedPct: Number(((escalations / 300) * 100).toFixed(1)),
    declines,
    avgRounds: Number((totalRounds / 300).toFixed(2)),
    repeatedPrices,
    crossingOffers,
    buyerAboveAsk,
    canaryLeaks,
    falseDeclinesWithStretchOverlap: falseDeclines,
    falseDeclinePct: Number(((falseDeclines / 300) * 100).toFixed(2)),
    falseDeclineExamples,
  };
  console.log('300-Pair Metrics:', JSON.stringify(metrics, null, 2));
  return metrics;
}

async function runSensitivityAndReplay(liveMode: boolean) {
  console.log(`\n=== PART 5B: SENSITIVITY & REPLAY (${liveMode ? 'LIVE LLM' : 'MOCK WRITER'}) ===`);
  geminiService.llmMode = liveMode ? 'live' : 'mock';
  seedDatabase(true);

  const buyerUser = store.getUser('usr_alex_mercer')!;
  const sellerOwner = store.getUser('usr_marcus_vance')!;
  store.saveUser({ ...buyerUser, autoApprovalLimit: 1000, dailyBudgetCap: 50000, isAutomationPaused: false });

  // Same seller: List $300, standard lowest $180, Flexible (-10% -> $162)
  const sellerListing = store.saveListing({
    id: 'list_sens_300',
    sellerId: sellerOwner.id,
    sellerUserId: sellerOwner.id,
    sellerAgentId: 'agt_marcus_seller',
    title: 'Design System Sprint',
    description: 'Tailwind tokens and React components',
    category: 'Design',
    type: 'service',
    price: 300,
    currency: 'USD',
    pricingModel: 'fixed',
    minAcceptablePrice: 180,
    flexibility: 'flexible',
    deliveryDays: 5,
    deliverables: ['Design Tokens', 'Core Components', 'Docs'],
    images: [],
    isNegotiable: true,
    status: 'active',
    tags: ['Design'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const sensitivityRows: Array<{ budget: number; outcome: string; price: number | null; rounds: number }> = [];
  for (const budget of [150, 200, 300, 500]) {
    const req = store.saveRequest({
      id: `req_sens_lab_${budget}`,
      userId: buyerUser.id,
      buyerUserId: buyerUser.id,
      buyerAgentId: 'agt_alex_buyer',
      rawInput: 'Design system sprint',
      title: 'Design System Sprint',
      category: 'Design',
      requiredCapabilities: ['Design'],
      deliverables: ['Design Tokens', 'Core Components', 'Docs'],
      maxBudget: budget,
      flexibility: 'flexible',
      currency: 'USD',
      deadlineDays: 7,
      qualityRequirements: 'High',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    let neg = await negotiationOrchestrator.initiateNegotiation(req.id, sellerListing.sellerAgentId!);
    let t = 0;
    while (neg.status === 'in_negotiation' && t < 18) {
      neg = await negotiationOrchestrator.stepNegotiation(neg.id);
      t++;
    }
    const price = neg.currentProposal?.price ?? null;
    sensitivityRows.push({ budget, outcome: neg.status, price, rounds: neg.currentRound });
    console.log(`Budget $${budget} -> Outcome: ${neg.status} | Price: $${price} | Rounds: ${neg.currentRound}`);
  }

  const price200 = sensitivityRows.find(r => r.budget === 200)?.price || 1;
  const price500 = sensitivityRows.find(r => r.budget === 500)?.price || 1;
  const risePct = ((price500 - price200) / price200) * 100;
  console.log(`Sensitivity Rise ($200 -> $500): ${risePct.toFixed(1)}% (Threshold <= 10.0%)`);

  // Replay 1: Original $300 vs $1,750 case (Seller 300/200, Buyer maxBudget 2000)
  const req1750 = store.saveRequest({
    id: 'req_replay_1750',
    userId: buyerUser.id,
    buyerUserId: buyerUser.id,
    buyerAgentId: 'agt_alex_buyer',
    rawInput: 'OWASP API security audit',
    title: 'OWASP API security audit',
    category: 'Security',
    requiredCapabilities: ['Security'],
    deliverables: ['Vulnerability Scan', 'Top 10 Triage Report', 'Remediation Patches'],
    maxBudget: 2000,
    flexibility: 'flexible',
    currency: 'USD',
    deadlineDays: 6,
    qualityRequirements: 'Strict',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  let neg1750 = await negotiationOrchestrator.initiateNegotiation(req1750.id, sellerListing.sellerAgentId!);
  let t1 = 0;
  while (neg1750.status === 'in_negotiation' && t1 < 18) {
    neg1750 = await negotiationOrchestrator.stepNegotiation(neg1750.id);
    t1++;
  }

  // Replay 2: Original $132 stuck case (Seller 300/180 Flex=162, Buyer budget 150 Flex=165)
  const req132 = store.saveRequest({
    id: 'req_replay_132',
    userId: buyerUser.id,
    buyerUserId: buyerUser.id,
    buyerAgentId: 'agt_alex_buyer',
    rawInput: 'Landing page with Tailwind tokens',
    title: 'Landing page with Tailwind tokens',
    category: 'Design',
    requiredCapabilities: ['Design'],
    deliverables: ['Tailwind Tokens', 'Responsive Layout'],
    maxBudget: 150,
    flexibility: 'flexible',
    currency: 'USD',
    deadlineDays: 7,
    qualityRequirements: 'Clean',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  let neg132 = await negotiationOrchestrator.initiateNegotiation(req132.id, sellerListing.sellerAgentId!);
  let t2 = 0;
  while (neg132.status === 'in_negotiation' && t2 < 18) {
    neg132 = await negotiationOrchestrator.stepNegotiation(neg132.id);
    t2++;
  }

  return { sensitivityRows, risePct, neg1750, neg132 };
}

function formatTranscript(title: string, neg: Negotiation, req: CommerceRequest): string {
  const lines = [
    `# ${title}`,
    `- Negotiation ID: \`${neg.id}\``,
    `- Outcome: \`${neg.status}\``,
    `- Rounds: ${neg.currentRound}`,
    `- Buyer Budget: ${formatCents(req.budgetCents ?? dollarsToCents(req.maxBudget))} (${req.flexibility || 'flexible'}, Hard Cap: ${formatCents(req.hardCapCents ?? Math.round(req.maxBudget * 110))})`,
    `- Final/Latest Price: ${neg.currentProposal ? formatCents(dollarsToCents(neg.currentProposal.price)) : '-'}`,
    '',
    '## Conversation',
    ''
  ];
  for (const m of neg.messages) {
    const p = m.payload?.price ?? m.payload?.counterPrice ?? m.payload?.agreedPrice ?? m.payload?.proposedPrice;
    lines.push(`### Round ${m.round} — ${m.senderRole.toUpperCase()} [${m.messageType}]`);
    lines.push(`> ${m.content}`);
    if (p !== undefined) lines.push(`- **Price**: ${formatCents(dollarsToCents(Number(p)))} (${m.payload?.deliveryDays || '-'}d)`);
    if (m.payload?.whyMove) lines.push(`- **Why**: ${m.payload.whyMove}`);
    if (Array.isArray(m.payload?.tradesMade) && m.payload.tradesMade.length) lines.push(`- **Trades**: ${m.payload.tradesMade.join(', ')}`);
    lines.push('');
  }
  return lines.join('\n');
}

async function runLiveTranscripts() {
  console.log('\n=== PART 5C: 3 FULL LIVE LLM TRANSCRIPTS ===');
  geminiService.llmMode = 'live';
  const buyerUser = store.getUser('usr_alex_mercer')!;
  const sellerOwner = store.getUser('usr_marcus_vance')!;

  const outDir = path.resolve(process.cwd(), 'audit', 'transcripts_v2');
  fs.mkdirSync(outDir, { recursive: true });

  // Create Seller Listing: List $300, Lowest $180, Flexible ($162 abs min)
  const sellerListing = store.saveListing({
    id: 'list_live_300',
    sellerId: sellerOwner.id,
    sellerUserId: sellerOwner.id,
    sellerAgentId: 'agt_marcus_seller',
    title: 'Full Production Web Component Kit',
    description: 'Accessible React & Tailwind component library',
    category: 'Design',
    type: 'service',
    price: 300,
    currency: 'USD',
    pricingModel: 'fixed',
    minAcceptablePrice: 180,
    flexibility: 'flexible',
    deliveryDays: 5,
    deliverables: ['Figma Tokens', 'React Components', 'Accessibility Audit'],
    images: [],
    isNegotiable: true,
    status: 'active',
    tags: ['Design'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // 1. Normal deal (Buyer budget $240 Flexible)
  const rNormal = store.saveRequest({
    id: 'req_live_normal',
    userId: buyerUser.id,
    buyerUserId: buyerUser.id,
    buyerAgentId: 'agt_alex_buyer',
    rawInput: 'Build React & Tailwind component kit',
    title: 'Full Production Web Component Kit',
    category: 'Design',
    requiredCapabilities: ['Design'],
    deliverables: ['Figma Tokens', 'React Components', 'Accessibility Audit'],
    maxBudget: 240,
    flexibility: 'flexible',
    currency: 'USD',
    deadlineDays: 7,
    qualityRequirements: 'Production',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  let nNormal = await negotiationOrchestrator.initiateNegotiation(rNormal.id, sellerListing.sellerAgentId!);
  for (let i = 0; i < 16 && nNormal.status === 'in_negotiation'; i++) {
    nNormal = await negotiationOrchestrator.stepNegotiation(nNormal.id);
  }
  fs.writeFileSync(path.join(outDir, 'live_normal_deal.md'), formatTranscript('Live Transcript 1 — Normal Agreement', nNormal, rNormal));
  console.log('1. Normal Deal:', nNormal.status, 'rounds=', nNormal.currentRound, 'price=$' + nNormal.currentProposal?.price);

  // 2. Stretch-zone deal that escalates to Needs your OK (Buyer budget $155, flex +10% => $171 vs Seller 300/180 flex $162)
  const rStretch = store.saveRequest({
    id: 'req_live_stretch',
    userId: buyerUser.id,
    buyerUserId: buyerUser.id,
    buyerAgentId: 'agt_alex_buyer',
    rawInput: 'Build Web Component Kit for tight startup budget',
    title: 'Full Production Web Component Kit',
    category: 'Design',
    requiredCapabilities: ['Design'],
    deliverables: ['Figma Tokens', 'React Components', 'Accessibility Audit'],
    maxBudget: 155,
    flexibility: 'flexible',
    currency: 'USD',
    deadlineDays: 7,
    qualityRequirements: 'Production',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  let nStretch = await negotiationOrchestrator.initiateNegotiation(rStretch.id, sellerListing.sellerAgentId!);
  for (let i = 0; i < 16 && nStretch.status === 'in_negotiation'; i++) {
    nStretch = await negotiationOrchestrator.stepNegotiation(nStretch.id);
  }
  fs.writeFileSync(path.join(outDir, 'live_stretch_escalation.md'), formatTranscript('Live Transcript 2 — Stretch Zone Escalation (Needs Your OK)', nStretch, rStretch));
  console.log('2. Stretch Escalation:', nStretch.status, 'rounds=', nStretch.currentRound, 'price=$' + nStretch.currentProposal?.price);

  // 3. No-deal (Buyer budget $120 Strict -> Hard Cap $120 < Seller Abs Min $162)
  const rNoDeal = store.saveRequest({
    id: 'req_live_nodeal',
    userId: buyerUser.id,
    buyerUserId: buyerUser.id,
    buyerAgentId: 'agt_alex_buyer',
    rawInput: 'Full kit strict $120 budget',
    title: 'Full Production Web Component Kit',
    category: 'Design',
    requiredCapabilities: ['Design'],
    deliverables: ['Figma Tokens', 'React Components', 'Accessibility Audit'],
    maxBudget: 120,
    flexibility: 'strict',
    currency: 'USD',
    deadlineDays: 6,
    qualityRequirements: 'Production',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  let nNoDeal = await negotiationOrchestrator.initiateNegotiation(rNoDeal.id, sellerListing.sellerAgentId!);
  for (let i = 0; i < 16 && nNoDeal.status === 'in_negotiation'; i++) {
    nNoDeal = await negotiationOrchestrator.stepNegotiation(nNoDeal.id);
  }
  fs.writeFileSync(path.join(outDir, 'live_no_deal.md'), formatTranscript('Live Transcript 3 — Clean No-Deal (No Overlap)', nNoDeal, rNoDeal));
  console.log('3. No-Deal:', nNoDeal.status, 'rounds=', nNoDeal.currentRound);

  return { nNormal, nStretch, nNoDeal };
}

async function main() {
  geminiService.llmMode = 'mock';
  const labMetrics = await run300PairLab();
  const mockSim = await runSensitivityAndReplay(false);
  const liveTranscripts = await runLiveTranscripts();

  const outReport = {
    generatedAt: new Date().toISOString(),
    labMetrics,
    sensitivityTableAfter: mockSim.sensitivityRows,
    sensitivityRise200to500Pct: Number(mockSim.risePct.toFixed(2)),
    replay1750: {
      status: mockSim.neg1750.status,
      rounds: mockSim.neg1750.currentRound,
      finalPrice: mockSim.neg1750.currentProposal?.price,
      proposals: mockSim.neg1750.messages.filter(m => m.messageType !== 'request').map(m => ({
        round: m.round,
        role: m.senderRole,
        type: m.messageType,
        price: m.payload?.price ?? m.payload?.counterPrice ?? m.payload?.agreedPrice,
        content: m.content
      }))
    },
    replay132: {
      status: mockSim.neg132.status,
      rounds: mockSim.neg132.currentRound,
      finalPrice: mockSim.neg132.currentProposal?.price,
      proposals: mockSim.neg132.messages.filter(m => m.messageType !== 'request').map(m => ({
        round: m.round,
        role: m.senderRole,
        type: m.messageType,
        price: m.payload?.price ?? m.payload?.counterPrice ?? m.payload?.agreedPrice,
        content: m.content
      }))
    },
    liveTranscriptSummary: [
      { case: 'Normal', status: liveTranscripts.nNormal.status, rounds: liveTranscripts.nNormal.currentRound, price: liveTranscripts.nNormal.currentProposal?.price },
      { case: 'Stretch', status: liveTranscripts.nStretch.status, rounds: liveTranscripts.nStretch.currentRound, price: liveTranscripts.nStretch.currentProposal?.price },
      { case: 'NoDeal', status: liveTranscripts.nNoDeal.status, rounds: liveTranscripts.nNoDeal.currentRound, price: liveTranscripts.nNoDeal.currentProposal?.price },
    ]
  };

  fs.mkdirSync(path.resolve(process.cwd(), 'audit'), { recursive: true });
  fs.writeFileSync(path.resolve(process.cwd(), 'audit', 'negotiation_lab_results.json'), JSON.stringify(outReport, null, 2));

  // Strictly enforce CI exit assertions from Part 5
  if (labMetrics.repeatedPrices !== 0 || labMetrics.crossingOffers !== 0 || labMetrics.buyerAboveAsk !== 0 || labMetrics.canaryLeaks !== 0) {
    console.error('FAIL: Critical metric non-zero!', labMetrics);
    process.exit(1);
  }
  if (labMetrics.falseDeclinePct >= 5) {
    console.error('FAIL: False decline rate >= 5%!', labMetrics.falseDeclinePct);
    process.exit(1);
  }
  if (mockSim.risePct > 10) {
    console.error('FAIL: Sensitivity price rise > 10%!', mockSim.risePct);
    process.exit(1);
  }

  console.log('\nALL NEGOTIATION LAB & SENSITIVITY CHECKS PASSED!');
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
