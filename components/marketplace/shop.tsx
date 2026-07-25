'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMarketplaceProductImage, MARKETPLACE_PRODUCTS } from '@/lib/marketplace-products';
import { 
  CURRENCIES, 
  CurrencyCode, 
  formatCurrency, 
  convertCurrency 
} from './currency';

export default function Shop({
  onAddToCart,
  onNavigateToChat,
  onNavigateToTrading,
}: {
  onAddToCart?: (product: MarketplaceProduct) => void;
  onNavigateToChat?: (product: MarketplaceProduct) => void;
  onNavigateToTrading?: (product: MarketplaceProduct) => void;
}) {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('TZS');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Makundi ya Bidhaa Zilizopo
  const categories = [
    'ALL',
    ...Array.from(new Set(MARKETPLACE_PRODUCTS.map((p) => p.category))),
  ];

  // Chuja Bidhaa kulingana na Search & Category Filter
  const filteredProducts = MARKETPLACE_PRODUCTS.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* 1. Storefront Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/40 border border-slate-800 rounded-3xl p-6 sm:p-10 relative overflow-hidden shadow-2xl">
          <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
            <div className="w-24 h-24 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-4xl shadow-inner flex-shrink-0">
              🏪
            </div>

            <div className="space-y-2 text-center sm:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-3xl font-black text-white">PHCL Official Store</h1>
                <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                  ✓ Verified Merchant
                </span>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm max-w-2xl">
                Karibu kwenye duka letu kuu! Tunatoa bidhaa bora za Magari, Simu za Mkononi, Vifaa vya Elektroniki, na Vazi kwa sarafu na njia zote za malipo.
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-300 pt-1">
                <span>⭐ <strong>4.9/5.0</strong> Rating</span>
                <span>📦 <strong>120+</strong> Bidhaa Zilizouzwa</span>
                <span>⚡ Ufiko wa Papo hapo (Fast Delivery)</span>
              </div>
            </div>

            {/* Currency Switcher Dropdown / Bar */}
            <div className="bg-slate-950/80 border border-slate-800 p-2 rounded-2xl flex items-center gap-1 self-center">
              {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
                <button
                  key={code}
                  onClick={() => setSelectedCurrency(code)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    selectedCurrency === code
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {CURRENCIES[code].symbol} {code}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Controls Bar (Search Bar & Category Tabs) */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            {/* Search Input */}
            <div className="w-full sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 flex items-center gap-2 focus-within:border-amber-500 transition">
              <span className="text-slate-500">🔍</span>
              <input
                type="text"
                placeholder="Tafuta bidhaa dukani..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-100 focus:outline-none placeholder-slate-500"
              />
            </div>

            {/* Total Results Counter */}
            <span className="text-xs text-slate-400">
              Inaonyesha bidhaa <strong className="text-amber-400">{filteredProducts.length}</strong> kati ya {MARKETPLACE_PRODUCTS.length}
            </span>
          </div>

          {/* Category Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                  selectedCategory === cat
                    ? 'bg-amber-500 border-amber-500 text-slate-950'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                {cat === 'ALL' ? 'Vyote (All)' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Products Catalogue Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredProducts.map((product) => {
              const priceConverted = convertCurrency(product.priceUSD, 'USD', selectedCurrency);

              return (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-slate-900/90 border border-slate-800/90 rounded-3xl overflow-hidden hover:border-amber-500/50 transition duration-300 flex flex-col justify-between group shadow-lg"
                >
                  <div className="p-4 space-y-3">
                    {/* Image Box */}
                    <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
                      <img
                        src={product.image || getMarketplaceProductImage(product)}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                      <span className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md text-amber-400 font-extrabold text-[10px] px-3 py-1 rounded-full border border-slate-800">
                        {product.category}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-100 text-base truncate group-hover:text-amber-400 transition">
                        {product.name}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>
                    </div>
                  </div>

                  {/* Price & Action Footer */}
                  <div className="p-4 bg-slate-950/60 border-t border-slate-800/80 space-y-3">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">Bei:</span>
                      <span className="text-lg font-black text-amber-400">
                        {formatCurrency(priceConverted, selectedCurrency)}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => onAddToCart && onAddToCart(product)}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-2 rounded-xl text-xs transition flex items-center justify-center gap-1"
                        title="Ongeza kwenye Kikapu"
                      >
                        🛒 Cart
                      </button>

                      <button
                        onClick={() => onNavigateToChat && onNavigateToChat(product)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 rounded-xl text-xs transition flex items-center justify-center gap-1 border border-slate-700"
                        title="Anzisha Chat"
                      >
                        💬 Chat
                      </button>

                      <button
                        onClick={() => onNavigateToTrading && onNavigateToTrading(product)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2 rounded-xl text-xs transition flex items-center justify-center gap-1 border border-slate-700"
                        title="Fanya Ofa ya Bei"
                      >
                        🤝 Offer
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}