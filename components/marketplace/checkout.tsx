'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Truck, CreditCard } from 'lucide-react';
import { convertAmount, formatCurrencyAmount, PI_GCV_USD } from './currency-utils';

export type MobileNetworkCode = 'mpesa' | 'tigopesa' | 'airtelmoney' | 'halopesa';

export interface MobilePaymentDetails {
  network: MobileNetworkCode | null;
  phone: string;
}

interface CheckoutProps {
  darkMode: boolean;
  total: number;
  currency: string;
  language?: 'sw' | 'en';
  onCompletePurchase?: (
    paymentMethod: 'usd' | 'tzs' | 'ntzs' | 'pi',
    mobileDetails?: MobilePaymentDetails
  ) => void;
  canCompletePurchase?: boolean;
  isSubmitting?: boolean;
  onBlockedPurchase?: (reason: 'default' | 'mobile_details') => void;
  allowPiPayments?: boolean;
  onMobilePaymentDetailsChange?: (details: MobilePaymentDetails) => void;
}

export function Checkout({
  darkMode,
  total,
  currency,
  language = 'en',
  onCompletePurchase,
  canCompletePurchase = true,
  isSubmitting = false,
  onBlockedPurchase,
  allowPiPayments = true,
  onMobilePaymentDetailsChange,
}: CheckoutProps) {
  const [paymentMethod, setPaymentMethod] = useState<'usd' | 'tzs' | 'ntzs' | 'pi'>('usd');
  const [mobileNetwork, setMobileNetwork] = useState<MobileNetworkCode | ''>('');
  const [mobileNumber, setMobileNumber] = useState('');
  const usdTotal = convertAmount(total, currency, 'usd');
  const tzsTotal = convertAmount(usdTotal, 'usd', 'tzs');
  const ntzsTotal = convertAmount(usdTotal, 'usd', 'ntzs');
  const piTotal = convertAmount(usdTotal, 'usd', 'pi');

  const isMobileNetworkPayment = paymentMethod === 'tzs' || paymentMethod === 'ntzs';
  const normalizedMobilePhone = mobileNumber.trim().replace(/[\s()-]/g, '');
  const mobileNumberValid = /^\+?[0-9]{10,15}$/.test(normalizedMobilePhone);
  const mobileDetailsValid = !isMobileNetworkPayment || (!!mobileNetwork && mobileNumberValid);

  const mobileDetails = useMemo<MobilePaymentDetails>(
    () => ({
      network: mobileNetwork || null,
      phone: normalizedMobilePhone,
    }),
    [mobileNetwork, normalizedMobilePhone]
  );

  useEffect(() => {
    onMobilePaymentDetailsChange?.(mobileDetails);
  }, [mobileDetails, onMobilePaymentDetailsChange]);

  useEffect(() => {
    const normalizedCurrency = (currency || '').toLowerCase();
    if (
      (normalizedCurrency === 'usd' ||
        normalizedCurrency === 'tzs' ||
        normalizedCurrency === 'ntzs' ||
        normalizedCurrency === 'pi') &&
      paymentMethod !== normalizedCurrency
    ) {
      setPaymentMethod(normalizedCurrency as 'usd' | 'tzs' | 'ntzs' | 'pi');
    }
  }, [currency, paymentMethod]);

  const copy = language === 'sw'
    ? {
        title: 'Malipo',
        stepCart: 'Ukaguzi wa Cart',
        stepShipping: 'Usafirishaji',
        stepPayment: 'Malipo',
        orderSummary: 'Muhtasari wa Oda',
        subtotal: 'Jumla ndogo',
        shipping: 'Usafirishaji',
        free: 'Bure',
        total: 'Jumla',
        acceptedTotals: 'Jumla zinazokubalika kwa malipo',
        paymentMethod: 'Njia ya Malipo',
        usdPayment: 'Malipo ya USD',
        piPayment: 'Pi Network',
        disabledByAdmin: '(Imezimwa na Admin)',
        tzsPayment: 'Malipo ya TZS',
        ntzsPayment: 'Malipo ya nTZS',
        piValuation: 'Thamani ya Pi hutumia GCV: 1 PI =',
        piDisabledHint: 'Malipo ya PI yamezimwa kwa sasa na mipangilio ya administrator.',
        mobileMoneyTitle: 'Malipo ya Mtandao wa Simu',
        mobileMoneyHint: 'Kwa TZS/nTZS, chagua mtandao na andika namba ya simu ya malipo.',
        networkLabel: 'Mtandao',
        phoneLabel: 'Namba ya Simu ya Malipo',
        networkPlaceholder: 'Chagua mtandao',
        phonePlaceholder: 'Mfano: 2557XXXXXXXX',
        mobileNetworkRequired: 'Tafadhali chagua mtandao wa simu na andika namba sahihi kabla ya kukamilisha malipo.',
        mpesa: 'M-Pesa',
        tigopesa: 'Tigo Pesa',
        airtelmoney: 'Airtel Money',
        halopesa: 'HaloPesa',
        completePurchase: 'Kamilisha Ununuzi',
        processingPurchase: 'Inachakata ununuzi...',
      }
    : {
        title: 'Checkout',
        stepCart: 'Cart Review',
        stepShipping: 'Shipping',
        stepPayment: 'Payment',
        orderSummary: 'Order Summary',
        subtotal: 'Subtotal',
        shipping: 'Shipping',
        free: 'Free',
        total: 'Total',
        acceptedTotals: 'Accepted payment totals',
        paymentMethod: 'Payment Method',
        usdPayment: 'USD Payment',
        piPayment: 'Pi Network',
        disabledByAdmin: '(Disabled by Admin)',
        tzsPayment: 'TZS Payment',
        ntzsPayment: 'nTZS Payment',
        piValuation: 'Pi valuation uses GCV: 1 PI =',
        piDisabledHint: 'PI checkout is currently disabled by administrator settings.',
          mobileMoneyTitle: 'Mobile Network Payment',
          mobileMoneyHint: 'For TZS/nTZS payments, select a mobile network and enter the payment phone number.',
          networkLabel: 'Network',
          phoneLabel: 'Payment Phone Number',
          networkPlaceholder: 'Select network',
          phonePlaceholder: 'Example: 2557XXXXXXXX',
          mobileNetworkRequired: 'Please choose a mobile network and enter a valid phone number before completing checkout.',
          mpesa: 'M-Pesa',
          tigopesa: 'Tigo Pesa',
          airtelmoney: 'Airtel Money',
          halopesa: 'HaloPesa',
        completePurchase: 'Complete Purchase',
        processingPurchase: 'Processing purchase...',
      };

  const effectiveCanCompletePurchase = canCompletePurchase && mobileDetailsValid && !isSubmitting;

  const steps = [
    { id: 1, title: copy.stepCart, icon: CheckCircle },
    { id: 2, title: copy.stepShipping, icon: Truck },
    { id: 3, title: copy.stepPayment, icon: CreditCard },
  ];

  return (
    <div className={`${darkMode ? 'bg-slate-900 border border-violet-400/20' : 'bg-gradient-to-br from-indigo-50 via-white to-cyan-50 border border-violet-200'} rounded-xl p-6 shadow-lg global-glass`}>
      <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : ''} ink-glow`}>{copy.title}</h2>
      
      <div className="mb-8">
        <div className="flex justify-between items-center">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${idx < 2 ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 'bg-gradient-to-r from-blue-500 to-cyan-600'}`}>
                  <Icon className="text-white" size={24} />
                </div>
                <p className={`text-sm font-bold text-center ${darkMode ? 'text-white' : ''}`}>{step.title}</p>
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-1 mt-2 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className={`border-t-2 pt-6 mb-6 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
        <div className="mb-4">
          <p className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : ''} ink-soft`}>{copy.orderSummary}</p>
          <p className={`${darkMode ? 'text-gray-200' : 'text-gray-700'} ink-soft`}>{copy.subtotal}: {formatCurrencyAmount(currency, total)}</p>
          <p className={`${darkMode ? 'text-gray-200' : 'text-gray-700'} ink-soft`}>{copy.shipping}: {copy.free}</p>
          <p className={`text-xl font-bold mt-2 ${currency === 'usd' ? 'text-amber-300' : currency === 'tzs' ? 'text-sky-300' : currency === 'ntzs' ? 'text-cyan-300' : 'text-violet-300'} ink-glow`}>{copy.total}: {formatCurrencyAmount(currency, total)}</p>
          <div className={`mt-3 rounded-lg p-3 text-sm ${darkMode ? 'bg-slate-800 text-slate-200' : 'bg-indigo-50 text-indigo-900'} global-glass`}>
            <p className="font-semibold mb-1">{copy.acceptedTotals}</p>
            <p>USD: {formatCurrencyAmount('usd', usdTotal)}</p>
            <p>TZS: {formatCurrencyAmount('tzs', tzsTotal)}</p>
            <p>nTZS: {formatCurrencyAmount('ntzs', ntzsTotal)}</p>
            <p>PI: {formatCurrencyAmount('pi', piTotal)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className={`font-bold mb-3 ${darkMode ? 'text-white' : ''}`}>{copy.paymentMethod}</h3>
        <label style={{ minHeight: '44px' }} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900 dark:to-cyan-900">
          <input
            type="radio"
            name="payment"
            checked={paymentMethod === 'usd'}
            onChange={() => setPaymentMethod('usd')}
            className="w-5 h-5"
          />
          <span className={`font-bold ${darkMode ? 'text-white' : ''}`}>{copy.usdPayment}</span>
        </label>
        <label style={{ minHeight: '44px' }} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
          <input
            type="radio"
            name="payment"
            checked={paymentMethod === 'pi'}
            onChange={() => setPaymentMethod('pi')}
            disabled={!allowPiPayments}
            className="w-5 h-5"
          />
          <span className={`font-bold ${darkMode ? 'text-white' : ''} ${!allowPiPayments ? 'opacity-60' : ''}`}>
            {copy.piPayment} {!allowPiPayments ? copy.disabledByAdmin : ''}
          </span>
        </label>
        <label style={{ minHeight: '44px' }} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
          <input
            type="radio"
            name="payment"
            checked={paymentMethod === 'tzs'}
            onChange={() => setPaymentMethod('tzs')}
            className="w-5 h-5"
          />
          <span className={`font-bold ${darkMode ? 'text-white' : ''}`}>{copy.tzsPayment}</span>
        </label>
        <label style={{ minHeight: '44px' }} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
          <input
            type="radio"
            name="payment"
            checked={paymentMethod === 'ntzs'}
            onChange={() => setPaymentMethod('ntzs')}
            className="w-5 h-5"
          />
          <span className={`font-bold ${darkMode ? 'text-white' : ''}`}>{copy.ntzsPayment}</span>
        </label>
        <p className={`text-xs ${darkMode ? 'text-violet-200' : 'text-violet-700'}`}>
          {copy.piValuation} ${PI_GCV_USD.toLocaleString('en-US')}
        </p>
        {!allowPiPayments && (
          <p className={`text-xs ${darkMode ? 'text-amber-200' : 'text-amber-700'}`}>
            {copy.piDisabledHint}
          </p>
        )}

        {isMobileNetworkPayment && (
          <div className={`mt-3 rounded-lg border p-3 ${darkMode ? 'border-cyan-300/30 bg-cyan-500/10' : 'border-cyan-200 bg-cyan-50'}`}>
            <p className={`text-sm font-semibold ${darkMode ? 'text-cyan-100' : 'text-cyan-900'}`}>{copy.mobileMoneyTitle}</p>
            <p className={`mt-1 text-xs ${darkMode ? 'text-cyan-100/85' : 'text-cyan-800/85'}`}>{copy.mobileMoneyHint}</p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className={`mb-1 block text-xs font-semibold ${darkMode ? 'text-cyan-100' : 'text-cyan-900'}`}>
                  {copy.networkLabel}
                </label>
                <select
                  value={mobileNetwork}
                  onChange={(event) => setMobileNetwork(event.target.value as MobileNetworkCode | '')}
                  style={{ minHeight: '44px' }}
                  className="w-full rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300"
                >
                  <option value="">{copy.networkPlaceholder}</option>
                  <option value="mpesa">{copy.mpesa}</option>
                  <option value="tigopesa">{copy.tigopesa}</option>
                  <option value="airtelmoney">{copy.airtelmoney}</option>
                  <option value="halopesa">{copy.halopesa}</option>
                </select>
              </div>

              <div>
                <label className={`mb-1 block text-xs font-semibold ${darkMode ? 'text-cyan-100' : 'text-cyan-900'}`}>
                  {copy.phoneLabel}
                </label>
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={(event) => setMobileNumber(event.target.value)}
                  placeholder={copy.phonePlaceholder}
                  style={{ minHeight: '44px' }}
                  className="w-full rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300"
                />
              </div>
            </div>

            {!mobileDetailsValid && (
              <p className="mt-2 text-xs text-amber-200">{copy.mobileNetworkRequired}</p>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          if (isSubmitting) {
            return;
          }

          if (effectiveCanCompletePurchase) {
            onCompletePurchase?.(paymentMethod, isMobileNetworkPayment ? mobileDetails : undefined);
            return;
          }
          onBlockedPurchase?.(mobileDetailsValid ? 'default' : 'mobile_details');
        }}
        style={{ minHeight: '44px', paddingTop: '12px', paddingBottom: '12px' }}
        className={`w-full mt-6 px-6 py-3 text-white font-bold rounded-lg shadow-lg transition-all ${
          effectiveCanCompletePurchase
            ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700'
            : 'bg-slate-600 cursor-not-allowed opacity-80'
        }`}
        disabled={isSubmitting}
      >
        {isSubmitting ? copy.processingPurchase : copy.completePurchase}
      </button>
    </div>
  );
}
