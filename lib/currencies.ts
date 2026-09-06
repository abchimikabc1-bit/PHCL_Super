/**
 * PHCL Super — Canonical Currency Definitions
 *
 * Marketplace base/reference currency:
 *   USD
 *
 * Fiat:
 *   USD
 *   TZS
 *
 * Crypto / Digital Assets:
 *   nTZS
 *   PI
 *
 * Current PHCL reference relationships:
 *   1 USD = 2,640 TZS
 *   1 TZS = 1 nTZS
 *   1 PI  = 314,159 USD (PHCL GCV reference)
 *
 * IMPORTANT:
 * These values are platform fallback/reference values.
 * Final financial settlement must be validated server-side.
 */

export const USD_TO_TZS = 2640;
export const PI_GCV_USD = 314159;

/**
 * nTZS currently follows TZS at a strict PHCL 1:1 peg.
 */
export const USD_TO_NTZS = USD_TO_TZS;

export const CURRENCY_RATES = {
  /**
   * Explicit conversion/reference constants.
   */
  USD_TO_TZS,
  USD_TO_NTZS,
  PI_TO_USD: PI_GCV_USD,

  /**
   * Units represented by one USD.
   *
   * USD:
   *   1 USD = 1 USD
   *
   * TZS:
   *   1 USD = 2,640 TZS
   *
   * nTZS:
   *   1 USD = 2,640 nTZS
   *
   * PI:
   *   1 USD = 1 / 314,159 PI
   */
  USD: 1,
  TZS: USD_TO_TZS,
  NTZS: USD_TO_NTZS,
  PI: 1 / PI_GCV_USD,
} as const;

export const currencyRates =
  CURRENCY_RATES;

export const SUPPORTED_CURRENCIES = [
  'USD',
  'TZS',
  'NTZS',
  'PI',
] as const;

export type CurrencyCode =
  (typeof SUPPORTED_CURRENCIES)[number];

export type CurrencyType =
  | 'fiat'
  | 'crypto';

export const CURRENCIES = {
  USD: {
    name: 'US Dollar',
    symbol: '$',
    type: 'fiat',
  },

  TZS: {
    name: 'Tanzanian Shilling',
    symbol: 'TSh',
    type: 'fiat',
  },

  NTZS: {
    name: 'Digital Shilling',
    symbol: 'nTSh',
    type: 'crypto',
  },

  PI: {
    name: 'Pi Network',
    symbol: 'Π',
    type: 'crypto',
  },

  BTC: {
    name: 'Bitcoin',
    symbol: '₿',
    type: 'crypto',
  },

  ETH: {
    name: 'Ethereum',
    symbol: 'Ξ',
    type: 'crypto',
  },

  USDT: {
    name: 'Tether',
    symbol: '₮',
    type: 'crypto',
  },

  SOL: {
    name: 'Solana',
    symbol: 'SOL',
    type: 'crypto',
  },

  XRP: {
    name: 'XRP',
    symbol: 'XRP',
    type: 'crypto',
  },

  ADA: {
    name: 'Cardano',
    symbol: 'ADA',
    type: 'crypto',
  },

  DOGE: {
    name: 'Dogecoin',
    symbol: 'Ð',
    type: 'crypto',
  },
} as const;

export interface PaymentMethod {
  id: string;
  name: string;
  provider: string;
  supportedCurrencies: CurrencyCode[];
  accountDetailsHint: string;
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'tzs',
    name: 'Tanzanian Shilling (TZS)',
    provider: 'Mobile Money',
    supportedCurrencies: [
      'TZS',
      'NTZS',
    ],
    accountDetailsHint:
      'Andika namba ya simu ya malipo.',
  },

  {
    id: 'usd',
    name: 'US Dollar (USD)',
    provider: 'PHCL Payment Gateway',
    supportedCurrencies: [
      'USD',
    ],
    accountDetailsHint:
      'Chagua au ingiza taarifa salama za njia ya malipo inayotumika.',
  },

  {
    id: 'pi',
    name: 'Pi Network (PI)',
    provider: 'Pi Network Secure Wallet',
    supportedCurrencies: [
      'PI',
    ],
    accountDetailsHint:
      'Unganisha wallet yako kwa njia salama. Usitoe passphrase, seed phrase, au private key.',
  },
];

export const LANGUAGE_OPTIONS = [
  {
    code: 'sw',
    name: 'Swahili',
    flag: '🇹🇿',
  },

  {
    code: 'en',
    name: 'English',
    flag: '🇬🇧',
  },
] as const;