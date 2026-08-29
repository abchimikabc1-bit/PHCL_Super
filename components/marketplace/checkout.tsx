'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PAYMENT_METHODS, 
  type PaymentMethod 
} from '@/lib/currencies';
import { getMarketplaceProductImage, MARKETPLACE_PRODUCTS, type MarketplaceProduct } from '@/lib/marketplace-products';

const formatMoney = (amount: number, currency: string = 'TZS') => {
  return `${currency} ${amount.toLocaleString()}`;
};

interface CheckoutProps {
  product?: MarketplaceProduct;
  total?: number;
  currency?: string;
  language?: 'sw' | 'en';
  onMobilePaymentDetailsChange?: (details: { network: string | null; phone: string }) => void;
  onCompletePurchase?: (
  paymentMethod: 'usd' | 'tzs' | 'ntzs' | 'pi',
  mobileDetails?: {
    network: string | null;
    phone: string;
  },
) => boolean | void | Promise<boolean | void>;
  canCompletePurchase?: boolean;
  isSubmitting?: boolean;
  allowPiPayments?: boolean;
  onBlockedPurchase?: (reason: string) => void;
  onClose?: () => void;
  onSuccess?: () => void;
}

const MOBILE_NETWORK_OPTIONS = [
  { id: 'mpesa', label: 'M-Pesa' },
  { id: 'tigopesa', label: 'Tigo Pesa' },
  { id: 'airtelmoney', label: 'Airtel Money' },
  { id: 'halopesa', label: 'HaloPesa' },
] as const;

