import React from 'react';
import { 
  Bot, 
  ShieldCheck, 
  ArrowRight, 
  Star, 
  Sparkles, 
  MessageSquare, 
  Clock
} from 'lucide-react';
import { Agent } from '../../types';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';

interface AgentCardProps {
  agent: Agent;
  onSelect: (agent: Agent) => void;
  onInitiate?: (agent: Agent) => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, onSelect, onInitiate }) => {
  const { user, isBuyerWorkspace: isBuyer } = useAuth();
  const isOwnAgent = user?.id === agent.ownerId;

  const isSeller = agent.type === 'seller';
  const primaryCatalogItem = agent.catalog?.[0];
  const startingPrice = isSeller 
    ? agent.pricingConstraints.startingPrice || primaryCatalogItem?.startingPrice || 150
    : agent.pricingConstraints.defaultBudget || 150;
  const deliveryDays = primaryCatalogItem?.deliveryDays || (agent.id.includes('northstar') ? 4 : agent.id.includes('kira') ? 4 : 5);

  const isBusy = (agent.activeProjects ?? 0) >= (agent.maxConcurrentProjects ?? 3);
  const isNewcomer = agent.isNewTalent || !agent.reviewCount || agent.reviewCount === 0;

  return (
    <div 
      onClick={() => onSelect(agent)}
      className="group relative bg-vyro-surface/70 hover:bg-vyro-surface border border-vyro-border/70 hover:border-vyro-border-light rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer backdrop-blur-sm"
    >
      <div>
        {/* Top Header: Identity & Status */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3.5">
            {agent.operatorAvatar ? (
              <div className="relative shrink-0">
                <img
                  src={agent.operatorAvatar}
                  alt={agent.operatorName || agent.name}
                  className="w-11 h-11 rounded-xl object-cover ring-1 ring-vyro-border shadow-sm group-hover:ring-vyro-accent/40 transition-all"
                />
                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-vyro-surface ${
                  isBusy ? 'bg-amber-400' : 'bg-emerald-400'
                }`} />
              </div>
            ) : (
              <div className="w-11 h-11 rounded-xl border border-vyro-border bg-vyro-card flex items-center justify-center text-vyro-accent shrink-0">
                <Bot className="w-5 h-5" />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold text-vyro-text tracking-tight group-hover:text-vyro-accent transition-colors truncate">
                  {agent.operatorName || agent.name}
                </h3>
                <ShieldCheck className="w-3.5 h-3.5 text-vyro-accent shrink-0" />
              </div>
              <p className="text-xs text-vyro-muted truncate">
                {agent.businessName}
              </p>
            </div>
          </div>

          {/* Turnaround / Availability Pill */}
          <div className="flex items-center gap-1 text-[11px] font-mono text-vyro-muted bg-vyro-card/80 px-2.5 py-1 rounded-full border border-vyro-border/50 shrink-0">
            <Clock className="w-3 h-3 text-vyro-subtle" />
            <span>{deliveryDays}d turnaround</span>
          </div>
        </div>

        {/* Reputation & Trust Line */}
        <div className="flex items-center gap-3 text-xs text-vyro-muted mb-3 font-mono">
          {isNewcomer ? (
            <div className="flex items-center gap-1.5 text-amber-400 font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Rising Talent</span>
              {agent.aiReviewed && (
                <span className="text-vyro-muted font-normal">· AI Audited</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-vyro-text font-medium">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{agent.rating?.toFixed(1) || '4.9'}</span>
              <span className="text-vyro-muted font-normal">({agent.reviewCount})</span>
            </div>
          )}

          {agent.replyPoints !== undefined && (
            <>
              <span className="text-vyro-subtle">·</span>
              <div className="flex items-center gap-1 text-vyro-muted">
                <MessageSquare className="w-3 h-3 text-vyro-subtle" />
                <span>{agent.replyPoints} pts</span>
              </div>
            </>
          )}

          {isOwnAgent && (
            <span className="ml-auto text-[10px] font-mono font-bold text-vyro-accent bg-vyro-accent/10 px-2 py-0.5 rounded">
              Your Studio
            </span>
          )}
        </div>

        {/* Service Headline & Excerpt */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-vyro-text leading-snug tracking-tight mb-1 line-clamp-1 group-hover:text-vyro-accent transition-colors">
            {primaryCatalogItem?.name || agent.description}
          </h4>
          <p className="text-xs text-vyro-muted line-clamp-2 leading-relaxed">
            {primaryCatalogItem?.description || agent.description}
          </p>
        </div>

        {/* Capabilities Chips */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {agent.capabilities.slice(0, 3).map((cap) => (
            <span
              key={cap}
              className="text-[11px] font-mono px-2.5 py-0.5 rounded-md bg-vyro-card/60 text-vyro-muted border border-vyro-border/40"
            >
              {cap}
            </span>
          ))}
        </div>
      </div>

      {/* Card Footer: Transparent Pricing & Clear Action */}
      <div 
        className="pt-4 mt-4 border-t border-vyro-border/50 flex items-center justify-between gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <span className="text-[10px] uppercase font-mono tracking-wider text-vyro-subtle block">
            {isSeller ? 'Starting rate' : 'Budget'}
          </span>
          <div className="text-base font-semibold font-mono text-vyro-text">
            ${startingPrice}
            <span className="text-xs font-normal text-vyro-muted font-sans ml-1">USD</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOwnAgent ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelect(agent)}
              className="text-xs h-8 px-3 rounded-lg"
            >
              Manage Studio
            </Button>
          ) : isSeller && isBuyer ? (
            <Button
              variant="accent"
              size="sm"
              onClick={() => onInitiate ? onInitiate(agent) : onSelect(agent)}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="text-xs h-8 px-3.5 rounded-lg shadow-sm font-medium"
            >
              Hire Agent
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelect(agent)}
              className="text-xs h-8 px-3 rounded-lg"
            >
              Inspect
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
