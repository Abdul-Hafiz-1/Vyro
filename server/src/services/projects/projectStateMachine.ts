import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { store } from '../../db/store.js';
import { config } from '../../config/index.js';
import {
  ProjectStatus,
  ProjectEvent,
  Negotiation,
  MoneyState,
  DeliveryRecord,
  DeliveryFileMeta,
  CancellationRequestRecord,
  SellerAutoRules
} from '../../types/index.js';
import { computeFeeAndPayoutCents, centsToDollars, dollarsToCents } from '../negotiation/money.js';
import { broadcastEvent } from '../../routes/events.js';

export class ProjectTransitionError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'ProjectTransitionError';
  }
}

export const ALLOWED_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  request_sent: ['negotiating', 'declined', 'cancelled', 'expired'],
  negotiating: ['agreed', 'declined', 'cancelled', 'expired'],
  agreed: ['paid_held', 'cancelled', 'expired'],
  paid_held: ['in_progress', 'cancelled', 'refunded'],
  in_progress: ['delivered', 'disputed', 'refunded', 'partially_refunded', 'cancelled'],
  delivered: ['accepted', 'revision_requested', 'disputed', 'refunded', 'partially_refunded'],
  revision_requested: ['delivered', 'disputed', 'refunded', 'partially_refunded'],
  accepted: ['payout_released', 'completed', 'refunded', 'partially_refunded'],
  payout_released: ['completed'],
  completed: [],
  declined: ['negotiating'], // Seller rule auto-decline override only
  cancelled: ['refunded'],
  disputed: ['refunded', 'partially_refunded', 'payout_released', 'completed'],
  refunded: [],
  partially_refunded: ['payout_released', 'completed'],
  expired: []
};

export function formatPlainProjectStage(status: ProjectStatus, isSeller: boolean): {
  label: string;
  explanation: string;
  tone: 'handled' | 'needsYou' | 'declined' | 'inProgress' | 'neutral';
} {
  switch (status) {
    case 'request_sent':
      return {
        label: isSeller ? 'New request' : 'Waiting for reply',
        explanation: isSeller
          ? 'Review what the buyer needs and accept, counter, or reject.'
          : 'Your request was sent to this seller.',
        tone: isSeller ? 'needsYou' : 'inProgress'
      };
    case 'negotiating':
      return {
        label: 'Negotiating',
        explanation: 'Agents are exchanging offers within private limits.',
        tone: 'inProgress'
      };
    case 'agreed':
      return {
        label: isSeller ? 'Waiting for payment' : 'Ready to pay',
        explanation: isSeller
          ? 'Terms are agreed. Waiting for the buyer to fund PayPal escrow.'
          : 'Terms are agreed. Authorize payment with PayPal to start.',
        tone: 'needsYou'
      };
    case 'paid_held':
      return {
        label: 'Paid, held',
        explanation: isSeller
          ? 'Buyer paid. Click Start work to lock escrow and begin.'
          : 'Paid with PayPal · held by VYRO until work starts and is accepted.',
        tone: isSeller ? 'needsYou' : 'inProgress'
      };
    case 'in_progress':
      return {
        label: 'In progress',
        explanation: isSeller
          ? 'Work is underway. Deliver work when deliverables are ready.'
          : 'Seller is working on your deliverables.',
        tone: 'inProgress'
      };
    case 'delivered':
      return {
        label: isSeller ? 'Delivered' : 'Needs review',
        explanation: isSeller
          ? 'Delivered to buyer. Payout releases on acceptance or review window expiry.'
          : 'Seller delivered the work. Accept work, request changes, or report a problem.',
        tone: isSeller ? 'inProgress' : 'needsYou'
      };
    case 'revision_requested':
      return {
        label: 'Revision requested',
        explanation: isSeller
          ? 'Buyer requested changes. Submit your updated delivery.'
          : 'Waiting for seller to deliver the requested changes.',
        tone: isSeller ? 'needsYou' : 'inProgress'
      };
    case 'accepted':
    case 'payout_released':
      return {
        label: 'Sending payout',
        explanation: 'Work accepted and seller payout dispatched.',
        tone: 'handled'
      };
    case 'completed':
      return {
        label: 'Completed',
        explanation: 'Work accepted and payout released.',
        tone: 'handled'
      };
    case 'declined':
      return {
        label: 'Declined',
        explanation: 'Declined before payment.',
        tone: 'declined'
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        explanation: 'Project cancelled.',
        tone: 'declined'
      };
    case 'disputed':
      return {
        label: 'Disputed',
        explanation: 'Open dispute — funds remain safely held during review.',
        tone: 'needsYou'
      };
    case 'refunded':
      return {
        label: 'Refunded',
        explanation: 'Full refund issued to buyer.',
        tone: 'declined'
      };
    case 'partially_refunded':
      return {
        label: 'Partially refunded',
        explanation: 'Partial refund settled and balance resolved.',
        tone: 'handled'
      };
    case 'expired':
      return {
        label: 'Expired',
        explanation: 'This request expired before agreement.',
        tone: 'declined'
      };
  }
}

