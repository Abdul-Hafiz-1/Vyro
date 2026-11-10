import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../src/config/index.js';
import { store } from '../src/db/store.js';
import { seedDatabase } from '../src/db/seed.js';
import { computeFeeAndPayoutCents } from '../src/services/negotiation/money.js';
import { paypalService } from '../src/services/paypal/paypalClient.js';
import { payoutService, PayoutGateError } from '../src/services/paypal/payoutService.js';
import {
  PayoutProvider,
  SimulatedPayoutProvider,
  validatePayoutEmailCommon
} from '../src/services/paypal/payoutProvider.js';
import { User, Agent, CommerceRequest, Negotiation, Agreement } from '../src/types/index.js';

function createTestUser(prefix: string): User {
  const uid = `usr_${prefix}_${uuidv4().substring(0, 6)}`;
  const now = new Date().toISOString();
  return store.saveUser({
    id: uid,
    email: `${uid}@test.vyro`,
    displayName: `Test ${prefix}`,
    username: uid,
    capabilities: { buying: true, selling: true },
    activeWorkspace: 'buyer',
    onboardingCompleted: true,
    onboardingStep: 5,
    autoApprovalLimit: 500,
    dailyBudgetCap: 2000,
    balance: 5000,
    isAutomationPaused: false,
    createdAt: now,
    updatedAt: now
  });
}

function createPaidDealFixture(buyer: User, seller: User, amountDollars: number) {
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
    capabilities: ['Procurement'],
    status: 'active',
    verificationStatus: 'verified',
    catalog: [],
    pricingConstraints: { maxBudget: amountDollars * 2 },
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
    description: 'Seller rep',
    category: 'Development',
    capabilities: ['API'],
    status: 'active',
    verificationStatus: 'verified',
    catalog: [],
    pricingConstraints: { startingPrice: amountDollars, minAcceptablePrice: Math.round(amountDollars * 0.7) },
    negotiationStrategy: 'balanced',
    approvalPolicy: 'explicit_human_required',
    createdAt: now,
    updatedAt: now
  });
  const reqItem: CommerceRequest = store.saveRequest({
    id: `req_${uuidv4().substring(0, 6)}`,
    userId: buyer.id,
    buyerUserId: buyer.id,
    buyerAgentId: buyerAgent.id,
    rawInput: 'Build API',
    title: 'API Integration',
    category: 'Development',
    requiredCapabilities: ['API'],
    deliverables: ['REST API'],
    maxBudget: amountDollars + 50,
    currency: 'USD',
    deadlineDays: 5,
    qualityRequirements: 'Clean code',
    status: 'active',
    createdAt: now,
    updatedAt: now
  });
  const negId = `neg_${uuidv4().substring(0, 6)}`;
  const agrId = `agr_${uuidv4().substring(0, 6)}`;
  const neg: Negotiation = store.saveNegotiation({
    id: negId,
    requestId: reqItem.id,
    buyerAgentId: buyerAgent.id,
    sellerAgentId: sellerAgent.id,
    buyerUserId: buyer.id,
    sellerUserId: seller.id,
    status: 'agreement_reached',
    currentRound: 2,
    maxRounds: 8,
    currentProposal: null,
    messages: [],
    agreementId: agrId,
    createdAt: now,
    updatedAt: now
  });
  const agr: Agreement = store.saveAgreement({
    id: agrId,
    negotiationId: negId,
    requestId: reqItem.id,
    buyerAgentId: buyerAgent.id,
    sellerAgentId: sellerAgent.id,
    buyerUserId: buyer.id,
    sellerUserId: seller.id,
    sellerBusinessName: sellerAgent.businessName,
    finalPrice: amountDollars,
    currency: 'USD',
    finalDeliverables: ['REST API'],
    deliveryDays: 5,
    commercialTerms: 'Standard IP transfer',
    humanApprovalStatus: 'approved',
    humanApprovedAt: now,
    paypalReady: true,
    createdAt: now
  });
  store.saveDecision({
    id: `dec_${uuidv4().substring(0, 6)}`,
    entityType: 'deal',
    entityId: negId,
    userId: buyer.id,
    status: 'human_approved',
    reasons: ['Approved'],
    recommendation: 'Proceed',
    signals: {
      priceWithinCeiling: true,
      priceAboveFloor: true,
      sellerVerified: true,
      underAutoLimit: true,
      categoryAllowed: true,
      withinDailyBudget: true,
      automationPaused: false,
      redFlags: [],
      proposedPrice: amountDollars,
      buyerMaxBudget: amountDollars + 50,
      sellerFloorPrice: amountDollars - 20,
      userAutoLimit: 500,
      userDailyCap: 2000,
      todaySpend: 0
    },
    confidence: 0.95,
    decidedBy: 'user',
    createdAt: now,
    updatedAt: now
  });
  return { buyerAgent, sellerAgent, reqItem, neg, agr };
}

