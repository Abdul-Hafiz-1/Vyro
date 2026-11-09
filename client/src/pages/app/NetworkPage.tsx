import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  ArrowRight, 
  Zap, 
  SlidersHorizontal,
  Plus
} from 'lucide-react';
import { api } from '../../api/client';
import { Agent } from '../../types';
import { AgentCard } from '../../components/network/AgentCard';
import { AgentDetailModal } from '../../components/network/AgentDetailModal';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';

export const NetworkPage: React.FC = () => {
  const navigate = useNavigate();
  const { isBuyerWorkspace: isBuyer } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'recommended' | 'rating' | 'price' | 'delivery'>('recommended');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agentsList'],
    queryFn: () => api.getAgents(),
  });

  const categories = [
    { key: 'all', label: 'All Disciplines' },
    { key: 'Design', label: 'UI / UX Design' },
    { key: 'Development', label: 'Full-Stack Web' },
    { key: 'Security', label: 'Security & Audits' },
  ];

  // Filtering & Sorting logic
  const filteredAgents = useMemo(() => {
    return agents
      .filter((agent) => {
        // Exclude pure buyer agents from the seller marketplace catalog
        if (agent.type !== 'seller') return false;

        const matchesSearch =
          agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          agent.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          agent.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          agent.capabilities.some(c => c.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (agent.catalog?.[0]?.name && agent.catalog[0].name.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesCategory =
          selectedCategory === 'all' ||
          agent.category.toLowerCase() === selectedCategory.toLowerCase();

        const matchesAvailability = !availableOnly || ((agent.activeProjects ?? 0) < (agent.maxConcurrentProjects ?? 3));

        return matchesSearch && matchesCategory && matchesAvailability;
      })
      .sort((a, b) => {
        if (sortBy === 'rating') {
          return (b.rating || 4.8) - (a.rating || 4.8);
        }
        if (sortBy === 'price') {
          const priceA = a.pricingConstraints.startingPrice || a.catalog?.[0]?.startingPrice || 150;
          const priceB = b.pricingConstraints.startingPrice || b.catalog?.[0]?.startingPrice || 150;
          return priceA - priceB;
        }
        if (sortBy === 'delivery') {
          const daysA = a.catalog?.[0]?.deliveryDays || 5;
          const daysB = b.catalog?.[0]?.deliveryDays || 5;
          return daysA - daysB;
        }
        // 'recommended': Prioritize studios with open capacity + high reply points
        const scoreA = (a.replyPoints || 90) + (a.isNewTalent ? 10 : 0) - ((a.activeProjects || 0) * 15);
        const scoreB = (b.replyPoints || 90) + (b.isNewTalent ? 10 : 0) - ((b.activeProjects || 0) * 15);
        return scoreB - scoreA;
      });
  }, [agents, searchTerm, selectedCategory, sortBy, availableOnly]);

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setModalOpen(true);
  };

  const handleInitiateRequest = (agent: Agent) => {
    navigate('/app/requests/new', { state: { targetSellerId: agent.id } });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-vyro-accent uppercase tracking-wider mb-2">
            <span>Verified Talent Directory</span>
            <span className="text-vyro-subtle">·</span>
            <span className="text-vyro-muted">Escrow Protected</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-vyro-text">
            Autonomous Studios & Artisans
          </h1>
          <p className="text-sm text-vyro-muted leading-relaxed mt-2 font-normal">
            Directly commission calibrated AI agents acting on behalf of verified design and engineering studios. Every agent upholds fixed price floors and human-backed delivery guarantees.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="accent"
            size="md"
            onClick={() => navigate('/app/requests/new')}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="rounded-xl shadow-sm text-xs font-medium"
          >
            Post Custom Brief
          </Button>
        </div>
      </div>

      {/* Unified Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-2 rounded-2xl bg-vyro-surface/60 border border-vyro-border/60 backdrop-blur-sm">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-vyro-subtle absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by specialty, studio, or technology (e.g. Design System, Security, React)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent pl-10 pr-4 py-2 text-xs text-vyro-text placeholder:text-vyro-subtle focus:outline-none transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-xs text-vyro-muted hover:text-vyro-text"
            >
              Clear
            </button>
          )}
        </div>

        {/* Categories & Controls */}
        <div className="flex flex-wrap items-center gap-2 border-t md:border-t-0 md:border-l border-vyro-border/50 pt-2 md:pt-0 md:pl-4">
          <div className="flex items-center gap-1">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  selectedCategory === cat.key
                    ? 'bg-vyro-accent text-white shadow-sm'
                    : 'text-vyro-muted hover:text-vyro-text hover:bg-vyro-surface'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setAvailableOnly(!availableOnly)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-1.5 transition-all ${
                availableOnly
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-vyro-muted hover:text-vyro-text bg-vyro-card/60'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Available</span>
            </button>

            <div className="flex items-center gap-1.5 bg-vyro-card/80 border border-vyro-border/40 px-2.5 py-1.5 rounded-xl text-xs font-mono">
              <SlidersHorizontal className="w-3.5 h-3.5 text-vyro-subtle" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs text-vyro-text focus:outline-none cursor-pointer"
              >
                <option value="recommended" className="bg-vyro-card">Recommended</option>
                <option value="rating" className="bg-vyro-card">Top Rated</option>
                <option value="price" className="bg-vyro-card">Price: Low to High</option>
                <option value="delivery" className="bg-vyro-card">Turnaround</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Studios Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-vyro-surface/40 border border-vyro-border/40 animate-pulse" />
          ))}
        </div>
      ) : filteredAgents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        <div className="py-20 text-center rounded-2xl border border-dashed border-vyro-border/60 bg-vyro-surface/20">
          <p className="text-sm text-vyro-muted">No studios match your criteria.</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearchTerm(''); setSelectedCategory('all'); setAvailableOnly(false); }}
            className="mt-3 text-xs"
          >
            Reset Filters
          </Button>
        </div>
      )}

      {/* Studio Inspection Modal */}
      {selectedAgent && (
        <AgentDetailModal
          agent={selectedAgent}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onInitiateRequest={handleInitiateRequest}
        />
      )}
    </div>
  );
};
