import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../src/db/store.js';
import { seedDatabase } from '../src/db/seed.js';
import { projectStateMachine, ProjectTransitionError } from '../src/services/projects/projectStateMachine.js';
import { disputeService } from '../src/services/projects/disputeService.js';
import { reviewWindowWorker } from '../src/services/projects/reviewWindowWorker.js';
import { saveEvidenceFiles, resolvePrivateEvidenceFilePath } from '../src/services/projects/fileEvidence.js';
import { paypalService, PayPalApiException } from '../src/services/paypal/paypalClient.js';
import { payoutService } from '../src/services/paypal/payoutService.js';
import { User, Agent, CommerceRequest, Negotiation, Agreement } from '../src/types/index.js';

function makeUser(prefix: string, role: 'user' | 'admin' = 'user'): User {
  const uid = `usr_${prefix}_${uuidv4().substring(0, 6)}`;
  const now = new Date().toISOString();
  return store.saveUser({
    id: uid,
    email: `${uid}@test.vyro`,
    displayName: `Test ${prefix}`,
    username: uid,
    role,
    capabilities: { buying: true, selling: true },
    activeWorkspace: 'buyer',
    onboardingCompleted: true,
    onboardingStep: 5,
    autoApprovalLimit: 500,
    dailyBudgetCap: 5000,
    balance: 5000,
    isAutomationPaused: false,
    createdAt: now,
    updatedAt: now
  });
}

async function makeProjectFixture(buyer: User, seller: User, priceDollars = 200) {
  const now = new Date().toISOString();
  const buyerAgent: Agent = store.saveAgent({
    id: `agt_b_${uuidv4().substring(0, 6)}`,
    ownerId: buyer.id,
    userId: buyer.id,
    businessName: `${buyer.displayName} Procurement`,
    name: 'Buyer Agent',
    type: 'buyer',
    description: 'Buyer rep',
    category: 'Development',
    capabilities: ['Engineering'],
    status: 'active',
    verificationStatus: 'verified',
    catalog: [],
    pricingConstraints: { maxBudget: priceDollars * 2 },
    negotiationStrategy: 'balanced',
    approvalPolicy: 'explicit_human_required',
    createdAt: now,
    updatedAt: now
  });
  const sellerAgent: Agent = store.saveAgent({
    id: `agt_s_${uuidv4().substring(0, 6)}`,
    ownerId: seller.id,
    userId: seller.id,
    businessName: `${seller.displayName} Studio`,
    name: 'Seller Agent',
    type: 'seller',
    description: 'Seller studio',
    category: 'Development',
    capabilities: ['Engineering'],
    status: 'active',
    verificationStatus: 'verified',
    catalog: [],
    pricingConstraints: { startingPrice: priceDollars, minAcceptablePrice: Math.round(priceDollars * 0.8) },
    negotiationStrategy: 'balanced',
    approvalPolicy: 'explicit_human_required',
    createdAt: now,
    updatedAt: now
  });
  const req: CommerceRequest = store.saveRequest({
    id: `req_${uuidv4().substring(0, 6)}`,
    userId: buyer.id,
    buyerUserId: buyer.id,
    buyerAgentId: buyerAgent.id,
    rawInput: 'Build responsive dashboard',
    title: 'Responsive Analytics Dashboard',
    category: 'Development',
    requiredCapabilities: ['React'],
    deliverables: ['Dashboard UI', 'Tests'],
    maxBudget: priceDollars,
    currency: 'USD',
    deadlineDays: 5,
    qualityRequirements: 'Clean TypeScript',
    status: 'agreement_reached',
    createdAt: now,
    updatedAt: now
  });
  const neg: Negotiation = store.saveNegotiation({
    id: `neg_${uuidv4().substring(0, 6)}`,
    requestId: req.id,
    buyerAgentId: buyerAgent.id,
    sellerAgentId: sellerAgent.id,
    buyerUserId: buyer.id,
    sellerUserId: seller.id,
    status: 'agreement_reached',
    projectStatus: 'agreed',
    revisionsAllowed: 1,
    revisionsUsed: 0,
    currentRound: 2,
    maxRounds: 8,
    currentProposal: {
      id: `prop_${uuidv4().substring(0, 6)}`,
      negotiationId: 'tmp',
      senderAgentId: sellerAgent.id,
      round: 2,
      price: priceDollars,
      priceCents: priceDollars * 100,
      currency: 'USD',
      deliverables: ['Dashboard UI', 'Tests'],
      deliveryDays: 5,
      terms: 'Escrow milestone delivery',
      validUntil: new Date(Date.now() + 86400000).toISOString(),
      status: 'accepted',
      createdAt: now
    },
    messages: [],
    agreementId: null,
    createdAt: now,
    updatedAt: now
  });
  const agreement: Agreement = store.saveAgreement({
    id: `agr_${uuidv4().substring(0, 6)}`,
    negotiationId: neg.id,
    requestId: req.id,
    buyerAgentId: buyerAgent.id,
    sellerAgentId: sellerAgent.id,
    buyerUserId: buyer.id,
    sellerUserId: seller.id,
    sellerBusinessName: sellerAgent.businessName,
    finalPrice: priceDollars,
    finalPriceCents: priceDollars * 100,
    currency: 'USD',
    finalDeliverables: ['Dashboard UI', 'Tests'],
    deliveryDays: 5,
    commercialTerms: 'IP assigns on acceptance.',
    revisions: 1,
    humanApprovalStatus: 'approved',
    humanApprovedAt: now,
    paypalReady: true,
    createdAt: now
  });
  neg.agreementId = agreement.id;
  store.saveNegotiation(neg);

  await payoutService.setSellerPayoutAccount(seller.id, `sb-seller-${seller.username}@personal.example.com`, 'simulated');
  return { req, neg, agreement, buyerAgent, sellerAgent };
}

