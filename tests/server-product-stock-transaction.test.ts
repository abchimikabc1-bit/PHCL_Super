import {
  after,
  before,
  test,
} from 'node:test';

import assert from 'node:assert/strict';

import {
  adminDb,
} from '@/lib/firebase-admin';

import {
  applyServerProductStockPurchase,
  commitPreparedProductStockPurchase,
  getServerProductStockConfig,
  prepareProductStockPurchaseInTransaction,
  revertServerProductStockPurchase,
} from '@/lib/server-product-stock-store';

import {
  createDefaultProductStockConfig,
} from '@/lib/admin-product-stock';

const STOCK_REF =
  adminDb
    .collection(
      'admin_product_stock',
    )
    .doc('state');

let originalState:
  FirebaseFirestore.DocumentData |
  null = null;

let finiteProductId =
  '';

let unlimitedProductId =
  '';

before(async () => {
  const snapshot =
    await STOCK_REF.get();

  originalState =
    snapshot.exists
      ? snapshot.data() ?? null
      : null;

  const defaults =
    createDefaultProductStockConfig();

  const productEntries =
    Object.entries(
      defaults.products,
    );

  assert.ok(
    productEntries.length >= 1,
    'Expected at least one stock product in default config.',
  );

  const [
    firstProductId,
    firstProduct,
  ] =
    productEntries[0];

  finiteProductId =
    firstProductId;

  defaults.products[
    finiteProductId
  ] = {
    ...firstProduct,

    stock: 5,

    enabledForSale:
      true,
  };

  const secondEntry =
    productEntries.find(
      ([productId]) =>
        productId !==
        finiteProductId,
    );

  if (secondEntry) {
    const [
      secondProductId,
      secondProduct,
    ] =
      secondEntry;

    unlimitedProductId =
      secondProductId;

    defaults.products[
      unlimitedProductId
    ] = {
      ...secondProduct,

      stock: -1,

      enabledForSale:
        true,
    };
  }

  await STOCK_REF.set({
    config:
      defaults,

    audit: [],
  });
});

after(async () => {
  if (originalState) {
    await STOCK_REF.set(
      originalState,
    );
  } else {
    await STOCK_REF.delete();
  }
});

test(
  'transaction-aware stock purchase prepares and commits atomically',
  async () => {
    const beforeConfig =
      await getServerProductStockConfig();

    const productBefore =
      beforeConfig.products[
        finiteProductId
      ];

    assert.ok(
      productBefore,
    );

    assert.equal(
      productBefore.stock,
      5,
    );

    assert.equal(
      productBefore.enabledForSale,
      true,
    );

    const result =
      await adminDb.runTransaction(
        async (
          transaction,
        ) => {
          const prepared =
            await prepareProductStockPurchaseInTransaction(
              transaction,
              [
                {
                  productId:
                    finiteProductId,

                  quantity:
                    1,
                },
              ],
              'stock_transaction_test',
            );

          assert.equal(
            prepared.success,
            true,
          );

          if (
            prepared.success !==
            true
          ) {
            throw new Error(
              'Stock preparation unexpectedly failed.',
            );
          }

          return commitPreparedProductStockPurchase(
            transaction,
            prepared,
          );
        },
      );

    assert.equal(
      result.success,
      true,
    );

    const afterConfig =
      await getServerProductStockConfig();

    assert.equal(
      afterConfig.products[
        finiteProductId
      ].stock,
      4,
    );
  },
);

test(
  'failed stock validation does not mutate stock',
  async () => {
    const beforeConfig =
      await getServerProductStockConfig();

    const productBefore =
      beforeConfig.products[
        finiteProductId
      ];

    assert.ok(
      productBefore,
    );

    const stockBefore =
      productBefore.stock;

    assert.notEqual(
      stockBefore,
      -1,
    );

    const impossibleQuantity =
      stockBefore + 1;

    const prepared =
      await adminDb.runTransaction(
        async (
          transaction,
        ) =>
          prepareProductStockPurchaseInTransaction(
            transaction,
            [
              {
                productId:
                  finiteProductId,

                quantity:
                  impossibleQuantity,
              },
            ],
            'stock_insufficient_test',
          ),
      );

    assert.equal(
      prepared.success,
      false,
    );

    const afterConfig =
      await getServerProductStockConfig();

    assert.equal(
      afterConfig.products[
        finiteProductId
      ].stock,
      stockBefore,
    );
  },
);

test(
  'legacy applyServerProductStockPurchase wrapper still works',
  async () => {
    const beforeConfig =
      await getServerProductStockConfig();

    const productBefore =
      beforeConfig.products[
        finiteProductId
      ];

    assert.ok(
      productBefore,
    );

    const stockBefore =
      productBefore.stock;

    assert.notEqual(
      stockBefore,
      -1,
    );

    const purchase =
      await applyServerProductStockPurchase(
        [
          {
            productId:
              finiteProductId,

            quantity:
              1,
          },
        ],
        'legacy_wrapper_test',
      );

    assert.equal(
      purchase.success,
      true,
    );

    const afterPurchase =
      await getServerProductStockConfig();

    assert.equal(
      afterPurchase.products[
        finiteProductId
      ].stock,
      stockBefore - 1,
    );

    const refund =
      await revertServerProductStockPurchase(
        [
          {
            productId:
              finiteProductId,

            quantity:
              1,
          },
        ],
        'legacy_wrapper_refund_test',
      );

    assert.equal(
      refund.success,
      true,
    );

    const afterRefund =
      await getServerProductStockConfig();

    assert.equal(
      afterRefund.products[
        finiteProductId
      ].stock,
      stockBefore,
    );
  },
);

test(
  'unlimited stock remains unlimited after purchase',
  async () => {
    if (!unlimitedProductId) {
      return;
    }

    const beforeConfig =
      await getServerProductStockConfig();

    assert.equal(
      beforeConfig.products[
        unlimitedProductId
      ].stock,
      -1,
    );

    assert.equal(
      beforeConfig.products[
        unlimitedProductId
      ].enabledForSale,
      true,
    );

    await adminDb.runTransaction(
      async (
        transaction,
      ) => {
        const prepared =
          await prepareProductStockPurchaseInTransaction(
            transaction,
            [
              {
                productId:
                  unlimitedProductId,

                quantity:
                  10,
              },
            ],
            'unlimited_stock_test',
          );

        assert.equal(
          prepared.success,
          true,
        );

        if (
          prepared.success !==
          true
        ) {
          throw new Error(
            'Unlimited stock preparation failed.',
          );
        }

        commitPreparedProductStockPurchase(
          transaction,
          prepared,
        );
      },
    );

    const afterConfig =
      await getServerProductStockConfig();

    assert.equal(
      afterConfig.products[
        unlimitedProductId
      ].stock,
      -1,
    );
  },
);