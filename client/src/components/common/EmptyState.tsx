import React from 'react';
import { motion } from 'framer-motion';
import { Button } from './Button';
import { useMotionPreference } from '../../context/MotionContext';
import { MOTION_DURATION, MOTION_EASE } from '../../lib/motion';

export interface EmptyStateProps {
  type?: 'inbox' | 'deals' | 'listings' | 'search';
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'inbox',
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  const { isReduced } = useMotionPreference();

  return (
    <div
      className={`w-full bg-surface border border-border-subtle rounded-surface p-10 flex flex-col items-center text-center gap-4 text-text-primary ${className}`}
    >
      {/* Subject-specific Flat Geometric Spot Art (one-time <= 320ms entrance) */}
      <motion.div
        initial={isReduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: MOTION_DURATION.emphasis, ease: MOTION_EASE.standard }}
        className="w-24 h-24 rounded-surface bg-raised border border-border-subtle flex items-center justify-center p-4"
      >
        {type === 'inbox' && (
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="12" y="18" width="40" height="32" rx="6" fill="var(--surface)" stroke="var(--border-subtle)" strokeWidth="2" />
            <path d="M12 28L32 38L52 28" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="46" cy="18" r="4" fill="var(--volt)" />
          </svg>
        )}
        {type === 'deals' && (
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="16" width="44" height="32" rx="6" fill="var(--surface)" stroke="var(--border-subtle)" strokeWidth="2" />
            <path d="M22 28H42" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" />
            <path d="M22 36H34" stroke="var(--volt)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
        {type === 'listings' && (
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 24L32 14L50 24V46C50 48.2 48.2 50 46 50H18C15.8 50 14 48.2 14 46V24Z" fill="var(--surface)" stroke="var(--border-subtle)" strokeWidth="2" />
            <path d="M26 50V34H38V50" stroke="var(--volt)" strokeWidth="2" />
          </svg>
        )}
        {type === 'search' && (
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="28" cy="28" r="14" stroke="var(--text-muted)" strokeWidth="2" />
            <line x1="38" y1="38" x2="50" y2="50" stroke="var(--volt)" strokeWidth="3" strokeLinecap="round" />
          </svg>
        )}
      </motion.div>

      <div className="max-w-[420px] flex flex-col gap-1.5">
        <h3 className="font-display font-semibold text-section text-text-primary">
          {title}
        </h3>
        <p className="text-body text-text-muted">
          {description}
        </p>
      </div>

      {actionLabel && onAction && (
        <div className="pt-2">
          <Button variant="volt" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
