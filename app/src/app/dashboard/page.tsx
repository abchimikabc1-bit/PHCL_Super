'use client';

import { useState, lazy, Suspense } from 'react';
import { ShoppingCart, TrendingUp, Users, Sun, Moon, Menu, X } from 'lucide-react';

const Chat = lazy(() => import('@/components/marketplace/chat').then(m => ({ default: m.Chat })));
const Shop = lazy(() => import('@/components/marketplace/shop').then(m => ({ default: m.Shop })));

export default function Dashboard() {
  const [tab, setTab] = useState('store');
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState('en');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [balance] = useState(5234.50);
  const [cryptoPrices] = useState({ btc: 65420.50, eth: 3450.75, pi: 314159, usdt: 1.0 });

  const addToCart = (product: any) => {
    alert(`Added ${product.name} to cart!`);
  };

  const tabs = [
    { id: 'store', label: language === 'en' ? 'Store' : 'Soko', icon: ShoppingCart },
    { id: 'trading', label: language === 'en' ? 'Trading' : 'Uuzaji', icon: TrendingUp },
    { id: 'community', label: language === 'en' ? 'Community' : 'Jamii', icon: Users },
  ];

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-900'}`}>
      {/* Header */}
      <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b shadow-lg sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">PHCL Super</h1>
          
          <div className="hidden md:flex items-center gap-4">
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className={`px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-gray-100 border-gray-300'}`}
            >
              <option value="en">English</option>
              <option value="sw">Kiswahili</option>
            </select>
            
            <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className={`px-4 py-2 rounded-lg font-semibold ${darkMode ? 'bg-gray-700' : 'bg-green-100 text-green-800'}`}>
              Balance: {balance.toFixed(2)} USD
            </div>
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className={`md:hidden border-t ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'} p-4 space-y-2`}>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className={`w-full px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-800 text-white border-gray-600' : 'bg-white border-gray-300'}`}>
              <option value="en">English</option>
              <option value="sw">Kiswahili</option>
            </select>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setMobileMenuOpen(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                tab === id
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : darkMode
                  ? 'bg-gray-700 hover:bg-gray-600'
                  : 'bg-white hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {tab === 'store' && (
            <Suspense fallback={<div className={`p-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading Store...</div>}>
              <Shop darkMode={darkMode} onAddToCart={addToCart} />
            </Suspense>
          )}

          {tab === 'trading' && (
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-8 shadow-lg`}>
              <h2 className="text-3xl font-bold mb-6">Trading Dashboard</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className={`${darkMode ? 'bg-gray-700' : 'bg-blue-50'} p-6 rounded-lg`}>
                  <p className="text-sm text-gray-500 mb-2">BTC Price</p>
                  <p className="text-2xl font-bold">${cryptoPrices.btc.toFixed(2)}</p>
                </div>
                <div className={`${darkMode ? 'bg-gray-700' : 'bg-blue-50'} p-6 rounded-lg`}>
                  <p className="text-sm text-gray-500 mb-2">ETH Price</p>
                  <p className="text-2xl font-bold">${cryptoPrices.eth.toFixed(2)}</p>
                </div>
                <div className={`${darkMode ? 'bg-gray-700' : 'bg-blue-50'} p-6 rounded-lg`}>
                  <p className="text-sm text-gray-500 mb-2">Pi Network</p>
                  <p className="text-2xl font-bold">${cryptoPrices.pi.toFixed(2)}</p>
                </div>
                <div className={`${darkMode ? 'bg-gray-700' : 'bg-blue-50'} p-6 rounded-lg`}>
                  <p className="text-sm text-gray-500 mb-2">USDT Price</p>
                  <p className="text-2xl font-bold">${cryptoPrices.usdt.toFixed(2)}</p>
                </div>
              </div>
              <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Live trading charts and order placement coming soon.</p>
            </div>
          )}

          {tab === 'community' && (
            <div className="space-y-4">
              <Suspense fallback={<div className={`p-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading Chat...</div>}>
                <Chat darkMode={darkMode} language={language} />
              </Suspense>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t mt-8 py-6`}>
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>© 2024 PHCL Company Limited</p>
          <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>1 Pi = $314,159 | Secure & Fast Trading</p>
        </div>
      </footer>
    </div>
  );
}
