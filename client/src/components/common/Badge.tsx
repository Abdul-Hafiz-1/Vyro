import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'accent' | 'outline';
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
  const baseStyles = 'inline-flex items-center font-mono font-medium rounded-full tracking-wide';
  
  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-0.5 gap-1.5'
  };

  const variantStyles = {
    default: 'bg-vyro-surface text-vyro-muted border border-vyro-border',
    success: 'bg-vyro-success/10 text-vyro-success border border-vyro-success/20',
    warning: 'bg-vyro-warning/10 text-vyro-warning border border-vyro-warning/20',
    error: 'bg-vyro-error/10 text-vyro-error border border-vyro-error/20',
    accent: 'bg-vyro-accent/15 text-vyro-accent border border-vyro-accent/30',
    outline: 'bg-transparent text-vyro-text border border-vyro-border'
  };

  const dotColors = {
    default: 'bg-vyro-muted',
    success: 'bg-vyro-success',
    warning: 'bg-vyro-warning',
    error: 'bg-vyro-error',
    accent: 'bg-vyro-accent',
    outline: 'bg-vyro-text'
  };

  return (
    <span className={twMerge(clsx(baseStyles, sizeStyles[size], variantStyles[variant], className))}>
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full animate-pulse-subtle', dotColors[variant])} />}
      {children}
    </span>
  );
};
