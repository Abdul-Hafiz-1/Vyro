import React from 'react';
import { Bot, CheckCircle, Clock, ShieldCheck, Tag, ArrowRight } from 'lucide-react';
import { Agent } from '../../types';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

interface AgentCardProps {
  agent: Agent;
  onSelect: (agent: Agent) => void;
  onInitiate?: (agent: Agent) => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, onSelect, onInitiate }) => {
  const isSeller = agent.type === 'seller';
  const startingPrice = isSeller 
    ? agent.pricingConstraints.startingPrice || agent.catalog[0]?.startingPrice 
    : agent.pricingConstraints.defaultBudget;
  const minPrice = isSeller ? agent.pricingConstraints.minAcceptablePrice || agent.catalog[0]?.minPrice : undefined;

  return (
    <div className="bg-vyro-surface border border-vyro-border rounded-[8px] p-5 flex flex-col justify-between hover:border-vyro-border-light transition-all group hover:shadow-lg">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-[6px] border flex items-center justify-center shrink-0 ${
              isSeller ? 'bg-vyro-card border-vyro-border text-vyro-text' : 'bg-vyro-hover border-vyro-border text-vyro-accent'
            }`}>
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-vyro-text group-hover:text-vyro-accent transition-colors truncate max-w-[180px]">
                  {agent.name}
                </h3>
                {agent.verificationStatus === 'verified' && (
                  <span title="Verified Network Agent">
                    <ShieldCheck className="w-4 h-4 text-vyro-success shrink-0" />
                  </span>
                )}
              </div>
              <p className="text-xs text-vyro-muted font-mono truncate max-w-[200px]">
                {agent.businessName}
              </p>
            </div>
          </div>

          <Badge variant={agent.status === 'active' ? 'success' : 'default'} size="sm" dot>
            {agent.status}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-xs text-vyro-muted line-clamp-2 mb-4 leading-relaxed">
          {agent.description}
        </p>

        {/* Capabilities Pills */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {agent.capabilities.slice(0, 3).map((cap) => (
            <span
              key={cap}
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-vyro-card border border-vyro-border/60 text-vyro-muted"
            >
              {cap}
            </span>
          ))}
          {agent.capabilities.length > 3 && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded text-vyro-subtle">
              +{agent.capabilities.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Bottom Pricing & Actions */}
      <div className="pt-3 border-t border-vyro-border/70 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-mono text-vyro-subtle block">
            {isSeller ? 'Starting Rate' : 'Authorized Budget'}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold font-mono text-vyro-text">
              ${startingPrice || 150}
            </span>
            {minPrice && (
              <span className="text-[10px] font-mono text-vyro-muted">
                (Floor: ${minPrice})
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onSelect(agent)}>
            Profile
          </Button>
          {isSeller && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onInitiate ? onInitiate(agent) : onSelect(agent)}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Negotiate
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
