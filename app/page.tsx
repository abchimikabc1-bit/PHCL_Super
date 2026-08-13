import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
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
    <div className="min-h-screen">
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

      <section className="w-full px-4 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-950/55 p-4 shadow-[0_18px_48px_rgba(0,0,0,0.28)] backdrop-blur-xl">
          <div className="flex min-w-0 flex-1 items-center">
            <div className="w-32 max-w-full overflow-hidden rounded-sm border border-white/20 shadow-[0_0_20px_rgba(0,0,0,0.35)] animate-flag-wave sm:w-44 lg:w-56">
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

          <div className="flex flex-1 justify-end">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-2xl border border-amber-300/20 bg-white/5 px-3 py-2 text-right shadow-[0_0_24px_rgba(251,191,36,0.08)] transition hover:bg-white/10"
              aria-label="PHCL Super home brand"
            >
              <div className="hidden text-right sm:block">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">PHCL Super</p>
                <p className="text-sm text-white/75">Pi Hub Company Limited</p>
              </div>
              <Image
                src="/placeholder-logo.svg"
                alt="PHCL Super"
                width={215}
                height={48}
                priority
                className="h-9 w-auto max-w-[9rem] sm:h-10 sm:max-w-[12rem] lg:h-12 lg:max-w-[13.5rem]"
              />
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Kurasa kuu za mradi wako zinazosomwa hapa chini */}
      <div className="w-full">
        <HomeClient />
      </div>
    </div>
  );
}
