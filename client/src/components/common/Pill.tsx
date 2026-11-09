import React from 'react';

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
  const sizeStyles = {
    sm: 'text-small px-3 py-1 gap-1.5 min-h-[30px]',
    md: 'text-body px-4 py-1.5 gap-2 min-h-[36px]',
  }[size];

  const variantStyles = {
    coral: 'bg-coral text-ink border-2 border-ink',
    sun: 'bg-sun text-ink border-2 border-ink',
    mint: 'bg-mint text-ink border-2 border-ink',
    sky: 'bg-sky text-ink border-2 border-ink',
    rose: 'bg-rose text-ink border-2 border-ink',
    lavender: 'bg-lavender text-ink border-2 border-ink',
    paper: 'bg-paper text-ink border-2 border-ink',
    white: 'bg-card text-ink border-2 border-ink',
  }[variant];

  const interactive = onClick 
    ? 'cursor-pointer hover:-translate-y-0.5 active:translate-y-0.5 shadow-hard-sm' 
    : '';

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center font-bold rounded-full select-none ${sizeStyles} ${variantStyles} ${interactive} ${className}`}
    >
      {icon && <span className="shrink-0 flex items-center">{icon}</span>}
      <span>{label}</span>
    </span>
  );
};
