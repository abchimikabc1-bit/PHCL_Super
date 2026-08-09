import React, { useEffect } from 'react';
import Link from 'next/link';
import LanguageSwitcher from './language-switcher';
import HighContrastToggle from './high-contrast-toggle';
import NotificationsDropdown from './notifications-dropdown';
import AdminBanner from './admin-banner';

export default function Navbar() {
  return (
    <nav className="nav-glass fixed top-0 inset-x-0 z-50 flex items-center justify-between px-4 py-2 sm:px-6 lg:px-8 backdrop-blur-xl border-b border-amber-200/20">
      {/* Left side - brand */}
      <div className="flex items-center space-x-4">
        <Link href="/" className="text-2xl font-bold text-amber-300">PHCL Super</Link>
        <Link href="/marketplace" className="text-sm font-medium text-amber-100 hover:text-amber-300">Marketplace</Link>
        <Link href="/exchange" className="text-sm font-medium text-amber-100 hover:text-amber-300">Currency Exchange</Link>
        <Link href="/profile" className="text-sm font-medium text-amber-100 hover:text-amber-300">KYC & Profile</Link>
        <Link href="/download" className="text-sm font-medium text-amber-100 hover:text-amber-300">Download App</Link>
      </div>
      {/* Right side – utilities */}
      <div className="flex items-center space-x-3">
        <LanguageSwitcher />
        <HighContrastToggle />
        <NotificationsDropdown />
        <Link href="/chat" className="text-sm font-medium text-amber-100 hover:text-amber-300">AI Chat</Link>
        <Link href="/wallet" className="text-sm font-medium text-amber-100 hover:text-amber-300">Wallet</Link>
        <Link href="/settings" className="text-sm font-medium text-amber-100 hover:text-amber-300">Settings</Link>
      </div>
    </nav>
  );
}
