import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [isLight, setIsLight] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vyro-theme') === 'light' ||
        document.documentElement.classList.contains('light');
    }
    return false;
  });

  useEffect(() => {
    if (isLight) {
      document.documentElement.classList.add('light');
      localStorage.setItem('vyro-theme', 'light');
    } else {
      document.documentElement.classList.remove('light');
      localStorage.setItem('vyro-theme', 'dark');
    }
  }, [isLight]);

  return (
    <button
      onClick={() => setIsLight(prev => !prev)}
      className={`p-1.5 rounded-[5px] bg-vyro-surface hover:bg-vyro-hover border border-vyro-border text-vyro-muted hover:text-vyro-text transition-colors flex items-center justify-center ${className}`}
      title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
      aria-label="Toggle Theme"
    >
      {isLight ? (
        <Moon className="w-3.5 h-3.5 text-vyro-accent" />
      ) : (
        <Sun className="w-3.5 h-3.5 text-vyro-warning" />
      )}
    </button>
  );
};
