'use client';

import React, { useState } from 'react';

// Hakikisha MobilePaymentDetails ina "export" ili iweze ku-importiwa kwingineko
export interface MobilePaymentDetails {
  network: 'mpesa' | 'tigopesa' | 'airtelmoney' | 'halopesa' | null;
  phone: string;
}

export interface CheckoutProps {
  darkMode?: boolean;
  total: number;
  currency: string;
  language?: 'sw' | 'en';
  onMobilePaymentDetailsChange?: (details: MobilePaymentDetails) => void;
  onCompletePurchase: (paymentMethod: 'usd' | 'tzs' | 'ntzs' | 'pi', details?: MobilePaymentDetails) => void;
  canCompletePurchase: boolean;
  isSubmitting: boolean; 
  onBlockedPurchase?: (reason: string) => void;
  allowPiPayments?: boolean;
}

export function Checkout({
  total,
  currency,
  language = 'sw',
  onMobilePaymentDetailsChange,
  onCompletePurchase,
  canCompletePurchase,
  isSubmitting, 
  onBlockedPurchase,
  allowPiPayments = true,
}: CheckoutProps) {
  const [selectedMethod, setSelectedMethod] = useState<'usd' | 'tzs' | 'ntzs' | 'pi'>('tzs');
  const [network, setNetwork] = useState<'mpesa' | 'tigopesa' | 'airtelmoney' | 'halopesa'>('mpesa');
  const [phone, setPhone] = useState('');

  const isSwahili = language === 'sw';

  const handleMobileChange = (net: 'mpesa' | 'tigopesa' | 'airtelmoney' | 'halopesa', ph: string) => {
    setNetwork(net);
    setPhone(ph);
    if (onMobilePaymentDetailsChange) {
      onMobilePaymentDetailsChange({ network: net, phone: ph });
    }
  };

  const handleCheckoutClick = () => {
    if (!canCompletePurchase) {
      if (onBlockedPurchase) {
        onBlockedPurchase('shipping_or_policy');
      }
      return;
    }
    onCompletePurchase(selectedMethod, { network, phone });
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-white max-w-xl mx-auto backdrop-blur-md">
      <h2 className="text-xl font-bold mb-4">{isSwahili ? 'Sehemu ya Malipo (Checkout)' : 'Checkout Payment'}</h2>
      
      <div className="mb-4">
        <label className="block text-xs text-slate-300 mb-1">{isSwahili ? 'Chagua Njia ya Malipo' : 'Select Payment Method'}</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            type="button"
            onClick={() => setSelectedMethod('tzs')}
            className={`rounded-lg p-2 text-xs font-semibold border transition ${selectedMethod === 'tzs' ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700'}`}
          >
            TZS (M-Pesa)
          </button>
          <button
            type="button"
            onClick={() => setSelectedMethod('ntzs')}
            className={`rounded-lg p-2 text-xs font-semibold border transition ${selectedMethod === 'ntzs' ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700'}`}
          >
            nTZS (Wallet)
          </button>
          <button
            type="button"
            onClick={() => setSelectedMethod('usd')}
            className={`rounded-lg p-2 text-xs font-semibold border transition ${selectedMethod === 'usd' ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700'}`}
          >
            USD ($)
          </button>
          {allowPiPayments && (
            <button
              type="button"
              onClick={() => setSelectedMethod('pi')}
              className={`rounded-lg p-2 text-xs font-semibold border transition ${selectedMethod === 'pi' ? 'bg-yellow-600 border-yellow-400 text-slate-900' : 'bg-slate-800 border-white/10 text-slate-300 hover:bg-slate-700'}`}
            >
              PI Network
            </button>
          )}
        </div>
      </div>

      {(selectedMethod === 'tzs' || selectedMethod === 'ntzs') && (
        <div className="mb-4 space-y-3 rounded-lg border border-white/10 bg-black/20 p-3">
          <div>
            <label className="block text-xs text-slate-300 mb-1">{isSwahili ? 'Mtandao wa Simu' : 'Mobile Network'}</label>
            <select
              value={network}
              onChange={(e) => handleMobileChange(e.target.value as any, phone)}
              className="w-full rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="mpesa">Vodacom M-Pesa</option>
              <option value="tigopesa">Tigo Pesa</option>
              <option value="airtelmoney">Airtel Money</option>
              <option value="halopesa">HaloPesa</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-300 mb-1">{isSwahili ? 'Namba ya Simu ya Malipo' : 'Payment Phone Number'}</label>
            <input
              type="tel"
              placeholder="+255 7XX XXX XXX"
              value={phone}
              onChange={(e) => handleMobileChange(network, e.target.value)}
              className="w-full rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      )}

      <div className="mb-6 flex justify-between items-center border-t border-white/10 pt-4">
        <span className="text-slate-300">{isSwahili ? 'Jumla ya Malipo:' : 'Total Amount:'}</span>
        <span className="font-bold text-emerald-400 text-lg">{currency.toUpperCase()} {total.toLocaleString()}</span>
      </div>

      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleCheckoutClick}
        className={`w-full rounded-lg py-3 text-sm font-bold text-white transition shadow-lg ${
          canCompletePurchase && !isSubmitting ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:opacity-90' : 'bg-slate-700 opacity-50 cursor-not-allowed'
        }`}
      >
        {isSubmitting ? (isSwahili ? 'Inachakata...' : 'Processing...') : (isSwahili ? 'Kamilisha Ununuzi' : 'Complete Purchase')}
      </button>
    </div>
  );
}

// Default export ili default import ya checkout-client ikubali!
export default Checkout;