import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'volt' | 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline' | 'accent' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'volt',
  size = 'md',
  fullWidth = false,
  icon,
  leftIcon,
  rightIcon,
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const base = 'inline-flex items-center justify-center font-medium rounded-control select-none cursor-pointer transition-all duration-150 text-center tracking-normal';

  const sizeStyles = {
    sm: 'h-9 px-3.5 text-secondary gap-1.5',
    md: 'h-10.5 px-4.5 text-body gap-2',
    lg: 'h-12 px-6 text-body gap-2.5 font-semibold',
  }[size];

  // Map variants: 'volt' and 'primary' both use the bold Volt lime fill with near-black text
  let variantStyles = 'bg-volt text-[#0C0E0D] font-semibold border border-transparent hover:brightness-105 active:scale-[0.98]';
  if (variant === 'secondary' || variant === 'outline') {
    variantStyles = 'bg-surface text-text-primary border border-border-subtle hover:bg-raised active:scale-[0.98]';
  } else if (variant === 'ghost') {
    variantStyles = 'bg-transparent text-text-muted hover:text-text-primary hover:bg-raised active:scale-[0.98]';
  } else if (variant === 'destructive' || variant === 'danger') {
    variantStyles = 'bg-status-declined/10 text-status-declined border border-status-declined/25 hover:bg-status-declined/20 active:scale-[0.98]';
  }

  const isDisabled = disabled || isLoading;
  const disabledStyles = isDisabled
    ? 'opacity-40 cursor-not-allowed transform-none hover:transform-none pointer-events-none'
    : '';

  const widthStyle = fullWidth ? 'w-full' : '';
  const prefixIcon = leftIcon || icon;

  return (
    <button
      disabled={isDisabled}
      className={`${base} ${sizeStyles} ${variantStyles} ${disabledStyles} ${widthStyle} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        prefixIcon && <span className="shrink-0 flex items-center">{prefixIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && (
        <span className="shrink-0 flex items-center">{rightIcon}</span>
      )}
    </button>
  );
};
