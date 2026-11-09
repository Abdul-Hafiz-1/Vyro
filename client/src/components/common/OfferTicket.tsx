import React from 'react';
import { Pill } from './Pill';
import { Clock, DollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import { formatMoney } from '../../lib/present';

export interface OfferTicketProps {
  price: number;
  deliveryDays: number;
  authorName: string;
  isSelf?: boolean;
  deltaText?: string;
  isDeltaPositive?: boolean;
  timestamp?: string;
  statusBadge?: string;
  className?: string;
}

export const OfferTicket: React.FC<OfferTicketProps> = ({
  price,
  deliveryDays,
  authorName,
  isSelf = false,
  deltaText,
  isDeltaPositive = false,
  timestamp,
  statusBadge,
  className = '',
}) => {
  return (
    <div
      className={`relative w-full bg-card border-2 border-ink rounded-[20px] shadow-hard p-5 overflow-hidden text-ink ${className}`}
    >
      {/* Decorative Ticket Notches */}
      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-paper border-2 border-ink" />
      <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-paper border-2 border-ink" />

      {/* Top row: Who offered + Timestamp + Status */}
      <div className="flex items-center justify-between gap-3 mb-3 px-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-body text-ink">
            {isSelf ? 'Your offer' : `${authorName}'s offer`}
          </span>
          {timestamp && (
            <span className="text-small text-muted">· {timestamp}</span>
          )}
        </div>
        {statusBadge && (
          <Pill label={statusBadge} variant="mint" size="sm" />
        )}
      </div>

      {/* Dashed divider */}
      <div className="border-b-2 border-dashed border-ink my-3 mx-2" />

      {/* Bottom row: Price & Delivery in large type + Delta summary */}
      <div className="flex items-center justify-between gap-4 px-3 py-1">
        <div className="flex items-baseline gap-4">
          <div className="flex items-center gap-1">
            <span className="font-display font-bold text-[32px] text-ink">
              {formatMoney(price)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-body text-muted font-bold">
            <Clock className="w-4 h-4 text-ink" strokeWidth={2.5} />
            <span>{deliveryDays} {deliveryDays === 1 ? 'day' : 'days'}</span>
          </div>
        </div>

        {deltaText && (
          <div className="shrink-0">
            <Pill
              label={deltaText}
              variant={isDeltaPositive ? 'mint' : 'lavender'}
              size="sm"
              icon={
                isDeltaPositive ? (
                  <TrendingDown className="w-3.5 h-3.5 text-ink" strokeWidth={2.5} />
                ) : (
                  <TrendingUp className="w-3.5 h-3.5 text-ink" strokeWidth={2.5} />
                )
              }
            />
          </div>
        )}
      </div>
    </div>
  );
};
