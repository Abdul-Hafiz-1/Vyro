import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config/index.js';
import { store } from '../../db/store.js';
import { LedgerEntry, PayoutRecord, SellerPayoutAccount } from '../../types/index.js';
import { dollarsToCents, centsToDollars, formatCents, computeFeeAndPayoutCents } from '../negotiation/money.js';
import {
  getActivePayoutProvider,
  paypalPayoutsProvider,
  PayoutProvider
} from './payoutProvider.js';
import { broadcastEvent } from '../../routes/events.js';

export class PayoutGateError extends Error {
  public status: number;
  public code: string;
  public nextStep?: string;

  constructor(status: number, code: string, message: string, nextStep?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.nextStep = nextStep;
  }
}

export class PayoutService {
  public isSellerPayoutReady(sellerUserId?: string): boolean {
    if (!sellerUserId) return false;
    const acct = store.getSellerPayoutAccount(sellerUserId);
    return Boolean(acct && acct.status === 'ready' && acct.paypalEmail);
  }

  public getSellerPayoutAccount(userId: string): SellerPayoutAccount {
    const existing = store.getSellerPayoutAccount(userId);
    if (existing) return existing;
    const now = new Date().toISOString();
    return {
      id: `spa_unsaved_${userId}`,
      userId,
      provider: 'paypal_email',
      paypalEmail: null,
      status: 'not_set',
      verifiedAt: null,
      lastError: null,
      createdAt: now,
      updatedAt: now
    };
  }

  public async setSellerPayoutAccount(
    userId: string,
    paypalEmail: string,
    providerOverride?: 'paypal' | 'simulated'
  ): Promise<SellerPayoutAccount> {
    const now = new Date().toISOString();
    const provider = getActivePayoutProvider(providerOverride);
    const validation = await provider.validateAccount(paypalEmail);

    const existing = store.getSellerPayoutAccount(userId);
    const cleanEmail = paypalEmail.trim().toLowerCase();

    if (!validation.ok) {
      const failedRecord: SellerPayoutAccount = {
        id: existing?.id || `spa_${uuidv4().substring(0, 10)}`,
        userId,
        provider: validation.provider,
        paypalEmail: cleanEmail || null,
        status: 'failed',
        verifiedAt: null,
        lastError: validation.message || 'Invalid PayPal email.',
        createdAt: existing?.createdAt || now,
        updatedAt: now
      };
      store.saveSellerPayoutAccount(failedRecord);
      throw new PayoutGateError(400, 'INVALID_PAYOUT_EMAIL', failedRecord.lastError!, 'Enter a valid personal or business PayPal email.');
    }

    const readyRecord: SellerPayoutAccount = {
      id: existing?.id || `spa_${uuidv4().substring(0, 10)}`,
      userId,
      provider: validation.provider,
      paypalEmail: cleanEmail,
      status: 'ready',
      verifiedAt: now,
      lastError: null,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };

    store.saveSellerPayoutAccount(readyRecord);

    store.logActivity({
      userId,
      type: 'seller_payout_initiated',
      title: `Payout destination verified (${cleanEmail})`,
      description: `Earnings will be sent via ${readyRecord.provider === 'simulated' ? 'Test payout (simulated)' : 'PayPal Payouts'} once a buyer accepts work.`,
      severity: 'success'
    });

    broadcastEvent('payout_account_updated', { userId, status: readyRecord.status });
    return readyRecord;
  }

  /**
   * Computes gross, fee, and seller payout in integer cents using platformFeePercent.
   */
  public computeAmounts(grossCents: number): { grossCents: number; feeCents: number; payoutCents: number } {
    return computeFeeAndPayoutCents(grossCents, config.platformFeePercent);
  }

