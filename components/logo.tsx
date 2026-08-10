// components/logo.tsx
'use client';

import React from 'react';
import Image from 'next/image';

interface LogoProps {
  width?: number;
// components/logo.tsx
'use client';

import React from 'react';
import Image from 'next/image';

interface LogoProps {
  width?: number;
  height?: number;
  showText?: boolean;
  className?: string;
}

export default function Logo({
  width = 120,
  height = 120,
  showText = true,
  className = '',
}: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`relative flex items-center justify-center w-[${width + 16}px] h-[${height + 16}px] rounded-full bg-gradient-to-r from-[#FFBF00] via-[#FFD700] to-[#006994] shadow-[0_0_20px_#FFBF00] animate-pulse`}>
        <Image
          src="/phcl_logo.jpg"
          alt="PHCL Super Logo"
          width={width}
          height={height}
          className="object-contain"
        />
      </div>
      {showText && (
        <span className="text-xl font-semibold text-amber-300">PHCL Super</span>
      )}
    </div>
      {/* Picha ya Logo kutoka public/ */}
        <div className="relative overflow-hidden rounded-xl bg-slate-950 border border-amber-200/20 shadow-md p-1">
          <Image
            src="/phcl_logo.jpg"
            alt="PHCL Super Logo"
            width={width}
            height={height}
            className="object-contain gold-glow"
          />
        </div>
        {showText && (
          <span className="text-xl font-semibold text-amber-300">PHCL Super</span>
        )}
    </div>
  );
}
