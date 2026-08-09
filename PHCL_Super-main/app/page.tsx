import type { Metadata } from 'next';
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
    <div className="flex flex-col items-center justify-start min-h-screen">
      {/* Msimbo wa CSS kwa ajili ya kuifanya bendera ipepee kama upepo halisi (Waving Flag) */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes cloth-sway {
          0% { transform: perspective(980px) rotateY(0deg) rotateZ(0deg) translateY(0px); }
          25% { transform: perspective(980px) rotateY(-7deg) rotateZ(-0.7deg) translateY(-1px); }
          50% { transform: perspective(980px) rotateY(5deg) rotateZ(0.5deg) translateY(1px); }
          75% { transform: perspective(980px) rotateY(-4deg) rotateZ(-0.4deg) translateY(-1px); }
          100% { transform: perspective(980px) rotateY(0deg) rotateZ(0deg) translateY(0px); }
        }
        .animate-flag-wave {
          animation: cloth-sway 2.6s ease-in-out infinite;
          transform-origin: left center; /* Upepeaji unaanzia kushoto kama mlingoti wa bendera halisi */
          will-change: transform;
        }
      `}} />

      {/* 1. Bendera ya Taifa Tanzania inayopepea live */}
      <div className="flex flex-col items-center justify-center -mt-12 md:-mt-14 mb-1 w-full">
        <div className="w-64 md:w-96 lg:w-[26rem] overflow-hidden rounded-sm border border-white/20 shadow-[0_0_20px_rgba(0,0,0,0.35)] animate-flag-wave">
          <svg viewBox="0 0 900 600" className="h-auto w-full" role="img" aria-label="Bendera ya Taifa Tanzania">
            <defs>
              <filter id="clothWaveTop" x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.012 0.04" numOctaves="2" seed="7" result="noise">
                  <animate attributeName="baseFrequency" dur="2.4s" values="0.012 0.04;0.018 0.055;0.012 0.04" repeatCount="indefinite" />
                </feTurbulence>
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="18" xChannelSelector="R" yChannelSelector="G" />
              </filter>
            </defs>
            <g filter="url(#clothWaveTop)">
              <rect width="900" height="600" fill="#1eb53a" />
              <polygon points="0,600 900,0 900,600" fill="#00a3dd" />
              <g transform="rotate(-33 450 300)">
                <rect x="-260" y="230" width="1420" height="140" fill="#fcd116" />
                <rect x="-260" y="255" width="1420" height="90" fill="#000000" />
              </g>
            </g>
          </svg>
        </div>
      </div>

      {/* 2. Kurasa kuu za mradi wako zinazosomwa hapa chini */}
      <div className="w-full">
        <HomeClient />
      </div>
    </div>
  );
}
