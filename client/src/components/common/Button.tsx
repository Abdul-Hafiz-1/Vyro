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
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-vyro-accent focus-visible:ring-offset-2 focus-visible:ring-offset-vyro-bg disabled:opacity-40 disabled:pointer-events-none rounded-control select-none min-h-[44px] text-sm';
  
  const sizeStyles = {
    sm: 'h-11 px-4 text-sm gap-2',
    md: 'h-11 px-5 text-sm gap-2',
    lg: 'h-12 px-6 text-base gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-vyro-accent hover:bg-vyro-accent-hover text-white font-semibold border border-transparent active:scale-[0.99]',
    secondary: 'bg-vyro-surface hover:bg-vyro-surface-hover text-vyro-text border border-vyro-border active:scale-[0.99]',
    outline: 'bg-transparent hover:bg-vyro-surface text-vyro-text border border-vyro-border hover:border-vyro-border-light active:scale-[0.99]',
    ghost: 'bg-transparent hover:bg-vyro-surface text-vyro-muted hover:text-vyro-text active:scale-[0.99]',
    danger: 'bg-transparent hover:bg-status-declined-bg/20 text-status-declined border border-status-declined/40 active:scale-[0.99]',
    accent: 'bg-vyro-accent hover:bg-vyro-accent-hover text-white font-semibold border border-transparent active:scale-[0.99]',
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
