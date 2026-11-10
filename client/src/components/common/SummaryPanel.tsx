import React from 'react';
import { StatusChip } from './StatusChip';
import { RollingNumber } from './RollingNumber';
import { Check, Clock } from 'lucide-react';
import { formatMoney } from '../../lib/present';

export interface SummaryPanelProps {
  currentPrice: number;
  deliveryDays: number;
  currentStep: number; // 1 to 5
  statusLabel: string;
  statusRole?: 'handled' | 'needsYou' | 'declined' | 'inProgress';
  counterpartName: string;
  isBuyer?: boolean;
  actionState: 'needsDecision' | 'readyToPay' | 'waitingCounterparty' | 'completed';
  completedBannerText?: string;
  paymentSlot?: React.ReactNode;
  onPay?: () => void;
  onDecisionApprove?: () => void;
  onDecisionDecline?: () => void;
  className?: string;
}

const STEPS = [
  'Request sent',
  'Sellers replied',
  'Negotiating',
  'Your OK',
  'Paid',
];

export const SummaryPanel: React.FC<SummaryPanelProps> = ({
  currentPrice,
  deliveryDays,
  currentStep = 3,
  statusLabel,
  statusRole = 'inProgress',
  counterpartName,
  isBuyer = true,
  actionState = 'waitingCounterparty',
  completedBannerText,
  paymentSlot,
  className = '',
}) => {
  return (
    <div
      className={`relative z-10 bg-surface border border-border-subtle rounded-surface p-6 flex flex-col gap-6 text-text-primary ${className}`}
    >
      {/* Status Chip Header */}
      <div className="flex items-center justify-between gap-2">
        <StatusChip label={statusLabel} role={statusRole} size="md" />
        <span className="text-secondary text-text-muted truncate">
          {isBuyer ? `With ${counterpartName}` : `For ${counterpartName}`}
        </span>
      </div>

      {/* Current Terms */}
      <div className="flex flex-col gap-1 border-b border-border-subtle pb-5">
        <span className="text-secondary text-text-muted">Current terms</span>
        <div className="flex items-baseline gap-2">
          <span className="font-display font-bold text-price-giant text-text-primary tracking-tight">
            <RollingNumber value={currentPrice} format={formatMoney} durationMs={320} />
          </span>
        </div>
        <div className="flex items-center gap-2 text-secondary text-text-muted mt-1">
          <Clock className="w-4 h-4 text-text-muted" strokeWidth={2} />
          <span>{deliveryDays}&nbsp;days delivery</span>
        </div>
      </div>

      {/* Stepping Stones Progress */}
      <div className="flex flex-col gap-3">
        <span className="text-secondary text-text-muted font-medium">Deal progress</span>
        <div className="flex flex-col gap-2">
          {STEPS.map((step, idx) => {
            const stepNum = idx + 1;
            const isCompletedDeal = actionState === 'completed';
            const isDone = isCompletedDeal ? true : stepNum < currentStep;
            const isCurrent = !isCompletedDeal && stepNum === currentStep;
            const label =
              stepNum === 5 && actionState === 'readyToPay'
                ? 'Ready to pay'
                : step;

            return (
              <div key={step} className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${
                    isDone
                      ? 'bg-status-handled/15 border-status-handled/40 text-status-handled'
                      : isCurrent
                      ? 'bg-volt text-[#0C0E0D] border-transparent font-bold'
                      : 'border-border-subtle text-text-muted/50'
                  }`}
                >
                  {isDone ? (
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                  ) : (
                    <span className="text-secondary">{stepNum}</span>
                  )}
                </div>
                <span
                  className={`text-secondary ${
                    isCurrent ? 'font-semibold text-text-primary' : isDone ? 'text-text-primary' : 'text-text-muted'
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Single Payment or Waiting State Slot */}
      {(actionState === 'readyToPay' || actionState === 'waitingCounterparty' || actionState === 'completed') && (
        <div className="pt-4 border-t border-border-subtle flex flex-col gap-3 relative z-20">
          {actionState === 'readyToPay' && isBuyer && paymentSlot}

          {actionState === 'readyToPay' && !isBuyer && (
            <div className="bg-raised p-3.5 rounded-control text-center text-secondary text-text-muted">
              Awaiting buyer payment via PayPal
            </div>
          )}

          {actionState === 'waitingCounterparty' && (
            <div className="bg-raised p-3.5 rounded-control text-center text-secondary text-text-muted">
              Waiting for {counterpartName}’s response
            </div>
          )}

          {actionState === 'completed' && (
            <div className="bg-status-handled/10 border border-status-handled/30 p-3.5 rounded-control text-center text-secondary text-status-handled font-medium">
              {completedBannerText || 'Paid with PayPal'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
