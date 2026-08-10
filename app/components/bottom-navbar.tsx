// app/components/bottom-navbar.tsx
import Link from 'next/link';
import React from 'react';

/**
 * Fixed bottom navigation bar – mirrors the top Navbar but sits at the bottom of the viewport.
 * Uses the same premium glass‑morphism style and the Zambarau colour palette.
 */
export default function BottomNavbar() {
  return (
    <nav className="bottom-nav fixed inset-x-0 bottom-0 flex items-center justify-around px-4 py-2 bg-white/10 backdrop-blur-xl border-t border-amber-200/20 z-40">
      <Link href="/" className="text-amber-300 hover:text-amber-500">
        Home
      </Link>
      <Link href="/marketplace" className="text-amber-300 hover:text-amber-500">
        Marketplace
      </Link>
      <Link href="/exchange" className="text-amber-300 hover:text-amber-500">
        Exchange
      </Link>
      <Link href="/profile" className="text-amber-300 hover:text-amber-500">
        Profile
      </Link>
      <Link href="/settings" className="text-amber-300 hover:text-amber-500">
        Settings
      </Link>
    </nav>
  );
}
