import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, Plus, Sparkles, Clock, Check, ShieldCheck, ArrowRight, ArrowLeft, PauseCircle, PlayCircle } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Listing } from '../../types';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { StatusChip } from '../../components/common/StatusChip';
import { Avatar } from '../../components/common/Avatar';
import { EmptyState } from '../../components/common/EmptyState';
import { formatMoney, formatName } from '../../lib/present';

const CATEGORIES = ['All', 'Design', 'Engineering', 'Security', 'Mobile', 'Writing'];

const SEARCH_SUGGESTIONS = [
  'OWASP Security Audit',
  'Tailwind Design Tokens',
  'React Native App Architecture',
  'API Security Hardening'
];

export const ListingsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isBuyerWorkspace } = useAuth();

  const [activeTab, setActiveTab] = useState<'all' | 'my'>(isBuyerWorkspace ? 'all' : 'my');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Fetch listings
  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['listings', activeTab, searchQuery, selectedCategory, user?.id],
    queryFn: () =>
      api.getListings({
        sellerId: activeTab === 'my' ? user?.id : undefined,
        status: activeTab === 'my' ? 'all' : 'active',
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        search: searchQuery || undefined
      }),
    refetchInterval: 10000
  });

  const togglePauseMut = useMutation({
    mutationFn: ({ id, paused }: { id: string; paused: boolean }) => api.pauseListing(id, paused),
    onSuccess: (updated) => {
      toast.success(updated.status === 'paused' ? 'Listing paused.' : 'Listing resumed.');
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
    onError: (err: any) => toast.error(err.message || 'Could not update listing status')
  });

  const handleDirectInquire = async (listing: Listing) => {
    try {
      const proj = await api.inquireProject(listing.id);
      navigate(`/app/projects/${proj.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Could not send request');
    }
  };

  const handleStartNegotiationWithListing = (listing: Listing) => {
    navigate('/app/requests/new', {
      state: {
        targetSellerId: listing.sellerId,
        initialPrompt: `I want to engage ${listing.title}. Target budget around ${formatMoney(listing.price)} within ${listing.deliveryDays || 5} days.`
      }
    });
  };

  const featuredListing = listings.length > 0 ? listings[0] : null;
  const regularListings = listings.length > 1 ? listings.slice(1) : [];

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4 flex flex-col gap-6">
      {/* Way back (Breadcrumb) */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => navigate('/app')}
          className="inline-flex items-center gap-1.5 text-secondary text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Today</span>
        </button>
      </div>

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div className="flex flex-col gap-1">
          <h1 className="font-display font-bold text-[28px] text-text-primary tracking-tight">
            Marketplace
          </h1>
          <p className="text-secondary text-text-muted">
            Verified sellers with autonomous agents ready to negotiate scope and pricing.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Tab Selector */}
          <div className="flex bg-surface p-1 rounded-control border border-border-subtle">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-control text-secondary font-medium transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-volt text-[#0C0E0D] font-bold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              All offerings
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('my')}
              className={`px-3 py-1.5 rounded-control text-secondary font-medium transition-colors cursor-pointer ${
                activeTab === 'my'
                  ? 'bg-volt text-[#0C0E0D] font-bold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              My listings
            </button>
          </div>

          <Button
            variant="volt"
            size="md"
            onClick={() => navigate('/app/listings/new')}
            leftIcon={<Plus className="w-4 h-4" strokeWidth={2} />}
          >
            Create listing
          </Button>
        </div>
      </div>

      {/* Search Bar & Suggestions */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="w-5 h-5 text-text-muted absolute left-4 top-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by service, technology, or seller name…"
            className="w-full h-[52px] pl-12 pr-4 bg-surface border border-border-subtle rounded-control text-body text-text-primary placeholder-text-muted/60 focus:outline-none focus:border-volt transition-colors"
          />
        </div>

        {/* Quick Search Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-secondary text-text-muted shrink-0">Popular:</span>
          {SEARCH_SUGGESTIONS.map((sug) => (
            <button
              key={sug}
              type="button"
              onClick={() => setSearchQuery(sug)}
              className="text-secondary px-3 py-1 bg-surface border border-border-subtle rounded-control text-text-muted hover:text-text-primary shrink-0 transition-colors cursor-pointer"
            >
              {sug}
            </button>
          ))}
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-secondary text-text-muted hover:text-text-primary underline ml-2 shrink-0 cursor-pointer"
            >
              Clear search
            </button>
          )}
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-control text-secondary font-medium transition-colors cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-volt text-[#0C0E0D] font-bold'
                  : 'bg-surface border border-border-subtle text-text-muted hover:text-text-primary'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Listings Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-70">
          <div className="md:col-span-2 h-72 bg-surface rounded-surface border border-border-subtle" />
          <div className="h-72 bg-surface rounded-surface border border-border-subtle" />
          <div className="h-72 bg-surface rounded-surface border border-border-subtle" />
          <div className="h-72 bg-surface rounded-surface border border-border-subtle" />
          <div className="h-72 bg-surface rounded-surface border border-border-subtle" />
        </div>
      ) : listings.length === 0 ? (
        <EmptyState
          title={activeTab === 'my' ? 'No listings published yet' : 'No offerings found'}
          description={
            activeTab === 'my'
              ? 'Publish an offering so buyers and their autonomous agents can discover your services.'
              : 'Try selecting a different category or adjusting your search keywords.'
          }
          actionLabel={activeTab === 'my' ? 'Create first listing' : undefined}
          onAction={activeTab === 'my' ? () => navigate('/app/listings/new') : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Featured Tile (2x column width) */}
          {featuredListing && (
            <Card
              className="md:col-span-2 p-6 flex flex-col justify-between gap-6 border-volt/40 bg-surface relative overflow-hidden"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusChip label="Featured Offering" role="handled" size="sm" />
                    <span className="text-secondary text-text-muted">
                      {featuredListing.category || 'Engineering'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-secondary text-status-handled">
                    <ShieldCheck className="w-4 h-4" strokeWidth={2} />
                    <span>Verified seller</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <h3 className="font-display font-bold text-[24px] text-text-primary">
                    {featuredListing.title}
                  </h3>
                  <p className="text-body text-text-muted leading-relaxed line-clamp-2">
                    {featuredListing.description ||
                      'Comprehensive commercial engagement with verified deliverables and rapid turnaround.'}
                  </p>
                </div>

                {/* Scope deliverables tags */}
                {featuredListing.deliverables && featuredListing.deliverables.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {featuredListing.deliverables.slice(0, 3).map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-control bg-raised border border-border-subtle text-secondary text-text-primary"
                      >
                        <Check className="w-3.5 h-3.5 text-status-handled shrink-0" strokeWidth={2.5} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Row */}
              <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
                <div className="flex items-center gap-3">
                  <Avatar name={formatName(featuredListing.sellerName || 'Verified Studio')} size="md" />
                  <div className="flex flex-col">
                    <span className="text-secondary font-semibold text-text-primary">
                      {formatName(featuredListing.sellerName || 'Verified Studio')}
                    </span>
                    <div className="flex items-center gap-1.5 text-secondary text-text-muted">
                      <Clock className="w-3.5 h-3.5 text-text-muted" strokeWidth={2} />
                      <span>{featuredListing.deliveryDays || 4}&nbsp;days turnaround</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-secondary text-text-muted block">Starting from</span>
                    <span className="font-display font-bold text-[24px] text-text-primary">
                      {formatMoney(featuredListing.price)}
                    </span>
                  </div>

                  <Button
                    variant="volt"
                    size="md"
                    onClick={() => handleStartNegotiationWithListing(featuredListing)}
                    rightIcon={<ArrowRight className="w-4 h-4" strokeWidth={2} />}
                  >
                    Negotiate terms
                  </Button>
                  {activeTab === 'all' && featuredListing.sellerId !== user?.id && !featuredListing.atCapacity && (
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => handleDirectInquire(featuredListing)}
                    >
                      Send request
                    </Button>
                  )}
                  {activeTab === 'my' && (
                    <Button
                      variant="outline"
                      size="md"
                      isLoading={togglePauseMut.isPending}
                      onClick={() => togglePauseMut.mutate({ id: featuredListing.id, paused: featuredListing.status !== 'paused' })}
                      leftIcon={featuredListing.status === 'paused' ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                    >
                      {featuredListing.status === 'paused' ? 'Resume' : 'Pause'}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Standard Listings Cards (Catalog grid) */}
          {regularListings.map((listing) => {
            const isOwn = listing.sellerId === user?.id;
            return (
              <Card
                key={listing.id}
                interactive={!isOwn}
                onClick={!isOwn ? () => handleStartNegotiationWithListing(listing) : undefined}
                className="p-5 flex flex-col justify-between gap-5 h-full text-left"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-secondary font-medium text-text-muted">
                      {listing.category || 'Services'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {listing.status === 'paused' && <StatusChip label="Paused" role="declined" size="sm" />}
                      {listing.atCapacity && <StatusChip label="At capacity" role="needsYou" size="sm" />}
                      <div className="flex items-center gap-1 text-secondary text-text-muted">
                        <Clock className="w-3.5 h-3.5" strokeWidth={2} />
                        <span>{listing.deliveryDays || 5}d</span>
                      </div>
                    </div>
                  </div>

                  <h4 className="font-display font-bold text-[18px] text-text-primary line-clamp-2">
                    {listing.title}
                  </h4>

                  <p className="text-secondary text-text-muted line-clamp-2 leading-relaxed">
                    {listing.description || 'Verified delivery with satisfaction guarantee and quality checks.'}
                  </p>
                </div>

                {/* Bottom Seller Info & Price */}
                <div className="flex items-center justify-between pt-3 border-t border-border-subtle gap-2">
                  <div className="flex items-center gap-2">
                    <Avatar name={formatName(listing.sellerName || 'Studio')} size="sm" />
                    <span className="text-secondary text-text-primary font-medium truncate max-w-[110px]">
                      {formatName(listing.sellerName || 'Studio')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isOwn && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePauseMut.mutate({ id: listing.id, paused: listing.status !== 'paused' });
                        }}
                      >
                        {listing.status === 'paused' ? 'Resume' : 'Pause'}
                      </Button>
                    )}
                    {!isOwn && !listing.atCapacity && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDirectInquire(listing);
                        }}
                      >
                        Request
                      </Button>
                    )}
                    <div className="text-right">
                      <span className="text-secondary text-text-muted block">From</span>
                      <span className="font-display font-bold text-[18px] text-text-primary">
                        {formatMoney(listing.price)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};