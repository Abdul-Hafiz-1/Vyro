import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'raised' | 'flat';
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'surface',
  interactive = false,
  padding = 'md',
  className = '',
  ...props
}) => {
  const base = 'rounded-surface border border-border-subtle text-text-primary transition-colors duration-150';

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }[padding];

  const variantStyles = {
    surface: 'bg-surface',
    raised: 'bg-raised',
    flat: 'bg-transparent',
  }[variant];

  const interactiveStyles = interactive
    ? 'cursor-pointer hover:border-text-muted/40 select-none'
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
