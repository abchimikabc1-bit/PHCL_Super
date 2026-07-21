// Comprehensive currency conversion utilities supporting 15+ cryptos and 16+ fiat currencies
// Updated for June 2026 with international standards

import { CURRENCY_RATES, CURRENCIES } from './currencies';
import { getAdminCurrencyConfig } from './admin-currency-rates';

export interface CurrencyConversion {
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  convertedAmount: number;
  rate: number;
  timestamp: number;
}

export interface MultiCurrencyPrice {
  originalAmount: number;
  originalCurrency: string;
  conversions: Record<string, { amount: string; formatted: string }>;
}

// Legacy constants for backward compatibility
export const USD_TO_TSH_RATE = 2621.50;
export const USD_TO_PI_RATE = 314159;

// Format numbers based on currency type
const formatCurrency = (amount: number, currency: string): string => {
  const currencyInfo = CURRENCIES[currency as keyof typeof CURRENCIES];
  
  if (amount < 0.01 && (currency.includes('BTC') || currency.includes('ETH'))) {
    return amount.toFixed(8);
  }
  
  if (amount < 1) {
    return amount.toFixed(6);
  }
  
  if (amount < 1000) {
    return amount.toFixed(2);
  }
  
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const getEffectiveRates = (): Record<string, number> => {
  const rates = { ...CURRENCY_RATES };

  if (typeof window === 'undefined') {
    return rates;
  }

  try {
    const config = getAdminCurrencyConfig();
    for (const entry of config.managed) {
      if (!entry.enabled) continue;
      if (!Number.isFinite(entry.rateToUsd) || entry.rateToUsd <= 0) continue;
      rates[entry.code] = entry.rateToUsd;
    }
  } catch {
    // Ignore admin config failures and keep static fallback rates.
  }

  return rates;
};

const getUsdValuePerUnit = (currency: string, rates: Record<string, number>): number => {
  const code = (currency || 'USD').toUpperCase();
  if (code === 'USD') return 1;

  const raw = rates[code];
  if (!Number.isFinite(raw) || raw <= 0) return 1;

  const info = CURRENCIES[code as keyof typeof CURRENCIES];
  const fiatLike = info?.type === 'fiat' || code === 'TZS' || code === 'NTZS';

  // Fiat-like rates are stored as "units per 1 USD" (e.g. USD->TZS = 2621.5),
  // so value of 1 unit in USD is inverse.
  if (fiatLike) {
    return 1 / raw;
  }

  // Crypto-like rates are stored as "USD per 1 coin" (e.g. BTC = 65420.50).
  return raw;
};

// Get exchange rate between any two currencies
export const getExchangeRate = (fromCurrency: string, toCurrency: string): number => {
  const from = (fromCurrency || 'USD').toUpperCase();
  const to = (toCurrency || 'USD').toUpperCase();
  if (from === to) return 1;

  const effectiveRates = getEffectiveRates();
  const fromUsdValue = getUsdValuePerUnit(from, effectiveRates);
  const toUsdValue = getUsdValuePerUnit(to, effectiveRates);
  if (!Number.isFinite(fromUsdValue) || !Number.isFinite(toUsdValue) || toUsdValue <= 0) return 1;
  
  return fromUsdValue / toUsdValue;
};

// Convert between any two currencies
export const convertCurrency = (
  amount: number,
  fromCurrency: string,
  toCurrency: string
): CurrencyConversion => {
  const rate = getExchangeRate(fromCurrency, toCurrency);
  const convertedAmount = amount * rate;
  
  return {
    fromCurrency,
    toCurrency,
    amount,
    convertedAmount,
    rate,
    timestamp: Date.now(),
  };
};

// Get price in specific currency with formatted string
export const getPriceInCurrency = (
  usdAmount: number,
  targetCurrency: string
): string => {
  const rate = getExchangeRate('USD', targetCurrency);
  const convertedAmount = usdAmount * rate;
  const currencyInfo = CURRENCIES[targetCurrency as keyof typeof CURRENCIES];
  
  return `${currencyInfo?.symbol || targetCurrency} ${formatCurrency(convertedAmount, targetCurrency)}`;
};

// Get numeric value in specific currency
export const getPriceNumeric = (
  usdAmount: number,
  targetCurrency: string
): number => {
  const rate = getExchangeRate('USD', targetCurrency);
  return usdAmount * rate;
};

// Get price in multiple currencies at once
export const getPriceInMultipleCurrencies = (
  usdAmount: number,
  currencies: string[] = ['USD', 'EUR', 'GBP', 'BTC', 'ETH', 'USDT', 'TZS', 'PI']
): MultiCurrencyPrice => {
  const conversions: Record<string, { amount: string; formatted: string }> = {};
  
  currencies.forEach((currency) => {
    const rate = getExchangeRate('USD', currency);
    const converted = usdAmount * rate;
    const currencyInfo = CURRENCIES[currency as keyof typeof CURRENCIES];
    
    conversions[currency] = {
      amount: converted.toString(),
      formatted: `${currencyInfo?.symbol || currency} ${formatCurrency(converted, currency)}`,
    };
  });
  
  return {
    originalAmount: usdAmount,
    originalCurrency: 'USD',
    conversions,
  };
};

// Get all available currencies for conversion
export const getAllAvailableCurrencies = () => {
  const effectiveRates = getEffectiveRates();

  return Object.entries(CURRENCIES).map(([code, info]) => ({
    code,
    name: info.name,
    symbol: info.symbol,
    type: info.type,
    rate: effectiveRates[code] || 0,
  }));
};

// Get only crypto currencies
export const getCryptoCurrencies = () => {
  const effectiveRates = getEffectiveRates();

  return Object.entries(CURRENCIES)
    .filter(([_, info]) => info.type === 'crypto')
    .map(([code, info]) => ({
      code,
      name: info.name,
      symbol: info.symbol,
      rate: effectiveRates[code] || 0,
    }));
};

// Get only fiat currencies
export const getFiatCurrencies = () => {
  const effectiveRates = getEffectiveRates();

  return Object.entries(CURRENCIES)
    .filter(([_, info]) => info.type === 'fiat')
    .map(([code, info]) => ({
      code,
      name: info.name,
      symbol: info.symbol,
      rate: effectiveRates[code] || 0,
    }));
};

// Legacy function for backward compatibility
export const convertCurrencyLegacy = (usdAmount: number) => {
  const tsh = Math.round(usdAmount * USD_TO_TSH_RATE);
  const pi = usdAmount * USD_TO_PI_RATE;
  
  return {
    tsh: `${tsh.toLocaleString('en-US')} TSh`,
    pi: `Π ${pi.toFixed(2)}`,
    usd: `$${Math.round(usdAmount).toLocaleString('en-US')}`,
  };
};

// Get currency symbol with full info
export const getCurrencyInfo = (currency: string) => {
  return CURRENCIES[currency as keyof typeof CURRENCIES] || {
    symbol: currency,
    name: currency,
    color: 'from-gray-400 to-gray-600',
    icon: currency,
    type: 'unknown',
  };
};

// Format currency display with symbol and amount
export const formatCurrencyDisplay = (amount: number, currency: string): string => {
  const info = getCurrencyInfo(currency);
  return `${info.symbol} ${formatCurrency(amount, currency)}`;
};

// Simulate real-time rate updates (in production, this would call an API)
export async function fetchLiveRates() {
  const effectiveRates = getEffectiveRates();

  return {
    rates: effectiveRates,
    timestamp: Date.now(),
    currencies: Object.keys(CURRENCIES).length,
  };
}
