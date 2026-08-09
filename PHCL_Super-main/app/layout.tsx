import type { Metadata } from 'next';
import './globals.css';
import Navbar from '../components/navbar'; // Usanidi sahihi uliorekebishwa hapa!
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
      <body className="bg-purple-950 text-white min-h-screen">
        {/* 1. Utepe kitembezi uliowekwa kwa njia sahihi kabisa ya kijiografia */}
        <ComingSoonTicker />

        {/* 2. Menu ya juu (Navbar) iliyosahihishwa njia yake ya kijiografia */}
        <Navbar />

        {/* 2.1 Vifungo vinavyoonekana muda wote: AI + Bendera */}
        <GlobalQuickActions />

        {/* 3. Sehemu kuu ya kurasa za mradi wako */}
        <main className="pt-28">
          {children}
        </main>
      </body>
    </html>
  );
}
