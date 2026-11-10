import { store } from '../../db/store.js';
import { payoutService } from '../paypal/payoutService.js';
import { broadcastEvent } from '../../routes/events.js';

/**
 * Restart-safe background job that polls SQLite every 60s (or on demand) for delivered
 * projects whose `review_due_at` has elapsed with no open dispute, and auto-accepts +
 * releases the seller payout idempotently.
 */
export class ReviewWindowWorker {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  public start(intervalMs = 60_000): void {
    if (this.timer) return;
    // Run initial check shortly after boot so restarts immediately catch expired windows
    setTimeout(() => {
      this.tick().catch((err) => console.error('[ReviewWindowWorker] boot tick error:', err.message));
    }, 1500);

    this.timer = setInterval(() => {
      this.tick().catch((err) => console.error('[ReviewWindowWorker] tick error:', err.message));
    }, intervalMs);
    this.timer.unref?.();
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public async tick(options?: { providerOverride?: 'paypal' | 'simulated' }): Promise<{ processedIds: string[] }> {
    if (this.running) return { processedIds: [] };
    this.running = true;
    const processedIds: string[] = [];

    try {
      const dueProjects = store.getDeliveredPastReviewDue();
      for (const neg of dueProjects) {
        try {
          if (neg.projectStatus !== 'delivered') continue;
          const dispute = store.getDisputeByDeal(neg.id);
          if (dispute && (dispute.status === 'open' || dispute.status === 'responded')) {
            continue;
          }

          await payoutService.acceptWorkAndReleasePayout(neg.id, 'system', {
            bypassActorCheck: true,
            requireDelivered: true,
            providerOverride: options?.providerOverride
          });

          if (neg.buyerUserId) {
            store.addNotification({
              userId: neg.buyerUserId,
              title: 'Review window ended — work auto-accepted',
              message: 'The delivery review window ended with no changes requested, so payment was released to the seller.',
              type: 'payout_released',
              linkUrl: `/app/projects/${neg.id}`
            });
          }
          processedIds.push(neg.id);
          broadcastEvent('project_updated', { dealId: neg.id, projectStatus: 'completed' });
        } catch (err: any) {
          console.error(`[ReviewWindowWorker] Error auto-accepting ${neg.id}:`, err?.message || err);
        }
      }
    } finally {
      this.running = false;
    }

    return { processedIds };
  }
}

export const reviewWindowWorker = new ReviewWindowWorker();
