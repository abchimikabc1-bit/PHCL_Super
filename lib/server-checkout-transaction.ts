import 'server-only';

import {
  createHash,
} from 'node:crypto';

import {
  FieldValue,
  type Transaction,
} from 'firebase-admin/firestore';

import {
  adminDb,
} from '@/lib/firebase-admin';

import {
  commitPreparedFinancialMutation,
  displayAmountToAtomic,
  prepareFinancialMutationInTransaction,
  type FinancialAsset,
  type FinancialMutationResult,
} from '@/lib/server-financial-ledger';

import {
  commitPreparedPaymentQuoteConsumption,
  preparePaymentQuoteConsumptionInTransaction,
  type StoredPaymentQuote,
} from '@/lib/server-payment-quote-store';

import {
  commitPreparedProductStockPurchase,
  prepareProductStockPurchaseInTransaction,
} from '@/lib/server-product-stock-store';

/**
 * ============================================================
 * PHCL SUPER — SECURE CHECKOUT TRANSACTION COORDINATOR
 * ============================================================
 *
 * SECURITY PURPOSE
 *
 * This module is the authoritative server-side checkout
 * settlement boundary for PHCL Super.
 *
 * The browser/client is NOT allowed to supply:
 *
 * - product prices
 * - subtotal
 * - tax
 * - platform/service fees
 * - grand total
 * - exchange rate
 * - payment amount
 * - balance mutation
 * - stock mutation
 * - order status
 *
 * The browser supplies only:
 *
 * - authenticated customer UID (derived by the API from Firebase)
 * - persisted payment quote ID
 * - idempotency/checkout operation ID
 *
 * All financial and commerce authority comes from:
 *
 * - payment_quotes/{quoteId}
 * - authoritative stock state
 * - authoritative financial ledger
 *
 * ATOMICITY
 *
 * The coordinator performs ALL Firestore reads first:
 *
 * 1. payment quote
 * 2. checkout operation/idempotency record
 * 3. stock state
 * 4. financial operation/account
 *
 * Only after every read/validation succeeds does it enter
 * the WRITE phase:
 *
 * 5. stock commit
 * 6. financial ledger commit
 * 7. order creation
 * 8. checkout operation creation
 * 9. quote consumption
 *
 * All writes occur inside ONE Firestore transaction.
 *
 * If any validation or write fails, Firestore rolls the entire
 * checkout back.
 */

const CHECKOUT_OPERATION_COLLECTION =
  'checkout_operations';

const ORDER_COLLECTION =
  'orders';

const CHECKOUT_SCHEMA_VERSION =
  1;

const MAX_UID_LENGTH =
  256;

const MAX_QUOTE_ID_LENGTH =
  160;

const MAX_OPERATION_ID_LENGTH =
  160;

export type ServerCheckoutStatus =
  | 'COMPLETED';

export type ServerCheckoutInput = {
  /**
   * MUST be derived from verified Firebase authentication
   * by the API layer.
   *
   * Never trust a UID supplied by the browser body.
   */
  customerUid: string;

  /**
   * ID of a server-persisted authoritative payment quote.
   */
  quoteId: string;

  /**
   * Client-generated idempotency key accepted only as an opaque
   * identifier. It NEVER carries financial authority.
   *
   * UUID-style values are recommended.
   */
  operationId: string;
};

export type ServerCheckoutOrder = {
  schemaVersion: number;

  orderId: string;

  checkoutOperationId: string;

  customerUid: string;

  quoteId: string;

  status: ServerCheckoutStatus;

  pricingCurrency: 'USD';

  subtotalUsd: number;

  taxUsd: number;

  platformFeeUsd: number;

  fixedFeeUsd: number;

  otherFeesUsd: number;

  totalChargesUsd: number;

  grandTotalUsd: number;

  chargePolicyVersion: number;

  paymentAsset: FinancialAsset;

  paymentAmount: number;

  paymentAmountAtomic: string;

  rateUsed: number;

  rateVersion: number;

  items: Array<{
    productId: string;
    quantity: number;
  }>;

  ledgerEntryId: string;

  createdAt: string;
};

export type ServerCheckoutResult = {
  success: true;

  idempotent: boolean;

  operationId: string;

  orderId: string;

  customerUid: string;

  quoteId: string;

  paymentAsset: FinancialAsset;

  paymentAmount: number;

  paymentAmountAtomic: string;

  ledgerEntryId: string;

  status: ServerCheckoutStatus;

  order: ServerCheckoutOrder;
};

