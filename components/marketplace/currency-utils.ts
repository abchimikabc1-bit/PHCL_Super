import { getAdminCurrencyConfig } from '@/lib/admin-currency-rates';

export const PI_GCV_USD = 314159;
export const USD_TO_TZS = 2621.5;
export const USD_TO_NTZS = 2621.5;

const getManagedRate = (code: string, fallback: number): number => {
  if (typeof window === 'undefined') return fallback;

  try {
    const config = getAdminCurrencyConfig();
    const managed = config.managed.find((entry) => entry.code === code);
    if (!managed || !managed.enabled) return fallback;
    if (!Number.isFinite(managed.rateToUsd) || managed.rateToUsd <= 0) return fallback;
    return managed.rateToUsd;
  } catch {
    return fallback;
  }
};

const getUsdBasePrice = (product: any): number => {
  if (typeof product?.usd === 'number') return product.usd;
  if (typeof product?.priceUSD === 'number') return product.priceUSD;
  return 0;
};

export const convertAmount = (amount: number, fromCurrency: string, toCurrency: string): number => {
  const usdToTzs = getManagedRate('TZS', USD_TO_TZS);
  // nTZS is pegged 1:1 with TZS for all platform math.
  const usdToNTzs = usdToTzs;
  const piGcvUsd = getManagedRate('PI', PI_GCV_USD);

  const from = (fromCurrency || '').toLowerCase();
  const to = (toCurrency || '').toLowerCase();

  if (from === to) return amount;

  let usdAmount = amount;
  if (from === 'tzs') usdAmount = amount / usdToTzs;
  if (from === 'ntzs') usdAmount = amount / usdToNTzs;
  if (from === 'pi') usdAmount = amount * piGcvUsd;

  if (to === 'usd') return usdAmount;
  if (to === 'tzs') return usdAmount * usdToTzs;
  if (to === 'ntzs') return usdAmount * usdToNTzs;
  if (to === 'pi') return usdAmount / piGcvUsd;
  return usdAmount;
};

export const getProductPrice = (product: any, currency: string) => {
  const usd = getUsdBasePrice(product);
  return convertAmount(usd, 'usd', currency);
};

export const getCurrencySymbol = (currency: string) => {
  if (currency === 'tzs') return 'TSh';
  if (currency === 'ntzs') return 'nTSh';
  if (currency === 'usd') return '$';
  if (currency === 'pi') return 'Π';
  return '$';
};

export const getCurrencyColor = (currency: string) => {
  if (currency === 'tzs') return 'text-sky-300 font-bold';
  if (currency === 'ntzs') return 'text-cyan-300 font-bold';
  if (currency === 'usd') return 'text-amber-300 font-bold';
  if (currency === 'pi') return 'text-violet-300 font-bold';
  return 'text-amber-300 font-bold';
};

export const formatCurrencyAmount = (currency: string, amount: number) => {
  const normalized = (currency || '').toLowerCase();
  if (normalized === 'tzs') {
    return `${getCurrencySymbol(normalized)} ${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  if (normalized === 'ntzs') {
    return `${getCurrencySymbol(normalized)} ${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  if (normalized === 'pi') {
    return `${getCurrencySymbol(normalized)} ${amount.toFixed(8)}`;
  }
  return `${getCurrencySymbol(normalized)} ${amount.toFixed(2)}`;
};
