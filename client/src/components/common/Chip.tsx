import React from 'react';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onClick,
  icon,
  className = '',
}) => {
  const stateStyles = selected
    ? 'bg-raised text-text-primary border-volt/60 font-medium'
    : 'bg-surface text-text-muted border-border-subtle hover:text-text-primary hover:bg-raised transition-colors';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-8.5 px-3 border rounded-control text-secondary select-none cursor-pointer ${stateStyles} ${className}`}
    >
      {icon && <span className="shrink-0 flex items-center">{icon}</span>}
      <span>{label}</span>
    </button>
  );
};
