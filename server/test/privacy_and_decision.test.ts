import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { store } from '../src/db/store.js';
import { seedDatabase } from '../src/db/seed.js';
import { decisionEngine } from '../src/services/decision/engine.js';
import { negotiationOrchestrator } from '../src/services/negotiation/orchestrator.js';
import { paypalService } from '../src/services/paypal/paypalClient.js';
import { Proposal, CommerceRequest, Agent, User, Negotiation } from '../src/types/index.js';

describe('VYRO Phase 1 / Step 2: Privacy & Decision Engine', () => {

  before(() => {
    seedDatabase(true);
  });

  it('1. Privacy: Buyer private budget ceiling never leaks to counterparty', async () => {
    // Unique canary values for buyer budget
    const CANARY_BUDGET = 9742;
    const CANARY_DECIMAL = '9742.85';
    const CANARY_FORMATTED = '9,742';

    // Create a private request with canary budget
    const req = store.saveRequest({
      id: `req_canary_${Date.now()}`,
      userId: 'usr_alex_mercer',
      buyerAgentId: 'agt_alex_buyer',
      rawInput: `Procure secure auth module. Budget is strictly ${CANARY_BUDGET}.`,
      title: 'Secure Authentication Infrastructure',
      category: 'Development',
      requiredCapabilities: ['TypeScript', 'OAuth2'],
      deliverables: ['Auth Module', 'Unit Tests'],
      maxBudget: CANARY_BUDGET,
      currency: 'USD',
      deadlineDays: 4,
      qualityRequirements: 'Strict validation',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const neg = await negotiationOrchestrator.initiateNegotiation(req.id, 'agt_marcus_seller');

    // Inspect every message delivered in the negotiation channel
    for (const msg of neg.messages) {
      const text = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      const payloadStr = JSON.stringify(msg.payload || {});

      // Assert that none of the canary representations appear in the message text
      assert.strictEqual(
        text.includes(String(CANARY_BUDGET)),
        false,
        `Privacy leak detected! Canary budget ${CANARY_BUDGET} appeared in message text: "${text}"`
      );
      assert.strictEqual(
        text.includes(CANARY_DECIMAL),
        false,
        `Privacy leak detected! Canary ${CANARY_DECIMAL} appeared in message text: "${text}"`
      );
      assert.strictEqual(
        text.includes(CANARY_FORMATTED),
        false,
        `Privacy leak detected! Formatted canary ${CANARY_FORMATTED} appeared in message text: "${text}"`
      );

      // Assert payload visible to seller does not leak max budget
      if (msg.recipientAgentId === 'agt_marcus_seller') {
        assert.strictEqual(
          payloadStr.includes(String(CANARY_BUDGET)),
          false,
          `Privacy leak detected in seller payload: ${payloadStr}`
        );
      }

      // Assert natural-language leak check
      assert.strictEqual(
        /maximum\s*authorized\s*budget/i.test(text),
        false,
        `Natural language leak detected: "maximum authorized budget" found in "${text}"`
      );
    }
  });

  it('2. Privacy: Seller operational floor price never leaks in counterparty messages', async () => {
    const CANARY_FLOOR = 3841;

    // Create a seller agent with unique private floor
    const seller = store.saveAgent({
      id: `seller_canary_${Date.now()}`,
      ownerId: 'usr_marcus_vance',
      businessName: 'Canary Defense Systems',
      name: 'Agent Aegis',
      type: 'seller',
      description: 'Private security provider',
      category: 'Security',
      capabilities: ['Audit', 'Defense'],
      status: 'active',
      verificationStatus: 'verified',
      catalog: [{
        id: 'pkg_1',
        name: 'Enterprise Shield',
        description: 'Complete audit',
        startingPrice: 4500,
        minPrice: CANARY_FLOOR,
        deliveryDays: 5,
        includedDeliverables: ['Report', 'Remediation']
      }],
      pricingConstraints: {
        startingPrice: 4500,
        minAcceptablePrice: CANARY_FLOOR
      },
      negotiationStrategy: 'balanced',
      approvalPolicy: 'explicit_human_required',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const req = store.saveRequest({
      id: `req_seller_test_${Date.now()}`,
      userId: 'usr_alex_mercer',
      buyerAgentId: 'agt_alex_buyer',
      rawInput: 'Security test audit',
      title: 'Security Defense Audit',
      category: 'Security',
      requiredCapabilities: ['Audit'],
      deliverables: ['Audit Report'],
      maxBudget: 5000,
      currency: 'USD',
      deadlineDays: 5,
      qualityRequirements: 'Enterprise',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const neg = await negotiationOrchestrator.initiateNegotiation(req.id, seller.id);

    // Verify opening messages from seller don't reveal floor price
    for (const msg of neg.messages) {
      const text = msg.content;
      assert.strictEqual(
        text.includes(String(CANARY_FLOOR)),
        false,
        `Seller floor price leaked in message: "${text}"`
      );
      assert.strictEqual(
        /floor\s*(?:price)?\s*(?:is|of|:)?\s*\$?\d+/i.test(text),
        false,
        `Natural language floor leak detected: "${text}"`
      );
    }
  });

  it('3. Decision Policy: AUTO-APPROVE when all strict conditions hold', () => {
    const user = store.getUser('usr_alex_mercer')!;
    const seller = store.getAgent('agt_marcus_seller')!;
    const buyerAgent = store.getAgent('agt_alex_buyer')!;

    const req = store.saveRequest({
      id: `req_auto_${Date.now()}`,
      userId: user.id,
      buyerAgentId: buyerAgent.id,
      rawInput: 'Design a landing page',
      title: 'Landing Page Design',
      category: 'Design',
      requiredCapabilities: ['UI Design'],
      deliverables: ['UI Mockup'],
      maxBudget: 180,
      currency: 'USD',
      deadlineDays: 5,
      qualityRequirements: 'High',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const neg: Negotiation = {
      id: `neg_auto_${Date.now()}`,
      requestId: req.id,
      buyerAgentId: buyerAgent.id,
      sellerAgentId: seller.id,
      status: 'in_negotiation',
      currentRound: 1,
      maxRounds: 4,
      currentProposal: null,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    store.saveNegotiation(neg);

    const proposal: Proposal = {
      id: `prop_auto_${Date.now()}`,
      negotiationId: neg.id,
      senderAgentId: seller.id,
      round: 1,
      price: 160, // Under $200 auto limit, within $180 budget
      currency: 'USD',
      deliverables: ['UI Mockup'],
      deliveryDays: 3,
      terms: 'Standard',
      validUntil: new Date().toISOString(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    store.saveProposal(proposal);

    const result = decisionEngine.evaluateProposal({
      proposal,
      request: req,
      buyerAgent,
      sellerAgent: seller,
      buyerUser: user,
      sellerFloorPrice: 140
    });

    assert.strictEqual(result.outcome, 'auto_approved');
    assert.strictEqual(result.decision.status, 'auto_approved');
    assert.ok(result.decision.confidence >= 0.85, `Expected confidence >= 0.85, got ${result.decision.confidence}`);
    assert.ok(result.decision.undoUntil, 'Expected 10-second undo window on auto-approved deal');
  });

  it('4. Decision Policy: AUTO-DECLINE on prohibited category or extreme price deviation', () => {
    const user = store.getUser('usr_alex_mercer')!;
    const seller = store.getAgent('agt_marcus_seller')!;
    const buyerAgent = store.getAgent('agt_alex_buyer')!;

    const req = store.saveRequest({
      id: `req_prohibited_${Date.now()}`,
      userId: user.id,
      buyerAgentId: buyerAgent.id,
      rawInput: 'Illegal category procurement',
      title: 'Weapons System Procurement',
      category: 'weapons',
      requiredCapabilities: [],
      deliverables: ['Banned Item'],
      maxBudget: 100,
      currency: 'USD',
      deadlineDays: 5,
      qualityRequirements: 'None',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const neg: Negotiation = {
      id: `neg_prohibited_${Date.now()}`,
      requestId: req.id,
      buyerAgentId: buyerAgent.id,
      sellerAgentId: seller.id,
      status: 'in_negotiation',
      currentRound: 1,
      maxRounds: 4,
      currentProposal: null,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    store.saveNegotiation(neg);

    const proposal: Proposal = {
      id: `prop_bad_${Date.now()}`,
      negotiationId: neg.id,
      senderAgentId: seller.id,
      round: 1,
      price: 250, // Extreme deviation > 1.5x max budget
      currency: 'USD',
      deliverables: ['Banned Item'],
      deliveryDays: 5,
      terms: 'None',
      validUntil: new Date().toISOString(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    store.saveProposal(proposal);

    const result = decisionEngine.evaluateProposal({
      proposal,
      request: req,
      buyerAgent,
      sellerAgent: seller,
      buyerUser: user,
      sellerFloorPrice: 100
    });

    assert.strictEqual(result.outcome, 'auto_declined');
    assert.strictEqual(result.decision.status, 'auto_declined');
    assert.ok(result.decision.reasons.length > 0);
  });

  it('5. Early Exit: Escalates when seller floor > buyer max budget', () => {
    const user = store.getUser('usr_alex_mercer')!;
    const seller = store.getAgent('agt_elena_seller')!;
    const buyerAgent = store.getAgent('agt_alex_buyer')!;

    const req = store.saveRequest({
      id: `req_impasse_${Date.now()}`,
      userId: user.id,
      buyerAgentId: buyerAgent.id,
      rawInput: 'Build microservice',
      title: 'Microservice API',
      category: 'Development',
      requiredCapabilities: [],
      deliverables: ['API'],
      maxBudget: 100, // Seller floor is 150 > 100
      currency: 'USD',
      deadlineDays: 5,
      qualityRequirements: 'Enterprise',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const neg: Negotiation = {
      id: `neg_impasse_${Date.now()}`,
      requestId: req.id,
      buyerAgentId: buyerAgent.id,
      sellerAgentId: seller.id,
      status: 'in_negotiation',
      currentRound: 1,
      maxRounds: 4,
      currentProposal: null,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    store.saveNegotiation(neg);

    const proposal: Proposal = {
      id: `prop_impasse_${Date.now()}`,
      negotiationId: neg.id,
      senderAgentId: seller.id,
      round: 1,
      price: 150,
      currency: 'USD',
      deliverables: ['API'],
      deliveryDays: 5,
      terms: 'Standard',
      validUntil: new Date().toISOString(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    store.saveProposal(proposal);

    const result = decisionEngine.evaluateProposal({
      proposal,
      request: req,
      buyerAgent,
      sellerAgent: seller,
      buyerUser: user,
      sellerFloorPrice: 150 // Floor > max budget (100)
    });

    assert.strictEqual(result.outcome, 'needs_review');
    assert.strictEqual(result.decision.status, 'needs_review');
    assert.ok(result.decision.reasons[0].includes('Seller absolute floor ($150) exceeds buyer authorized maximum budget ($100)'));
  });

  it('6. Global Pause Switch: Routes all transactions to Review Queue when paused', () => {
    const baseUser = store.getUser('usr_alex_mercer')!;
    const user = { ...baseUser, isAutomationPaused: true };
    const seller = store.getAgent('agt_marcus_seller')!;
    const buyerAgent = store.getAgent('agt_alex_buyer')!;

    const req = store.saveRequest({
      id: `req_paused_${Date.now()}`,
      userId: user.id,
      buyerAgentId: buyerAgent.id,
      rawInput: 'Small icon design',
      title: 'Icon Design',
      category: 'Design',
      requiredCapabilities: [],
      deliverables: ['SVG Icon'],
      maxBudget: 100,
      currency: 'USD',
      deadlineDays: 5,
      qualityRequirements: 'Clean',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const neg: Negotiation = {
      id: `neg_paused_${Date.now()}`,
      requestId: req.id,
      buyerAgentId: buyerAgent.id,
      sellerAgentId: seller.id,
      status: 'in_negotiation',
      currentRound: 1,
      maxRounds: 4,
      currentProposal: null,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    store.saveNegotiation(neg);

    const proposal: Proposal = {
      id: `prop_paused_${Date.now()}`,
      negotiationId: neg.id,
      senderAgentId: seller.id,
      round: 1,
      price: 50, // Tiny $50 deal, would normally auto-approve
      currency: 'USD',
      deliverables: ['SVG Icon'],
      deliveryDays: 2,
      terms: 'Standard',
      validUntil: new Date().toISOString(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    store.saveProposal(proposal);

    const result = decisionEngine.evaluateProposal({
      proposal,
      request: req,
      buyerAgent,
      sellerAgent: seller,
      buyerUser: user,
      sellerFloorPrice: 40
    });

    assert.strictEqual(result.outcome, 'needs_review');
    assert.ok(result.decision.reasons.some(r => r.includes('Automation is currently paused by user switch')));
  });

  it('7. Seller-Side Exception Rules: Auto-accept vs Escalation', () => {
    const seller = store.getAgent('agt_marcus_seller')!;

    // Case A: Quote above floor, verified buyer, within capacity -> Auto-Accept
    const acceptRes = decisionEngine.evaluateSellerSide({
      sellerAgent: seller,
      sellerFloorPrice: 140,
      offerPrice: 160,
      buyerVerified: true,
      isCustomScope: false
    });
    assert.strictEqual(acceptRes.canAutoAccept, true);

    // Case B: Offer below floor -> Reject
    const belowFloorRes = decisionEngine.evaluateSellerSide({
      sellerAgent: seller,
      sellerFloorPrice: 140,
      offerPrice: 120,
      buyerVerified: true,
      isCustomScope: false
    });
    assert.strictEqual(belowFloorRes.canAutoAccept, false);

    // Case C: Unverified buyer -> Escalate
    const unverifiedBuyerRes = decisionEngine.evaluateSellerSide({
      sellerAgent: seller,
      sellerFloorPrice: 140,
      offerPrice: 160,
      buyerVerified: false,
      isCustomScope: false
    });
    assert.strictEqual(unverifiedBuyerRes.canAutoAccept, false);
    assert.ok(unverifiedBuyerRes.reason.includes('Buyer account is unverified'));

    // Case D: Maximum capacity reached -> Escalate
    const busySeller = { ...seller, activeProjects: 5, maxConcurrentProjects: 5 };
    const busyRes = decisionEngine.evaluateSellerSide({
      sellerAgent: busySeller,
      sellerFloorPrice: 140,
      offerPrice: 160,
      buyerVerified: true,
      isCustomScope: false
    });
    assert.strictEqual(busyRes.canAutoAccept, false);
    assert.ok(busyRes.reason.includes('maximum capacity'));
  });

  it('8. Server-Enforced Payment: Rejects unapproved decisions & enforces idempotency', async () => {
    const user = store.getUser('usr_alex_mercer')!;
    const seller = store.getAgent('agt_marcus_seller')!;
    const buyerAgent = store.getAgent('agt_alex_buyer')!;

    const req = store.saveRequest({
      id: `req_pay_${Date.now()}`,
      userId: user.id,
      buyerAgentId: buyerAgent.id,
      rawInput: 'Test payment flow',
      title: 'Payment Test Request',
      category: 'Design',
      requiredCapabilities: [],
      deliverables: ['Deliverable'],
      maxBudget: 150,
      currency: 'USD',
      deadlineDays: 3,
      qualityRequirements: 'QA',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const neg: Negotiation = {
      id: `neg_pay_${Date.now()}`,
      requestId: req.id,
      buyerAgentId: buyerAgent.id,
      sellerAgentId: seller.id,
      status: 'in_negotiation',
      currentRound: 1,
      maxRounds: 4,
      currentProposal: null,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    store.saveNegotiation(neg);

    const unapprovedAgreementId = `agr_unapproved_${Date.now()}`;
    const agreement = store.saveAgreement({
      id: unapprovedAgreementId,
      negotiationId: neg.id,
      requestId: req.id,
      buyerAgentId: buyerAgent.id,
      sellerAgentId: seller.id,
      buyerUserId: user.id,
      sellerBusinessName: seller.businessName,
      finalPrice: 150,
      currency: 'USD',
      finalDeliverables: ['Deliverable'],
      deliveryDays: 3,
      commercialTerms: 'Terms',
      humanApprovalStatus: 'pending', // NOT approved!
      paypalReady: false,
      createdAt: new Date().toISOString()
    });

    // Make sure Decision is needs_review
    store.saveDecision({
      id: `dec_${agreement.negotiationId}`,
      entityType: 'deal',
      entityId: agreement.negotiationId,
      userId: user.id,
      status: 'needs_review',
      reasons: ['Pending human authorization'],
      recommendation: 'Review required',
      signals: {
        priceWithinCeiling: true,
        priceAboveFloor: true,
        sellerVerified: true,
        underAutoLimit: false,
        categoryAllowed: true,
        withinDailyBudget: true,
        automationPaused: false,
        redFlags: [],
        proposedPrice: 150,
        buyerMaxBudget: 150,
        sellerFloorPrice: 100,
        userAutoLimit: 100,
        userDailyCap: 500,
        todaySpend: 0
      },
      confidence: 0.7,
      decidedBy: 'rule',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Attempting to create PayPal order for unapproved agreement must throw error!
    await assert.rejects(
      async () => {
        await paypalService.createOrder(agreement.id, 'idem_test_key_1');
      },
      /Payment rejected: Agreement has not been approved/,
      'Expected payment rejection for unapproved agreement'
    );

    // Now approve the decision and agreement
    store.updateDecisionStatus(`dec_${agreement.negotiationId}`, 'human_approved', 'user', 'Approved by test');
    agreement.humanApprovalStatus = 'approved';
    agreement.paypalReady = true;
    store.saveAgreement(agreement);

    // Now order creation must succeed!
    const order = await paypalService.createOrder(agreement.id, 'idem_test_key_2');
    assert.ok(order.orderId);

    // For unit testing server capture & idempotency without browser popup:
    const testOrderId = `PAYID-SANDBOX-TEST-${Date.now()}`;
    const txInit: Transaction = {
      id: `tx_test_${Date.now()}`,
      agreementId: agreement.id,
      negotiationId: agreement.negotiationId,
      requestId: agreement.requestId,
      buyerUserId: agreement.buyerUserId,
      buyerAgentName: 'Test Buyer',
      sellerAgentId: agreement.sellerAgentId,
      sellerBusinessName: agreement.sellerBusinessName,
      serviceTitle: 'Commercial Agreement Contract',
      amount: agreement.finalPrice,
      currency: 'USD',
      paypalOrderId: testOrderId,
      paymentStatus: 'awaiting_paypal',
      idempotencyKey: 'idem_test_key_2',
      isSandbox: true,
      createdAt: new Date().toISOString()
    };
    store.saveTransaction(txInit);

    // Capture order
    const tx = await paypalService.captureOrder(testOrderId, 'idem_cap_key_1');
    assert.strictEqual(tx.paymentStatus, 'completed');

    // Idempotency: calling captureOrder again with same orderId returns identical tx without double charge
    const tx2 = await paypalService.captureOrder(testOrderId, 'idem_cap_key_1');
    assert.strictEqual(tx2.id, tx.id);
    assert.strictEqual(tx2.paymentStatus, 'completed');
  });

});
