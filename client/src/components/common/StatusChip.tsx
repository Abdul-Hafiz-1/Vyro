import React from 'react';
import { CheckCircle2, AlertCircle, XCircle, Clock, Tag } from 'lucide-react';

export type StatusRole = 'handled' | 'needsYou' | 'declined' | 'inProgress' | 'neutral';

export interface StatusChipProps {
  label: string;
  role?: StatusRole;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
  onClick?: () => void;
}

export const StatusChip: React.FC<StatusChipProps> = ({
  label,
  role = 'neutral',
  icon,
  size = 'md',
  className = '',
  onClick,
}) => {
  const sizeStyles = {
    sm: 'text-secondary px-2.5 py-0.5 gap-1.5 h-6.5',
    md: 'text-secondary px-3 py-1 gap-1.5 h-7.5',
  }[size];

  // Specific color styles with matching border and text
  let roleStyles = 'bg-raised text-text-muted border-border-subtle';
  let defaultIcon: React.ReactNode = <Tag className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />;

  if (role === 'handled') {
    roleStyles = 'bg-status-handled/10 text-status-handled border-status-handled/30';
    defaultIcon = <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-status-handled" strokeWidth={2.2} />;
  } else if (role === 'needsYou') {
    roleStyles = 'bg-status-needs/10 text-status-needs border-status-needs/30';
    defaultIcon = <AlertCircle className="w-3.5 h-3.5 shrink-0 text-status-needs" strokeWidth={2.2} />;
  } else if (role === 'declined') {
    roleStyles = 'bg-status-declined/10 text-status-declined border-status-declined/30';
    defaultIcon = <XCircle className="w-3.5 h-3.5 shrink-0 text-status-declined" strokeWidth={2.2} />;
  } else if (role === 'inProgress') {
    roleStyles = 'bg-status-progress/10 text-status-progress border-status-progress/30';
    defaultIcon = <Clock className="w-3.5 h-3.5 shrink-0 text-status-progress" strokeWidth={2.2} />;
  }

  const interactive = onClick ? 'cursor-pointer hover:brightness-110 active:scale-95' : '';

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center font-medium rounded-pill border select-none transition-all ${sizeStyles} ${roleStyles} ${interactive} ${className}`}
    >
      {icon || defaultIcon}
      <span>{label}</span>
    </span>
  );
};
