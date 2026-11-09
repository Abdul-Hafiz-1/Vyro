import React from 'react';
import { Check } from 'lucide-react';

export interface ProgressStonesProps {
  currentStep: number; // 1 to 5
  className?: string;
}

const STEPS = [
  'Request sent',
  'Sellers replied',
  'Negotiating',
  'Your OK',
  'Paid',
];

export const ProgressStones: React.FC<ProgressStonesProps> = ({
  currentStep = 1,
  className = '',
}) => {
  return (
    <div className={`w-full py-3 ${className}`}>
      <div className="flex items-center justify-between relative">
        {/* Connecting thick ink line */}
        <div className="absolute left-6 right-6 top-5 h-1 bg-ink -z-0" />

        {STEPS.map((label, idx) => {
          const stepNum = idx + 1;
          const isDone = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;

          let stoneBg = 'bg-card';
          let textColor = 'text-muted';
          let borderColor = 'border-ink';

          if (isDone) {
            stoneBg = 'bg-mint';
            textColor = 'text-ink';
          } else if (isCurrent) {
            stoneBg = 'bg-sun';
            textColor = 'text-ink';
          }

          return (
            <div key={label} className="relative z-10 flex flex-col items-center gap-2">
              <div
                className={`w-10 h-10 rounded-full border-2 ${borderColor} ${stoneBg} flex items-center justify-center font-bold text-body text-ink shadow-hard-sm`}
              >
                {isDone ? (
                  <Check className="w-5 h-5 text-ink" strokeWidth={3} />
                ) : (
                  <span>{stepNum}</span>
                )}
              </div>
              <span
                className={`text-small font-bold text-center select-none whitespace-nowrap max-w-[90px] leading-tight ${textColor}`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
