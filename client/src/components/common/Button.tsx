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
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-vyro-accent disabled:opacity-40 disabled:pointer-events-none rounded-[6px] text-xs tracking-tight select-none';
  
  const sizeStyles = {
    sm: 'h-7.5 px-2.5 text-xs gap-1.5',
    md: 'h-8.5 px-3.5 text-xs gap-2',
    lg: 'h-10 px-4.5 text-sm gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-vyro-text text-vyro-bg hover:bg-white active:bg-zinc-200 font-semibold shadow-xs border border-transparent',
    secondary: 'bg-vyro-surface hover:bg-vyro-hover text-vyro-text border border-vyro-border active:translate-y-px shadow-xs',
    outline: 'bg-transparent hover:bg-vyro-surface/60 text-vyro-text border border-vyro-border active:translate-y-px',
    ghost: 'bg-transparent hover:bg-vyro-surface text-vyro-muted hover:text-vyro-text',
    danger: 'bg-vyro-error/10 hover:bg-vyro-error/20 text-vyro-error border border-vyro-error/30 active:translate-y-px',
    accent: 'bg-vyro-accent hover:bg-vyro-accent-hover text-white font-medium shadow-xs shadow-vyro-accent/20 active:translate-y-px',
  };

  return (
    <button
      className={twMerge(clsx(baseStyles, sizeStyles[size], variantStyles[variant], className))}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};
