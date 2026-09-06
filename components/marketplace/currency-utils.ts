import { getAdminCurrencyConfig } from '@/lib/admin-currency-rates';

/**
 * PHCL Super currency architecture
 *
 * Canonical marketplace pricing currency:
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
 * Current PHCL configured reference relationships:
 *   1 USD = 2,640 TZS
 *   1 TZS = 1 nTZS
 *   1 PI  = 314,159 USD (PHCL GCV reference)
 *
 * IMPORTANT:
 * These constants are fallbacks.
 * Admin-managed rates may override supported rates at runtime.
 */
export const PI_GCV_USD = 314159;
export const USD_TO_TZS = 2640;

/**
 * nTZS is currently pegged 1:1 with TZS.
 *
 * Therefore:
 *   USD_TO_NTZS === USD_TO_TZS
 *
 * Keep this exported constant for compatibility with existing imports,
 * but conversion logic derives nTZS from the effective TZS rate so the
 * platform cannot accidentally create two different TZS/nTZS rates.
 */
export const USD_TO_NTZS = USD_TO_TZS;

export type SupportedCurrency =
  | 'usd'
  | 'tzs'
  | 'ntzs'
  | 'pi';

const SUPPORTED_CURRENCIES = new Set<SupportedCurrency>([
  'usd',
  'tzs',
  'ntzs',
  'pi',
]);

const normalizeCurrency = (
  currency: string,
): SupportedCurrency | null => {
  const normalized = (currency || '')
    .trim()
    .toLowerCase();

  return SUPPORTED_CURRENCIES.has(
    normalized as SupportedCurrency,
  )
    ? (normalized as SupportedCurrency)
    : null;
};

const isValidPositiveRate = (
  value: unknown,
): value is number =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value > 0;

const getManagedRate = (
  code: string,
  fallback: number,
): number => {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const config = getAdminCurrencyConfig();

    const managed = config.managed.find(
      (entry) =>
        entry.code
          .trim()
          .toUpperCase() ===
        code.trim().toUpperCase(),
    );

    if (
      !managed ||
      !managed.enabled ||
      !isValidPositiveRate(
        managed.rateToUsd,
      )
    ) {
      return fallback;
    }

    return managed.rateToUsd;
  } catch {
    return fallback;
  }
};

const getEffectiveUsdToTzs = (): number =>
  getManagedRate(
    'TZS',
    USD_TO_TZS,
  );

const getEffectivePiGcvUsd = (): number =>
  getManagedRate(
    'PI',
    PI_GCV_USD,
  );

/**
 * nTZS follows TZS exactly at the current PHCL 1:1 peg.
 *
 * We intentionally do NOT load an independent nTZS exchange rate here.
 * This prevents accidental divergence such as:
 *
 *   TZS 1 !== nTZS 1
 *
 * while the PHCL business rule defines them as equal.
 */
const getEffectiveUsdToNTzs = (): number =>
  getEffectiveUsdToTzs();

const getUsdBasePrice = (
  product: unknown,
): number => {
  if (
    !product ||
    typeof product !== 'object'
  ) {
    return 0;
  }

  const candidate = product as {
    usd?: unknown;
    priceUSD?: unknown;
  };

  if (
    typeof candidate.usd === 'number' &&
    Number.isFinite(candidate.usd) &&
    candidate.usd >= 0
  ) {
    return candidate.usd;
  }

  if (
    typeof candidate.priceUSD ===
      'number' &&
    Number.isFinite(
      candidate.priceUSD,
    ) &&
    candidate.priceUSD >= 0
  ) {
    return candidate.priceUSD;
  }

  return 0;
};

/**
 * Converts an amount between supported PHCL currencies/assets.
 *
 * NOTE:
 * This helper is suitable for UI/display conversion.
 *
 * It MUST NOT be treated as the final authority for:
 * - wallet debits
 * - wallet credits
 * - checkout settlement
 * - refunds
 * - transfers
 * - crypto settlement
 * - exchanger execution
 *
 * Those operations must be calculated and validated server-side.
 */
export const convertAmount = (
  amount: number,
  fromCurrency: string,
  toCurrency: string,
): number => {
  if (
    typeof amount !== 'number' ||
    !Number.isFinite(amount)
  ) {
    return 0;
  }

  const from =
    normalizeCurrency(fromCurrency);

  const to =
    normalizeCurrency(toCurrency);

  if (!from || !to) {
    return 0;
  }

  if (from === to) {
    return amount;
  }

  const usdToTzs =
    getEffectiveUsdToTzs();

  const usdToNTzs =
    getEffectiveUsdToNTzs();

  const piGcvUsd =
    getEffectivePiGcvUsd();

  let usdAmount: number;

  switch (from) {
    case 'usd':
      usdAmount = amount;
      break;

    case 'tzs':
      usdAmount =
        amount / usdToTzs;
      break;

    case 'ntzs':
      usdAmount =
        amount / usdToNTzs;
      break;

    case 'pi':
      usdAmount =
        amount * piGcvUsd;
      break;

    default:
      return 0;
  }

  if (!Number.isFinite(usdAmount)) {
    return 0;
  }

  switch (to) {
    case 'usd':
      return usdAmount;

    case 'tzs':
      return (
        usdAmount *
        usdToTzs
      );

    case 'ntzs':
      return (
        usdAmount *
        usdToNTzs
      );

    case 'pi':
      return (
        usdAmount /
        piGcvUsd
      );

    default:
      return 0;
  }
};

/**
 * Marketplace products are canonically priced in USD.
 */
export const getProductPrice = (
  product: unknown,
  currency: string,
): number => {
  const usd =
    getUsdBasePrice(product);

  return convertAmount(
    usd,
    'usd',
    currency,
  );
};

export const getCurrencySymbol = (
  currency: string,
): string => {
  switch (
    (currency || '')
      .trim()
      .toLowerCase()
  ) {
    case 'tzs':
      return 'TSh';

    case 'ntzs':
      return 'nTSh';

    case 'usd':
      return '$';

    case 'pi':
      return 'Π';

    default:
      return '$';
  }
};

export const getCurrencyColor = (
  currency: string,
): string => {
  switch (
    (currency || '')
      .trim()
      .toLowerCase()
  ) {
    case 'tzs':
      return 'text-sky-300 font-bold';

    case 'ntzs':
      return 'text-cyan-300 font-bold';

    case 'usd':
      return 'text-amber-300 font-bold';

    case 'pi':
      return 'text-violet-300 font-bold';

    default:
      return 'text-amber-300 font-bold';
  }
};

export const formatCurrencyAmount = (
  currency: string,
  amount: number,
): string => {
  const normalized =
    normalizeCurrency(currency);

  const safeAmount =
    typeof amount === 'number' &&
    Number.isFinite(amount)
      ? amount
      : 0;

  if (normalized === 'tzs') {
    return `${getCurrencySymbol(
      normalized,
    )} ${safeAmount.toLocaleString(
      'en-US',
      {
        maximumFractionDigits: 0,
      },
    )}`;
  }

  if (normalized === 'ntzs') {
    return `${getCurrencySymbol(
      normalized,
    )} ${safeAmount.toLocaleString(
      'en-US',
      {
        maximumFractionDigits: 0,
      },
    )}`;
  }

  if (normalized === 'pi') {
    return `${getCurrencySymbol(
      normalized,
    )} ${safeAmount.toFixed(8)}`;
  }

  return `${getCurrencySymbol(
    normalized || 'usd',
  )} ${safeAmount.toFixed(2)}`;
};