export class ProjectStateMachineService {
  /**
   * Checks seller auto-reject rules (minimum budget, blocked categories, minimum deadline days, capacity full).
   */
  public evaluateSellerAutoRules(
    sellerUserId: string,
    params: { category: string; maxBudget: number; deadlineDays: number }
  ): { matched: boolean; reason?: string } {
    const seller = store.getUser(sellerUserId);
    const rules: SellerAutoRules = seller?.sellerAutoRules || {};

    if (typeof rules.minBudget === 'number' && rules.minBudget > 0 && params.maxBudget < rules.minBudget) {
      return {
        matched: true,
        reason: `Auto-declined by your rules: buyer budget ($${params.maxBudget}) is below your minimum ($${rules.minBudget}).`
      };
    }

    if (Array.isArray(rules.blockedCategories) && rules.blockedCategories.length > 0) {
      const catLower = (params.category || '').toLowerCase();
      if (rules.blockedCategories.some(c => c.toLowerCase() === catLower)) {
        return {
          matched: true,
          reason: `Auto-declined by your rules: category "${params.category}" is excluded.`
        };
      }
    }

    if (typeof rules.minDeadlineDays === 'number' && rules.minDeadlineDays > 0 && params.deadlineDays < rules.minDeadlineDays) {
      return {
        matched: true,
        reason: `Auto-declined by your rules: ${params.deadlineDays}-day deadline is tighter than your ${rules.minDeadlineDays}-day minimum.`
      };
    }

    if (rules.autoRejectWhenFull) {
      const cap = this.getSellerCapacity(sellerUserId);
      if (cap.isFull) {
        return {
          matched: true,
          reason: `Auto-declined by your rules: capacity full (${cap.active} of ${cap.max} active projects).`
        };
      }
    }

    return { matched: false };
  }

  public getSellerCapacity(sellerUserId: string): { active: number; max: number; isFull: boolean } {
    const seller = store.getUser(sellerUserId);
    const active = store.getSellerActiveProjectsCount(sellerUserId);
    const max = Math.max(1, seller?.sellerProfile?.maxConcurrentProjects || 5);
    return { active, max, isFull: active >= max };
  }

  public getMoneyState(dealId: string): MoneyState {
    return store.getMoneyState(dealId);
  }

  /**
   * Enforces valid transition, caller identity/role, and logs append-only project_events row.
   */
  public transitionStatus(params: {
    dealId: string;
    actorUserId: string;
    actorRole: 'buyer' | 'seller' | 'system' | 'admin';
    toStatus: ProjectStatus;
    summary: string;
    reason?: string;
    allowedFrom?: ProjectStatus[];
    mutate?: (neg: Negotiation, now: string) => void;
    metadata?: Record<string, any>;
  }): { negotiation: Negotiation; event: ProjectEvent } {
    return store.runInImmediateTransaction(() => {
      const neg = store.getNegotiation(params.dealId);
      if (!neg) {
        throw new ProjectTransitionError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
      }

      if (params.actorRole === 'buyer' && neg.buyerUserId !== params.actorUserId) {
        throw new ProjectTransitionError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
      }
      if (params.actorRole === 'seller' && neg.sellerUserId !== params.actorUserId) {
        throw new ProjectTransitionError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
      }

      const fromStatus = neg.projectStatus || 'negotiating';
      const allowedTargets = ALLOWED_TRANSITIONS[fromStatus] || [];

      if (params.allowedFrom && !params.allowedFrom.includes(fromStatus)) {
        throw new ProjectTransitionError(
          409,
          'INVALID_PROJECT_STAGE',
          `This action cannot be done while the project is in "${formatPlainProjectStage(fromStatus, params.actorRole === 'seller').label}" stage.`
        );
      }

      if (!allowedTargets.includes(params.toStatus)) {
        throw new ProjectTransitionError(
          409,
          'INVALID_TRANSITION',
          `Cannot move project from "${formatPlainProjectStage(fromStatus, params.actorRole === 'seller').label}" to "${params.toStatus}".`
        );
      }

      const now = new Date().toISOString();
      if (params.mutate) {
        params.mutate(neg, now);
      }
      neg.projectStatus = params.toStatus;
      neg.updatedAt = now;
      store.saveNegotiation(neg);

      const event = store.addProjectEvent({
        dealId: neg.id,
        actorUserId: params.actorUserId,
        actorRole: params.actorRole,
        fromStatus,
        toStatus: params.toStatus,
        summary: params.summary,
        reason: params.reason || null,
        metadata: params.metadata,
        createdAt: now
      });

      return { negotiation: neg, event };
    });
  }

