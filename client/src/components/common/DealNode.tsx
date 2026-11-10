import React from 'react';
import { motion } from 'framer-motion';
import { StatusChip } from './StatusChip';
import { RollingNumber } from './RollingNumber';
import { Clock } from 'lucide-react';
import { formatMoney } from '../../lib/present';
import { EASE_STANDARD } from '../../lib/motion';

export interface DealNodeProps {
  price: number;
  deliveryDays: number;
  authorName: string;
  isSelf?: boolean;
  deltaText?: string;
  whyText?: string;
  timestamp?: string;
  statusBadge?: string;
  summaryText?: string;
  onOpenConversation?: () => void;
  onOpenDetails?: () => void;
  className?: string;
}

export const DealNode: React.FC<DealNodeProps> = ({
  price,
  deliveryDays,
  authorName,
  isSelf = false,
  deltaText,
  whyText,
  timestamp,
  statusBadge,
  summaryText,
  onOpenConversation,
  onOpenDetails,
  className = '',
}) => {
  return (
    <div className={`relative flex gap-4 ${className}`}>
      {/* Node Dot & Vertical Timeline Line */}
      <div className="flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2, ease: EASE_STANDARD }}
          className="w-3.5 h-3.5 rounded-full border-2 border-surface bg-volt shrink-0 mt-2 shadow-sm"
        />
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.24, ease: EASE_STANDARD }}
          className="w-px flex-1 bg-border-subtle my-1 origin-top"
        />
      </div>

      {/* Card Content */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: EASE_STANDARD }}
        className="flex-1 bg-surface border border-border-subtle rounded-surface p-5 mb-4 flex flex-col gap-3"
      >
        {/* Header: Author + Timestamp + Status */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-body text-text-primary">
              {isSelf ? 'Your offer' : `${authorName}’s ask`}
            </span>
            {timestamp && (
              <span className="text-secondary text-text-muted">· {timestamp}</span>
            )}
          </div>
          {statusBadge && (
            <StatusChip label={statusBadge} role="handled" size="sm" />
          )}
        </div>

        {/* Terms: Price + Delivery time + Same-side Delta pill */}
        <div className="flex flex-wrap items-baseline justify-between gap-3 py-1">
          <div className="flex items-baseline gap-3">
            <span className="font-display font-bold text-[32px] text-text-primary">
              <RollingNumber value={price} format={formatMoney} durationMs={320} />
            </span>
            <div className="flex items-center gap-1.5 text-secondary text-text-muted">
              <Clock className="w-4 h-4 text-text-muted" strokeWidth={2} />
              <span>{deliveryDays}&nbsp;days</span>
            </div>
          </div>

          {deltaText && (
            <StatusChip label={deltaText} role="neutral" size="sm" />
          )}
        </div>

        {/* Plain-Language Turn Summary */}
        {summaryText && (
          <p className="text-secondary text-text-muted leading-relaxed">
            {summaryText}
          </p>
        )}

        {/* Plain-Language "Why" Line */}
        {whyText && (
          <p className="text-secondary text-text-primary/90 bg-raised rounded-[10px] px-3 py-2 border border-border-subtle">
            Why: {whyText}
          </p>
        )}

        {/* Links */}
        {(onOpenConversation || onOpenDetails) && (
          <div className="flex items-center gap-4 pt-1 border-t border-border-subtle">
            {onOpenConversation && (
              <button
                type="button"
                onClick={onOpenConversation}
                className="text-secondary text-text-muted hover:text-text-primary underline cursor-pointer"
              >
                See full conversation
              </button>
            )}
            {onOpenDetails && (
              <button
                type="button"
                onClick={onOpenDetails}
                className="text-secondary text-text-muted hover:text-text-primary underline cursor-pointer"
              >
                See details
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
