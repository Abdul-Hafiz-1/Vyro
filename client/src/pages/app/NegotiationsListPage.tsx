import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Scale, ArrowRight, Clock, Plus, Store, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';

export const NegotiationsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { isBuyerWorkspace: isBuyer } = useAuth();
  const [filter, setFilter] = useState<string>('all');

  const { data: negotiations = [], isLoading } = useQuery({
    queryKey: ['negotiationsList'],
    queryFn: () => api.getNegotiations(),
    refetchInterval: 6000
  });

  const filtered = negotiations.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'review') return n.status === 'escalated';
    if (filter === 'active') return n.status === 'in_negotiation' || n.status === 'initiated';
    if (filter === 'agreed') return n.status === 'agreement_reached' || n.status === 'accepted';
    if (filter === 'completed') return (n.status as string) === 'completed' || (n.status as string) === 'COMPLETED';
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'escalated':
        return <Badge variant="warning" size="sm" dot>Needs Your Review</Badge>;
      case 'in_negotiation':
      case 'initiated':
        return <Badge variant="accent" size="sm" dot>Negotiating</Badge>;
      case 'agreement_reached':
      case 'accepted':
        return <Badge variant="success" size="sm" dot>Agreement Reached</Badge>;
      case 'completed':
      case 'COMPLETED':
        return <Badge variant="success" size="sm">Settled & Paid</Badge>;
      case 'declined':
        return <Badge variant="error" size="sm">Declined</Badge>;
      default:
        return <Badge variant="default" size="sm">{status.replace(/_/g, ' ')}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-vyro-line gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-vyro-text tracking-tight">
              Deals
            </h1>
            <Badge variant="default" size="sm">{filtered.length} Total</Badge>
          </div>
          <p className="text-xs text-vyro-muted">
            {isBuyer 
              ? 'Autonomous bargaining channels with sellers. Review packages, approve terms, and track settlement.'
              : 'Incoming client procurement briefs. Your seller agent negotiates turnaround, pricing, and scope within your rules.'
            }
          </p>
        </div>

        {isBuyer ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/app/requests/new')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Post a Request
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/app/listings/new')}
            leftIcon={<Store className="w-4 h-4" />}
          >
            Create a Listing
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-vyro-line pb-2 text-xs font-mono overflow-x-auto">
        {[
          { key: 'all', label: 'All Deals' },
          { key: 'review', label: 'Needs Review' },
          { key: 'active', label: 'In Negotiation' },
          { key: 'agreed', label: 'Agreement Reached' },
          { key: 'completed', label: 'Settled & Paid' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-control transition-colors cursor-pointer text-xs ${
              filter === tab.key
                ? 'bg-vyro-surface border border-vyro-line text-vyro-text font-semibold shadow-xs'
                : 'text-vyro-muted hover:text-vyro-text hover:bg-vyro-surface/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Negotiations List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-control bg-vyro-surface border border-vyro-line animate-pulse" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((neg) => {
            const price = neg.currentProposal?.price || 150;
            const deliveryDays = neg.currentProposal?.deliveryDays || 5;

            return (
              <div
                key={neg.id}
                onClick={() => navigate(`/app/deals/${neg.id}`)}
                className="p-4 rounded-control bg-vyro-surface border border-vyro-line hover:border-vyro-accent/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group shadow-xs"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(neg.status)}
                    <span className="text-xs text-vyro-muted">
                      Round {neg.currentRound} of {neg.maxRounds}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-vyro-text group-hover:text-vyro-accent transition-colors truncate">
                    {neg.currentProposal?.whyThisOffer || 'Commercial Service Package'}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-vyro-muted">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {deliveryDays} Business Days
                    </span>
                    <span>·</span>
                    <span>
                      {isBuyer ? 'Counterparty Seller' : 'Client Buyer'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
                  <div className="text-right">
                    <span className="text-base font-bold text-vyro-text block tabular-nums">
                      ${price} USD
                    </span>
                    <span className="text-xs text-vyro-muted">
                      Agreed Package
                    </span>
                  </div>

                  <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                    Open Cockpit
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center text-xs text-vyro-muted bg-vyro-surface rounded-control border border-vyro-line space-y-3 p-6">
          <Scale className="w-8 h-8 text-vyro-muted mx-auto mb-1" />
          <h3 className="text-sm font-semibold text-vyro-text">
            {filter === 'all' ? 'No deals yet' : `No deals in "${filter.replace(/_/g, ' ')}"`}
          </h3>
          <p className="max-w-sm mx-auto text-xs text-vyro-muted">
            {isBuyer 
              ? 'Post a request describing what you need. Your buyer agent will match with suppliers and negotiate automatically.'
              : 'Create a listing with your standard price and confidential floor to receive proposals.'}
          </p>
          <div className="pt-2">
            {isBuyer ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/app/requests/new')}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Post Your First Request
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/app/listings/new')}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Create Your First Listing
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