  /**
   * Seller starts work: paid_held -> in_progress (locks instant self-refund for buyer).
   */
  public startWork(dealId: string, sellerUserId: string): { negotiation: Negotiation; event: ProjectEvent } {
    const neg = store.getNegotiation(dealId);
    if (!neg || (neg.buyerUserId !== sellerUserId && neg.sellerUserId !== sellerUserId)) {
      throw new ProjectTransitionError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
    }
    if (neg.sellerUserId !== sellerUserId) {
      throw new ProjectTransitionError(409, 'ROLE_NOT_ALLOWED', 'Only the seller can start work on this project.');
    }

    const ag = neg.agreementId ? store.getAgreement(neg.agreementId) : undefined;
    const deliveryDays = ag?.deliveryDays || neg.currentProposal?.deliveryDays || 5;

    const result = this.transitionStatus({
      dealId,
      actorUserId: sellerUserId,
      actorRole: 'seller',
      toStatus: 'in_progress',
      allowedFrom: ['paid_held'],
      summary: 'Seller started work on the project.',
      mutate: (n, now) => {
        n.startedAt = now;
        n.dueAt = new Date(Date.now() + deliveryDays * 24 * 60 * 60 * 1000).toISOString();
      }
    });

    if (neg.buyerUserId) {
      store.addNotification({
        userId: neg.buyerUserId,
        title: 'Work has started',
        message: 'The seller started working on your project. Escrow funds remain protected.',
        type: 'agreement_ready',
        linkUrl: `/app/projects/${neg.id}`
      });
    }
    broadcastEvent('project_updated', { dealId: neg.id, projectStatus: 'in_progress' });
    return result;
  }

  /**
   * Seller marks / submits work delivery: in_progress | revision_requested -> delivered.
   * Sets review_due_at and writes immutable SHA-256 evidence record.
   */
  public deliverWork(
    dealId: string,
    sellerUserId: string,
    payload: { note: string; links?: string[]; files?: DeliveryFileMeta[] }
  ): { negotiation: Negotiation; delivery: DeliveryRecord; event: ProjectEvent } {
    const neg = store.getNegotiation(dealId);
    if (!neg || (neg.buyerUserId !== sellerUserId && neg.sellerUserId !== sellerUserId)) {
      throw new ProjectTransitionError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
    }
    if (neg.sellerUserId !== sellerUserId) {
      throw new ProjectTransitionError(409, 'ROLE_NOT_ALLOWED', 'Only the seller can deliver work.');
    }

    const cleanNote = (payload.note || '').trim();
    if (!cleanNote || cleanNote.length < 3) {
      throw new ProjectTransitionError(400, 'VALIDATION_ERROR', 'Please include a short delivery note describing the work.');
    }

    const cleanLinks = (payload.links || []).map(l => l.trim()).filter(Boolean).slice(0, 5);
    const cleanFiles = (payload.files || []).slice(0, 5);
    const revisionNumber = neg.revisionsUsed || 0;
    const timestamp = new Date().toISOString();
    const evidencePayload = JSON.stringify({
      dealId,
      sellerUserId,
      revisionNumber,
      note: cleanNote,
      links: cleanLinks,
      fileHashes: cleanFiles.map(f => ({ name: f.originalName, sha256: f.sha256, size: f.sizeBytes })),
      timestamp
    });
    const evidenceHash = crypto.createHash('sha256').update(evidencePayload).digest('hex');

    const reviewWindowMs = config.reviewWindowHours * 60 * 60 * 1000;
    const reviewDueAt = new Date(Date.now() + reviewWindowMs).toISOString();

    const { negotiation, event } = this.transitionStatus({
      dealId,
      actorUserId: sellerUserId,
      actorRole: 'seller',
      toStatus: 'delivered',
      allowedFrom: ['in_progress', 'revision_requested'],
      summary: revisionNumber > 0
        ? `Seller submitted revised delivery #${revisionNumber}.`
        : 'Seller delivered the completed work for buyer review.',
      reason: cleanNote,
      mutate: (n, now) => {
        n.deliveredAt = now;
        n.reviewDueAt = reviewDueAt;
        n.deliveryNote = cleanNote;
        n.deliveryLinks = cleanLinks;
      },
      metadata: { evidenceHash, linkCount: cleanLinks.length, fileCount: cleanFiles.length }
    });

    const delivery = store.addDelivery({
      dealId,
      sellerUserId,
      revisionNumber,
      note: cleanNote,
      links: cleanLinks,
      files: cleanFiles,
      evidenceHash,
      createdAt: timestamp
    });

    if (neg.buyerUserId) {
      store.addNotification({
        userId: neg.buyerUserId,
        title: 'Work delivered — review needed',
        message: 'The seller delivered your project. Review the delivery and accept work or request changes.',
        type: 'action_required',
        linkUrl: `/app/projects/${neg.id}`
      });
    }
    broadcastEvent('project_updated', { dealId: neg.id, projectStatus: 'delivered' });
    return { negotiation, delivery, event };
  }

