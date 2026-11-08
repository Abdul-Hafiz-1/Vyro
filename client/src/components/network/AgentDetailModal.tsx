import React from 'react';
import { Bot, ShieldCheck, CheckCircle2, Clock, DollarSign, ArrowRight, Zap, Scale, UserCheck, HeartHandshake } from 'lucide-react';
import { Agent } from '../../types';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

interface AgentDetailModalProps {
  agent: Agent | null;
  isOpen: boolean;
  onClose: () => void;
  onInitiateRequest: (agent: Agent) => void;
}

export const AgentDetailModal: React.FC<AgentDetailModalProps> = ({
  agent,
  isOpen,
  onClose,
  onInitiateRequest
}) => {
  if (!agent) return null;

  const isSeller = agent.type === 'seller';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={agent.name}
      description={`${agent.businessName} • ${agent.category}`}
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Human Operator & Creator Covenant */}
        {agent.operatorName && (
          <div className="p-4 rounded-[8px] bg-vyro-surface border border-vyro-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <img
                src={agent.operatorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
                alt={agent.operatorName}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-vyro-accent/40 shrink-0"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-vyro-text">{agent.operatorName}</h4>
                  <Badge variant="success" size="sm">
                    <UserCheck className="w-3 h-3 mr-1" /> Verified Operator
                  </Badge>
                </div>
                <p className="text-xs text-vyro-muted">{agent.operatorRole} • {agent.operatorLocation}</p>
                {agent.craftPhilosophy && (
                  <p className="text-[11px] text-vyro-muted/90 italic mt-1.5 border-l-2 border-vyro-accent/50 pl-2">
                    "{agent.craftPhilosophy}"
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Profile Card Header */}
        <div className="p-4 rounded-[8px] bg-vyro-card border border-vyro-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[6px] bg-vyro-surface border border-vyro-border flex items-center justify-center text-vyro-accent shrink-0">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-semibold text-vyro-text">{agent.businessName}</h4>
                {agent.verificationStatus === 'verified' && (
                  <Badge variant="success" size="sm">
                    <ShieldCheck className="w-3 h-3 mr-1" /> Verified Network Entity
                  </Badge>
                )}
              </div>
              <p className="text-xs text-vyro-muted mt-0.5">{agent.description}</p>
            </div>
          </div>

          <div className="flex sm:flex-col items-end gap-1">
            <span className="text-[10px] uppercase font-mono text-vyro-subtle">Network Status</span>
            <Badge variant={agent.status === 'active' ? 'success' : 'default'} size="sm" dot>
              {agent.status.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Technical Specs & Constraints */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-[6px] bg-vyro-card border border-vyro-border">
            <span className="text-[10px] font-mono uppercase text-vyro-subtle flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-vyro-accent" /> Pricing Bounds
            </span>
            <div className="mt-1">
              <div className="text-sm font-bold font-mono text-vyro-text">
                {isSeller ? `$${agent.pricingConstraints.startingPrice || 180}` : `Max $${agent.pricingConstraints.maxBudget || 200}`}
              </div>
              {isSeller && (
                <div className="text-[10px] font-mono text-vyro-muted">
                  Minimum Floor: ${agent.pricingConstraints.minAcceptablePrice || 140}
                </div>
              )}
            </div>
          </div>

          <div className="p-3 rounded-[6px] bg-vyro-card border border-vyro-border">
            <span className="text-[10px] font-mono uppercase text-vyro-subtle flex items-center gap-1">
              <Scale className="w-3 h-3 text-vyro-accent" /> Strategy Policy
            </span>
            <div className="mt-1">
              <div className="text-sm font-bold font-mono text-vyro-text capitalize">
                {agent.negotiationStrategy.replace('_', ' ')}
              </div>
              <div className="text-[10px] font-mono text-vyro-muted">
                Max Flexibility: {agent.pricingConstraints.flexibilityPercent || 15}%
              </div>
            </div>
          </div>

          <div className="p-3 rounded-[6px] bg-vyro-card border border-vyro-border">
            <span className="text-[10px] font-mono uppercase text-vyro-subtle flex items-center gap-1">
              <Zap className="w-3 h-3 text-vyro-accent" /> Human Approval
            </span>
            <div className="mt-1">
              <div className="text-sm font-bold font-mono text-vyro-success">
                Enforced
              </div>
              <div className="text-[10px] font-mono text-vyro-muted">
                Explicit buyer signature required
              </div>
            </div>
          </div>
        </div>

        {/* Capabilities */}
        <div>
          <h5 className="text-xs font-mono uppercase text-vyro-muted mb-2 tracking-wider">
            Verified Capabilities
          </h5>
          <div className="flex flex-wrap gap-2">
            {agent.capabilities.map((cap) => (
              <span
                key={cap}
                className="text-xs font-mono px-2.5 py-1 rounded-[4px] bg-vyro-card border border-vyro-border text-vyro-text"
              >
                {cap}
              </span>
            ))}
          </div>
        </div>

        {/* Service Catalog (if Seller) */}
        {isSeller && agent.catalog && agent.catalog.length > 0 && (
          <div>
            <h5 className="text-xs font-mono uppercase text-vyro-muted mb-2 tracking-wider">
              Commercial Service Catalog
            </h5>
            <div className="space-y-3">
              {agent.catalog.map((item) => (
                <div key={item.id} className="p-3.5 rounded-[6px] bg-vyro-card border border-vyro-border">
                  <div className="flex items-start justify-between">
                    <div>
                      <h6 className="text-sm font-semibold text-vyro-text">{item.name}</h6>
                      <p className="text-xs text-vyro-muted mt-0.5">{item.description}</p>
                    </div>
                    <div className="text-right shrink-0 ml-4 font-mono">
                      <span className="text-sm font-bold text-vyro-text">${item.startingPrice}</span>
                      <span className="text-[10px] text-vyro-muted block">Turnaround: {item.deliveryDays}d</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-vyro-border/60">
                    <span className="text-[10px] font-mono text-vyro-subtle uppercase block mb-1.5">
                      Included Deliverables:
                    </span>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-vyro-muted">
                      {item.includedDeliverables.map((deliv) => (
                        <li key={deliv} className="flex items-center gap-1.5 text-[11px]">
                          <CheckCircle2 className="w-3 h-3 text-vyro-success shrink-0" />
                          <span>{deliv}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-vyro-border flex items-center justify-between">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {isSeller && (
            <Button
              variant="accent"
              onClick={() => {
                onClose();
                onInitiateRequest(agent);
              }}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Initiate Commercial Request
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
