import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ArrowLeft, Clock, Plus, ShieldCheck, ChevronRight } from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { StatusChip, StatusRole } from '../../components/common/StatusChip';
import { EmptyState } from '../../components/common/EmptyState';
import { Avatar } from '../../components/common/Avatar';
import { useAuth } from '../../context/AuthContext';
import { formatMoney, formatStatus, formatName, formatDate } from '../../lib/present';

export const NegotiationsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { isBuyerWorkspace: isBuyer } = useAuth();
  const [activeFilter, setActiveFilter] = useState<'all' | 'needs_you' | 'in_progress' | 'handled'>('all');

  const { data: negotiations = [], isLoading } = useQuery({
    queryKey: ['negotiationsList'],
    queryFn: () => api.getNegotiations(),
    refetchInterval: 6000
  });

  // Group deals into Linear-style sections
  const needsYouDeals = negotiations.filter(
    (n) => (n.status as string) === 'escalated' || (n.status as string) === 'needs_review'
  );
  const inProgressDeals = negotiations.filter(
    (n) => n.status === 'in_negotiation' || (n.status as string) === 'initiated' || n.status === 'agreement_reached'
  );
  const handledDeals = negotiations.filter(
    (n) =>
      n.status === 'completed' ||
      (n.status as string) === 'COMPLETED' ||
      (n.status as string) === 'accepted' ||
      n.status === 'declined' ||
      (n.status as string) === 'auto_declined'
  );

  const getFilteredGroups = () => {
    if (activeFilter === 'needs_you') {
      return [{ title: 'Needs your decision', items: needsYouDeals, emptyMessage: 'Nothing currently requires your decision.' }];
    }
    if (activeFilter === 'in_progress') {
      return [{ title: 'In progress', items: inProgressDeals, emptyMessage: 'No negotiations currently in progress.' }];
    }
    if (activeFilter === 'handled') {
      return [{ title: 'Handled & completed', items: handledDeals, emptyMessage: 'No completed deals yet.' }];
    }
    return [
      { title: 'Needs your decision', items: needsYouDeals, emptyMessage: '' },
      { title: 'In progress', items: inProgressDeals, emptyMessage: '' },
      { title: 'Handled & completed', items: handledDeals, emptyMessage: '' }
    ];
  };

  const statusRoleMap: Record<string, StatusRole> = {
    handled: 'handled',
    needs_you: 'needsYou',
    declined: 'declined',
    in_progress: 'inProgress'
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4 flex flex-col gap-6">
      {/* Way back (Breadcrumb) */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/app')}
          className="inline-flex items-center gap-1.5 text-secondary text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Today</span>
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display font-bold text-[28px] text-text-primary tracking-tight">
              Deals
            </h1>
            <span className="text-secondary px-2.5 py-0.5 rounded-control bg-raised border border-border-subtle text-text-muted">
              {negotiations.length} total
            </span>
          </div>
          <p className="text-secondary text-text-muted">
            {isBuyer
              ? 'Autonomous negotiation channels with sellers. Review terms, approve deals, and track settlement.'
              : 'Incoming requests where your seller agent negotiates scope and pricing within your authorized rules.'}
          </p>
        </div>

        <Button
          variant="volt"
          size="md"
          onClick={() => navigate(isBuyer ? '/app/requests/new' : '/app/listings/new')}
          leftIcon={<Plus className="w-4 h-4" strokeWidth={2} />}
        >
          {isBuyer ? 'New request' : 'Create listing'}
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'all', label: 'All deals' },
          { key: 'needs_you', label: `Needs decision (${needsYouDeals.length})` },
          { key: 'in_progress', label: `In progress (${inProgressDeals.length})` },
          { key: 'handled', label: `Handled (${handledDeals.length})` }
        ].map((tab) => {
          const isSelected = activeFilter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveFilter(tab.key as any)}
              className={`px-4 py-2 rounded-control text-secondary font-medium transition-colors cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-volt text-[#0C0E0D] font-bold'
                  : 'bg-surface border border-border-subtle text-text-muted hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Deals Groups (Linear style) */}
      {isLoading ? (
        <div className="flex flex-col gap-4 animate-pulse">
          <div className="h-20 bg-surface rounded-control border border-border-subtle" />
          <div className="h-20 bg-surface rounded-control border border-border-subtle" />
          <div className="h-20 bg-surface rounded-control border border-border-subtle" />
        </div>
      ) : negotiations.length === 0 ? (
        <EmptyState
          title="No deals formed yet"
          description={
            isBuyer
              ? 'Start a new request to let your buyer agent find matching sellers and negotiate the best price.'
              : 'Create a listing or wait for buyer agents to discover your services.'
          }
          actionLabel={isBuyer ? 'Start a request' : 'Create listing'}
          onAction={() => navigate(isBuyer ? '/app/requests/new' : '/app/listings/new')}
        />
      ) : (
        <div className="flex flex-col gap-8">
          {getFilteredGroups().map((group) => {
            if (activeFilter === 'all' && group.items.length === 0) return null;

            return (
              <div key={group.title} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-secondary font-semibold text-text-primary">
                    {group.title}
                  </span>
                  <span className="text-secondary text-text-muted">
                    {group.items.length} {group.items.length === 1 ? 'deal' : 'deals'}
                  </span>
                </div>

                {group.items.length === 0 ? (
                  <div className="p-6 bg-surface border border-border-subtle rounded-surface text-center text-secondary text-text-muted">
                    {group.emptyMessage}
                  </div>
                ) : (
                  <div className="bg-surface border border-border-subtle rounded-surface divide-y divide-border-subtle overflow-hidden">
                    {group.items.map((deal: any) => {
                      const counterpart = deal.sellerAgent?.businessName || deal.sellerName || 'Verified Seller';
                      const title = deal.request?.title || deal.title || 'Commercial Project';
                      const price = deal.agreement?.finalPrice || deal.currentProposal?.price || 150;
                      const days = deal.agreement?.deliveryDays || deal.currentProposal?.deliveryDays || deal.request?.deadlineDays || 5;
                      const statusRaw = formatStatus(deal.status);
                      const statusRole = statusRoleMap[statusRaw.role] || 'inProgress';

                      return (
                        <div
                          key={deal.id}
                          onClick={() => navigate(`/app/deals/${deal.id}`)}
                          className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-raised transition-colors cursor-pointer group"
                        >
                          {/* Left: Avatar + Title & Counterpart */}
                          <div className="flex items-center gap-3.5 min-w-0">
                            <Avatar name={formatName(counterpart)} size="md" />
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-body text-text-primary group-hover:text-volt transition-colors truncate">
                                {title}
                              </span>
                              <div className="flex items-center gap-2 text-secondary text-text-muted mt-0.5">
                                <span>With {formatName(counterpart)}</span>
                                <span>·</span>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-text-muted" strokeWidth={2} />
                                  <span>{days}&nbsp;days</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Right: Price + Status + Chevron */}
                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              <span className="font-display font-bold text-[18px] text-text-primary block">
                                {formatMoney(price)}
                              </span>
                              {deal.updatedAt && (
                                <span className="text-secondary text-text-muted block">
                                  {formatDate(deal.updatedAt)}
                                </span>
                              )}
                            </div>

                            <StatusChip
                              label={statusRaw.label}
                              role={statusRole}
                              size="sm"
                            />

                            <ChevronRight
                              className="w-5 h-5 text-text-muted group-hover:text-text-primary transition-colors hidden sm:block"
                              strokeWidth={2}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};