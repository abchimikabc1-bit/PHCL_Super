// src/components/currency.ts

export const currencyRates = {
  USD_TO_TZS: 2640,
  PI_TO_USD: 314159,
} as const;

/**
 * PHCL reference rates.
 *
 * USD is the canonical/base fiat currency for marketplace pricing.
 *
 * 1 USD = 2,640 TZS
 * 1 TZS = 1 nTZS
 * 1 PI = USD 314,159
 *
 * NOTE:
 * PI_TO_USD is the PHCL GCV/reference value.
 * It is not represented here as a live external market price.
 *
 * This client-side module is for display/conversion UI.
 * Final settlement, checkout, ledger, exchanger and payment quotes
 * must use server-authoritative financial rates.
 */
export const PI_GCV_USD = currencyRates.PI_TO_USD;
export const USD_TO_TZS = currencyRates.USD_TO_TZS;
export const USD_TO_NTZS = USD_TO_TZS;

export type CurrencyCode =
  | 'USD'
  | 'TZS'
  | 'NTZS'
  | 'PI';

const normalizeCurrencyCode = (
  currency: string,
): CurrencyCode | null => {
  const normalized =
    currency.trim().toUpperCase();

  if (
    normalized === 'USD' ||
    normalized === 'TZS' ||
    normalized === 'NTZS' ||
    normalized === 'PI'
  ) {
    return normalized;
  }

  return null;
};

const normalizeAmount = (
  amount: number,
): number => {
  return Number.isFinite(amount)
    ? amount
    : 0;
};

export function formatCurrency(
  amount: number,
  currency:
    | CurrencyCode
    | string,
): string {
  const safeAmount =
    normalizeAmount(amount);

  const currencyCode =
    normalizeCurrencyCode(currency);

  switch (currencyCode) {
    case 'TZS':
      return `TSh ${safeAmount.toLocaleString(
        'en-US',
        {
          maximumFractionDigits: 0,
        },
      )}`;

    case 'USD':
      return `$${safeAmount.toLocaleString(
        'en-US',
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        },
      )}`;

    case 'PI':
      return `Π ${safeAmount.toLocaleString(
        'en-US',
        {
          minimumFractionDigits: 4,
          maximumFractionDigits: 8,
        },
      )}`;

    case 'NTZS':
      return `nTZS ${safeAmount.toLocaleString(
        'en-US',
        {
          maximumFractionDigits: 0,
        },
      )}`;

    default:
      return safeAmount.toString();
  }
}

/**
 * Compatibility helper used by existing UI components.
 */
export function formatCurrencyAmount(
  currency: string,
  amount: number,
): string {
  return formatCurrency(
    amount,
    currency,
  );
}

/**
 * Converts currencies using USD as the canonical intermediate base.
 *
 * TZS and nTZS have configured 1:1 value parity:
 *
 * 1 USD = 2,640 TZS
 * 1 USD = 2,640 nTZS
 *
 * This remains a client-side display converter only.
 */
export function convertCurrency(
  amount: number,
  from: string,
  to: string,
): number {
  const safeAmount =
    normalizeAmount(amount);

  const fromCurrency =
    normalizeCurrencyCode(from);

  const toCurrency =
    normalizeCurrencyCode(to);

  if (
    !fromCurrency ||
    !toCurrency
  ) {
    return safeAmount;
  }

  if (
    fromCurrency ===
    toCurrency
  ) {
    return safeAmount;
  }

  let usdAmount: number;

  switch (fromCurrency) {
    case 'USD':
      usdAmount = safeAmount;
      break;

    case 'TZS':
    case 'NTZS':
      usdAmount =
        safeAmount /
        USD_TO_TZS;
      break;

    case 'PI':
      usdAmount =
        safeAmount *
        PI_GCV_USD;
      break;

    default:
      return safeAmount;
  }

  switch (toCurrency) {
    case 'USD':
      return usdAmount;

    case 'TZS':
      return (
        usdAmount *
        USD_TO_TZS
      );

    case 'NTZS':
      return (
        usdAmount *
        USD_TO_NTZS
      );

    case 'PI':
      return (
        usdAmount /
        PI_GCV_USD
      );

    default:
      return safeAmount;
  }
}

/**
 * Backward-compatible alias used by existing PHCL components.
 */
export function convertAmount(
  amount: number,
  from: string,
  to: string,
): number {
  return convertCurrency(
    amount,
    from,
    to,
  );
}