'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingCart,
  Wallet,
  Settings,
  MessageSquare,
  ArrowLeftRight,
} from 'lucide-react';

const hiddenRoutes = ['/login', '/signup', '/privacy-policy', '/terms-of-service'];

export default function Navbar() {
  const pathname = usePathname();

  if (hiddenRoutes.includes(pathname)) {
    return null;
  }

  return (
    <nav className="fixed bottom-3 left-1/2 z-50 w-[calc(100%-1rem)] max-w-5xl -translate-x-1/2">
      <div className="glass-dark rounded-2xl border border-amber-300/25 px-3 py-2 shadow-[0_0_25px_rgba(251,191,36,0.10)]">
        <div className="flex items-center justify-around gap-1 sm:gap-2">
          <NavLink href="/chat" icon={MessageSquare} label="AI Chat" active={pathname === '/chat'} />
          <NavLink href="/marketplace" icon={ShoppingCart} label="Shop" active={pathname === '/marketplace'} />
          <NavLink href="/exchange" icon={ArrowLeftRight} label="Exchange" active={pathname === '/exchange'} />
          <NavLink href="/wallet" icon={Wallet} label="Wallet" active={pathname === '/wallet'} />
          <NavLink href="/settings" icon={Settings} label="Settings" active={pathname === '/settings'} />
        </div>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        'group flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200',
        active
          ? 'border border-amber-300/50 bg-amber-400/10 text-amber-200 shadow-[0_0_22px_rgba(251,191,36,0.28)]'
          : 'border border-transparent text-slate-300 hover:border-sky-300/30 hover:bg-white/5 hover:text-sky-200 hover:shadow-[0_0_18px_rgba(56,189,248,0.18)]',
      ].join(' ')}
    >
      <Icon size={20} className={active ? 'text-amber-300' : 'text-slate-300 group-hover:text-sky-300'} />
      <span>{label}</span>
    </Link>
  );
}