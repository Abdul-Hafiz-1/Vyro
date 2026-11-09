import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Listing, Agent } from '../../types';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { toast } from 'sonner';
import {
  Store,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Bot,
  Layers,
  Sparkles
} from 'lucide-react';

const getInitials = (name?: string): string => {
  if (!name) return 'VY';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const ListingsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isBuyerWorkspace } = useAuth();

  const [activeTab, setActiveTab] = useState<'all' | 'my'>(isBuyerWorkspace ? 'all' : 'my');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Create Listing Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Design');
  const [price, setPrice] = useState<number | ''>(250);
  const [minPrice, setMinPrice] = useState<number | ''>(200);
  const [deliveryDays, setDeliveryDays] = useState<number | ''>(4);
  const [deliverablesText, setDeliverablesText] = useState('Production UI Components, Figma Source, Code Review Walkthrough');
  const [description, setDescription] = useState('');

  // Fetch listings
  const { data: listings = [], isLoading: isListingsLoading } = useQuery({
    queryKey: ['listings', activeTab, searchQuery, selectedCategory, user?.id],
    queryFn: () => api.getListings({
      sellerId: activeTab === 'my' ? user?.id : undefined,
      category: selectedCategory !== 'All' ? selectedCategory : undefined,
      search: searchQuery || undefined
    }),
    refetchInterval: 10000
  });

  // Fetch verified seller agents
  const { data: allAgents = [], isLoading: isAgentsLoading } = useQuery({
    queryKey: ['marketplaceAgents', selectedCategory],
    queryFn: () => api.getAgents({
      type: 'seller',
      category: selectedCategory !== 'All' ? selectedCategory : undefined
    })
  });

  const categories = ['All', 'Design', 'Development', 'Security', 'Marketing', 'Hardware'];

  const createMutation = useMutation({
    mutationFn: (data: Partial<Listing>) => api.createListing(data),
    onSuccess: (newListing) => {
      toast.success(`Published offering: "${newListing.title}"`);
      setIsCreateOpen(false);
      setTitle('');
      setDescription('');
      setActiveTab('my');
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create listing');
    }
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Listing title is required.');
      return;
    }
    const numPrice = Number(price);
    if (!numPrice || numPrice <= 0) {
      toast.error('Valid listing price is required.');
      return;
    }
    const numMin = Number(minPrice) || Math.round(numPrice * 0.85);
    if (numMin > numPrice) {
      toast.error('Private floor price cannot exceed asking price.');
      return;
    }

    const deliverables = deliverablesText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    createMutation.mutate({
      title: title.trim(),
      category: category as any,
      price: numPrice,
      minAcceptablePrice: numMin,
      deliveryDays: Number(deliveryDays) || 5,
      deliverables,
      description: description.trim(),
      currency: 'USD',
      type: 'service',
      isNegotiable: true
    });
  };

  const handleHireAgent = (agent: Agent) => {
    navigate('/app/requests/new', {
      state: {
        targetSellerId: agent.id,
        initialPrompt: `I would like to hire ${agent.businessName} (${agent.name}) for a project in ${agent.category}. Please negotiate terms within my standard budget limits.`
      }
    });
  };

  const handleProcureListing = (listing: Listing) => {
    navigate('/app/requests/new', {
      state: {
        targetSellerId: listing.sellerAgentId,
        initialPrompt: `I want to engage services for "${listing.title}" listed at $${listing.price} ${listing.currency} with estimated delivery in ${listing.deliveryDays} days.`
      }
    });
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-vyro-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold font-mono text-vyro-text uppercase tracking-wider">
              {activeTab === 'my' ? 'My Commercial Offerings' : 'Autonomous Marketplace'}
            </h1>
            <Badge variant="accent" size="sm">
              {listings.length} Active Services
            </Badge>
          </div>
          <p className="text-xs text-vyro-muted mt-0.5">
            {activeTab === 'my'
              ? 'Manage your published offerings. Buyer agents negotiate autonomously against your private pricing floor.'
              : 'Verified seller agents with proven delivery track records. Hire directly with autonomous multi-round negotiation.'}
          </p>
        </div>

        {/* View Toggle & Create Button */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="flex items-center p-0.5 rounded-lg bg-vyro-surface border border-vyro-border text-xs font-mono">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-vyro-card text-vyro-text shadow-xs'
                  : 'text-vyro-muted hover:text-vyro-text'
              }`}
            >
              All Marketplace
            </button>
            <button
              onClick={() => setActiveTab('my')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                activeTab === 'my'
                  ? 'bg-vyro-card text-vyro-text shadow-xs'
                  : 'text-vyro-muted hover:text-vyro-text'
              }`}
            >
              My Offerings
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Create Listing
          </Button>
        </div>
      </div>

      {/* Search and Category Filters */}
      <div className="p-3 rounded-xl bg-vyro-surface border border-vyro-border flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search offerings, deliverables, or capabilities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-vyro-card border border-vyro-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-vyro-text focus:outline-none focus:border-vyro-accent transition-colors font-sans"
          />
          <Search className="w-3.5 h-3.5 text-vyro-subtle absolute left-2.5 top-2.5" />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 font-mono text-xs">
          <span className="text-[10px] text-vyro-subtle uppercase shrink-0 mr-1">Filter:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md transition-colors shrink-0 ${
                selectedCategory === cat
                  ? 'bg-vyro-text text-vyro-bg font-semibold'
                  : 'bg-vyro-card text-vyro-muted hover:text-vyro-text border border-vyro-border/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Verified Specialist Agents */}
      {activeTab === 'all' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-semibold font-mono text-vyro-text uppercase tracking-wider">
                Autonomous Studio Specialists
              </h2>
            </div>
            <Link
              to="/app/network"
              className="text-xs text-vyro-muted hover:text-vyro-text font-mono transition-colors flex items-center gap-1"
            >
              <span>Full Network Directory</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {isAgentsLoading ? (
            <div className="py-6 text-center text-xs font-mono text-vyro-muted animate-pulse">
              Syncing studio agent telemetry...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {allAgents.slice(0, 3).map((agent) => (
                <div
                  key={agent.id}
                  className="p-3.5 rounded-xl bg-vyro-surface border border-vyro-border hover:border-vyro-border-light transition-all flex flex-col justify-between group shadow-xs"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-semibold text-vyro-text group-hover:text-vyro-accent transition-colors">
                          {agent.businessName}
                        </h3>
                        <p className="text-[11px] font-mono text-vyro-muted">{agent.name}</p>
                      </div>
                      <Badge variant="success" size="sm">
                        {agent.verificationStatus.toUpperCase()}
                      </Badge>
                    </div>

                    <p className="text-xs text-vyro-muted line-clamp-2 leading-relaxed">
                      {agent.description}
                    </p>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {agent.capabilities.slice(0, 2).map((cap, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-vyro-card border border-vyro-border text-vyro-subtle"
                        >
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-vyro-border/60 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-vyro-subtle block">Asking</span>
                      <span className="text-xs font-bold font-mono text-vyro-text tabular-nums">
                        ${agent.pricingConstraints.startingPrice || 150} USD
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleHireAgent(agent)}
                      className="text-xs h-7 px-2.5 rounded-lg"
                    >
                      Commission Agent
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Listings Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-vyro-accent" />
            <h2 className="text-xs font-semibold font-mono text-vyro-text uppercase tracking-wider">
              {activeTab === 'my' ? 'Your Active Listings' : 'Published Service Catalog'}
            </h2>
          </div>
          <span className="text-[11px] font-mono text-vyro-muted tabular-nums">
            {listings.length} Results
          </span>
        </div>

        {isListingsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-xl bg-vyro-surface border border-vyro-border animate-pulse" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="p-12 rounded-xl bg-vyro-surface border border-vyro-border text-center space-y-4">
            <Store className="w-10 h-10 text-vyro-subtle mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-vyro-text">
                {activeTab === 'my' ? 'No commercial offerings published' : 'No listings found'}
              </h3>
              <p className="text-xs text-vyro-muted max-w-sm mx-auto">
                {activeTab === 'my'
                  ? 'Publish your first service listing to start receiving autonomous procurement requests from verified buyers.'
                  : 'No services match your active filters. Try selecting another category or clear the search query.'}
              </p>
            </div>
            {activeTab === 'my' && (
              <div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsCreateOpen(true)}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Create your first listing
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((listing) => {
              const initials = getInitials(listing.sellerName || 'Vendor');

              return (
                <div
                  key={listing.id}
                  className="p-4 rounded-xl bg-vyro-surface border border-vyro-border hover:border-vyro-border-light transition-all flex flex-col justify-between space-y-3 group"
                >
                  <div>
                    {/* Header: Seller & Category */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold font-mono text-[10px] flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <span className="text-[11px] font-mono text-vyro-muted truncate">
                          {listing.sellerName || 'Verified Seller'}
                        </span>
                      </div>
                      <Badge variant="default" size="sm">
                        {listing.category}
                      </Badge>
                    </div>

                    <h3 className="text-xs font-semibold text-vyro-text group-hover:text-vyro-accent transition-colors leading-snug">
                      {listing.title}
                    </h3>
                    <p className="text-xs text-vyro-muted mt-1.5 line-clamp-2 leading-relaxed font-sans">
                      {listing.description}
                    </p>

                    {/* Deliverables snippet */}
                    {listing.deliverables && listing.deliverables.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-vyro-border/40 space-y-1">
                        {listing.deliverables.slice(0, 2).map((del, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[11px] text-vyro-subtle">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="truncate">{del}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pricing and Action */}
                  <div className="pt-3 border-t border-vyro-border/50 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1 font-mono font-bold text-xs text-vyro-text tabular-nums">
                        <span>${listing.price} {listing.currency}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-mono text-vyro-subtle">
                        <Clock className="w-3 h-3" />
                        <span>{listing.deliveryDays}d delivery</span>
                      </div>
                    </div>

                    {activeTab === 'all' ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleProcureListing(listing)}
                        rightIcon={<ArrowRight className="w-3 h-3" />}
                        className="text-xs h-7 px-3 rounded-lg font-medium"
                      >
                        Procure
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        {listing.minAcceptablePrice && (
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 tabular-nums">
                            Floor: ${listing.minAcceptablePrice}
                          </span>
                        )}
                        <Badge variant="accent" size="sm">Active</Badge>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Listing Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Commercial Offering"
        description="Publish your service to the Autonomous Marketplace. Buyer agents will negotiate autonomously within your private pricing rules."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 p-6">
          <div>
            <label className="block text-xs font-medium text-vyro-text mb-1">
              Offering Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Next.js SaaS Architecture Sprint"
              className="w-full bg-vyro-card border border-vyro-border rounded-lg px-3 py-2 text-xs text-vyro-text focus:outline-none focus:border-vyro-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-vyro-text mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-vyro-card border border-vyro-border rounded-lg px-3 py-2 text-xs text-vyro-text focus:outline-none focus:border-vyro-accent"
              >
                <option value="Design">Design</option>
                <option value="Development">Development</option>
                <option value="Security">Security</option>
                <option value="Marketing">Marketing</option>
                <option value="Hardware">Hardware</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-vyro-text mb-1">
                Delivery Turnaround (Days)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={deliveryDays}
                onChange={(e) => setDeliveryDays(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-vyro-card border border-vyro-border rounded-lg px-3 py-2 text-xs text-vyro-text focus:outline-none focus:border-vyro-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-vyro-text mb-1">
                Public Asking Price ($)
              </label>
              <input
                type="number"
                min="1"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-vyro-card border border-vyro-border rounded-lg px-3 py-2 text-xs text-vyro-text focus:outline-none focus:border-vyro-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-vyro-text mb-1 flex items-center justify-between">
                <span>Private Floor Price ($)</span>
                <span className="text-[10px] text-emerald-400 font-mono">CONFIDENTIAL</span>
              </label>
              <input
                type="number"
                min="1"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-vyro-card border border-vyro-border rounded-lg px-3 py-2 text-xs text-vyro-text focus:outline-none focus:border-vyro-accent"
              />
              <p className="text-[10px] text-vyro-muted mt-0.5">
                Never shared with buyers or exposed in APIs.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-vyro-text mb-1">
              Included Deliverables (comma-separated)
            </label>
            <input
              type="text"
              value={deliverablesText}
              onChange={(e) => setDeliverablesText(e.target.value)}
              className="w-full bg-vyro-card border border-vyro-border rounded-lg px-3 py-2 text-xs text-vyro-text focus:outline-none focus:border-vyro-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-vyro-text mb-1">
              Description & Specifications
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Full service deliverables, guarantees, and requirements..."
              className="w-full bg-vyro-card border border-vyro-border rounded-lg px-3 py-2 text-xs text-vyro-text focus:outline-none focus:border-vyro-accent"
            />
          </div>

          <div className="pt-3 border-t border-vyro-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={createMutation.isPending}
            >
              Publish to Marketplace
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
