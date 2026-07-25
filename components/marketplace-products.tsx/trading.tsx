'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MARKETPLACE_PRODUCTS, MarketplaceProduct, getMarketplaceProductImage } from '../marketplace-products';
import { 
  CURRENCIES, 
  CurrencyCode, 
  formatCurrency, 
  convertCurrency 
} from './currency';

export interface Offer {
  id: string;
  offeredBy: 'user' | 'seller';
  amountUSD: number;
  currency: CurrencyCode;
  note: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COUNTERED';
  timestamp: string;
}

export default function Trading({
  product = MARKETPLACE_PRODUCTS[0], // Default product (e.g. Mercedes C200)
  onNavigateToCheckout,
}: {
  product?: MarketplaceProduct;
  onNavigateToCheckout?: () => void;
}) {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('TZS');
  const [customOfferInput, setCustomOfferInput] = useState('');
  const [offerNoteInput, setOfferNoteInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Demo Negotiation Offers Log
  const [offersHistory, setOffersHistory] = useState<Offer[]>([
    {
      id: 'off-1',
      offeredBy: 'seller',
      amountUSD: product.priceUSD,
      currency: 'USD',
      note: 'Bei rasmi ya kuanzia sokoni.',
      status: 'COUNTERED',
      timestamp: 'Juzi 10:00 AM',
    },
    {
      id: 'off-2',
      offeredBy: 'user',
      amountUSD: product.priceUSD * 0.9, // 10% discount request
      currency: 'TZS',
      note: 'Naomba unishushie kwa 10% nitatuma pesa leo hivi.',
      status: 'PENDING',
      timestamp: 'Leo 11:30 AM',
    },
  ]);

  const latestOffer = offersHistory[offersHistory.length - 1];

  const handleSendOffer = (e: React.FormEvent) => {
    e.preventDefault();
    const offeredAmount = parseFloat(customOfferInput);

    if (!offeredAmount || offeredAmount <= 0) {
      alert('Tafadhali weka kiasi halali cha ofa yako!');
      return;
    }

    setIsSubmitting(true);

    // Badilisha kiasi kwenda USD kwa ajili ya kuhifadhi kwenye Data Base
    const amountInUSD = convertCurrency(offeredAmount, selectedCurrency, 'USD');

    setTimeout(() => {
      const newOffer: Offer = {
        id: `off-${Date.now()}`,
        offeredBy: 'user',
        amountUSD: amountInUSD,
        currency: selectedCurrency,
        note: offerNoteInput || 'Ofa mpya kutoka kwa mnunuzi.',
        status: 'PENDING',
        timestamp: 'Punde Hivi',
      };

      setOffersHistory([...offersHistory, newOffer]);
      setIsSubmitting(false);
      setCustomOfferInput('');
      setOfferNoteInput('');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-amber-500 font-bold text-xs tracking-wider uppercase">
              Bargain & Bidding Hub
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white flex items-center gap-3">
              🤝 Trading & Ofa ya Bei
            </h1>
          </div>

          {/* Currency Switcher */}
          <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-2xl flex items-center gap-1 self-start md:self-auto">
            {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
              <button
                key={code}
                onClick={() => setSelectedCurrency(code)}
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

        {/* Product Details Overview */}
        <div className="bg-slate-900 border border-slate-800/90 rounded-3xl p-6 flex flex-col sm:flex-row gap-6 items-center">
          <img
            src={product.image || getMarketplaceProductImage(product)}
            alt={product.name}
            className="w-full sm:w-40 h-40 object-cover rounded-2xl bg-slate-950 border border-slate-800"
          />

          <div className="space-y-2 flex-1 text-center sm:text-left">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">
              {product.category}
            </span>
            <h2 className="text-2xl font-black text-slate-100">{product.name}</h2>
            <p className="text-xs text-slate-400 line-clamp-2">{product.description}</p>

            <div className="pt-2 flex flex-wrap gap-4 items-center justify-center sm:justify-start">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Bei Rasmi Sokoni</span>
                <span className="text-lg font-extrabold text-slate-200">
                  {formatCurrency(convertCurrency(product.priceUSD, 'USD', selectedCurrency), selectedCurrency)}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-amber-500 block uppercase">Ofa ya Hivi Karibuni</span>
                <span className="text-lg font-extrabold text-amber-400">
                  {formatCurrency(convertCurrency(latestOffer.amountUSD, 'USD', selectedCurrency), selectedCurrency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Trading Main Grid (Offers Log + Action Form) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* History / Offers Log (7 Cols) */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-extrabold text-slate-100 flex items-center justify-between border-b border-slate-800 pb-3">
              <span>📜 Historia ya Mazungumzo</span>
              <span className="text-xs font-normal text-slate-400">{offersHistory.length} Ofa</span>
            </h3>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              <AnimatePresence>
                {offersHistory.map((offer) => {
                  const isUser = offer.offeredBy === 'user';
                  const amountInSelectedCurrency = convertCurrency(offer.amountUSD, 'USD', selectedCurrency);

                  return (
                    <motion.div
                      key={offer.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-2xl border ${
                        isUser
                          ? 'bg-slate-950/80 border-amber-500/30 text-slate-100'
                          : 'bg-slate-800/40 border-slate-700 text-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-amber-400">
                          {isUser ? '👤 Ofa Yako (Mnunuzi)' : '🏪 Ofa ya Muuzaji'}
                        </span>
                        <span className="text-[10px] text-slate-500">{offer.timestamp}</span>
                      </div>

                      <div className="flex justify-between items-center my-2">
                        <span className="text-xl font-black text-slate-100">
                          {formatCurrency(amountInSelectedCurrency, selectedCurrency)}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                            offer.status === 'PENDING'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : offer.status === 'ACCEPTED'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {offer.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 italic">"{offer.note}"</p>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Action Form / Make Offer (5 Cols) */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
            <h3 className="text-base font-extrabold text-slate-100 border-b border-slate-800 pb-3">
              ⚡ Tuma Ofa Yako
            </h3>

            <form onSubmit={handleSendOffer} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Kiasi cha Ofa Yako ({selectedCurrency}):
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder={`Weka kiasi kwa ${selectedCurrency}`}
                  value={customOfferInput}
                  onChange={(e) => setCustomOfferInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 font-mono text-sm focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Ujumbe / Maelezo Mafupi kwa Muuzaji:
                </label>
                <textarea
                  rows={3}
                  placeholder="Mfano: Naomba unishushie kiasi hiki, nitakamilisha malipo mara moja."
                  value={offerNoteInput}
                  onChange={(e) => setOfferNoteInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 text-xs focus:outline-none focus:border-amber-500 transition resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black py-4 rounded-2xl shadow-lg transition transform active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>🌀 Inatuma Ofa...</>
                ) : (
                  <>🤝 Tuma Ofa kwa Muuzaji</>
                )}
              </button>
            </form>

            {onNavigateToCheckout && (
              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={onNavigateToCheckout}
                  className="w-full bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold py-3 rounded-2xl text-xs transition"
                >
                  🚀 Lipa Bei Rasmi Moja kwa Moja
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}