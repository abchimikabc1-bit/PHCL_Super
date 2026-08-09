// src/lib/currencies.ts (and lib/currencies.ts)

export const CURRENCY_RATES = {
  USD_TO_TZS: 2625,
  PI_TO_USD: 314159,
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

// Msimbo huu mpya unatafutwa na Checkout Component yako ya kina!
export interface PaymentMethod {
  id: string;
  name: string;
  provider: string;
  supportedCurrencies: string[];
  accountDetailsHint: string;
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'tzs',
    name: 'Tanzanian Shilling (TZS)',
    provider: 'Vodacom/Tigo/Airtel',
    supportedCurrencies: ['TZS', 'NTZS'],
    accountDetailsHint: 'Andika Namba ya Simu ya Malipo (Mfano: 0754XXXXXX)',
  },
  {
    id: 'usd',
    name: 'US Dollar (USD)',
    provider: 'PHCL Swift Gateway',
    supportedCurrencies: ['USD'],
    accountDetailsHint: 'Andika Email au Namba ya Account ya Swift',
  },
  {
    id: 'pi',
    name: 'Pi Network (PI)',
    provider: 'Pi Network Secure Wallet',
    supportedCurrencies: ['PI'],
    accountDetailsHint: 'Andika Passphrase au Public Key ya Wallet yako',
  },
];
