import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ArrowLeft, AlertTriangle, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { ProjectSummary } from '../../types';
import { Card } from '../../components/common/Card';
import { StatusChip, StatusRole } from '../../components/common/StatusChip';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { formatMoney, formatCents, formatDate, formatStatus, formatName, formatDueCountdown } from '../../lib/present';
import { listItemVariants } from '../../lib/motion';

type StageFilter =
  | 'all'
  | 'requests'
  | 'negotiating'
  | 'agreed'
  | 'paid_held'
  | 'in_progress'
  | 'delivered'
  | 'attention'
  | 'completed'
  | 'declined';

function getPrimaryActionLabel(ps: string, isSeller: boolean): string {
  if (isSeller) {
    if (ps === 'request_sent') return 'Review request';
    if (ps === 'paid_held') return 'Start work';
    if (ps === 'in_progress' || ps === 'revision_requested') return 'Deliver work';
    if (ps === 'delivered') return 'Send reminder';
    if (ps === 'disputed') return 'Resolve dispute';
    return 'View project';
  }
  if (ps === 'agreed') return 'Review & pay';
  if (ps === 'delivered') return 'Accept work';
  if (ps === 'disputed') return 'Open dispute';
  return 'Open project';
}

function matchesFilter(p: ProjectSummary, filter: StageFilter): boolean {
  const ps = p.projectStatus || 'negotiating';
  switch (filter) {
    case 'all': return true;
    case 'requests': return ps === 'request_sent';
    case 'negotiating': return ps === 'negotiating';
    case 'agreed': return ps === 'agreed';
    case 'paid_held': return ps === 'paid_held';
    case 'in_progress': return ps === 'in_progress' || ps === 'revision_requested';
    case 'delivered': return ps === 'delivered';
    case 'attention': return ps === 'disputed' || ps === 'revision_requested' || Boolean(p.cancellationRequest?.status === 'pending') || Boolean(p.isOverdue);
    case 'completed': return ['accepted', 'payout_released', 'completed', 'partially_refunded'].includes(ps);
    case 'declined': return ['declined', 'cancelled', 'refunded', 'expired'].includes(ps);
  }
}

