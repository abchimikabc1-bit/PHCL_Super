import dynamic from 'next/dynamic';

// Lazy load heavy components - they only load when needed
export const ChatPage = dynamic(() => import('@/app/chat/page'), {
  loading: () => <div className="flex items-center justify-center h-screen">Loading...</div>,
  ssr: false // Don't render on server for faster initial load
});

export const MarketplacePage = dynamic(() => import('@/app/marketplace/page'), {
  loading: () => <div className="flex items-center justify-center h-screen">Loading...</div>,
  ssr: false
});

export const WalletPage = dynamic(() => import('@/app/wallet/page'), {
  loading: () => <div className="flex items-center justify-center h-screen">Loading...</div>,
  ssr: false
});

export const TransactionsPage = dynamic(() => import('@/app/transactions/page'), {
  loading: () => <div className="flex items-center justify-center h-screen">Loading...</div>,
  ssr: false
});

export const LiveMarketPage = dynamic(() => import('@/app/live-market/page'), {
  loading: () => <div className="flex items-center justify-center h-screen">Loading...</div>,
  ssr: false
});

export const ProfilePage = dynamic(() => import('@/app/profile/page'), {
  loading: () => <div className="flex items-center justify-center h-screen">Loading...</div>,
  ssr: false
});
