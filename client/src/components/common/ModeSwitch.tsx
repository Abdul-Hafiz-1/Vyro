import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useMotionPreference } from '../../context/MotionContext';
import { MOTION_DURATION, MOTION_EASE } from '../../lib/motion';

export interface ModeSwitchProps {
  className?: string;
}

export const ModeSwitch: React.FC<ModeSwitchProps> = ({ className = '' }) => {
  const { isSellerWorkspace, switchWorkspace } = useAuth();
  const { isReduced } = useMotionPreference();

  // Fetch pending review counts for the badge
  const { data: homeData } = useQuery({
    queryKey: ['home'],
    queryFn: api.getHome,
    refetchInterval: 12000
  });

  const needsCount = homeData?.needsYou?.length || 0;

  const handleSwitch = async (mode: 'buyer' | 'seller') => {
    if ((mode === 'seller') === isSellerWorkspace) return;
    try {
      await switchWorkspace(mode);
    } catch (err) {
      console.error('Failed to switch workspace:', err);
    }
  };

  return (
    <div
      className={`inline-flex items-center bg-raised p-0.5 rounded-pill border border-border-subtle select-none ${className}`}
      role="radiogroup"
      aria-label="Workspace mode"
    >
      <button
        type="button"
        role="radio"
        aria-checked={!isSellerWorkspace}
        onClick={() => handleSwitch('buyer')}
        className={`relative px-3.5 py-1 text-secondary font-medium rounded-pill transition-colors duration-[120ms] cursor-pointer ${
          !isSellerWorkspace
            ? 'text-text-primary'
            : 'text-text-muted hover:text-text-primary'
        }`}
      >
        {!isSellerWorkspace && (
          <motion.span
            layoutId={isReduced ? undefined : 'vyro-mode-thumb'}
            transition={{ duration: MOTION_DURATION.standard, ease: MOTION_EASE.standard }}
            className="absolute inset-0 bg-surface rounded-pill shadow-sm"
            aria-hidden="true"
          />
        )}
        <span className="relative z-10 inline-flex items-center">
          <span>Buying</span>
          {isSellerWorkspace && needsCount > 0 && (
            <span className="ml-1.5 px-2 py-0.5 bg-status-needs/20 text-status-needs text-secondary font-bold rounded-pill">
              {needsCount}
            </span>
          )}
        </span>
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={isSellerWorkspace}
        onClick={() => handleSwitch('seller')}
        className={`relative px-3.5 py-1 text-secondary font-medium rounded-pill transition-colors duration-[120ms] cursor-pointer ${
          isSellerWorkspace
            ? 'text-text-primary'
            : 'text-text-muted hover:text-text-primary'
        }`}
      >
        {isSellerWorkspace && (
          <motion.span
            layoutId={isReduced ? undefined : 'vyro-mode-thumb'}
            transition={{ duration: MOTION_DURATION.standard, ease: MOTION_EASE.standard }}
            className="absolute inset-0 bg-surface rounded-pill shadow-sm"
            aria-hidden="true"
          />
        )}
        <span className="relative z-10 inline-flex items-center">
          <span>Selling</span>
          {!isSellerWorkspace && needsCount > 0 && (
            <span className="ml-1.5 px-2 py-0.5 bg-status-needs/20 text-status-needs text-secondary font-bold rounded-pill">
              {needsCount}
            </span>
          )}
        </span>
      </button>
    </div>
  );
};
