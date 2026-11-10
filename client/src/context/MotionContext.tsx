import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MotionConfig } from 'framer-motion';

export type MotionPreferenceSetting = 'system' | 'full' | 'reduced';

interface MotionContextValue {
  preference: MotionPreferenceSetting;
  isReduced: boolean;
  setPreference: (pref: MotionPreferenceSetting) => void;
}

const STORAGE_KEY = 'vyro_motion_preference';

const MotionContext = createContext<MotionContextValue>({
  preference: 'system',
  isReduced: false,
  setPreference: () => {}
});

export const MotionProvider: React.FC<{
  userPreference?: MotionPreferenceSetting;
  children: React.ReactNode;
}> = ({ userPreference, children }) => {
  const [preference, setPreferenceState] = useState<MotionPreferenceSetting>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved === 'full' || saved === 'reduced' || saved === 'system') return saved;
    return userPreference || 'system';
  });

  const [osReduced, setOsReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (userPreference && ['system', 'full', 'reduced'].includes(userPreference)) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) setPreferenceState(userPreference);
    }
  }, [userPreference]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setOsReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const isReduced = preference === 'reduced' || (preference === 'system' && osReduced);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isReduced) {
      document.documentElement.classList.add('motion-reduced');
    } else {
      document.documentElement.classList.remove('motion-reduced');
    }
  }, [isReduced]);

  const setPreference = useCallback((pref: MotionPreferenceSetting) => {
    setPreferenceState(pref);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, pref);
    }
  }, []);

  return (
    <MotionContext.Provider value={{ preference, isReduced, setPreference }}>
      <MotionConfig reducedMotion={isReduced ? 'always' : 'user'}>
        {children}
      </MotionConfig>
    </MotionContext.Provider>
  );
};

export const useMotionPreference = (): MotionContextValue => useContext(MotionContext);
