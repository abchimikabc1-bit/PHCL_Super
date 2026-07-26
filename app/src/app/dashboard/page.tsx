'use client';

import React, { useState, lazy, Suspense } from 'react';
import { 
  ShoppingCart, 
  TrendingUp, 
  MessageSquare, 
  Wallet as WalletIcon, 
  Package, 
  Store, 
  Tv, 
  CreditCard,
  Sun, 
  Moon, 
  Menu, 
  X,
  Globe,
  RefreshCw
} from 'lucide-react';
import { CurrencyCode, convertCurrency, formatCurrency } from '@/components/marketplace/currency';

// Lazy loading component za Marketplace ili kuboresha performance
const Shop = lazy(() => import('@/components/marketplace/shop'));
const Showroom = lazy(() => import('@/components/marketplace/showroom'));
const Cart = lazy(() => import('@/components/marketplace/cart'));
const Checkout = lazy(() => import('@/components/marketplace/checkout'));
const Order = lazy(() => import('@/components/marketplace/order'));
const Wallet = lazy(() => import('@/components/marketplace/wallet'));
const Trading = lazy(() => import('@/components/marketplace/trading'));
const Chat = lazy(() => import('@/components/marketplace/chat'));

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('shop');
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState<'en' | 'sw'>('sw');
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('TZS');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Default USD Base Balance
  const [baseBalanceUSD] = useState(12500.00);

  // Tabs za Mfumo wa Kimataifa
  const tabs = [
    { id: 'shop', label: language === 'en' ? 'Store Catalogue' : 'Duka Kuu', icon: Store },
    { id: 'showroom', label: language === 'en' ? 'Virtual Showroom' : 'Showroom', icon: Tv },
    { id: 'cart', label: language === 'en' ? 'Cart' : 'Kikapu', icon: ShoppingCart },
    { id: 'checkout', label: language === 'en' ? 'Checkout' : 'Kuthibiti Malipo', icon: CreditCard },
    { id: 'order', label: language === 'en' ? 'Orders' : 'Oda Zangu', icon: Package },
    { id: 'wallet', label: language === 'en' ? 'Global Wallet' : 'Mkoba wa Pesa', icon: WalletIcon },
    { id: 'trading', label: language === 'en' ? 'Bidding & Offers' : 'Uuzaji & Ofa', icon: TrendingUp },
    { id: 'chat', label: language === 'en' ? 'Live Chat' : 'Ujumbe', icon: MessageSquare },
  ];

  // Hesabu ya Salio kwa Sarafu Iliyochaguliwa
  const currentBalance = convertCurrency(baseBalanceUSD, 'USD', selectedCurrency);

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* 1. Global Enterprise Header */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur-md transition-colors ${
        darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex justify-between items-center">
          
          {/* Logo & Platform Tag */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center font-black text-slate-950 shadow-lg shadow-amber-500/20">
              P
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500 bg-clip-text text-transparent">
                PHCL SUPER
              </h1>
              <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Global Cross-Border Platform
              </span>
            </div>
          </div>

          {/* Desktop Right Controls */}
          <div className="hidden lg:flex items-center gap-4">
            
            {/* Multi-Currency Selector */}
            <div className={`p-1 rounded-2xl border flex items-center gap-1 ${
              darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
            }`}>
              {(['TZS', 'USD', 'nTZS', 'PI'] as CurrencyCode[]).map((code) => (
                <button
                  key={code}
                  onClick={() => setSelectedCurrency(code)}
                  className={`px-3 py-1 rounded-xl text-xs font-extrabold transition ${
                    selectedCurrency === code
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>

            {/* Language Switcher */}
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-2xl border text-xs font-bold ${
              darkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-300'
            }`}>
              <Globe size={14} className="text-amber-500" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'en' | 'sw')}
                className="bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="en" className={darkMode ? 'bg-slate-900' : 'bg-white'}>English</option>
                <option value="sw" className={darkMode ? 'bg-slate-900' : 'bg-white'}>Kiswahili</option>
              </select>
            </div>

            {/* Dark/Light Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-2xl border transition ${
                darkMode ? 'bg-slate-950 border-slate-800 text-amber-400 hover:bg-slate-800' : 'bg-slate-100 border-slate-300 text-slate-700'
              }`}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Wallet Balance Display */}
            <div className="bg-amber-500/10 border border-amber-500/30 px-4 py-1.5 rounded-2xl flex items-center gap-2">
              <WalletIcon size={16} className="text-amber-500" />
              <span className="text-xs font-extrabold text-amber-400">
                {formatCurrency(currentBalance, selectedCurrency)}
              </span>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-slate-800 text-slate-200"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className={`lg:hidden border-t p-4 space-y-4 ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400">Badili Sarafu:</span>
              <div className="flex gap-1">
                {(['TZS', 'USD', 'nTZS', 'PI'] as CurrencyCode[]).map((code) => (
                  <button
                    key={code}
                    onClick={() => setSelectedCurrency(code)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      selectedCurrency === code ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <span className="text-xs font-bold text-slate-400">Salio Lako:</span>
              <span className="text-sm font-extrabold text-amber-400">
                {formatCurrency(currentBalance, selectedCurrency)}
              </span>
            </div>
          </div>
        )}
      </header>

      {/* 2. Global Navigation Tabs */}
      <div className={`border-b sticky top-[65px] z-40 backdrop-blur-md ${
        darkMode ? 'bg-slate-950/80 border-slate-800/80' : 'bg-white/80 border-slate-200/80'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-none">
            {tabs.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all border ${
                    isActive
                      ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                      : darkMode
                      ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard View Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <Suspense fallback={
          <div className="min-h-[500px] flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="animate-spin text-amber-500" size={32} />
            <p className="text-xs font-bold text-slate-400">Inapakia Jukwaa la Kimataifa...</p>
          </div>
        }>
          {activeTab === 'shop' && <Shop />}
          {activeTab === 'showroom' && <Showroom />}
          {activeTab === 'cart' && <Cart />}
          {activeTab === 'checkout' && <Checkout />}
          {activeTab === 'order' && <Order />}
          {activeTab === 'wallet' && <Wallet />}
          {activeTab === 'trading' && <Trading />}
          {activeTab === 'chat' && <Chat />}
        </Suspense>
      </main>

      {/* 4. Global Enterprise Footer */}
      <footer className={`border-t py-8 transition-colors ${
        darkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
          <div>
            <p className="font-extrabold text-slate-200">© 2026 PHCL Super Company Limited.</p>
            <p className="text-[10px] text-slate-500">Cross-Border E-Commerce & Multi-Currency Platform</p>
          </div>

          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span className="text-amber-400 font-bold">1 PI = $314,159 USD</span>
            <span>•</span>
            <span className="text-emerald-400 font-bold">1 nTZS = 1 TZS</span>
            <span>•</span>
            <span className="text-blue-400 font-bold">1 USD = 2,700 TZS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}