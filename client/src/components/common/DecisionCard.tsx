import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { StatusChip } from './StatusChip';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import { formatMoney } from '../../lib/present';

export interface DecisionCardProps {
  title: string;
  counterpartName: string;
  proposedPrice: number;
  buyerCeiling?: number;
  sellerFloor?: number;
  proposedDays?: number;
  reasonText?: string;
  suggestionText?: string;
  onApprove: () => void;
  onCounter: (newPrice: number, newDays?: number) => void;
  onDecline: () => void;
  isLoading?: boolean;
  className?: string;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({
  title,
  counterpartName,
  proposedPrice,
  buyerCeiling,
  sellerFloor,
  proposedDays = 7,
  reasonText,
  suggestionText,
  onApprove,
  onCounter,
  onDecline,
  isLoading = false,
  className = '',
}) => {
  const [showCounterForm, setShowCounterForm] = useState(false);
  const [counterPrice, setCounterPrice] = useState(
    buyerCeiling ? String(buyerCeiling) : String(Math.max(proposedPrice - 10, 50))
  );
  const [counterDays, setCounterDays] = useState(String(proposedDays));

  // Global keyboard shortcuts: A (Approve), C (Counter), D (Decline)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing inside an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 'a' && !isLoading) {
        e.preventDefault();
        onApprove();
      } else if (key === 'c' && !isLoading) {
        e.preventDefault();
        setShowCounterForm(true);
      } else if (key === 'd' && !isLoading) {
        e.preventDefault();
        onDecline();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, onApprove, onDecline]);

  const handleCounterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(counterPrice);
    const d = parseInt(counterDays, 10);
    if (!isNaN(p) && p > 0) {
      onCounter(p, isNaN(d) ? undefined : d);
      setShowCounterForm(false);
    }
  };

  const defaultReason = buyerCeiling
    ? `${counterpartName} asked for ${formatMoney(proposedPrice)}. Your limit is ${formatMoney(buyerCeiling)}.`
    : `${counterpartName} proposed ${formatMoney(proposedPrice)} for this service.`;

  const defaultSuggestion = buyerCeiling
    ? `Our suggestion: counter at ${formatMoney(Math.max(buyerCeiling - 5, proposedPrice - 10))} for ${proposedDays}\u00A0days.`
    : `Our suggestion: review agreed terms before proceeding.`;

  return (
    <div
      className={`w-full bg-surface border border-border-subtle rounded-surface shadow-decision p-6 text-text-primary flex flex-col gap-5 ${className}`}
    >
      {/* Top Header Pill & Title */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <StatusChip label="Needs your OK" role="needsYou" size="sm" />
            <span className="text-secondary text-text-muted">· {counterpartName}</span>
          </div>
          <h3 className="font-display font-semibold text-section text-text-primary">
            {title}
          </h3>
        </div>
      </div>

      {/* Plain Words Question & Reason */}
      <div className="bg-raised border border-border-subtle rounded-control p-4 flex flex-col gap-2">
        <p className="font-medium text-body text-text-primary">
          {reasonText || defaultReason}
        </p>
        <div className="flex items-center gap-2 text-secondary text-text-muted">
          <Sparkles className="w-4 h-4 text-status-needs shrink-0" strokeWidth={2} />
          <span>{suggestionText || defaultSuggestion}</span>
        </div>
      </div>

      {/* Actions or Counter Drawer Form */}
      {!showCounterForm ? (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button
            variant="volt"
            size="md"
            onClick={onApprove}
            disabled={isLoading}
            className="flex-1 min-w-[150px]"
          >
            <span>Approve {formatMoney(proposedPrice)}</span>
            <kbd className="ml-2 text-secondary opacity-70">A</kbd>
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => setShowCounterForm(true)}
            disabled={isLoading}
            className="flex-1 min-w-[120px]"
          >
            <span>Counter</span>
            <kbd className="ml-2 text-secondary opacity-70">C</kbd>
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={onDecline}
            disabled={isLoading}
            className="min-w-[100px]"
          >
            <span>Decline</span>
            <kbd className="ml-2 text-secondary opacity-70">D</kbd>
          </Button>
        </div>
      ) : (
        <form
          onSubmit={handleCounterSubmit}
          className="bg-raised border border-border-subtle rounded-control p-4 flex flex-col gap-4"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-body text-text-primary">Your counter proposal</span>
            <button
              type="button"
              onClick={() => setShowCounterForm(false)}
              className="p-1 text-text-muted hover:text-text-primary cursor-pointer"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Price ($)"
              type="number"
              value={counterPrice}
              onChange={(e) => setCounterPrice(e.target.value)}
              required
            />
            <Input
              label="Delivery (days)"
              type="number"
              value={counterDays}
              onChange={(e) => setCounterDays(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowCounterForm(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="volt"
              size="sm"
              disabled={isLoading}
              icon={<ArrowRight className="w-4 h-4" strokeWidth={2} />}
            >
              Send counter offer
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
