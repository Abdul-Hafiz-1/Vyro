import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  Plus,
  Pause,
  Play,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Scale,
  DollarSign,
  Clock,
  Sparkles,
  Sliders,
  CheckCircle2,
  Settings2
} from 'lucide-react';
import { api } from '../../api/client';
import { Agent } from '../../types';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { toast } from 'sonner';

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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['agentsList'] });
      toast.success(`Agent status updated to ${variables.status}`);
    }
  });

  const filtered = agents.filter(a => activeTab === 'all' || a.type === activeTab);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-vyro-border gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-vyro-text tracking-tight">
              Agent Fleet Studio
            </h1>
            <Badge variant="accent" size="sm">{agents.length} Deployed Agents</Badge>
          </div>
          <p className="text-xs text-vyro-muted mt-1">
            Configure your autonomous buyer procurement ambassadors and inbound seller representations.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/app/agents/new')}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Deploy New Agent
        </Button>
      </div>

      {/* Tabs Filter Bar */}
      <div className="flex items-center justify-between gap-4 p-1.5 rounded-[8px] bg-vyro-surface border border-vyro-border shadow-xs">
        <div className="flex items-center gap-1 text-xs">
          {(['all', 'buyer', 'seller'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-[5px] font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-vyro-card text-vyro-text shadow-xs font-semibold'
                  : 'text-vyro-muted hover:text-vyro-text'
              }`}
            >
              {tab === 'all' ? 'All Fleet' : `${tab.charAt(0).toUpperCase() + tab.slice(1)} Agents`}
            </button>
          ))}
        </div>

        <span className="text-[10px] font-mono text-vyro-subtle hidden sm:inline-block pr-2">
          Encrypted Policy Enforcement Active
        </span>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((agent) => {
          const isSeller = agent.type === 'seller';
          const startingPrice = isSeller 
            ? agent.pricingConstraints.startingPrice || agent.catalog[0]?.startingPrice 
            : agent.pricingConstraints.defaultBudget;
          const minPrice = isSeller ? agent.pricingConstraints.minAcceptablePrice : undefined;

          return (
            <div
              key={agent.id}
              className="p-5 rounded-[10px] bg-vyro-surface border border-vyro-border hover:border-vyro-border-light transition-all flex flex-col justify-between shadow-xs group"
            >
              <div>
                {/* Agent Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <img
                      src={agent.operatorAvatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80'}
                      alt={agent.name}
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-vyro-border shrink-0 mt-0.5"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-semibold text-vyro-text truncate group-hover:text-blue-400 transition-colors">
                          {agent.name}
                        </h3>
                        <Badge variant={isSeller ? 'success' : 'accent'} size="sm">
                          {agent.type.toUpperCase()}
                        </Badge>
                      </div>
                      <span className="text-xs text-vyro-muted truncate block mt-0.5 font-mono">
                        {agent.businessName} • {agent.category}
                      </span>
                    </div>
                  </div>

                  <Badge variant={agent.status === 'active' ? 'success' : 'default'} size="sm" dot>
                    {agent.status}
                  </Badge>
                </div>

                {/* Description */}
                <p className="text-xs text-vyro-muted line-clamp-2 leading-relaxed mb-4">
                  {agent.description}
                </p>

                {/* Capabilities pills */}
                {agent.capabilities && agent.capabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {agent.capabilities.slice(0, 3).map((cap, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-vyro-card text-vyro-subtle px-2 py-0.5 rounded border border-vyro-border/60"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Policy & Metrics Footer */}
              <div className="pt-3 border-t border-vyro-border flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-mono uppercase text-vyro-subtle block">
                    {isSeller ? 'Pricing Floor Boundary' : 'Procurement Budget Ceiling'}
                  </span>
                  <span className="text-xs font-mono font-bold text-vyro-text mt-0.5 block">
                    {isSeller
                      ? `$${minPrice || 145} Floor (Ask: $${startingPrice})`
                      : `$${agent.pricingConstraints.maxBudget || 250} USD Max`}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleStatusMutation.mutate({
                      id: agent.id,
                      status: agent.status === 'active' ? 'paused' : 'active'
                    })}
                    title={agent.status === 'active' ? 'Pause agent' : 'Activate agent'}
                    className="h-7 px-2.5 text-xs"
                  >
                    {agent.status === 'active' ? (
                      <span className="flex items-center gap-1 text-vyro-muted">
                        <Pause className="w-3 h-3" /> Pause
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Play className="w-3 h-3" /> Activate
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
