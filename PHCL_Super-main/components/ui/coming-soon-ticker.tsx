'use client';

import React from 'react';

export default function ComingSoonTicker() {
  return (
    <>
      {/* Msimbo wa kipekee wa uhuishaji (Animation) ya kutembeza maandishi */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes ribbon-glow {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes sparkle-burst {
          0%, 100% { transform: scale(0.85); opacity: 0.35; filter: brightness(1); }
          50% { transform: scale(1.35); opacity: 1; filter: brightness(1.7); }
        }
        @keyframes star-travel {
          0% { transform: translateX(-24px); opacity: 0.25; }
          50% { opacity: 0.95; }
          100% { transform: translateX(24px); opacity: 0.25; }
        }
        .animate-marquee-custom {
          animation: marquee 18s linear infinite;
        }
        .ticker-ribbon {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.03) 18%, rgba(0,0,0,0.18) 100%),
            linear-gradient(90deg, #4c1d95 0%, #6d28d9 35%, #7e22ce 55%, #6b21a8 75%, #4c1d95 100%);
          background-size: 100% 100%, 200% 100%;
          animation: ribbon-glow 8s linear infinite;
          pointer-events: none;
          filter: saturate(1.08) contrast(1.05) brightness(1.02);
          box-shadow:
            inset 0 5px 10px rgba(255,255,255,0.10),
            inset 0 -8px 14px rgba(0,0,0,0.20),
            0 2px 10px rgba(88,28,135,0.30);
        }
        .ticker-ribbon::before,
        .ticker-ribbon::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .ticker-ribbon::before {
          background: none;
          animation: sparkle-burst 1.6s ease-in-out infinite;
          opacity: 0.35;
        }
        .ticker-ribbon::after {
          background:
            linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.13) 25%, transparent 50%, rgba(250,204,21,0.10) 70%, transparent 100%);
          background-size: 180% 100%;
          animation: star-travel 3.1s linear infinite;
          opacity: 0.65;
        }
        .ticker-star {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 9;
          color: #facc15;
          text-shadow: 0 0 8px rgba(250, 204, 21, 0.85), 0 0 16px rgba(255, 255, 255, 0.35);
          pointer-events: none;
          animation: sparkle-burst 1.5s ease-in-out infinite;
        }
        .ticker-star.s1 { left: 12px; font-size: 15px; animation-delay: 0s; }
        .ticker-star.s2 { left: 46px; font-size: 11px; color: #e9d5ff; animation-delay: 0.35s; }
        .ticker-star.s3 { right: 46px; font-size: 11px; color: #93c5fd; animation-delay: 0.6s; }
        .ticker-star.s4 { right: 12px; font-size: 15px; animation-delay: 0.9s; }
        @media (max-width: 640px) {
          .ticker-ribbon {
            opacity: 0.95;
          }
        }
      `}} />

      {/* Utepe sasa unalazimishwa kukaa chini zaidi ya Navbar (top-[80px]) na kuwa juu ya kila kitu (z-[99999]) */}
      <div 
        className="fixed top-[80px] left-0 right-0 w-full h-12 md:h-14 z-[99999] overflow-hidden flex items-center pointer-events-none"
        style={{ 
          backgroundColor: '#581c87', // Rangi thabiti ya zambarau (bila blur/wingu)
          borderBottom: '1px solid rgba(234, 179, 8, 0.25)' // Mstari wa dhahabu wa chini
        }}
        aria-label="PHCL coming soon ticker"
      >
        <div className="ticker-ribbon" />
        <span className="ticker-star s1">✦</span>
        <span className="ticker-star s2">✧</span>
        <span className="ticker-star s3">✧</span>
        <span className="ticker-star s4">✦</span>

        {/* Maandishi yanayotembea kwa unyumbufu na rangi zake za asili za kioo */}
        <div className="relative z-10 inline-flex gap-7 md:gap-10 animate-marquee-custom whitespace-nowrap will-change-transform px-3 md:px-4">
          <span className="text-lg md:text-xl font-extrabold tracking-wider drop-shadow-[0_0_8px_rgba(250,204,21,0.35)]" style={{ color: '#facc15' }}>
            ✨ PHCL Super Coming Soon ✨
          </span>
          <span className="text-2xl md:text-3xl font-black leading-none drop-shadow-[0_0_10px_rgba(96,165,250,0.45)]" style={{ color: '#60a5fa' }}>|</span>
          <span className="text-lg md:text-xl font-extrabold tracking-wider drop-shadow-[0_0_8px_rgba(74,222,128,0.35)]" style={{ color: '#4ade80' }}>
            Marketplace Salama na yenye Kasi ya Dhoruba
          </span>
          <span className="text-2xl md:text-3xl font-black leading-none drop-shadow-[0_0_10px_rgba(96,165,250,0.45)]" style={{ color: '#60a5fa' }}>|</span>
          <span className="text-lg md:text-xl font-extrabold tracking-wider drop-shadow-[0_0_8px_rgba(233,213,255,0.35)]" style={{ color: '#e9d5ff' }}>
            PHCL Super Platform na Language EN/SW
          </span>
          <span className="text-2xl md:text-3xl font-black leading-none drop-shadow-[0_0_10px_rgba(96,165,250,0.45)]" style={{ color: '#60a5fa' }}>|</span>
          <span className="text-lg md:text-xl font-extrabold tracking-wider drop-shadow-[0_0_8px_rgba(250,204,21,0.35)]" style={{ color: '#facc15' }}>
            ✨ PHCL Super Coming Soon ✨
          </span>
        </div>
      </div>
    </>
  );
}
