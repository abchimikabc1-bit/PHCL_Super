// currency.ts

export const currencyRates = {
  USD_TO_TZS: 2625,
  PI_TO_USD: 314159,
};

// Huu ndio mtaji wa GCV ya PI unaotumiwa kwenye home-client.tsx
export const PI_GCV_USD = currencyRates.PI_TO_USD; 
export const USD_TO_TZS = currencyRates.USD_TO_TZS;

export function formatCurrency(amount: number, currency: 'TZS' | 'USD' | 'PI' | 'NTZS' | string): string {
  const currencyUpper = currency.toUpperCase();
  switch (currencyUpper) {
    case 'TZS':
      return `TSh ${amount.toLocaleString()}`;
    case 'USD':
      return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'PI':
      return `Π ${amount.toFixed(4)}`;
    case 'NTZS':
      return `nTZS ${amount.toLocaleString()}`;
    default:
      return amount.toString();
  }
}

// Hii inatumika kwenye home-client na checkout-client kama formatCurrencyAmount
export function formatCurrencyAmount(currency: string, amount: number): string {
  return formatCurrency(amount, currency);
}

// Hii inabadilisha viwango vya fedha (Inatumika kwenye AdminDashboardPage na CheckoutClient)
export function convertCurrency(amount: number, from: string, to: string): number {
  const fromUpper = from.toUpperCase();
  const toUpper = to.toUpperCase();

  if (fromUpper === toUpper) return amount;

  // 1. Badilisha kwenda kwenye USD kwanza (Base)
  let usdAmount = amount;
  if (fromUpper === 'TZS' || fromUpper === 'NTZS') {
    usdAmount = amount / currencyRates.USD_TO_TZS;
  } else if (fromUpper === 'PI') {
    usdAmount = amount * currencyRates.PI_TO_USD;
  }

  // 2. Badilisha kutoka USD kwenda sarafu inayolengwa
  if (toUpper === 'USD') {
    return usdAmount;
  } else if (toUpper === 'TZS' || toUpper === 'NTZS') {
    return usdAmount * currencyRates.USD_TO_TZS;
  } else if (toUpper === 'PI') {
    return usdAmount / currencyRates.PI_TO_USD;
  }

  return amount;
}

// Hii inatumika kama convertAmount kwenye mafaili yako ya Checkout na Home
export function convertAmount(amount: number, from: string, to: string): number {
  return convertCurrency(amount, from, to);
}
