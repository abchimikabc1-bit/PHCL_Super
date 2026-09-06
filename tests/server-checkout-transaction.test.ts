import 'server-only';

import test, {
  beforeEach,
} from 'node:test';

import assert from 'node:assert/strict';

import {
  adminDb,
} from '@/lib/firebase-admin';

import {
  displayAmountToAtomic,
} from '@/lib/server-financial-ledger';

import {
  createServerPaymentQuote,
  type PaymentQuoteAsset,
  type ServerPaymentQuote,
} from '@/lib/server-payment-quote';

import {
  saveServerPaymentQuote,
} from '@/lib/server-payment-quote-store';

import {
  getServerProductStockConfig,
  saveServerProductStockConfig,
} from '@/lib/server-product-stock-store';

import {
  runServerCheckoutTransaction,
} from '@/lib/server-checkout-transaction';

/**
 * ============================================================
 * PHCL SUPER — SECURE CHECKOUT TRANSACTION TESTS
 * ============================================================
 *
 * Run with:
 *
 * $env:NODE_OPTIONS="--conditions=react-server"
 * firebase emulators:exec --only firestore "npx tsx --test tests/server-checkout-transaction.test.ts"
 * Remove-Item Env:NODE_OPTIONS
 *
 * These tests MUST run against the Firestore Emulator.
 */

const CUSTOMER_UID =
  'checkout-test-customer';

const OTHER_CUSTOMER_UID =
  'checkout-test-other-customer';

const TEST_PRODUCT_ID =
  '17';

const TEST_QUANTITY =
  1;

const FINANCIAL_ACCOUNT_COLLECTION =
  'financial_accounts';

const FINANCIAL_LEDGER_COLLECTION =
  'financial_ledger';

const FINANCIAL_OPERATION_COLLECTION =
  'financial_operations';

const PAYMENT_QUOTE_COLLECTION =
  'payment_quotes';

const CHECKOUT_OPERATION_COLLECTION =
  'checkout_operations';

const ORDER_COLLECTION =
  'orders';

const STOCK_COLLECTION =
  'admin_product_stock';

const STOCK_STATE_DOCUMENT =
  'state';

function uniqueId(
  prefix: string,
): string {
  return [
    prefix,
    Date.now(),
    Math.random()
      .toString(16)
      .slice(2),
  ].join('-');
}

async function deleteCollection(
  collectionName: string,
): Promise<void> {
  while (true) {
    const snapshot =
      await adminDb
        .collection(
          collectionName,
        )
        .limit(250)
        .get();

    if (
      snapshot.empty
    ) {
      return;
    }

    const batch =
      adminDb.batch();

    for (
      const document of
        snapshot.docs
    ) {
      batch.delete(
        document.ref,
      );
    }

    await batch.commit();
  }
}

async function resetTestState():
Promise<void> {
  await Promise.all([
    deleteCollection(
      FINANCIAL_ACCOUNT_COLLECTION,
    ),

    deleteCollection(
      FINANCIAL_LEDGER_COLLECTION,
    ),

    deleteCollection(
      FINANCIAL_OPERATION_COLLECTION,
    ),

    deleteCollection(
      PAYMENT_QUOTE_COLLECTION,
    ),

    deleteCollection(
      CHECKOUT_OPERATION_COLLECTION,
    ),

    deleteCollection(
      ORDER_COLLECTION,
    ),

    deleteCollection(
      STOCK_COLLECTION,
    ),
  ]);
}

