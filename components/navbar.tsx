'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  ShoppingCart, 
  Wallet, 
  Settings, 
  MessageSquare, 
  ArrowLeftRight, 
  User // Tumeongeza icon ya User kwa ajili ya Profile
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();

  // Hide navbar on auth pages and policies
  if (
    pathname === '/login' || 
    pathname === '/signup' || 
    pathname === '/privacy-policy' || 
    pathname === '/terms-of-service'
  ) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-lg">
      <div className="max-w-6xl mx-auto px-2 flex justify-around h-16 items-center">
        <NavLink href="/chat" icon={MessageSquare} label="AI Chat" active={pathname === '/chat'} />
        <NavLink href="/marketplace" icon={ShoppingCart} label="Shop" active={pathname === '/marketplace'} />
        <NavLink href="/exchange" icon={ArrowLeftRight} label="Exchange" active={pathname === '/exchange'} />
        <NavLink href="/wallet" icon={Wallet} label="Wallet" active={pathname === '/wallet'} />
        {/* KITUFE CHA PROFILE - KINAWELEKEZA KWENYE /PROFILE KIOTOMATIKI */}
        <NavLink href="/profile" icon={User} label="Profile" active={pathname === '/profile'} />
        <NavLink href="/settings" icon={Settings} label="Settings" active={pathname === '/settings'} />
      </div>
    </nav>
  );
}

function NavLink({ href, icon: Icon, label, active }: any) {
  return (
    <Link 
      href={href} 
      className={`flex flex-col items-center gap-0.5 p-1 rounded-lg transition ${
        active ? 'text-purple-600 font-bold scale-105' : 'text-gray-600 hover:text-purple-600'
      }`}
    >
      <Icon size={22} />
      <span className="text-[10px] font-medium tracking-tight">{label}</span>
    </Link>
  );
}
