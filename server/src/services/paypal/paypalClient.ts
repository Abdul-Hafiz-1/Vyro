import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config/index.js';
import { store } from '../../db/store.js';
import { Agreement, Transaction } from '../../types/index.js';
import { dollarsToCents, centsToDollars, computeFeeAndPayoutCents, formatCents } from '../negotiation/money.js';
import { paypalPayoutsProvider } from './payoutProvider.js';

export interface PayPalErrorDetails {
  status: number;
  code: string;
  message: string;
  nextStep: string;
  debugId?: string;
}

export class PayPalApiException extends Error {
  public details: PayPalErrorDetails;

  constructor(details: PayPalErrorDetails) {
    super(details.message);
    this.name = 'PayPalApiException';
    this.details = details;
  }
}

interface PayPalAccessToken {
  token: string;
  expiresAt: number;
}

let cachedToken: PayPalAccessToken | null = null;
let lastCreateOrderDiag: {
  ok: boolean;
  status: string;
  orderId?: string;
  debugId?: string;
  reason?: string;
  timestamp: string;
} | null = null;

export function mapPayPalError(status: number, errorData: any, debugId?: string | null): PayPalErrorDetails {
  const issue = errorData?.details?.[0]?.issue || errorData?.name || '';
  const desc = errorData?.details?.[0]?.description || errorData?.message || '';

  if (issue === 'ORDER_NOT_APPROVED') {
    return {
      status: 422,
      code: 'ORDER_NOT_APPROVED',
      message: 'The payment has not yet been approved by the buyer in the PayPal popup.',
      nextStep: 'Please complete the approval process in the PayPal popup window, then proceed.',
      debugId: debugId || undefined
    };
  }

  if (issue === 'INSTRUMENT_DECLINED') {
    return {
      status: 400,
      code: 'INSTRUMENT_DECLINED',
      message: 'The selected payment method was declined by PayPal.',
      nextStep: 'Please open PayPal and select an alternative card, balance, or funding method.',
      debugId: debugId || undefined
    };
  }

  if (issue === 'PAYER_ACTION_REQUIRED') {
    return {
      status: 400,
      code: 'PAYER_ACTION_REQUIRED',
      message: 'Additional authentication or verification is required on your PayPal account.',
      nextStep: 'Follow the verification prompts inside the PayPal window to clear your account.',
      debugId: debugId || undefined
    };
  }

  if (issue === 'UNPROCESSABLE_ENTITY' || status === 422) {
    return {
      status: 422,
      code: 'UNPROCESSABLE_ENTITY',
      message: `PayPal could not process this request: ${desc || 'Semantically invalid transaction'}.`,
      nextStep: 'Verify the agreement amount, currency code, and sandbox account status.',
      debugId: debugId || undefined
    };
  }

  if (status === 401 || issue === 'AUTHENTICATION_FAILURE') {
    return {
      status: 401,
      code: 'AUTHENTICATION_FAILURE',
      message: 'PayPal Sandbox OAuth authentication failed.',
      nextStep: 'Verify your PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET credentials in .env.',
      debugId: debugId || undefined
    };
  }

  return {
    status,
    code: issue || 'PAYPAL_ERROR',
    message: desc || `PayPal returned status ${status}.`,
    nextStep: 'Please retry the checkout operation or inspect PayPal developer dashboard logs.',
    debugId: debugId || undefined
  };
}

export class PayPalService {
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string;

  constructor() {
    this.clientId = config.paypal.clientId;
    this.clientSecret = config.paypal.clientSecret;
    this.baseUrl = config.paypal.baseUrl;
  }

