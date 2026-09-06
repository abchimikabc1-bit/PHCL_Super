import {
  after,
  test,
} from 'node:test';

import assert from 'node:assert/strict';

import {
  adminDb,
} from '@/lib/firebase-admin';

import {
  createServerPaymentQuote,
} from '@/lib/server-payment-quote';

import {
  commitPreparedPaymentQuoteConsumption,
  getStoredServerPaymentQuote,
  preparePaymentQuoteConsumptionInTransaction,
  saveServerPaymentQuote,
} from '@/lib/server-payment-quote-store';

const TEST_PREFIX =
  `quote-store-test-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;

const createdQuoteIds =
  new Set<string>();

function createCustomerUid(
  suffix: string,
) {
  return `${TEST_PREFIX}-${suffix}`;
}

function createOperationId(
  suffix: string,
) {
  return `${TEST_PREFIX}:${suffix}`;
}

async function createAndStoreQuote(
  customerUid: string,
  options?: {
    ttlSeconds?: number;
  },
) {
  const quote =
    await createServerPaymentQuote({
      items: [
        {
          productId: 17,
          quantity: 2,
        },
      ],

      paymentAsset:
        'TZS',

      ...(options?.ttlSeconds
        ? {
            ttlSeconds:
              options.ttlSeconds,
          }
        : {}),
    });

  const stored =
    await saveServerPaymentQuote(
      customerUid,
      quote,
    );

  createdQuoteIds.add(
    quote.quoteId,
  );

  return {
    quote,
    stored,
  };
}

after(async () => {
  for (
    const quoteId
    of createdQuoteIds
  ) {
    await adminDb
      .collection(
        'payment_quotes',
      )
      .doc(
        quoteId,
      )
      .delete()
      .catch(
        () => undefined,
      );
  }
});

test(
  'payment quote persists and is bound to authenticated customer UID',
  async () => {
    const customerUid =
      createCustomerUid(
        'owner',
      );

    const {
      quote,
      stored,
    } =
      await createAndStoreQuote(
        customerUid,
      );

    assert.equal(
      stored.quoteId,
      quote.quoteId,
    );

    assert.equal(
      stored.customerUid,
      customerUid,
    );

    assert.equal(
      stored.status,
      'ACTIVE',
    );

    assert.equal(
      stored.consumedAt,
      null,
    );

    assert.equal(
      stored
        .consumedByOperationId,
      null,
    );

    const reread =
      await getStoredServerPaymentQuote(
        quote.quoteId,
      );

    assert.ok(
      reread,
    );

    assert.equal(
      reread.customerUid,
      customerUid,
    );

    assert.equal(
      reread.quote.quoteId,
      quote.quoteId,
    );

    assert.equal(
      reread.quote.paymentAsset,
      'TZS',
    );

    assert.equal(
      reread.quote.paymentAmount,
      quote.paymentAmount,
    );

    assert.equal(
      reread.quote.rateVersion,
      quote.rateVersion,
    );
  },
);

test(
  'payment quote cannot be consumed by another customer',
  async () => {
    const ownerUid =
      createCustomerUid(
        'ownership-owner',
      );

    const attackerUid =
      createCustomerUid(
        'ownership-other',
      );

    const {
      quote,
    } =
      await createAndStoreQuote(
        ownerUid,
      );

    await assert.rejects(
      adminDb.runTransaction(
        async (
          transaction,
        ) => {
          await preparePaymentQuoteConsumptionInTransaction(
            transaction,
            {
              quoteId:
                quote.quoteId,

              customerUid:
                attackerUid,

              operationId:
                createOperationId(
                  'wrong-owner',
                ),
            },
          );
        },
      ),
      /does not belong/i,
    );

    const reread =
      await getStoredServerPaymentQuote(
        quote.quoteId,
      );

    assert.ok(
      reread,
    );

    assert.equal(
      reread.status,
      'ACTIVE',
    );

    assert.equal(
      reread.consumedAt,
      null,
    );
  },
);

test(
  'active payment quote can be consumed atomically',
  async () => {
    const customerUid =
      createCustomerUid(
        'consume',
      );

    const operationId =
      createOperationId(
        'consume',
      );

    const {
      quote,
    } =
      await createAndStoreQuote(
        customerUid,
      );

    await adminDb.runTransaction(
      async (
        transaction,
      ) => {
        const prepared =
          await preparePaymentQuoteConsumptionInTransaction(
            transaction,
            {
              quoteId:
                quote.quoteId,

              customerUid,

              operationId,
            },
          );

        assert.equal(
          prepared.idempotent,
          false,
        );

        const consumed =
          commitPreparedPaymentQuoteConsumption(
            transaction,
            prepared,
          );

        assert.equal(
          consumed.status,
          'CONSUMED',
        );

        assert.equal(
          consumed
            .consumedByOperationId,
          operationId,
        );
      },
    );

    const reread =
      await getStoredServerPaymentQuote(
        quote.quoteId,
      );

    assert.ok(
      reread,
    );

    assert.equal(
      reread.status,
      'CONSUMED',
    );

    assert.equal(
      reread
        .consumedByOperationId,
      operationId,
    );

    assert.ok(
      reread.consumedAt,
    );
  },
);

test(
  'same checkout operation can retry consumed quote idempotently',
  async () => {
    const customerUid =
      createCustomerUid(
        'idempotent',
      );

    const operationId =
      createOperationId(
        'idempotent',
      );

    const {
      quote,
    } =
      await createAndStoreQuote(
        customerUid,
      );

    await adminDb.runTransaction(
      async (
        transaction,
      ) => {
        const prepared =
          await preparePaymentQuoteConsumptionInTransaction(
            transaction,
            {
              quoteId:
                quote.quoteId,

              customerUid,

              operationId,
            },
          );

        commitPreparedPaymentQuoteConsumption(
          transaction,
          prepared,
        );
      },
    );

    const beforeRetry =
      await getStoredServerPaymentQuote(
        quote.quoteId,
      );

    assert.ok(
      beforeRetry,
    );

    const originalConsumedAt =
      beforeRetry.consumedAt;

    await adminDb.runTransaction(
      async (
        transaction,
      ) => {
        const prepared =
          await preparePaymentQuoteConsumptionInTransaction(
            transaction,
            {
              quoteId:
                quote.quoteId,

              customerUid,

              operationId,
            },
          );

        assert.equal(
          prepared.idempotent,
          true,
        );

        const result =
          commitPreparedPaymentQuoteConsumption(
            transaction,
            prepared,
          );

        assert.equal(
          result.status,
          'CONSUMED',
        );

        assert.equal(
          result
            .consumedByOperationId,
          operationId,
        );
      },
    );

    const afterRetry =
      await getStoredServerPaymentQuote(
        quote.quoteId,
      );

    assert.ok(
      afterRetry,
    );

    assert.equal(
      afterRetry.consumedAt,
      originalConsumedAt,
    );

    assert.equal(
      afterRetry
        .consumedByOperationId,
      operationId,
    );
  },
);

test(
  'consumed quote cannot be reused by a different checkout operation',
  async () => {
    const customerUid =
      createCustomerUid(
        'reuse',
      );

    const firstOperationId =
      createOperationId(
        'reuse-first',
      );

    const secondOperationId =
      createOperationId(
        'reuse-second',
      );

    const {
      quote,
    } =
      await createAndStoreQuote(
        customerUid,
      );

    await adminDb.runTransaction(
      async (
        transaction,
      ) => {
        const prepared =
          await preparePaymentQuoteConsumptionInTransaction(
            transaction,
            {
              quoteId:
                quote.quoteId,

              customerUid,

              operationId:
                firstOperationId,
            },
          );

        commitPreparedPaymentQuoteConsumption(
          transaction,
          prepared,
        );
      },
    );

    await assert.rejects(
      adminDb.runTransaction(
        async (
          transaction,
        ) => {
          await preparePaymentQuoteConsumptionInTransaction(
            transaction,
            {
              quoteId:
                quote.quoteId,

              customerUid,

              operationId:
                secondOperationId,
            },
          );
        },
      ),
      /already been consumed/i,
    );

    const reread =
      await getStoredServerPaymentQuote(
        quote.quoteId,
      );

    assert.ok(
      reread,
    );

    assert.equal(
      reread
        .consumedByOperationId,
      firstOperationId,
    );
  },
);

test(
  'expired quote is rejected server-side and remains unconsumed',
  async () => {
    const customerUid =
      createCustomerUid(
        'expired',
      );

    const {
      quote,
    } =
      await createAndStoreQuote(
        customerUid,
        {
          ttlSeconds: 30,
        },
      );

    const afterExpiry =
      new Date(
        Date.parse(
          quote.expiresAt,
        ) +
          1_000,
      );

    await assert.rejects(
      adminDb.runTransaction(
        async (
          transaction,
        ) => {
          await preparePaymentQuoteConsumptionInTransaction(
            transaction,
            {
              quoteId:
                quote.quoteId,

              customerUid,

              operationId:
                createOperationId(
                  'expired',
                ),

              now:
                afterExpiry,
            },
          );
        },
      ),
      /expired/i,
    );

    const reread =
      await getStoredServerPaymentQuote(
        quote.quoteId,
      );

    assert.ok(
      reread,
    );

    assert.equal(
      reread.status,
      'ACTIVE',
    );

    assert.equal(
      reread.consumedAt,
      null,
    );
  },
);

test(
  'same authoritative quote document cannot be created twice',
  async () => {
    const customerUid =
      createCustomerUid(
        'duplicate-create',
      );

    const {
      quote,
    } =
      await createAndStoreQuote(
        customerUid,
      );

    await assert.rejects(
      saveServerPaymentQuote(
        customerUid,
        quote,
      ),
    );

    const reread =
      await getStoredServerPaymentQuote(
        quote.quoteId,
      );

    assert.ok(
      reread,
    );

    assert.equal(
      reread.status,
      'ACTIVE',
    );
  },
);