import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 
  | 'coral' | 'white' | 'sun' | 'mint' | 'rose' | 'lavender' | 'ghost'
  | 'primary' | 'secondary' | 'outline' | 'danger' | 'accent';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'coral',
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
  const base = 'inline-flex items-center justify-center font-bold text-ink rounded-full select-none cursor-pointer text-center';
  
  const sizeStyles = {
    sm: 'min-h-[40px] px-4 py-1.5 text-small gap-2',
    md: 'min-h-[46px] px-6 py-2.5 text-body gap-2.5',
    lg: 'min-h-[52px] px-8 py-3 text-body gap-3 text-lg',
  }[size];

  // Map legacy variants to paper-and-ink palette
  let activeVariant: 'coral' | 'white' | 'sun' | 'mint' | 'rose' | 'lavender' | 'ghost' = 'coral';
  switch (variant) {
    case 'primary':
    case 'accent':
    case 'coral':
      activeVariant = 'coral';
      break;
    case 'secondary':
    case 'outline':
    case 'white':
      activeVariant = 'white';
      break;
    case 'danger':
    case 'rose':
      activeVariant = 'rose';
      break;
    case 'sun':
      activeVariant = 'sun';
      break;
    case 'mint':
      activeVariant = 'mint';
      break;
    case 'lavender':
      activeVariant = 'lavender';
      break;
    case 'ghost':
      activeVariant = 'ghost';
      break;
  }

  const variantStyles = {
    coral: 'bg-coral border-2 border-ink shadow-hard hover:-translate-y-0.5 active:translate-y-0.75 active:shadow-hard-press',
    white: 'bg-card border-2 border-ink shadow-hard hover:-translate-y-0.5 active:translate-y-0.75 active:shadow-hard-press',
    sun: 'bg-sun border-2 border-ink shadow-hard hover:-translate-y-0.5 active:translate-y-0.75 active:shadow-hard-press',
    mint: 'bg-mint border-2 border-ink shadow-hard hover:-translate-y-0.5 active:translate-y-0.75 active:shadow-hard-press',
    rose: 'bg-rose border-2 border-ink shadow-hard hover:-translate-y-0.5 active:translate-y-0.75 active:shadow-hard-press',
    lavender: 'bg-lavender border-2 border-ink shadow-hard hover:-translate-y-0.5 active:translate-y-0.75 active:shadow-hard-press',
    ghost: 'bg-transparent border-2 border-transparent hover:bg-card/40 active:translate-y-0.5',
  }[activeVariant];

  const isDisabled = disabled || isLoading;
  const disabledStyles = isDisabled 
    ? 'opacity-50 cursor-not-allowed shadow-none transform-none hover:transform-none active:transform-none pointer-events-none' 
    : 'transition-all duration-150';

  const widthStyle = fullWidth ? 'w-full' : '';

  const prefixIcon = leftIcon || icon;

  return (
    <button
      disabled={isDisabled}
      className={`${base} ${sizeStyles} ${variantStyles} ${disabledStyles} ${widthStyle} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 text-ink animate-spin shrink-0" />
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