type StoredCheckoutOperation = {
  schemaVersion?: unknown;

  operationId?: unknown;

  fingerprint?: unknown;

  customerUid?: unknown;

  quoteId?: unknown;

  orderId?: unknown;

  status?: unknown;

  paymentAsset?: unknown;

  paymentAmount?: unknown;

  paymentAmountAtomic?: unknown;

  ledgerEntryId?: unknown;

  order?: unknown;
};

function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function normalizeUid(
  value: string,
): string {
  if (
    typeof value !== 'string'
  ) {
    throw new Error(
      'Invalid checkout customer.',
    );
  }

  const normalized =
    value.trim();

  if (
    !normalized ||
    normalized.length >
      MAX_UID_LENGTH ||
    normalized.includes('/')
  ) {
    throw new Error(
      'Invalid checkout customer.',
    );
  }

  return normalized;
}

function normalizeQuoteId(
  value: string,
): string {
  if (
    typeof value !== 'string'
  ) {
    throw new Error(
      'Invalid payment quote ID.',
    );
  }

  const normalized =
    value.trim();

  if (
    !normalized ||
    normalized.length >
      MAX_QUOTE_ID_LENGTH ||
    normalized.includes('/')
  ) {
    throw new Error(
      'Invalid payment quote ID.',
    );
  }

  return normalized;
}

function normalizeOperationId(
  value: string,
): string {
  if (
    typeof value !== 'string'
  ) {
    throw new Error(
      'Invalid checkout operation ID.',
    );
  }

  const normalized =
    value.trim();

  if (
    !normalized ||
    normalized.length >
      MAX_OPERATION_ID_LENGTH ||
    !/^[A-Za-z0-9._:-]+$/.test(
      normalized,
    )
  ) {
    throw new Error(
      'Invalid checkout operation ID.',
    );
  }

  return normalized;
}

function hashValue(
  value: string,
): string {
  return createHash(
    'sha256',
  )
    .update(
      value,
      'utf8',
    )
    .digest(
      'hex',
    );
}

function createCheckoutFingerprint(
  input: {
    operationId: string;
    customerUid: string;
    quoteId: string;
  },
): string {
  return hashValue(
    [
      'phcl_checkout_v1',
      input.operationId,
      input.customerUid,
      input.quoteId,
    ].join('|'),
  );
}

function createOrderId(
  input: {
    operationId: string;
    customerUid: string;
    quoteId: string;
  },
): string {
  return hashValue(
    [
      'phcl_order_v1',
      input.operationId,
      input.customerUid,
      input.quoteId,
    ].join('|'),
  );
}

function getCheckoutOperationRef(
  operationId: string,
) {
  return adminDb
    .collection(
      CHECKOUT_OPERATION_COLLECTION,
    )
    .doc(
      operationId,
    );
}

function getOrderRef(
  orderId: string,
) {
  return adminDb
    .collection(
      ORDER_COLLECTION,
    )
    .doc(
      orderId,
    );
}

function normalizeFinancialAsset(
  value: unknown,
): FinancialAsset {
  switch (value) {
    case 'USD':
    case 'TZS':
    case 'NTZS':
    case 'PI':
      return value;

    default:
      throw new Error(
        'Stored payment quote contains an unsupported payment asset.',
      );
  }
}

function normalizePaymentAmount(
  value: unknown,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    throw new Error(
      'Stored payment quote contains an invalid payment amount.',
    );
  }

  return value;
}

function normalizeOrderItems(
  quote: StoredPaymentQuote,
): Array<{
  productId: string;
  quantity: number;
}> {
  const rawItems =
    quote.quote.pricing.items;

  if (
    !Array.isArray(rawItems) ||
    rawItems.length === 0
  ) {
    throw new Error(
      'Stored payment quote contains no purchase items.',
    );
  }

  const result:
    Array<{
      productId: string;
      quantity: number;
    }> = [];

  for (
    const item of rawItems
  ) {
    const productId =
      String(
        item.productId,
      ).trim();

    const quantity =
      item.quantity;

    if (
      !productId ||
      typeof quantity !==
        'number' ||
      !Number.isSafeInteger(
        quantity,
      ) ||
      quantity <= 0
    ) {
      throw new Error(
        'Stored payment quote contains invalid purchase items.',
      );
    }

    result.push({
      productId,
      quantity,
    });
  }

  return result;
}

