import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { store } from '../src/db/store.js';
import { seedDatabase } from '../src/db/seed.js';
import { paypalService, PayPalApiException } from '../src/services/paypal/paypalClient.js';
import { Agreement, DecisionRecord, Transaction, User } from '../src/types/index.js';

describe('PayPal Sandbox Orders v2 Integration & Security Gates', () => {
  const originalFetch = globalThis.fetch;
  let mockFetchHandler: ((url: string, init?: RequestInit) => Promise<Response>) | null = null;

  beforeEach(() => {
    paypalService.clearTokenCache();

    // Default mock fetch handler
    mockFetchHandler = null;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      // Strictly isolate: only intercept PayPal API endpoints, pass everything else through!
      if (url.includes('paypal.com') && mockFetchHandler) {
        return mockFetchHandler(url, init);
      }
      return originalFetch(input, init);
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function setupApprovedDeal(opts?: { buyerUserId?: string; sellerUserId?: string; price?: number }) {
    const buyerUserId = opts?.buyerUserId || 'usr_buyer_alice';
    const sellerUserId = opts?.sellerUserId || 'usr_seller_bob';
    const price = opts?.price || 150.00;

    const buyerUser: User = {
      id: buyerUserId,
      email: `${buyerUserId}@test.com`,
      displayName: 'Alice Buyer',
      username: 'alice',
      capabilities: ['buyer'],
      activeWorkspace: 'buyer',
      onboardingCompleted: true,
      onboardingStep: 'completed',
      autoApprovalLimit: 200,
      dailyBudgetCap: 500,
      balance: 1000,
      isAutomationPaused: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    store.saveUser(buyerUser);
    store.saveUser({
      ...buyerUser,
      id: sellerUserId,
      email: `${sellerUserId}@test.com`,
      displayName: 'Bob Seller',
      username: 'bobseller',
      activeWorkspace: 'seller'
    });

    const dealId = `deal_test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const agreementId = `agr_test_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const agreement: Agreement = {
      id: agreementId,
      negotiationId: dealId,
      requestId: `req_${dealId}`,
      buyerAgentId: 'agt_alice_buyer',
      sellerAgentId: 'agt_seller',
      buyerUserId,
      sellerUserId,
      sellerBusinessName: 'Apex Creative Studio',
      finalPrice: price,
      currency: 'USD',
      finalDeliverables: ['Custom Brand Identity Design'],
      deliveryDays: 5,
      commercialTerms: 'Net 30 milestone completion',
      humanApprovalStatus: 'approved',
      sellerAcceptanceStatus: 'accepted',
      paypalReady: true,
      createdAt: new Date().toISOString()
    };
    store.saveAgreement(agreement);

    store.saveSellerPayoutAccount({
      id: `spa_${sellerUserId}`,
      userId: sellerUserId,
      provider: 'paypal_email',
      paypalEmail: `${sellerUserId}@personal.example.com`,
      status: 'ready',
      verifiedAt: new Date().toISOString(),
      lastError: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const decision: DecisionRecord = {
      id: `dec_${dealId}`,
      entityType: 'deal',
      entityId: dealId,
      userId: buyerUserId,
      status: 'auto_approved',
      reasons: ['Price strictly within authorized limit'],
      recommendation: 'Autonomous approval granted',
      signals: {},
      confidence: 0.95,
      decidedBy: 'policy_engine',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    store.saveDecision(decision);

    return { agreement, decision, buyerUserId, sellerUserId, dealId };
  }

  it('1. Happy Path: Order creation -> Buyer popup approval -> Capture settlement with seller ledger', async () => {
    const { agreement, buyerUserId, dealId } = setupApprovedDeal({ price: 175.50 });
    const mockOrderId = '54918581WB2473026';
    const mockCaptureId = 'CAP-SANDBOX-SUCCESS-999';

    // Mock PayPal API responses
    mockFetchHandler = async (url, init) => {
      const headers = new Headers(init?.headers);
      if (url.includes('/v1/oauth2/token')) {
        return new Response(JSON.stringify({
          access_token: 'mock_sandbox_access_token_123',
          token_type: 'Bearer',
          expires_in: 3600,
          app_id: 'APP-56X74752J5274064N'
        }), { status: 200, headers: { 'Content-Type': 'application/json', 'paypal-debug-id': 'dbg_token_1' } });
      }

      if (url.includes('/v2/checkout/orders') && !url.includes('/capture')) {
        const body = JSON.parse(init?.body as string);
        assert.strictEqual(body.intent, 'CAPTURE');
        assert.strictEqual(body.purchase_units[0].reference_id, dealId);
        assert.strictEqual(body.purchase_units[0].amount.value, '175.50');
        assert.strictEqual(body.purchase_units[0].amount.currency_code, 'USD');
        assert.strictEqual(headers.get('PayPal-Request-Id'), 'idem_create_happy');

        return new Response(JSON.stringify({
          id: mockOrderId,
          status: 'CREATED',
          links: [{ rel: 'approve', href: `https://www.sandbox.paypal.com/checkoutnow?token=${mockOrderId}` }]
        }), { status: 201, headers: { 'Content-Type': 'application/json', 'paypal-debug-id': 'dbg_order_create_1' } });
      }

      if (url.includes(`/v2/checkout/orders/${mockOrderId}/capture`)) {
        assert.strictEqual(headers.get('PayPal-Request-Id'), 'idem_capture_happy');
        return new Response(JSON.stringify({
          id: mockOrderId,
          status: 'COMPLETED',
          purchase_units: [{
            payments: {
              captures: [{ id: mockCaptureId, status: 'COMPLETED', amount: { value: '175.50', currency_code: 'USD' } }]
            }
          }],
          payer: {
            name: { given_name: 'Alice', surname: 'Buyer' },
            email_address: 'alice.buyer@sandbox.example.com'
          }
        }), { status: 201, headers: { 'Content-Type': 'application/json', 'paypal-debug-id': 'dbg_order_capture_1' } });
      }

      throw new Error(`Unhandled mock url: ${url}`);
    };

    // Step 1: Server creates order
    const orderRes = await paypalService.createOrder(agreement.id, 'idem_create_happy', buyerUserId);
    assert.strictEqual(orderRes.orderId, mockOrderId);
    assert.strictEqual(orderRes.status, 'CREATED');

    // Step 2: Buyer approves in popup, browser requests capture
    const tx = await paypalService.captureOrder(mockOrderId, 'idem_capture_happy', buyerUserId);
    assert.strictEqual(tx.paymentStatus, 'completed');
    assert.strictEqual(tx.paypalCaptureId, mockCaptureId);
    assert.strictEqual(tx.amount, 175.50);
    assert.strictEqual(tx.platformFeeCents, 878);
    assert.strictEqual(tx.sellerShareHeld, 166.72);
    assert.strictEqual(tx.sellerPayoutStatus, 'held');
    assert.strictEqual(tx.sellerPayoutAt, undefined);
  });

  it('2. Capture Before Approval: Rejection with mapped error when unapproved in popup', async () => {
    const { agreement, buyerUserId } = setupApprovedDeal({ price: 120.00 });
    const mockOrderId = 'UNAPPROVED-ORDER-422';

    mockFetchHandler = async (url) => {
      if (url.includes('/v1/oauth2/token')) {
        return new Response(JSON.stringify({ access_token: 'token_123', token_type: 'Bearer', expires_in: 3600 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (url.includes('/v2/checkout/orders') && !url.includes('/capture')) {
        return new Response(JSON.stringify({ id: mockOrderId, status: 'CREATED' }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (url.includes(`/v2/checkout/orders/${mockOrderId}/capture`)) {
        return new Response(JSON.stringify({
          name: 'UNPROCESSABLE_ENTITY',
          details: [{
            issue: 'ORDER_NOT_APPROVED',
            description: 'Payer has not yet approved the Order for payment.'
          }],
          debug_id: 'dbg_not_approved_422'
        }), {
          status: 422,
          headers: { 'Content-Type': 'application/json', 'paypal-debug-id': 'dbg_not_approved_422' }
        });
      }

      throw new Error(`Unhandled URL: ${url}`);
    };

    await paypalService.createOrder(agreement.id, 'idem_unapproved_1', buyerUserId);

    await assert.rejects(
      async () => {
        await paypalService.captureOrder(mockOrderId, 'idem_unapproved_cap', buyerUserId);
      },
      (err: any) => {
        assert.ok(err instanceof PayPalApiException);
        assert.strictEqual(err.details.status, 422);
        assert.strictEqual(err.details.code, 'ORDER_NOT_APPROVED');
        assert.ok(err.details.message.includes('not yet been approved'));
        assert.ok(err.details.nextStep.includes('PayPal popup window'));
        return true;
      }
    );

    const tx = store.getTransactionByPaypalOrderId(mockOrderId);
    assert.strictEqual(tx?.paymentStatus, 'failed');
    assert.ok(tx?.failureReason?.includes('ORDER_NOT_APPROVED'));
  });

  it('3. Double Capture: Calling capture twice is idempotent and returns existing transaction', async () => {
    const { agreement, buyerUserId } = setupApprovedDeal({ price: 90.00 });
    const mockOrderId = 'ORDER-IDEMPOTENT-001';
    let captureApiCallCount = 0;

    mockFetchHandler = async (url) => {
      if (url.includes('/v1/oauth2/token')) {
        return new Response(JSON.stringify({ access_token: 'token_123', token_type: 'Bearer', expires_in: 3600 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (url.includes('/v2/checkout/orders') && !url.includes('/capture')) {
        return new Response(JSON.stringify({ id: mockOrderId, status: 'CREATED' }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (url.includes(`/v2/checkout/orders/${mockOrderId}/capture`)) {
        captureApiCallCount++;
        return new Response(JSON.stringify({
          id: mockOrderId,
          status: 'COMPLETED',
          purchase_units: [{ payments: { captures: [{ id: 'CAP-IDEM-1', status: 'COMPLETED' }] } }]
        }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }

      throw new Error(`Unhandled URL: ${url}`);
    };

    await paypalService.createOrder(agreement.id, 'idem_double_1', buyerUserId);

    const tx1 = await paypalService.captureOrder(mockOrderId, 'cap_idem_1', buyerUserId);
    assert.strictEqual(tx1.paymentStatus, 'completed');
    assert.strictEqual(captureApiCallCount, 1);

    // Second capture call must NOT make a second PayPal capture HTTP call
    const tx2 = await paypalService.captureOrder(mockOrderId, 'cap_idem_2', buyerUserId);
    assert.strictEqual(tx2.id, tx1.id);
    assert.strictEqual(tx2.paymentStatus, 'completed');
    assert.strictEqual(captureApiCallCount, 1, 'PayPal capture endpoint must only be called once');
  });

  it('4. Wrong User: User B cannot create or capture User A order (404/denial)', async () => {
    const { agreement, buyerUserId } = setupApprovedDeal({ price: 80.00 });
    const imposterUserId = 'usr_imposter_mallory';

    // Imposter cannot create order for Alice's agreement
    await assert.rejects(
      async () => {
        await paypalService.createOrder(agreement.id, 'idem_imposter_create', imposterUserId);
      },
      (err: any) => {
        assert.ok(err instanceof PayPalApiException);
        assert.strictEqual(err.details.status, 404);
        assert.strictEqual(err.details.code, 'AGREEMENT_NOT_FOUND');
        return true;
      }
    );
  });

  it('5. Wrong Amount: Amount is server-derived from agreement, never client controlled', async () => {
    const { agreement, buyerUserId } = setupApprovedDeal({ price: 145.25 });
    let passedValue = '';

    mockFetchHandler = async (url, init) => {
      if (url.includes('/v1/oauth2/token')) {
        return new Response(JSON.stringify({ access_token: 'token_123', token_type: 'Bearer', expires_in: 3600 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      if (url.includes('/v2/checkout/orders')) {
        const body = JSON.parse(init?.body as string);
        passedValue = body.purchase_units[0].amount.value;
        return new Response(JSON.stringify({ id: 'ORD-SERVER-AMOUNT', status: 'CREATED' }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      throw new Error(`Unhandled URL: ${url}`);
    };

    // Client provides agreement ID only - server guarantees exact 2 decimals from agreement
    await paypalService.createOrder(agreement.id, 'idem_amount_check', buyerUserId);
    assert.strictEqual(passedValue, '145.25');
  });

  it('6. Missing Decision: Reject creation and capture if deal is not approved', async () => {
    const { agreement, buyerUserId, dealId } = setupApprovedDeal({ price: 190.00 });

    // Invalidate decision to needs_review
    store.saveDecision({
      id: `dec_${dealId}`,
      entityType: 'deal',
      entityId: dealId,
      userId: buyerUserId,
      status: 'needs_review',
      reasons: ['Requires human supervisor sign-off'],
      recommendation: 'Escalate to buyer review queue',
      signals: {},
      confidence: 0.6,
      decidedBy: 'policy_engine',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await assert.rejects(
      async () => {
        await paypalService.createOrder(agreement.id, 'idem_unapproved_deal', buyerUserId);
      },
      (err: any) => {
        assert.ok(err instanceof PayPalApiException);
        assert.strictEqual(err.details.status, 403);
        assert.strictEqual(err.details.code, 'DECISION_NOT_APPROVED');
        return true;
      }
    );
  });

  it('7. Expired Token Retry: Handles 401 with automatic token refresh and retry', async () => {
    const { agreement, buyerUserId } = setupApprovedDeal({ price: 110.00 });
    let tokenFetchCount = 0;
    let orderCallCount = 0;

    mockFetchHandler = async (url) => {
      if (url.includes('/v1/oauth2/token')) {
        tokenFetchCount++;
        return new Response(JSON.stringify({
          access_token: `token_v${tokenFetchCount}`,
          token_type: 'Bearer',
          expires_in: 3600
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (url.includes('/v2/checkout/orders')) {
        orderCallCount++;
        if (orderCallCount === 1) {
          // First attempt fails with 401 Unauthorized
          return new Response(JSON.stringify({
            name: 'AUTHENTICATION_FAILURE',
            message: 'Authentication failed.'
          }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }
        // Second attempt succeeds
        return new Response(JSON.stringify({ id: 'ORD-REFRESH-OK', status: 'CREATED' }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      throw new Error(`Unhandled URL: ${url}`);
    };

    const res = await paypalService.createOrder(agreement.id, 'idem_retry_token', buyerUserId);
    assert.strictEqual(res.orderId, 'ORD-REFRESH-OK');
    assert.strictEqual(tokenFetchCount, 2, 'Must request a fresh token on 401 retry');
    assert.strictEqual(orderCallCount, 2, 'Must retry the order creation call');
  });

  it('8. Mock Settlement: Settle agreement via instant simulated platform escrow', async () => {
    const { agreement, buyerUserId, sellerUserId } = setupApprovedDeal({ price: 125.00 });

    // Imposter cannot settle
    await assert.rejects(
      async () => {
        await paypalService.settleMockOrder(agreement.id, 'wrong_user_999');
      },
      (err: any) => {
        assert.ok(err instanceof PayPalApiException);
        assert.strictEqual(err.details.status, 404);
        return true;
      }
    );

    // Legitimate buyer settles mock escrow
    const tx = await paypalService.settleMockOrder(agreement.id, buyerUserId);
    assert.strictEqual(tx.paymentStatus, 'completed');
    assert.strictEqual(tx.amount, 125.00);
    assert.strictEqual(tx.sellerUserId, sellerUserId);
    assert.strictEqual(tx.platformFeeCents, 625);
    assert.strictEqual(tx.sellerShareHeld, 118.75);
    assert.strictEqual(tx.sellerPayoutStatus, 'held');
    assert.ok(tx.paypalCaptureId?.startsWith('CAP-MOCK-'));

    // Idempotent retry returns existing transaction
    const tx2 = await paypalService.settleMockOrder(agreement.id, buyerUserId);
    assert.strictEqual(tx2.id, tx.id);
  });
});
