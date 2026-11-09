import { store } from '../server/src/db/store.js';
import { Negotiation, Proposal, NegotiationMessage, Agreement, Transaction, Decision, CommerceRequest } from '../server/src/types/index.js';

export function seedDemoDeals() {
  console.log('[Seed] Seeding realistic deals and transactions for demo accounts...');
  const now = new Date().toISOString();

  // 1. Escalated Deal (Price $260 > $200 limit)
  const reqId1 = 'req_demo_buyer_01';
  const negId1 = 'neg_demo_escalated_01';
  const agreementId1 = 'agr_demo_01';

  const req1: CommerceRequest = {
    id: reqId1,
    userId: 'usr_demo_buyer',
    buyerUserId: 'usr_demo_buyer',
    buyerAgentId: 'agt_demo_buyer',
    rawInput: 'Need OWASP API penetration testing and remediation guide within 4 days for under $350.',
    title: 'OWASP Express API Penetration Test',
    category: 'Security',
    requiredCapabilities: ['Security', 'OWASP', 'Penetration Testing'],
    deliverables: ['Full OWASP Top 10 Penetration Report', 'Express Middleware Patches', 'Threat Model Diagram'],
    maxBudget: 350,
    currency: 'USD',
    deadlineDays: 4,
    qualityRequirements: 'Verified production quality, zero vulnerabilities.',
    status: 'matched',
    createdAt: now,
    updatedAt: now
  };
  store.saveRequest(req1);

  const proposal1: Proposal = {
    id: 'prop_demo_01',
    negotiationId: negId1,
    senderAgentId: 'agt_demo_seller',
    round: 2,
    price: 260,
    currency: 'USD',
    deliverables: ['Full OWASP Top 10 Penetration Report', 'Express Middleware Patches', 'Threat Model Diagram'],
    deliveryDays: 4,
    terms: 'Escrow settlement via PayPal Sandbox',
    validUntil: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    status: 'pending',
    revisions: 2,
    paymentTerms: 'escrow_milestone',
    tradesMade: ['Seller discounted from $350 asking price to $260 in exchange for 4-day delivery.'],
    utilityScore: 0.88,
    whyThisOffer: 'Conceded $90 price reduction while keeping deliverables comprehensive.',
    createdAt: now
  };

  const messages1: NegotiationMessage[] = [
    {
      id: 'msg_demo_01',
      negotiationId: negId1,
      senderAgentId: 'agt_demo_buyer',
      recipientAgentId: 'agt_demo_seller',
      senderRole: 'buyer',
      round: 1,
      messageType: 'request',
      content: 'Seeking comprehensive OWASP penetration testing for Express API backend. Target budget $240, turnaround 3-5 days.',
      payload: { maxBudget: 300, deadlineDays: 5, deliverables: ['OWASP Audit', 'Code Patches'] },
      timestamp: new Date(Date.now() - 3600 * 1000).toISOString()
    },
    {
      id: 'msg_demo_02',
      negotiationId: negId1,
      senderAgentId: 'agt_demo_seller',
      recipientAgentId: 'agt_demo_buyer',
      senderRole: 'seller',
      round: 1,
      messageType: 'counter_proposal',
      content: 'We can deliver complete penetration testing and remediation patches for $280 in 4 days.',
      payload: { price: 280, deliveryDays: 4 },
      timestamp: new Date(Date.now() - 2400 * 1000).toISOString()
    },
    {
      id: 'msg_demo_03',
      negotiationId: negId1,
      senderAgentId: 'agt_demo_buyer',
      recipientAgentId: 'agt_demo_seller',
      senderRole: 'buyer',
      round: 2,
      messageType: 'counter_proposal',
      content: 'Buyer agent proposes final package: $260 with 4-day delivery and 2 revision rounds.',
      payload: { price: 260, deliveryDays: 4, revisions: 2 },
      timestamp: new Date(Date.now() - 1200 * 1000).toISOString()
    },
    {
      id: 'msg_demo_04',
      negotiationId: negId1,
      senderAgentId: 'agt_demo_seller',
      recipientAgentId: 'agt_demo_buyer',
      senderRole: 'seller',
      round: 2,
      messageType: 'proposal',
      content: 'Vance Design & Engineering accepts $260 package. Transmitting terms to Buyer Review Queue for human authorization.',
      payload: proposal1,
      timestamp: now
    }
  ];

  const neg1: Negotiation = {
    id: negId1,
    requestId: reqId1,
    buyerAgentId: 'agt_demo_buyer',
    sellerAgentId: 'agt_demo_seller',
    buyerUserId: 'usr_demo_buyer',
    sellerUserId: 'usr_demo_seller',
    status: 'escalated',
    currentRound: 2,
    maxRounds: 4,
    currentProposal: proposal1,
    messages: messages1,
    agreementId: agreementId1,
    createdAt: now,
    updatedAt: now
  };

  const agreement1: Agreement = {
    id: agreementId1,
    negotiationId: negId1,
    requestId: reqId1,
    buyerAgentId: 'agt_demo_buyer',
    sellerAgentId: 'agt_demo_seller',
    buyerUserId: 'usr_demo_buyer',
    sellerUserId: 'usr_demo_seller',
    sellerBusinessName: 'Vance Design & Engineering',
    finalPrice: 260,
    currency: 'USD',
    finalDeliverables: ['Full OWASP Top 10 Penetration Report', 'Express Middleware Patches', 'Threat Model Diagram'],
    deliveryDays: 4,
    commercialTerms: 'Verified milestone escrow via PayPal Sandbox',
    humanApprovalStatus: 'pending_review',
    sellerAcceptanceStatus: 'accepted',
    paypalReady: true,
    paymentTerms: 'escrow_milestone',
    revisions: 2,
    tradesSummary: ['Agreed on $260 with 4-day turnaround.'],
    createdAt: now
  };

  const decision1: Decision = {
    id: 'dec_demo_01',
    entityType: 'negotiation',
    entityId: negId1,
    userId: 'usr_demo_buyer',
    status: 'needs_review',
    reasons: ['Negotiated price of $260 exceeds your $200 autonomous threshold by $60.'],
    recommendation: 'Review proposed terms and authorize payment',
    signals: { price: 260, limit: 200, category: 'Security' },
    confidence: 0.95,
    decidedBy: 'rule_engine',
    createdAt: now,
    updatedAt: now
  };

  store.saveNegotiation(neg1);
  store.saveAgreement(agreement1);
  store.saveDecision(decision1);

  // 2. Completed / Settled Deal (Price $180 < $200 auto-approved)
  const reqId2 = 'req_demo_02';
  const negId2 = 'neg_demo_completed_02';
  const agreementId2 = 'agr_demo_02';
  const txId2 = 'tx_demo_02';

  const req2: CommerceRequest = {
    id: reqId2,
    userId: 'usr_demo_buyer',
    buyerUserId: 'usr_demo_buyer',
    buyerAgentId: 'agt_demo_buyer',
    rawInput: 'Need brand design tokens for Tailwind CSS.',
    title: 'Tailwind Design Tokens Package',
    category: 'Design',
    requiredCapabilities: ['Design', 'Tokens'],
    deliverables: ['Production Tailwind Design Tokens', 'Figma Color System'],
    maxBudget: 200,
    currency: 'USD',
    deadlineDays: 3,
    qualityRequirements: 'Clean JSON tokens and CSS variables.',
    status: 'fulfilled',
    createdAt: now,
    updatedAt: now
  };
  store.saveRequest(req2);

  const proposal2: Proposal = {
    id: 'prop_demo_02',
    negotiationId: negId2,
    senderAgentId: 'agt_demo_seller',
    round: 1,
    price: 180,
    currency: 'USD',
    deliverables: ['Production Tailwind Design Tokens', 'Figma Color System'],
    deliveryDays: 3,
    terms: 'Instant settlement via PayPal',
    validUntil: now,
    status: 'accepted',
    revisions: 1,
    paymentTerms: 'escrow_milestone',
    tradesMade: ['Standard fixed quote under auto-approval limit.'],
    utilityScore: 0.95,
    whyThisOffer: 'Price meets buyer standard expectations.',
    createdAt: now
  };

  const neg2: Negotiation = {
    id: negId2,
    requestId: reqId2,
    buyerAgentId: 'agt_demo_buyer',
    sellerAgentId: 'agt_demo_seller',
    buyerUserId: 'usr_demo_buyer',
    sellerUserId: 'usr_demo_seller',
    status: 'completed',
    currentRound: 1,
    maxRounds: 4,
    currentProposal: proposal2,
    messages: [
      {
        id: 'msg_demo_20',
        negotiationId: negId2,
        senderAgentId: 'agt_demo_buyer',
        recipientAgentId: 'agt_demo_seller',
        senderRole: 'buyer',
        round: 1,
        messageType: 'request',
        content: 'Requesting Tailwind design tokens package.',
        timestamp: now
      },
      {
        id: 'msg_demo_21',
        negotiationId: negId2,
        senderAgentId: 'agt_demo_seller',
        recipientAgentId: 'agt_demo_buyer',
        senderRole: 'seller',
        round: 1,
        messageType: 'proposal',
        content: 'Offered $180 with 3-day turnaround.',
        payload: proposal2,
        timestamp: now
      }
    ],
    agreementId: agreementId2,
    createdAt: now,
    updatedAt: now
  };

  const agreement2: Agreement = {
    id: agreementId2,
    negotiationId: negId2,
    requestId: reqId2,
    buyerAgentId: 'agt_demo_buyer',
    sellerAgentId: 'agt_demo_seller',
    buyerUserId: 'usr_demo_buyer',
    sellerUserId: 'usr_demo_seller',
    sellerBusinessName: 'Vance Design & Engineering',
    finalPrice: 180,
    currency: 'USD',
    finalDeliverables: ['Production Tailwind Design Tokens', 'Figma Color System'],
    deliveryDays: 3,
    commercialTerms: 'Settled via PayPal Orders v2',
    humanApprovalStatus: 'approved',
    sellerAcceptanceStatus: 'accepted',
    paypalReady: true,
    paymentTerms: 'escrow_milestone',
    revisions: 1,
    createdAt: now
  };

  const tx2: any = {
    id: txId2,
    agreementId: agreementId2,
    negotiationId: negId2,
    requestId: reqId2,
    buyerUserId: 'usr_demo_buyer',
    sellerUserId: 'usr_demo_seller',
    buyerAgentName: 'Buyer Operations Agent',
    sellerAgentId: 'agt_demo_seller',
    sellerBusinessName: 'Vance Design & Engineering',
    serviceTitle: 'Tailwind Design Tokens Package',
    amount: 180,
    currency: 'USD',
    paymentProvider: 'paypal',
    paypalOrderId: 'ORDER_SANDBOX_DEMO_771',
    paypalCaptureId: 'CAPTURE_SANDBOX_DEMO_882',
    paypalPayerEmail: 'demo.buyer@example.com',
    paypalPayerName: 'Demo Buyer',
    paymentStatus: 'settled',
    idempotencyKey: 'idem_demo_02',
    sellerShareHeld: 180,
    sellerPayoutStatus: 'held',
    sellerPayoutAt: null,
    createdAt: now,
    completedAt: now,
    failureReason: null,
    isSandbox: true
  };

  store.saveNegotiation(neg2);
  store.saveAgreement(agreement2);
  store.saveTransaction(tx2);

  console.log('[Seed] Demo deals created successfully:');
  console.log(`       - Escalated Deal: ${negId1} ($260)`);
  console.log(`       - Completed Deal: ${negId2} ($180)`);
  console.log(`       - Transaction: ${txId2}`);
}

if (process.argv[1] && process.argv[1].endsWith('seed_demo_deal.ts')) {
  seedDemoDeals();
}
