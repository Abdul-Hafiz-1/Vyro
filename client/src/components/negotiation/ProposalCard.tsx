import React from 'react';
import { Proposal } from '../../types';
import { Badge } from '../common/Badge';
import { CheckCircle2, Clock, ShieldCheck, DollarSign, RefreshCw, Sparkles, HelpCircle, Tag, Gauge } from 'lucide-react';

interface ProposalCardProps {
  proposal: Proposal;
  isAgreed?: boolean;
}

export const ProposalCard: React.FC<ProposalCardProps> = ({ proposal, isAgreed = false }) => {
  return (
    <div
      className={`p-4 rounded-[8px] border transition-all shadow-xs space-y-3.5 ${
        isAgreed
          ? 'bg-vyro-surface border-emerald-500/40 text-vyro-text'
          : 'bg-vyro-surface border-vyro-border text-vyro-text'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-vyro-subtle block">
            {isAgreed ? 'Mutual Consensus Agreement' : `Round ${proposal.round} Multi-Issue Package`}
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono tracking-tight text-vyro-text">
              ${proposal.price}
            </span>
            <span className="text-xs font-mono text-vyro-muted">
              {proposal.currency}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <Badge
            variant={isAgreed || proposal.status === 'accepted' ? 'success' : proposal.status === 'countered' ? 'warning' : 'accent'}
            size="sm"
          >
            {isAgreed ? 'LOCKED IN' : proposal.status.toUpperCase()}
          </Badge>
          {proposal.utilityScore !== undefined && (
            <span className="text-[10px] font-mono text-vyro-accent flex items-center gap-1 bg-vyro-accent/10 px-2 py-0.5 rounded border border-vyro-accent/20">
              <Gauge className="w-3 h-3" />
              <span>Utility: {Math.round(proposal.utilityScore * 100)}%</span>
            </span>
          )}
        </div>
      </div>

      {/* Package Specs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2.5 border-y border-vyro-border/60 text-xs font-mono text-vyro-muted">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>{proposal.deliveryDays}d Delivery</span>
        </div>
        <div className="flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5 text-vyro-accent shrink-0" />
          <span>{proposal.revisions || 2} Revisions</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">{proposal.paymentTerms === 'upfront' ? 'Upfront' : 'Escrow'}</span>
        </div>
      </div>

      {/* Trades Made / Concessions */}
      {proposal.tradesMade && proposal.tradesMade.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono uppercase text-vyro-subtle flex items-center gap-1">
            <Tag className="w-3 h-3 text-vyro-accent" /> Package Trades:
          </span>
          <div className="flex flex-wrap gap-1">
            {proposal.tradesMade.map((trade, tIdx) => (
              <span
                key={tIdx}
                className="text-[10px] font-mono px-2 py-0.5 rounded bg-vyro-card border border-vyro-border text-vyro-muted"
              >
                {trade}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Deliverables List */}
      <div>
        <span className="text-[10px] font-mono uppercase text-vyro-subtle block mb-1.5">
          Included Scope Deliverables ({proposal.deliverables.length}):
        </span>
        <ul className="space-y-1.5">
          {proposal.deliverables.map((item, idx) => (
            <li key={idx} className="flex items-center gap-2 text-xs text-vyro-text">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="leading-snug">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* "Why This Offer" Rationale */}
      {proposal.whyThisOffer && (
        <div className="p-2.5 rounded-[6px] bg-vyro-bg border border-vyro-border/60 text-[11px] font-mono text-vyro-muted flex items-start gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-vyro-accent shrink-0 mt-0.5" />
          <span>Why this offer: {proposal.whyThisOffer}</span>
        </div>
      )}

      {proposal.terms && (
        <p className="text-[11px] text-vyro-subtle border-t border-vyro-border/60 pt-2 font-mono leading-relaxed">
          Contract Policy: {proposal.terms}
        </p>
      )}
    </div>
  );
};
