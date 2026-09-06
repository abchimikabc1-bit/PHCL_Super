import {
  test,
} from 'node:test';

import assert from 'node:assert/strict';

import {
  createServerPaymentQuote,
} from '@/lib/server-payment-quote';

test(
  'server payment quote derives authoritative grand total from server charges',
  async () => {
    const quote =
      await createServerPaymentQuote({
        items: [
          {
            productId: 17,
            quantity: 2,
          },
        ],

        paymentAsset:
          'USD',
      });

    assert.equal(
      quote.pricing.currency,
      'USD',
    );

    assert.ok(
      quote.pricing.subtotalUsd >
        0,
    );

    assert.equal(
      quote.charges.currency,
      'USD',
    );

    assert.ok(
      Number.isSafeInteger(
        quote.charges.policyVersion,
      ),
    );

    assert.ok(
      quote.charges.policyVersion >=
        1,
    );

    assert.equal(
      quote.charges.taxRate,
      0,
    );

    assert.equal(
      quote.charges.taxUsd,
      0,
    );

    assert.equal(
      quote.charges.platformFeeRate,
      0,
    );

    assert.equal(
      quote.charges.platformFeeUsd,
      0,
    );

    assert.equal(
      quote.charges.fixedFeeUsd,
      0,
    );

    assert.equal(
      quote.charges.otherFeesUsd,
      0,
    );

    assert.equal(
      quote.charges.totalChargesUsd,
      0,
    );

    assert.equal(
      quote.charges.grandTotalUsd,
      quote.pricing.subtotalUsd,
    );

    assert.equal(
      quote.baseAmount,
      quote.charges.grandTotalUsd,
    );

    assert.equal(
      quote.paymentAmount,
      quote.baseAmount,
    );

    assert.equal(
      quote.rateUsed,
      1,
    );
  },
);

test(
  'TZS payment amount is calculated from authoritative grand total',
  async () => {
    const quote =
      await createServerPaymentQuote({
        items: [
          {
            productId: 17,
            quantity: 1,
          },
        ],

        paymentAsset:
          'TZS',
      });

    const expected =
      Math.round(
        quote.charges
          .grandTotalUsd *
          quote.rateUsed,
      );

    assert.equal(
      quote.baseAmount,
      quote.charges
        .grandTotalUsd,
    );

    assert.equal(
      quote.paymentAmount,
      expected,
    );

    assert.equal(
      quote.rateUsed,
      quote.rateSnapshot
        .usdToTzs,
    );
  },
);

test(
  'nTZS payment amount uses authoritative USD grand total',
  async () => {
    const quote =
      await createServerPaymentQuote({
        items: [
          {
            productId: 17,
            quantity: 1,
          },
        ],

        paymentAsset:
          'NTZS',
      });

    const expected =
      Math.round(
        quote.charges
          .grandTotalUsd *
          quote.rateSnapshot
            .usdToTzs,
      );

    assert.equal(
      quote.paymentAmount,
      expected,
    );

    assert.equal(
      quote.rateSnapshot
        .tzsToNtzs,
      1,
    );
  },
);

test(
  'PI payment amount is calculated from authoritative grand total',
  async () => {
    const quote =
      await createServerPaymentQuote({
        items: [
          {
            productId: 17,
            quantity: 1,
          },
        ],

        paymentAsset:
          'PI',
      });

    const expected =
      Math.round(
        (
          quote.charges
            .grandTotalUsd /
          quote.rateSnapshot
            .piGcvUsd +
          Number.EPSILON
        ) *
          100_000_000,
      ) /
      100_000_000;

    assert.equal(
      quote.paymentAmount,
      expected,
    );
  },
);