  /**
   * Buyer requests changes (revision): delivered -> revision_requested (if revisions remaining).
   */
  public requestRevision(dealId: string, buyerUserId: string, message: string): { negotiation: Negotiation; event: ProjectEvent } {
    const neg = store.getNegotiation(dealId);
    if (!neg || (neg.buyerUserId !== buyerUserId && neg.sellerUserId !== buyerUserId)) {
      throw new ProjectTransitionError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
    }
    if (neg.buyerUserId !== buyerUserId) {
      throw new ProjectTransitionError(409, 'ROLE_NOT_ALLOWED', 'Only the buyer can request revisions.');
    }
    const cleanMsg = (message || '').trim();
    if (cleanMsg.length < 3) {
      throw new ProjectTransitionError(400, 'VALIDATION_ERROR', 'Please describe what changes you need.');
    }
    const allowed = neg.revisionsAllowed ?? 1;
    const used = neg.revisionsUsed ?? 0;
    if (used >= allowed) {
      throw new ProjectTransitionError(
        409,
        'NO_REVISIONS_LEFT',
        'All included revisions have been used. Please accept the work or report a problem.'
      );
    }

    const result = this.transitionStatus({
      dealId,
      actorUserId: buyerUserId,
      actorRole: 'buyer',
      toStatus: 'revision_requested',
      allowedFrom: ['delivered'],
      summary: `Buyer requested revision #${used + 1}.`,
      reason: cleanMsg,
      mutate: (n) => {
        n.revisionsUsed = (n.revisionsUsed ?? 0) + 1;
        n.reviewDueAt = null;
      }
    });

    if (neg.sellerUserId) {
      store.addNotification({
        userId: neg.sellerUserId,
        title: 'Changes requested',
        message: `Buyer requested a revision: "${cleanMsg}"`,
        type: 'action_required',
        linkUrl: `/app/projects/${neg.id}`
      });
    }
    broadcastEvent('project_updated', { dealId: neg.id, projectStatus: 'revision_requested' });
    return result;
  }

  /**
   * Seller sends a rate-limited reminder when deal is delivered & waiting buyer review.
   */
  public sendReviewReminder(dealId: string, sellerUserId: string): { sentAt: string } {
    const neg = store.getNegotiation(dealId);
    if (!neg || (neg.buyerUserId !== sellerUserId && neg.sellerUserId !== sellerUserId)) {
      throw new ProjectTransitionError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
    }
    if (neg.sellerUserId !== sellerUserId) {
      throw new ProjectTransitionError(409, 'ROLE_NOT_ALLOWED', 'Only the seller can send a review reminder.');
    }
    if (neg.projectStatus !== 'delivered') {
      throw new ProjectTransitionError(409, 'INVALID_PROJECT_STAGE', 'Reminders can only be sent while waiting for buyer review.');
    }
    if (neg.lastReminderAt) {
      const elapsedMs = Date.now() - new Date(neg.lastReminderAt).getTime();
      if (elapsedMs < 30 * 60 * 1000) {
        throw new ProjectTransitionError(429, 'RATE_LIMITED', 'A reminder was already sent recently. Please wait before sending another.');
      }
    }
    const now = new Date().toISOString();
    neg.lastReminderAt = now;
    store.saveNegotiation(neg);
    store.addProjectEvent({
      dealId: neg.id,
      actorUserId: sellerUserId,
      actorRole: 'seller',
      fromStatus: 'delivered',
      toStatus: 'delivered',
      summary: 'Seller sent a friendly review reminder.',
      createdAt: now
    });
    if (neg.buyerUserId) {
      store.addNotification({
        userId: neg.buyerUserId,
        title: 'Reminder: review delivered work',
        message: 'The seller sent a reminder to review your delivered project.',
        type: 'action_required',
        linkUrl: `/app/projects/${neg.id}`
      });
    }
    return { sentAt: now };
  }

