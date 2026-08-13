import Image from 'next/image';
import type { Metadata } from 'next';
import HomeClient from './home-client';

export const homeMetadata: Metadata = {
  title: 'PHCL Super | Marketplace, Wallet and Community',
  description:
    'PHCL Super helps you trade smarter, manage your wallet, and shop trusted marketplace products in one modern platform.',
  alternates: {
    canonical: '/home',
  },
  openGraph: {
    title: 'PHCL Super | Marketplace, Wallet and Community',
    description:
      'Trade smarter, manage funds safely, and connect with the PHCL Super community.',
    type: 'website',
    url: 'https://phclsuper.com/home',
    siteName: 'PHCL Super',
  },
};

export default function HomeShell() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-start">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes cloth-sway {
          0% { transform: perspective(980px) rotateY(0deg) rotateZ(0deg) translateY(0px); }
          25% { transform: perspective(980px) rotateY(-7deg) rotateZ(-0.7deg) translateY(-1px); }
          50% { transform: perspective(980px) rotateY(5deg) rotateZ(0.5deg) translateY(1px); }
          75% { transform: perspective(980px) rotateY(-4deg) rotateZ(-0.4deg) translateY(-1px); }
          100% { transform: perspective(980px) rotateY(0deg) rotateZ(0deg) translateY(0px); }
        }
        @keyframes logo-breathe {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 2px rgba(253, 186, 116, 0.35), 0 0 24px rgba(251, 146, 60, 0.32), 0 0 44px rgba(251, 146, 60, 0.18); }
          50% { transform: scale(1.04); box-shadow: 0 0 0 4px rgba(253, 186, 116, 0.52), 0 0 34px rgba(251, 146, 60, 0.5), 0 0 58px rgba(251, 146, 60, 0.3); }
        }
        @keyframes logo-halo {
          0%, 100% { opacity: 0.65; transform: scale(0.98); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        .animate-flag-wave {
          animation: cloth-sway 2.6s ease-in-out infinite;
          transform-origin: left center;
          will-change: transform;
        }
      `,
        }}
      />

      <div className="mb-4 -mt-12 w-full px-4 md:-mt-14 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl items-start justify-between gap-4">
          <div className="animate-flag-wave w-32 overflow-hidden rounded-sm border border-white/20 shadow-[0_0_20px_rgba(0,0,0,0.35)] md:w-48 lg:w-[13rem]">
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
          <div
            className="relative flex h-20 w-20 items-center justify-center rounded-full border border-amber-200/70 bg-white/10 p-2 backdrop-blur-sm md:h-24 md:w-24 lg:h-28 lg:w-28"
            style={{ animation: 'logo-breathe 2.8s ease-in-out infinite' }}
          >
            <span
              className="pointer-events-none absolute -inset-2 rounded-full border border-orange-200/55"
              style={{ animation: 'logo-halo 2.8s ease-in-out infinite' }}
            />
            <span
              className="pointer-events-none absolute -inset-4 rounded-full bg-[radial-gradient(circle,rgba(251,146,60,0.28)_0%,rgba(251,146,60,0.1)_35%,transparent_70%)]"
              style={{ animation: 'logo-halo 2.8s ease-in-out infinite' }}
            />
            <div className="relative h-full w-full overflow-hidden rounded-full">
              <Image src="/flag.svg" alt="PHCL Super logo" fill priority className="object-cover" />
            </div>
          </div>
        </div>
      </div>

      <div className="w-full">
        <HomeClient />
      </div>
    </div>
  );
}
