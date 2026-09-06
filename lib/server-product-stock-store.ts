import 'server-only';

import {
  FieldValue,
  type DocumentReference,
  type Transaction,
} from 'firebase-admin/firestore';

import {
  adminDb,
} from '@/lib/firebase-admin';

import {
  createDefaultProductStockConfig,
  type ProductStock,
  type ProductStockAuditEntry,
  type ProductStockConfig,
  type ProductStockPurchaseItem,
} from '@/lib/admin-product-stock';

const COLLECTION =
  'admin_product_stock';

const STATE_DOCUMENT =
  'state';

const MAX_AUDIT_ENTRIES =
  120;

const MAX_NOTES_LENGTH =
  500;

type StoredStockState = {
  config?: ProductStockConfig;
  audit?: ProductStockAuditEntry[];
};

export type PreparedProductStockPurchase =
  | {
      success: true;
      stateRef: DocumentReference;
      config: ProductStockConfig;
      audit: ProductStockAuditEntry[];
    }
  | {
      success: false;
      reason: string;
      stateRef: DocumentReference;
      config: ProductStockConfig;
      audit: ProductStockAuditEntry[];
    };

type ProductStockUpdate = {
  stock?: number;
  enabledForSale?: boolean;
  notes?: string;
};

function getStateRef() {
  return adminDb
    .collection(COLLECTION)
    .doc(STATE_DOCUMENT);
}

function normalizeActor(
  actor: string
): string {
  const normalized =
    actor.trim().toLowerCase();

  return normalized
    ? normalized.slice(0, 180)
    : 'system';
}

function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function normalizeStockValue(
  value: unknown
): number | null {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isInteger(value)
  ) {
    return null;
  }

  if (value === -1) {
    return -1;
  }

  if (value < 0) {
    return null;
  }

  return value;
}

function normalizeNotes(
  value: unknown
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  return value
    .trim()
    .slice(0, MAX_NOTES_LENGTH);
}

function createCanonicalConfig(
  value?: unknown
): ProductStockConfig {
  const defaults =
    createDefaultProductStockConfig();

  if (!isPlainObject(value)) {
    return defaults;
  }

  const productsValue =
    isPlainObject(value.products)
      ? value.products
      : {};

  const products:
    ProductStockConfig['products'] =
      {};

  for (
    const [
      productId,
      defaultProduct,
    ] of Object.entries(
      defaults.products
    )
  ) {
    const candidate =
      productsValue[productId];

    if (!isPlainObject(candidate)) {
      products[productId] = {
        ...defaultProduct,
      };

      continue;
    }

    const stock =
      normalizeStockValue(
        candidate.stock
      );

    const enabledForSale =
      typeof candidate.enabledForSale ===
      'boolean'
        ? candidate.enabledForSale
        : defaultProduct.enabledForSale;

    const notes =
      normalizeNotes(
        candidate.notes
      );

    products[productId] = {
      productId:
        defaultProduct.productId,

      productName:
        defaultProduct.productName,

      stock:
        stock ??
        defaultProduct.stock,

      enabledForSale,

      lastRestockedAt:
        typeof candidate.lastRestockedAt ===
          'string' &&
        Number.isFinite(
          Date.parse(
            candidate.lastRestockedAt
          )
        )
          ? candidate.lastRestockedAt
          : defaultProduct.lastRestockedAt,

      ...(notes !== undefined
        ? { notes }
        : {}),
    };
  }

  return {
    products,

    updatedAt:
      typeof value.updatedAt ===
        'string' &&
      Number.isFinite(
        Date.parse(
          value.updatedAt
        )
      )
        ? value.updatedAt
        : new Date().toISOString(),
  };
}