async function seedFinancialBalance(
  uid: string,
  asset:
    PaymentQuoteAsset,
  displayAmount:
    string | number,
): Promise<void> {
  const amountAtomic =
    displayAmountToAtomic(
      displayAmount,
      asset,
    );

  const balancesAtomic = {
    usd:
      '0',

    tzs:
      '0',

    ntzs:
      '0',

    pi:
      '0',
  };

  switch (asset) {
    case 'USD':
      balancesAtomic.usd =
        amountAtomic;
      break;

    case 'TZS':
      balancesAtomic.tzs =
        amountAtomic;
      break;

    case 'NTZS':
      balancesAtomic.ntzs =
        amountAtomic;
      break;

    case 'PI':
      balancesAtomic.pi =
        amountAtomic;
      break;
  }

  await adminDb
    .collection(
      FINANCIAL_ACCOUNT_COLLECTION,
    )
    .doc(
      uid,
    )
    .set({
      uid,

      balancesAtomic,

      updatedAt:
        new Date().toISOString(),
    });
}

async function readFinancialBalanceAtomic(
  uid: string,
  asset:
    PaymentQuoteAsset,
): Promise<string> {
  const snapshot =
    await adminDb
      .collection(
        FINANCIAL_ACCOUNT_COLLECTION,
      )
      .doc(
        uid,
      )
      .get();

  if (
    !snapshot.exists
  ) {
    return '0';
  }

  const data =
    snapshot.data();

  const balances =
    data?.balancesAtomic;

  if (
    !balances ||
    typeof balances !==
      'object'
  ) {
    return '0';
  }

  switch (asset) {
    case 'USD':
      return typeof balances.usd ===
        'string'
        ? balances.usd
        : '0';

    case 'TZS':
      return typeof balances.tzs ===
        'string'
        ? balances.tzs
        : '0';

    case 'NTZS':
      return typeof balances.ntzs ===
        'string'
        ? balances.ntzs
        : '0';

    case 'PI':
      return typeof balances.pi ===
        'string'
        ? balances.pi
        : '0';
  }
}

async function seedFiniteStock(
  quantity:
    number,
): Promise<void> {
  const config =
    await getServerProductStockConfig();

  const product =
    config.products[
      TEST_PRODUCT_ID
    ];

  assert.ok(
    product,
    `Test product ${TEST_PRODUCT_ID} must exist in the stock catalogue.`,
  );

  config.products[
    TEST_PRODUCT_ID
  ] = {
    ...product,

    stock:
      quantity,

    enabledForSale:
      quantity > 0,
  };

  config.updatedAt =
    new Date().toISOString();

  await saveServerProductStockConfig(
    config,
    'checkout_test_seed',
  );
}

async function readTestStock():
Promise<number> {
  const config =
    await getServerProductStockConfig();

  const product =
    config.products[
      TEST_PRODUCT_ID
    ];

  assert.ok(
    product,
    `Test product ${TEST_PRODUCT_ID} must exist.`,
  );

  return product.stock;
}

async function createPersistedQuote(
  options?: {
    customerUid?: string;

    paymentAsset?:
      PaymentQuoteAsset;

    expired?: boolean;
  },
): Promise<ServerPaymentQuote> {
  const customerUid =
    options?.customerUid ??
    CUSTOMER_UID;

  const paymentAsset =
    options?.paymentAsset ??
    'USD';

  const quote =
    await createServerPaymentQuote({
      items: [
        {
          productId:
            Number(
              TEST_PRODUCT_ID,
            ),

          quantity:
            TEST_QUANTITY,
        },
      ],

      paymentAsset,
  });

  if (
    options?.expired
  ) {
    const expiredAt =
      new Date(
        Date.now() -
          60_000,
      ).toISOString();

    const expiredQuote:
      ServerPaymentQuote =
    {
      ...quote,

      createdAt:
        new Date(
          Date.now() -
            120_000,
        ).toISOString(),

      expiresAt:
        expiredAt,

      status:
        'EXPIRED',
    };

    /**
     * saveServerPaymentQuote intentionally refuses expired
     * quotes. For this negative-path test we persist the
     * server-shaped document directly into the emulator so
     * checkout must reject it server-side.
     */
    await adminDb
      .collection(
        PAYMENT_QUOTE_COLLECTION,
      )
      .doc(
        expiredQuote.quoteId,
      )
      .create({
        quoteId:
          expiredQuote.quoteId,

        customerUid,

        quote:
          expiredQuote,

        status:
          'ACTIVE',

        createdAt:
          expiredQuote.createdAt,

        expiresAt:
          expiredQuote.expiresAt,

        consumedAt:
          null,

        consumedByOperationId:
          null,
      });

    return expiredQuote;
  }

  await saveServerPaymentQuote(
    customerUid,
    quote,
  );

  return quote;
}

