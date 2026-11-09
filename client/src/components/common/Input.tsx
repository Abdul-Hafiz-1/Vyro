import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  icon,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col gap-1.5 text-ink">
      {label && (
        <label htmlFor={inputId} className="font-bold text-body text-ink">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <span className="absolute left-4 text-ink pointer-events-none flex items-center">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full min-h-[48px] px-4 py-3 bg-card border-2 border-ink rounded-[14px] text-body text-ink placeholder:text-muted focus:outline-none focus:shadow-hard transition-shadow ${icon ? 'pl-11' : ''} ${error ? 'border-rose bg-rose/10' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && (
        <span className="text-small text-rose font-bold">{error}</span>
      )}
      {helperText && !error && (
        <span className="text-small text-muted">{helperText}</span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
