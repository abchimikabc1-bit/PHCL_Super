import dynamic from 'next/dynamic';

// Lazy load heavy components - they only load when needed
export const ChatPage = dynamic(() => import('@/lib/empty-page'), {
  loading: () => <div className="flex items-center justify-center h-screen">Loading...</div>,
  ssr: false // Don't render on server for faster initial load
});

export const MarketplacePage = dynamic(() => import('@/src/app/marketplace/page'), {
  loading: () => <div className="flex items-center justify-center h-screen">Loading...</div>,
  ssr: false
});

export const WalletPage = dynamic(() => import('@/src/app/wallet/page'), {
  loading: () => <div className="flex items-center justify-center h-screen">Loading...</div>,
  ssr: false
});

export const TransactionsPage = dynamic(() => import('@/lib/empty-page'), {
  loading: () => <div className="flex items-center justify-center h-screen">Loading...</div>,
  ssr: false
});

export const LiveMarketPage = dynamic(() => import('@/lib/empty-page'), {
  loading: () => <div className="flex items-center justify-center h-screen">Loading...</div>,
  ssr: false
});

export const ProfilePage = dynamic(() => import('@/lib/empty-page'), {
  loading: () => <div className="flex items-center justify-center h-screen">Loading...</div>,
  ssr: false
});
