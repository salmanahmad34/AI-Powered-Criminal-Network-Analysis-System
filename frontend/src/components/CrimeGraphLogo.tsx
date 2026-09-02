import React from 'react';

interface CrimeGraphLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textClassName?: string;
}

export default function CrimeGraphLogo({
  className = 'w-6 h-6',
  size = 24,
  showText = true,
  textClassName = 'text-xs font-semibold text-black tracking-tight',
}: CrimeGraphLogoProps) {
  return (
    <div className="inline-flex items-center gap-2 select-none">
      {/* CrimeGraph AI Original Symbol Icon */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Outer Shield Hexagon Frame */}
        <polygon
          points="16,2 29,8 29,24 16,30 3,24 3,8"
          fill="#09090b"
          stroke="#27272a"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Network Graph Link Edges */}
        <line x1="16" y1="9" x2="9" y2="17" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.8" />
        <line x1="16" y1="9" x2="23" y2="17" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.8" />
        <line x1="9" y1="17" x2="16" y2="23" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.8" />
        <line x1="23" y1="17" x2="16" y2="23" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.8" />
        <line x1="9" y1="17" x2="23" y2="17" stroke="#ffffff" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.6" />

        {/* Graph Vertices (Network Nodes) */}
        {/* Top Node */}
        <circle cx="16" cy="9" r="2.5" fill="#ffffff" />
        {/* Left Node */}
        <circle cx="9" cy="17" r="2.2" fill="#e4e4e7" />
        {/* Right Node */}
        <circle cx="23" cy="17" r="2.2" fill="#e4e4e7" />
        {/* Bottom Node */}
        <circle cx="16" cy="23" r="2.5" fill="#ffffff" />

        {/* Central Core (AI Intelligence Spark) */}
        <circle cx="16" cy="17" r="1.8" fill="#10b981" />
      </svg>

      {showText && (
        <span className={textClassName}>
          CrimeGraph <span className="font-mono text-zinc-400 font-normal">AI</span>
        </span>
      )}
    </div>
  );
}