export const NegotiationsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { isBuyerWorkspace, isSellerWorkspace } = useAuth();
  const [filter, setFilter] = useState<StageFilter>('all');

  const role = isSellerWorkspace ? 'seller' : 'buyer';
  const isSeller = role === 'seller';

  const { data, isLoading } = useQuery({
    queryKey: ['projects', role],
    queryFn: () => api.getProjects(role),
    refetchInterval: 6000
  });

  const projects = data?.projects || [];
  const sellerCapacity = data?.sellerCapacity || { active: 0, max: 5, isFull: false };
  const hasDisputes = projects.some(p => p.projectStatus === 'disputed');

  const tabs: Array<{ id: StageFilter; label: string }> = isSeller
    ? [
        { id: 'all', label: 'All' },
        { id: 'requests', label: 'New requests' },
        { id: 'negotiating', label: 'Negotiating' },
        { id: 'agreed', label: 'Waiting for payment' },
        { id: 'paid_held', label: 'Paid, held' },
        { id: 'in_progress', label: 'In progress' },
        { id: 'delivered', label: 'Delivered' },
        { id: 'attention', label: 'Needs attention' },
        { id: 'completed', label: 'Completed' },
        { id: 'declined', label: 'Declined' }
      ]
    : [
        { id: 'all', label: 'All' },
        { id: 'requests', label: 'Waiting for reply' },
        { id: 'negotiating', label: 'Negotiating' },
        { id: 'agreed', label: 'Ready to pay' },
        { id: 'paid_held', label: 'Paid, held' },
        { id: 'in_progress', label: 'In progress' },
        { id: 'delivered', label: 'Delivered' },
        { id: 'attention', label: 'Needs attention' },
        { id: 'completed', label: 'Completed' },
        { id: 'declined', label: 'Declined' }
      ];

  const filtered = projects.filter(p => matchesFilter(p, filter));

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4 flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate('/app')}
          className="inline-flex items-center gap-1.5 text-secondary text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Today</span>
        </button>
        {hasDisputes && (
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ShieldAlert className="w-3.5 h-3.5 text-status-needs" />}
            onClick={() => navigate('/app/disputes')}
          >
            Resolve disputes
          </Button>
        )}
      </div>

      {/* Header + Seller Capacity Meter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div className="flex flex-col gap-1">
          <h1 className="font-display font-bold text-[28px] text-text-primary tracking-tight">
            Projects
          </h1>
          <p className="text-secondary text-text-muted">
            {isSeller
              ? 'Manage incoming requests, active client deliverables, and protected payouts.'
              : 'Track negotiations, escrow-protected deliverables, and completed work.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isSeller && (
            <div className="px-3.5 py-2 rounded-control bg-surface border border-border-subtle flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-secondary text-text-muted">Capacity</span>
                <span className="text-secondary font-semibold text-text-primary">
                  {sellerCapacity.active} of {sellerCapacity.max} in progress
                </span>
              </div>
              {sellerCapacity.isFull && (
                <StatusChip label="At capacity" role="needsYou" size="sm" />
              )}
            </div>
          )}
          <Button
            variant="volt"
            size="sm"
            onClick={() => navigate(isBuyerWorkspace ? '/app/requests/new' : '/app/listings/new')}
          >
            {isBuyerWorkspace ? 'New request' : 'New listing'}
          </Button>
        </div>
      </div>

      {/* Stage Filter Tabs with Live Counts */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {tabs.map((t) => {
          const count = projects.filter(p => matchesFilter(p, t.id)).length;
          if (t.id !== 'all' && count === 0) return null;
          const active = filter === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilter(t.id)}
              className={`px-3 py-1.5 rounded-control text-secondary font-medium transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                active
                  ? 'bg-volt text-[#0C0E0D] font-bold'
                  : 'bg-surface border border-border-subtle text-text-muted hover:text-text-primary'
              }`}
            >
              <span>{t.label}</span>
              <span className={`px-1.5 rounded-chip text-secondary ${active ? 'bg-black/15 text-[#0C0E0D]' : 'bg-raised text-text-muted'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Projects List */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-card bg-surface border border-border-subtle opacity-70" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No projects in this view"
          description={isBuyerWorkspace
            ? 'Start by describing what you need — AI agents negotiate and track the project here.'
            : 'Publish a listing or accept an incoming buyer request to start your first project.'}
          actionLabel={isBuyerWorkspace ? 'Post a request' : 'Go to Listings'}
          onAction={() => navigate(isBuyerWorkspace ? '/app/requests/new' : '/app/listings')}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((p, index) => {
            const ps = p.projectStatus || 'negotiating';
            const statusRaw = formatStatus(ps);
            const roleMap: Record<string, StatusRole> = {
              handled: 'handled',
              needs_you: 'needsYou',
              declined: 'declined',
              in_progress: 'inProgress'
            };
            const chipRole = roleMap[statusRaw.role] || 'inProgress';
            const title = p.request?.title || 'Commercial Project';
            const counterpartName = isSeller
              ? (p.buyerAgent?.name ? formatName(p.buyerAgent.name) : 'Buyer')
              : (p.sellerAgent?.businessName ? formatName(p.sellerAgent.businessName) : 'Verified Seller');
            const latestPrice = p.agreement?.finalPrice || p.currentProposal?.price || 0;
            const days = p.agreement?.deliveryDays || p.currentProposal?.deliveryDays || p.request?.deadlineDays || 5;
            const dueCountdown = ['in_progress', 'revision_requested', 'paid_held'].includes(ps) ? formatDueCountdown(p.dueAt) : null;
            const nextLabel = getPrimaryActionLabel(ps, isSeller);

            return (
              <motion.div
                key={p.id}
                {...listItemVariants(false, index)}
              >
                <Card
                  interactive
                  onClick={() => navigate(`/app/projects/${p.id}`)}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                >
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-semibold text-body text-text-primary">
                        {title}
                      </span>
                      <StatusChip label={statusRaw.label} role={chipRole} size="sm" />
                      {dueCountdown && (
                        <span className={`px-2 py-0.5 rounded-chip text-secondary font-medium ${
                          dueCountdown.isOverdue
                            ? 'bg-status-declined/15 text-status-declined'
                            : dueCountdown.isSoon
                            ? 'bg-status-needs/15 text-status-needs'
                            : 'bg-raised text-text-muted'
                        }`}>
                          {dueCountdown.label}
                        </span>
                      )}
                      {p.cancellationRequest?.status === 'pending' && isSeller && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-chip text-secondary font-medium bg-status-needs/15 text-status-needs">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Cancel request</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-secondary text-text-muted flex-wrap">
                      <span>With {counterpartName}</span>
                      <span>·</span>
                      {isSeller && p.feeBreakdown ? (
                        <span className="text-text-primary font-medium">
                          Earn {formatCents(p.feeBreakdown.netSellerCents)} after {formatCents(p.feeBreakdown.feeCents)} fee
                        </span>
                      ) : (
                        <span>{formatMoney(latestPrice)} · {days} days</span>
                      )}
                      <span>·</span>
                      <span>{formatDate(p.updatedAt)}</span>
                    </div>

                    <span className="text-secondary text-text-muted">
                      {p.visibleRejectReason || p.stageMeta?.explanation || statusRaw.explanation}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <Button
                      variant={chipRole === 'needsYou' ? 'volt' : 'secondary'}
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(ps === 'disputed' && isSeller ? '/app/disputes' : `/app/projects/${p.id}`);
                      }}
                    >
                      {nextLabel}
                    </Button>
                    <ChevronRight className="w-4 h-4 text-text-muted" strokeWidth={2} />
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