function normalizeAuditEntry(
  value: unknown
): ProductStockAuditEntry | null {
  if (!isPlainObject(value)) {
    return null;
  }

  if (
    typeof value.timestamp !==
      'string' ||
    !Number.isFinite(
      Date.parse(
        value.timestamp
      )
    ) ||
    typeof value.actor !==
      'string' ||
    typeof value.action !==
      'string'
  ) {
    return null;
  }

  const entry: ProductStockAuditEntry =
    {
      timestamp:
        value.timestamp,

      actor:
        value.actor
          .trim()
          .slice(0, 180),

      action:
        value.action
          .trim()
          .slice(0, 80),
    };

  if (
    typeof value.productId ===
    'string'
  ) {
    entry.productId =
      value.productId
        .trim()
        .slice(0, 200);
  }

  if (
    typeof value.productName ===
    'string'
  ) {
    entry.productName =
      value.productName
        .trim()
        .slice(0, 240);
  }

  const from =
    normalizeStockValue(
      value.stockChangedFrom
    );

  if (from !== null) {
    entry.stockChangedFrom =
      from;
  }

  const to =
    normalizeStockValue(
      value.stockChangedTo
    );

  if (to !== null) {
    entry.stockChangedTo =
      to;
  }

  if (
    Array.isArray(
      value.changedProducts
    )
  ) {
    entry.changedProducts =
      value.changedProducts
        .filter(
          (
            item
          ): item is string =>
            typeof item ===
            'string'
        )
        .map((item) =>
          item
            .trim()
            .slice(0, 200)
        )
        .filter(Boolean)
        .slice(0, 500);
  }

  return entry;
}

function normalizeAudit(
  value: unknown
): ProductStockAuditEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const entries:
    ProductStockAuditEntry[] =
      [];

  for (const item of value) {
    const normalized =
      normalizeAuditEntry(
        item
      );

    if (normalized) {
      entries.push(
        normalized
      );
    }
  }

  return entries.slice(
    -MAX_AUDIT_ENTRIES
  );
}

function appendAudit(
  audit:
    ProductStockAuditEntry[],

  entry:
    ProductStockAuditEntry
): ProductStockAuditEntry[] {
  return [
    ...audit,
    entry,
  ].slice(
    -MAX_AUDIT_ENTRIES
  );
}

function normalizeUpdate(
  updates: unknown
): ProductStockUpdate {
  if (!isPlainObject(updates)) {
    throw new Error(
      'Invalid stock update.'
    );
  }

  const result:
    ProductStockUpdate = {};

  if (
    Object.prototype.hasOwnProperty.call(
      updates,
      'stock'
    )
  ) {
    const stock =
      normalizeStockValue(
        updates.stock
      );

    if (stock === null) {
      throw new Error(
        'Stock must be -1 or a non-negative integer.'
      );
    }

    result.stock =
      stock;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      updates,
      'enabledForSale'
    )
  ) {
    if (
      typeof updates.enabledForSale !==
      'boolean'
    ) {
      throw new Error(
        'enabledForSale must be boolean.'
      );
    }

    result.enabledForSale =
      updates.enabledForSale;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      updates,
      'notes'
    )
  ) {
    if (
      typeof updates.notes !==
      'string'
    ) {
      throw new Error(
        'notes must be a string.'
      );
    }

    result.notes =
      updates.notes
        .trim()
        .slice(
          0,
          MAX_NOTES_LENGTH
        );
  }

  if (
    Object.keys(result).length ===
    0
  ) {
    throw new Error(
      'No supported stock fields were supplied.'
    );
  }

  return result;
}

function normalizePurchaseItems(
  items:
    ProductStockPurchaseItem[]
): ProductStockPurchaseItem[] {
  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    throw new Error(
      'Purchase items are required.'
    );
  }

  const merged =
    new Map<string, number>();

  for (const item of items) {
    if (
      !item ||
      typeof item.productId !==
        'string'
    ) {
      throw new Error(
        'Invalid purchase product.'
      );
    }

    const productId =
      item.productId
        .trim()
        .slice(0, 200);

    if (!productId) {
      throw new Error(
        'Invalid purchase product.'
      );
    }

    if (
      typeof item.quantity !==
        'number' ||
      !Number.isFinite(
        item.quantity
      ) ||
      !Number.isInteger(
        item.quantity
      ) ||
      item.quantity <= 0
    ) {
      throw new Error(
        'Purchase quantity must be a positive integer.'
      );
    }

    const current =
      merged.get(
        productId
      ) ?? 0;

    const next =
      current +
      item.quantity;

    if (
      !Number.isSafeInteger(
        next
      )
    ) {
      throw new Error(
        'Purchase quantity is too large.'
      );
    }

    merged.set(
      productId,
      next
    );
  }

  return Array.from(
    merged.entries()
  ).map(
    ([
      productId,
      quantity,
    ]) => ({
      productId,
      quantity,
    })
  );
}

