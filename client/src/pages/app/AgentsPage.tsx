import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bot, Plus, Pause, Play, Trash2, ArrowRight, ShieldCheck, Scale, DollarSign } from 'lucide-react';
import { api } from '../../api/client';
import { Agent } from '../../types';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const AgentsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'all' | 'buyer' | 'seller'>('all');

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agentsList'],
    queryFn: () => api.getAgents(),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'paused' }) =>
      api.updateAgent(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agentsList'] });
    }
  });

  const filtered = agents.filter(a => activeTab === 'all' || a.type === activeTab);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-vyro-border gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-vyro-text tracking-tight">
              Agent Studio
            </h1>
            <Badge variant="accent" size="sm">{agents.length} Deployed</Badge>
          </div>
          <p className="text-xs text-vyro-muted">
            Configure your autonomous buyer procurement policies and seller business representations.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/app/agents/new')}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Create New Agent
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-vyro-border pb-2 text-xs font-mono">
        {(['all', 'buyer', 'seller'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded uppercase tracking-wider transition-colors ${
              activeTab === tab
                ? 'bg-vyro-surface border border-vyro-accent text-vyro-text font-bold'
                : 'text-vyro-muted hover:text-vyro-text'
            }`}
          >
            {tab === 'all' ? 'All Agents' : `${tab} Agents`}
          </button>
        ))}
      </div>

      {/* Agent Table / Cards */}
      <div className="space-y-3">
        {filtered.map((agent) => {
          const isSeller = agent.type === 'seller';
          const startingPrice = isSeller 
            ? agent.pricingConstraints.startingPrice || agent.catalog[0]?.startingPrice 
            : agent.pricingConstraints.defaultBudget;
          const minPrice = isSeller ? agent.pricingConstraints.minAcceptablePrice : undefined;

          return (
            <div
              key={agent.id}
              className="p-5 rounded-[8px] bg-vyro-surface border border-vyro-border hover:border-vyro-border-light transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className={`w-10 h-10 rounded-[6px] border flex items-center justify-center shrink-0 ${
                  isSeller ? 'bg-vyro-card border-vyro-border text-vyro-text' : 'bg-vyro-hover border-vyro-border text-vyro-accent'
                }`}>
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-vyro-text truncate">{agent.name}</h3>
                    <Badge variant={agent.type === 'buyer' ? 'accent' : 'outline'} size="sm">
                      {agent.type.toUpperCase()}
                    </Badge>
                    {agent.isDemo && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-vyro-card text-vyro-subtle border border-vyro-border/50">
                        Demo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-vyro-muted mt-0.5 line-clamp-1">{agent.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-vyro-muted">
                    <span>Category: {agent.category}</span>
                    <span>•</span>
                    <span>Strategy: {agent.negotiationStrategy.replace('_', ' ')}</span>
                    <span>•</span>
                    <span className="text-vyro-text font-bold">
                      {isSeller ? `Starting $${startingPrice} (Floor: $${minPrice})` : `Max Budget: $${agent.pricingConstraints.maxBudget || 200}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <Badge variant={agent.status === 'active' ? 'success' : 'default'} size="sm" dot>
                  {agent.status}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleStatusMutation.mutate({
                    id: agent.id,
                    status: agent.status === 'active' ? 'paused' : 'active'
                  })}
                  title={agent.status === 'active' ? 'Pause agent' : 'Activate agent'}
                >
                  {agent.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
