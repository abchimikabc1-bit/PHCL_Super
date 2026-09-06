import 'server-only';

import { randomUUID } from 'node:crypto';

import {
  getServerCurrencyRateState,
} from '@/lib/server-currency-rate-store';

import type {
  ServerCurrencyRates,
} from '@/lib/server-currency-rates';

import {
  priceMarketplaceItemsServerSide,
  type ServerPricedItem,
  type ServerPricingItemInput,
} from '@/lib/server-marketplace-pricing';

export const PAYMENT_QUOTE_ASSETS = [
  'USD',
  'TZS',
  'NTZS',
  'PI',
] as const;

export type PaymentQuoteAsset =
  (typeof PAYMENT_QUOTE_ASSETS)[number];

export type PaymentQuoteStatus =
  | 'ACTIVE'
  | 'EXPIRED';

export interface PaymentQuoteRateSnapshot {
  baseCurrency: 'USD';

  usdToTzs: number;

  tzsToNtzs: 1;

  piGcvUsd: number;

  sources:
    ServerCurrencyRates['sources'];
}

export interface PaymentQuotePricingSnapshot {
  currency: 'USD';

  items: ServerPricedItem[];

  totalQuantity: number;

  subtotalUsd: number;
}

/**
 * Server-authoritative checkout charges captured
 * inside the quote.
 *
 * SECURITY:
 * These values are never accepted from the browser.
 *
 * Current PHCL policy defaults to zero tax/fees until
 * an approved tax/fee policy is configured server-side.
 * Keeping the structure in the quote now prevents the
 * checkout client from becoming the financial authority.
 */
export interface PaymentQuoteChargesSnapshot {
  currency: 'USD';

  policyVersion: number;

  source: 'system_default';

  taxRate: number;

  taxUsd: number;

  platformFeeRate: number;

  platformFeeUsd: number;

  fixedFeeUsd: number;

  otherFeesUsd: number;

  totalChargesUsd: number;

  grandTotalUsd: number;
}

export interface ServerPaymentQuote {
  quoteId: string;

  /**
   * Canonical marketplace pricing
   * captured when this quote was
   * created.
   */
  pricing:
    PaymentQuotePricingSnapshot;

  /**
   * Server-authoritative tax/fee snapshot.
   *
   * pricing.subtotalUsd remains the canonical
   * merchandise subtotal.
   *
   * charges.grandTotalUsd is the authoritative
   * checkout total.
   */
  charges:
    PaymentQuoteChargesSnapshot;

  baseCurrency: 'USD';

  /**
   * The authoritative grand total in USD.
   *
   * baseAmount intentionally means the final
   * amount used for payment conversion:
   *
   * pricing.subtotalUsd
   * + charges.totalChargesUsd
   * = baseAmount
   *
   * This value is never accepted from the browser.
   */
  baseAmount: number;

  paymentAsset:
    PaymentQuoteAsset;

  paymentAmount: number;

  /**
   * Payment-asset units per 1 USD.
   *
   * USD  -> 1
   * TZS  -> usdToTzs
   * NTZS -> usdToTzs because
   *         1 TZS = 1 nTZS
   * PI   -> 1 / piGcvUsd
   */
  rateUsed: number;

  rateVersion: number;

  rateSnapshot:
    PaymentQuoteRateSnapshot;

  createdAt: string;

  expiresAt: string;

  status: PaymentQuoteStatus;
}

export interface CreatePaymentQuoteInput {
  /**
   * Browser/server caller supplies
   * product IDs and quantities only.
   *
   * The canonical price is resolved
   * server-side from
   * MARKETPLACE_PRODUCTS.
   */
  items:
    ServerPricingItemInput[];

  paymentAsset:
    PaymentQuoteAsset;

  /**
   * Optional quote lifetime.
   *
   * Default: 5 minutes.
   *
   * This will normally be controlled
   * by the server/API layer rather
   * than exposed as arbitrary client
   * configuration.
   */
  ttlSeconds?: number;
}

