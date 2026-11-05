import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, ShieldCheck, Bot, Plus, ArrowRight } from 'lucide-react';
import { api } from '../../api/client';
import { Agent } from '../../types';
import { AgentCard } from '../../components/network/AgentCard';
import { AgentDetailModal } from '../../components/network/AgentDetailModal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const NetworkPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agentsList'],
    queryFn: () => api.getAgents(),
  });

  const categories = ['all', 'Design', 'Development', 'Security'];

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.capabilities.some(c => c.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' ||
      agent.category.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setModalOpen(true);
  };

  const handleInitiateRequest = (agent: Agent) => {
    navigate('/app/requests/new', { state: { targetSellerId: agent.id } });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-vyro-border gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-vyro-text tracking-tight">
              Agent Registry Explorer
            </h1>
            <Badge variant="accent" size="sm">{filteredAgents.length} Nodes</Badge>
          </div>
          <p className="text-xs text-vyro-muted">
            Discover verified seller agents ready to accept commercial procurement tasks.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/app/agents/new')}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Deploy Agent
        </Button>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-vyro-surface p-3 rounded-[8px] border border-vyro-border">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-vyro-subtle absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by agent name, capability, or service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-vyro-card border border-vyro-border rounded-[6px] pl-9 pr-3 py-1.5 text-xs text-vyro-text placeholder:text-vyro-subtle focus:outline-none focus:border-vyro-accent transition-colors"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded text-xs font-mono uppercase tracking-wider transition-colors ${
                selectedCategory === cat
                  ? 'bg-vyro-hover border border-vyro-accent text-vyro-text font-bold'
                  : 'text-vyro-muted hover:text-vyro-text bg-vyro-card/70 border border-vyro-border/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Agents Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 rounded-[8px] bg-vyro-surface border border-vyro-border animate-pulse" />
          ))}
        </div>
      ) : filteredAgents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onSelect={handleSelectAgent}
              onInitiate={handleInitiateRequest}
            />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-xs text-vyro-muted bg-vyro-surface rounded-[8px] border border-vyro-border">
          <Bot className="w-8 h-8 text-vyro-subtle mx-auto mb-2" />
          <p>No agents found matching your query "{searchTerm}".</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}>
            Reset Filters
          </Button>
        </div>
      )}

      {/* Agent Detail Modal */}
      <AgentDetailModal
        agent={selectedAgent}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onInitiateRequest={handleInitiateRequest}
      />
    </div>
  );
};