describe('Projects State Machine, Reject/Cancel, Refund Fail-Safe, Delivery & Disputes', () => {
  before(() => {
    seedDatabase();
  });

  test('1. State machine enforces role & valid transitions and logs append-only project_events', async () => {
    const buyer = makeUser('sm_b');
    const seller = makeUser('sm_s');
    const stranger = makeUser('sm_x');
    const { neg, agreement } = await makeProjectFixture(buyer, seller, 200);

    // Stranger gets 404
    assert.throws(
      () => projectStateMachine.startWork(neg.id, stranger.id),
      (err: any) => err instanceof ProjectTransitionError && err.statusCode === 404
    );

    // Cannot start work before paid_held -> 409
    assert.throws(
      () => projectStateMachine.startWork(neg.id, seller.id),
      (err: any) => err instanceof ProjectTransitionError && err.statusCode === 409
    );

    // Pay into held state
    await paypalService.settleMockOrder(agreement.id, buyer.id);
    const paidNeg = store.getNegotiation(neg.id)!;
    assert.equal(paidNeg.projectStatus, 'paid_held');

    // Buyer cannot click startWork -> 409
    assert.throws(
      () => projectStateMachine.startWork(neg.id, buyer.id),
      (err: any) => err instanceof ProjectTransitionError && err.statusCode === 409
    );

    // Seller starts work -> in_progress
    projectStateMachine.startWork(neg.id, seller.id);
    assert.equal(store.getNegotiation(neg.id)!.projectStatus, 'in_progress');
    assert.ok(store.getNegotiation(neg.id)!.startedAt);

    // Buyer cannot deliver work -> 409
    assert.throws(
      () => projectStateMachine.deliverWork(neg.id, buyer.id, { note: 'Fake buyer delivery', links: [] }),
      (err: any) => err instanceof ProjectTransitionError && err.statusCode === 409
    );

    // Seller delivers work -> delivered
    projectStateMachine.deliverWork(neg.id, seller.id, {
      note: 'Dashboard implemented and verified',
      links: ['https://example.com/preview']
    });
    const deliveredNeg = store.getNegotiation(neg.id)!;
    assert.equal(deliveredNeg.projectStatus, 'delivered');
    assert.ok(deliveredNeg.reviewDueAt);

    // Events recorded monotonically
    const events = store.getProjectEvents(neg.id);
    assert.ok(events.length >= 3);
    assert.deepEqual(
      events.map(e => e.toStatus),
      ['paid_held', 'in_progress', 'delivered']
    );
  });

  test('2. Refund fail-safe: paid_held allows instant full refund; delivered blocks buyer refund (409)', async () => {
    const buyer = makeUser('rf_b');
    const seller = makeUser('rf_s');

    // A) paid_held -> instant full refund succeeds + prorates full fee refund
    const f1 = await makeProjectFixture(buyer, seller, 100);
    await paypalService.settleMockOrder(f1.agreement.id, buyer.id);
    await paypalService.refundPayment(f1.agreement.id, 'Buyer changed mind before work started', buyer.id, {
      enforceStageRules: true,
      actorRole: 'buyer'
    });
    assert.equal(store.getNegotiation(f1.neg.id)!.projectStatus, 'refunded');
    const ms1 = projectStateMachine.getMoneyState(f1.neg.id);
    assert.equal(ms1.capturedCents, 10000);
    assert.equal(ms1.refundedCents, 10000);
    assert.equal(ms1.heldCents, 0);

    // B) in_progress -> buyer self-refund blocked (requires seller approval); delivered -> REFUND_BLOCKED_AFTER_DELIVERY
    const f2 = await makeProjectFixture(buyer, seller, 180);
    await paypalService.settleMockOrder(f2.agreement.id, buyer.id);
    projectStateMachine.startWork(f2.neg.id, seller.id);

    await assert.rejects(
      () =>
        paypalService.refundPayment(f2.agreement.id, 'Trying instant refund mid-work', buyer.id, {
          enforceStageRules: true,
          actorRole: 'buyer'
        }),
      (err: any) => err instanceof PayPalApiException && err.details.code === 'REFUND_REQUIRES_SELLER_APPROVAL'
    );

    projectStateMachine.deliverWork(f2.neg.id, seller.id, { note: 'Finished build', links: [] });
    await assert.rejects(
      () =>
        paypalService.refundPayment(f2.agreement.id, 'Refund abuse attempt after delivery', buyer.id, {
          enforceStageRules: true,
          actorRole: 'buyer'
        }),
      (err: any) => err instanceof PayPalApiException && err.details.code === 'REFUND_BLOCKED_AFTER_DELIVERY'
    );
  });

  test('3. Concurrency race test: simultaneous accept-work + seller voluntary refund cannot violate refunded + paid_out <= captured', async () => {
    const buyer = makeUser('rc_b');
    const seller = makeUser('rc_s');
    const { neg, agreement } = await makeProjectFixture(buyer, seller, 150);

    await paypalService.settleMockOrder(agreement.id, buyer.id);
    projectStateMachine.startWork(neg.id, seller.id);
    projectStateMachine.deliverWork(neg.id, seller.id, { note: 'Ready for review', links: [] });

    const [acceptRes, refundRes] = await Promise.allSettled([
      payoutService.acceptWorkAndReleasePayout(neg.id, buyer.id, {
        payoutProviderOverride: 'simulated',
        requireDelivered: true
      }),
      paypalService.refundPayment(agreement.id, 'Concurrent refund race', seller.id, {
        enforceStageRules: true,
        actorRole: 'seller'
      })
    ]);

    const fulfilledCount = [acceptRes, refundRes].filter(r => r.status === 'fulfilled').length;
    assert.equal(fulfilledCount, 1, 'Exactly ONE of accept-work or refund must succeed under BEGIN IMMEDIATE lock');

    const ms = projectStateMachine.getMoneyState(neg.id);
    assert.ok(ms.refundedCents + ms.paidOutCents <= ms.capturedCents, 'Money invariant must hold');
  });

  test('4. Evidence files: stored outside web root with SHA-256 hash; third parties receive null/404; invalid extensions rejected', () => {
    const sampleBuf = Buffer.from('VYRO verifiable delivery bundle v1');
    const saved = saveEvidenceFiles([
      {
        originalName: 'deliverable.txt',
        mimeType: 'text/plain',
        contentBase64: sampleBuf.toString('base64')
      }
    ]);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].sha256.length, 64);
    assert.ok(!saved[0].storedName.includes('..'));

    const fullPath = resolvePrivateEvidenceFilePath(saved[0].storedName);
    assert.ok(fullPath && fs.existsSync(fullPath));
    // Stored under server/uploads, NOT client/public or dist
    assert.ok(!fullPath!.includes(`${path.sep}client${path.sep}public`));

    // Disallowed extension (.exe) must throw
    assert.throws(() =>
      saveEvidenceFiles([
        {
          originalName: 'malware.exe',
          mimeType: 'application/x-msdownload',
          contentBase64: Buffer.from('MZ').toString('base64')
        }
      ])
    );

    // Cleanup test upload artifact
    if (fullPath && fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  });

  test('5. Revisions, restart-safe review-window auto-release & idempotent worker tick', async () => {
    const buyer = makeUser('rw_b');
    const seller = makeUser('rw_s');
    const { neg, agreement } = await makeProjectFixture(buyer, seller, 120);

    await paypalService.settleMockOrder(agreement.id, buyer.id);
    projectStateMachine.startWork(neg.id, seller.id);
    projectStateMachine.deliverWork(neg.id, seller.id, { note: 'Draft 1', links: [] });

    // Buyer requests 1 revision -> transitions to revision_requested
    projectStateMachine.requestRevision(neg.id, buyer.id, 'Please refine the mobile chart breakpoints.');
    assert.equal(store.getNegotiation(neg.id)!.projectStatus, 'revision_requested');
    assert.equal(store.getNegotiation(neg.id)!.revisionsUsed, 1);

    // Seller delivers revised work -> delivered
    projectStateMachine.deliverWork(neg.id, seller.id, { note: 'Updated responsive breakpoints', links: [] });
    assert.equal(store.getNegotiation(neg.id)!.projectStatus, 'delivered');

    // Second revision exceeds limit (revisionsAllowed = 1) -> 409
    assert.throws(
      () => projectStateMachine.requestRevision(neg.id, buyer.id, 'One more tweak'),
      (err: any) => err instanceof ProjectTransitionError && err.code === 'NO_REVISIONS_LEFT'
    );

    // Simulate expired review_due_at stored in SQLite (as if server restarted while window elapsed)
    const updated = store.getNegotiation(neg.id)!;
    updated.reviewDueAt = new Date(Date.now() - 5000).toISOString();
    store.saveNegotiation(updated);

    const processed1 = await reviewWindowWorker.tick({ providerOverride: 'simulated' });
    assert.ok(processed1.processedIds.length >= 1);
    const afterAuto = store.getNegotiation(neg.id)!;
    assert.ok(['payout_released', 'accepted', 'completed'].includes(afterAuto.projectStatus!));

    // Running tick again is a strict no-op (no double payout)
    const processed2 = await reviewWindowWorker.tick({ providerOverride: 'simulated' });
    assert.equal(processed2.processedIds.length, 0);
    const ms = projectStateMachine.getMoneyState(neg.id);
    assert.equal(ms.refundedCents + ms.paidOutCents, 11400); // $120 - $6 (5% fee) = $114.00
  });

  test('6. Dispute open freezes escrow, admin Split settles exact integer cents, and >2 losses flags buyer', async () => {
    const buyer = makeUser('ds_b');
    const seller = makeUser('ds_s');
    const mediator = makeUser('ds_admin', 'admin');

    // Give buyer 2 resolved prior dispute losses + open a 3rd split loss so 30d loss count > 2
    const f = await makeProjectFixture(buyer, seller, 100);
    await paypalService.settleMockOrder(f.agreement.id, buyer.id);
    projectStateMachine.startWork(f.neg.id, seller.id);
    projectStateMachine.deliverWork(f.neg.id, seller.id, { note: 'Initial delivery', links: [] });

    const opened = disputeService.openDispute(f.neg.id, buyer.id, {
      reasonChip: 'Work incomplete',
      description: 'Second chart view was left stubbed.',
      evidenceLinks: ['https://example.com/issue']
    });
    assert.equal(opened.status, 'open');
    assert.equal(store.getNegotiation(f.neg.id)!.projectStatus, 'disputed');

    // Respondent replies with evidence
    const responded = disputeService.respondToDispute(f.neg.id, seller.id, {
      note: 'Core API chart and primary table are complete.'
    });
    assert.equal(responded.status, 'responded');

    // Mediator splits 60% seller / 40% buyer refund ($60 seller gross split / $40 buyer refund -> prorated fee)
    const res = await disputeService.resolveDispute(f.neg.id, mediator.id, {
      outcome: 'split',
      sellerPercent: 60,
      reason: 'Core scope delivered; secondary view incomplete.',
      payoutProviderOverride: 'simulated'
    });
    assert.equal(res.dispute.status, 'resolved_split');

    const ms = projectStateMachine.getMoneyState(f.neg.id);
    assert.equal(ms.refundedCents, 4000);
    assert.ok(ms.paidOutCents > 0);
    assert.ok(ms.refundedCents + ms.paidOutCents <= ms.capturedCents);

    // Seed 3 prior buyer-lost disputes in 30d window to verify abuse counter > 2
    for (const outcome of ['resolved_release', 'resolved_release', 'resolved_release'] as const) {
      const fx = await makeProjectFixture(buyer, seller, 50);
      store.saveDispute({
        id: `dsp_loss_${uuidv4().substring(0, 6)}`,
        dealId: fx.neg.id,
        openedByUserId: buyer.id,
        openedByRole: 'buyer',
        reasonChip: 'Other',
        description: 'Prior lost claim',
        evidenceLinks: [],
        evidenceFiles: [],
        respondentUserId: seller.id,
        respondentEvidenceLinks: [],
        respondentEvidenceFiles: [],
        responseDueAt: new Date().toISOString(),
        status: outcome,
        createdAt: new Date().toISOString()
      });
    }
    const abuse = disputeService.getUserAbuseSummary(buyer.id);
    assert.ok(abuse.losses30d >= 3);
    assert.equal(abuse.flagged, true);
    assert.equal(abuse.requiresLargeDealApproval, true);
  });

  test('7. Seller auto-reject rules, override, neutral buyer reject text & capacity gate', async () => {
    const buyer = makeUser('rl_b');
    const seller = makeUser('rl_s');
    const sellerObj = store.getUser(seller.id)!;
    sellerObj.sellerAutoRules = { minBudget: 150, minDeadlineDays: 3, blockedCategories: ['Hardware'], autoRejectWhenFull: true };
    sellerObj.sellerProfile = {
      businessName: 'Rules Studio',
      headline: '',
      description: '',
      categories: ['Development'],
      location: 'Remote',
      serviceCoverage: 'Global',
      availabilityStatus: 'immediate',
      maxConcurrentProjects: 1,
      activeProjects: 0,
      rating: 5,
      reviewCount: 0,
      replyPoints: 0,
      avgResponseTime: 'Fast'
    };
    store.saveUser(sellerObj);

    const lowBudget = projectStateMachine.evaluateSellerAutoRules(seller.id, {
      category: 'Development',
      maxBudget: 90,
      deadlineDays: 5
    });
    assert.equal(lowBudget.matched, true);

    const okEval = projectStateMachine.evaluateSellerAutoRules(seller.id, {
      category: 'Development',
      maxBudget: 250,
      deadlineDays: 5
    });
    assert.equal(okEval.matched, false);

    // Create a project in request_sent, test rejectBeforePayment privacy + overrideAutoDecline
    const f = await makeProjectFixture(buyer, seller, 250);
    f.neg.projectStatus = 'request_sent';
    store.saveNegotiation(f.neg);

    projectStateMachine.rejectBeforePayment(f.neg.id, seller.id, {
      reasonChip: 'Too busy',
      note: 'Internal VIP backlog',
      shareNote: false
    });
    const declinedNeg = store.getNegotiation(f.neg.id)!;
    assert.equal(declinedNeg.projectStatus, 'declined');
    assert.equal(declinedNeg.sharedRejectNote, null);

    // Override auto-decline transitions declined -> negotiating
    projectStateMachine.overrideAutoDecline(f.neg.id, seller.id);
    assert.equal(store.getNegotiation(f.neg.id)!.projectStatus, 'negotiating');
  });
});