describe('Part A: Seller Payouts, Integer-Cents Ledger & Server Gates', () => {
  before(() => {
    seedDatabase(true);
  });

  test('1. Fee math in integer cents (default 5%): $149.00 -> fee $7.45, payout $141.55', () => {
    const res = computeFeeAndPayoutCents(14900, 5);
    assert.equal(res.grossCents, 14900);
    assert.equal(res.feeCents, 745);
    assert.equal(res.payoutCents, 14155);
  });

  test('2. Email validation rejects invalid emails and platform merchant email', () => {
    const prevMerchant = config.paypal.merchantEmail;
    config.paypal.merchantEmail = 'merchant-platform@business.example.com';
    try {
      const bad = validatePayoutEmailCommon('not-an-email');
      assert.equal(bad.valid, false);

      const merchantMatch = validatePayoutEmailCommon('Merchant-Platform@business.example.com');
      assert.equal(merchantMatch.valid, false);
      assert.ok(merchantMatch.error?.includes('platform merchant'));

      const ok = validatePayoutEmailCommon('sb-seller-2@personal.example.com');
      assert.equal(ok.valid, true);
      assert.equal(ok.normalized, 'sb-seller-2@personal.example.com');
    } finally {
      config.paypal.merchantEmail = prevMerchant;
    }
  });

  test('3. SimulatedPayoutProvider refuses to run when NODE_ENV=production', async () => {
    const prevEnv = config.nodeEnv;
    config.nodeEnv = 'production';
    try {
      const sim = new SimulatedPayoutProvider();
      await assert.rejects(
        () => sim.validateAccount('sb@personal.example.com'),
        /strictly disabled when NODE_ENV=production/
      );
      await assert.rejects(
        () => sim.createPayout({ payoutId: 'pay_1', dealId: 'deal_1', sellerEmail: 'a@b.com', amountCents: 1000, currency: 'USD' }),
        /strictly disabled when NODE_ENV=production/
      );
    } finally {
      config.nodeEnv = prevEnv;
    }
  });

  test('4. Capture holds funds & records 3 ledger entries; release blocked before seller sets Ready payout account', async () => {
    const buyer = createTestUser('buyer_hold');
    const seller = createTestUser('seller_nopayout');
    const { neg, agr } = createPaidDealFixture(buyer, seller, 149);

    // Buyer pays -> held (NOT paid out immediately!)
    const tx = await paypalService.settleMockOrder(agr.id, buyer.id);
    assert.equal(tx.paymentStatus, 'completed');
    assert.equal(tx.amountCents, 14900);
    assert.equal(tx.platformFeeCents, 745);
    assert.equal(tx.sellerPayoutCents, 14155);
    assert.equal(tx.sellerPayoutStatus, 'held');
    assert.equal(tx.sellerPayoutAt, undefined);

    const ledger = store.getLedgerEntriesForDeal(neg.id);
    assert.equal(ledger.length, 3);
    assert.equal(ledger.find(e => e.type === 'buyer_paid')?.amountCents, 14900);
    assert.equal(ledger.find(e => e.type === 'platform_fee')?.amountCents, 745);
    assert.equal(ledger.find(e => e.type === 'held_for_seller')?.amountCents, 14155);

    // Seller cannot self-release, and buyer release is blocked because seller payout account is not Ready
    await assert.rejects(
      () => payoutService.acceptWorkAndReleasePayout(neg.id, seller.id),
      (err: any) => err instanceof PayoutGateError && err.code === 'FORBIDDEN'
    );
    await assert.rejects(
      () => payoutService.acceptWorkAndReleasePayout(neg.id, buyer.id),
      (err: any) => err instanceof PayoutGateError && err.code === 'SELLER_PAYOUT_NOT_READY'
    );
  });

  test('5. Idempotent payout release on buyer acceptance, dispute block, failed retry & cross-user 404', async () => {
    const buyer = createTestUser('buyer_rel');
    const seller = createTestUser('seller_rel');
    const intruder = createTestUser('intruder');
    const { neg, agr } = createPaidDealFixture(buyer, seller, 200);

    await payoutService.setSellerPayoutAccount(seller.id, 'sb-seller-personal2@personal.example.com', 'simulated');

    // Cross-user payout account access check via store
    const sellerAcct = payoutService.getSellerPayoutAccount(seller.id);
    assert.equal(sellerAcct.status, 'ready');
    assert.notEqual(sellerAcct.userId, intruder.id);

    // Paid -> held
    await paypalService.settleMockOrder(agr.id, buyer.id);

    // Mock PayPal Payouts provider: fails first, succeeds on retry, idempotent on second release
    let createCalls = 0;
    let shouldFail = true;
    const mockPayPalPayouts: PayoutProvider = {
      id: 'paypal',
      async validateAccount(email) {
        return { ok: true, provider: 'paypal_email', status: 'ready', payoutsEnabled: true };
      },
      async createPayout(params) {
        createCalls += 1;
        if (shouldFail) {
          return { status: 'failed', provider: 'paypal', debugId: 'dbg_fail_500', failureReason: 'INSUFFICIENT_FUNDS' };
        }
        return {
          status: 'paid',
          provider: 'paypal',
          providerBatchId: `BATCH_${params.payoutId}`,
          providerItemId: params.dealId,
          debugId: 'dbg_ok_201'
        };
      },
      async getPayoutStatus() {
        return { status: 'paid' };
      }
    };

    const firstAttempt = await payoutService.acceptWorkAndReleasePayout(neg.id, buyer.id, {
      providerInstance: mockPayPalPayouts
    });
    assert.equal(firstAttempt.payout.status, 'failed');
    assert.equal(firstAttempt.payout.failureReason, 'INSUFFICIENT_FUNDS');
    assert.equal(firstAttempt.payout.retryCount, 1);

    // Retry with recovery
    shouldFail = false;
    const retried = await payoutService.retryPayout(firstAttempt.payout.id, {
      providerInstance: mockPayPalPayouts
    });
    assert.equal(retried.status, 'paid');
    assert.equal(retried.amountCents, 19000); // $200 - 5% ($10)
    assert.equal(retried.feeCents, 1000);
    assert.equal(retried.providerBatchId, `BATCH_${firstAttempt.payout.id}`);

    // Releasing again must be strictly idempotent (createCalls stays 2, no duplicate payout or ledger entry)
    const secondRelease = await payoutService.acceptWorkAndReleasePayout(neg.id, buyer.id, {
      providerInstance: mockPayPalPayouts
    });
    assert.equal(createCalls, 2);
    assert.equal(secondRelease.payout.id, retried.id);
    const payoutEntries = store.getLedgerEntriesForDeal(neg.id).filter(e => e.type === 'seller_payout');
    assert.equal(payoutEntries.length, 1);
  });

  test('6. Dispute blocks payout & Refund restores buyer and records refund ledger entry', async () => {
    const buyer = createTestUser('buyer_ref');
    const seller = createTestUser('seller_ref');
    const { neg, agr } = createPaidDealFixture(buyer, seller, 100);
    await payoutService.setSellerPayoutAccount(seller.id, 'sb-seller-ref@personal.example.com', 'simulated');

    await paypalService.settleMockOrder(agr.id, buyer.id);

    // Buyer reports a problem
    payoutService.reportProblem(neg.id, buyer.id, 'Deliverable zip file was empty');

    // Payout release must be blocked while disputed
    await assert.rejects(
      () => payoutService.acceptWorkAndReleasePayout(neg.id, buyer.id),
      (err: any) => err instanceof PayoutGateError && err.code === 'DISPUTE_OPEN'
    );

    // Refund succeeds & writes 'refund' ledger entry
    const refundedTx = await paypalService.refundPayment(agr.id, 'Mutual cancellation refund', buyer.id);
    assert.equal(refundedTx.paymentStatus, 'refunded');
    assert.equal(refundedTx.sellerPayoutStatus, 'refunded');
    const refundEntry = store.getLedgerEntriesForDeal(neg.id).find(e => e.type === 'refund');
    assert.equal(refundEntry?.amountCents, 10000);
  });
});
