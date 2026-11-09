import React from 'react';
import { SpotIllustration } from './SpotIllustration';
import { Button } from './Button';

export interface EmptyStateProps {
  illustration?: 'empty-box' | 'handshake' | 'sparkle-search' | 'ticket' | 'all-done' | 'shield';
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  illustration = 'empty-box',
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`w-full bg-card border-2 border-ink rounded-[20px] shadow-hard p-10 flex flex-col items-center text-center gap-4 text-ink ${className}`}
    >
      <SpotIllustration name={illustration} size={130} />
      <div className="max-w-[440px] flex flex-col gap-2">
        <h3 className="font-display font-bold text-card-title text-ink">
          {title}
        </h3>
        <p className="text-body text-muted">
          {description}
        </p>
      </div>
      {actionLabel && onAction && (
        <div className="pt-2">
          <Button variant="coral" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
