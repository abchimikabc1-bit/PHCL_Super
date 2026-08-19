import type { Metadata } from 'next';
import './globals.css';
import Navbar from '../components/navbar';
import ComingSoonTicker from '../components/ui/coming-soon-ticker';
import GlobalQuickActions from '../components/global-quick-actions';

export const metadata: Metadata = {
  title: 'PHCL Super - Cryptocurrency Trading Platform',
  description: 'Trade Bitcoin, Ethereum, Pi Network and more.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a1f1d] text-white antialiased">
        <div className="relative min-h-screen overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.14),transparent_30%)]" />

          {/* COMING SOON SCROLLING TICKER */}
          <ComingSoonTicker />

          {/* AI WA KWANZA - MUONEKANO MDOGO WA ZAMBARAU NA NYOTA (SPARKLE) CHINI YA TICKER */}
          <div className="flex justify-center mt-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/35 bg-violet-950/25 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-violet-200 shadow-[0_0_12px_rgba(109,40,217,0.45)] backdrop-blur-md animate-pulse">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="url(#microAiGrad)" />
                <defs>
                  <linearGradient id="microAiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f472b6" />
                    <stop offset="50%" stopColor="#c084fc" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
              </svg>
              PHCL Super Platform
            </div>
          </div>

          <Navbar />
          <GlobalQuickActions />

          <main className="relative z-10 mx-auto w-full max-w-7xl px-3 pb-10 pt-24 sm:px-5 lg:px-6">
            <div className="rounded-[28px] border border-white/15 bg-white/5 shadow-[0_18px_60px_rgba(2,8,23,0.35)] backdrop-blur-2xl">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