function assertQuoteFinancialIntegrity(
  storedQuote: StoredPaymentQuote,
): {
  paymentAsset: FinancialAsset;
  paymentAmount: number;
  paymentAmountAtomic: string;
} {
  const {
    quote,
  } =
    storedQuote;

  if (
    quote.baseCurrency !==
      'USD' ||
    quote.pricing.currency !==
      'USD'
  ) {
    throw new Error(
      'Stored payment quote contains an invalid base currency.',
    );
  }

  if (
    !quote.charges ||
    quote.charges.currency !==
      'USD'
  ) {
    throw new Error(
      'Stored payment quote contains an invalid charge snapshot.',
    );
  }

  if (
    typeof quote.pricing.subtotalUsd !==
      'number' ||
    !Number.isFinite(
      quote.pricing.subtotalUsd,
    ) ||
    quote.pricing.subtotalUsd <=
      0
  ) {
    throw new Error(
      'Stored payment quote contains an invalid subtotal.',
    );
  }

  const numericChargeFields = [
    quote.charges.taxUsd,
    quote.charges.platformFeeUsd,
    quote.charges.fixedFeeUsd,
    quote.charges.otherFeesUsd,
    quote.charges.totalChargesUsd,
  ];

  for (
    const charge of numericChargeFields
  ) {
    if (
      typeof charge !==
        'number' ||
      !Number.isFinite(
        charge,
      ) ||
      charge < 0
    ) {
      throw new Error(
        'Stored payment quote contains invalid charges.',
      );
    }
  }

  if (
    typeof quote.charges.grandTotalUsd !==
      'number' ||
    !Number.isFinite(
      quote.charges.grandTotalUsd,
    ) ||
    quote.charges.grandTotalUsd <=
      0 ||
    quote.baseAmount !==
      quote.charges.grandTotalUsd
  ) {
    throw new Error(
      'Stored payment quote contains an invalid authoritative grand total.',
    );
  }

  if (
    !Number.isSafeInteger(
      quote.charges.policyVersion,
    ) ||
    quote.charges.policyVersion <
      1
  ) {
    throw new Error(
      'Stored payment quote contains an invalid charge policy version.',
    );
  }

  if (
    !Number.isSafeInteger(
      quote.rateVersion,
    ) ||
    quote.rateVersion <
      1
  ) {
    throw new Error(
      'Stored payment quote contains an invalid currency rate version.',
    );
  }

  const paymentAsset =
    normalizeFinancialAsset(
      quote.paymentAsset,
    );

  const paymentAmount =
    normalizePaymentAmount(
      quote.paymentAmount,
    );

  const paymentAmountAtomic =
    displayAmountToAtomic(
      paymentAmount,
      paymentAsset,
    );

  if (
    BigInt(
      paymentAmountAtomic,
    ) <= 0n
  ) {
    throw new Error(
      'Stored payment quote contains an invalid atomic payment amount.',
    );
  }

  return {
    paymentAsset,
    paymentAmount,
    paymentAmountAtomic,
  };
}

function parseStoredCheckoutOrder(
  value: unknown,
): ServerCheckoutOrder {
  if (
    !isPlainObject(
      value,
    )
  ) {
    throw new Error(
      'Stored checkout order is invalid.',
    );
  }

  const order =
    value as unknown as
      ServerCheckoutOrder;

  if (
    typeof order.orderId !==
      'string' ||
    typeof order.checkoutOperationId !==
      'string' ||
    typeof order.customerUid !==
      'string' ||
    typeof order.quoteId !==
      'string' ||
    order.status !==
      'COMPLETED' ||
    typeof order.ledgerEntryId !==
      'string'
  ) {
    throw new Error(
      'Stored checkout order is invalid.',
    );
  }

  return order;
}

function readCompletedCheckoutResult(
  operationData:
    StoredCheckoutOperation,
  expected: {
    operationId: string;
    fingerprint: string;
    customerUid: string;
    quoteId: string;
  },
): ServerCheckoutResult | null {
  if (
    operationData.schemaVersion !==
      CHECKOUT_SCHEMA_VERSION ||
    operationData.operationId !==
      expected.operationId ||
    operationData.fingerprint !==
      expected.fingerprint ||
    operationData.customerUid !==
      expected.customerUid ||
    operationData.quoteId !==
      expected.quoteId ||
    operationData.status !==
      'COMPLETED' ||
    typeof operationData.orderId !==
      'string' ||
    typeof operationData.ledgerEntryId !==
      'string' ||
    typeof operationData.paymentAmountAtomic !==
      'string'
  ) {
    return null;
  }

  const order =
    parseStoredCheckoutOrder(
      operationData.order,
    );

  const paymentAsset =
    normalizeFinancialAsset(
      operationData.paymentAsset,
    );

  const paymentAmount =
    normalizePaymentAmount(
      operationData.paymentAmount,
    );

  return {
    success:
      true,

    idempotent:
      true,

    operationId:
      expected.operationId,

    orderId:
      operationData.orderId,

    customerUid:
      expected.customerUid,

    quoteId:
      expected.quoteId,

    paymentAsset,

    paymentAmount,

    paymentAmountAtomic:
      operationData.paymentAmountAtomic,

    ledgerEntryId:
      operationData.ledgerEntryId,

    status:
      'COMPLETED',

    order,
  };
}