  public isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret && !this.clientId.includes('YOUR_'));
  }

  public clearTokenCache(): void {
    cachedToken = null;
  }

  /**
   * Generates or returns a valid OAuth 2.0 bearer token for PayPal REST API.
   */
  public async getAccessToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh && cachedToken && cachedToken.expiresAt > Date.now()) {
      return cachedToken.token;
    }

    if (!this.isConfigured()) {
      throw new PayPalApiException({
        status: 503,
        code: 'PAYPAL_NOT_CONFIGURED',
        message: 'PayPal credentials are not configured.',
        nextStep: 'Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to your .env file.'
      });
    }

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials'
    });

    const debugId = response.headers.get('paypal-debug-id');

    if (!response.ok) {
      let errBody: any;
      try {
        errBody = await response.json();
      } catch {
        errBody = { message: await response.text() };
      }
      console.error(`[PayPal OAuth Error] Status: ${response.status}, Debug-ID: ${debugId || 'none'}`);
      throw new PayPalApiException(mapPayPalError(response.status, errBody, debugId));
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000
    };
    return cachedToken.token;
  }

  /**
   * Performs an independent health check verifying OAuth connectivity.
   */
  public async checkHealth(): Promise<{
    ok: boolean;
    connected: boolean;
    env: string;
    appId?: string;
    debugId?: string;
    reason?: string;
  }> {
    if (!this.isConfigured()) {
      return {
        ok: false,
        connected: false,
        env: config.paypal.env,
        reason: 'PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET is missing or placeholder.'
      };
    }

    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      });

      const debugId = response.headers.get('paypal-debug-id') || undefined;

      if (!response.ok) {
        const text = await response.text();
        return {
          ok: false,
          connected: false,
          env: config.paypal.env,
          debugId,
          reason: `PayPal OAuth responded with HTTP ${response.status}: ${text}`
        };
      }

      const json = await response.json() as any;
      return {
        ok: true,
        connected: true,
        env: config.paypal.env,
        appId: json.app_id,
        debugId
      };
    } catch (err: any) {
      return {
        ok: false,
        connected: false,
        env: config.paypal.env,
        reason: err.message
      };
    }
  }

  public async getDiagnostics(): Promise<{
    tokenOk: boolean;
    tokenDebugId?: string;
    tokenReason?: string;
    payoutsEnabled: boolean;
    payoutsDebugId?: string;
    payoutsReason?: string;
    providerInUse: string;
    platformFeePercent: number;
    merchantEmailConfigured: boolean;
    lastCreateOrderResult: typeof lastCreateOrderDiag;
    env: string;
  }> {
    const health = await this.checkHealth();
    const payoutsCap = health.ok
      ? await paypalPayoutsProvider.checkPayoutsCapability()
      : { enabled: false, reason: health.reason };
    return {
      tokenOk: health.ok,
      tokenDebugId: health.debugId,
      tokenReason: health.reason,
      payoutsEnabled: payoutsCap.enabled,
      payoutsDebugId: payoutsCap.debugId,
      payoutsReason: payoutsCap.reason,
      providerInUse: config.paypal.payoutProvider,
      platformFeePercent: config.platformFeePercent,
      merchantEmailConfigured: Boolean(config.paypal.merchantEmail),
      lastCreateOrderResult: lastCreateOrderDiag,
      env: config.paypal.env
    };
  }

  /**
   * Creates a PayPal Order based STRICTLY on an authorized Agreement.
   */
  async createOrder(agreementId: string, idempotencyKey: string, requestingUserId?: string): Promise<{
    orderId: string;
    approvalUrl?: string;
    amount: number;
    currency: string;
    status: string;
    isSimulated: boolean;
  }> {
    const agreement = store.getAgreement(agreementId);
    if (!agreement || (requestingUserId && agreement.buyerUserId !== requestingUserId)) {
      throw new PayPalApiException({
        status: 404,
        code: 'AGREEMENT_NOT_FOUND',
        message: 'Agreement not found or access denied.',
        nextStep: 'Ensure you are signed in as the authorized buyer for this deal.'
      });
    }

    // 1. Strict Server-Side Decision Validation
    const decision = store.getDecisionByEntity('deal', agreement.negotiationId);
    const isApproved = decision
      ? (decision.status === 'auto_approved' || decision.status === 'human_approved')
      : (agreement.humanApprovalStatus === 'approved');

    if (!isApproved) {
      throw new PayPalApiException({
        status: 403,
        code: 'DECISION_NOT_APPROVED',
        message: 'Payment rejected: Agreement has not been approved by autonomous policy or human review.',
        nextStep: 'Approve the deal in the Review Queue before executing payment.'
      });
    }

    // 2. Daily Spend Cap Enforcement
    const user = store.getUser(agreement.buyerUserId);
    if (user) {
      const todaySpend = store.getTodaySpend(user.id);
      const cap = user.dailyBudgetCap ?? 500;
      if (todaySpend + agreement.finalPrice > cap) {
        throw new PayPalApiException({
          status: 400,
          code: 'DAILY_CAP_EXCEEDED',
          message: `Transaction would exceed your daily spend cap of $${cap} (today spent: $${todaySpend}).`,
          nextStep: 'Increase your daily budget cap in Settings > Rules or try again tomorrow.'
        });
      }
    }

    // 3. Check for existing payment on this agreement
    const existingTx = store.getTransactionByAgreement(agreementId);
    if (existingTx && existingTx.paymentStatus === 'completed') {
      throw new PayPalApiException({
        status: 409,
        code: 'ALREADY_PAID',
        message: `Payment already captured for agreement ${agreementId} (Transaction ${existingTx.id}).`,
        nextStep: 'View your completed receipt in the Transactions tab.'
      });
    }

    const grossCents = agreement.finalPriceCents ?? dollarsToCents(agreement.finalPrice);
    const { feeCents, payoutCents } = computeFeeAndPayoutCents(grossCents, config.platformFeePercent);
    const amountFormatted = (grossCents / 100).toFixed(2);
    const currency = 'USD';

    // Never allow checkout if seller payout account is not Ready
    if (agreement.sellerUserId) {
      const sellerAcct = store.getSellerPayoutAccount(agreement.sellerUserId);
      if (!sellerAcct || sellerAcct.status !== 'ready') {
        throw new PayPalApiException({
          status: 409,
          code: 'SELLER_PAYOUT_NOT_READY',
          message: 'Waiting for the seller to finish payout setup before payment can begin.',
          nextStep: 'The seller has been notified to add their PayPal payout email in Selling > Payments.'
        });
      }
    }

    // Live PayPal Sandbox API Call
    if (this.isConfigured()) {
      let token: string;
      try {
        token = await this.getAccessToken();
      } catch (err: any) {
        throw err;
      }

      const payload = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: agreement.negotiationId, // reference_id = deal id per spec
            custom_id: decision?.id || agreement.id, // custom_id = decision id per spec
            description: 'Digital freelance services - Milestone 1',
            amount: {
              currency_code: currency,
              value: amountFormatted
            }
          }
        ],
        payment_source: {
          paypal: {
            experience_context: {
              payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
              brand_name: 'VYRO Autonomous Commerce',
              locale: 'en-US',
              landing_page: 'LOGIN',
              shipping_preference: 'NO_SHIPPING',
              user_action: 'PAY_NOW',
              return_url: 'http://localhost:5173/app/deals',
              cancel_url: 'http://localhost:5173/app/deals'
            }
          }
        }
      };

      let response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': idempotencyKey
        },
        body: JSON.stringify(payload)
      });

      // Handle 401 with one token retry
      if (response.status === 401) {
        token = await this.getAccessToken(true);
        response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': idempotencyKey
          },
          body: JSON.stringify(payload)
        });
      }

      const debugId = response.headers.get('paypal-debug-id');

      if (!response.ok) {
        let errJson: any;
        try {
          errJson = await response.json();
        } catch {
          errJson = { message: await response.text() };
        }
        console.error(`[PayPal Create Order Error] Status: ${response.status}, Debug-ID: ${debugId || 'none'}`);
        lastCreateOrderDiag = {
          ok: false,
          status: `HTTP_${response.status}`,
          debugId: debugId || undefined,
          reason: errJson?.message || 'Create order failed',
          timestamp: new Date().toISOString()
        };
        throw new PayPalApiException(mapPayPalError(response.status, errJson, debugId));
      }

      const data = await response.json() as any;
      const approveLink = data.links?.find((l: any) => l.rel === 'approve')?.href;
      lastCreateOrderDiag = {
        ok: true,
        status: data.status || 'CREATED',
        orderId: data.id,
        debugId: debugId || undefined,
        timestamp: new Date().toISOString()
      };

      // Record pending transaction (held amount computed in integer cents)
      const tx: Transaction = {
        id: `tx_${uuidv4().substring(0, 8)}`,
        agreementId: agreement.id,
        negotiationId: agreement.negotiationId,
        requestId: agreement.requestId,
        buyerUserId: agreement.buyerUserId,
        sellerUserId: agreement.sellerUserId,
        buyerAgentName: 'Buyer Agent',
        sellerAgentId: agreement.sellerAgentId,
        sellerBusinessName: agreement.sellerBusinessName,
        serviceTitle: 'Commercial Agreement Contract',
        amount: centsToDollars(grossCents),
        amountCents: grossCents,
        platformFeeCents: feeCents,
        sellerPayoutCents: payoutCents,
        currency,
        paypalOrderId: data.id,
        paymentStatus: 'awaiting_paypal',
        idempotencyKey,
        sellerShareHeld: centsToDollars(payoutCents),
        sellerPayoutStatus: 'held',
        isSandbox: true,
        createdAt: new Date().toISOString()
      };
      store.saveTransaction(tx);

      store.logActivity({
        type: 'paypal_order_created',
        title: `PayPal Sandbox Order Created (${data.id})`,
        description: `Order initialized for $${agreement.finalPrice} ${currency}. Awaiting buyer PayPal checkout approval.`,
        transactionId: tx.id,
        amount: agreement.finalPrice,
        currency,
        severity: 'info'
      });

      return {
        orderId: data.id,
        approvalUrl: approveLink,
        amount: agreement.finalPrice,
        currency,
        status: data.status || 'CREATED',
        isSimulated: false
      };
    }

      const simulatedOrderId = `PAYID-SANDBOX-${uuidv4().substring(0, 12).toUpperCase()}`;
      lastCreateOrderDiag = {
        ok: true,
        status: 'CREATED_SIMULATED',
        orderId: simulatedOrderId,
        timestamp: new Date().toISOString()
      };
      const tx: Transaction = {
        id: `tx_${uuidv4().substring(0, 8)}`,
        agreementId: agreement.id,
        negotiationId: agreement.negotiationId,
        requestId: agreement.requestId,
        buyerUserId: agreement.buyerUserId,
        sellerUserId: agreement.sellerUserId,
        buyerAgentName: 'Buyer Agent',
        sellerAgentId: agreement.sellerAgentId,
        sellerBusinessName: agreement.sellerBusinessName,
        serviceTitle: 'Commercial Agreement Contract',
        amount: centsToDollars(grossCents),
        amountCents: grossCents,
        platformFeeCents: feeCents,
        sellerPayoutCents: payoutCents,
        currency,
        paypalOrderId: simulatedOrderId,
        paymentStatus: 'awaiting_paypal',
        idempotencyKey,
        sellerShareHeld: centsToDollars(payoutCents),
        sellerPayoutStatus: 'held',
        isSandbox: true,
        createdAt: new Date().toISOString()
      };
    store.saveTransaction(tx);

    return {
      orderId: simulatedOrderId,
      approvalUrl: `https://www.sandbox.paypal.com/checkoutnow?token=${simulatedOrderId}`,
      amount: agreement.finalPrice,
      currency,
      status: 'CREATED',
      isSimulated: true
    };
  }

  /**
   * Captures an authorized PayPal order, verifies response server-side, and completes the transaction.
   */
  async captureOrder(orderId: string, idempotencyKey: string, requestingUserId?: string): Promise<Transaction> {
    const tx = store.getTransactionByPaypalOrderId(orderId);
    if (!tx || (requestingUserId && tx.buyerUserId !== requestingUserId)) {
      throw new PayPalApiException({
        status: 404,
        code: 'TRANSACTION_NOT_FOUND',
        message: `Transaction record with PayPal Order ID "${orderId}" not found or unauthorized.`,
        nextStep: 'Ensure you are signed in as the authorized buyer for this order.'
      });
    }

    // Idempotent return: If already completed, return existing capture without re-requesting or erroring
    if (tx.paymentStatus === 'completed') {
      return tx;
    }

    const agreement = store.getAgreement(tx.agreementId);
    if (!agreement) {
      throw new PayPalApiException({
        status: 404,
        code: 'AGREEMENT_NOT_FOUND',
        message: `Agreement "${tx.agreementId}" not found for transaction.`,
        nextStep: 'Contact support if this error persists.'
      });
    }

    // Server-side decision gate
    const decision = store.getDecisionByEntity('deal', agreement.negotiationId);
    const isApproved = decision
      ? (decision.status === 'auto_approved' || decision.status === 'human_approved')
      : (agreement.humanApprovalStatus === 'approved');

    if (!isApproved) {
      throw new PayPalApiException({
        status: 403,
        code: 'DECISION_NOT_APPROVED',
        message: 'Payment capture rejected: Agreement has not been approved by autonomous policy or human review.',
        nextStep: 'Approve the deal in the Review Queue before capturing payment.'
      });
    }

    // Live PayPal Capture API Call
    if (this.isConfigured() && !orderId.startsWith('PAYID-SANDBOX-')) {
      let token = await this.getAccessToken();
      let response = await fetch(`${this.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': idempotencyKey
        }
      });

      // Handle 401 with token retry
      if (response.status === 401) {
        token = await this.getAccessToken(true);
        response = await fetch(`${this.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': idempotencyKey
          }
        });
      }

      const debugId = response.headers.get('paypal-debug-id');

      if (!response.ok) {
        let errJson: any;
        try {
          errJson = await response.json();
        } catch {
          errJson = { message: await response.text() };
        }
        console.error(`[PayPal Capture Error] Status: ${response.status}, Debug-ID: ${debugId || 'none'}`);
        const mapped = mapPayPalError(response.status, errJson, debugId);
        tx.paymentStatus = 'failed';
        tx.failureReason = `${mapped.code}: ${mapped.message}`;
        store.saveTransaction(tx);
        throw new PayPalApiException(mapped);
      }

      const captureData = await response.json() as any;
      const captureDetails = captureData.purchase_units?.[0]?.payments?.captures?.[0];
      const grossCents = tx.amountCents ?? agreement.finalPriceCents ?? dollarsToCents(tx.amount);
      const { feeCents, payoutCents } = computeFeeAndPayoutCents(grossCents, config.platformFeePercent);

      tx.paypalCaptureId = captureDetails?.id || `CAP-${uuidv4().substring(0, 10).toUpperCase()}`;
      tx.paymentStatus = 'completed';
      tx.completedAt = new Date().toISOString();
      tx.paypalPayerEmail = captureData.payer?.email_address || 'buyer@sandbox.vyro.network';
      tx.paypalPayerName = `${captureData.payer?.name?.given_name || 'Autonomous'} ${captureData.payer?.name?.surname || 'Buyer'}`;
      
      // Ledger: Buyer paid platform merchant; platform holds seller's net share until buyer accepts work
      tx.sellerUserId = agreement.sellerUserId;
      tx.amountCents = grossCents;
      tx.platformFeeCents = feeCents;
      tx.sellerPayoutCents = payoutCents;
      tx.sellerShareHeld = centsToDollars(payoutCents);
      tx.sellerPayoutStatus = 'held';
      tx.sellerPayoutAt = undefined;

      store.saveTransaction(tx);

      agreement.platformFeeCents = feeCents;
      agreement.sellerPayoutCents = payoutCents;
      agreement.workAcceptanceStatus = agreement.workAcceptanceStatus || 'pending';
      store.saveAgreement(agreement);
      this.recordEscrowHoldLedger(tx.negotiationId, grossCents, feeCents, payoutCents, tx.currency);
    } else {
      // Deterministic Sandbox Capture
      const grossCents = tx.amountCents ?? agreement.finalPriceCents ?? dollarsToCents(tx.amount);
      const { feeCents, payoutCents } = computeFeeAndPayoutCents(grossCents, config.platformFeePercent);
      const simulatedCaptureId = `CAP-SANDBOX-${uuidv4().substring(0, 10).toUpperCase()}`;
      tx.paypalCaptureId = simulatedCaptureId;
      tx.paymentStatus = 'completed';
      tx.completedAt = new Date().toISOString();
      tx.paypalPayerEmail = 'studio.buyer@sandbox.vyro.network';
      tx.paypalPayerName = 'Studio Procurement Officer';

      // Ledger: held until buyer accepts work
      tx.sellerUserId = agreement.sellerUserId;
      tx.amountCents = grossCents;
      tx.platformFeeCents = feeCents;
      tx.sellerPayoutCents = payoutCents;
      tx.sellerShareHeld = centsToDollars(payoutCents);
      tx.sellerPayoutStatus = 'held';
      tx.sellerPayoutAt = undefined;

      store.saveTransaction(tx);

      agreement.platformFeeCents = feeCents;
      agreement.sellerPayoutCents = payoutCents;
      agreement.workAcceptanceStatus = agreement.workAcceptanceStatus || 'pending';
      store.saveAgreement(agreement);
      this.recordEscrowHoldLedger(tx.negotiationId, grossCents, feeCents, payoutCents, tx.currency);
    }

    // Update Negotiation and Request statuses
    const negotiation = store.getNegotiation(tx.negotiationId);
    if (negotiation) {
      negotiation.status = 'completed';
      negotiation.updatedAt = new Date().toISOString();
      store.saveNegotiation(negotiation);
    }

    const request = store.getRequest(tx.requestId);
    if (request) {
      request.status = 'completed';
      request.updatedAt = new Date().toISOString();
      store.saveRequest(request);
    }

    store.logActivity({
      type: 'paypal_payment_completed',
      title: `PayPal Sandbox Payment Captured: ${formatCents(tx.amountCents ?? dollarsToCents(tx.amount))} ${tx.currency}`,
      description: `Held in escrow for ${tx.sellerBusinessName}. Service fee: ${formatCents(tx.platformFeeCents || 0)}. Seller receives ${formatCents(tx.sellerPayoutCents || 0)} after buyer accepts work.`,
      transactionId: tx.id,
      negotiationId: tx.negotiationId,
      amount: tx.amount,
      currency: tx.currency,
      severity: 'success'
    });

    return tx;
  }

  private recordEscrowHoldLedger(
    dealId: string,
    grossCents: number,
    feeCents: number,
    payoutCents: number,
    currency: string
  ) {
    const existing = store.getLedgerEntriesForDeal(dealId);
    if (!existing.some(e => e.type === 'buyer_paid')) {
      store.addLedgerEntry({ dealId, type: 'buyer_paid', amountCents: grossCents, currency, note: 'Buyer payment captured by platform merchant' });
    }
    if (!existing.some(e => e.type === 'platform_fee')) {
      store.addLedgerEntry({ dealId, type: 'platform_fee', amountCents: feeCents, currency, note: `Platform service fee (${config.platformFeePercent}%)` });
    }
    if (!existing.some(e => e.type === 'held_for_seller')) {
      store.addLedgerEntry({ dealId, type: 'held_for_seller', amountCents: payoutCents, currency, note: 'Net seller share held pending buyer work acceptance' });
    }
  }

  /**
   * Settles an authorized agreement using simulated instant platform escrow.
   * Useful for development, end-to-end integration testing, or offline sandbox tests.
   */
  async settleMockOrder(agreementId: string, requestingUserId?: string): Promise<Transaction> {
    if (config.nodeEnv === 'production') {
      throw new PayPalApiException({
        status: 403,
        code: 'SIMULATED_DISABLED_IN_PROD',
        message: 'Simulated settlement is disabled in production.',
        nextStep: 'Use the official PayPal checkout button.'
      });
    }
    const agreement = store.getAgreement(agreementId);
    if (!agreement || (requestingUserId && agreement.buyerUserId !== requestingUserId)) {
      throw new PayPalApiException({
        status: 404,
        code: 'AGREEMENT_NOT_FOUND',
        message: 'Agreement not found or access denied.',
        nextStep: 'Ensure you are signed in as the authorized buyer for this deal.'
      });
    }

    const existingTx = store.getTransactionByAgreement(agreementId);
    if (existingTx && existingTx.paymentStatus === 'completed') {
      return existingTx;
    }

    const decision = store.getDecisionByEntity('deal', agreement.negotiationId);
    const isApproved = decision
      ? (decision.status === 'auto_approved' || decision.status === 'human_approved')
      : (agreement.humanApprovalStatus === 'approved');

    if (!isApproved) {
      throw new PayPalApiException({
        status: 403,
        code: 'DECISION_NOT_APPROVED',
        message: 'Payment rejected: Agreement has not been approved by autonomous policy or human review.',
        nextStep: 'Approve the deal in the Review Queue before executing payment.'
      });
    }

    const currency = 'USD';
    const grossCents = agreement.finalPriceCents ?? dollarsToCents(agreement.finalPrice);
    const { feeCents, payoutCents } = computeFeeAndPayoutCents(grossCents, config.platformFeePercent);
    const simulatedOrderId = `PAYID-MOCK-${uuidv4().substring(0, 10).toUpperCase()}`;
    const simulatedCaptureId = `CAP-MOCK-${uuidv4().substring(0, 10).toUpperCase()}`;

    const tx: Transaction = {
      id: existingTx ? existingTx.id : `tx_${uuidv4().substring(0, 8)}`,
      agreementId: agreement.id,
      negotiationId: agreement.negotiationId,
      requestId: agreement.requestId,
      buyerUserId: agreement.buyerUserId,
      sellerUserId: agreement.sellerUserId,
      buyerAgentName: existingTx?.buyerAgentName || 'Buyer Agent',
      sellerAgentId: agreement.sellerAgentId,
      sellerBusinessName: agreement.sellerBusinessName,
      serviceTitle: existingTx?.serviceTitle || 'Commercial Agreement Contract',
      amount: centsToDollars(grossCents),
      amountCents: grossCents,
      platformFeeCents: feeCents,
      sellerPayoutCents: payoutCents,
      currency,
      paypalOrderId: simulatedOrderId,
      paypalCaptureId: simulatedCaptureId,
      paypalPayerEmail: 'buyer.studio@sandbox.vyro.network',
      paypalPayerName: 'Platform Escrow Buyer',
      paymentStatus: 'completed',
      idempotencyKey: existingTx?.idempotencyKey || `mock_idem_${uuidv4().substring(0, 10)}`,
      sellerShareHeld: centsToDollars(payoutCents),
      sellerPayoutStatus: 'held',
      isSandbox: true,
      createdAt: existingTx?.createdAt || new Date().toISOString(),
      completedAt: new Date().toISOString()
    };

    store.saveTransaction(tx);

    agreement.platformFeeCents = feeCents;
    agreement.sellerPayoutCents = payoutCents;
    agreement.workAcceptanceStatus = agreement.workAcceptanceStatus || 'pending';
    store.saveAgreement(agreement);
    this.recordEscrowHoldLedger(tx.negotiationId, grossCents, feeCents, payoutCents, currency);

    const negotiation = store.getNegotiation(tx.negotiationId);
    if (negotiation) {
      negotiation.status = 'completed';
      negotiation.updatedAt = new Date().toISOString();
      store.saveNegotiation(negotiation);
    }

    const request = store.getRequest(tx.requestId);
    if (request) {
      request.status = 'completed';
      request.updatedAt = new Date().toISOString();
      store.saveRequest(request);
    }

    store.logActivity({
      type: 'paypal_payment_completed',
      title: `Platform Escrow Payment Settled: ${formatCents(grossCents)} ${tx.currency}`,
      description: `Held in escrow for ${tx.sellerBusinessName}. Service fee: ${formatCents(feeCents)}. Seller receives ${formatCents(payoutCents)} after buyer accepts work.`,
      transactionId: tx.id,
      negotiationId: tx.negotiationId,
      amount: tx.amount,
      currency: tx.currency,
      severity: 'success'
    });

    return tx;
  }

  /**
   * Refunds a captured payment back to the buyer before payout is completed.
   */
  async refundPayment(agreementId: string, reason: string, requestingUserId?: string): Promise<Transaction> {
    const agreement = store.getAgreement(agreementId);
    if (!agreement || (requestingUserId && agreement.buyerUserId !== requestingUserId && agreement.sellerUserId !== requestingUserId)) {
      throw new PayPalApiException({
        status: 404,
        code: 'AGREEMENT_NOT_FOUND',
        message: 'Agreement not found or access denied.',
        nextStep: 'Ensure you are authorized on this deal.'
      });
    }

    const tx = store.getTransactionByAgreement(agreementId);
    if (!tx) {
      throw new PayPalApiException({
        status: 404,
        code: 'TRANSACTION_NOT_FOUND',
        message: 'No payment transaction found for this deal.',
        nextStep: 'Verify payment was completed.'
      });
    }

    if (tx.paymentStatus === 'refunded') {
      return tx; // Idempotent
    }
    if (tx.paymentStatus !== 'completed') {
      throw new PayPalApiException({
        status: 409,
        code: 'NOT_REFUNDABLE',
        message: 'Only completed payments can be refunded.',
        nextStep: 'Check payment status first.'
      });
    }
    if (tx.sellerPayoutStatus === 'paid' || tx.sellerPayoutStatus === 'simulated_paid') {
      throw new PayPalApiException({
        status: 409,
        code: 'PAYOUT_ALREADY_RELEASED',
        message: 'Cannot refund because seller payout has already been released.',
        nextStep: 'Open a dispute ticket if work was misrepresented.'
      });
    }

    const cleanReason = (reason || 'Refund requested by parties').trim();
    const isRealCapture = Boolean(
      tx.paypalCaptureId &&
      this.isConfigured() &&
      !tx.paypalCaptureId.startsWith('CAP-SANDBOX-') &&
      !tx.paypalCaptureId.startsWith('CAP-MOCK-') &&
      !tx.paypalCaptureId.startsWith('CAPTURE-')
    );

    let refundId = `REF-${uuidv4().substring(0, 10).toUpperCase()}`;
    if (isRealCapture) {
      const token = await this.getAccessToken();
      const res = await fetch(`${this.baseUrl}/v2/payments/captures/${tx.paypalCaptureId}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': `ref_${tx.id}`
        },
        body: JSON.stringify({ note_to_payer: cleanReason.slice(0, 255) })
      });
      const debugId = res.headers.get('paypal-debug-id');
      if (!res.ok) {
        let errJson: any;
        try { errJson = await res.json(); } catch { errJson = { message: await res.text() }; }
        throw new PayPalApiException(mapPayPalError(res.status, errJson, debugId));
      }
      const json = await res.json() as any;
      refundId = json.id || refundId;
    }

    const now = new Date().toISOString();
    tx.paymentStatus = 'refunded';
    tx.sellerPayoutStatus = 'refunded';
    tx.refundId = refundId;
    tx.refundedAt = now;
    tx.refundReason = cleanReason;
    store.saveTransaction(tx);

    agreement.workAcceptanceStatus = 'refunded';
    agreement.disputeReason = cleanReason;
    store.saveAgreement(agreement);

    const grossCents = tx.amountCents ?? dollarsToCents(tx.amount);
    const hasRefundLedger = store.getLedgerEntriesForDeal(tx.negotiationId).some(e => e.type === 'refund');
    if (!hasRefundLedger) {
      store.addLedgerEntry({
        dealId: tx.negotiationId,
        type: 'refund',
        amountCents: grossCents,
        currency: tx.currency,
        note: `Refund ${refundId}: ${cleanReason}`
      });
    }

    store.logActivity({
      type: 'paypal_refund_completed',
      title: `Refund processed: ${formatCents(grossCents)}`,
      description: `Refund ID ${refundId} issued to buyer. Reason: ${cleanReason}`,
      transactionId: tx.id,
      negotiationId: tx.negotiationId,
      amount: tx.amount,
      currency: tx.currency,
      severity: 'info'
    });

    return tx;
  }
}

export const paypalService = new PayPalService();
