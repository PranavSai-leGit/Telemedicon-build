import React from 'react';

interface MediTaleLogoProps {
  variant?: 'full' | 'compact' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  theme?: 'light' | 'dark' | 'auto';
  showTagline?: boolean;
}

export const MediTaleLogo: React.FC<MediTaleLogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
  showTagline = false,
}) => {
  // Dimension sizing
  const dimensions = {
    sm: { symbol: 24, text: 'text-base', tagline: 'text-[9px]' },
    md: { symbol: 32, text: 'text-xl', tagline: 'text-[10px]' },
    lg: { symbol: 42, text: 'text-2xl', tagline: 'text-xs' },
  }[size];

  const symbolSize = dimensions.symbol;

  return (
    <div className={`inline-flex items-center space-x-2.5 select-none ${className}`}>
      {/* 
        Custom Vector Logo: 
        Abstract 'M' formed from a medical timeline and connected clinical evidence nodes.
        4 primary nodes (left root, peak 1, valley node, peak 2, right termination)
        with connected relationship tracks.
      */}
      <svg
        width={symbolSize}
        height={symbolSize}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200"
      >
        {/* Subtle circular background container for contrast */}
        <rect
          width="40"
          height="40"
          rx="10"
          className="fill-[#173B57] dark:fill-[#111C2C]"
        />

        {/* Outer timeline baseline */}
        <path
          d="M 6 32 L 34 32"
          stroke="#0F766E"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeOpacity="0.3"
        />

        {/* Connected evidence track forming letter M */}
        <path
          d="M 8 30 L 14 12 L 20 22 L 26 12 L 32 30"
          stroke="#0F766E"
          className="stroke-[#5EEAD4] dark:stroke-[#5EEAD4]"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Evidence node 1: Left Anchor (Admission / Condition) */}
        <circle cx="8" cy="30" r="2.5" fill="#FFFFFF" />
        <circle cx="8" cy="30" r="4.5" stroke="#0F766E" className="stroke-[#5EEAD4]" strokeWidth="1" strokeOpacity="0.6" />

        {/* Evidence node 2: Peak 1 (Diagnostic / Encounter) */}
        <circle cx="14" cy="12" r="3" fill="#FFFFFF" />
        <circle cx="14" cy="12" r="1.5" fill="#173B57" />

        {/* Evidence node 3: Valley (Medication / Provenance Link) */}
        <circle cx="20" cy="22" r="2.5" fill="#0F766E" className="fill-[#5EEAD4]" />
        <circle cx="20" cy="22" r="4.5" stroke="#0F766E" className="stroke-[#5EEAD4]" strokeWidth="1" strokeDasharray="2 2" />

        {/* Evidence node 4: Peak 2 (Lab / Intervention) */}
        <circle cx="26" cy="12" r="3" fill="#FFFFFF" />
        <circle cx="26" cy="12" r="1.5" fill="#173B57" />

        {/* Evidence node 5: Right Anchor (Handover / Resolution) */}
        <circle cx="32" cy="30" r="2.5" fill="#FFFFFF" />
        <circle cx="32" cy="30" r="4.5" stroke="#0F766E" className="stroke-[#5EEAD4]" strokeWidth="1" strokeOpacity="0.6" />
      </svg>

      {/* Typography: MediTale Wordmark & Optional Positioning Tagline */}
      {variant === 'full' && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center space-x-1">
            <span className={`font-bold tracking-tight text-[#172B3A] dark:text-[#E7EEF5] ${dimensions.text}`}>
              Medi<span className="text-[#0F766E] dark:text-[#5EEAD4]">Tale</span>
            </span>
          </div>
          {showTagline && (
            <span className={`font-medium tracking-normal text-[#536777] dark:text-[#91A3B5] ${dimensions.tagline}`}>
              Medical history, connected to its evidence.
            </span>
          )}
        </div>
      )}
    </div>
  );
};
