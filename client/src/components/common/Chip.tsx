import React from 'react';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  variant?: 'sun' | 'coral' | 'mint' | 'lavender';
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onClick,
  icon,
  variant = 'sun',
  className = '',
}) => {
  const activeFills = {
    sun: 'bg-sun shadow-hard',
    coral: 'bg-coral shadow-hard',
    mint: 'bg-mint shadow-hard',
    lavender: 'bg-lavender shadow-hard',
  }[variant];

  const stateStyles = selected
    ? `${activeFills} translate-y-0`
    : 'bg-card hover:-translate-y-0.5 hover:shadow-hard-sm active:translate-y-0.5';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 border-2 border-ink rounded-full font-bold text-small text-ink transition-all duration-150 cursor-pointer select-none ${stateStyles} ${className}`}
    >
      {icon && <span className="shrink-0 flex items-center">{icon}</span>}
      <span>{label}</span>
    </button>
  );
};
