// Currency conversion utilities with real-time rate support
// Updated rates for May 2026

export const USD_TO_TSH_RATE = 2575; // 1 USD ≈ 2,575 TZS (current rate)
export const USD_TO_PI_RATE = 3.14; // 1 USD ≈ 3.14 Pi (market rate)

export interface PriceDisplay {
  tsh: string; // Tanzanian Shilling
  pi: string; // Pi currency
  usd: string; // US Dollar
}

// Format large numbers with commas
const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

// Format Pi with proper decimals
const formatPi = (pi: number): string => {
  if (pi < 0.01) {
    return pi.toFixed(6);
  }
  return pi.toFixed(2);
};

// Convert USD to all currencies
export const convertCurrency = (usdAmount: number): PriceDisplay => {
  const tsh = Math.round(usdAmount * USD_TO_TSH_RATE);
  const pi = usdAmount * USD_TO_PI_RATE;

  return {
    tsh: `${formatNumber(tsh)} TSh`,
    pi: `Π ${formatPi(pi)}`,
    usd: `$${formatNumber(usdAmount)}`,
  };
};

// Get price for display in specific currency
export const getPriceInCurrency = (usdAmount: number, currency: 'tsh' | 'pi' | 'usd'): string => {
  const prices = convertCurrency(usdAmount);
  
  switch (currency) {
    case 'tsh':
      return prices.tsh;
    case 'pi':
      return prices.pi;
    case 'usd':
      return prices.usd;
    default:
      return prices.usd;
  }
};

// Get numeric value in specific currency
export const getPriceNumeric = (usdAmount: number, currency: 'tsh' | 'pi' | 'usd'): number => {
  switch (currency) {
    case 'tsh':
      return Math.round(usdAmount * USD_TO_TSH_RATE);
    case 'pi':
      return usdAmount * USD_TO_PI_RATE;
    case 'usd':
      return usdAmount;
    default:
      return usdAmount;
  }
};

// Get all price variants for display
export const getPriceVariants = (usdAmount: number) => {
  return convertCurrency(usdAmount);
};

// Get currency symbol
export const getCurrencySymbol = (currency: 'tsh' | 'pi' | 'usd'): string => {
  switch (currency) {
    case 'tsh':
      return 'TSh';
    case 'pi':
      return 'Π';
    case 'usd':
      return '$';
    default:
      return '$';
  }
};

// Simulate real-time rate updates (in production, this would call an API)
export async function fetchLiveRates() {
  // Simulate API call
  return {
    USD_TO_TSH_RATE,
    USD_TO_PI_RATE,
    timestamp: Date.now(),
  };
}
