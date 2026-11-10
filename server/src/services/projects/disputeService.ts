import { v4 as uuidv4 } from 'uuid';
import { store } from '../../db/store.js';
import { config } from '../../config/index.js';
import { DisputeRecord, DeliveryFileMeta } from '../../types/index.js';
import { ProjectTransitionError, projectStateMachine } from './projectStateMachine.js';
import { paypalService } from '../paypal/paypalClient.js';
import { payoutService } from '../paypal/payoutService.js';
import { centsToDollars } from '../negotiation/money.js';
import { broadcastEvent } from '../../routes/events.js';

export class DisputeService {
  public openDispute(
    dealId: string,
    actorUserId: string,
    payload: {
      reasonChip: string;
      description: string;
      evidenceLinks?: string[];
      evidenceFiles?: DeliveryFileMeta[];
    }
  ): DisputeRecord {
    const neg = store.getNegotiation(dealId);
    if (!neg || (neg.buyerUserId !== actorUserId && neg.sellerUserId !== actorUserId)) {
      throw new ProjectTransitionError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
    }

    const isBuyer = neg.buyerUserId === actorUserId;
    const isSeller = neg.sellerUserId === actorUserId;
    const actorRole: 'buyer' | 'seller' = isBuyer ? 'buyer' : 'seller';

    const existing = store.getDisputeByDeal(dealId);
    if (existing && (existing.status === 'open' || existing.status === 'responded')) {
      throw new ProjectTransitionError(409, 'DISPUTE_ALREADY_OPEN', 'There is already an open dispute on this project.');
    }

    // Allowed stages: delivered, revision_requested, or in_progress (after buyer cancellation declined OR overdue)
    const ps = neg.projectStatus;
    if (ps === 'in_progress') {
      const cancelReq = store.getCancellationRequest(dealId);
      const isOverdue = Boolean(neg.dueAt && new Date(neg.dueAt).getTime() < Date.now());
      if ((!cancelReq || cancelReq.status !== 'declined') && !isOverdue) {
        throw new ProjectTransitionError(
          409,
          'DISPUTE_STAGE_BLOCKED',
          'Request cancellation first (or wait until delivery or missed due date) before opening a dispute.'
        );
      }
    } else if (ps !== 'delivered' && ps !== 'revision_requested') {
      throw new ProjectTransitionError(
        409,
        'DISPUTE_STAGE_BLOCKED',
        `Cannot open a dispute from "${ps}" stage.`
      );
    }

    const cleanChip = (payload.reasonChip || '').trim() || 'Other';
    const cleanDesc = (payload.description || '').trim();
    if (cleanDesc.length < 5) {
      throw new ProjectTransitionError(400, 'VALIDATION_ERROR', 'Please describe the issue (at least 5 characters).');
    }

    const respondentUserId = isBuyer ? (neg.sellerUserId || '') : (neg.buyerUserId || '');
    const now = new Date().toISOString();
    const responseDueAt = new Date(Date.now() + config.disputeResponseHours * 60 * 60 * 1000).toISOString();

    const dispute: DisputeRecord = {
      id: `dsp_${uuidv4().substring(0, 10)}`,
      dealId,
      openedByUserId: actorUserId,
      openedByRole: actorRole,
      reasonChip: cleanChip,
      description: cleanDesc,
      evidenceLinks: (payload.evidenceLinks || []).map(s => s.trim()).filter(Boolean).slice(0, 5),
      evidenceFiles: payload.evidenceFiles || [],
      respondentUserId,
      respondentEvidenceLinks: [],
      respondentEvidenceFiles: [],
      responseDueAt,
      status: 'open',
      createdAt: now
    };

    projectStateMachine.transitionStatus({
      dealId,
      actorUserId,
      actorRole,
      toStatus: 'disputed',
      allowedFrom: ['delivered', 'revision_requested', 'in_progress'],
      summary: `${actorRole === 'buyer' ? 'Buyer' : 'Seller'} opened a dispute (${cleanChip}). Funds frozen and auto-release paused.`,
      reason: cleanDesc,
      mutate: (n) => {
        n.reviewDueAt = null;
      }
    });

    if (neg.agreementId) {
      const ag = store.getAgreement(neg.agreementId);
      if (ag) {
        ag.workAcceptanceStatus = 'disputed';
        ag.disputeReason = `${cleanChip}: ${cleanDesc}`;
        store.saveAgreement(ag);
      }
    }

    store.saveDispute(dispute);

    if (respondentUserId) {
      store.addNotification({
        userId: respondentUserId,
        title: 'Dispute opened — response needed',
        message: `A dispute was opened (${cleanChip}). Submit your response and evidence within 3 days.`,
        type: 'action_required',
        linkUrl: `/app/projects/${dealId}`
      });
    }

    broadcastEvent('project_updated', { dealId, projectStatus: 'disputed' });
    return dispute;
  }

