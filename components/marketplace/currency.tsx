'use client';

import React from 'react';

// ==========================================
// 1. TYPES & INTERFACES
// ==========================================
export type CurrencyCode = 'USD' | 'TZS' | 'nTZS' | 'PI';

export interface CurrencyDetails {
  code: CurrencyCode;
  symbol: string;
  name: string;
  rateToUSD: number; // Mtaji wa msingi (Base USD)
  decimals: number;
}

// ==========================================
// 2. CONSTANTS & EXCHANGE RATES
// ==========================================
// Rate ya Pi Network $314,159 (GCV Rate)
export const PI_GCV_RATE_USD = 314159; 
export const USD_TO_TZS_RATE = 2625; // 1 USD = 2,625 TZS

export const CURRENCIES: Record<CurrencyCode, CurrencyDetails> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    rateToUSD: 1,
    decimals: 2,
  },
  TZS: {
    code: 'TZS',
    symbol: 'TSh',
    name: 'Tanzanian Shilling',
    rateToUSD: USD_TO_TZS_RATE,
    decimals: 0,
  },
  nTZS: {
    code: 'nTZS',
    symbol: 'nTSh',
    name: 'New Tanzanian Shilling',
    rateToUSD: USD_TO_TZS_RATE,
    decimals: 0,
  },
  PI: {
    code: 'PI',
    symbol: 'π',
    name: 'Pi Network (GCV)',
    rateToUSD: 1 / PI_GCV_RATE_USD, // 1 USD in Pi
    decimals: 7,
  },
};

// Aliases kwa ajili ya kurasa za zamani zinazotafuta EXCHANGE_RATES au RATES
export const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  TZS: USD_TO_TZS_RATE,
  nTZS: USD_TO_TZS_RATE,
  PI: 1 / PI_GCV_RATE_USD,
};

export const RATES = EXCHANGE_RATES;

// ==========================================
// 3. CONVERSION FUNCTIONS
// ==========================================

/**
 * Hubadilisha kiasi cha fedha kutoka sarafu moja kwenda nyingine
 */
export function convertCurrency(
  amount: number,
  fromCurrency: CurrencyCode = 'USD',
  toCurrency: CurrencyCode = 'TZS'
): number {
  if (amount === 0 || isNaN(amount)) return 0;
  if (fromCurrency === toCurrency) return amount;

  // Badilisha kwenda USD kwanza (Base)
  let amountInUSD = amount;
  if (fromCurrency === 'TZS' || fromCurrency === 'nTZS') {
    amountInUSD = amount / USD_TO_TZS_RATE;
  } else if (fromCurrency === 'PI') {
    amountInUSD = amount * PI_GCV_RATE_USD;
  }

  // Badilisha kutoka USD kwenda sarafu inayotakiwa (Target)
  if (toCurrency === 'TZS' || toCurrency === 'nTZS') {
    return amountInUSD * USD_TO_TZS_RATE;
  } else if (toCurrency === 'PI') {
    return amountInUSD / PI_GCV_RATE_USD;
  }

  return amountInUSD;
}

/**
 * Hubadilisha USD moja kwa moja kwenda TZS, PI, n.k.
 */
export function convertFromUSD(amountUSD: number, toCurrency: CurrencyCode): number {
  return convertCurrency(amountUSD, 'USD', toCurrency);
}

// ==========================================
// 4. FORMATTING FUNCTIONS
// ==========================================

/**
 * Hutoa muundo wa maandishi yenye alama za fedha (k.m "$100.00" au "262,500 TZS" au "0.0003183 π")
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode = 'TZS',
  customDecimals?: number
): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return `0 ${CURRENCIES[currency]?.symbol || ''}`;
  }

  const decimals = customDecimals !== undefined ? customDecimals : CURRENCIES[currency].decimals;

  if (currency === 'TZS' || currency === 'nTZS') {
    return `${new Intl.NumberFormat('sw-TZ', {
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    }).format(amount)} TZS`;
  }

  if (currency === 'PI') {
    // Pi inahitaji decimal ndogo kwa sababu ya thamani kubwa ya GCV
    const formattedPi = amount < 0.0001 ? amount.toFixed(7) : amount.toFixed(4);
    return `${formattedPi} π`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Inatumika pale unapotaka ku-format bei bila kuweka symbol ya alama
 */
export function formatNumberOnly(amount: number, currency: CurrencyCode = 'USD'): string {
  const decimals = CURRENCIES[currency].decimals;
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(amount);
}

// Helper ya zamani/Quick utility
export const formatPrice = (price: number, currency: CurrencyCode = 'USD') => formatCurrency(price, currency);
export const formatTZS = (amount: number) => formatCurrency(amount, 'TZS');
export const formatUSD = (amount: number) => formatCurrency(amount, 'USD');
export const formatPI = (amount: number) => formatCurrency(amount, 'PI');

// ==========================================
// 5. REACT COMPONENT (Currency Display)
// ==========================================
interface CurrencyProps {
  value: number;
  amount?: number; // Inakubali pia 'amount' kama prop
  currency?: CurrencyCode;
  className?: string;
  showSymbol?: boolean;
}

export const Currency: React.FC<CurrencyProps> = ({
  value,
  amount,
  currency = 'USD',
  className = '',
}) => {
  const finalValue = value !== undefined ? value : amount || 0;
  return (
    <span className={`inline-block font-semibold ${className}`}>
      {formatCurrency(finalValue, currency)}
    </span>
  );
};

export default Currency;