async function getQuoteDocument(
  quoteId: string,
) {
  return adminDb
    .collection(
      PAYMENT_QUOTE_COLLECTION,
    )
    .doc(
      quoteId,
    )
    .get();
}

async function countDocuments(
  collectionName:
    string,
): Promise<number> {
  const snapshot =
    await adminDb
      .collection(
        collectionName,
      )
      .get();

  return snapshot.size;
}

beforeEach(
  async () => {
    await resetTestState();
  },
);

test(
  'successful checkout atomically debits balance, decrements stock, creates order and consumes quote',
  async () => {
    await seedFiniteStock(
      5,
    );

    const quote =
      await createPersistedQuote();

    const startingBalance =
      (
        quote.paymentAmount *
        3
      ).toFixed(
        2,
      );

    await seedFinancialBalance(
      CUSTOMER_UID,
      'USD',
      startingBalance,
    );

    const operationId =
      uniqueId(
        'checkout-success',
      );

    const beforeStock =
      await readTestStock();

    const beforeBalanceAtomic =
      await readFinancialBalanceAtomic(
        CUSTOMER_UID,
        'USD',
      );

    const expectedDebitAtomic =
      displayAmountToAtomic(
        quote.paymentAmount,
        'USD',
      );

    const result =
      await runServerCheckoutTransaction({
        customerUid:
          CUSTOMER_UID,

        quoteId:
          quote.quoteId,

        operationId,
      });

    assert.equal(
      result.success,
      true,
    );

    assert.equal(
      result.idempotent,
      false,
    );

    assert.equal(
      result.quoteId,
      quote.quoteId,
    );

    assert.equal(
      result.customerUid,
      CUSTOMER_UID,
    );

    assert.equal(
      result.paymentAmountAtomic,
      expectedDebitAtomic,
    );

    const afterStock =
      await readTestStock();

    assert.equal(
      afterStock,
      beforeStock -
        TEST_QUANTITY,
    );

    const afterBalanceAtomic =
      await readFinancialBalanceAtomic(
        CUSTOMER_UID,
        'USD',
      );

    assert.equal(
      BigInt(
        afterBalanceAtomic,
      ),
      BigInt(
        beforeBalanceAtomic,
      ) -
        BigInt(
          expectedDebitAtomic,
        ),
    );

    const quoteSnapshot =
      await getQuoteDocument(
        quote.quoteId,
      );

    assert.equal(
      quoteSnapshot.data()
        ?.status,
      'CONSUMED',
    );

    assert.equal(
      quoteSnapshot.data()
        ?.consumedByOperationId,
      operationId,
    );

    const orderSnapshot =
      await adminDb
        .collection(
          ORDER_COLLECTION,
        )
        .doc(
          result.orderId,
        )
        .get();

    assert.equal(
      orderSnapshot.exists,
      true,
    );

    assert.equal(
      orderSnapshot.data()
        ?.quoteId,
      quote.quoteId,
    );

    assert.equal(
      orderSnapshot.data()
        ?.customerUid,
      CUSTOMER_UID,
    );

    assert.equal(
      await countDocuments(
        FINANCIAL_LEDGER_COLLECTION,
      ),
      1,
    );

    assert.equal(
      await countDocuments(
        FINANCIAL_OPERATION_COLLECTION,
      ),
      1,
    );

    assert.equal(
      await countDocuments(
        CHECKOUT_OPERATION_COLLECTION,
      ),
      1,
    );
  },
);