  public respondToDispute(
    dealId: string,
    actorUserId: string,
    payload: { note: string; evidenceLinks?: string[]; evidenceFiles?: DeliveryFileMeta[] }
  ): DisputeRecord {
    const neg = store.getNegotiation(dealId);
    if (!neg || (neg.buyerUserId !== actorUserId && neg.sellerUserId !== actorUserId)) {
      throw new ProjectTransitionError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
    }
    const dispute = store.getDisputeByDeal(dealId);
    if (!dispute || (dispute.status !== 'open' && dispute.status !== 'responded')) {
      throw new ProjectTransitionError(409, 'NO_OPEN_DISPUTE', 'There is no open dispute to respond to.');
    }
    if (dispute.openedByUserId === actorUserId) {
      throw new ProjectTransitionError(409, 'RESPONDENT_ONLY', 'Only the other party can submit the dispute response.');
    }

    const cleanNote = (payload.note || '').trim();
    if (cleanNote.length < 3) {
      throw new ProjectTransitionError(400, 'VALIDATION_ERROR', 'Please enter a response note.');
    }

    dispute.respondentNote = cleanNote;
    dispute.respondentEvidenceLinks = (payload.evidenceLinks || []).map(s => s.trim()).filter(Boolean).slice(0, 5);
    dispute.respondentEvidenceFiles = payload.evidenceFiles || [];
    dispute.status = 'responded';
    store.saveDispute(dispute);

    store.addProjectEvent({
      dealId,
      actorUserId,
      actorRole: actorUserId === neg.buyerUserId ? 'buyer' : 'seller',
      fromStatus: 'disputed',
      toStatus: 'disputed',
      summary: 'Respondent submitted dispute statement and evidence.',
      reason: cleanNote
    });

    if (dispute.openedByUserId) {
      store.addNotification({
        userId: dispute.openedByUserId,
        title: 'Dispute response submitted',
        message: 'The other party submitted their response and evidence for mediator review.',
        type: 'action_required',
        linkUrl: `/app/projects/${dealId}`
      });
    }

    broadcastEvent('project_updated', { dealId, projectStatus: 'disputed' });
    return dispute;
  }

