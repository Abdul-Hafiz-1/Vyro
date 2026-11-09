import React from 'react';
import { StatusChip, StatusRole } from './StatusChip';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: string;
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
  className = '',
  onClick
}) => {
  let role: StatusRole = 'neutral';
  if (variant === 'success' || variant === 'mint') role = 'handled';
  else if (variant === 'warning' || variant === 'sun' || variant === 'coral' || variant === 'accent') role = 'needsYou';
  else if (variant === 'danger' || variant === 'error' || variant === 'rose') role = 'declined';
  else if (variant === 'info' || variant === 'sky') role = 'inProgress';

  const label = typeof children === 'string' ? children : String(children || '');

  return (
    <StatusChip
      label={label}
      role={role}
      icon={icon}
      size={size}
      className={className}
      onClick={onClick}
    />
  );
};