test(
  'insufficient funds rolls back stock, order and quote consumption',
  async () => {
    await seedFiniteStock(
      5,
    );

    const quote =
      await createPersistedQuote();

    await seedFinancialBalance(
      CUSTOMER_UID,
      'USD',
      '0',
    );

    const beforeStock =
      await readTestStock();

    await assert.rejects(
      () =>
        runServerCheckoutTransaction({
          customerUid:
            CUSTOMER_UID,

          quoteId:
            quote.quoteId,

          operationId:
            uniqueId(
              'checkout-no-funds',
            ),
        }),
      /Insufficient funds/,
    );

    assert.equal(
      await readTestStock(),
      beforeStock,
    );

    const quoteSnapshot =
      await getQuoteDocument(
        quote.quoteId,
      );

    assert.equal(
      quoteSnapshot.data()
        ?.status,
      'ACTIVE',
    );

    assert.equal(
      await countDocuments(
        ORDER_COLLECTION,
      ),
      0,
    );

    assert.equal(
      await countDocuments(
        CHECKOUT_OPERATION_COLLECTION,
      ),
      0,
    );

    assert.equal(
      await countDocuments(
        FINANCIAL_LEDGER_COLLECTION,
      ),
      0,
    );

    assert.equal(
      await countDocuments(
        FINANCIAL_OPERATION_COLLECTION,
      ),
      0,
    );
  },
);

test(
  'insufficient stock prevents debit, order creation and quote consumption',
  async () => {
    await seedFiniteStock(
      0,
    );

    const quote =
      await createPersistedQuote();

    await seedFinancialBalance(
      CUSTOMER_UID,
      'USD',
      (
        quote.paymentAmount *
        3
      ).toFixed(
        2,
      ),
    );

    const beforeBalance =
      await readFinancialBalanceAtomic(
        CUSTOMER_UID,
        'USD',
      );

    await assert.rejects(
      () =>
        runServerCheckoutTransaction({
          customerUid:
            CUSTOMER_UID,

          quoteId:
            quote.quoteId,

          operationId:
            uniqueId(
              'checkout-no-stock',
            ),
        }),
      /unavailable|available|stock/i,
    );

    const afterBalance =
      await readFinancialBalanceAtomic(
        CUSTOMER_UID,
        'USD',
      );

    assert.equal(
      afterBalance,
      beforeBalance,
    );

    const quoteSnapshot =
      await getQuoteDocument(
        quote.quoteId,
      );

    assert.equal(
      quoteSnapshot.data()
        ?.status,
      'ACTIVE',
    );

    assert.equal(
      await countDocuments(
        ORDER_COLLECTION,
      ),
      0,
    );

    assert.equal(
      await countDocuments(
        FINANCIAL_LEDGER_COLLECTION,
      ),
      0,
    );

    assert.equal(
      await countDocuments(
        FINANCIAL_OPERATION_COLLECTION,
      ),
      0,
    );
  },
);

test(
  'expired quote is rejected without financial, stock or order mutation',
  async () => {
    await seedFiniteStock(
      5,
    );

    const quote =
      await createPersistedQuote({
        expired:
          true,
      });

    await seedFinancialBalance(
      CUSTOMER_UID,
      'USD',
      '100000.00',
    );

    const beforeStock =
      await readTestStock();

    const beforeBalance =
      await readFinancialBalanceAtomic(
        CUSTOMER_UID,
        'USD',
      );

    await assert.rejects(
      () =>
        runServerCheckoutTransaction({
          customerUid:
            CUSTOMER_UID,

          quoteId:
            quote.quoteId,

          operationId:
            uniqueId(
              'checkout-expired',
            ),
        }),
      /expired/i,
    );

    assert.equal(
      await readTestStock(),
      beforeStock,
    );

    assert.equal(
      await readFinancialBalanceAtomic(
        CUSTOMER_UID,
        'USD',
      ),
      beforeBalance,
    );

    const quoteSnapshot =
      await getQuoteDocument(
        quote.quoteId,
      );

    assert.equal(
      quoteSnapshot.data()
        ?.status,
      'ACTIVE',
    );

    assert.equal(
      await countDocuments(
        ORDER_COLLECTION,
      ),
      0,
    );

    assert.equal(
      await countDocuments(
        FINANCIAL_LEDGER_COLLECTION,
      ),
      0,
    );
  },
);

