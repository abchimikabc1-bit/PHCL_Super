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
      <body className="min-h-screen bg-[radial-gradient(circle_at_0%_0%,rgba(56,189,248,0.14),transparent_26%),radial-gradient(circle_at_100%_0%,rgba(168,85,247,0.18),transparent_30%),linear-gradient(135deg,#1b1033_0%,#0b1120_55%,#090d16_100%)] text-white antialiased">
        <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_bottom,rgba(251,191,36,0.05),transparent_30%)]" />

        <ComingSoonTicker />
        <Navbar />
        <GlobalQuickActions />

        <main className="relative z-10 pt-28">{children}</main>
      </body>
    </html>
  );
}