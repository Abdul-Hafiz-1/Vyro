import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config/index.js';
import { store } from '../../db/store.js';
import { Agreement, Transaction } from '../../types/index.js';

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

    const amountFormatted = agreement.finalPrice.toFixed(2);
    const currency = 'USD';

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
        throw new PayPalApiException(mapPayPalError(response.status, errJson, debugId));
      }

      const data = await response.json() as any;
      const approveLink = data.links?.find((l: any) => l.rel === 'approve')?.href;

      // Record pending transaction
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
        amount: agreement.finalPrice,
        currency,
        paypalOrderId: data.id,
        paymentStatus: 'awaiting_paypal',
        idempotencyKey,
        sellerShareHeld: agreement.finalPrice,
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

    // High-Fidelity Sandbox Simulator (when credentials unset or in offline test mode)
    const simulatedOrderId = `PAYID-SANDBOX-${uuidv4().substring(0, 12).toUpperCase()}`;
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
      amount: agreement.finalPrice,
      currency,
      paypalOrderId: simulatedOrderId,
      paymentStatus: 'awaiting_paypal',
      idempotencyKey,
      sellerShareHeld: agreement.finalPrice,
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

      tx.paypalCaptureId = captureDetails?.id || `CAP-${uuidv4().substring(0, 10).toUpperCase()}`;
      tx.paymentStatus = 'completed';
      tx.completedAt = new Date().toISOString();
      tx.paypalPayerEmail = captureData.payer?.email_address || 'buyer@sandbox.vyro.network';
      tx.paypalPayerName = `${captureData.payer?.name?.given_name || 'Autonomous'} ${captureData.payer?.name?.surname || 'Buyer'}`;
      
      // Ledger: Funds held for platform, simulate payout to seller
      tx.sellerUserId = agreement.sellerUserId;
      tx.sellerShareHeld = tx.amount;
      tx.sellerPayoutStatus = 'simulated_paid';
      tx.sellerPayoutAt = new Date().toISOString();

      store.saveTransaction(tx);
    } else {
      // Deterministic Sandbox Capture
      const simulatedCaptureId = `CAP-SANDBOX-${uuidv4().substring(0, 10).toUpperCase()}`;
      tx.paypalCaptureId = simulatedCaptureId;
      tx.paymentStatus = 'completed';
      tx.completedAt = new Date().toISOString();
      tx.paypalPayerEmail = 'studio.buyer@sandbox.vyro.network';
      tx.paypalPayerName = 'Studio Procurement Officer';

      // Ledger
      tx.sellerUserId = agreement.sellerUserId;
      tx.sellerShareHeld = tx.amount;
      tx.sellerPayoutStatus = 'simulated_paid';
      tx.sellerPayoutAt = new Date().toISOString();

      store.saveTransaction(tx);
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
      title: `PayPal Sandbox Payment Captured: $${tx.amount} ${tx.currency}`,
      description: `Commercial agreement ${tx.agreementId} fully settled with ${tx.sellerBusinessName}. Capture ID: ${tx.paypalCaptureId}. Seller payout simulated.`,
      transactionId: tx.id,
      negotiationId: tx.negotiationId,
      amount: tx.amount,
      currency: tx.currency,
      severity: 'success'
    });

    return tx;
  }
}

export const paypalService = new PayPalService();
