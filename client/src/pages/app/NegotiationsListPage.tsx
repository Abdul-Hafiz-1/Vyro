import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Scale, ArrowRight, Bot, Clock, DollarSign, Plus } from 'lucide-react';
import { api } from '../../api/client';
import { Negotiation } from '../../types';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';

export const NegotiationsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isBuyerWorkspace: isBuyer } = useAuth();
  const [filter, setFilter] = useState<string>('all');

  const { data: negotiations = [], isLoading } = useQuery({
    queryKey: ['negotiationsList'],
    queryFn: () => api.getNegotiations(),
    refetchInterval: 6000
  });

  const filtered = negotiations.filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'active') return n.status === 'in_negotiation' || n.status === 'initiated';
    if (filter === 'agreed') return n.status === 'agreement_reached';
    if (filter === 'completed') return (n.status as string) === 'completed' || (n.status as string) === 'COMPLETED';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-vyro-border gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-vyro-text tracking-tight">
              {isBuyer ? 'Procurement Channels' : 'Client Negotiation Desks'}
            </h1>
            <Badge variant={isBuyer ? 'accent' : 'success'} size="sm">{filtered.length} Channels</Badge>
          </div>
          <p className="text-xs text-vyro-muted">
            {isBuyer 
              ? 'Autonomous dialogues with third-party sellers across the network. Inspect price floors, delivery SLAs, and evaluator picks.'
              : `Incoming client project briefs received by ${user?.sellerProfile?.businessName || user?.displayName || 'your studio'}. Autonomous counteroffers, capacity checks, and client terms.`
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
            New Procurement
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/app/network')}
            leftIcon={<Bot className="w-4 h-4 text-vyro-success" />}
          >
            Marketplace Registry
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-vyro-border pb-2 text-xs font-mono">
        {[
          { key: 'all', label: 'All Negotiations' },
          { key: 'active', label: 'Active Dialogues' },
          { key: 'agreed', label: 'Consensus Formed' },
          { key: 'completed', label: 'Settled & Paid' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded uppercase tracking-wider transition-colors ${
              filter === tab.key
                ? 'bg-vyro-surface border border-vyro-accent text-vyro-text font-bold'
                : 'text-vyro-muted hover:text-vyro-text'
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
            <div key={i} className="h-24 rounded-[8px] bg-vyro-surface border border-vyro-border animate-pulse" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((neg) => {
            const isAgreed = neg.status === 'agreement_reached' || (neg.status as string) === 'completed' || (neg.status as string) === 'COMPLETED';

            return (
              <div
                key={neg.id}
                onClick={() => navigate(`/app/negotiations/${neg.id}`)}
                className={`p-5 rounded-[8px] border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isAgreed
                    ? 'bg-vyro-surface border-vyro-border hover:border-vyro-success/50'
                    : 'bg-vyro-surface border-vyro-border hover:border-vyro-accent/50'
                }`}
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className={`w-10 h-10 rounded-[6px] border flex items-center justify-center shrink-0 ${
                    isAgreed ? 'bg-vyro-success-bg/20 border-vyro-success text-vyro-success' : 'bg-vyro-card border-vyro-border text-vyro-accent'
                  }`}>
                    <Scale className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold font-mono text-vyro-text">{neg.id}</h3>
                      <Badge
                        variant={
                          ((neg.status as string) === 'completed' || (neg.status as string) === 'COMPLETED') ? 'success' :
                          neg.status === 'agreement_reached' ? 'warning' :
                          neg.status === 'in_negotiation' ? 'accent' : 'default'
                        }
                        size="sm"
                      >
                        {neg.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 text-xs text-vyro-muted font-mono">
                      <span>Rounds: {neg.currentRound}/{neg.maxRounds}</span>
                      <span>•</span>
                      <span>{neg.messages.length} Structured Messages</span>
                      <span>•</span>
                      <span className="text-vyro-subtle">
                        Updated {new Date(neg.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
                  <div className="text-right font-mono">
                    <span className="text-base font-bold text-vyro-text block">
                      ${neg.currentProposal?.price || 150}
                    </span>
                    <span className="text-[10px] text-vyro-muted">
                      {neg.currentProposal?.deliveryDays || 5}d Delivery
                    </span>
                  </div>

                  <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                    Inspect
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center text-xs text-vyro-muted bg-vyro-surface rounded-[8px] border border-vyro-border">
          <Scale className="w-8 h-8 text-vyro-subtle mx-auto mb-2" />
          <p>No negotiations found in this filter.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => navigate('/app/requests/new')}
          >
            Create New Request
          </Button>
        </div>
      )}
    </div>
  );
};
