// lib/currencies.ts (La nje!)

export const CURRENCY_RATES = {
  USD_TO_TZS: 2625,
  PI_TO_USD: 314159,
  
  // Viwango vya msingi kulingana na USD kama sarafu mama (Base)
  USD: 1,
  TZS: 2625,
  NTZS: 2625,
  PI: 1 / 314159,
};

export const currencyRates = CURRENCY_RATES;
export const SUPPORTED_CURRENCIES = ['USD', 'TZS', 'NTZS', 'PI'] as const;
export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number];

export const CURRENCIES = {
  USD: { name: 'US Dollar', symbol: '$' },
  TZS: { name: 'Tanzanian Shilling', symbol: 'TSh' },
  NTZS: { name: 'Digital Shilling', symbol: 'nTSh' },
  PI: { name: 'Pi Network', symbol: 'Π' },
  BTC: { name: 'Bitcoin', symbol: '₿' },
  ETH: { name: 'Ethereum', symbol: 'Ξ' },
  USDT: { name: 'Tether', symbol: '₮' },
  SOL: { name: 'Solana', symbol: 'SOL' },
  XRP: { name: 'Ripple', symbol: 'XRP' },
  ADA: { name: 'Cardano', symbol: 'ADA' },
  DOGE: { name: 'Dogecoin', symbol: 'Ð' },
};