const DEFAULT_QUOTE_TTL_SECONDS =
  5 * 60;

const MIN_QUOTE_TTL_SECONDS =
  30;

const MAX_QUOTE_TTL_SECONDS =
  15 * 60;

/**
 * PHCL server-side checkout charge policy.
 *
 * IMPORTANT:
 * The former browser-side "estimated tax" must not
 * participate in authoritative settlement.
 *
 * Until an approved/configured tax policy exists,
 * authoritative tax and fees remain zero.
 *
 * These constants can later be replaced by a
 * versioned Firestore-backed policy store without
 * changing the quote/checkout contract.
 */
const CHECKOUT_CHARGE_POLICY_VERSION =
  1;

const CHECKOUT_TAX_RATE =
  0;

const CHECKOUT_PLATFORM_FEE_RATE =
  0;

const CHECKOUT_FIXED_FEE_USD =
  0;

const CHECKOUT_OTHER_FEES_USD =
  0;

function isPlainObject(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isPositiveFiniteNumber(
  value: unknown,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0
  );
}

function isPaymentQuoteAsset(
  value: unknown,
): value is PaymentQuoteAsset {
  return (
    typeof value === 'string' &&
    PAYMENT_QUOTE_ASSETS.includes(
      value as PaymentQuoteAsset,
    )
  );
}

function normalizeTtlSeconds(
  value: unknown,
): number {
  if (
    value === undefined
  ) {
    return DEFAULT_QUOTE_TTL_SECONDS;
  }

  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(
      value,
    ) ||
    value <
      MIN_QUOTE_TTL_SECONDS ||
    value >
      MAX_QUOTE_TTL_SECONDS
  ) {
    throw new Error(
      `Quote TTL must be an integer between ${MIN_QUOTE_TTL_SECONDS} and ${MAX_QUOTE_TTL_SECONDS} seconds.`,
    );
  }

  return value;
}

function roundUsd(
  amount: number,
): number {
  return (
    Math.round(
      (amount +
        Number.EPSILON) *
        100,
    ) / 100
  );
}

function isNonNegativeFiniteNumber(
  value: unknown,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0
  );
}

function calculateAuthoritativeCharges(
  subtotalUsd: number,
): PaymentQuoteChargesSnapshot {
  if (
    !isPositiveFiniteNumber(
      subtotalUsd,
    )
  ) {
    throw new Error(
      'Invalid authoritative marketplace subtotal.',
    );
  }

  if (
    !Number.isSafeInteger(
      CHECKOUT_CHARGE_POLICY_VERSION,
    ) ||
    CHECKOUT_CHARGE_POLICY_VERSION < 1
  ) {
    throw new Error(
      'Invalid checkout charge policy version.',
    );
  }

  if (
    !isNonNegativeFiniteNumber(
      CHECKOUT_TAX_RATE,
    ) ||
    !isNonNegativeFiniteNumber(
      CHECKOUT_PLATFORM_FEE_RATE,
    ) ||
    !isNonNegativeFiniteNumber(
      CHECKOUT_FIXED_FEE_USD,
    ) ||
    !isNonNegativeFiniteNumber(
      CHECKOUT_OTHER_FEES_USD,
    )
  ) {
    throw new Error(
      'Invalid server checkout charge policy.',
    );
  }

  const taxUsd =
    roundUsd(
      subtotalUsd *
        CHECKOUT_TAX_RATE,
    );

  const platformFeeUsd =
    roundUsd(
      subtotalUsd *
        CHECKOUT_PLATFORM_FEE_RATE,
    );

  const fixedFeeUsd =
    roundUsd(
      CHECKOUT_FIXED_FEE_USD,
    );

  const otherFeesUsd =
    roundUsd(
      CHECKOUT_OTHER_FEES_USD,
    );

  const totalChargesUsd =
    roundUsd(
      taxUsd +
        platformFeeUsd +
        fixedFeeUsd +
        otherFeesUsd,
    );

  const grandTotalUsd =
    roundUsd(
      subtotalUsd +
        totalChargesUsd,
    );

  if (
    !isPositiveFiniteNumber(
      grandTotalUsd,
    )
  ) {
    throw new Error(
      'Invalid authoritative checkout grand total.',
    );
  }

  return {
    currency:
      'USD',

    policyVersion:
      CHECKOUT_CHARGE_POLICY_VERSION,

    source:
      'system_default',

    taxRate:
      CHECKOUT_TAX_RATE,

    taxUsd,

    platformFeeRate:
      CHECKOUT_PLATFORM_FEE_RATE,

    platformFeeUsd,

    fixedFeeUsd,

    otherFeesUsd,

    totalChargesUsd,

    grandTotalUsd,
  };
}

