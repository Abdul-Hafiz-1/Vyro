import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'neutral' | 'success' | 'warning' | 'error' | 'accent' | 'outline';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-control tracking-tight leading-none';
  
  const sizeStyles = {
    sm: 'text-sm px-2.5 py-1 gap-1.5',
    md: 'text-sm px-3 py-1.5 gap-2'
  };

  const variantStyles = {
    default: 'bg-vyro-surface text-vyro-muted border border-vyro-line',
    neutral: 'bg-vyro-bg text-vyro-muted border border-vyro-line',
    success: 'bg-status-handled-bg text-status-handled border border-status-handled/30',
    warning: 'bg-status-needs-bg text-status-needs border border-status-needs/30',
    error: 'bg-status-declined-bg text-status-declined border border-status-declined/30',
    accent: 'bg-vyro-accent/15 text-vyro-accent border border-vyro-accent/30',
    outline: 'bg-transparent text-vyro-text border border-vyro-line'
  };

  const dotColors = {
    default: 'bg-vyro-muted',
    neutral: 'bg-vyro-muted',
    success: 'bg-status-handled',
    warning: 'bg-status-needs',
    error: 'bg-status-declined',
    accent: 'bg-vyro-accent',
    outline: 'bg-vyro-text'
  };

  return (
    <span className={twMerge(clsx(baseStyles, sizeStyles[size], variantStyles[variant], className))}>
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  );
};
