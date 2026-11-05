import React from 'react';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-vyro-accent disabled:opacity-50 disabled:pointer-events-none rounded-[6px] text-sm';
  
  const sizeStyles = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-9 px-4 text-sm gap-2',
    lg: 'h-11 px-5 text-base gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-vyro-text text-vyro-bg hover:bg-white active:bg-zinc-200 font-semibold',
    secondary: 'bg-vyro-surface hover:bg-vyro-hover text-vyro-text border border-vyro-border',
    outline: 'bg-transparent hover:bg-vyro-surface text-vyro-text border border-vyro-border',
    ghost: 'bg-transparent hover:bg-vyro-surface text-vyro-muted hover:text-vyro-text',
    danger: 'bg-vyro-error/15 hover:bg-vyro-error/25 text-vyro-error border border-vyro-error/30',
    accent: 'bg-vyro-accent hover:bg-vyro-accent-hover text-white font-semibold shadow-sm',
  };

  return (
    <button
      className={twMerge(clsx(baseStyles, sizeStyles[size], variantStyles[variant], className))}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};
