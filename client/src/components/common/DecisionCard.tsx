import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './Button';
import { StatusChip } from './StatusChip';
import { ArrowRight, Check, Minus, Plus, RotateCcw, X } from 'lucide-react';
import { formatMoney } from '../../lib/present';
import { EASE_STANDARD } from '../../lib/motion';

export interface DecisionCardProps {
  title: string;
  counterpartName: string;
  proposedPrice: number;
  buyerBudget?: number;
  buyerHardCap?: number;
  buyerCeiling?: number; // legacy alias
  sellerFloor?: number;
  proposedDays?: number;
  suggestedCounterPrice?: number;
  reasonText?: string;
  reasons?: string[];
  suggestionText?: string;
  onApprove: () => void | Promise<any>;
  onCounter: (newPrice: number, newDays?: number) => void | Promise<any>;
  onDecline: (reason?: string) => void | Promise<any>;
  onUndo?: () => void | Promise<any>;
  isLoading?: boolean;
  loadingAction?: 'approve' | 'counter' | 'decline' | 'undo' | null;
  disabledReason?: string;
  className?: string;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({
  title,
  counterpartName,
  proposedPrice,
  buyerBudget,
  buyerHardCap,
  buyerCeiling,
  proposedDays = 5,
  suggestedCounterPrice,
  reasonText,
  reasons,
  suggestionText,
  onApprove,
  onCounter,
  onDecline,
  onUndo,
  isLoading = false,
  loadingAction = null,
  disabledReason,
  className = '',
}) => {
  const effectiveBudget = buyerBudget ?? buyerCeiling;
  const effectiveHardCap = buyerHardCap ?? (effectiveBudget ? Math.round(effectiveBudget * 1.1) : undefined);
  const aiSuggested = suggestedCounterPrice ?? (
    effectiveBudget
      ? Math.max(10, Math.min(effectiveBudget, Math.round((effectiveBudget + proposedPrice) / 2) - 5))
      : Math.max(10, Math.round(proposedPrice * 0.9))
  );

  const [showCounterForm, setShowCounterForm] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [counterPrice, setCounterPrice] = useState<number>(aiSuggested);
  const [declineReason, setDeclineReason] = useState('');
  const [collapsedDecision, setCollapsedDecision] = useState<{
    action: 'approved' | 'countered' | 'declined';
    summary: string;
    undoSecondsLeft: number;
  } | null>(null);

  useEffect(() => {
    setCounterPrice(aiSuggested);
  }, [aiSuggested]);

  // 10-second Undo countdown timer after decision
  useEffect(() => {
    if (!collapsedDecision || collapsedDecision.undoSecondsLeft <= 0) return;
    const timer = setInterval(() => {
      setCollapsedDecision((prev) => {
        if (!prev) return null;
        if (prev.undoSecondsLeft <= 1) return { ...prev, undoSecondsLeft: 0 };
        return { ...prev, undoSecondsLeft: prev.undoSecondsLeft - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [collapsedDecision?.action]);

  const isDisabled = Boolean(disabledReason) || isLoading;

  const triggerApprove = () => {
    if (isDisabled) return;
    onApprove();
    if (onUndo) {
      setCollapsedDecision({
        action: 'approved',
        summary: `Approved ${formatMoney(proposedPrice)} for ${title}`,
        undoSecondsLeft: 10,
      });
    }
  };

  const triggerDecline = () => {
    if (isDisabled) return;
    onDecline(declineReason.trim() || undefined);
    setShowDeclineConfirm(false);
    setDeclineReason('');
    if (onUndo) {
      setCollapsedDecision({
        action: 'declined',
        summary: `Declined ${formatMoney(proposedPrice)} proposal from ${counterpartName}`,
        undoSecondsLeft: 10,
      });
    }
  };

  const handleCounterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDisabled || !Number.isFinite(counterPrice) || counterPrice <= 0) return;
    onCounter(Math.round(counterPrice), proposedDays);
    setShowCounterForm(false);
    if (onUndo) {
      setCollapsedDecision({
        action: 'countered',
        summary: `Sent counter at ${formatMoney(counterPrice)} to ${counterpartName}`,
        undoSecondsLeft: 10,
      });
    }
  };

  // Global keyboard shortcuts: A (Approve), C (Counter), D (opens Decline confirm — never instant destructive)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (collapsedDecision) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if (isDisabled) return;

      const key = e.key.toLowerCase();
      if (key === 'a') {
        e.preventDefault();
        triggerApprove();
      } else if (key === 'c') {
        e.preventDefault();
        setShowDeclineConfirm(false);
        setShowCounterForm((prev) => !prev);
      } else if (key === 'd') {
        e.preventDefault();
        setShowCounterForm(false);
        setShowDeclineConfirm(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [collapsedDecision, isDisabled, proposedPrice]);

  if (collapsedDecision) {
    const progressRatio = Math.max(0, Math.min(1, collapsedDecision.undoSecondsLeft / 10));
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: EASE_STANDARD }}
        className={`relative overflow-hidden w-full bg-surface border border-border-subtle rounded-surface p-4 text-text-primary flex items-center justify-between gap-3 ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-full bg-status-handled/15 text-status-handled flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
          </div>
          <span className="text-secondary font-medium text-text-primary truncate">
            {collapsedDecision.summary}
          </span>
        </div>

        {onUndo && collapsedDecision.undoSecondsLeft > 0 && (
          <button
            type="button"
            onClick={() => {
              onUndo();
              setCollapsedDecision(null);
            }}
            disabled={isLoading}
            className="h-9 px-3 rounded-[10px] border border-border-subtle bg-raised text-secondary font-medium text-text-primary hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo ({collapsedDecision.undoSecondsLeft}s)</span>
          </button>
        )}

        {onUndo && collapsedDecision.undoSecondsLeft > 0 && (
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-0 right-0 h-[2px] bg-volt/80 origin-left transition-transform duration-300"
            style={{ transform: `scaleX(${progressRatio})` }}
          />
        )}
      </motion.div>
    );
  }

  const defaultReason = effectiveBudget
    ? `${counterpartName} is verified and proposed ${formatMoney(proposedPrice)} (${proposedDays}\u00A0days). ${proposedPrice > effectiveBudget ? `${formatMoney(proposedPrice)} is ${formatMoney(proposedPrice - effectiveBudget)} over your ${formatMoney(effectiveBudget)} budget.` : `Your budget is ${formatMoney(effectiveBudget)}.`}`
    : `${counterpartName} proposed ${formatMoney(proposedPrice)} for ${proposedDays}\u00A0days.`;

  const defaultSuggestion =
    suggestionText ||
    (effectiveBudget
      ? `Suggested counter: ${formatMoney(aiSuggested)} for ${proposedDays}\u00A0days.`
      : `Suggested: Review agreed terms or approve ${formatMoney(proposedPrice)}.`);

  const focusRing =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

  return (
    <div
      className={`relative w-full bg-surface border border-border-subtle rounded-surface shadow-decision p-6 text-text-primary flex flex-col gap-5 ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <StatusChip label="Needs your OK" role="needsYou" size="sm" />
            <span className="text-secondary text-text-muted">· {counterpartName}</span>
          </div>
          <h3 className="font-display font-semibold text-section text-text-primary">{title}</h3>
        </div>
      </div>

      {/* Plain Recommendation & Reasons */}
      <div className="bg-raised border border-border-subtle rounded-control p-4 flex flex-col gap-2">
        <p className="font-medium text-body text-text-primary">{reasonText || defaultReason}</p>
        {reasons && reasons.length > 0 && (
          <ul className="flex flex-col gap-1 text-secondary text-text-muted">
            {reasons.slice(0, 3).map((r, idx) => (
              <li key={idx}>· {r}</li>
            ))}
          </ul>
        )}
        <p className="text-secondary text-text-muted">{defaultSuggestion}</p>
      </div>

      {/* Action Buttons Row: Desktop = 1 row (Approve | Counter | Decline), Mobile = full-width stacked */}
      {!showCounterForm && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-1">
          {/* Primary: Approve (ONLY filled button in card) */}
          <button
            type="button"
            onClick={triggerApprove}
            disabled={isDisabled}
            title={disabledReason}
            aria-label={`Approve ${formatMoney(proposedPrice)} for ${title}`}
            className={`h-12 px-4 rounded-[10px] w-full sm:flex-1 inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold text-body bg-volt text-[#0C0E0D] border border-transparent hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100 ${focusRing}`}
          >
            <span className="inline-flex items-center justify-center w-5 h-4 shrink-0">
              {loadingAction === 'approve' || (isLoading && !loadingAction) ? (
                <span className="vyro-live-indicator" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              ) : (
                <Check className="w-4 h-4" strokeWidth={2.5} />
              )}
            </span>
            <span>Approve {formatMoney(proposedPrice)}</span>
            <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 text-[12px] font-medium rounded bg-black/15 text-[#0C0E0D] leading-none">
              A
            </kbd>
          </button>

          {/* Secondary: Counter (1px outline, no fill) */}
          <button
            type="button"
            onClick={() => {
              setShowDeclineConfirm(false);
              setShowCounterForm(true);
            }}
            disabled={isDisabled}
            title={disabledReason}
            aria-label={`Counter ${formatMoney(proposedPrice)} offer for ${title}`}
            aria-expanded={showCounterForm}
            className={`h-12 px-4 rounded-[10px] w-full sm:w-auto sm:min-w-[124px] inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium text-body bg-transparent text-text-primary border border-border-subtle hover:bg-raised active:scale-[0.98] transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100 ${focusRing}`}
          >
            {loadingAction === 'counter' ? (
              <span className="vyro-live-indicator" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            ) : null}
            <span>Counter</span>
            <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 text-[12px] font-medium rounded bg-raised border border-border-subtle text-text-muted leading-none">
              C
            </kbd>
          </button>

          {/* Tertiary: Decline (Ghost text button, hover tints danger red, opens confirm popover) */}
          <div className="relative w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowDeclineConfirm((v) => !v)}
              disabled={isDisabled}
              title={disabledReason}
              aria-label={`Decline ${formatMoney(proposedPrice)} deal for ${title}`}
              aria-expanded={showDeclineConfirm}
              className={`h-12 px-4 rounded-[10px] w-full sm:w-auto sm:min-w-[112px] inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium text-body bg-transparent border border-transparent text-text-muted hover:text-status-declined hover:bg-status-declined/10 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100 ${focusRing}`}
            >
              {loadingAction === 'decline' ? (
                <span className="vyro-live-indicator" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              ) : null}
              <span>Decline</span>
              <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 text-[12px] font-medium rounded bg-raised border border-border-subtle text-text-muted leading-none">
                D
              </kbd>
            </button>

            {/* Confirm Popover: Never one-click destructive */}
            {showDeclineConfirm && (
              <div
                role="dialog"
                aria-label="Confirm decline deal"
                className="sm:absolute sm:right-0 sm:bottom-14 mt-2 sm:mt-0 z-30 w-full sm:w-72 bg-surface border border-border-subtle rounded-surface shadow-decision p-4 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-body text-text-primary">Decline this deal?</span>
                  <button
                    type="button"
                    onClick={() => setShowDeclineConfirm(false)}
                    aria-label="Keep deal"
                    className={`p-1 rounded text-text-muted hover:text-text-primary cursor-pointer ${focusRing}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Optional reason (e.g. too high)"
                  className="w-full h-10 px-3 bg-raised border border-border-subtle rounded-[10px] text-secondary text-text-primary placeholder-text-muted/60 focus:outline-none focus:border-volt"
                />
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowDeclineConfirm(false)}
                    className={`h-10 px-3.5 rounded-[10px] text-secondary font-medium text-text-primary border border-border-subtle hover:bg-raised cursor-pointer ${focusRing}`}
                  >
                    Keep
                  </button>
                  <button
                    type="button"
                    onClick={triggerDecline}
                    disabled={isLoading}
                    className={`h-10 px-3.5 rounded-[10px] text-secondary font-semibold bg-status-declined/15 text-status-declined border border-status-declined/30 hover:bg-status-declined/25 cursor-pointer ${focusRing}`}
                  >
                    Decline
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inline Counter Drawer Form with Stepper & Budget Helper Text */}
      <AnimatePresence initial={false}>
        {showCounterForm && (
          <motion.form
            key="counter-form"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: EASE_STANDARD }}
            onSubmit={handleCounterSubmit}
            className="bg-raised border border-border-subtle rounded-control p-4 flex flex-col gap-3"
          >
          <div className="flex items-center justify-between">
            <span className="font-medium text-body text-text-primary">Your counter price</span>
            <button
              type="button"
              onClick={() => setShowCounterForm(false)}
              aria-label="Close counter form"
              className={`p-1 rounded text-text-muted hover:text-text-primary cursor-pointer ${focusRing}`}
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCounterPrice((p) => Math.max(1, p - 5))}
              aria-label="Decrease counter price by $5"
              className={`h-12 w-12 rounded-[10px] border border-border-subtle bg-surface flex items-center justify-center text-text-primary hover:bg-raised cursor-pointer shrink-0 ${focusRing}`}
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted font-semibold">$</span>
              <input
                type="number"
                min={1}
                step={1}
                value={counterPrice}
                onChange={(e) => setCounterPrice(Math.max(1, parseInt(e.target.value || '0', 10)))}
                aria-label="Counter price in dollars"
                className="w-full h-12 pl-8 pr-3 bg-surface border border-border-subtle rounded-[10px] text-body font-semibold text-text-primary focus:outline-none focus:border-volt"
                required
              />
            </div>
            <button
              type="button"
              onClick={() => setCounterPrice((p) => p + 5)}
              aria-label="Increase counter price by $5"
              className={`h-12 w-12 rounded-[10px] border border-border-subtle bg-surface flex items-center justify-center text-text-primary hover:bg-raised cursor-pointer shrink-0 ${focusRing}`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {effectiveBudget && (
            <p className="text-secondary text-text-muted">
              Your budget: {formatMoney(effectiveBudget)}
              {effectiveHardCap && effectiveHardCap > effectiveBudget
                ? ` · Hard cap: ${formatMoney(effectiveHardCap)}`
                : ''}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setShowCounterForm(false)}
              className="h-12 rounded-[10px]"
            >
              Cancel
            </Button>
            <button
              type="submit"
              disabled={isLoading || !counterPrice}
              className={`h-12 px-5 rounded-[10px] inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold text-body bg-volt text-[#0C0E0D] hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-45 ${focusRing}`}
            >
              <span>Send counter</span>
              <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
};
