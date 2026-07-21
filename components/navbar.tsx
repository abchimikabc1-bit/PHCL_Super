'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ShoppingCart, Wallet, Settings, MessageSquare, ArrowLeftRight } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  // Hide navbar on auth pages
  if (pathname === '/login' || pathname === '/signup' || pathname === '/privacy-policy' || pathname === '/terms-of-service') {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="max-w-6xl mx-auto px-4 flex justify-around h-16 items-center">
        <NavLink href="/chat" icon={MessageSquare} label="AI Chat" active={pathname === '/chat'} />
        <NavLink href="/marketplace" icon={ShoppingCart} label="Shop" active={pathname === '/marketplace'} />
        <NavLink href="/exchange" icon={ArrowLeftRight} label="Exchange" active={pathname === '/exchange'} />
        <NavLink href="/wallet" icon={Wallet} label="Wallet" active={pathname === '/wallet'} />
        <NavLink href="/settings" icon={Settings} label="Settings" active={pathname === '/settings'} />
      </div>
    </nav>
  );
}

function NavLink({ href, icon: Icon, label, active }: any) {
  return (
    <Link href={href} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition ${active ? 'text-purple-600' : 'text-gray-600 hover:text-purple-600'}`}>
      <Icon size={24} />
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}