function createOrderSnapshot(
  input: {
    orderId: string;
    operationId: string;
    customerUid: string;
    storedQuote: StoredPaymentQuote;
    financialResult:
      FinancialMutationResult;
    paymentAsset:
      FinancialAsset;
    paymentAmount:
      number;
    paymentAmountAtomic:
      string;
    items:
      Array<{
        productId: string;
        quantity: number;
      }>;
    createdAt: string;
  },
): ServerCheckoutOrder {
  const {
    quote,
  } =
    input.storedQuote;

  return {
    schemaVersion:
      CHECKOUT_SCHEMA_VERSION,

    orderId:
      input.orderId,

    checkoutOperationId:
      input.operationId,

    customerUid:
      input.customerUid,

    quoteId:
      input.storedQuote.quoteId,

    status:
      'COMPLETED',

    pricingCurrency:
      'USD',

    subtotalUsd:
      quote.pricing.subtotalUsd,

    taxUsd:
      quote.charges.taxUsd,

    platformFeeUsd:
      quote.charges.platformFeeUsd,

    fixedFeeUsd:
      quote.charges.fixedFeeUsd,

    otherFeesUsd:
      quote.charges.otherFeesUsd,

    totalChargesUsd:
      quote.charges.totalChargesUsd,

    grandTotalUsd:
      quote.charges.grandTotalUsd,

    chargePolicyVersion:
      quote.charges.policyVersion,

    paymentAsset:
      input.paymentAsset,

    paymentAmount:
      input.paymentAmount,

    paymentAmountAtomic:
      input.paymentAmountAtomic,

    rateUsed:
      quote.rateUsed,

    rateVersion:
      quote.rateVersion,

    items:
      input.items.map(
        (item) => ({
          ...item,
        }),
      ),

    ledgerEntryId:
      input.financialResult
        .ledgerEntryId,

    createdAt:
      input.createdAt,
  };
}

/**
 * Execute an authoritative PHCL checkout settlement.
 *
 * IMPORTANT API CONTRACT
 *
 * The API route calling this function MUST:
 *
 * 1. authenticate Firebase user
 * 2. derive customerUid from verified token
 * 3. accept only quoteId + operationId from browser
 * 4. pass verified customerUid here
 *
 * Never accept customerUid, amount, asset, price, tax,
 * fee, balance or stock from the request body as authority.
 */