function roundTzs(
  amount: number,
): number {
  return Math.round(
    amount,
  );
}

function roundNtzs(
  amount: number,
): number {
  return Math.round(
    amount,
  );
}

function roundPi(
  amount: number,
): number {
  return (
    Math.round(
      (amount +
        Number.EPSILON) *
        100_000_000,
    ) /
    100_000_000
  );
}

function calculatePaymentAmount(
  baseAmountUsd: number,
  paymentAsset:
    PaymentQuoteAsset,
  rates:
    ServerCurrencyRates,
): {
  paymentAmount: number;

  rateUsed: number;
} {
  if (
    !isPositiveFiniteNumber(
      baseAmountUsd,
    )
  ) {
    throw new Error(
      'Invalid authoritative marketplace USD subtotal.',
    );
  }

  switch (paymentAsset) {
    case 'USD': {
      return {
        paymentAmount:
          roundUsd(
            baseAmountUsd,
          ),

        rateUsed: 1,
      };
    }

    case 'TZS': {
      const rate =
        rates.usdToTzs;

      if (
        !isPositiveFiniteNumber(
          rate,
        )
      ) {
        throw new Error(
          'Invalid authoritative USD/TZS rate.',
        );
      }

      return {
        paymentAmount:
          roundTzs(
            baseAmountUsd *
              rate,
          ),

        rateUsed:
          rate,
      };
    }

    case 'NTZS': {
      const usdToTzs =
        rates.usdToTzs;

      const tzsToNtzs =
        rates.tzsToNtzs;

      if (
        !isPositiveFiniteNumber(
          usdToTzs,
        ) ||
        tzsToNtzs !== 1
      ) {
        throw new Error(
          'Invalid authoritative USD/nTZS rate configuration.',
        );
      }

      const effectiveRate =
        usdToTzs *
        tzsToNtzs;

      return {
        paymentAmount:
          roundNtzs(
            baseAmountUsd *
              effectiveRate,
          ),

        rateUsed:
          effectiveRate,
      };
    }

    case 'PI': {
      const piGcvUsd =
        rates.piGcvUsd;

      if (
        !isPositiveFiniteNumber(
          piGcvUsd,
        )
      ) {
        throw new Error(
          'Invalid authoritative PI/USD reference.',
        );
      }

      const piPerUsd =
        1 /
        piGcvUsd;

      return {
        paymentAmount:
          roundPi(
            baseAmountUsd /
              piGcvUsd,
          ),

        rateUsed:
          piPerUsd,
      };
    }
  }
}

function createRateSnapshot(
  rates:
    ServerCurrencyRates,
): PaymentQuoteRateSnapshot {
  return {
    baseCurrency:
      'USD',

    usdToTzs:
      rates.usdToTzs,

    tzsToNtzs: 1,

    piGcvUsd:
      rates.piGcvUsd,

    sources: {
      ...rates.sources,
    },
  };
}

function createPricingSnapshot(
  pricing:
    ReturnType<
      typeof priceMarketplaceItemsServerSide
    >,
): PaymentQuotePricingSnapshot {
  return {
    currency:
      'USD',

    items:
      pricing.items.map(
        (item) => ({
          ...item,
        }),
      ),

    totalQuantity:
      pricing.totalQuantity,

    subtotalUsd:
      pricing.subtotalUsd,
  };
}

