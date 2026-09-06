import 'server-only';

import {
  MARKETPLACE_PRODUCTS,
} from '@/lib/marketplace-products';

export interface ServerPricingItemInput {
  productId: number;

  quantity: number;
}

export interface ServerPricedItem {
  productId: number;

  name: string;

  seller: string;

  quantity: number;

  unitPriceUsd: number;

  lineTotalUsd: number;
}

export interface ServerMarketplacePricingResult {
  currency: 'USD';

  items: ServerPricedItem[];

  totalQuantity: number;

  subtotalUsd: number;
}

const MAX_DISTINCT_ITEMS = 100;

const MAX_QUANTITY_PER_ITEM = 1000;

const USD_DECIMAL_FACTOR = 100;

function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function normalizeProductId(
  value: unknown,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 1
  ) {
    throw new Error(
      'Invalid marketplace product ID.',
    );
  }

  return value;
}

function normalizeQuantity(
  value: unknown,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value >
      MAX_QUANTITY_PER_ITEM
  ) {
    throw new Error(
      `Product quantity must be an integer between 1 and ${MAX_QUANTITY_PER_ITEM}.`,
    );
  }

  return value;
}

function normalizeUsdAmount(
  value: number,
): number {
  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new Error(
      'Invalid canonical USD amount.',
    );
  }

  return (
    Math.round(
      (value + Number.EPSILON) *
        USD_DECIMAL_FACTOR,
    ) /
    USD_DECIMAL_FACTOR
  );
}

function getCanonicalProduct(
  productId: number,
) {
  const product =
    MARKETPLACE_PRODUCTS.find(
      (candidate) =>
        candidate.id ===
        productId,
    );

  if (!product) {
    throw new Error(
      `Marketplace product ${productId} was not found.`,
    );
  }

  if (
    product.inStock !== true
  ) {
    throw new Error(
      `Marketplace product ${productId} is not available.`,
    );
  }

  if (
    typeof product.priceUSD !==
      'number' ||
    !Number.isFinite(
      product.priceUSD,
    ) ||
    product.priceUSD <= 0
  ) {
    throw new Error(
      `Marketplace product ${productId} has an invalid canonical USD price.`,
    );
  }

  return product;
}

function normalizePricingItems(
  input: unknown,
): ServerPricingItemInput[] {
  if (
    !Array.isArray(input) ||
    input.length === 0
  ) {
    throw new Error(
      'At least one marketplace item is required.',
    );
  }

  if (
    input.length >
    MAX_DISTINCT_ITEMS
  ) {
    throw new Error(
      `A maximum of ${MAX_DISTINCT_ITEMS} distinct marketplace items is allowed.`,
    );
  }

  const quantities =
    new Map<number, number>();

  for (const rawItem of input) {
    if (
      !isPlainObject(rawItem)
    ) {
      throw new Error(
        'Invalid marketplace pricing item.',
      );
    }

    const productId =
      normalizeProductId(
        rawItem.productId,
      );

    const quantity =
      normalizeQuantity(
        rawItem.quantity,
      );

    const currentQuantity =
      quantities.get(
        productId,
      ) ?? 0;

    const combinedQuantity =
      currentQuantity +
      quantity;

    if (
      !Number.isSafeInteger(
        combinedQuantity,
      ) ||
      combinedQuantity >
        MAX_QUANTITY_PER_ITEM
    ) {
      throw new Error(
        `Combined quantity for product ${productId} exceeds the allowed limit.`,
      );
    }

    quantities.set(
      productId,
      combinedQuantity,
    );
  }

  return Array.from(
    quantities.entries(),
    ([productId, quantity]) => ({
      productId,
      quantity,
    }),
  );
}

export function priceMarketplaceItemsServerSide(
  input: unknown,
): ServerMarketplacePricingResult {
  const normalizedItems =
    normalizePricingItems(
      input,
    );

  const pricedItems:
    ServerPricedItem[] = [];

  let subtotalCents = 0;

  let totalQuantity = 0;

  for (
    const item of
    normalizedItems
  ) {
    const product =
      getCanonicalProduct(
        item.productId,
      );

    const unitPriceUsd =
      normalizeUsdAmount(
        product.priceUSD,
      );

    const unitPriceCents =
      Math.round(
        unitPriceUsd *
          USD_DECIMAL_FACTOR,
      );

    if (
      !Number.isSafeInteger(
        unitPriceCents,
      ) ||
      unitPriceCents < 1
    ) {
      throw new Error(
        `Marketplace product ${item.productId} has an unsafe canonical USD price.`,
      );
    }

    const lineTotalCents =
      unitPriceCents *
      item.quantity;

    if (
      !Number.isSafeInteger(
        lineTotalCents,
      )
    ) {
      throw new Error(
        'Marketplace line total exceeds the supported safe range.',
      );
    }

    const nextSubtotalCents =
      subtotalCents +
      lineTotalCents;

    if (
      !Number.isSafeInteger(
        nextSubtotalCents,
      )
    ) {
      throw new Error(
        'Marketplace subtotal exceeds the supported safe range.',
      );
    }

    subtotalCents =
      nextSubtotalCents;

    totalQuantity +=
      item.quantity;

    if (
      !Number.isSafeInteger(
        totalQuantity,
      )
    ) {
      throw new Error(
        'Marketplace quantity exceeds the supported safe range.',
      );
    }

    pricedItems.push({
      productId:
        product.id,

      name:
        product.name,

      seller:
        product.seller,

      quantity:
        item.quantity,

      unitPriceUsd,

      lineTotalUsd:
        lineTotalCents /
        USD_DECIMAL_FACTOR,
    });
  }

  return {
    currency:
      'USD',

    items:
      pricedItems,

    totalQuantity,

    subtotalUsd:
      subtotalCents /
      USD_DECIMAL_FACTOR,
  };
}