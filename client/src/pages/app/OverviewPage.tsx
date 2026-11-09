import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  ArrowRight, 
  Search, 
  Clock, 
  CheckCircle2, 
  Sparkles,
  ChevronRight,
  RotateCcw,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { StatusChip } from '../../components/common/StatusChip';
import { Card } from '../../components/common/Card';
import { Chip } from '../../components/common/Chip';
import { DecisionCard } from '../../components/common/DecisionCard';
import { EmptyState } from '../../components/common/EmptyState';
import { formatMoney, formatDate, formatName } from '../../lib/present';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isSellerWorkspace } = useAuth();

  const [promptText, setPromptText] = useState('');
  const [selectedDecisionIndex, setSelectedDecisionIndex] = useState(0);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  const { data: homeData, isLoading } = useQuery({
    queryKey: ['home'],
    queryFn: api.getHome,
    refetchInterval: 8000
  });

  const needsYou = homeData?.needsYou || [];
  const inProgress = homeData?.inProgress || [];
  const handledForYou = homeData?.handledForYou || [];

  const isEmpty = needsYou.length === 0 && inProgress.length === 0 && handledForYou.length === 0;

  // Linear-style Keyboard Navigation: J (next), K (prev)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      if (needsYou.length === 0) return;

      if (e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setSelectedDecisionIndex((prev) => Math.min(prev + 1, needsYou.length - 1));
      } else if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSelectedDecisionIndex((prev) => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [needsYou.length]);

  const activeDecision = needsYou[selectedDecisionIndex] || needsYou[0];

  // Greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const greeting = `${getGreeting()}, ${formatName(user?.displayName, 'friend')}`;
  const statusSentence = needsYou.length > 0
    ? `${needsYou.length} ${needsYou.length === 1 ? 'thing needs' : 'things need'} your decision`
    : 'Everything is handled';

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = promptText.trim();
    if (isSellerWorkspace) {
      navigate(query ? `/app/listings/new?title=${encodeURIComponent(query)}` : '/app/listings/new');
    } else {
      navigate(query ? `/app/requests/new?prompt=${encodeURIComponent(query)}` : '/app/requests/new');
    }
  };

  const handleChipClick = (chip: string) => {
    if (isSellerWorkspace) {
      navigate(`/app/listings/new?title=${encodeURIComponent(chip)}`);
    } else {
      navigate(`/app/requests/new?prompt=${encodeURIComponent(chip)}`);
    }
  };

  const handleApprove = async (item: any) => {
    setActionInProgressId(item.id);
    try {
      await api.approveReviewItem(item.id);
      toast.success(`Approved proposal for ${formatName(item.title)}.`);
      queryClient.invalidateQueries({ queryKey: ['home'] });
      setIsMobileSheetOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Could not approve proposal.');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleDecline = async (item: any) => {
    setActionInProgressId(item.id);
    try {
      await api.declineReviewItem(item.id);
      toast.info(`Declined proposal for ${formatName(item.title)}.`);
      queryClient.invalidateQueries({ queryKey: ['home'] });
      setIsMobileSheetOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Could not decline proposal.');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleCounter = async (item: any, counterPrice: number, counterDays?: number) => {
    setActionInProgressId(item.id);
    try {
      await api.counterReviewItem(item.id, counterPrice);
      toast.success(`Counter proposal of ${formatMoney(counterPrice)} sent.`);
      queryClient.invalidateQueries({ queryKey: ['home'] });
      setIsMobileSheetOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Could not send counter proposal.');
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleOverride = (dealId: string) => {
    navigate(`/app/deals/${dealId}`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 py-4 animate-pulse">
        <div className="h-6 w-36 bg-raised rounded-control" />
        <div className="h-10 w-72 bg-raised rounded-control" />
        <div className="h-44 w-full bg-surface border border-border-subtle rounded-surface" />
      </div>
    );
  }

  // 1. BRAND NEW FIRST-TIME USER EMPTY STATE
  if (isEmpty) {
    return (
      <div className="flex flex-col gap-10 py-4">
        <div className="flex flex-col gap-2">
          <span className="text-secondary text-text-muted font-medium">{greeting}</span>
          <h1 className="font-display font-bold text-hero text-text-primary">
            {isSellerWorkspace ? 'Set up your first listing' : 'Find freelance talent'}
          </h1>
          <p className="text-body text-text-muted max-w-[620px]">
            {isSellerWorkspace
              ? 'List your capabilities and minimum terms. Your assistant will evaluate incoming requests and only alert you on exceptions.'
              : 'Describe what you need. Your assistant will search verified specialists and negotiate pricing within your ceiling.'}
          </p>
        </div>

        {/* Hero Prompt Card */}
        <div className="bg-surface border border-border-subtle rounded-surface p-6 md:p-8 flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h2 className="font-display font-semibold text-section text-text-primary">
              {isSellerWorkspace ? 'What do you offer?' : 'What do you need done?'}
            </h2>
            <p className="text-secondary text-text-muted">
              {isSellerWorkspace
                ? 'Name the service, your standard price, and normal delivery window.'
                : 'State the service and requirements in plain words.'}
            </p>
          </div>

          <form onSubmit={handlePromptSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <input
                type="text"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder={
                  isSellerWorkspace
                    ? 'e.g. Next.js SaaS architecture and production deployment'
                    : 'e.g. Modern landing page in Figma for a Lisbon fintech'
                }
                className="w-full h-13 px-4 bg-raised border border-border-subtle rounded-control text-body text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-volt focus:ring-1 focus:ring-volt transition-colors"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-secondary text-text-muted">Examples:</span>
                {(isSellerWorkspace
                  ? ['UI/UX design sprints', 'Fullstack React development', 'API security testing']
                  : ['Figma landing page for fintech', 'Smart contract security audit', 'Next.js migration']
                ).map((chip) => (
                  <Chip
                    key={chip}
                    label={chip}
                    onClick={() => handleChipClick(chip)}
                  />
                ))}
              </div>

              <Button
                type="submit"
                variant="volt"
                size="md"
                icon={<ArrowRight className="w-4 h-4" />}
              >
                {isSellerWorkspace ? 'Create listing' : 'Find sellers'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 2. ACTIVE USER TODAY SCREEN
  return (
    <div className="flex flex-col gap-10 py-4">
      {/* Greeting + Status Sentence */}
      <div className="flex flex-col gap-1">
        <span className="text-secondary text-text-muted font-medium">{greeting}</span>
        <h1 className="font-display font-bold text-hero text-text-primary">
          {statusSentence}
        </h1>
      </div>

      {/* Hero Prompt Panel (Lovable Reference) */}
      <div className="bg-surface border border-border-subtle rounded-surface p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-section text-text-primary">
            {isSellerWorkspace ? 'What do you offer?' : 'What do you need done?'}
          </h2>
          <span className="text-secondary text-text-muted">
            {isSellerWorkspace ? 'New listing' : 'New request'}
          </span>
        </div>

        <form onSubmit={handlePromptSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder={
                  isSellerWorkspace
                    ? 'e.g. Backend API development in Node.js'
                    : 'e.g. Brand identity and design system for Lisbon studio'
                }
                className="w-full h-11 px-3.5 bg-raised border border-border-subtle rounded-control text-body text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-volt focus:ring-1 focus:ring-volt transition-colors"
              />
            </div>
            <Button
              type="submit"
              variant="volt"
              size="md"
              icon={<ArrowRight className="w-4 h-4" />}
              className="shrink-0"
            >
              {isSellerWorkspace ? 'List service' : 'Find talent'}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-secondary text-text-muted">Suggested:</span>
            {(isSellerWorkspace
              ? ['Fullstack architecture', 'Security code audit', 'Mobile React Native app']
              : ['Figma design system', 'Smart contract review', 'Next.js web application']
            ).map((chip) => (
              <Chip
                key={chip}
                label={chip}
                onClick={() => handleChipClick(chip)}
              />
            ))}
          </div>
        </form>
      </div>

      {/* SPLIT INBOX SECTION: LIST ON LEFT, DETAIL PANE ON RIGHT (LINEAR INBOX REFERENCE) */}
      {needsYou.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-display font-semibold text-section text-text-primary">
                Needs you
              </h2>
              <StatusChip label={`${needsYou.length}`} role="needsYou" size="sm" />
            </div>
            <div className="hidden lg:flex items-center gap-2 text-secondary text-text-muted">
              <span>Navigate:</span>
              <kbd className="px-1.5 py-0.5 text-secondary bg-raised border border-border-subtle rounded">J</kbd>
              <kbd className="px-1.5 py-0.5 text-secondary bg-raised border border-border-subtle rounded">K</kbd>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Exception Item List (420px on desktop) */}
            <div className="lg:col-span-5 flex flex-col gap-2.5">
              {needsYou.map((item: any, idx: number) => {
                const isSelected = idx === selectedDecisionIndex;
                const counterpart = formatName(item.counterpartName || item.sellerName || 'Marlow & Finch, Lisbon');
                const price = item.amount || item.currentOffer?.price || 155;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedDecisionIndex(idx);
                      // On mobile screen, open sheet
                      if (window.innerWidth < 1024) {
                        setIsMobileSheetOpen(true);
                      }
                    }}
                    className={`p-4 rounded-surface border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-raised border-volt/80 shadow-sm'
                        : 'bg-surface border-border-subtle hover:border-text-muted/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-semibold text-body text-text-primary truncate">
                        {formatName(item.title)}
                      </span>
                      <span className="font-bold text-body text-text-primary shrink-0">
                        {formatMoney(price)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-secondary text-text-muted">
                      <span>{counterpart}</span>
                      <StatusChip label="Needs OK" role="needsYou" size="sm" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Detail Pane with Decision Card (Desktop) */}
            <div className="hidden lg:block lg:col-span-7">
              {activeDecision && (
                <DecisionCard
                  key={activeDecision.id}
                  title={`${formatName(activeDecision.title)} · ${formatName((activeDecision as any).counterpartName || 'Marlow & Finch, Lisbon')}`}
                  counterpartName={formatName((activeDecision as any).counterpartName || 'Marlow & Finch, Lisbon')}
                  proposedPrice={(activeDecision as any).amount || (activeDecision as any).currentOffer?.price || 155}
                  buyerCeiling={(activeDecision as any).budgetCeiling || (activeDecision as any).buyerCeiling || 150}
                  proposedDays={(activeDecision as any).deliveryDays || (activeDecision as any).currentOffer?.deliveryDays || 7}
                  reasonText={`${formatName((activeDecision as any).counterpartName || 'Marlow & Finch, Lisbon')} asked for ${formatMoney((activeDecision as any).amount || 155)}. Your limit is ${formatMoney((activeDecision as any).budgetCeiling || 150)}.`}
                  suggestionText={`Our suggestion: counter at ${formatMoney(Math.max(((activeDecision as any).budgetCeiling || 150) - 5, ((activeDecision as any).amount || 155) - 10))} for ${(activeDecision as any).deliveryDays || 7}\u00A0days.`}
                  onApprove={() => handleApprove(activeDecision)}
                  onDecline={() => handleDecline(activeDecision)}
                  onCounter={(price, days) => handleCounter(activeDecision, price, days)}
                  isLoading={actionInProgressId === activeDecision.id}
                />
              )}
            </div>
          </div>
        </section>
      )}

      {/* MOBILE SHEET FOR ACTIVE DECISION */}
      {isMobileSheetOpen && activeDecision && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/70 flex items-end"
          onClick={() => setIsMobileSheetOpen(false)}
        >
          <div
            className="w-full max-h-[90vh] bg-surface border-t border-border-subtle rounded-t-surface p-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 border-b border-border-subtle pb-3">
              <span className="font-semibold text-body text-text-primary">Decision Exception</span>
              <button
                type="button"
                onClick={() => setIsMobileSheetOpen(false)}
                className="p-1 text-text-muted hover:text-text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <DecisionCard
              title={`${formatName(activeDecision.title)} · ${formatName((activeDecision as any).counterpartName || 'Marlow & Finch, Lisbon')}`}
              counterpartName={formatName((activeDecision as any).counterpartName || 'Marlow & Finch, Lisbon')}
              proposedPrice={(activeDecision as any).amount || (activeDecision as any).currentOffer?.price || 155}
              buyerCeiling={(activeDecision as any).budgetCeiling || (activeDecision as any).buyerCeiling || 150}
              proposedDays={(activeDecision as any).deliveryDays || (activeDecision as any).currentOffer?.deliveryDays || 7}
              onApprove={() => handleApprove(activeDecision)}
              onDecline={() => handleDecline(activeDecision)}
              onCounter={(price, days) => handleCounter(activeDecision, price, days)}
              isLoading={actionInProgressId === activeDecision.id}
            />
          </div>
        </div>
      )}

      {/* SECTION 2: IN PROGRESS (LIVE STATUS LINE) */}
      {inProgress.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-display font-semibold text-section text-text-primary">
                In progress
              </h2>
              <StatusChip label={`${inProgress.length}`} role="inProgress" size="sm" />
            </div>
            <Link
              to="/app/deals"
              className="text-secondary text-text-muted hover:text-text-primary flex items-center gap-1 font-medium"
            >
              <span>See all deals</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            {inProgress.map((deal: any) => {
              const offerPrice = deal.currentOffer?.price || deal.agreedPrice || deal.estimatedPrice || 140;
              const deliveryDays = deal.currentOffer?.deliveryDays || 5;
              const counterpart = formatName(deal.counterpartName || deal.sellerName || 'Dev Raman, backend contractor');

              return (
                <Link
                  key={deal.id}
                  to={`/app/deals/${deal.id}`}
                  className="block group"
                >
                  <div className="bg-surface border border-border-subtle rounded-surface p-5 hover:border-text-muted/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-control bg-raised border border-border-subtle flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5 text-status-progress" strokeWidth={2} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <StatusChip label="Negotiating" role="inProgress" size="sm" />
                          <span className="text-secondary text-text-muted">· {counterpart}</span>
                        </div>
                        <h3 className="font-display font-semibold text-body text-text-primary group-hover:text-volt transition-colors">
                          {formatName(deal.title)}
                        </h3>
                        <p className="text-secondary text-text-muted mt-0.5">
                          Negotiating terms with seller agent within ceiling…
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:text-right">
                      <div>
                        <span className="font-display font-bold text-[22px] text-text-primary block">
                          {formatMoney(offerPrice)}
                        </span>
                        <span className="text-secondary text-text-muted">
                          {deliveryDays}&nbsp;days delivery
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text-primary transition-colors shrink-0" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 3: HANDLED FOR YOU (LEDGER WITH OVERRIDE/UNDO) */}
      {handledForYou.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-section text-text-primary">
              Handled for you
            </h2>
            <Link
              to="/app/deals?tab=done"
              className="text-secondary text-text-muted hover:text-text-primary flex items-center gap-1 font-medium"
            >
              <span>View past receipts</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-surface border border-border-subtle rounded-surface divide-y divide-border-subtle overflow-hidden">
            {handledForYou.slice(0, 5).map((deal: any) => {
              const paidAmount = deal.finalPrice || deal.amount || 137;
              const counterpart = formatName(deal.counterpartName || deal.sellerName || 'Dev Raman, backend contractor');

              return (
                <div
                  key={deal.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-raised/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-status-handled shrink-0" strokeWidth={2} />
                    <div>
                      <span className="font-medium text-body text-text-primary block">
                        {formatName(deal.title)}
                      </span>
                      <span className="text-secondary text-text-muted">
                        Settled with {counterpart} · {formatDate(deal.updatedAt || deal.completedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-body text-text-primary">
                      {formatMoney(paidAmount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOverride(deal.id)}
                      className="inline-flex items-center gap-1 text-secondary text-text-muted hover:text-text-primary px-2.5 py-1 rounded-control border border-border-subtle hover:bg-raised cursor-pointer transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Override</span>
                    </button>
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
