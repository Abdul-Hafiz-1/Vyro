import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'white' | 'paper' | 'sun' | 'mint' | 'sky' | 'rose' | 'lavender';
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'white',
  interactive = false,
  padding = 'md',
  className = '',
  ...props
}) => {
  const base = 'border-2 border-ink rounded-[20px] shadow-hard text-ink';

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6', // 24px
    lg: 'p-8',
  }[padding];

  const variantStyles = {
    white: 'bg-card',
    paper: 'bg-paper',
    sun: 'bg-sun',
    mint: 'bg-mint',
    sky: 'bg-sky',
    rose: 'bg-rose',
    lavender: 'bg-lavender',
  }[variant];

  const interactiveStyles = interactive
    ? 'cursor-pointer transition-all duration-150 hover:-translate-y-1 hover:shadow-hard-lg active:translate-y-0.75 active:shadow-hard-press select-none'
    : '';

  return (
    <div
      className={`${base} ${paddingStyles} ${variantStyles} ${interactiveStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
