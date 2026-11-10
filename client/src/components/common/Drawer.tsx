import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useMotionPreference } from '../../context/MotionContext';
import { MOTION_DURATION, MOTION_EASE } from '../../lib/motion';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  const { isReduced } = useMotionPreference();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      window.setTimeout(() => closeBtnRef.current?.focus(), 20);
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: MOTION_DURATION.standard, ease: MOTION_EASE.standard }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-end bg-black/60"
          onClick={onClose}
        >
          <motion.div
            initial={isReduced ? { opacity: 0 } : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={isReduced ? { opacity: 0 } : { opacity: 0, x: 24 }}
            transition={{ duration: MOTION_DURATION.standard, ease: MOTION_EASE.standard }}
            className="w-full sm:max-w-[480px] h-[85vh] sm:h-full bg-surface border-t sm:border-l border-border-subtle rounded-t-surface sm:rounded-none p-6 overflow-y-auto flex flex-col gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border-subtle pb-4">
              <h3 className="font-display font-semibold text-section text-text-primary">
                {title}
              </h3>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={onClose}
                aria-label="Close drawer"
                className="p-1.5 text-text-muted hover:text-text-primary rounded-control hover:bg-raised transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt"
              >
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            <div className="flex-1 text-text-primary">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