export default function Checkout({ 
  product, 
  total, 
  currency = 'TZS', 
  language = 'sw',
  onMobilePaymentDetailsChange,
  onCompletePurchase,
  canCompletePurchase = true,
  isSubmitting = false,
  allowPiPayments = false,
  onBlockedPurchase,
  onClose, 
  onSuccess 
}: CheckoutProps) {
  const selectedProduct = product || null;
  const fallbackProduct = MARKETPLACE_PRODUCTS[0];
  const displayTotal = total || ((selectedProduct || fallbackProduct).priceUSD * 2600);
  const normalizedCurrency = String(currency).toLowerCase();
  const availableMethods = useMemo(() => {
    const baseMethods = PAYMENT_METHODS.map((method) => ({
      id: method.id as 'usd' | 'tzs' | 'pi',
      name: method.name,
      provider: method.provider,
      supportedCurrencies: method.supportedCurrencies,
      accountDetailsHint: method.accountDetailsHint,
      icon: (method as PaymentMethod & { icon?: string }).icon,
    }));

    const methodsWithDigital = [
      baseMethods[0],
      {
        id: 'ntzs' as const,
        name: 'Digital Shilling (nTZS)',
        provider: 'Vodacom/Tigo/Airtel',
        supportedCurrencies: ['NTZS'],
        accountDetailsHint: 'Select mobile money network and enter the receiving payment number.',
        icon: '📲',
      },
      ...baseMethods.slice(1),
    ];

    return methodsWithDigital.filter((method) => allowPiPayments || method.id !== 'pi');
  }, [allowPiPayments]);

  const preferredMethod = availableMethods.some((method) => method.id === normalizedCurrency)
    ? normalizedCurrency
    : availableMethods[0]?.id || 'usd';

  const [selectedMethod, setSelectedMethod] = useState<string>(preferredMethod);
  const [success, setSuccess] = useState(false);
  const [mobileDetails, setMobileDetails] = useState<{ network: string | null; phone: string }>({
    network: 'mpesa',
    phone: '',
  });

  // Form states
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    notes: '',
  });

  useEffect(() => {
    setSelectedMethod(preferredMethod);
  }, [preferredMethod]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMobileDetailsChange = (field: 'network' | 'phone', value: string) => {
    const nextDetails = {
      ...mobileDetails,
      [field]: field === 'network' ? value || null : value,
    };
    setMobileDetails(nextDetails);
    onMobilePaymentDetailsChange?.(nextDetails);
  };

    const handleCheckoutSubmit = async (
  e: React.FormEvent<HTMLFormElement>,
) => {
  e.preventDefault();

  const requiresMobileMoney =
    selectedMethod === 'tzs' ||
    selectedMethod === 'ntzs';

  const normalizedPhone = mobileDetails.phone
    .trim()
    .replace(/[\s()-]/g, '');

  if (
    requiresMobileMoney &&
    (
      !mobileDetails.network ||
      !/^\+?[0-9]{10,15}$/.test(normalizedPhone)
    )
  ) {
    onBlockedPurchase?.('mobile_details');
    return;
  }

  if (!canCompletePurchase) {
    onBlockedPurchase?.(
      requiresMobileMoney
        ? 'mobile_details'
        : 'blocked',
    );

    return;
  }

  const purchaseResult = onCompletePurchase
    ? await onCompletePurchase(
        selectedMethod as
          | 'usd'
          | 'tzs'
          | 'ntzs'
          | 'pi',
        requiresMobileMoney
          ? {
              network: mobileDetails.network,
              phone: normalizedPhone,
            }
          : undefined,
      )
    : true;

  if (purchaseResult === false) {
    return;
  }

  setSuccess(true);

  if (onSuccess) {
    window.setTimeout(onSuccess, 2000);
  }
};
   
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-6 px-4 sm:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="border-b border-slate-800 pb-4 flex justify-between items-center">
          <div>
            <span className="text-amber-500 font-bold text-xs tracking-wider uppercase">
              {language === 'sw' ? 'Malipo Salama' : 'Secure Checkout'}
            </span>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              💳 {language === 'sw' ? 'Kamilisha Malipo Yako' : 'Complete Your Payment'}
            </h1>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-sm font-bold transition"
            >
              Funga ✕
            </button>
          )}
        </div>

        {success ? (
          <div className="bg-emerald-500/10 border border-emerald-500/50 p-8 rounded-3xl text-center space-y-4">
            <div className="text-6xl">🎉</div>
            <h2 className="text-2xl font-bold text-emerald-400">
              {language === 'sw' ? 'Malipo Yamefanikiwa!' : 'Payment Successful!'}
            </h2>
            <p className="text-slate-300 text-sm max-w-md mx-auto">
              {language === 'sw' 
                ? 'Asante kwa kununua kupitia PHCL Super. Muuzaji atawasiliana nawe hivi karibuni.' 
                : 'Thank you for your purchase via PHCL Super. The seller will contact you shortly.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left: Form */}
            <form onSubmit={handleCheckoutSubmit} className="md:col-span-7 space-y-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
              <h2 className="text-lg font-bold text-white mb-2">
                {language === 'sw' ? 'Taarifa za Mpokeaji' : 'Recipient Information'}
              </h2>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">
                  {language === 'sw' ? 'Jina Kamili' : 'Full Name'}
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  placeholder="Mf. Juma Juma"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">
                  {language === 'sw' ? 'Namba ya Simu' : 'Phone Number'}
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="Mf. 0712 345 678"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">
                  {language === 'sw' ? 'Anwani / Eneo la Kukabidhiwa' : 'Delivery Address'}
                </label>
                <input
                  type="text"
                  name="address"
                  required
                  placeholder="Mf. Dar es Salaam, Kinondoni"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">
                  {language === 'sw' ? 'Maelezo ya Ziada (Hiari)' : 'Additional Notes (Optional)'}
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Mf. Nifikishie asubuhi..."
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition resize-none"
                />
              </div>

              <h2 className="text-lg font-bold text-white pt-4 mb-2">
                {language === 'sw' ? 'Njia ya Malipo' : 'Payment Method'}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {availableMethods.map((method) => {
                  const isSelected = selectedMethod === method.id;
                  return (
                    <div
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      className={`p-4 rounded-2xl cursor-pointer border transition flex flex-col items-center text-center gap-2 ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 text-amber-400'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {method.icon && <span className="text-2xl">{method.icon}</span>}
                      <span className="text-xs font-bold">{method.name}</span>
                    </div>
                  );
                })}
              </div>

              {allowPiPayments && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-xs text-amber-300">
                  ⚡ Pi Network Payments Enabled for this transaction.
                </div>
              )}

              {(selectedMethod === 'tzs' || selectedMethod === 'ntzs') && (
                <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">
                      {language === 'sw' ? 'Mtandao wa Simu' : 'Mobile Network'}
                    </label>
                    <select
                      value={mobileDetails.network || 'mpesa'}
                      onChange={(e) => handleMobileDetailsChange('network', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition"
                    >
                      {MOBILE_NETWORK_OPTIONS.map((network) => (
                        <option key={network.id} value={network.id}>
                          {network.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">
                      {language === 'sw' ? 'Namba ya Malipo' : 'Payment Phone'}
                    </label>
                    <input
                      type="tel"
                      value={mobileDetails.phone}
                      onChange={(e) => handleMobileDetailsChange('phone', e.target.value)}
                      placeholder={language === 'sw' ? 'Mf. 0712 345 678' : 'e.g. 0712 345 678'}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-6 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-4 rounded-2xl transition text-base shadow-lg shadow-amber-500/10 disabled:opacity-50"
              >
                {isSubmitting ? 'Inachakata...' : (language === 'sw' ? 'Thibitisha na Lipa 🚀' : 'Confirm and Pay 🚀')}
              </button>
            </form>

            {/* Right: Order Summary */}
            <div className="md:col-span-5 bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 h-fit">
              <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
                {language === 'sw' ? 'Muhtasari wa Agizo' : 'Order Summary'}
              </h2>

              {selectedProduct ? (
                <div className="flex items-center gap-4">
                  <img
                    src={selectedProduct.image || getMarketplaceProductImage(selectedProduct)}
                    alt={selectedProduct.name}
                    className="w-16 h-16 rounded-2xl object-cover bg-slate-950 border border-slate-800"
                  />
                  <div>
                    <h3 className="font-bold text-slate-100 text-sm">{selectedProduct.name}</h3>
                    <p className="text-xs text-slate-400 capitalize">{selectedProduct.category}</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <h3 className="font-bold text-slate-100 text-sm">
                    {language === 'sw' ? 'Unakamilisha oda ya cart nzima' : 'You are completing a full cart order'}
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    {language === 'sw'
                      ? 'Jumla itaendana na bidhaa zilizopo kwenye checkout hii.'
                      : 'Totals reflect every item currently included in this checkout.'}
                  </p>
                </div>
              )}

              <div className="border-t border-slate-800 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>{language === 'sw' ? 'Bei ya Bidhaa' : 'Product Price'}</span>
                  <span className="text-slate-100 font-bold">
                    {formatMoney(displayTotal, currency)}
                  </span>
                </div>
               <div className="flex justify-between text-slate-400">
                  <span>{language === 'sw' ? 'Usafirishaji' : 'Delivery'}</span>
                  
                   <span className="text-emerald-400 font-bold">
                 {language === 'sw' ? 'Bure' : 'Free'}
                </span>
              </div>
                <div className="border-t border-slate-800 pt-2 flex justify-between text-base font-extrabold text-white">
                  <span>{language === 'sw' ? 'Jumla Kuu' : 'Total'}</span>
                  <span className="text-amber-400">
                    {formatMoney(displayTotal, currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}