  /**
   * Seller or Buyer rejects / walks away BEFORE payment (request_sent | negotiating -> declined).
   * Notifies buyer neutrally without leaking seller private rejection reasons unless explicitly shared.
   */
  public rejectBeforePayment(
    dealId: string,
    actorUserId: string,
    params: { reasonChip?: string; note?: string; shareNote?: boolean }
  ): { negotiation: Negotiation; event: ProjectEvent; alternativeNegotiations?: string[] } {
    const neg = store.getNegotiation(dealId);
    if (!neg || (neg.buyerUserId !== actorUserId && neg.sellerUserId !== actorUserId)) {
      throw new ProjectTransitionError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
    }
    const isSeller = neg.sellerUserId === actorUserId;
    const actorRole = isSeller ? 'seller' : 'buyer';
    const privateReason = [params.reasonChip, params.note?.trim()].filter(Boolean).join(': ') || 'Declined by user';
    const sharedNote = params.shareNote && params.note?.trim() ? params.note.trim() : null;

    const { negotiation, event } = this.transitionStatus({
      dealId,
      actorUserId,
      actorRole,
      toStatus: 'declined',
      allowedFrom: ['request_sent', 'negotiating'],
      summary: isSeller
        ? 'Seller declined this request before agreement.'
        : 'Buyer declined this negotiation.',
      reason: privateReason,
      mutate: (n, now) => {
        n.status = 'rejected';
        n.rejectReason = privateReason;
        n.sharedRejectNote = sharedNote;
        n.cancelledAt = now;
      }
    });

    // Update any pending decision / review queue item
    const qItem = store.getReviewQueueItemByNegotiation(dealId);
    if (qItem && qItem.status === 'pending') {
      store.saveReviewQueueItem({
        ...qItem,
        status: 'rejected',
        resolvedBy: 'user',
        resolvedAt: new Date().toISOString(),
        resolutionNote: privateReason
      });
    }
    const dec = store.getDecisionByEntity('deal', dealId);
    if (dec && dec.status === 'needs_review') {
      store.updateDecisionStatus(dec.id, 'human_declined', 'user', privateReason);
    }

    if (isSeller && neg.buyerUserId) {
      const buyerMsg = sharedNote
        ? `This seller can't take it ("${sharedNote}"). I'm looking at other options.`
        : "This seller can't take it. I'm looking at other options.";
      store.addNotification({
        userId: neg.buyerUserId,
        title: 'Seller unavailable for this request',
        message: buyerMsg,
        type: 'system',
        linkUrl: `/app/projects/${neg.id}`
      });
    } else if (!isSeller && neg.sellerUserId) {
      store.addNotification({
        userId: neg.sellerUserId,
        title: 'Buyer ended negotiation',
        message: 'The buyer decided not to proceed with this request.',
        type: 'system',
        linkUrl: `/app/projects/${neg.id}`
      });
    }

    broadcastEvent('project_updated', { dealId: neg.id, projectStatus: 'declined' });
    return { negotiation, event };
  }

  /**
   * Seller overrides an auto-rule decline so they can accept/negotiate the request.
   */
  public overrideAutoDecline(dealId: string, sellerUserId: string): { negotiation: Negotiation; event: ProjectEvent } {
    const neg = store.getNegotiation(dealId);
    if (!neg || neg.sellerUserId !== sellerUserId) {
      throw new ProjectTransitionError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
    }
    const result = this.transitionStatus({
      dealId,
      actorUserId: sellerUserId,
      actorRole: 'seller',
      toStatus: 'negotiating',
      allowedFrom: ['declined'],
      summary: 'Seller overrode auto-decline rule and reopened request.',
      mutate: (n) => {
        n.status = 'in_negotiation';
        n.rejectReason = null;
      }
    });
    broadcastEvent('project_updated', { dealId: neg.id, projectStatus: 'negotiating' });
    return result;
  }

