import { config } from '../../config/index.js';
import { paypalService } from './paypalClient.js';

export interface PayoutAccountValidationResult {
  ok: boolean;
  provider: 'paypal_email' | 'simulated';
  status: 'ready' | 'failed';
  message?: string;
  debugId?: string;
  payoutsEnabled?: boolean;
}

export interface PayoutCreateParams {
  payoutId: string;
  dealId: string;
  sellerEmail: string;
  amountCents: number;
  currency: string;
}

export interface PayoutCreateResult {
  status: 'processing' | 'paid' | 'simulated_paid' | 'failed';
  provider: 'paypal' | 'simulated';
  providerBatchId?: string;
  providerItemId?: string;
  debugId?: string;
  failureReason?: string;
}

export interface PayoutStatusResult {
  status: 'processing' | 'paid' | 'simulated_paid' | 'failed';
  providerBatchId?: string;
  providerItemId?: string;
  failureReason?: string;
  debugId?: string;
}

/**
 * Modular PayoutProvider adapter interface.
 * Designed so PayPal Commerce Platform Partner Referrals / Marketplace onboarding
 * can be dropped in later as another implementation without rewriting business gates.
 */
export interface PayoutProvider {
  readonly id: 'paypal' | 'simulated';
  validateAccount(email: string, context?: { buyerEmail?: string }): Promise<PayoutAccountValidationResult>;
  createPayout(params: PayoutCreateParams): Promise<PayoutCreateResult>;
  getPayoutStatus(payout: { providerBatchId?: string | null; providerItemId?: string | null }): Promise<PayoutStatusResult>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validatePayoutEmailCommon(
  rawEmail: string,
  buyerEmail?: string
): { valid: boolean; normalized: string; error?: string } {
  const normalized = (rawEmail || '').trim().toLowerCase();
  if (!EMAIL_RE.test(normalized)) {
    return { valid: false, normalized, error: 'Please enter a valid PayPal email address.' };
  }
  const merchantEmail = config.paypal.merchantEmail;
  if (merchantEmail && normalized === merchantEmail) {
    return {
      valid: false,
      normalized,
      error: 'You cannot use the platform merchant PayPal email. Enter your own personal or business PayPal email.'
    };
  }
  if (buyerEmail && merchantEmail && buyerEmail.trim().toLowerCase() === merchantEmail && normalized === merchantEmail) {
    return {
      valid: false,
      normalized,
      error: 'Buyer checkout email matches the platform merchant account and cannot be used for seller payouts.'
    };
  }
  return { valid: true, normalized };
}

export class PayPalPayoutsProvider implements PayoutProvider {
  public readonly id = 'paypal' as const;

