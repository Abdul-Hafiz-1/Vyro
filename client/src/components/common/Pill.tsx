import React from 'react';
import { StatusChip, StatusRole } from './StatusChip';

export interface PillProps {
  label: string;
  variant?: 'coral' | 'sun' | 'mint' | 'sky' | 'rose' | 'lavender' | 'paper' | 'white';
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
  onClick?: () => void;
}

export const Pill: React.FC<PillProps> = ({
  label,
  variant = 'lavender',
  icon,
  size = 'md',
  className = '',
  onClick
}) => {
  let role: StatusRole = 'neutral';
  if (variant === 'mint') role = 'handled';
  else if (variant === 'sun' || variant === 'coral') role = 'needsYou';
  else if (variant === 'rose') role = 'declined';
  else if (variant === 'sky') role = 'inProgress';

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
