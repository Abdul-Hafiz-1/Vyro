import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';

export interface ModeSwitchProps {
  className?: string;
}

export const ModeSwitch: React.FC<ModeSwitchProps> = ({ className = '' }) => {
  const { isSellerWorkspace, switchWorkspace } = useAuth();

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
        className={`relative px-3.5 py-1 text-secondary font-medium rounded-pill transition-all cursor-pointer ${
          !isSellerWorkspace
            ? 'bg-surface text-text-primary shadow-sm'
            : 'text-text-muted hover:text-text-primary'
        }`}
      >
        <span>Buying</span>
        {isSellerWorkspace && needsCount > 0 && (
          <span className="ml-1.5 px-2 py-0.5 bg-status-needs/20 text-status-needs text-secondary font-bold rounded-pill">
            {needsCount}
          </span>
        )}
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={isSellerWorkspace}
        onClick={() => handleSwitch('seller')}
        className={`relative px-3.5 py-1 text-secondary font-medium rounded-pill transition-all cursor-pointer ${
          isSellerWorkspace
            ? 'bg-surface text-text-primary shadow-sm'
            : 'text-text-muted hover:text-text-primary'
        }`}
      >
        <span>Selling</span>
        {!isSellerWorkspace && needsCount > 0 && (
          <span className="ml-1.5 px-2 py-0.5 bg-status-needs/20 text-status-needs text-secondary font-bold rounded-pill">
            {needsCount}
          </span>
        )}
      </button>
    </div>
  );
};
