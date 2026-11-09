import React, { useState } from 'react';
import { Bot, ShieldCheck, CheckCircle2, Clock, DollarSign, ArrowRight, Zap, Scale, UserCheck, HeartHandshake, Star, Sparkles, MessageSquare, Globe, AlertTriangle } from 'lucide-react';
import { Agent } from '../../types';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { api } from '../../api/client';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';

interface AgentDetailModalProps {
  agent: Agent | null;
  isOpen: boolean;
  onClose: () => void;
  onInitiateRequest: (agent: Agent) => void;
  onAgentUpdated?: (updated: Agent) => void;
}

export const AgentDetailModal: React.FC<AgentDetailModalProps> = ({
  agent,
  isOpen,
  onClose,
  onInitiateRequest,
  onAgentUpdated
}) => {
  const { user, isBuyerWorkspace: isBuyer } = useAuth();
  const [isAuditing, setIsAuditing] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(agent);

  React.useEffect(() => {
    setCurrentAgent(agent);
  }, [agent]);

  if (!currentAgent) return null;

  const isOwnAgent = user?.id === currentAgent.ownerId;
  const isSeller = currentAgent.type === 'seller';
  const isNewcomer = currentAgent.isNewTalent || !currentAgent.reviewCount || currentAgent.reviewCount === 0;
  const isBusy = (currentAgent.activeProjects ?? 0) >= (currentAgent.maxConcurrentProjects ?? 3);

  const handleRunAudit = async () => {
    try {
      setIsAuditing(true);
      const res = await api.auditAgentSkill(currentAgent.id);
      if (res?.agent) {
        setCurrentAgent(res.agent);
        if (onAgentUpdated) onAgentUpdated(res.agent);
        toast.success(`AI Audit Complete: Verified with ${res.audit?.score || res.agent.aiSkillAudit?.score}% score!`);
      }
    } catch (err: any) {
      toast.error(err.message || 'AI Skill Audit failed');
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={currentAgent.name}
      description={`${currentAgent.businessName} • ${currentAgent.category}`}
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Human Operator & Creator Covenant */}
        {currentAgent.operatorName && (
          <div className="p-4 rounded-[8px] bg-vyro-surface border border-vyro-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <img
                src={currentAgent.operatorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
                alt={currentAgent.operatorName}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-vyro-accent/40 shrink-0"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-vyro-text">{currentAgent.operatorName}</h4>
                  <Badge variant="success" size="sm">
                    <UserCheck className="w-3 h-3 mr-1" /> Verified Operator
                  </Badge>
                </div>
                <p className="text-xs text-vyro-muted">{currentAgent.operatorRole} • {currentAgent.operatorLocation}</p>
                {currentAgent.craftPhilosophy && (
                  <p className="text-[11px] text-vyro-muted/90 italic mt-1.5 border-l-2 border-vyro-accent/50 pl-2">
                    "{currentAgent.craftPhilosophy}"
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Profile Card Header with Marketplace Reputation */}
        <div className="p-4 rounded-[8px] bg-vyro-card border border-vyro-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[6px] bg-vyro-surface border border-vyro-border flex items-center justify-center text-vyro-accent shrink-0">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-semibold text-vyro-text">{currentAgent.businessName}</h4>
                {currentAgent.verificationStatus === 'verified' && (
                  <Badge variant="success" size="sm">
                    <ShieldCheck className="w-3 h-3 mr-1" /> Verified Entity
                  </Badge>
                )}
              </div>
              <p className="text-xs text-vyro-muted mt-0.5">{currentAgent.description}</p>
            </div>
          </div>

          <div className="flex sm:flex-col items-end gap-1 shrink-0">
            <span className="text-[10px] uppercase font-mono text-vyro-subtle">Network Status</span>
            <Badge variant={currentAgent.status === 'active' ? 'success' : 'default'} size="sm" dot>
              {currentAgent.status.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Marketplace Metrics & SLA Grid */}
        {isSeller && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Rating / Talent Status */}
            <div className="p-3 rounded-[6px] bg-vyro-surface border border-vyro-border font-mono">
              <span className="text-[10px] uppercase text-vyro-subtle flex items-center gap-1">
                <Star className="w-3 h-3 text-vyro-warning" /> Client Rating
              </span>
              <div className="mt-1">
                {isNewcomer ? (
                  <div className="text-xs font-bold text-vyro-accent flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Rising Talent
                  </div>
                ) : (
                  <div className="text-sm font-bold text-vyro-text">
                    ★ {currentAgent.rating?.toFixed(1) || '4.9'}
                  </div>
                )}
                <span className="text-[10px] text-vyro-muted">
                  {currentAgent.reviewCount ? `${currentAgent.reviewCount} verified reviews` : 'Protected from new penalty'}
                </span>
              </div>
            </div>

            {/* Capacity Slots */}
            <div className="p-3 rounded-[6px] bg-vyro-surface border border-vyro-border font-mono">
              <span className="text-[10px] uppercase text-vyro-subtle flex items-center gap-1">
                <Zap className="w-3 h-3 text-vyro-accent" /> Workload Capacity
              </span>
              <div className="mt-1">
                <div className="text-sm font-bold text-vyro-text">
                  {currentAgent.activeProjects || 0} / {currentAgent.maxConcurrentProjects || 3} Slots
                </div>
                <span className={`text-[10px] ${isBusy ? 'text-vyro-warning' : 'text-vyro-success'}`}>
                  {isBusy ? 'High load (Pending)' : 'Immediate Capacity'}
                </span>
              </div>
            </div>

            {/* Reply Points */}
            <div className="p-3 rounded-[6px] bg-vyro-surface border border-vyro-border font-mono">
              <span className="text-[10px] uppercase text-vyro-subtle flex items-center gap-1">
                <MessageSquare className="w-3 h-3 text-vyro-accent" /> Reply Points
              </span>
              <div className="mt-1">
                <div className="text-sm font-bold text-vyro-text">
                  {currentAgent.replyPoints || 95} / 100
                </div>
                <span className="text-[10px] text-vyro-muted">
                  Avg response: {currentAgent.avgResponseTime || '<15m'}
                </span>
              </div>
            </div>

            {/* Language Fluency */}
            <div className="p-3 rounded-[6px] bg-vyro-surface border border-vyro-border font-mono">
              <span className="text-[10px] uppercase text-vyro-subtle flex items-center gap-1">
                <Globe className="w-3 h-3 text-vyro-accent" /> Languages
              </span>
              <div className="mt-1">
                <div className="text-xs font-bold text-vyro-text truncate">
                  {currentAgent.languages?.join(', ') || 'English (Native)'}
                </div>
                <span className="text-[10px] text-vyro-muted">
                  Multi-lingual agent
                </span>
              </div>
            </div>
          </div>
        )}

        {/* AI Skill Audit Card */}
        {isSeller && (
          <div className="p-4 rounded-[8px] bg-vyro-surface border border-vyro-border space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-vyro-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-vyro-accent" />
                <h5 className="text-xs font-mono font-semibold uppercase tracking-wider text-vyro-text">
                  Independent AI Skill Verification
                </h5>
              </div>
              <Button
                variant="outline"
                size="sm"
                isLoading={isAuditing}
                onClick={handleRunAudit}
                className="text-xs h-7"
              >
                {currentAgent.aiReviewed ? 'Re-Audit with AI' : 'Run AI Skill Audit'}
              </Button>
            </div>

            {currentAgent.aiSkillAudit ? (
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-vyro-muted">Audit Score:</span>
                  <span className="text-sm font-bold text-vyro-success">{currentAgent.aiSkillAudit.score}/100</span>
                </div>
                <p className="text-vyro-muted text-xs leading-relaxed">{currentAgent.aiSkillAudit.summary}</p>
                
                <div className="pt-2">
                  <span className="text-[10px] font-mono text-vyro-subtle uppercase block mb-1.5">
                    Verified Competencies:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {currentAgent.aiSkillAudit.skillsVerified?.map((sk: string) => (
                      <span key={sk} className="text-[11px] font-mono px-2 py-0.5 rounded bg-vyro-card border border-vyro-border text-vyro-text flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-vyro-success" /> {sk}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-2 text-center text-xs text-vyro-muted">
                No automated AI audit on record yet. Click "Run AI Skill Audit" to benchmark this talent's code & design artifacts.
              </div>
            )}
          </div>
        )}

        {/* Technical Specs & Constraints */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-[6px] bg-vyro-card border border-vyro-border">
            <span className="text-[10px] font-mono uppercase text-vyro-subtle flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-vyro-accent" /> Pricing Bounds
            </span>
            <div className="mt-1">
              <div className="text-sm font-bold font-mono text-vyro-text">
                {isSeller ? `$${currentAgent.pricingConstraints.startingPrice || 180}` : `Max $${currentAgent.pricingConstraints.maxBudget || 200}`}
              </div>
              {isSeller && (
                <div className="text-[10px] font-mono text-vyro-muted">
                  Minimum Floor: ${currentAgent.pricingConstraints.minAcceptablePrice || 140}
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
                {currentAgent.negotiationStrategy.replace('_', ' ')}
              </div>
              <div className="text-[10px] font-mono text-vyro-muted">
                Max Flexibility: {currentAgent.pricingConstraints.flexibilityPercent || 15}%
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
            {currentAgent.capabilities.map((cap) => (
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
        {isSeller && currentAgent.catalog && currentAgent.catalog.length > 0 && (
          <div>
            <h5 className="text-xs font-mono uppercase text-vyro-muted mb-2 tracking-wider">
              Commercial Service Catalog
            </h5>
            <div className="space-y-3">
              {currentAgent.catalog.map((item) => (
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

          {isOwnAgent ? (
            <span className="text-xs font-mono text-vyro-subtle px-3 py-1.5 rounded bg-vyro-card border border-vyro-border">
              Your Studio Agent (Cannot hire yourself)
            </span>
          ) : isSeller && isBuyer ? (
            <Button
              variant="accent"
              onClick={() => {
                onClose();
                onInitiateRequest(currentAgent);
              }}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Initiate Commercial Request
            </Button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
};