export async function createServerPaymentQuote(
  input:
    CreatePaymentQuoteInput,
): Promise<ServerPaymentQuote> {
  if (
    !isPlainObject(
      input,
    )
  ) {
    throw new Error(
      'Invalid payment quote input.',
    );
  }

  /**
   * SECURITY BOUNDARY:
   *
   * Never accept baseAmountUsd,
   * unitPrice or lineTotal from
   * browser/client input.
   *
   * The caller gives us product IDs
   * and quantities only.
   */
  const pricing =
    priceMarketplaceItemsServerSide(
      input.items,
    );

  if (
    !isPositiveFiniteNumber(
      pricing.subtotalUsd,
    )
  ) {
    throw new Error(
      'Invalid authoritative marketplace subtotal.',
    );
  }

  if (
    !isPaymentQuoteAsset(
      input.paymentAsset,
    )
  ) {
    throw new Error(
      'Unsupported payment asset.',
    );
  }

  const ttlSeconds =
    normalizeTtlSeconds(
      input.ttlSeconds,
    );

  /**
   * Rates and rateVersion are read
   * together from Firestore so that
   * the quote records exactly which
   * financial configuration produced
   * its payment amount.
   */
  const rateState =
    await getServerCurrencyRateState();

  if (
    !Number.isSafeInteger(
      rateState.rateVersion,
    ) ||
    rateState.rateVersion < 1
  ) {
    throw new Error(
      'Invalid authoritative currency rate version.',
    );
  }

  /**
   * SECURITY BOUNDARY:
   *
   * The browser cannot provide tax, fees,
   * grandTotalUsd or baseAmount.
   *
   * All authoritative checkout charges are
   * calculated by the server and captured in
   * the quote snapshot.
   */
  const charges =
    calculateAuthoritativeCharges(
      pricing.subtotalUsd,
    );

  const baseAmountUsd =
    charges.grandTotalUsd;

  const {
    paymentAmount,
    rateUsed,
  } =
    calculatePaymentAmount(
      baseAmountUsd,
      input.paymentAsset,
      rateState.rates,
    );

  if (
    !isPositiveFiniteNumber(
      paymentAmount,
    )
  ) {
    throw new Error(
      'Calculated payment amount is invalid.',
    );
  }

  if (
    !isPositiveFiniteNumber(
      rateUsed,
    )
  ) {
    throw new Error(
      'Calculated payment rate is invalid.',
    );
  }

  const createdAtDate =
    new Date();

  const expiresAtDate =
    new Date(
      createdAtDate.getTime() +
        ttlSeconds *
          1000,
    );

  return {
    quoteId:
      randomUUID(),

    pricing:
      createPricingSnapshot(
        pricing,
      ),

    charges,

    baseCurrency:
      'USD',

    baseAmount:
      baseAmountUsd,

    paymentAsset:
      input.paymentAsset,

    paymentAmount,

    rateUsed,

    rateVersion:
      rateState.rateVersion,

    rateSnapshot:
      createRateSnapshot(
        rateState.rates,
      ),

    createdAt:
      createdAtDate.toISOString(),

    expiresAt:
      expiresAtDate.toISOString(),

    status:
      'ACTIVE',
  };
}

export function isServerPaymentQuoteExpired(
  quote:
    Pick<
      ServerPaymentQuote,
      'expiresAt'
    >,
  now = new Date(),
): boolean {
  const expiresAtMs =
    Date.parse(
      quote.expiresAt,
    );

  if (
    !Number.isFinite(
      expiresAtMs,
    )
  ) {
    return true;
  }

  return (
    now.getTime() >=
    expiresAtMs
  );
}

export function getServerPaymentQuoteStatus(
  quote:
    Pick<
      ServerPaymentQuote,
      'expiresAt'
    >,
  now = new Date(),
): PaymentQuoteStatus {
  return isServerPaymentQuoteExpired(
    quote,
    now,
  )
    ? 'EXPIRED'
    : 'ACTIVE';
}