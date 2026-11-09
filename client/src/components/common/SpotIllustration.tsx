import React from 'react';

export interface SpotIllustrationProps {
  name: 'empty-box' | 'handshake' | 'sparkle-search' | 'ticket' | 'all-done' | 'shield';
  size?: number;
  className?: string;
}

export const SpotIllustration: React.FC<SpotIllustrationProps> = ({
  name,
  size = 140,
  className = '',
}) => {
  switch (name) {
    case 'empty-box':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 160 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Background decorative blob */}
          <circle cx="80" cy="80" r="64" fill="#D9C8FF" stroke="#1C1A17" strokeWidth="2.5" />
          {/* Box base */}
          <rect x="42" y="66" width="76" height="56" rx="10" fill="#FFFFFF" stroke="#1C1A17" strokeWidth="2.5" />
          {/* Box lid open */}
          <path d="M36 66L80 44L124 66" fill="#FFD23F" stroke="#1C1A17" strokeWidth="2.5" />
          {/* Box tape or flap */}
          <rect x="70" y="66" width="20" height="26" rx="4" fill="#FF6B4A" stroke="#1C1A17" strokeWidth="2.5" />
          {/* Playful stars */}
          <circle cx="34" cy="42" r="5" fill="#7FDDB0" stroke="#1C1A17" strokeWidth="2" />
          <circle cx="128" cy="48" r="6" fill="#9CCBFF" stroke="#1C1A17" strokeWidth="2" />
        </svg>
      );

    case 'sparkle-search':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 160 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <rect x="25" y="25" width="110" height="110" rx="30" fill="#FFD23F" stroke="#1C1A17" strokeWidth="2.5" />
          {/* Magnifying Glass */}
          <circle cx="72" cy="72" r="28" fill="#FFFFFF" stroke="#1C1A17" strokeWidth="2.5" />
          <line x1="92" y1="92" x2="116" y2="116" stroke="#1C1A17" strokeWidth="6" strokeLinecap="round" />
          {/* Sparkles */}
          <circle cx="114" cy="44" r="6" fill="#FF6B4A" stroke="#1C1A17" strokeWidth="2" />
          <circle cx="48" cy="112" r="5" fill="#7FDDB0" stroke="#1C1A17" strokeWidth="2" />
        </svg>
      );

    case 'all-done':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 160 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <circle cx="80" cy="80" r="62" fill="#7FDDB0" stroke="#1C1A17" strokeWidth="2.5" />
          <path
            d="M52 80L72 100L112 60"
            stroke="#1C1A17"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="126" cy="40" r="6" fill="#FFD23F" stroke="#1C1A17" strokeWidth="2" />
          <circle cx="34" cy="118" r="5" fill="#D9C8FF" stroke="#1C1A17" strokeWidth="2" />
        </svg>
      );

    case 'ticket':
    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 160 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <rect x="30" y="45" width="100" height="70" rx="14" fill="#FFFFFF" stroke="#1C1A17" strokeWidth="2.5" />
          <path d="M30 80 A 10 10 0 0 1 30 60" fill="#FBF7F0" stroke="#1C1A17" strokeWidth="2.5" />
          <path d="M130 60 A 10 10 0 0 1 130 80" fill="#FBF7F0" stroke="#1C1A17" strokeWidth="2.5" />
          <line x1="80" y1="46" x2="80" y2="114" stroke="#1C1A17" strokeWidth="2.5" strokeDasharray="4 4" />
          <circle cx="55" cy="80" r="12" fill="#FF6B4A" stroke="#1C1A17" strokeWidth="2" />
          <rect x="95" y="72" width="20" height="16" rx="4" fill="#9CCBFF" stroke="#1C1A17" strokeWidth="2" />
        </svg>
      );
  }
};