  /**
   * Resolves a dispute (mediator/admin action): Release to seller, Refund buyer, or Split (% to seller).
   */
  public async resolveDispute(
    dealId: string,
    resolverUserId: string,
    payload: {
      outcome: 'release' | 'refund' | 'split';
      sellerPercent?: number;
      reason: string;
      payoutProviderOverride?: 'paypal' | 'simulated';
    }
  ): Promise<{ dispute: DisputeRecord; projectStatus: string }> {
    const neg = store.getNegotiation(dealId);
    if (!neg || !neg.agreementId) {
      throw new ProjectTransitionError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
    }
    const dispute = store.getDisputeByDeal(dealId);
    if (!dispute || (dispute.status !== 'open' && dispute.status !== 'responded')) {
      throw new ProjectTransitionError(409, 'NO_OPEN_DISPUTE', 'Dispute is already resolved or missing.');
    }
    if (neg.projectStatus !== 'disputed') {
      throw new ProjectTransitionError(409, 'INVALID_PROJECT_STAGE', 'Project is not in disputed state.');
    }

    const cleanReason = (payload.reason || '').trim();
    if (cleanReason.length < 5) {
      throw new ProjectTransitionError(400, 'REASON_REQUIRED', 'Mediator resolution requires a short written reason (5+ chars).');
    }

    const now = new Date().toISOString();
    const ag = store.getAgreement(neg.agreementId)!;
    const moneyState = store.getMoneyState(dealId);
    const heldGrossCents = Math.max(0, moneyState.capturedCents - moneyState.refundedCents - moneyState.paidOutCents);

    if (payload.outcome === 'release') {
      // Clear dispute flag so payout gates pass
      ag.workAcceptanceStatus = 'pending';
      store.saveAgreement(ag);
      neg.projectStatus = 'delivered';
      store.saveNegotiation(neg);

      await payoutService.acceptWorkAndReleasePayout(dealId, resolverUserId, {
        bypassActorCheck: true,
        providerOverride: payload.payoutProviderOverride
      });

      dispute.status = 'resolved_release';
      dispute.resolutionSellerPct = 100;
      dispute.resolutionReason = cleanReason;
      dispute.resolvedBy = resolverUserId;
      dispute.resolvedAt = now;
      store.saveDispute(dispute);
    } else if (payload.outcome === 'refund') {
      await paypalService.refundPayment(ag.id, `Dispute resolution: ${cleanReason}`, resolverUserId, {
        bypassActorCheck: true,
        enforceStageRules: false,
        actorRole: 'admin'
      });

      dispute.status = 'resolved_refund';
      dispute.resolutionSellerPct = 0;
      dispute.resolutionReason = cleanReason;
      dispute.resolvedBy = resolverUserId;
      dispute.resolvedAt = now;
      store.saveDispute(dispute);
    } else {
      // Split: seller gets sellerPercent (1..99) of net seller share; buyer gets the rest refunded
      const pct = Math.max(1, Math.min(99, Math.round(Number(payload.sellerPercent ?? 50))));
      const buyerRefundCents = Math.round((heldGrossCents * (100 - pct)) / 100);

      // 1. Issue partial refund to buyer
      const txAfterRefund = await paypalService.refundPayment(
        ag.id,
        `Dispute split (${100 - pct}% buyer / ${pct}% seller): ${cleanReason}`,
        resolverUserId,
        {
          amountCents: buyerRefundCents,
          bypassActorCheck: true,
          enforceStageRules: false,
          actorRole: 'admin'
        }
      );

      // 2. Release remaining seller payout (net of remaining prorated fee)
      const latestMoney = store.getMoneyState(dealId);
      const sellerShareCents = Math.max(
        0,
        latestMoney.capturedCents - latestMoney.refundedCents - latestMoney.paidOutCents - latestMoney.feeCents
      );

      ag.workAcceptanceStatus = 'pending';
      store.saveAgreement(ag);
      const freshNeg = store.getNegotiation(dealId)!;
      freshNeg.projectStatus = 'accepted';
      store.saveNegotiation(freshNeg);

      if (sellerShareCents > 0) {
        await payoutService.acceptWorkAndReleasePayout(dealId, resolverUserId, {
          bypassActorCheck: true,
          overridePayoutCents: sellerShareCents,
          providerOverride: payload.payoutProviderOverride
        });
      }

      const finalNeg = store.getNegotiation(dealId)!;
      finalNeg.projectStatus = 'partially_refunded';
      store.saveNegotiation(finalNeg);

      dispute.status = 'resolved_split';
      dispute.resolutionSellerPct = pct;
      dispute.resolutionReason = cleanReason;
      dispute.resolvedBy = resolverUserId;
      dispute.resolvedAt = now;
      store.saveDispute(dispute);

      void txAfterRefund;
    }

    const updatedNeg = store.getNegotiation(dealId)!;
    store.addProjectEvent({
      dealId,
      actorUserId: resolverUserId,
      actorRole: 'admin',
      fromStatus: 'disputed',
      toStatus: updatedNeg.projectStatus,
      summary: `Dispute resolved (${payload.outcome}${payload.outcome === 'split' ? ` ${dispute.resolutionSellerPct}% seller` : ''}): ${cleanReason}`,
      reason: cleanReason,
      createdAt: now
    });

    if (neg.buyerUserId) {
      store.addNotification({
        userId: neg.buyerUserId,
        title: 'Dispute resolved',
        message: `Resolution: ${cleanReason}`,
        type: 'system',
        linkUrl: `/app/projects/${dealId}`
      });
    }
    if (neg.sellerUserId) {
      store.addNotification({
        userId: neg.sellerUserId,
        title: 'Dispute resolved',
        message: `Resolution: ${cleanReason}`,
        type: 'system',
        linkUrl: `/app/projects/${dealId}`
      });
    }

    broadcastEvent('project_updated', { dealId, projectStatus: updatedNeg.projectStatus });
    return { dispute, projectStatus: updatedNeg.projectStatus };
  }

  public getUserAbuseSummary(userId: string): { losses30d: number; flagged: boolean; requiresLargeDealApproval: boolean } {
    const losses30d = store.getUserDisputeLossCount30Days(userId);
    const flagged = losses30d > 2;
    return {
      losses30d,
      flagged,
      requiresLargeDealApproval: flagged
    };
  }
}

export const disputeService = new DisputeService();
