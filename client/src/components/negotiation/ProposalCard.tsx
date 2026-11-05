import React from 'react';
import { Proposal } from '../../types';
import { Badge } from '../common/Badge';
import { CheckCircle2, Clock, ShieldCheck, DollarSign } from 'lucide-react';

interface ProposalCardProps {
  proposal: Proposal;
  isAgreed?: boolean;
}

export const ProposalCard: React.FC<ProposalCardProps> = ({ proposal, isAgreed = false }) => {
  return (
    <div className={`p-4 rounded-[8px] border transition-all ${
      isAgreed 
        ? 'bg-vyro-success-bg/25 border-vyro-success ring-1 ring-vyro-success/40' 
        : 'bg-vyro-surface border-vyro-border'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-vyro-muted block">
            {isAgreed ? 'Accepted Agreement' : `Round ${proposal.round} Proposal`}
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-bold font-mono text-vyro-text">
              ${proposal.price}
            </span>
            <span className="text-xs font-mono text-vyro-muted">
              {proposal.currency}
            </span>
          </div>
        </div>

        <Badge
          variant={isAgreed || proposal.status === 'accepted' ? 'success' : proposal.status === 'countered' ? 'warning' : 'accent'}
          size="sm"
        >
          {isAgreed ? 'LOCKED IN' : proposal.status.toUpperCase()}
        </Badge>
      </div>

      {/* Meta Specs */}
      <div className="flex items-center gap-4 py-2 border-y border-vyro-border/50 text-xs font-mono text-vyro-muted mb-3">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-vyro-accent" />
          <span>Turnaround: {proposal.deliveryDays} Days</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-vyro-success" />
          <span>Escrow: PayPal Sandbox</span>
        </div>
      </div>

      {/* Deliverables List */}
      <div>
        <span className="text-[10px] font-mono uppercase text-vyro-subtle block mb-1.5">
          Committed Deliverables:
        </span>
        <ul className="space-y-1.5">
          {proposal.deliverables.map((item, idx) => (
            <li key={idx} className="flex items-center gap-2 text-xs text-vyro-text">
              <CheckCircle2 className="w-3.5 h-3.5 text-vyro-success shrink-0" />
              <span className="leading-snug">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {proposal.terms && (
        <p className="mt-3 text-[11px] text-vyro-muted italic border-t border-vyro-border/40 pt-2">
          Terms: {proposal.terms}
        </p>
      )}
    </div>
  );
};
