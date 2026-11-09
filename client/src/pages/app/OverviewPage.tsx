import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, ArrowRight, Check, X, Sliders, Sparkles } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { formatMoney, formatDate, formatStatus, formatName } from '../../lib/present';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isBuyerWorkspace } = useAuth();

  // State for empty state custom input
  const [emptyPrompt, setEmptyPrompt] = useState('');

  // State for inline counteroffer
  const [activeCounterId, setActiveCounterId] = useState<string | null>(null);
  const [counterPriceInput, setCounterPriceInput] = useState<string>('');
  const [isSubmittingCounter, setIsSubmittingCounter] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  const { data: homeData, isLoading } = useQuery({
    queryKey: ['home'],
    queryFn: api.getHome,
    refetchInterval: 8000
  });

  const needsYou = homeData?.needsYou || [];
  const inProgress = homeData?.inProgress || [];
  const handledForYou = homeData?.handledForYou || [];

  const isEmpty = needsYou.length === 0 && inProgress.length === 0 && handledForYou.length === 0;

  // Determine time of day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const greeting = `${getGreeting()}, ${formatName(user?.displayName, 'there')}`;

  const handleApprove = async (item: any) => {
    setActionInProgressId(item.id);
    try {
      await api.approveReviewItem(item.id);
      toast.success(`Approved deal for ${formatName(item.title)}.`);
      queryClient.invalidateQueries({ queryKey: ['home'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve deal.');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleDecline = async (item: any) => {
    setActionInProgressId(item.id);
    try {
      await api.declineReviewItem(item.id);
      toast.info(`Declined deal for ${formatName(item.title)}.`);
      queryClient.invalidateQueries({ queryKey: ['home'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to decline deal.');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleCounterSubmit = async (item: any) => {
    const numericPrice = parseFloat(counterPriceInput);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      toast.error('Please enter a valid counteroffer amount.');
      return;
    }

    setIsSubmittingCounter(true);
    try {
      await api.counterReviewItem(item.id, numericPrice);
      toast.success(`Counteroffer of ${formatMoney(numericPrice)} sent.`);
      setActiveCounterId(null);
      setCounterPriceInput('');
      queryClient.invalidateQueries({ queryKey: ['home'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to send counteroffer.');
    } finally {
      setIsSubmittingCounter(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-[720px] mx-auto space-y-8 animate-pulse pt-4">
        <div className="space-y-3">
          <div className="h-6 w-48 bg-vyro-surface border border-vyro-line rounded-control" />
          <div className="h-10 w-80 bg-vyro-surface border border-vyro-line rounded-control" />
        </div>
        <div className="h-56 w-full bg-vyro-surface border border-vyro-line rounded-card" />
        <div className="h-44 w-full bg-vyro-surface border border-vyro-line rounded-card" />
      </div>
    );
  }

  // 1. First-Time Empty State
  if (isEmpty) {
    const exampleChips = [
      'Landing page design',
      'Smart contract audit',
      'Mobile app UI kit'
    ];

    return (
      <div className="max-w-[720px] mx-auto py-12 px-2">
        <div className="p-8 sm:p-12 rounded-card bg-vyro-surface border border-vyro-line space-y-8 shadow-xs text-center">
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-vyro-text">
              What do you need?
            </h1>
            <p className="text-base text-vyro-muted max-w-lg mx-auto leading-relaxed">
              Describe what you are looking for, and your AI agent will search verified sellers and negotiate the best offer for you.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const target = emptyPrompt.trim() || 'Landing page design';
              navigate(`/app/requests/new?prompt=${encodeURIComponent(target)}`);
            }}
            className="space-y-6 max-w-xl mx-auto"
          >
            <div className="space-y-3">
              <input
                type="text"
                value={emptyPrompt}
                onChange={(e) => setEmptyPrompt(e.target.value)}
                placeholder="e.g. Modern landing page design for a mobile app..."
                className="w-full px-5 py-3.5 text-base rounded-control bg-vyro-bg border border-vyro-line text-vyro-text placeholder-vyro-subtle focus:outline-none focus:border-vyro-accent transition-colors min-h-[48px]"
                aria-label="What do you need?"
              />

              {/* 3 Example Chips */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <span className="text-sm text-vyro-muted mr-1">Try:</span>
                {exampleChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setEmptyPrompt(chip)}
                    className="px-3.5 py-1.5 rounded-full bg-vyro-bg border border-vyro-line text-sm text-vyro-text hover:border-vyro-accent hover:text-vyro-accent transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full sm:w-auto px-8 min-h-[48px] text-base"
            >
              Find sellers
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Active Dashboard Blueprint
  const thingsCount = needsYou.length;
  const bigSentence = thingsCount > 0
    ? (thingsCount === 1 ? '1 thing needs you.' : `${thingsCount} things need you.`)
    : 'All handled.';

  return (
    <div className="max-w-[720px] mx-auto space-y-10 pt-2 pb-16">
      {/* Page Header: Greeting + One Big Sentence (32-40px) */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2">
        <div className="space-y-1">
          <p className="text-base text-vyro-muted font-medium">
            {greeting}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-vyro-text">
            {bigSentence}
          </h1>
          {thingsCount === 0 && (
            <p className="text-base text-vyro-muted pt-1">
              Your AI is taking care of negotiations in the background.
            </p>
          )}
        </div>

        <div>
          {isBuyerWorkspace ? (
            <Link to="/app/requests/new">
              <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />}>
                New request
              </Button>
            </Link>
          ) : (
            <Link to="/app/listings/new">
              <Button variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />}>
                New listing
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* SECTION 1: Needs You */}
      {needsYou.length > 0 && (
        <section className="space-y-4" aria-labelledby="needs-you-heading">
          <h2 id="needs-you-heading" className="text-xl font-semibold text-vyro-text tracking-tight">
            Needs you
          </h2>

          <div className="space-y-4">
            {needsYou.map((item) => {
              const cleanTitle = formatName(item.title, 'Project Deal');
              const cleanSeller = formatName(item.sellerName, 'Verified Provider');
              const askedPrice = formatMoney(item.proposedPrice);
              const limitPrice = formatMoney(item.userAutoLimit);
              const suggestedCounter = Math.min(item.userAutoLimit, Math.max(item.proposedPrice - 10, 50));
              const deliveryDays = item.deliveryDays || 5;

              const isCounteringThis = activeCounterId === item.id;

              return (
                <div
                  key={item.id}
                  className="p-6 rounded-card bg-vyro-surface border border-status-needs/40 shadow-md space-y-5"
                >
                  {/* Card Title Line */}
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-vyro-text">
                      {cleanTitle} · {cleanSeller}
                    </h3>
                    <Badge variant="warning" size="sm">
                      Needs your OK
                    </Badge>
                  </div>

                  {/* Why it stopped (plain words) */}
                  <div className="space-y-1 text-base leading-relaxed">
                    <p className="text-vyro-text font-medium">
                      Seller asked {askedPrice}. Your limit is {limitPrice}.
                    </p>
                    <p className="text-vyro-muted">
                      Our suggestion: counter at {formatMoney(suggestedCounter)} for {deliveryDays} days.
                    </p>
                  </div>

                  {/* Inline Counteroffer Box */}
                  {isCounteringThis ? (
                    <div className="p-4 rounded-control bg-vyro-bg border border-vyro-line space-y-3">
                      <label className="block text-sm font-medium text-vyro-text">
                        Your counteroffer amount in USD:
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          value={counterPriceInput}
                          onChange={(e) => setCounterPriceInput(e.target.value)}
                          placeholder={String(suggestedCounter)}
                          className="w-40 px-4 py-2 text-base rounded-control bg-vyro-surface border border-vyro-line text-vyro-text focus:outline-none focus:border-vyro-accent min-h-[44px]"
                          aria-label="Counteroffer amount"
                        />
                        <Button
                          type="button"
                          variant="primary"
                          size="md"
                          isLoading={isSubmittingCounter}
                          onClick={() => handleCounterSubmit(item)}
                        >
                          Send counter
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="md"
                          onClick={() => {
                            setActiveCounterId(null);
                            setCounterPriceInput('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* 3 Clear Action Buttons (min 44px) */
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <Button
                        type="button"
                        variant="primary"
                        size="md"
                        isLoading={actionInProgressId === item.id}
                        onClick={() => handleApprove(item)}
                      >
                        Approve {askedPrice}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="md"
                        onClick={() => {
                          setActiveCounterId(item.id);
                          setCounterPriceInput(String(suggestedCounter));
                        }}
                      >
                        Counter
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="md"
                        isLoading={actionInProgressId === item.id}
                        onClick={() => handleDecline(item)}
                        className="text-status-declined hover:text-status-declined"
                      >
                        Decline
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 2: In Progress */}
      {inProgress.length > 0 && (
        <section className="space-y-4" aria-labelledby="in-progress-heading">
          <h2 id="in-progress-heading" className="text-xl font-semibold text-vyro-text tracking-tight">
            In progress
          </h2>

          <div className="rounded-card bg-vyro-surface border border-vyro-line divide-y divide-vyro-line overflow-hidden">
            {inProgress.map((neg) => {
              const cleanTitle = formatName(neg.title, 'Active Deal');
              const cleanPartner = formatName(neg.sellerName, 'Seller Partner');
              const offer = formatMoney(neg.currentOffer);

              return (
                <div
                  key={neg.id}
                  onClick={() => navigate(`/app/deals/${neg.id}`)}
                  className="p-5 flex items-center justify-between gap-4 hover:bg-vyro-surface-hover cursor-pointer transition-colors"
                >
                  <div className="space-y-1">
                    <p className="text-base font-semibold text-vyro-text">
                      {cleanTitle}
                    </p>
                    <p className="text-sm text-vyro-muted">
                      {cleanPartner}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div className="space-y-0.5">
                      <Badge variant="default" size="sm">
                        Negotiating
                      </Badge>
                      <p className="text-sm font-medium text-vyro-text">
                        Offer: {offer}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-vyro-subtle hidden sm:block" />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 3: Done This Week */}
      {handledForYou.length > 0 && (
        <section className="space-y-4" aria-labelledby="done-this-week-heading">
          <div className="flex items-center justify-between">
            <h2 id="done-this-week-heading" className="text-xl font-semibold text-vyro-text tracking-tight">
              Done this week
            </h2>
            <Link
              to="/app/deals"
              className="text-sm font-medium text-vyro-accent hover:underline flex items-center gap-1"
            >
              See all
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="rounded-card bg-vyro-surface border border-vyro-line divide-y divide-vyro-line overflow-hidden">
            {handledForYou.slice(0, 5).map((item) => {
              const cleanTitle = formatName(item.title, 'Completed Deal');
              const cleanPartner = formatName(item.sellerName, 'Verified Partner');
              const amount = formatMoney(item.amount);
              const statusInfo = formatStatus(item.status);
              const timeString = formatDate(item.createdAt);

              return (
                <div
                  key={item.id}
                  onClick={() => navigate(item.negotiationId ? `/app/deals/${item.negotiationId}` : '/app/deals')}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-vyro-surface-hover cursor-pointer transition-colors"
                >
                  <div className="space-y-1">
                    <p className="text-base font-medium text-vyro-text">
                      {cleanTitle}
                    </p>
                    <p className="text-sm text-vyro-muted">
                      {cleanPartner} · {timeString}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge
                      variant={statusInfo.role === 'handled' ? 'success' : 'default'}
                      size="sm"
                    >
                      {statusInfo.label}
                    </Badge>
                    <span className="text-sm font-semibold text-vyro-text tabular-nums">
                      {amount}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
