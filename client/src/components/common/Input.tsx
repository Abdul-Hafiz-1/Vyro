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
    <div className="w-full flex flex-col gap-1.5 text-text-primary">
      {label && (
        <label htmlFor={inputId} className="font-medium text-secondary text-text-primary">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <span className="absolute left-3.5 text-text-muted pointer-events-none flex items-center">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full h-11 px-3.5 bg-surface border border-border-subtle rounded-control text-body text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-volt focus:ring-1 focus:ring-volt transition-colors ${icon ? 'pl-10.5' : ''} ${error ? 'border-status-declined/60' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && (
        <span className="text-secondary text-status-declined">{error}</span>
      )}
      {helperText && !error && (
        <span className="text-secondary text-text-muted">{helperText}</span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
