'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CURRENCIES, 
  CurrencyCode, 
  convertCurrency, 
  formatCurrency 
} from './currency';
import { 
  MARKETPLACE_PRODUCTS, 
  MarketplaceProduct, 
  getMarketplaceProductImage 
} from './marketplace-products';

export interface CartItem {
  product: MarketplaceProduct;
  quantity: number;
}

export default function Cart({
  onNavigateToCheckout,
}: {
  onNavigateToCheckout?: () => void;
}) {
  // Demo Cart Items Initial State na Ukaguzi wa Salama (Safe Fallback)
  const defaultItems: CartItem[] = [];
  if (MARKETPLACE_PRODUCTS[0]) defaultItems.push({ product: MARKETPLACE_PRODUCTS[0], quantity: 1 });
  if (MARKETPLACE_PRODUCTS[1] || MARKETPLACE_PRODUCTS[0]) {
    defaultItems.push({ product: MARKETPLACE_PRODUCTS[1] || MARKETPLACE_PRODUCTS[0], quantity: 2 });
  }

  const [cartItems, setCartItems] = useState<CartItem[]>(defaultItems);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');

  // Helper Functions za Idadi na Kufuta
  const updateQuantity = (productId: string | number, delta: number) => {
    setCartItems((prevItems) =>
      prevItems
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeItem = (productId: string | number) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => setCartItems([]);

  // Mahesabu ya Jumla
  const rawSubtotalUSD = cartItems.reduce(
    (acc, item) => acc + item.product.priceUSD * item.quantity,
    0
  );

  const subtotalConverted = convertCurrency(rawSubtotalUSD, 'USD', selectedCurrency);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="border-b border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-amber-500 font-bold text-xs tracking-wider uppercase">
              Shopping Cart Engine
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white flex items-center gap-3">
              🛒 Kikapu Chako ({cartItems.length})
            </h1>
          </div>

          {/* Currency Switcher Bar */}
          <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-2xl flex items-center gap-1 self-start sm:self-auto">
            {CURRENCIES && (Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
              <button
                key={code}
                onClick={() => setSelectedCurrency(code)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedCurrency === code
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {CURRENCIES[code]?.symbol || '$'} {code}
              </button>
            ))}
          </div>
        </div>

        {cartItems.length === 0 ? (
          /* Empty Cart State */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 border border-slate-800/80 rounded-3xl p-12 text-center space-y-4"
          >
            <div className="text-6xl">🛍️</div>
            <h2 className="text-2xl font-bold text-slate-200">Kikapu chako kiko wazi!</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto">
              Hujachagua bidhaa yoyote bado. Peruzi kwenye Showroom yetu uweze kuongeza bidhaa kwenye kikapu.
            </p>
          </motion.div>
        ) : (
          /* Cart Grid Content */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Items List (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex justify-between items-center text-xs text-slate-400 px-2">
                <span>BIDHAA ZILIZOCHAGULIWA</span>
                <button
                  onClick={clearCart}
                  className="text-rose-400 hover:underline font-medium"
                >
                  Futa Zote 🗑️
                </button>
              </div>

              <AnimatePresence>
                {cartItems.map(({ product, quantity }) => {
                  const itemTotalUSD = product.priceUSD * quantity;
                  const itemTotalConverted = convertCurrency(itemTotalUSD, 'USD', selectedCurrency);

                  return (
                    <motion.div
                      key={product.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="bg-slate-900 border border-slate-800/90 rounded-2xl p-4 flex gap-4 items-center group hover:border-slate-700 transition"
                    >
                      <img
                        src={product.image || getMarketplaceProductImage(product)}
                        alt={product.name}
                        className="w-20 h-20 rounded-xl object-cover bg-slate-950 border border-slate-800 flex-shrink-0"
                      />

                      <div className="flex-1 min-w-0 space-y-1">
                        {product.category && (
                          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                            {product.category}
                          </span>
                        )}
                        <h3 className="font-bold text-slate-100 text-sm truncate">
                          {product.name}
                        </h3>
                        <p className="text-xs text-slate-400">
                          Moja: {formatCurrency(convertCurrency(product.priceUSD, 'USD', selectedCurrency), selectedCurrency)}
                        </p>

                        {/* Quantity Control Buttons */}
                        <div className="flex items-center gap-3 pt-2">
                          <div className="bg-slate-950 border border-slate-800 rounded-lg flex items-center">
                            <button
                              onClick={() => updateQuantity(product.id, -1)}
                              className="px-2.5 py-1 text-slate-400 hover:text-white transition font-bold"
                            >
                              -
                            </button>
                            <span className="px-3 text-xs font-bold text-amber-400">
                              {quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(product.id, 1)}
                              className="px-2.5 py-1 text-slate-400 hover:text-white transition font-bold"
                            >
                              +
                            </button>
                          </div>

                          <button
                            onClick={() => removeItem(product.id)}
                            className="text-xs text-rose-500/80 hover:text-rose-400 transition"
                          >
                            Ondoa
                          </button>
                        </div>
                      </div>

                      {/* Total Item Price */}
                      <div className="text-right flex-shrink-0">
                        <p className="font-extrabold text-amber-400 text-sm sm:text-base">
                          {formatCurrency(itemTotalConverted, selectedCurrency)}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Cart Summary Card (5 Cols) */}
            <div className="lg:col-span-5">
              <div className="bg-slate-900 border border-slate-800/90 rounded-3xl p-6 space-y-6 sticky top-6">
                <h2 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-3">
                  Muhtasari wa Kikapu
                </h2>

                <div className="space-y-3 text-sm text-slate-400">
                  <div className="flex justify-between">
                    <span>Jumla ya Idadi</span>
                    <span className="text-slate-200 font-bold">
                      {cartItems.reduce((sum, item) => sum + item.quantity, 0)} Vitu
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sarafu Iliyochaguliwa</span>
                    <span className="text-amber-400 font-bold">{selectedCurrency}</span>
                  </div>
                  <div className="flex justify-between text-base font-extrabold text-slate-100 pt-4 border-t border-slate-800">
                    <span>Jumla Ndogo</span>
                    <span className="text-amber-400 text-2xl">
                      {formatCurrency(subtotalConverted, selectedCurrency)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={onNavigateToCheckout}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black py-4 rounded-2xl shadow-lg transition transform active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  🚀 Endelea na Malipo (Checkout)
                </button>

                <p className="text-center text-xs text-slate-500">
                  ⚡ Mfumo utahamisha bidhaa hizi moja kwa moja kwenda Checkout Engine.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}