async function readState(): Promise<{
  config: ProductStockConfig;
  audit: ProductStockAuditEntry[];
}> {
  const snapshot =
    await getStateRef().get();

  if (!snapshot.exists) {
    return {
      config:
        createDefaultProductStockConfig(),

      audit: [],
    };
  }

  const data =
    snapshot.data() as
      | StoredStockState
      | undefined;

  return {
    config:
      createCanonicalConfig(
        data?.config
      ),

    audit:
      normalizeAudit(
        data?.audit
      ),
  };
}

export async function getServerProductStockConfig():
Promise<ProductStockConfig> {
  const state =
    await readState();

  return state.config;
}

export async function getServerProductStockAudit():
Promise<ProductStockAuditEntry[]> {
  const state =
    await readState();

  return state.audit;
}

export async function saveServerProductStockConfig(
  config:
    ProductStockConfig,

  actor = 'admin'
): Promise<{
  config: ProductStockConfig;
  audit: ProductStockAuditEntry[];
}> {
  const ref =
    getStateRef();

  return adminDb.runTransaction(
    async (transaction) => {
      const snapshot =
        await transaction.get(
          ref
        );

      const existing =
        snapshot.exists
          ? (
              snapshot.data() as
                | StoredStockState
                | undefined
            )
          : undefined;

      const current =
        createCanonicalConfig(
          existing?.config
        );

      const requested =
        createCanonicalConfig(
          config
        );

      const now =
        new Date().toISOString();

      const products:
        ProductStockConfig['products'] =
          {};

      const changedProducts:
        string[] = [];

      for (
        const [
          productId,
          currentProduct,
        ] of Object.entries(
          current.products
        )
      ) {
        const nextProduct =
          requested.products[
            productId
          ];

        if (!nextProduct) {
          products[productId] =
            currentProduct;

          continue;
        }

        const stockChanged =
          currentProduct.stock !==
          nextProduct.stock;

        const enabledChanged =
          currentProduct.enabledForSale !==
          nextProduct.enabledForSale;

        const notesChanged =
          (currentProduct.notes ??
            '') !==
          (nextProduct.notes ??
            '');

        products[productId] = {
          ...currentProduct,

          stock:
            nextProduct.stock,

          enabledForSale:
            nextProduct.enabledForSale,

          lastRestockedAt:
            stockChanged
              ? now
              : currentProduct.lastRestockedAt,

          ...(nextProduct.notes !==
          undefined
            ? {
                notes:
                  nextProduct.notes,
              }
            : {}),
        };

        if (
          stockChanged ||
          enabledChanged ||
          notesChanged
        ) {
          changedProducts.push(
            productId
          );
        }
      }

      const normalized: ProductStockConfig =
        {
          products,
          updatedAt: now,
        };

      const audit =
        appendAudit(
          normalizeAudit(
            existing?.audit
          ),
          {
            timestamp: now,
            actor:
              normalizeActor(
                actor
              ),
            action:
              'bulk_update',
            changedProducts,
          }
        );

      transaction.set(
        ref,
        {
          config:
            normalized,
          audit,
          updatedAt:
            FieldValue.serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      return {
        config:
          normalized,
        audit,
      };
    }
  );
}

export async function updateServerProductStock(
  productId: string,
  updates:
    Partial<ProductStock>,
  actor = 'admin'
): Promise<{
  config: ProductStockConfig;
  audit: ProductStockAuditEntry[];
  updated: ProductStock | null;
}> {
  const ref =
    getStateRef();

  const normalizedProductId =
    productId
      .trim()
      .slice(0, 200);

  const safeUpdates =
    normalizeUpdate(
      updates
    );

  return adminDb.runTransaction(
    async (transaction) => {
      const snapshot =
        await transaction.get(
          ref
        );

      const existing =
        snapshot.exists
          ? (
              snapshot.data() as
                | StoredStockState
                | undefined
            )
          : undefined;

      const config =
        createCanonicalConfig(
          existing?.config
        );

      const current =
        config.products[
          normalizedProductId
        ];

      if (!current) {
        return {
          config,
          audit:
            normalizeAudit(
              existing?.audit
            ),
          updated: null,
        };
      }

      const now =
        new Date().toISOString();

      const stockChanged =
        safeUpdates.stock !==
          undefined &&
        safeUpdates.stock !==
          current.stock;

      const updated: ProductStock =
        {
          ...current,

          ...(safeUpdates.stock !==
          undefined
            ? {
                stock:
                  safeUpdates.stock,
              }
            : {}),

          ...(safeUpdates.enabledForSale !==
          undefined
            ? {
                enabledForSale:
                  safeUpdates.enabledForSale,
              }
            : {}),

          ...(safeUpdates.notes !==
          undefined
            ? {
                notes:
                  safeUpdates.notes,
              }
            : {}),

          lastRestockedAt:
            stockChanged
              ? now
              : current.lastRestockedAt,
        };

      config.products[
        normalizedProductId
      ] = updated;

      config.updatedAt =
        now;

      let action =
        'updated_stock';

      if (
        safeUpdates.enabledForSale !==
          undefined &&
        current.enabledForSale !==
          safeUpdates.enabledForSale
      ) {
        action =
          safeUpdates.enabledForSale
            ? 'enabled_product'
            : 'disabled_product';
      }

      const audit =
        appendAudit(
          normalizeAudit(
            existing?.audit
          ),
          {
            timestamp: now,

            actor:
              normalizeActor(
                actor
              ),

            action,

            productId:
              normalizedProductId,

            productName:
              current.productName,

            ...(stockChanged
              ? {
                  stockChangedFrom:
                    current.stock,

                  stockChangedTo:
                    updated.stock,
                }
              : {}),
          }
        );

      transaction.set(
        ref,
        {
          config,
          audit,
          updatedAt:
            FieldValue.serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      return {
        config,
        audit,
        updated,
      };
    }
  );
}

export async function prepareProductStockPurchaseInTransaction(
  transaction:
    Transaction,

  items:
    ProductStockPurchaseItem[],

  actor = 'system'
): Promise<PreparedProductStockPurchase> {
  const stateRef =
    getStateRef();

  const safeItems =
    normalizePurchaseItems(
      items
    );

  const safeActor =
    normalizeActor(
      actor
    );

  const snapshot =
    await transaction.get(
      stateRef
    );

  const existing =
    snapshot.exists
      ? (
          snapshot.data() as
            | StoredStockState
            | undefined
        )
      : undefined;

  const config =
    createCanonicalConfig(
      existing?.config
    );

  let audit =
    normalizeAudit(
      existing?.audit
    );

  for (const item of safeItems) {
    const stock =
      config.products[
        item.productId
      ];

    if (!stock) {
      return {
        success: false,
        reason:
          'Product not found.',
        stateRef,
        config,
        audit,
      };
    }

    if (
      !stock.enabledForSale
    ) {
      return {
        success: false,
        reason:
          `${stock.productName} is unavailable for purchase.`,
        stateRef,
        config,
        audit,
      };
    }

    if (
      stock.stock !== -1 &&
      stock.stock <
        item.quantity
    ) {
      return {
        success: false,
        reason:
          `Only ${stock.stock} ${
            stock.stock === 1
              ? 'unit'
              : 'units'
          } available for ${stock.productName}.`,
        stateRef,
        config,
        audit,
      };
    }
  }

  const now =
    new Date().toISOString();

  for (const item of safeItems) {
    const stock =
      config.products[
        item.productId
      ];

    if (
      !stock ||
      stock.stock === -1
    ) {
      continue;
    }

    const updatedStockValue =
      stock.stock -
      item.quantity;

    config.products[
      item.productId
    ] = {
      ...stock,

      stock:
        updatedStockValue,

      enabledForSale:
        updatedStockValue >
        0,
    };

    audit =
      appendAudit(
        audit,
        {
          timestamp:
            now,

          actor:
            safeActor,

          action:
            'sold_stock',

          productId:
            item.productId,

          productName:
            stock.productName,

          stockChangedFrom:
            stock.stock,

          stockChangedTo:
            updatedStockValue,
        }
      );
  }

  config.updatedAt =
    now;

  return {
    success: true,
    stateRef,
    config,
    audit,
  };
}

export function commitPreparedProductStockPurchase(
  transaction:
    Transaction,

  prepared:
    PreparedProductStockPurchase
): {
  success: true;
  config: ProductStockConfig;
  audit: ProductStockAuditEntry[];
} {
  if ('reason' in prepared) {
    throw new Error(
      prepared.reason
    );
  }

  transaction.set(
    prepared.stateRef,
    {
      config:
        prepared.config,
      audit:
        prepared.audit,
      updatedAt:
        FieldValue.serverTimestamp(),
    },
    {
      merge: true,
    }
  );

  return {
    success: true,
    config:
      prepared.config,
    audit:
      prepared.audit,
  };
}

export async function applyServerProductStockPurchase(
  items:
    ProductStockPurchaseItem[],
  actor = 'system'
): Promise<{
  success: boolean;
  reason?: string;
  config: ProductStockConfig;
  audit: ProductStockAuditEntry[];
}> {
  return adminDb.runTransaction(
    async (transaction) => {
      const prepared =
        await prepareProductStockPurchaseInTransaction(
          transaction,
          items,
          actor
        );

      if ('reason' in prepared) {
        return {
          success: false,
          reason:
            prepared.reason,
          config:
            prepared.config,
          audit:
            prepared.audit,
        };
      }

      return commitPreparedProductStockPurchase(
        transaction,
        prepared
      );
    }
  );
}

export async function revertServerProductStockPurchase(
  items:
    ProductStockPurchaseItem[],
  actor =
    'system_refund'
): Promise<{
  success: boolean;
  reason?: string;
  config: ProductStockConfig;
  audit: ProductStockAuditEntry[];
}> {
  const ref =
    getStateRef();

  const safeItems =
    normalizePurchaseItems(
      items
    );

  return adminDb.runTransaction(
    async (transaction) => {
      const snapshot =
        await transaction.get(
          ref
        );

      const existing =
        snapshot.exists
          ? (
              snapshot.data() as
                | StoredStockState
                | undefined
            )
          : undefined;

      const config =
        createCanonicalConfig(
          existing?.config
        );

      let audit =
        normalizeAudit(
          existing?.audit
        );

      for (const item of safeItems) {
        if (
          !config.products[
            item.productId
          ]
        ) {
          return {
            success: false,
            reason:
              'Product not found.',
            config,
            audit,
          };
        }
      }

      const now =
        new Date().toISOString();

      for (const item of safeItems) {
        const stock =
          config.products[
            item.productId
          ];

        if (
          stock.stock === -1
        ) {
          continue;
        }

        const updatedStockValue =
          stock.stock +
          item.quantity;

        if (
          !Number.isSafeInteger(
            updatedStockValue
          )
        ) {
          throw new Error(
            'Restored stock value is too large.'
          );
        }

        config.products[
          item.productId
        ] = {
          ...stock,

          stock:
            updatedStockValue,

          enabledForSale:
            updatedStockValue >
              0
              ? true
              : stock.enabledForSale,
        };

        audit =
          appendAudit(
            audit,
            {
              timestamp:
                now,

              actor:
                normalizeActor(
                  actor
                ),

              action:
                'restocked_refund',

              productId:
                item.productId,

              productName:
                stock.productName,

              stockChangedFrom:
                stock.stock,

              stockChangedTo:
                updatedStockValue,
            }
          );
      }

      config.updatedAt =
        now;

      transaction.set(
        ref,
        {
          config,
          audit,
          updatedAt:
            FieldValue.serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      return {
        success: true,
        config,
        audit,
      };
    }
  );
}