  /**
   * Cancels a deal before payment (request_sent | negotiating | agreed -> cancelled).
   */
  public cancelBeforePayment(
    dealId: string,
    actorUserId: string,
    reason?: string
  ): { negotiation: Negotiation; event: ProjectEvent } {
    const neg = store.getNegotiation(dealId);
    if (!neg || (neg.buyerUserId !== actorUserId && neg.sellerUserId !== actorUserId)) {
      throw new ProjectTransitionError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
    }
    const isSeller = neg.sellerUserId === actorUserId;
    const cleanReason = (reason || '').trim() || (isSeller ? 'Seller cancelled before payment.' : 'Buyer cancelled before payment.');

    const result = this.transitionStatus({
      dealId,
      actorUserId,
      actorRole: isSeller ? 'seller' : 'buyer',
      toStatus: 'cancelled',
      allowedFrom: ['request_sent', 'negotiating', 'agreed'],
      summary: isSeller
        ? 'Seller cancelled the deal before payment.'
        : 'Buyer cancelled the deal before payment.',
      reason: cleanReason,
      mutate: (n, now) => {
        n.status = 'CANCELLED';
        n.cancelledAt = now;
      }
    });

    const otherUserId = isSeller ? neg.buyerUserId : neg.sellerUserId;
    if (otherUserId) {
      store.addNotification({
        userId: otherUserId,
        title: 'Project cancelled',
        message: isSeller
          ? 'The seller cancelled this agreement before payment. No payment was taken.'
          : 'The buyer cancelled this project before payment.',
        type: 'system',
        linkUrl: `/app/projects/${neg.id}`
      });
    }
    broadcastEvent('project_updated', { dealId: neg.id, projectStatus: 'cancelled' });
    return result;
  }

  /**
   * Atomic money invariant reservation inside SQLite BEGIN IMMEDIATE lock.
   * Ensures refunded_cents + paid_out_cents <= captured_cents NEVER fails, even under concurrent calls.
   */
  public assertMoneyInvariantLocked(
    dealId: string,
    delta: { additionalRefundCents?: number; additionalPayoutCents?: number; additionalFeeRefundCents?: number }
  ): MoneyState {
    const state = store.getMoneyState(dealId);
    const nextRefunded = state.refundedCents + (delta.additionalRefundCents || 0);
    const nextPaidOut = state.paidOutCents + (delta.additionalPayoutCents || 0);
    if (nextRefunded + nextPaidOut > state.capturedCents) {
      throw new ProjectTransitionError(
        409,
        'MONEY_INVARIANT_VIOLATION',
        'Funds have already been settled or refunded; cannot exceed captured amount.'
      );
    }
    return state;
  }

  /**
   * Computes exact prorated platform fee refund in integer cents on full or partial refunds.
   * Full refund returns full platform fee; partial refund prorates fee proportionally.
   */
  public computeRefundBreakdown(dealId: string, requestedRefundCents?: number): {
    refundCents: number;
    feeRefundCents: number;
    sellerDeductionCents: number;
    isFullRefund: boolean;
  } {
    const state = this.getMoneyState(dealId);
    const remainingCaptured = Math.max(0, state.capturedCents - state.refundedCents - state.paidOutCents);
    if (remainingCaptured <= 0) {
      throw new ProjectTransitionError(409, 'NOTHING_TO_REFUND', 'No held funds remain to refund on this project.');
    }

    const targetRefund = typeof requestedRefundCents === 'number'
      ? Math.round(requestedRefundCents)
      : remainingCaptured;

    if (targetRefund <= 0 || targetRefund > remainingCaptured) {
      throw new ProjectTransitionError(
        400,
        'INVALID_REFUND_AMOUNT',
        `Refund amount must be between $0.01 and ${centsToDollars(remainingCaptured)}.`
      );
    }

    const isFullRefund = targetRefund === remainingCaptured && state.paidOutCents === 0;
    const feeRefundCents = isFullRefund
      ? state.feeCents
      : Math.min(state.feeCents, Math.round((targetRefund / state.capturedCents) * state.feeCents));
    const sellerDeductionCents = targetRefund - feeRefundCents;

    return { refundCents: targetRefund, feeRefundCents, sellerDeductionCents, isFullRefund };
  }
}

export const projectStateMachine = new ProjectStateMachineService();
