import React from 'react';
import { Pill } from './Pill';
import { CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 
    | 'success' | 'warning' | 'danger' | 'info' | 'default' | 'accent' | 'neutral' | 'error'
    | 'coral' | 'sun' | 'mint' | 'sky' | 'rose' | 'lavender';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  dot?: boolean;
  className?: string;
  onClick?: () => void;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  icon,
  dot,
  className = '',
  onClick
}) => {
  let mappedVariant: 'coral' | 'sun' | 'mint' | 'sky' | 'rose' | 'lavender' = 'lavender';
  let defaultIcon: React.ReactNode = null;

  switch (variant) {
    case 'success':
    case 'mint':
      mappedVariant = 'mint';
      defaultIcon = <CheckCircle2 className="w-4 h-4 text-ink" strokeWidth={2.5} />;
      break;
    case 'warning':
    case 'sun':
      mappedVariant = 'sun';
      defaultIcon = <AlertCircle className="w-4 h-4 text-ink" strokeWidth={2.5} />;
      break;
    case 'danger':
    case 'error':
    case 'rose':
      mappedVariant = 'rose';
      defaultIcon = <XCircle className="w-4 h-4 text-ink" strokeWidth={2.5} />;
      break;
    case 'info':
    case 'sky':
      mappedVariant = 'sky';
      defaultIcon = <Clock className="w-4 h-4 text-ink" strokeWidth={2.5} />;
      break;
    case 'coral':
    case 'accent':
      mappedVariant = 'coral';
      break;
    case 'neutral':
    default:
      mappedVariant = 'lavender';
      break;
  }

  const label = typeof children === 'string' ? children : String(children || '');

  return (
    <Pill
      label={label}
      variant={mappedVariant}
      icon={
        icon || (dot ? (
          <span className="w-2 h-2 rounded-full bg-ink inline-block" />
        ) : defaultIcon)
      }
      size={size}
      className={className}
      onClick={onClick}
    />
  );
};