test(
  'customer cannot settle another customer payment quote',
  async () => {
    await seedFiniteStock(
      5,
    );

    const quote =
      await createPersistedQuote({
        customerUid:
          CUSTOMER_UID,
      });

    await seedFinancialBalance(
      OTHER_CUSTOMER_UID,
      'USD',
      '100000.00',
    );

    const beforeStock =
      await readTestStock();

    const beforeBalance =
      await readFinancialBalanceAtomic(
        OTHER_CUSTOMER_UID,
        'USD',
      );

    await assert.rejects(
      () =>
        runServerCheckoutTransaction({
          customerUid:
            OTHER_CUSTOMER_UID,

          quoteId:
            quote.quoteId,

          operationId:
            uniqueId(
              'checkout-wrong-owner',
            ),
        }),
      /does not belong/i,
    );

    assert.equal(
      await readTestStock(),
      beforeStock,
    );

    assert.equal(
      await readFinancialBalanceAtomic(
        OTHER_CUSTOMER_UID,
        'USD',
      ),
      beforeBalance,
    );

    assert.equal(
      await countDocuments(
        ORDER_COLLECTION,
      ),
      0,
    );

    assert.equal(
      await countDocuments(
        FINANCIAL_LEDGER_COLLECTION,
      ),
      0,
    );
  },
);

test(
  'same checkout operation retry is idempotent and cannot double debit or double decrement stock',
  async () => {
    await seedFiniteStock(
      5,
    );

    const quote =
      await createPersistedQuote();

    await seedFinancialBalance(
      CUSTOMER_UID,
      'USD',
      (
        quote.paymentAmount *
        3
      ).toFixed(
        2,
      ),
    );

    const operationId =
      uniqueId(
        'checkout-idempotent',
      );

    const first =
      await runServerCheckoutTransaction({
        customerUid:
          CUSTOMER_UID,

        quoteId:
          quote.quoteId,

        operationId,
      });

    assert.equal(
      first.idempotent,
      false,
    );

    const stockAfterFirst =
      await readTestStock();

    const balanceAfterFirst =
      await readFinancialBalanceAtomic(
        CUSTOMER_UID,
        'USD',
      );

    const ledgerCountAfterFirst =
      await countDocuments(
        FINANCIAL_LEDGER_COLLECTION,
      );

    const financialOperationCountAfterFirst =
      await countDocuments(
        FINANCIAL_OPERATION_COLLECTION,
      );

    const orderCountAfterFirst =
      await countDocuments(
        ORDER_COLLECTION,
      );

    const second =
      await runServerCheckoutTransaction({
        customerUid:
          CUSTOMER_UID,

        quoteId:
          quote.quoteId,

        operationId,
      });

    assert.equal(
      second.success,
      true,
    );

    assert.equal(
      second.idempotent,
      true,
    );

    assert.equal(
      second.orderId,
      first.orderId,
    );

    assert.equal(
      second.ledgerEntryId,
      first.ledgerEntryId,
    );

    assert.equal(
      await readTestStock(),
      stockAfterFirst,
    );

    assert.equal(
      await readFinancialBalanceAtomic(
        CUSTOMER_UID,
        'USD',
      ),
      balanceAfterFirst,
    );

    assert.equal(
      await countDocuments(
        FINANCIAL_LEDGER_COLLECTION,
      ),
      ledgerCountAfterFirst,
    );

    assert.equal(
      await countDocuments(
        FINANCIAL_OPERATION_COLLECTION,
      ),
      financialOperationCountAfterFirst,
    );

    assert.equal(
      await countDocuments(
        ORDER_COLLECTION,
      ),
      orderCountAfterFirst,
    );

    assert.equal(
      orderCountAfterFirst,
      1,
    );
  },
);
