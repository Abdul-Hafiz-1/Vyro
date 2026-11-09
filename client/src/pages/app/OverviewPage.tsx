import React, { useState, useEffect, useCallback } from 'react';
import { OverviewSkeleton } from '../../components/common/Skeleton';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Check,
  X,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Pause,
  Play,
  Sliders,
  DollarSign,
  Info,
  Clock,
  Sparkles
} from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useAuth, getInitials } from '../../context/AuthContext';
import { useHomeEvents } from '../../hooks/useHomeEvents';
import { HomeNeedsYouItem, HomeHandledItem, HomeInProgressItem } from '../../types';

interface ActionReceipt {
  itemId: string;
  negotiationId: string;
  action: 'approve' | 'decline' | 'counter';
  title: string;
  price: number;
  expiresAt: number;
}

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isBuyerWorkspace } = useAuth();

  // Listen to SSE server-sent events for instant cache invalidation
  useHomeEvents();

  const { data: homeData, isLoading, error } = useQuery({
    queryKey: ['home'],
    queryFn: api.getHome,
    refetchOnWindowFocus: true
  });

  // State for 10-second undo receipts
  const [receipts, setReceipts] = useState<Record<string, ActionReceipt>>({});
  const [, setTimerTick] = useState(0);

  // Active keyboard card focus
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  // Inline counteroffer state
  const [activeCounterId, setActiveCounterId] = useState<string | null>(null);
  const [counterPriceInput, setCounterPriceInput] = useState<string>('');

  // Inline override state
  const [activeOverrideId, setActiveOverrideId] = useState<string | null>(null);
  const [overrideNoteInput, setOverrideNoteInput] = useState<string>('');
  const [suggestRuleCheckbox, setSuggestRuleCheckbox] = useState<boolean>(true);

  // Ticking timer for undo countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimerTick(t => t + 1);
      // Clean up expired receipts
      const now = Date.now();
      setReceipts(prev => {
        let changed = false;
        const next: Record<string, ActionReceipt> = {};
        for (const [k, v] of Object.entries(prev)) {
          if (v.expiresAt > now) {
            next[k] = v;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const needsItems = (homeData?.needsYou || []).filter(item => !receipts[item.id]);

  // Actions
  const handleApprove = useCallback(async (item: HomeNeedsYouItem) => {
    try {
      await api.approveReviewItem(item.id, 'Approved via human decision queue.');
      const receipt: ActionReceipt = {
        itemId: item.id,
        negotiationId: item.negotiationId,
        action: 'approve',
        title: item.title,
        price: item.proposedPrice,
        expiresAt: Date.now() + 10000
      };
      setReceipts(prev => ({ ...prev, [item.id]: receipt }));
      toast.success(`Approved $${item.proposedPrice} for "${item.title}".`);
      queryClient.invalidateQueries({ queryKey: ['home'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve deal.');
    }
  }, [queryClient]);

  const handleDecline = useCallback(async (item: HomeNeedsYouItem) => {
    try {
      await api.declineReviewItem(item.id, 'Declined via human decision queue.');
      const receipt: ActionReceipt = {
        itemId: item.id,
        negotiationId: item.negotiationId,
        action: 'decline',
        title: item.title,
        price: item.proposedPrice,
        expiresAt: Date.now() + 10000
      };
      setReceipts(prev => ({ ...prev, [item.id]: receipt }));
      toast.info(`Declined deal for "${item.title}".`);
      queryClient.invalidateQueries({ queryKey: ['home'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to decline deal.');
    }
  }, [queryClient]);

  const handleCounterSubmit = useCallback(async (item: HomeNeedsYouItem) => {
    const numericPrice = parseFloat(counterPriceInput);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      toast.error('Please enter a valid counteroffer price.');
      return;
    }
    try {
      await api.counterReviewItem(item.id, numericPrice);
      const receipt: ActionReceipt = {
        itemId: item.id,
        negotiationId: item.negotiationId,
        action: 'counter',
        title: item.title,
        price: numericPrice,
        expiresAt: Date.now() + 10000
      };
      setReceipts(prev => ({ ...prev, [item.id]: receipt }));
      setActiveCounterId(null);
      setCounterPriceInput('');
      toast.success(`Counteroffer of $${numericPrice} dispatched.`);
      queryClient.invalidateQueries({ queryKey: ['home'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit counteroffer.');
    }
  }, [counterPriceInput, queryClient]);

  const handleOverrideSubmit = useCallback(async (item: HomeNeedsYouItem) => {
    if (!overrideNoteInput.trim()) {
      toast.error('Please provide a short reason for this policy override.');
      return;
    }
    try {
      await api.overrideReviewItem(item.id, 'override_approve', overrideNoteInput.trim(), suggestRuleCheckbox);
      setActiveOverrideId(null);
      setOverrideNoteInput('');
      toast.success('Override recorded. Suggested policy adjustment logged for admin review.');
      queryClient.invalidateQueries({ queryKey: ['home'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to log override.');
    }
  }, [overrideNoteInput, suggestRuleCheckbox, queryClient]);

  const handleUndoReceipt = useCallback((receipt: ActionReceipt) => {
    setReceipts(prev => {
      const next = { ...prev };
      delete next[receipt.itemId];
      return next;
    });
    toast.info(`Action for "${receipt.title}" undone.`);
    queryClient.invalidateQueries({ queryKey: ['home'] });
  }, [queryClient]);

  const handleToggleAutomationPause = async () => {
    const currentPaused = Boolean(homeData?.userLimits?.isAutomationPaused);
    try {
      await api.setAutomationPaused(!currentPaused);
      toast.success(
        !currentPaused
          ? 'Automation paused: all deals will route to human review.'
          : 'Automation resumed: autonomous decisions active.'
      );
      queryClient.invalidateQueries({ queryKey: ['home'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update automation state.');
    }
  };

  // Keyboard navigation shortcuts: J/K to move, A to approve, D to decline, C to counter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (!needsItems || needsItems.length === 0) return;

      const currentItem = needsItems[focusedIndex] || needsItems[0];

      if (e.key === 'j' || e.key === 'J' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, needsItems.length - 1));
      } else if (e.key === 'k' || e.key === 'K' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        if (currentItem) handleApprove(currentItem);
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        if (currentItem) handleDecline(currentItem);
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        if (currentItem) {
          setActiveCounterId(currentItem.id);
          setCounterPriceInput(String(currentItem.buyerMaxBudget || currentItem.userAutoLimit));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [needsItems, focusedIndex, handleApprove, handleDecline]);

  if (isLoading) {
    return <OverviewSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6 rounded-surface bg-vyro-surface border border-status-rejected/30 text-vyro-text">
        <h2 className="text-base font-semibold text-status-rejected mb-2">Unable to connect to VYRO engine</h2>
        <p className="text-sm text-vyro-subtle mb-4">{(error as any)?.message || 'Network error'}</p>
        <Button variant="secondary" onClick={() => queryClient.invalidateQueries({ queryKey: ['home'] })}>
          Retry Connection
        </Button>
      </div>
    );
  }

  const statusSentence = homeData?.statusSentence || 'Everything is handled.';
  const userLimits = homeData?.userLimits || {
    autoApprovalLimit: 200,
    dailyBudgetCap: 500,
    balance: 2500,
    isAutomationPaused: false
  };
  const stats = homeData?.stats || {
    todaySpend: 0,
    needsCount: 0,
    inProgressCount: 0,
    handledCount: 0
  };
  const isPaused = Boolean(userLimits.isAutomationPaused);
  const activeReceiptsList = Object.values(receipts);

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-16">
      {/* 1. TOP STATUS BAR: One plain sentence is the whole status */}
      <header className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-vyro-text tracking-tight">
              {statusSentence}
            </h1>
            <p className="text-sm text-vyro-subtle mt-1">
              AI handles search, negotiation, and payments. Humans handle only exceptions.
            </p>
          </div>

          {/* Quick Controls & Limits */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleToggleAutomationPause}
              aria-label={isPaused ? 'Resume autonomous actions' : 'Pause autonomous actions'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-control transition-colors ${
                isPaused
                  ? 'bg-status-needs/15 text-status-needs border border-status-needs/30 hover:bg-status-needs/25'
                  : 'bg-vyro-surface text-vyro-subtle border border-vyro-line hover:text-vyro-text'
              }`}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              {isPaused ? 'Automation Paused' : 'Pause Switch'}
            </button>

            <Link
              to="/app/rules"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-control bg-vyro-surface text-vyro-subtle border border-vyro-line hover:text-vyro-text transition-colors"
              title="Edit Auto-Approval Limits & Rules"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Limit: ${userLimits.autoApprovalLimit}</span>
            </Link>
          </div>
        </div>

        {/* Quiet limit telemetry strip */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-vyro-subtle border-t border-vyro-line pt-3">
          <span>
            Daily budget cap: <strong className="text-vyro-text tabular-nums">${stats.todaySpend}</strong> / ${userLimits.dailyBudgetCap}
          </span>
          <span className="text-vyro-line">·</span>
          <span>
            Available balance: <strong className="text-vyro-text tabular-nums">${userLimits.balance.toLocaleString()}</strong>
          </span>
          <span className="text-vyro-line">·</span>
          <span>
            Auto-approved today: <strong className="text-status-handled tabular-nums">{stats.handledCount}</strong>
          </span>
          {isPaused && (
            <>
              <span className="text-vyro-line">·</span>
              <span className="text-status-needs font-medium">All deals routed to review</span>
            </>
          )}
        </div>
      </header>

      {/* 2. SECTION A: NEEDS YOU (The product surface) */}
      <section aria-label="Review Queue" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-vyro-text tracking-tight">Needs you</h2>
            {needsItems.length > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-status-needs/15 text-status-needs rounded-full tabular-nums">
                {needsItems.length}
              </span>
            )}
          </div>
          {needsItems.length > 0 && (
            <span className="text-xs text-vyro-subtle hidden sm:inline">
              Shortcuts: <kbd className="px-1.5 py-0.5 bg-vyro-surface border border-vyro-line rounded text-[11px]">J</kbd>/<kbd className="px-1.5 py-0.5 bg-vyro-surface border border-vyro-line rounded text-[11px]">K</kbd> move · <kbd className="px-1.5 py-0.5 bg-vyro-surface border border-vyro-line rounded text-[11px]">A</kbd> approve · <kbd className="px-1.5 py-0.5 bg-vyro-surface border border-vyro-line rounded text-[11px]">D</kbd> decline · <kbd className="px-1.5 py-0.5 bg-vyro-surface border border-vyro-line rounded text-[11px]">C</kbd> counter
            </span>
          )}
        </div>

        {/* Undo receipts banner if any action was recently taken */}
        {activeReceiptsList.length > 0 && (
          <div className="space-y-2">
            {activeReceiptsList.map(r => {
              const secondsLeft = Math.max(1, Math.ceil((r.expiresAt - Date.now()) / 1000));
              return (
                <div
                  key={r.itemId}
                  className="flex items-center justify-between px-4 py-2.5 rounded-control bg-vyro-surface border border-status-handled/30 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-status-handled" />
                    <span className="text-vyro-text">
                      {r.action === 'approve' && `Approved $${r.price} for "${r.title}".`}
                      {r.action === 'decline' && `Declined proposal for "${r.title}".`}
                      {r.action === 'counter' && `Counteroffer of $${r.price} dispatched for "${r.title}".`}
                    </span>
                  </div>
                  <button
                    onClick={() => handleUndoReceipt(r)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-vyro-accent hover:underline focus:outline-none"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Undo ({secondsLeft}s)
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* List of Needs You Cards */}
        {needsItems.length === 0 ? (
          <div className="p-8 rounded-surface bg-vyro-surface border border-vyro-line text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-status-handled/10 text-status-handled flex items-center justify-center mx-auto mb-2">
              <Check className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-vyro-text">
              {stats.needsCount === 0 && stats.inProgressCount === 0 && stats.handledCount === 0
                ? 'Welcome to your workspace'
                : 'Queue is clear'}
            </h3>
            <p className="text-xs text-vyro-subtle max-w-sm mx-auto">
              {stats.needsCount === 0 && stats.inProgressCount === 0 && stats.handledCount === 0
                ? (isBuyerWorkspace
                    ? 'Start by posting your first purchasing request to dispatch an autonomous buyer agent.'
                    : 'Publish your first commercial listing to receive autonomous procurement requests.')
                : 'No commercial proposals currently require human intervention. Your autonomous agents are operating within your verified rules.'}
            </p>
            {stats.needsCount === 0 && stats.inProgressCount === 0 && stats.handledCount === 0 && (
              <div className="pt-1">
                {isBuyerWorkspace ? (
                  <Link
                    to="/app/requests/new"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-control bg-vyro-text text-vyro-bg hover:opacity-90 transition-opacity"
                  >
                    Post your first request
                  </Link>
                ) : (
                  <Link
                    to="/app/listings"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-control bg-vyro-text text-vyro-bg hover:opacity-90 transition-opacity"
                  >
                    Create your first listing
                  </Link>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {needsItems.map((item, idx) => {
              const isFocused = idx === focusedIndex;
              const isCountering = activeCounterId === item.id;
              const isOverriding = activeOverrideId === item.id;
              const delta = item.proposedPrice - item.userAutoLimit;

              return (
                <article
                  key={item.id}
                  onClick={() => setFocusedIndex(idx)}
                  className={`p-5 rounded-surface bg-vyro-surface border transition-all ${
                    isFocused
                      ? 'border-vyro-accent/60 ring-1 ring-vyro-accent/60 shadow-md'
                      : 'border-vyro-line hover:border-vyro-subtle/50'
                  }`}
                >
                  {/* Card Header: Request Title & Counterparty (Never raw IDs) */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/app/deals/${item.negotiationId}`}
                          className="text-base font-medium text-vyro-text hover:text-vyro-accent focus:outline-none"
                        >
                          {item.title}
                        </Link>
                        {item.urgency === 'high' ? (
                          <Badge variant="error" size="sm">Urgent</Badge>
                        ) : (
                          <Badge variant="warning" size="sm">Review Required</Badge>
                        )}
                      </div>

                      {/* Seller Info */}
                      <div className="flex items-center gap-2 text-xs text-vyro-subtle">
                        <div className="w-5 h-5 rounded-full bg-vyro-line flex items-center justify-center text-[10px] font-semibold text-vyro-text">
                          {getInitials(item.sellerName)}
                        </div>
                        <span className="text-vyro-text font-medium">{item.sellerName}</span>
                        {item.sellerVerification === 'verified' && (
                          <span className="inline-flex items-center gap-0.5 text-[11px] text-status-handled">
                            <ShieldCheck className="w-3 h-3" />
                            Verified
                          </span>
                        )}
                        <span>·</span>
                        <span>Round {item.currentRound}</span>
                        <span>·</span>
                        <span>{item.deliveryDays}d turnaround</span>
                      </div>
                    </div>

                    {/* Price against Auto-Limit */}
                    <div className="text-right sm:self-start">
                      <div className="text-lg font-semibold text-vyro-text tabular-nums">
                        ${item.proposedPrice}
                      </div>
                      <div className="text-xs text-vyro-subtle tabular-nums">
                        {delta > 0 ? (
                          <span className="text-status-needs">+${delta} above limit (${item.userAutoLimit})</span>
                        ) : (
                          <span>Within budget (${item.buyerMaxBudget})</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Why the AI stopped: One Plain Sentence */}
                  <div className="mb-4 p-3 rounded-control bg-status-needs/10 border border-status-needs/20 text-xs text-vyro-text">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-status-needs shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-status-needs">{item.whyStopped}</p>
                        <p className="text-vyro-subtle mt-0.5">
                          AI recommendation: <strong className="text-vyro-text">{item.aiRecommendation === 'approve' ? 'Approve' : item.aiRecommendation === 'adjust_price' ? 'Counter' : 'Decline'}</strong> · Confidence score: {(item.confidence * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Inline Counteroffer Input Box */}
                  {isCountering && (
                    <div className="mb-4 p-3 rounded-control bg-vyro-bg border border-vyro-line space-y-2">
                      <label htmlFor={`counter-${item.id}`} className="block text-xs font-medium text-vyro-text">
                        Counteroffer price for {item.sellerName}:
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1 max-w-xs">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-vyro-subtle text-xs">$</span>
                          <input
                            id={`counter-${item.id}`}
                            type="number"
                            value={counterPriceInput}
                            onChange={e => setCounterPriceInput(e.target.value)}
                            placeholder={String(item.buyerMaxBudget)}
                            className="w-full pl-7 pr-3 py-1.5 rounded-control bg-vyro-surface border border-vyro-line text-xs text-vyro-text focus:outline-none focus:ring-1 focus:ring-vyro-accent tabular-nums"
                            autoFocus
                          />
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleCounterSubmit(item)}
                        >
                          Send Counter
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveCounterId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Inline Override Input Box */}
                  {isOverriding && (
                    <div className="mb-4 p-3 rounded-control bg-vyro-bg border border-vyro-line space-y-2">
                      <label htmlFor={`override-${item.id}`} className="block text-xs font-medium text-vyro-text">
                        Override note (fed back into policy suggestions):
                      </label>
                      <textarea
                        id={`override-${item.id}`}
                        rows={2}
                        value={overrideNoteInput}
                        onChange={e => setOverrideNoteInput(e.target.value)}
                        placeholder="e.g. Approve this exception because delivery timeline is critical this week."
                        className="w-full px-3 py-2 rounded-control bg-vyro-surface border border-vyro-line text-xs text-vyro-text focus:outline-none focus:ring-1 focus:ring-vyro-accent"
                        autoFocus
                      />
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs text-vyro-subtle cursor-pointer">
                          <input
                            type="checkbox"
                            checked={suggestRuleCheckbox}
                            onChange={e => setSuggestRuleCheckbox(e.target.checked)}
                            className="rounded border-vyro-line text-vyro-accent focus:ring-0"
                          />
                          <span>Suggest threshold update for future deals</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOverrideSubmit(item)}
                          >
                            Save Override
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveOverrideId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-vyro-line/50">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleApprove(item)}
                        aria-label={`Approve deal for ${item.title}`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve (${item.proposedPrice})
                      </Button>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setActiveCounterId(isCountering ? null : item.id);
                          setCounterPriceInput(String(item.buyerMaxBudget || item.userAutoLimit));
                        }}
                        aria-label={`Counter deal for ${item.title}`}
                      >
                        Counter
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDecline(item)}
                        className="text-status-rejected hover:bg-status-rejected/10"
                        aria-label={`Decline deal for ${item.title}`}
                      >
                        <X className="w-3.5 h-3.5" />
                        Decline
                      </Button>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setActiveOverrideId(isOverriding ? null : item.id)}
                        className="text-xs text-vyro-subtle hover:text-vyro-text hover:underline focus:outline-none"
                      >
                        Override note
                      </button>
                      <Link
                        to={`/app/deals/${item.negotiationId}`}
                        className="inline-flex items-center gap-1 text-xs text-vyro-subtle hover:text-vyro-text"
                      >
                        Details
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. SECTION B: IN PROGRESS (Compact live rows) */}
      <section aria-label="Active Deals" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-vyro-text tracking-tight">In progress</h2>
            {(homeData?.inProgress || []).length > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-vyro-line/50 text-vyro-text rounded-full tabular-nums">
                {homeData?.inProgress.length}
              </span>
            )}
          </div>
          <Link
            to="/app/deals"
            className="text-xs text-vyro-subtle hover:text-vyro-text transition-colors inline-flex items-center gap-1"
          >
            All deals
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {(homeData?.inProgress || []).length === 0 ? (
          <div className="p-4 rounded-surface bg-vyro-surface border border-vyro-line text-xs text-vyro-subtle">
            No deals actively negotiating right now.
          </div>
        ) : (
          <div className="rounded-surface bg-vyro-surface border border-vyro-line divide-y divide-vyro-line overflow-hidden">
            {homeData?.inProgress.map(neg => (
              <Link
                key={neg.id}
                to={`/app/deals/${neg.id}`}
                className="flex items-center justify-between p-3.5 hover:bg-vyro-line/20 transition-colors group"
              >
                <div className="space-y-0.5 min-w-0 pr-4">
                  <div className="text-sm font-medium text-vyro-text group-hover:text-vyro-accent transition-colors truncate">
                    {neg.title}
                  </div>
                  <div className="text-xs text-vyro-subtle flex items-center gap-2">
                    <span>{neg.sellerName}</span>
                    <span>·</span>
                    <span>{neg.statusLabel}</span>
                  </div>
                </div>

                <div className="text-right shrink-0 flex items-center gap-3">
                  <div className="text-sm font-semibold text-vyro-text tabular-nums">
                    {neg.currentOffer > 0 ? `$${neg.currentOffer}` : 'Quoting'}
                  </div>
                  <ArrowRight className="w-4 h-4 text-vyro-subtle group-hover:text-vyro-text transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 4. SECTION C: HANDLED FOR YOU (Quiet 7-day ledger) */}
      <section aria-label="Automated Decisions Ledger" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-vyro-text tracking-tight">Handled for you</h2>
            <span className="text-xs text-vyro-subtle">Past 7 days</span>
          </div>
          <span className="text-xs text-vyro-subtle tabular-nums">
            {(homeData?.handledForYou || []).length} automated outcomes
          </span>
        </div>

        {(homeData?.handledForYou || []).length === 0 ? (
          <div className="p-4 rounded-surface bg-vyro-surface border border-vyro-line text-xs text-vyro-subtle">
            No autonomous decisions executed in the past 7 days.
          </div>
        ) : (
          <div className="rounded-surface bg-vyro-surface border border-vyro-line divide-y divide-vyro-line overflow-hidden">
            {homeData?.handledForYou.slice(0, 8).map(item => {
              const isApproved = item.status === 'auto_approved';

              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 gap-2 text-xs"
                >
                  <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
                        isApproved
                          ? 'bg-status-handled/15 text-status-handled'
                          : 'bg-status-rejected/15 text-status-rejected'
                      }`}
                    >
                      {isApproved ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-vyro-text truncate">{item.title}</span>
                        <span className="text-vyro-subtle">·</span>
                        <span className="text-vyro-subtle truncate">{item.sellerName}</span>
                      </div>
                      <p className="text-[11px] text-vyro-subtle truncate mt-0.5">
                        {item.reasons[0] || item.actionLabel}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 self-end sm:self-center">
                    <span className="font-semibold text-vyro-text tabular-nums">
                      ${item.amount}
                    </span>
                    <Badge variant={isApproved ? 'success' : 'error'} size="sm">
                      {isApproved ? 'Auto-approved' : 'Auto-declined'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default OverviewPage;
