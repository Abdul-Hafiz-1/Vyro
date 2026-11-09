import React from 'react';

export interface AvatarProps {
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const BG_PALETTE = [
  'bg-status-progress/20 text-status-progress',
  'bg-status-handled/20 text-status-handled',
  'bg-status-needs/20 text-status-needs',
  'bg-volt/20 text-volt',
];

export const Avatar: React.FC<AvatarProps> = ({
  name = 'User',
  size = 'md',
  className = '',
}) => {
  const sizeStyles = {
    sm: 'w-8 h-8 text-secondary font-medium',
    md: 'w-9 h-9 text-secondary font-medium',
    lg: 'w-11 h-11 text-body font-semibold',
  }[size];

  // Derive initials
  const clean = (name || '').trim();
  const parts = clean.split(/\s+/);
  const initials = parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : (clean.slice(0, 2) || 'U').toUpperCase();

  // Deterministic color from name
  const charCode = clean.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const colorClass = BG_PALETTE[charCode % BG_PALETTE.length];

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full select-none shrink-0 border border-border-subtle ${sizeStyles} ${colorClass} ${className}`}
      title={name}
    >
      <span>{initials}</span>
    </div>
  );
};
