import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { 
  ArrowRight, 
  Search, 
  Clock, 
  CheckCircle2, 
  Sparkles,
  Store,
  ChevronRight
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Pill } from '../../components/common/Pill';
import { Card } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Chip } from '../../components/common/Chip';
import { DecisionCard } from '../../components/common/DecisionCard';
import { OfferTicket } from '../../components/common/OfferTicket';
import { SpotIllustration } from '../../components/common/SpotIllustration';
import { formatMoney, formatDate, formatStatus, formatName } from '../../lib/present';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [promptText, setPromptText] = useState('');
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

  // Time of day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const greeting = `${getGreeting()}, ${formatName(user?.displayName, 'friend')}`;

  const bigHeadline = needsYou.length > 0
    ? `${needsYou.length} ${needsYou.length === 1 ? 'thing needs' : 'things need'} you.`
    : "You're all caught up.";

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (promptText.trim()) {
      navigate(`/app/requests/new?prompt=${encodeURIComponent(promptText.trim())}`);
    } else {
      navigate('/app/requests/new');
    }
  };

  const handleChipClick = (chip: string) => {
    navigate(`/app/requests/new?prompt=${encodeURIComponent(chip)}`);
  };

  const handleApprove = async (item: any) => {
    setActionInProgressId(item.id);
    try {
      await api.approveReviewItem(item.id);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#FF6B4A', '#FFD23F', '#7FDDB0', '#9CCBFF', '#D9C8FF']
      });
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

  const handleCounter = async (item: any, counterPrice: number) => {
    setActionInProgressId(item.id);
    try {
      await api.counterReviewItem(item.id, counterPrice);
      toast.success(`Counter offer of ${formatMoney(counterPrice)} sent.`);
      queryClient.invalidateQueries({ queryKey: ['home'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to send counter offer.');
    } finally {
      setActionInProgressId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 py-6">
        <div className="flex flex-col gap-2">
          <div className="h-6 w-40 bg-card border-2 border-ink rounded-full animate-pulse" />
          <div className="h-12 w-80 bg-card border-2 border-ink rounded-full animate-pulse" />
        </div>
        <div className="h-44 w-full bg-card border-2 border-ink rounded-[20px] shadow-hard animate-pulse" />
      </div>
    );
  }

  // 1. BRAND NEW FIRST-TIME USER EMPTY STATE
  if (isEmpty) {
    return (
      <div className="flex flex-col gap-10 py-6">
        {/* Welcome Greeting */}
        <div className="flex flex-col gap-2">
          <span className="text-body text-muted font-bold">{greeting}</span>
          <h1 className="font-display font-bold text-hero text-ink leading-tight">
            Welcome to VYRO
          </h1>
          <p className="text-body text-muted max-w-[620px]">
            Your personal assistant will find verified sellers, negotiate pricing within your limit, and ask you only when an exception needs your approval.
          </p>
        </div>

        {/* Hero Prompt Card */}
        <div className="bg-card border-2 border-ink rounded-[20px] shadow-hard p-6 md:p-8 flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <SpotIllustration name="sparkle-search" size={90} className="shrink-0 hidden sm:block" />
            <div>
              <h2 className="font-display font-bold text-card-title text-ink">
                What do you need done?
              </h2>
              <p className="text-body text-muted">
                Describe any project or service in plain words.
              </p>
            </div>
          </div>

          <form onSubmit={handlePromptSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <input
                type="text"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="e.g. Modern SaaS landing page in Figma with 5 sections"
                className="w-full min-h-[54px] px-5 py-3.5 bg-paper border-2 border-ink rounded-[14px] text-body text-ink placeholder:text-muted focus:outline-none focus:shadow-hard transition-shadow"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-small text-muted font-bold">Try:</span>
                {[
                  'Landing page design',
                  'Smart contract audit',
                  'Mobile app UI kit',
                ].map((chip) => (
                  <Chip
                    key={chip}
                    label={chip}
                    onClick={() => handleChipClick(chip)}
                  />
                ))}
              </div>

              <Button
                type="submit"
                variant="coral"
                size="md"
                icon={<ArrowRight className="w-5 h-5 text-ink" strokeWidth={2.5} />}
              >
                Find sellers
              </Button>
            </div>
          </form>
        </div>

        {/* How It Works Spot Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border-2 border-ink rounded-[20px] p-5 shadow-hard flex flex-col gap-2">
            <div className="w-8 h-8 rounded-full bg-sun border-2 border-ink flex items-center justify-center font-bold text-ink">1</div>
            <h3 className="font-display font-bold text-body text-ink">You set the ceiling</h3>
            <p className="text-small text-muted">Pick your maximum budget and deadline. We never exceed them.</p>
          </div>
          <div className="bg-card border-2 border-ink rounded-[20px] p-5 shadow-hard flex flex-col gap-2">
            <div className="w-8 h-8 rounded-full bg-sky border-2 border-ink flex items-center justify-center font-bold text-ink">2</div>
            <h3 className="font-display font-bold text-body text-ink">Assistant negotiates</h3>
            <p className="text-small text-muted">AI agents exchange realistic proposals with sellers on your behalf.</p>
          </div>
          <div className="bg-card border-2 border-ink rounded-[20px] p-5 shadow-hard flex flex-col gap-2">
            <div className="w-8 h-8 rounded-full bg-mint border-2 border-ink flex items-center justify-center font-bold text-ink">3</div>
            <h3 className="font-display font-bold text-body text-ink">You stay in control</h3>
            <p className="text-small text-muted">You only step in if a counteroffer needs your approval or to pay.</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. ACTIVE USER TODAY SCREEN
  return (
    <div className="flex flex-col gap-10 py-6">
      {/* Greeting + One Big Sentence */}
      <div className="flex flex-col gap-2">
        <span className="text-body text-muted font-bold">{greeting}</span>
        <h1 className="font-display font-bold text-hero text-ink leading-tight">
          {bigHeadline}
        </h1>
      </div>

      {/* Hero Prompt Box */}
      <div className="bg-card border-2 border-ink rounded-[20px] shadow-hard p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-card-title text-ink">
            What do you need?
          </h2>
          <span className="text-small text-muted font-medium">Start a new project</span>
        </div>

        <form onSubmit={handlePromptSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="Describe what you need done..."
                className="w-full min-h-[50px] px-4 py-3 bg-paper border-2 border-ink rounded-[14px] text-body text-ink placeholder:text-muted focus:outline-none focus:shadow-hard transition-shadow"
              />
            </div>
            <Button
              type="submit"
              variant="coral"
              size="md"
              icon={<ArrowRight className="w-4 h-4 text-ink" strokeWidth={2.5} />}
              className="shrink-0"
            >
              Find sellers
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-small text-muted font-bold">Quick ideas:</span>
            {[
              'Landing page design',
              'Smart contract audit',
              'Mobile app UI kit',
            ].map((chip) => (
              <Chip
                key={chip}
                label={chip}
                onClick={() => handleChipClick(chip)}
              />
            ))}
          </div>
        </form>
      </div>

      {/* SECTION 1: NEEDS YOU (DECISION CARDS) */}
      {needsYou.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <h2 className="font-display font-bold text-page-title text-ink">
              Needs your decision
            </h2>
            <Pill label={`${needsYou.length}`} variant="sun" size="sm" />
          </div>

          <div className="flex flex-col gap-4">
            {needsYou.map((item: any) => {
              const proposedPrice = item.amount || item.currentOffer?.price || 155;
              const counterpart = formatName(item.counterpartName || item.sellerName || 'Pixel Studio');
              const ceiling = item.budgetCeiling || item.buyerCeiling || 150;
              const days = item.deliveryDays || item.currentOffer?.deliveryDays || 7;

              return (
                <DecisionCard
                  key={item.id}
                  title={`${formatName(item.title)} · ${counterpart}`}
                  counterpartName={counterpart}
                  proposedPrice={proposedPrice}
                  buyerCeiling={ceiling}
                  proposedDays={days}
                  reasonText={`${counterpart} wants ${formatMoney(proposedPrice)}. Your limit is ${formatMoney(ceiling)}.`}
                  suggestionText={`Our suggestion: counter at ${formatMoney(Math.max(ceiling - 2, proposedPrice - 10))} for ${days} days.`}
                  onApprove={() => handleApprove(item)}
                  onDecline={() => handleDecline(item)}
                  onCounter={(newPrice) => handleCounter(item, newPrice)}
                  isLoading={actionInProgressId === item.id}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 2: IN PROGRESS (TICKET-STYLE ROWS) */}
      {inProgress.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-display font-bold text-page-title text-ink">
                In progress
              </h2>
              <Pill label={`${inProgress.length}`} variant="sky" size="sm" />
            </div>
            <Link
              to="/app/deals"
              className="text-body font-bold text-ink hover:underline flex items-center gap-1"
            >
              <span>See all deals</span>
              <ChevronRight className="w-4 h-4 text-ink" strokeWidth={2.5} />
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            {inProgress.map((deal: any) => {
              const offerPrice = deal.currentOffer?.price || deal.agreedPrice || deal.estimatedPrice || 140;
              const deliveryDays = deal.currentOffer?.deliveryDays || 5;
              const counterpart = formatName(deal.counterpartName || deal.sellerName || 'Studio Partner');

              return (
                <Link
                  key={deal.id}
                  to={`/app/deals/${deal.id}`}
                  className="block group"
                >
                  <div className="bg-card border-2 border-ink rounded-[20px] shadow-hard p-5 transition-all duration-150 hover:-translate-y-1 hover:shadow-hard-lg active:translate-y-0.75 active:shadow-hard-press flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-sky border-2 border-ink flex items-center justify-center shrink-0">
                        <Clock className="w-6 h-6 text-ink" strokeWidth={2.5} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Pill label="Negotiating" variant="sky" size="sm" />
                          <span className="text-small text-muted font-bold">· {counterpart}</span>
                        </div>
                        <h3 className="font-display font-bold text-card-title text-ink group-hover:text-coral transition-colors">
                          {formatName(deal.title)}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:text-right">
                      <div>
                        <span className="font-display font-bold text-[24px] text-ink block">
                          {formatMoney(offerPrice)}
                        </span>
                        <span className="text-small text-muted font-bold">
                          {deliveryDays} days delivery
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-ink shrink-0 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 3: FINISHED THIS WEEK */}
      {handledForYou.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-page-title text-ink">
              Done this week
            </h2>
            <Link
              to="/app/deals?tab=done"
              className="text-body font-bold text-ink hover:underline flex items-center gap-1"
            >
              <span>See past receipts</span>
              <ChevronRight className="w-4 h-4 text-ink" strokeWidth={2.5} />
            </Link>
          </div>

          <div className="bg-card border-2 border-ink rounded-[20px] shadow-hard divide-y-2 divide-ink overflow-hidden">
            {handledForYou.slice(0, 5).map((deal: any) => {
              const paidAmount = deal.finalPrice || deal.amount || 149;
              const counterpart = formatName(deal.counterpartName || deal.sellerName || 'Service Provider');

              return (
                <div
                  key={deal.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-paper transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-mint shrink-0" strokeWidth={2.5} />
                    <div>
                      <span className="font-bold text-body text-ink block">
                        {formatName(deal.title)}
                      </span>
                      <span className="text-small text-muted">
                        Completed with {counterpart} · {formatDate(deal.updatedAt || deal.completedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-body text-ink">
                      {formatMoney(paidAmount)}
                    </span>
                    <Link
                      to={`/app/deals/${deal.id}`}
                      className="text-small font-bold text-ink underline hover:text-coral"
                    >
                      Receipt
                    </Link>
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
