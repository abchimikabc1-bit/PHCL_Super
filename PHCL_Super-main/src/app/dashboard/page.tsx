import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import HomeClient from '@/app/home-client';

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
    <div className="flex flex-col items-center justify-start min-h-screen relative">
      {/* Uhuishaji (Animation) ya kuifanya bendera ipepee kama upepo */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes wave {
          0% { transform: translateY(0) rotate(0deg) skewX(0deg); }
          25% { transform: translateY(-3px) rotate(1.5deg) skewX(1deg); }
          50% { transform: translateY(1px) rotate(-1.5deg) skewX(-1deg); }
          75% { transform: translateY(-2px) rotate(0.7deg) skewX(0.7deg); }
          100% { transform: translateY(0) rotate(0deg) skewX(0deg); }
        }
        .animate-flag-wave {
          animation: wave 4s ease-in-out infinite;
          transform-origin: left center;
        }
      `}} />

      {/* 1. Msaidizi wetu wa AI anayepepea na kung'aa upande wa kulia juu, chini ya utepe */}
      <Link 
        href="/chat"
        className="fixed top-24 right-4 z-40 flex items-center gap-2 rounded-full border border-yellow-500/25 bg-purple-950/80 p-3 backdrop-blur-md hover:bg-purple-900/90 transition shadow-lg animate-bounce"
        style={{ animationDuration: '3s' }}
      >
        <Sparkles className="h-5 w-5 text-yellow-400 animate-pulse" />
        <span className="hidden sm:inline text-xs font-bold text-yellow-400">Msaidizi wa AI</span>
      </Link>

      {/* 2. Bendera ya Kitaalamu ya PHCL inayopepea kama upepo halisi */}
      <div className="flex flex-col items-center justify-center my-6 w-full">
        <img 
          src="/flag.svg" 
          alt="PHCL Super Flag" 
          className="w-36 h-auto md:w-52 object-contain filter drop-shadow-[0_0_15px_rgba(234,179,8,0.35)] animate-flag-wave" 
        />
      </div>

      {/* 3. Kurasa kuu za mradi wako zinazosomwa hapa chini */}
      <div className="w-full">
        <HomeClient />
      </div>
    </div>
  );
}