  public async checkPayoutsCapability(): Promise<{ enabled: boolean; debugId?: string; reason?: string }> {
    if (!paypalService.isConfigured()) {
      return { enabled: false, reason: 'PayPal Sandbox credentials are not configured.' };
    }
    try {
      const token = await paypalService.getAccessToken();
      // Probe OAuth token / Payouts endpoint safely via invalid dummy get (404 confirms Payouts route & auth work; 401/403 means disabled)
      const res = await fetch(`${config.paypal.baseUrl}/v1/payments/payouts/PROBE_NOT_FOUND_00`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const debugId = res.headers.get('paypal-debug-id') || undefined;
      if (res.status === 404 || res.status === 400 || res.status === 200) {
        return { enabled: true, debugId };
      }
      if (res.status === 403) {
        return {
          enabled: false,
          debugId,
          reason: 'PayPal Payouts is not enabled on this Sandbox REST App.'
        };
      }
      const text = await res.text();
      return { enabled: res.ok, debugId, reason: `HTTP ${res.status}: ${text.slice(0, 140)}` };
    } catch (err: any) {
      return { enabled: false, reason: err.message || 'Network check failed' };
    }
  }

  public async validateAccount(
    email: string,
    context?: { buyerEmail?: string }
  ): Promise<PayoutAccountValidationResult> {
    const basic = validatePayoutEmailCommon(email, context?.buyerEmail);
    if (!basic.valid) {
      return {
        ok: false,
        provider: 'paypal_email',
        status: 'failed',
        message: basic.error
      };
    }

    const cap = await this.checkPayoutsCapability();
    if (!cap.enabled) {
      return {
        ok: true,
        provider: 'simulated',
        status: 'ready',
        payoutsEnabled: false,
        debugId: cap.debugId,
        message: cap.reason || 'PayPal Payouts is not enabled on the sandbox app; payouts will run in simulated test mode.'
      };
    }

    return {
      ok: true,
      provider: 'paypal_email',
      status: 'ready',
      payoutsEnabled: true,
      debugId: cap.debugId
    };
  }

  public async createPayout(params: PayoutCreateParams): Promise<PayoutCreateResult> {
    const amountDollars = (Math.max(1, Math.round(params.amountCents)) / 100).toFixed(2);
    const currency = params.currency || 'USD';

    if (!paypalService.isConfigured()) {
      return {
        status: 'failed',
        provider: 'paypal',
        failureReason: 'PayPal credentials are missing.'
      };
    }

    let token = await paypalService.getAccessToken();
    const bodyPayload = {
      sender_batch_header: {
        sender_batch_id: params.payoutId, // deterministic per payout record for idempotency
        email_subject: 'VYRO payout',
        email_message: 'Your agreed work was accepted. Here is your payout from VYRO.'
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: {
            value: amountDollars,
            currency
          },
          note: 'VYRO payout',
          sender_item_id: params.dealId,
          receiver: params.sellerEmail
        }
      ]
    };

    let response = await fetch(`${config.paypal.baseUrl}/v1/payments/payouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyPayload)
    });

    if (response.status === 401) {
      token = await paypalService.getAccessToken(true);
      response = await fetch(`${config.paypal.baseUrl}/v1/payments/payouts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyPayload)
      });
    }

    const debugId = response.headers.get('paypal-debug-id') || undefined;
    let data: any = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const issue = data?.name || data?.details?.[0]?.issue || `HTTP_${response.status}`;
      const message = data?.message || data?.details?.[0]?.description || `PayPal Payouts failed (${response.status})`;
      return {
        status: 'failed',
        provider: 'paypal',
        debugId,
        failureReason: `${issue}: ${message}`
      };
    }

    const batchId = data?.batch_header?.payout_batch_id;
    const batchStatus = String(data?.batch_header?.batch_status || 'PENDING').toUpperCase();
    const mappedStatus: 'processing' | 'paid' | 'failed' =
      batchStatus === 'SUCCESS'
        ? 'paid'
        : batchStatus === 'DENIED' || batchStatus === 'CANCELED'
        ? 'failed'
        : 'processing';

    return {
      status: mappedStatus,
      provider: 'paypal',
      providerBatchId: batchId,
      providerItemId: params.dealId,
      debugId
    };
  }

  public async getPayoutStatus(payout: {
    providerBatchId?: string | null;
    providerItemId?: string | null;
  }): Promise<PayoutStatusResult> {
    if (!payout.providerBatchId) {
      return {
        status: 'failed',
        failureReason: 'Missing PayPal payout batch ID.'
      };
    }

    let token = await paypalService.getAccessToken();
    let res = await fetch(`${config.paypal.baseUrl}/v1/payments/payouts/${encodeURIComponent(payout.providerBatchId)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (res.status === 401) {
      token = await paypalService.getAccessToken(true);
      res = await fetch(`${config.paypal.baseUrl}/v1/payments/payouts/${encodeURIComponent(payout.providerBatchId)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    }

    const debugId = res.headers.get('paypal-debug-id') || undefined;
    if (!res.ok) {
      const errText = await res.text();
      return {
        status: 'failed',
        providerBatchId: payout.providerBatchId,
        debugId,
        failureReason: `Status lookup failed (${res.status}): ${errText.slice(0, 140)}`
      };
    }

    const json = await res.json() as any;
    const batchStatus = String(json?.batch_header?.batch_status || 'PENDING').toUpperCase();
    const item = Array.isArray(json?.items) ? json.items[0] : undefined;
    const itemTxStatus = String(item?.transaction_status || batchStatus).toUpperCase();
    const itemId = item?.payout_item_id || payout.providerItemId || undefined;

    if (itemTxStatus === 'SUCCESS' || batchStatus === 'SUCCESS') {
      return { status: 'paid', providerBatchId: payout.providerBatchId, providerItemId: itemId, debugId };
    }
    if (['FAILED', 'DENIED', 'BLOCKED', 'RETURNED', 'REFUNDED', 'CANCELED'].includes(itemTxStatus)) {
      return {
        status: 'failed',
        providerBatchId: payout.providerBatchId,
        providerItemId: itemId,
        debugId,
        failureReason: item?.errors?.message || `PayPal item status: ${itemTxStatus}`
      };
    }
    return { status: 'processing', providerBatchId: payout.providerBatchId, providerItemId: itemId, debugId };
  }
}

export class SimulatedPayoutProvider implements PayoutProvider {
  public readonly id = 'simulated' as const;

  private assertNotProduction() {
    if (config.nodeEnv === 'production') {
      throw new Error('SimulatedPayoutProvider is strictly disabled when NODE_ENV=production.');
    }
  }

  public async validateAccount(
    email: string,
    context?: { buyerEmail?: string }
  ): Promise<PayoutAccountValidationResult> {
    this.assertNotProduction();
    const basic = validatePayoutEmailCommon(email, context?.buyerEmail);
    if (!basic.valid) {
      return {
        ok: false,
        provider: 'simulated',
        status: 'failed',
        message: basic.error
      };
    }
    return {
      ok: true,
      provider: 'simulated',
      status: 'ready',
      payoutsEnabled: false,
      message: 'Simulated sandbox payout provider active (no real money moves).'
    };
  }

  public async createPayout(params: PayoutCreateParams): Promise<PayoutCreateResult> {
    this.assertNotProduction();
    return {
      status: 'simulated_paid',
      provider: 'simulated',
      providerBatchId: `SIM_BATCH_${params.payoutId.slice(-10).toUpperCase()}`,
      providerItemId: `SIM_ITEM_${params.dealId.slice(-8).toUpperCase()}`
    };
  }

  public async getPayoutStatus(payout: {
    providerBatchId?: string | null;
    providerItemId?: string | null;
  }): Promise<PayoutStatusResult> {
    this.assertNotProduction();
    return {
      status: 'simulated_paid',
      providerBatchId: payout.providerBatchId || undefined,
      providerItemId: payout.providerItemId || undefined
    };
  }
}

export const paypalPayoutsProvider = new PayPalPayoutsProvider();
export const simulatedPayoutProvider = new SimulatedPayoutProvider();

export function getActivePayoutProvider(override?: 'paypal' | 'simulated'): PayoutProvider {
  const rawEnvPayout = (process.env.PAYPAL_PAYOUT_PROVIDER || '').trim().toLowerCase();
  const chosen = override || config.paypal.payoutProvider;
  if (config.nodeEnv === 'production' && (chosen === 'simulated' || rawEnvPayout === 'simulated' || config.paymentProvider === 'mock')) {
    throw new Error('Simulated/mock provider cannot be used in NODE_ENV=production.');
  }
  if (chosen === 'simulated') {
    return simulatedPayoutProvider;
  }
  return paypalPayoutsProvider;
}
