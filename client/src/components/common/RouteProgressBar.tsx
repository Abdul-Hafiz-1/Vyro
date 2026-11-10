import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMotionPreference } from '../../context/MotionContext';

/**
 * Thin top navigation progress bar that uses transform: scaleX(...) only (zero layout shift).
 */
export const RouteProgressBar: React.FC = () => {
  const location = useLocation();
  const { isReduced } = useMotionPreference();
  const [phase, setPhase] = useState<'idle' | 'active' | 'done'>('idle');

  useEffect(() => {
    if (isReduced) return;
    setPhase('active');
    const t1 = window.setTimeout(() => setPhase('done'), 180);
    const t2 = window.setTimeout(() => setPhase('idle'), 360);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [location.pathname, isReduced]);

  if (phase === 'idle' || isReduced) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 h-[2px] z-[70] pointer-events-none origin-left bg-volt transition-transform duration-200"
      style={{
        transform: phase === 'active' ? 'scaleX(0.75)' : 'scaleX(1)',
        opacity: phase === 'done' ? 0 : 1,
      }}
    />
  );
};
