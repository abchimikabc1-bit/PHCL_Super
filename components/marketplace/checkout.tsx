'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CURRENCIES, 
  CurrencyCode, 
  PAYMENT_METHODS, 
  PaymentMethod, 
  convertCurrency, 
  formatCurrency 
} from './currency';
import { getMarketplaceProductImage, MARKETPLACE_PRODUCTS } from '@/lib/marketplace-products';

// Mfano wa bidhaa zilizopo kwenye Cart kwa ajili ya Onyesho la Checkout
interface CartItem {
  product: MarketplaceProduct;
  quantity: number;
}

export default function Checkout() {
  // Demo Cart Items (Unapoingiza Cart yako halisi utaunganisha na State Manager/Context)
  const [cartItems] = useState<CartItem[]>([
    { product: MARKETPLACE_PRODUCTS[0], quantity: 1 }, // Mercedes C200
    { product: MARKETPLACE_PRODUCTS[6], quantity: 2 }, // iPhone 16 Pro Max
  ]);

  // States za Checkout
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>(PAYMENT_METHODS[0]);
  const [accountInput, setAccountInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Form States
  const [shippingInfo, setShippingInfo] = useState({
    fullName: '',
    phone: '',
    city: 'Dar es Salaam',
    address: '',
  });

  // Kukokotoa Mahesabu
  const rawSubtotalUSD = cartItems.reduce(
    (acc, item) => acc + item.product.priceUSD * item.quantity,
    0
  );

  const shippingCostUSD = 150; // Flat rate shipping
  const totalUSD = rawSubtotalUSD + shippingCostUSD;

  // Kubadilisha Thamani Kulingana na Sarafu Iliyochaguliwa
  const subtotalConverted = convertCurrency(rawSubtotalUSD, 'USD', selectedCurrency);
  const shippingConverted = convertCurrency(shippingCostUSD, 'USD', selectedCurrency);
  const totalConverted = convertCurrency(totalUSD, 'USD', selectedCurrency);

  // Chuja Njia za Malipo Zinazokubalika na Sarafu Iliyochaguliwa
  const availablePayments = PAYMENT_METHODS.filter((method) =>
    method.supportedCurrencies.includes(selectedCurrency)
  );

  // Kubadili Sarafu na kuweka Payment Method ya kwanza inayokubalika
  const handleCurrencyChange = (code: CurrencyCode) => {
    setSelectedCurrency(code);
    const validMethods = PAYMENT_METHODS.filter((m) =>
      m.supportedCurrencies.includes(code)
    );
    if (validMethods.length > 0 && !validMethods.includes(selectedPayment)) {
      setSelectedPayment(validMethods[0]);
    }
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingInfo.fullName || !shippingInfo.phone || !accountInput) {
      alert('Tafadhali jaza taarifa zote zinazohitajika!');
      return;
    }

    setIsProcessing(true);

    // Simulation ya Malipo (Payment Processing)
    setTimeout(() => {
      setIsProcessing(false);
      setOrderSuccess(true);
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-amber-500 font-bold text-xs tracking-wider uppercase">
              Secure Checkout Engine
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
              Kamilisha Malipo na Oda
            </h1>
          </div>

          {/* Dynamic Currency Switcher */}
          <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-2xl flex items-center gap-1 self-start md:self-auto">
            {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
              <button
                key={code}
                onClick={() => handleCurrencyChange(code)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
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

        {/* Success Modal Notification */}
        <AnimatePresence>
          {orderSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-3xl text-center space-y-3"
            >
              <div className="text-4xl">🎉</div>
              <h2 className="text-2xl font-bold text-emerald-400">
                Oda Yako Imepokelewa Kikamilifu!
              </h2>
              <p className="text-slate-300 text-sm max-w-lg mx-auto">
                Asante **{shippingInfo.fullName}**! Malipo ya **{formatCurrency(totalConverted, selectedCurrency)}** kupitia **{selectedPayment.name}** yamethibitishwa. Tutawasiliana nawe kupitia **{shippingInfo.phone}**.
              </p>
              <button
                onClick={() => setOrderSuccess(false)}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-2 rounded-xl text-sm transition"
              >
                Rudi Kwenye Duka
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Form Info & Payment Options (8 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Taarifa za Mteja & Anwani */}
            <div className="bg-slate-900 border border-slate-800/90 rounded-3xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-400 text-xs flex items-center justify-center border border-amber-500/20">
                  1
                </span>
                Anwani na Anwani ya Utoaji (Shipping)
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-slate-400 text-xs mb-1 font-medium">Jina Kamili</label>
                  <input
                    type="text"
                    required
                    placeholder="Mfano: Juma Rashid"
                    value={shippingInfo.fullName}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, fullName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-xs mb-1 font-medium">Namba ya Simu</label>
                  <input
                    type="tel"
                    required
                    placeholder="Mfano: 0754 000 000"
                    value={shippingInfo.phone}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-xs mb-1 font-medium">Mji / Mkoa</label>
                  <input
                    type="text"
                    required
                    value={shippingInfo.city}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-xs mb-1 font-medium">Anwani ya Mtaani / Mtaa</label>
                  <input
                    type="text"
                    required
                    placeholder="Mfano: Mikocheni, Mwai Kibaki Rd"
                    value={shippingInfo.address}
                    onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-amber-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* 2. Njia za Malipo (Payment Gateway) */}
            <div className="bg-slate-900 border border-slate-800/90 rounded-3xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-400 text-xs flex items-center justify-center border border-amber-500/20">
                  2
                </span>
                Chagua Njia ya Malipo ({selectedCurrency})
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availablePayments.map((method) => {
                  const isSelected = selectedPayment.id === method.id;
                  return (
                    <div
                      key={method.id}
                      onClick={() => setSelectedPayment(method)}
                      className={`p-4 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <p className="font-bold text-sm text-slate-100">{method.name}</p>
                        <p className="text-xs text-slate-500">Provider: {method.provider}</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-amber-500 bg-amber-500' : 'border-slate-600'}`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic Account Input Box */}
              <div className="pt-2">
                <label className="block text-slate-300 text-xs mb-1 font-medium">
                  {selectedPayment.accountDetailsHint}
                </label>
                <input
                  type="text"
                  required
                  placeholder={selectedPayment.accountDetailsHint}
                  value={accountInput}
                  onChange={(e) => setAccountInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-amber-500 transition font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900 border border-slate-800/90 rounded-3xl p-6 space-y-5 sticky top-6">
              <h2 className="text-lg font-bold text-slate-100 border-b border-slate-800 pb-3">
                Muhtasari wa Oda ({cartItems.length})
              </h2>

              {/* Mini Cart List */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {cartItems.map(({ product, quantity }) => (
                  <div key={product.id} className="flex items-center gap-3 text-sm">
                    <img
                      src={product.image || getMarketplaceProductImage(product)}
                      alt={product.name}
                      className="w-12 h-12 rounded-xl object-cover bg-slate-950 border border-slate-800"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-200 truncate">{product.name}</p>
                      <p className="text-xs text-slate-400">Idadi: {quantity}</p>
                    </div>
                    <p className="font-bold text-amber-400">
                      {formatCurrency(
                        convertCurrency(product.priceUSD * quantity, 'USD', selectedCurrency),
                        selectedCurrency
                      )}
                    </p>
                  </div>
                ))}
              </div>

              {/* Calculation Rows */}
              <div className="border-t border-slate-800 pt-4 space-y-2 text-sm text-slate-400">
                <div className="flex justify-between">
                  <span>Jumla Ndogo (Subtotal)</span>
                  <span className="text-slate-200 font-medium">
                    {formatCurrency(subtotalConverted, selectedCurrency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Usafirishaji (Shipping)</span>
                  <span className="text-slate-200 font-medium">
                    {formatCurrency(shippingConverted, selectedCurrency)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-slate-100 pt-3 border-t border-slate-800">
                  <span>Jumla Kuu (Total)</span>
                  <span className="text-amber-400 text-xl">
                    {formatCurrency(totalConverted, selectedCurrency)}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black py-4 rounded-2xl shadow-lg transition transform active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <span className="animate-spin text-xl">🌀</span> Inachakata Malipo...
                  </>
                ) : (
                  <>
                    🔒 Lipa {formatCurrency(totalConverted, selectedCurrency)} Sasa
                  </>
                )}
              </button>

              <p className="text-center text-xs text-slate-500">
                🔒 Malipo yako yanalindwa kwa mfumo wa usalama wa PHCL Encrypted Protocol.
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}