  /**
   * Buyer accepts delivered work (or acceptance window expires per rule) -> executes all server gates -> dispatches seller payout.
   */
  public async acceptWorkAndReleasePayout(
    dealId: string,
    actorUserId: string,
    options?: {
      providerOverride?: 'paypal' | 'simulated';
      providerInstance?: PayoutProvider;
      bypassActorCheck?: boolean;
      overridePayoutCents?: number;
      requireDelivered?: boolean;
    }
  ): Promise<{ payout: PayoutRecord; ledger: LedgerEntry[] }> {
    // Atomic SQLite BEGIN IMMEDIATE lock prevents any concurrent payout + refund race condition!
    const prep = store.runInImmediateTransaction(() => {
      const neg = store.getNegotiation(dealId);
      if (!neg) {
        throw new PayoutGateError(404, 'DEAL_NOT_FOUND', 'Deal not found.');
      }
      if (!options?.bypassActorCheck && neg.buyerUserId !== actorUserId) {
        throw new PayoutGateError(403, 'FORBIDDEN', 'Only the buyer on this deal can accept the work.');
      }

      const agreement = neg.agreementId ? store.getAgreement(neg.agreementId) : undefined;
      if (!agreement) {
        throw new PayoutGateError(404, 'AGREEMENT_NOT_FOUND', 'Agreement record missing for this deal.');
      }

      if (neg.projectStatus === 'disputed' || agreement.workAcceptanceStatus === 'disputed') {
        throw new PayoutGateError(409, 'DISPUTE_OPEN', 'Payout is blocked while a problem report or dispute is open on this deal.');
      }
      if (neg.projectStatus === 'refunded' || agreement.workAcceptanceStatus === 'refunded') {
        throw new PayoutGateError(409, 'ALREADY_REFUNDED', 'This deal has already been refunded.');
      }
      if (neg.projectStatus === 'cancelled' || neg.projectStatus === 'declined' || neg.projectStatus === 'expired') {
        throw new PayoutGateError(409, 'INVALID_PROJECT_STAGE', 'Cannot release payout on a cancelled or declined project.');
      }
      if (options?.requireDelivered && neg.projectStatus !== 'delivered' && neg.projectStatus !== 'accepted') {
        throw new PayoutGateError(409, 'NOT_DELIVERED', 'Work must be marked delivered before the buyer can accept it.');
      }

      const tx = store.getTransactionByAgreement(agreement.id);
      if (!tx || (tx.paymentStatus !== 'completed' && !options?.overridePayoutCents)) {
        throw new PayoutGateError(409, 'DEAL_NOT_PAID', 'Work cannot be accepted until buyer payment is completed.');
      }

      const sellerUserId = agreement.sellerUserId || neg.sellerUserId;
      if (!sellerUserId) {
        throw new PayoutGateError(400, 'SELLER_NOT_LINKED', 'Seller user is not linked to this deal.');
      }
      const payoutAcct = store.getSellerPayoutAccount(sellerUserId);
      if (!payoutAcct || payoutAcct.status !== 'ready' || !payoutAcct.paypalEmail) {
        store.addNotification({
          userId: sellerUserId,
          title: 'Add where to send your earnings',
          message: 'A buyer accepted your work, but your PayPal payout email is missing. Add it in Selling > Payments to release funds.',
          type: 'payout_required',
          linkUrl: '/app/transactions'
        });
        throw new PayoutGateError(
          409,
          'SELLER_PAYOUT_NOT_READY',
          'Seller has not finished payout setup yet.',
          'Seller must set a Ready PayPal email under Selling > Payments.'
        );
      }

      const existingPayout = store.getPayoutByDeal(dealId);
      if (existingPayout && ['paid', 'simulated_paid', 'processing', 'scheduled'].includes(existingPayout.status)) {
        if (agreement.workAcceptanceStatus !== 'accepted') {
          agreement.workAcceptanceStatus = 'accepted';
          agreement.workAcceptedAt = new Date().toISOString();
          store.saveAgreement(agreement);
        }
        return { alreadyHandled: true as const, payout: existingPayout };
      }

      const grossCents = tx.amountCents ?? agreement.finalPriceCents ?? dollarsToCents(tx.amount);
      const { feeCents, payoutCents: computedPayoutCents } =
        tx.sellerPayoutCents !== undefined && tx.platformFeeCents !== undefined
          ? { feeCents: tx.platformFeeCents, payoutCents: tx.sellerPayoutCents }
          : this.computeAmounts(grossCents);
      const payoutCents = typeof options?.overridePayoutCents === 'number'
        ? Math.max(0, Math.round(options.overridePayoutCents))
        : computedPayoutCents;

      const ledger = store.getLedgerEntriesForDeal(dealId);
      const totalBuyerPaid = ledger.filter(e => e.type === 'buyer_paid').reduce((s, e) => s + e.amountCents, 0);
      const totalRefunded = ledger.filter(e => e.type === 'refund').reduce((s, e) => s + e.amountCents, 0);
      const totalPaidOut = ledger.filter(e => e.type === 'seller_payout').reduce((s, e) => s + e.amountCents, 0);
      const totalHeld = ledger.filter(e => e.type === 'held_for_seller').reduce((s, e) => s + e.amountCents, 0);

      // Strict Money Invariant: refunded + paid_out <= captured ALWAYS
      if (totalRefunded + totalPaidOut + payoutCents > totalBuyerPaid) {
        throw new PayoutGateError(
          409,
          'MONEY_INVARIANT_VIOLATION',
          'Cannot release payout: funds have already been refunded or paid out.'
        );
      }
      if (!options?.overridePayoutCents && (totalBuyerPaid - totalRefunded < grossCents || totalHeld < payoutCents)) {
        throw new PayoutGateError(
          409,
          'LEDGER_MISMATCH',
          `Platform ledger mismatch: paid ${totalBuyerPaid - totalRefunded}c, held ${totalHeld}c vs expected payout ${payoutCents}c.`
        );
      }

      const now = new Date().toISOString();
      const prevProjStatus = neg.projectStatus;
      agreement.workAcceptanceStatus = 'accepted';
      agreement.workAcceptedAt = now;
      agreement.platformFeeCents = feeCents;
      agreement.sellerPayoutCents = payoutCents;
      store.saveAgreement(agreement);

      neg.acceptedAt = now;
      neg.projectStatus = 'accepted';
      neg.updatedAt = now;
      store.saveNegotiation(neg);

      const provider: PayoutProvider =
        options?.providerInstance ||
        getActivePayoutProvider(
          options?.providerOverride || (payoutAcct.provider === 'simulated' ? 'simulated' : undefined)
        );

      const payoutId = existingPayout?.id || `pay_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
      const payout: PayoutRecord = existingPayout || {
        id: payoutId,
        dealId,
        agreementId: agreement.id,
        sellerUserId,
        amountCents: payoutCents,
        feeCents,
        grossAmountCents: grossCents,
        currency: agreement.currency || 'USD',
        status: 'scheduled',
        provider: provider.id === 'simulated' ? 'simulated' : 'paypal',
        retryCount: 0,
        createdAt: now,
        updatedAt: now
      };
      payout.status = 'scheduled';
      payout.amountCents = payoutCents;
      store.savePayout(payout);

      store.addProjectEvent({
        dealId,
        actorUserId: actorUserId || 'system',
        actorRole: options?.bypassActorCheck ? 'system' : 'buyer',
        fromStatus: prevProjStatus,
        toStatus: 'accepted',
        summary: options?.bypassActorCheck
          ? 'Review window ended; project automatically accepted.'
          : 'Buyer accepted delivered work.',
        createdAt: now
      });

      return {
        alreadyHandled: false as const,
        neg,
        agreement,
        tx,
        sellerUserId,
        payoutAcct,
        payout,
        provider,
        payoutCents,
        feeCents,
        now
      };
    });

    if (prep.alreadyHandled) {
      return {
        payout: prep.payout,
        ledger: store.getLedgerEntriesForDeal(dealId)
      };
    }

    const { neg, tx, sellerUserId, payoutAcct, payout, provider, payoutCents, feeCents, now } = prep;

    if (payoutCents === 0) {
      payout.status = 'paid';
      store.savePayout(payout);
      return { payout, ledger: store.getLedgerEntriesForDeal(dealId) };
    }

    const res = await provider.createPayout({
      payoutId: payout.id,
      dealId,
      sellerEmail: payoutAcct.paypalEmail!,
      amountCents: payoutCents,
      currency: payout.currency
    });

    payout.status = res.status;
    payout.provider = res.provider;
    payout.providerBatchId = res.providerBatchId || null;
    payout.providerItemId = res.providerItemId || null;
    payout.paypalDebugId = res.debugId || null;
    payout.failureReason = res.failureReason || null;
    if (res.status === 'failed') {
      payout.retryCount += 1;
      payout.nextRetryAt = new Date(Date.now() + Math.min(60, Math.pow(2, payout.retryCount) * 5) * 1000).toISOString();
    }
    store.savePayout(payout);

    if (res.status === 'failed') {
      tx.sellerPayoutStatus = 'failed';
      tx.failureReason = res.failureReason;
      store.saveTransaction(tx);

      store.logActivity({
        userId: sellerUserId,
        type: 'seller_payout_failed',
        title: `Payout failed for ${formatCents(payoutCents)}`,
        description: res.failureReason || 'PayPal Payouts rejected the transfer.',
        negotiationId: dealId,
        transactionId: tx.id,
        amount: centsToDollars(payoutCents),
        currency: payout.currency,
        severity: 'error'
      });

      return { payout, ledger: store.getLedgerEntriesForDeal(dealId) };
    }

    // Record ledger entry for seller_payout cleanly with unique idempotencyKey inside BEGIN IMMEDIATE
    store.runInImmediateTransaction(() => {
      const mState = store.getMoneyState(dealId);
      if (mState.refundedCents + mState.paidOutCents + payoutCents <= mState.capturedCents) {
        store.addLedgerEntry({
          dealId,
          type: 'seller_payout',
          amountCents: payoutCents,
          currency: payout.currency,
          idempotencyKey: `payout_${dealId}`,
          note: res.provider === 'simulated'
            ? `Test payout (simulated) to ${payoutAcct.paypalEmail}`
            : `PayPal payout batch ${res.providerBatchId || payout.id} to ${payoutAcct.paypalEmail}`
        });
      }
      const n = store.getNegotiation(dealId);
      if (n) {
        n.projectStatus = res.status === 'processing' ? 'payout_released' : 'completed';
        n.updatedAt = new Date().toISOString();
        store.saveNegotiation(n);
        store.addProjectEvent({
          dealId,
          actorUserId: 'system',
          actorRole: 'system',
          fromStatus: 'accepted',
          toStatus: n.projectStatus,
          summary: `Seller payout (${formatCents(payoutCents)}) released after ${formatCents(feeCents)} fee.`
        });
      }
    });

    tx.sellerPayoutStatus = res.status;
    tx.sellerPayoutAt = now;
    store.saveTransaction(tx);

    const sellerLabel = res.provider === 'simulated' ? 'Test payout, simulated' : 'Released to your PayPal';
    store.addNotification({
      userId: sellerUserId,
      title: `Work accepted — ${formatCents(payoutCents)} ${res.provider === 'simulated' ? 'test payout' : 'sent'}`,
      message: `${sellerLabel} (${payoutAcct.paypalEmail}) after ${formatCents(feeCents)} service fee.`,
      type: 'payout_released',
      linkUrl: `/app/projects/${dealId}`
    });

    store.logActivity({
      userId: sellerUserId,
      type: res.status === 'paid' || res.status === 'simulated_paid' ? 'seller_payout_completed' : 'seller_payout_initiated',
      title: `Seller payout ${res.status}: ${formatCents(payoutCents)}`,
      description: `${sellerLabel} for deal ${dealId}. Batch ID: ${res.providerBatchId || 'simulated'}.`,
      negotiationId: dealId,
      transactionId: tx.id,
      amount: centsToDollars(payoutCents),
      currency: payout.currency,
      severity: 'success'
    });

    broadcastEvent('deal_updated', { negotiationId: dealId, status: 'payout_' + res.status });
    broadcastEvent('project_updated', { dealId, projectStatus: neg.projectStatus });

    return {
      payout,
      ledger: store.getLedgerEntriesForDeal(dealId)
    };
  }

  public async retryPayout(
    payoutId: string,
    options?: { providerOverride?: 'paypal' | 'simulated'; providerInstance?: PayoutProvider }
  ): Promise<PayoutRecord> {
    const payout = store.getPayout(payoutId);
    if (!payout) {
      throw new PayoutGateError(404, 'PAYOUT_NOT_FOUND', 'Payout record not found.');
    }
    if (['paid', 'simulated_paid'].includes(payout.status)) {
      return payout;
    }

    const acct = store.getSellerPayoutAccount(payout.sellerUserId);
    if (!acct || acct.status !== 'ready' || !acct.paypalEmail) {
      throw new PayoutGateError(409, 'SELLER_PAYOUT_NOT_READY', 'Seller payout account is not Ready.');
    }

    const provider = options?.providerInstance || getActivePayoutProvider(options?.providerOverride || (acct.provider === 'simulated' ? 'simulated' : undefined));
    const res = await provider.createPayout({
      payoutId: payout.id,
      dealId: payout.dealId,
      sellerEmail: acct.paypalEmail,
      amountCents: payout.amountCents,
      currency: payout.currency
    });

    payout.status = res.status;
    payout.provider = res.provider;
    payout.providerBatchId = res.providerBatchId || payout.providerBatchId || null;
    payout.providerItemId = res.providerItemId || payout.providerItemId || null;
    payout.paypalDebugId = res.debugId || payout.paypalDebugId || null;
    payout.failureReason = res.failureReason || null;
    payout.retryCount = (payout.retryCount || 0) + 1;
    payout.nextRetryAt = res.status === 'failed'
      ? new Date(Date.now() + Math.min(300, Math.pow(2, payout.retryCount) * 5) * 1000).toISOString()
      : null;
    store.savePayout(payout);

    const tx = store.getTransactionByAgreement(payout.agreementId);
    if (tx) {
      tx.sellerPayoutStatus = res.status;
      tx.failureReason = res.failureReason;
      if (res.status !== 'failed') {
        tx.sellerPayoutAt = new Date().toISOString();
      }
      store.saveTransaction(tx);
    }

    if (res.status !== 'failed') {
      const hasEntry = store.getLedgerEntriesForDeal(payout.dealId).some(e => e.type === 'seller_payout');
      if (!hasEntry) {
        store.addLedgerEntry({
          dealId: payout.dealId,
          type: 'seller_payout',
          amountCents: payout.amountCents,
          currency: payout.currency,
          idempotencyKey: `payout_${payout.dealId}`,
          note: `Retry succeeded (${res.provider}): batch ${res.providerBatchId || payout.id}`
        });
      }
      const neg = store.getNegotiation(payout.dealId);
      if (neg && neg.projectStatus !== 'completed' && neg.projectStatus !== 'partially_refunded') {
        neg.projectStatus = res.status === 'processing' ? 'payout_released' : 'completed';
        store.saveNegotiation(neg);
      }
    }

    return payout;
  }

  public async pollPayoutStatus(payoutId: string): Promise<PayoutRecord> {
    const payout = store.getPayout(payoutId);
    if (!payout) {
      throw new PayoutGateError(404, 'PAYOUT_NOT_FOUND', 'Payout record not found.');
    }
    if (payout.provider === 'simulated' || ['paid', 'simulated_paid'].includes(payout.status)) {
      return payout;
    }

    const res = await paypalPayoutsProvider.getPayoutStatus({
      providerBatchId: payout.providerBatchId,
      providerItemId: payout.providerItemId
    });
    payout.status = res.status;
    payout.providerItemId = res.providerItemId || payout.providerItemId || null;
    payout.paypalDebugId = res.debugId || payout.paypalDebugId || null;
    payout.failureReason = res.failureReason || null;
    store.savePayout(payout);

    const tx = store.getTransactionByAgreement(payout.agreementId);
    if (tx) {
      tx.sellerPayoutStatus = res.status;
      if (res.status === 'paid') tx.sellerPayoutAt = new Date().toISOString();
      store.saveTransaction(tx);
    }

    return payout;
  }

  public reportProblem(dealId: string, actorUserId: string, reason: string) {
    const neg = store.getNegotiation(dealId);
    if (!neg || (neg.buyerUserId !== actorUserId && neg.sellerUserId !== actorUserId)) {
      throw new PayoutGateError(404, 'DEAL_NOT_FOUND', 'Deal not found.');
    }
    const agreement = neg.agreementId ? store.getAgreement(neg.agreementId) : undefined;
    if (!agreement) {
      throw new PayoutGateError(404, 'AGREEMENT_NOT_FOUND', 'Agreement missing.');
    }
    const cleanReason = (reason || '').trim();
    if (cleanReason.length < 3) {
      throw new PayoutGateError(400, 'REASON_REQUIRED', 'Please describe the issue (at least 3 characters).');
    }

    agreement.workAcceptanceStatus = 'disputed';
    agreement.disputeReason = cleanReason;
    store.saveAgreement(agreement);

    const prevStatus = neg.projectStatus;
    neg.projectStatus = 'disputed';
    neg.reviewDueAt = null;
    store.saveNegotiation(neg);
    store.addProjectEvent({
      dealId,
      actorUserId,
      actorRole: actorUserId === neg.buyerUserId ? 'buyer' : 'seller',
      fromStatus: prevStatus,
      toStatus: 'disputed',
      summary: 'Problem reported; funds held and auto-release paused.',
      reason: cleanReason
    });

    store.logActivity({
      userId: actorUserId,
      type: 'deal_disputed',
      title: `Problem reported on deal`,
      description: cleanReason,
      negotiationId: dealId,
      severity: 'warning'
    });

    if (neg.sellerUserId && neg.buyerUserId) {
      const otherUser = actorUserId === neg.buyerUserId ? neg.sellerUserId : neg.buyerUserId;
      store.addNotification({
        userId: otherUser,
        title: 'Problem reported — payout paused',
        message: `Payout is paused while the reported issue is resolved: "${cleanReason}"`,
        type: 'action_required',
        linkUrl: `/app/deals/${dealId}`
      });
    }

    broadcastEvent('deal_updated', { negotiationId: dealId, status: 'disputed' });
    return agreement;
  }
}

export const payoutService = new PayoutService();
