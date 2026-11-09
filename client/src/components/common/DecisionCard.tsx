import React, { useState } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { Pill } from './Pill';
import { Sparkles, ArrowRight, X, AlertTriangle } from 'lucide-react';

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
    ? `${counterpartName} wants $${proposedPrice}. Your limit is $${buyerCeiling}.`
    : `${counterpartName} proposed $${proposedPrice} for this project.`;

  const defaultSuggestion = buyerCeiling
    ? `Our suggestion: counter at $${Math.max(buyerCeiling - 5, proposedPrice - 10)} for ${proposedDays} days.`
    : `Our suggestion: review terms before proceeding.`;

  return (
    <div
      className={`w-full bg-sun border-2 border-ink rounded-[20px] shadow-hard p-6 text-ink flex flex-col gap-5 ${className}`}
    >
      {/* Header Pill & Title */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Pill label="Needs your decision" variant="coral" size="sm" />
            <span className="text-small text-ink font-bold">· {counterpartName}</span>
          </div>
          <h3 className="font-display font-bold text-card-title text-ink">
            {title}
          </h3>
        </div>
      </div>

      {/* Plain Words Question & Reason */}
      <div className="bg-card border-2 border-ink rounded-[14px] p-4 text-ink flex flex-col gap-2 shadow-hard-sm">
        <p className="font-bold text-body text-ink">
          {reasonText || defaultReason}
        </p>
        <div className="flex items-center gap-2 text-small text-muted font-medium">
          <Sparkles className="w-4 h-4 text-coral shrink-0" strokeWidth={2.5} />
          <span>{suggestionText || defaultSuggestion}</span>
        </div>
      </div>

      {/* Action Buttons or Counter Form */}
      {!showCounterForm ? (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button
            variant="coral"
            onClick={onApprove}
            disabled={isLoading}
            className="flex-1 min-w-[140px]"
          >
            <span>Approve ${proposedPrice}</span>
            <span className="text-small opacity-70 ml-1 font-normal">(A)</span>
          </Button>

          <Button
            variant="white"
            onClick={() => setShowCounterForm(true)}
            disabled={isLoading}
            className="flex-1 min-w-[120px]"
          >
            <span>Counter</span>
            <span className="text-small opacity-70 ml-1 font-normal">(C)</span>
          </Button>

          <Button
            variant="white"
            onClick={onDecline}
            disabled={isLoading}
            className="min-w-[100px]"
          >
            <span>Decline</span>
            <span className="text-small opacity-70 ml-1 font-normal">(D)</span>
          </Button>
        </div>
      ) : (
        <form
          onSubmit={handleCounterSubmit}
          className="bg-card border-2 border-ink rounded-[14px] p-4 flex flex-col gap-4 shadow-hard-sm"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-body text-ink">Your counter proposal</span>
            <button
              type="button"
              onClick={() => setShowCounterForm(false)}
              className="p-1 hover:bg-paper rounded-full cursor-pointer"
            >
              <X className="w-5 h-5 text-ink" strokeWidth={2.5} />
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
              label="Delivery (Days)"
              type="number"
              value={counterDays}
              onChange={(e) => setCounterDays(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowCounterForm(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="coral"
              disabled={isLoading}
              icon={<ArrowRight className="w-4 h-4 text-ink" strokeWidth={2.5} />}
            >
              Send counter offer
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