export async function runServerCheckoutTransaction(
  rawInput:
    ServerCheckoutInput,
): Promise<ServerCheckoutResult> {
  if (
    !isPlainObject(
      rawInput,
    )
  ) {
    throw new Error(
      'Invalid checkout input.',
    );
  }

  const customerUid =
    normalizeUid(
      rawInput.customerUid,
    );

  const quoteId =
    normalizeQuoteId(
      rawInput.quoteId,
    );

  const operationId =
    normalizeOperationId(
      rawInput.operationId,
    );

  const fingerprint =
    createCheckoutFingerprint({
      operationId,
      customerUid,
      quoteId,
    });

  const orderId =
    createOrderId({
      operationId,
      customerUid,
      quoteId,
    });

  const checkoutOperationRef =
    getCheckoutOperationRef(
      operationId,
    );

  const orderRef =
    getOrderRef(
      orderId,
    );

  return adminDb.runTransaction(
    async (
      transaction:
        Transaction,
    ) => {
      /**
       * ========================================================
       * READ / PREPARE PHASE
       * ========================================================
       *
       * NO Firestore writes are allowed before this phase ends.
       */

      const preparedQuote =
        await preparePaymentQuoteConsumptionInTransaction(
          transaction,
          {
            quoteId,
            customerUid,
            operationId,
          },
        );

      const checkoutOperationSnapshot =
        await transaction.get(
          checkoutOperationRef,
        );

      /**
       * Fast idempotent retry path.
       *
       * If the checkout operation already completed with exactly
       * the same customer + quote + operation fingerprint, return
       * its authoritative stored result without touching stock,
       * ledger or quote again.
       */
      if (
        checkoutOperationSnapshot.exists
      ) {
        const completed =
          readCompletedCheckoutResult(
            checkoutOperationSnapshot.data() as
              StoredCheckoutOperation,
            {
              operationId,
              fingerprint,
              customerUid,
              quoteId,
            },
          );

        if (
          !completed
        ) {
          throw new Error(
            'Checkout operation ID has already been used for a different checkout.',
          );
        }

        if (
          !preparedQuote.idempotent
        ) {
          throw new Error(
            'Checkout state is inconsistent.',
          );
        }

        return completed;
      }

      /**
       * If the quote says this exact operation consumed it,
       * a matching checkout operation MUST exist.
       *
       * Otherwise we would have a partial/inconsistent state.
       */
      if (
        preparedQuote.idempotent
      ) {
        throw new Error(
          'Checkout state is incomplete or inconsistent.',
        );
      }

      const storedQuote =
        preparedQuote.storedQuote;

      const {
        paymentAsset,
        paymentAmount,
        paymentAmountAtomic,
      } =
        assertQuoteFinancialIntegrity(
          storedQuote,
        );

      const items =
        normalizeOrderItems(
          storedQuote,
        );

      const preparedStock =
        await prepareProductStockPurchaseInTransaction(
          transaction,
          items,
          `checkout:${operationId}`,
        );

      if (
        'reason' in
          preparedStock
      ) {
        throw new Error(
          preparedStock.reason,
        );
      }

      const preparedFinancial =
        await prepareFinancialMutationInTransaction(
          transaction,
          {
            operationId,

            uid:
              customerUid,

            operationType:
              'PURCHASE',

            asset:
              paymentAsset,

            direction:
              'DEBIT',

            amountAtomic:
              paymentAmountAtomic,

            description:
              'PHCL Super marketplace purchase',

            metadata: {
              checkoutOperationId:
                operationId,

              orderId,

              quoteId,

              paymentAsset,

              paymentAmount,

              rateVersion:
                storedQuote.quote
                  .rateVersion,

              chargePolicyVersion:
                storedQuote.quote
                  .charges
                  .policyVersion,
            },
          },
        );

      /**
       * Defensive collision check.
       *
       * orderId is deterministic from operation + customer + quote.
       * A new checkout operation must never overwrite an existing
       * order document.
       *
       * This is the FINAL READ in the transaction.
       */
      const orderSnapshot =
        await transaction.get(
          orderRef,
        );

      if (
        orderSnapshot.exists
      ) {
        throw new Error(
          'Checkout order already exists without a matching checkout operation.',
        );
      }

      /**
       * ========================================================
       * WRITE / COMMIT PHASE
       * ========================================================
       *
       * From this point onward there must be NO transaction reads.
       */

      const stockResult =
        commitPreparedProductStockPurchase(
          transaction,
          preparedStock,
        );

      if (
        !stockResult.success
      ) {
        throw new Error(
          'Unable to commit product stock purchase.',
        );
      }

      const financialResult =
        commitPreparedFinancialMutation(
          transaction,
          preparedFinancial,
        );

      const createdAt =
        new Date().toISOString();

      const order =
        createOrderSnapshot({
          orderId,
          operationId,
          customerUid,
          storedQuote,
          financialResult,
          paymentAsset,
          paymentAmount,
          paymentAmountAtomic,
          items,
          createdAt,
        });

      transaction.create(
        orderRef,
        {
          ...order,

          serverCreatedAt:
            FieldValue.serverTimestamp(),

          serverUpdatedAt:
            FieldValue.serverTimestamp(),
        },
      );

      transaction.create(
        checkoutOperationRef,
        {
          schemaVersion:
            CHECKOUT_SCHEMA_VERSION,

          operationId,

          fingerprint,

          customerUid,

          quoteId,

          orderId,

          status:
            'COMPLETED' satisfies
              ServerCheckoutStatus,

          paymentAsset,

          paymentAmount,

          paymentAmountAtomic,

          ledgerEntryId:
            financialResult
              .ledgerEntryId,

          order,

          createdAt,

          serverCreatedAt:
            FieldValue.serverTimestamp(),

          serverUpdatedAt:
            FieldValue.serverTimestamp(),
        },
      );

      commitPreparedPaymentQuoteConsumption(
        transaction,
        preparedQuote,
      );

      return {
        success:
          true,

        idempotent:
          false,

        operationId,

        orderId,

        customerUid,

        quoteId,

        paymentAsset,

        paymentAmount,

        paymentAmountAtomic,

        ledgerEntryId:
          financialResult
            .ledgerEntryId,

        status:
          'COMPLETED',

        order,
      };
    },
  );
}
