import type { Metadata } from 'next';
import Image from 'next/image';
import HomeClient from './home-client';

export const metadata: Metadata = {
  title: 'PHCL Super | Marketplace, Wallet and Community',
  description:
    'PHCL Super helps you trade smarter, manage your wallet, and shop trusted marketplace products in one modern platform.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'PHCL Super | Marketplace, Wallet and Community',
    description:
      'Trade smarter, manage funds safely, and connect with the PHCL Super community.',
    type: 'website',
    url: 'https://phclsuper.com',
    siteName: 'PHCL Super',
  },
};

export default function Home() {
  return (
    <div className="flex flex-col items-start justify-start min-h-screen w-full">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes cloth-sway {
          0% { transform: perspective(1100px) rotateY(0deg) rotateZ(0deg) translateY(0px); }
          20% { transform: perspective(1100px) rotateY(-4deg) rotateZ(-0.45deg) translateY(-1px); }
          45% { transform: perspective(1100px) rotateY(5deg) rotateZ(0.4deg) translateY(1px); }
          70% { transform: perspective(1100px) rotateY(-3deg) rotateZ(-0.25deg) translateY(-1px); }
          100% { transform: perspective(1100px) rotateY(0deg) rotateZ(0deg) translateY(0px); }
        }
        .animate-flag-wave {
          animation: cloth-sway 3.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          transform-origin: left center;
          will-change: transform;
          filter: drop-shadow(0 10px 14px rgba(0, 0, 0, 0.28));
        }
        @keyframes logo-breathe-glow {
          0% {
            box-shadow:
              0 0 0 0 rgba(251, 191, 36, 0.34),
              0 0 0 10px rgba(249, 115, 22, 0.2),
              0 0 30px rgba(251, 146, 60, 0.4);
          }
          50% {
            box-shadow:
              0 0 0 7px rgba(251, 191, 36, 0.28),
              0 0 0 22px rgba(249, 115, 22, 0.14),
              0 0 52px rgba(251, 146, 60, 0.52);
          }
          100% {
            box-shadow:
              0 0 0 0 rgba(251, 191, 36, 0.34),
              0 0 0 10px rgba(249, 115, 22, 0.2),
              0 0 30px rgba(251, 146, 60, 0.4);
          }
        }
        .animate-logo-breathe {
          animation: logo-breathe-glow 3.2s ease-in-out infinite;
        }
      `}} />

      <div className="flex items-center justify-between gap-3 md:gap-4 -mt-10 md:-mt-12 mb-2 w-full px-4 md:px-8 lg:px-12">
        <div className="w-32 md:w-48 lg:w-52 overflow-hidden rounded-sm border border-white/25 shadow-[0_0_20px_rgba(0,0,0,0.35)] animate-flag-wave">
          <svg viewBox="0 0 900 600" className="h-auto w-full" role="img" aria-label="Bendera ya Taifa Tanzania">
            <defs>
              <linearGradient id="clothLight" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.03)" />
                <stop offset="100%" stopColor="rgba(0,0,0,0.12)" />
              </linearGradient>
              <pattern id="fabricTexture" width="18" height="18" patternUnits="userSpaceOnUse">
                <path d="M0 9h18M9 0v18" stroke="rgba(255,255,255,0.05)" strokeWidth="0.8" />
              </pattern>
              <filter id="clothWaveTop" x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.01 0.035" numOctaves="2" seed="7" result="noise">
                  <animate attributeName="baseFrequency" dur="3.4s" values="0.01 0.035;0.016 0.048;0.01 0.035" repeatCount="indefinite" />
                </feTurbulence>
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="13" xChannelSelector="R" yChannelSelector="G" />
              </filter>
            </defs>
            <g filter="url(#clothWaveTop)">
              <rect width="900" height="600" fill="#1eb53a" />
              <polygon points="0,600 900,0 900,600" fill="#00a3dd" />
              <g transform="rotate(-33 450 300)">
                <rect x="-260" y="230" width="1420" height="140" fill="#fcd116" />
                <rect x="-260" y="255" width="1420" height="90" fill="#000000" />
              </g>
              <rect width="900" height="600" fill="url(#fabricTexture)" />
              <rect width="900" height="600" fill="url(#clothLight)" />
            </g>
          </svg>
        </div>
        <div className="animate-logo-breathe relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-white/55 bg-[#2f0b63] md:h-20 md:w-20">
          <Image
            src="/phcl-logo.jpg"
            alt="PHCL logo"
            fill
            className="object-cover object-center"
            priority
          />
        </div>
      </div>

      <div className="w-full">
        <HomeClient />
      </div>
    </div>
  );
}
