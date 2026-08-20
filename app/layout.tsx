import type { Metadata } from 'next';
import './globals.css';
import Navbar from '../components/navbar';
import ComingSoonTicker from '../components/ui/coming-soon-ticker';
import GlobalQuickActions from '../components/global-quick-actions';

export const metadata: Metadata = {
  title: 'PHCL Super - Cryptocurrency Trading Platform',
  description: 'Trade Bitcoin, Ethereum, Pi Network and more.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a1f1d] text-white antialiased">
        <div className="relative min-h-screen overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.14),transparent_30%)]" />

          {/* COMING SOON TICKER TU */}
          <ComingSoonTicker />
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
