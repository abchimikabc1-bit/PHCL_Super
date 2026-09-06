import 'server-only';

import {
  PI_GCV_USD,
  USD_TO_TZS,
} from '@/lib/currencies';

export const FINANCIAL_ASSET_CODES = [
  'USD',
  'TZS',
  'NTZS',
  'PI',
] as const;

export type FinancialAssetCode =
  (typeof FINANCIAL_ASSET_CODES)[number];

export type FinancialAssetType =
  | 'fiat'
  | 'crypto';

export type FinancialRateSource =
  | 'system_fallback'
  | 'admin_config'
  | 'market'
  | 'provider'
  | 'gcv_reference';

export interface FinancialAssetDefinition {
  code: FinancialAssetCode;
  type: FinancialAssetType;
  decimals: number;
}

export interface ServerCurrencyRates {
  baseCurrency: 'USD';

  usdToTzs: number;

  /**
   * PHCL business rule:
   * 1 TZS = 1 nTZS
   */
  tzsToNtzs: 1;

  /**
   * PHCL GCV/reference value.
   *
   * This is intentionally NOT labelled
   * as a live market price.
   */
  piGcvUsd: number;

  sources: {
    usdToTzs: FinancialRateSource;
    tzsToNtzs: FinancialRateSource;
    piGcvUsd: FinancialRateSource;
  };
}

export const FINANCIAL_ASSETS: Record<
  FinancialAssetCode,
  FinancialAssetDefinition
> = {
  USD: {
    code: 'USD',
    type: 'fiat',
    decimals: 2,
  },

  TZS: {
    code: 'TZS',
    type: 'fiat',
    decimals: 0,
  },

  NTZS: {
    code: 'NTZS',
    type: 'crypto',
    decimals: 0,
  },

  PI: {
    code: 'PI',
    type: 'crypto',
    decimals: 8,
  },
};

const DEFAULT_SERVER_RATES: ServerCurrencyRates = {
  baseCurrency: 'USD',

  usdToTzs: USD_TO_TZS,

  tzsToNtzs: 1,

  piGcvUsd: PI_GCV_USD,

  sources: {
    usdToTzs: 'system_fallback',
    tzsToNtzs: 'system_fallback',
    piGcvUsd: 'gcv_reference',
  },
};

export const isFinancialAssetCode = (
  value: unknown,
): value is FinancialAssetCode =>
  typeof value === 'string' &&
  FINANCIAL_ASSET_CODES.includes(
    value.trim().toUpperCase() as FinancialAssetCode,
  );

export const normalizeFinancialAssetCode = (
  value: unknown,
): FinancialAssetCode | null => {
  if (!isFinancialAssetCode(value)) {
    return null;
  }

  return value
    .trim()
    .toUpperCase() as FinancialAssetCode;
};

const isPositiveFiniteNumber = (
  value: unknown,
): value is number =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value > 0;

export const getServerCurrencyRates =
  (): ServerCurrencyRates => ({
    ...DEFAULT_SERVER_RATES,

    sources: {
      ...DEFAULT_SERVER_RATES.sources,
    },
  });

export const convertServerCurrencyAmount = (
  amount: number,
  fromCurrency: FinancialAssetCode,
  toCurrency: FinancialAssetCode,
  rates: ServerCurrencyRates = getServerCurrencyRates(),
): number => {
  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    throw new Error(
      'Invalid financial amount.',
    );
  }

  if (
    !isPositiveFiniteNumber(rates.usdToTzs) ||
    !isPositiveFiniteNumber(rates.piGcvUsd)
  ) {
    throw new Error(
      'Invalid server currency rates.',
    );
  }

  if (fromCurrency === toCurrency) {
    return amount;
  }

  let amountUsd: number;

  switch (fromCurrency) {
    case 'USD':
      amountUsd = amount;
      break;

    case 'TZS':
      amountUsd =
        amount / rates.usdToTzs;
      break;

    case 'NTZS':
      amountUsd =
        amount /
        rates.tzsToNtzs /
        rates.usdToTzs;
      break;

    case 'PI':
      amountUsd =
        amount * rates.piGcvUsd;
      break;

    default: {
      const exhaustiveCheck: never =
        fromCurrency;

      throw new Error(
        `Unsupported source asset: ${String(
          exhaustiveCheck,
        )}`,
      );
    }
  }

  let converted: number;

  switch (toCurrency) {
    case 'USD':
      converted = amountUsd;
      break;

    case 'TZS':
      converted =
        amountUsd * rates.usdToTzs;
      break;

    case 'NTZS':
      converted =
        amountUsd *
        rates.usdToTzs *
        rates.tzsToNtzs;
      break;

    case 'PI':
      converted =
        amountUsd / rates.piGcvUsd;
      break;

    default: {
      const exhaustiveCheck: never =
        toCurrency;

      throw new Error(
        `Unsupported destination asset: ${String(
          exhaustiveCheck,
        )}`,
      );
    }
  }

  if (
    !Number.isFinite(converted) ||
    converted < 0
  ) {
    throw new Error(
      'Currency conversion failed.',
    );
  }

  return converted;
};

export const roundFinancialAmount = (
  amount: number,
  currency: FinancialAssetCode,
): number => {
  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    throw new Error(
      'Invalid financial amount.',
    );
  }

  const decimals =
    FINANCIAL_ASSETS[currency].decimals;

  const factor =
    10 ** decimals;

  return (
    Math.round(
      (amount + Number.EPSILON) *
        factor,
    ) / factor
  );
};

export const convertAndRoundServerAmount = (
  amount: number,
  fromCurrency: FinancialAssetCode,
  toCurrency: FinancialAssetCode,
  rates: ServerCurrencyRates = getServerCurrencyRates(),
): number =>
  roundFinancialAmount(
    convertServerCurrencyAmount(
      amount,
      fromCurrency,
      toCurrency,
      rates,
    ),
    toCurrency,
  );