import React, { useEffect, useRef, useState } from 'react';
import { useMotionPreference } from '../../context/MotionContext';

interface RollingNumberProps {
  value: number;
  format?: (n: number) => string;
  durationMs?: number;
  className?: string;
}

/**
 * Rolls numeric display values cleanly with tabular digits over 300ms (max 400ms).
 * Instantly updates when reduced motion is active.
 */
export const RollingNumber: React.FC<RollingNumberProps> = ({
  value,
  format = (n) => String(Math.round(n)),
  durationMs = 300,
  className = ''
}) => {
  const { isReduced } = useMotionPreference();
  const [displayValue, setDisplayValue] = useState<number>(value);
  const prevRef = useRef<number>(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const startVal = prevRef.current;
    const endVal = value;
    if (isReduced || startVal === endVal || !Number.isFinite(endVal)) {
      prevRef.current = endVal;
      setDisplayValue(endVal);
      return;
    }

    const dur = Math.min(380, Math.max(120, durationMs));
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / dur);
      // Standard ease cubic-bezier(0.2, 0.8, 0.2, 1) approximation
      const eased = 1 - Math.pow(1 - t, 3);
      const current = startVal + (endVal - startVal) * eased;
      setDisplayValue(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        prevRef.current = endVal;
        setDisplayValue(endVal);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      prevRef.current = endVal;
    };
  }, [value, durationMs, isReduced]);

  return <span className={`tabular-nums ${className}`}>{format(displayValue)}</span>;
};
