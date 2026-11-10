export const MOTION_DURATION = {
  micro: 0.12,
  standard: 0.2,
  emphasis: 0.32,
  max: 0.4,
} as const;

export const MOTION_EASE = {
  standard: [0.2, 0.8, 0.2, 1] as const,
  exit: [0.4, 0, 1, 1] as const,
};

export const EASE_STANDARD = MOTION_EASE.standard;

export const MOTION_TRANSITION = {
  micro: { duration: MOTION_DURATION.micro, ease: MOTION_EASE.standard },
  standard: { duration: MOTION_DURATION.standard, ease: MOTION_EASE.standard },
  emphasis: { duration: MOTION_DURATION.emphasis, ease: MOTION_EASE.standard },
  exit: { duration: MOTION_DURATION.standard, ease: MOTION_EASE.exit },
};

export function pageEnterVariants(isReduced: boolean) {
  return {
    initial: isReduced ? { opacity: 0 } : { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: MOTION_TRANSITION.standard },
    exit: isReduced ? { opacity: 0 } : { opacity: 0, y: -4, transition: MOTION_TRANSITION.exit },
  };
}

export function listItemVariants(isReduced: boolean, index: number) {
  const capped = Math.min(index, 7);
  return {
    initial: isReduced ? { opacity: 0 } : { opacity: 0, y: 8 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: MOTION_DURATION.standard,
        ease: MOTION_EASE.standard,
        delay: isReduced ? 0 : capped * 0.04,
      },
    },
    exit: {
      opacity: 0,
      scale: isReduced ? 1 : 0.98,
      transition: MOTION_TRANSITION.micro,
    },
  };
}
