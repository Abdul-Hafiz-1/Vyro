import React from 'react';

export interface AvatarProps {
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'sun' | 'mint' | 'sky' | 'lavender' | 'coral';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name = 'User',
  size = 'md',
  variant = 'lavender',
  className = '',
}) => {
  const sizeStyles = {
    sm: 'w-8 h-8 text-small',
    md: 'w-10 h-10 text-body font-bold',
    lg: 'w-12 h-12 text-card-title',
  }[size];

  const variantStyles = {
    sun: 'bg-sun',
    mint: 'bg-mint',
    sky: 'bg-sky',
    lavender: 'bg-lavender',
    coral: 'bg-coral',
  }[variant];

  // Derive 1-2 letter initials
  const clean = name.trim();
  const parts = clean.split(/\s+/);
  const initials = parts.length >= 2 
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : (clean.slice(0, 2) || 'U').toUpperCase();

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full border-2 border-ink text-ink select-none shrink-0 ${sizeStyles} ${variantStyles} ${className}`}
      title={name}
    >
      <span>{initials}</span>
    </div>
  );
};
