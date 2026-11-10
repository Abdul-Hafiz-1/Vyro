import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
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
  X,
  Plus,
  Handshake,
  Store,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { StatusChip } from '../../components/common/StatusChip';
import { Card } from '../../components/common/Card';
import { Chip } from '../../components/common/Chip';
import { DecisionCard } from '../../components/common/DecisionCard';
import { EmptyState } from '../../components/common/EmptyState';
import { HomePromptBox } from '../../components/home/HomePromptBox';
import { formatMoney, formatCents, formatDate, formatName } from '../../lib/present';
import { EASE_STANDARD } from '../../lib/motion';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, isSellerWorkspace } = useAuth();
  const focusPrompt = new URLSearchParams(location.search).get('focusPrompt') === '1';

  const [promptText, setPromptText] = useState('');
  const [selectedDecisionIndex, setSelectedDecisionIndex] = useState(0);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [localDismissedCoach, setLocalDismissedCoach] = useState<string[]>([]);

  const { data: homeData, isLoading } = useQuery({
    queryKey: ['home'],
    queryFn: api.getHome,
    refetchInterval: 8000
  });

  const needsSellerSetupCheck = isSellerWorkspace || Boolean(user?.capabilities?.selling);
  const { data: sellerPayoutSetup } = useQuery({
    queryKey: ['sellerPayoutAccount'],
    queryFn: api.getSellerPayoutAccount,
    enabled: needsSellerSetupCheck,
    staleTime: 20000,
  });

  useEffect(() => {
    if (focusPrompt) {
      const el = document.getElementById('home-prompt-input') as HTMLTextAreaElement | null;
      if (el) el.focus();
    }
  }, [focusPrompt, isLoading]);

  const dismissedCoachMarks = Array.from(
    new Set([...(user?.coachMarksDismissed || []), ...localDismissedCoach])
  );

  const dismissCoachMark = async (id: string) => {
    const next = Array.from(new Set([...dismissedCoachMarks, id]));
    setLocalDismissedCoach(next);
    try {
      await api.updateProfile({ coachMarksDismissed: next });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    } catch {
      // keep locally dismissed even if transient network error
    }
  };

  const activeCoachMark =
    user?.onboardingCompleted
      ? [
          {
            id: 'homeBox',
            title: 'Tip 1 of 3 · Start in plain words',
            text: isSellerWorkspace
              ? 'Describe any service you offer above to draft and publish a listing in seconds.'
              : 'Describe what you need above and press Enter — AI structures the brief and matches sellers.',
          },
          {
            id: 'workspaceSwitch',
            title: 'Tip 2 of 3 · Switch Buying & Selling anytime',
            text: 'Use the Buying | Selling switch in the top bar whenever you want to switch between hiring and offering services.',
          },
          {
            id: 'needsInbox',
            title: 'Tip 3 of 3 · Quick human approvals',
            text: 'Whenever an offer crosses your comfort limit, it appears in Needs you with one-click Approve, Counter, or Decline.',
          },
        ].find((m) => !dismissedCoachMarks.includes(m.id))
      : undefined;

  const needsYou = homeData?.needsYou || [];
  const inProgress = homeData?.inProgress || [];
  const handledForYou = homeData?.handledForYou || [];
  const incomingRequests = homeData?.incomingRequests || [];
  const cancellationRequests = homeData?.cancellationRequests || [];
  const sellerProjectsSummary = homeData?.sellerProjectsSummary;
  const sellerCapacity = homeData?.sellerCapacity;

  const isEmpty =
    needsYou.length === 0 &&
    inProgress.length === 0 &&
    handledForYou.length === 0 &&
    incomingRequests.length === 0 &&
    cancellationRequests.length === 0 &&
    (!isSellerWorkspace || ((sellerProjectsSummary?.activeCount || 0) === 0 && (sellerProjectsSummary?.releasedCents || 0) === 0));

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
  const totalNeedsAction = isSellerWorkspace
    ? needsYou.length + incomingRequests.length + cancellationRequests.length
    : needsYou.length;
  const statusSentence = totalNeedsAction > 0
    ? `${totalNeedsAction} ${totalNeedsAction === 1 ? 'thing needs' : 'things need'} your decision`
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

  const handleUndo = async (item: any) => {
    try {
      await api.undoReviewItem(item.id);
      toast.info(`Undid decision for ${formatName(item.title)}.`);
      queryClient.invalidateQueries({ queryKey: ['home'] });
    } catch (err: any) {
      toast.error(err.message || 'Could not undo decision.');
    }
  };

  const handleOverride = (dealId: string) => {
    navigate(`/app/deals/${dealId}`);
  };

  const totalDeals = needsYou.length + inProgress.length;
  const dealsBadge = needsYou.length > 0 
    ? `${needsYou.length} need OK` 
    : `${totalDeals} active`;

  const quickActions = isSellerWorkspace
    ? [
        {
          title: 'Create a listing',
          desc: 'Publish your rates, scope, and SLA boundaries',
          to: '/app/listings/new',
          icon: Plus,
          badge: 'New',
          badgeVolt: true,
        },
        {
          title: 'My projects',
          desc: 'Incoming buyer requests, active work, and deliverables',
          to: '/app/projects',
          icon: Handshake,
          badge: dealsBadge,
          badgeVolt: totalNeedsAction > 0,
        },
        {
          title: 'Listings',
          desc: 'Manage your active services and public rates',
          to: '/app/listings',
          icon: Store,
          badge: 'Active',
          badgeVolt: false,
        },
        {
          title: 'Payments',
          desc: 'Delivered milestone earnings and payout logs',
          to: '/app/transactions',
          icon: CreditCard,
          badge: formatMoney(homeData?.userLimits?.balance || 0),
          badgeVolt: false,
        },
      ]
    : [
        {
          title: 'Start a request',
          desc: 'Tell your agent what to find and negotiate',
          to: '/app/requests/new',
          icon: Plus,
          badge: 'New',
          badgeVolt: true,
        },
        {
          title: 'My projects',
          desc: 'Proposals, live negotiations, and deliverables',
          to: '/app/projects',
          icon: Handshake,
          badge: dealsBadge,
          badgeVolt: needsYou.length > 0,
        },
        {
          title: 'Marketplace',
          desc: 'Browse verified engineering and design talent',
          to: '/app/marketplace',
          icon: Store,
          badge: 'Explore',
          badgeVolt: false,
        },
        {
          title: 'Payments',
          desc: 'Escrow funds, transactions, and invoices',
          to: '/app/transactions',
          icon: CreditCard,
          badge: formatMoney(homeData?.userLimits?.balance || 2500),
          badgeVolt: false,
        },
      ];

  const renderQuickActions = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {quickActions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.title}
            to={action.to}
            className="bg-surface border border-border-subtle hover:border-volt/60 rounded-surface p-4 sm:p-5 flex flex-col justify-between gap-3 transition-all hover:bg-raised/40 group cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="w-9 h-9 rounded-control bg-raised border border-border-subtle flex items-center justify-center text-text-primary group-hover:text-volt transition-colors">
                <Icon className="w-4.5 h-4.5" strokeWidth={2.2} />
              </div>
              <span className={`px-2 py-0.5 rounded-chip text-secondary font-semibold border ${
                action.badgeVolt
                  ? 'bg-volt/15 text-volt border-volt/30'
                  : 'bg-raised text-text-muted border-border-subtle group-hover:text-text-primary'
              }`}>
                {action.badge}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-display font-semibold text-[15px] text-text-primary group-hover:text-volt transition-colors flex items-center justify-between">
                <span>{action.title}</span>
                <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-volt group-hover:translate-x-0.5 transition-all" />
              </span>
              <p className="text-secondary text-text-muted leading-snug line-clamp-2">
                {action.desc}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 py-4 opacity-70">
        <div className="h-6 w-36 bg-raised rounded-control" />
        <div className="h-10 w-72 bg-raised rounded-control" />
        <div className="h-44 w-full bg-surface border border-border-subtle rounded-surface" />
      </div>
    );
  }

  const showSellerPayoutBanner =
    needsSellerSetupCheck &&
    sellerPayoutSetup &&
    sellerPayoutSetup.account?.status !== 'ready';

  const renderSellerPayoutBanner = () =>
    showSellerPayoutBanner ? (
      <Card className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-raised border-border-subtle">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-volt shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-body text-text-primary">
              Add where to send your earnings
            </span>
            <p className="text-secondary text-text-muted">
              Add your PayPal email so buyers can confirm and fund your deals.
            </p>
          </div>
        </div>
        <Link to="/app/transactions" className="shrink-0">
          <Button variant="volt" size="sm">
            Set up payout email
          </Button>
        </Link>
      </Card>
    ) : null;

  const renderCoachMark = () =>
    activeCoachMark ? (
      <div
        data-coachmark={activeCoachMark.id}
        className="p-4 rounded-surface bg-raised/90 border border-volt/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-volt shrink-0 mt-1" />
          <div className="flex flex-col gap-0.5">
            <span className="text-secondary font-semibold text-text-primary">
              {activeCoachMark.title}
            </span>
            <span className="text-secondary text-text-muted">{activeCoachMark.text}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => dismissCoachMark(activeCoachMark.id)}
          className="h-8 px-3 rounded-control border border-border-subtle bg-surface text-secondary font-medium text-text-primary hover:bg-raised cursor-pointer shrink-0 self-end sm:self-center"
        >
          Got it
        </button>
      </div>
    ) : null;

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
              : 'Describe what you need. Your assistant will search verified specialists and negotiate pricing within your budget.'}
          </p>
        </div>

        {renderSellerPayoutBanner()}

        {/* 4 Quick Action Cards */}
        {renderQuickActions()}

        {/* Hero Prompt Box (Interactive AI-driven brief & matching) */}
        <HomePromptBox isSeller={isSellerWorkspace} autoFocusPrompt={focusPrompt} />

        {renderCoachMark()}
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

      {renderSellerPayoutBanner()}

      {/* 4 Quick Action Cards */}
      {renderQuickActions()}

      {/* Hero Prompt Box (Interactive AI-driven brief & matching) */}
      <HomePromptBox isSeller={isSellerWorkspace} autoFocusPrompt={focusPrompt} />

      {renderCoachMark()}

      {/* SELLER "YOUR PROJECTS" STRIP & INCOMING REQUESTS / CANCELLATIONS */}
      {isSellerWorkspace && sellerProjectsSummary && (
        <Card className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <span className="text-secondary text-text-muted block">Your projects</span>
              <span className="font-display font-bold text-[18px] text-text-primary">
                {sellerProjectsSummary.activeCount} of {sellerProjectsSummary.maxConcurrent} in progress
              </span>
            </div>
            <div>
              <span className="text-secondary text-text-muted block">Due soon</span>
              <span className="font-semibold text-body text-text-primary">
                {sellerProjectsSummary.dueSoonCount} due within 48h
              </span>
            </div>
            <div>
              <span className="text-secondary text-text-muted block">Held / Released</span>
              <span className="font-semibold text-body text-text-primary">
                {formatCents(sellerProjectsSummary.heldCents)} held · {formatCents(sellerProjectsSummary.releasedCents)} released
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {sellerCapacity?.isFull && <StatusChip label="At capacity" role="needsYou" size="sm" />}
            <Link to="/app/projects">
              <Button variant="secondary" size="sm">Open Projects</Button>
            </Link>
          </div>
        </Card>
      )}

      {isSellerWorkspace && incomingRequests.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h2 className="font-display font-semibold text-section text-text-primary">New buyer requests</h2>
              <StatusChip label={`${incomingRequests.length}`} role="needsYou" size="sm" />
            </div>
            <Link to="/app/projects" className="text-secondary text-text-muted hover:text-text-primary">
              View all in Projects
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {incomingRequests.map((reqItem) => (
              <Card key={reqItem.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-semibold text-body text-text-primary block truncate">{reqItem.title}</span>
                  <span className="text-secondary text-text-muted">
                    From {reqItem.buyerName} · {formatMoney(reqItem.proposedPrice)} · {reqItem.deadlineDays}d
                  </span>
                </div>
                <Button variant="volt" size="sm" onClick={() => navigate(`/app/projects/${reqItem.negotiationId}`)}>
                  Review
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}

      {isSellerWorkspace && cancellationRequests.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display font-semibold text-section text-text-primary">Cancellation requests</h2>
          <div className="flex flex-col gap-3">
            {cancellationRequests.map((cr) => (
              <Card key={cr.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-status-needs/40">
                <div>
                  <span className="font-semibold text-body text-text-primary block">
                    {cr.projectTitle || 'Active project'} — {cr.buyerName} asked to cancel
                  </span>
                  <span className="text-secondary text-text-muted">Reason: &ldquo;{cr.reason}&rdquo;</span>
                </div>
                <Button variant="volt" size="sm" onClick={() => navigate(`/app/projects/${cr.dealId}`)}>
                  Respond
                </Button>
              </Card>
            ))}
          </div>
        </section>
      )}

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
                  buyerBudget={(activeDecision as any).buyerBudget || (activeDecision as any).budgetCeiling || (activeDecision as any).buyerCeiling || 150}
                  buyerHardCap={(activeDecision as any).buyerHardCap || Math.round(((activeDecision as any).buyerBudget || (activeDecision as any).budgetCeiling || 150) * 1.1)}
                  proposedDays={(activeDecision as any).deliveryDays || (activeDecision as any).currentOffer?.deliveryDays || 7}
                  reasons={Array.isArray((activeDecision as any).reasons) && (activeDecision as any).reasons.length > 0
                    ? (activeDecision as any).reasons
                    : [`${formatName((activeDecision as any).counterpartName || 'Seller')} asked for ${formatMoney((activeDecision as any).amount || 155)}.`, `Your budget is ${formatMoney((activeDecision as any).buyerBudget || (activeDecision as any).budgetCeiling || 150)}.`]}
                  reasonText={(activeDecision as any).shortSummary || `${formatName((activeDecision as any).counterpartName || 'Marlow & Finch, Lisbon')} asked for ${formatMoney((activeDecision as any).amount || 155)}. Your budget is ${formatMoney((activeDecision as any).buyerBudget || (activeDecision as any).budgetCeiling || 150)}.`}
                  suggestionText={`Our suggestion: counter at ${formatMoney(Math.max(((activeDecision as any).buyerBudget || (activeDecision as any).budgetCeiling || 150) - 5, ((activeDecision as any).amount || 155) - 10))} for ${(activeDecision as any).deliveryDays || 7}\u00A0days.`}
                  onApprove={() => handleApprove(activeDecision)}
                  onDecline={() => handleDecline(activeDecision)}
                  onCounter={(price, days) => handleCounter(activeDecision, price, days)}
                  onUndo={() => handleUndo(activeDecision)}
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
              buyerBudget={(activeDecision as any).buyerBudget || (activeDecision as any).budgetCeiling || (activeDecision as any).buyerCeiling || 150}
              buyerHardCap={(activeDecision as any).buyerHardCap || Math.round(((activeDecision as any).buyerBudget || (activeDecision as any).budgetCeiling || 150) * 1.1)}
              proposedDays={(activeDecision as any).deliveryDays || (activeDecision as any).currentOffer?.deliveryDays || 7}
              reasons={Array.isArray((activeDecision as any).reasons) && (activeDecision as any).reasons.length > 0
                ? (activeDecision as any).reasons
                : [`${formatName((activeDecision as any).counterpartName || 'Seller')} asked for ${formatMoney((activeDecision as any).amount || 155)}.`, `Your budget is ${formatMoney((activeDecision as any).buyerBudget || (activeDecision as any).budgetCeiling || 150)}.`]}
              onApprove={() => handleApprove(activeDecision)}
              onDecline={() => handleDecline(activeDecision)}
              onCounter={(price, days) => handleCounter(activeDecision, price, days)}
              onUndo={() => handleUndo(activeDecision)}
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
              to="/app/projects"
              className="text-secondary text-text-muted hover:text-text-primary flex items-center gap-1 font-medium"
            >
              <span>See all projects</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            {inProgress.map((deal: any, idx: number) => {
              const offerPrice = deal.currentOffer?.price || deal.agreedPrice || deal.estimatedPrice || 140;
              const deliveryDays = deal.currentOffer?.deliveryDays || 5;
              const counterpart = formatName(deal.counterpartName || deal.sellerName || 'Dev Raman, backend contractor');

              return (
                <motion.div
                  key={deal.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.2,
                    delay: Math.min(idx, 7) * 0.04,
                    ease: EASE_STANDARD
                  }}
                >
                  <Link
                    to={`/app/projects/${deal.id}`}
                    className="block group"
                  >
                    <div className="bg-surface border border-border-subtle rounded-surface p-5 hover:border-text-muted/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-control bg-raised border border-border-subtle flex items-center justify-center shrink-0">
                          <span className="vyro-live-indicator" aria-hidden="true">
                            <span />
                            <span />
                            <span />
                          </span>
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
                            Negotiating terms with seller agent within your budget…
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
                </motion.div>
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
              to="/app/projects"
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
