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
  getServerPaymentQuoteStatus,
  type ServerPaymentQuote,
} from '@/lib/server-payment-quote';

/**
 * ============================================================
 * PHCL SUPER — PAYMENT QUOTE STORE
 * ============================================================
 *
 * SECURITY PURPOSE
 *
 * A payment quote returned to the browser is NOT itself
 * financial authority.
 *
 * The authoritative quote is stored server-side in:
 *
 *   payment_quotes/{quoteId}
 *
 * and is bound to:
 *
 *   - authenticated customer UID
 *   - canonical marketplace pricing snapshot
 *   - payment asset
 *   - payment amount
 *   - rate version
 *   - rate snapshot
 *   - expiration
 *
 * Checkout later sends only quoteId + non-financial checkout
 * details. The server reads the authoritative quote from
 * Firestore.
 */

const QUOTE_COLLECTION =
  'payment_quotes';

const MAX_UID_LENGTH =
  256;

const MAX_QUOTE_ID_LENGTH =
  160;

export type StoredPaymentQuoteStatus =
  | 'ACTIVE'
  | 'CONSUMED';

export interface StoredPaymentQuote {
  quoteId: string;

  customerUid: string;

  quote: ServerPaymentQuote;

  status: StoredPaymentQuoteStatus;

  createdAt: string;

  expiresAt: string;

  consumedAt: string | null;

  consumedByOperationId:
    string | null;
}

type StoredPaymentQuoteDocument = {
  quoteId?: unknown;

  customerUid?: unknown;

  quote?: unknown;

  status?: unknown;

  createdAt?: unknown;

  expiresAt?: unknown;

  consumedAt?: unknown;

  consumedByOperationId?: unknown;
};

export type PreparedPaymentQuoteConsumption = {
  readonly quoteRef:
    DocumentReference;

  readonly storedQuote:
    StoredPaymentQuote;

  readonly operationId:
    string;

  readonly idempotent:
    boolean;
};

function isPlainObject(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      'object' &&
    value !== null &&
    !Array.isArray(
      value,
    )
  );
}

function normalizeUid(
  value: string,
): string {
  if (
    typeof value !==
    'string'
  ) {
    throw new Error(
      'Invalid quote owner.',
    );
  }

  const normalized =
    value.trim();

  if (
    !normalized ||
    normalized.length >
      MAX_UID_LENGTH ||
    normalized.includes(
      '/',
    )
  ) {
    throw new Error(
      'Invalid quote owner.',
    );
  }

  return normalized;
}

function normalizeQuoteId(
  value: string,
): string {
  if (
    typeof value !==
    'string'
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
    normalized.includes(
      '/',
    )
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
    typeof value !==
    'string'
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
      160 ||
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

function getQuoteRef(
  quoteId: string,
) {
  return adminDb
    .collection(
      QUOTE_COLLECTION,
    )
    .doc(
      quoteId,
    );
}

function parseStoredQuote(
  value: unknown,
): StoredPaymentQuote {
  if (
    !isPlainObject(
      value,
    )
  ) {
    throw new Error(
      'Stored payment quote is invalid.',
    );
  }

  const document =
    value as
      StoredPaymentQuoteDocument;

  if (
    typeof document.quoteId !==
      'string' ||
    typeof document.customerUid !==
      'string' ||
    !isPlainObject(
      document.quote,
    ) ||
    (
      document.status !==
        'ACTIVE' &&
      document.status !==
        'CONSUMED'
    ) ||
    typeof document.createdAt !==
      'string' ||
    typeof document.expiresAt !==
      'string'
  ) {
    throw new Error(
      'Stored payment quote is invalid.',
    );
  }

  const quote =
    document.quote as unknown as
      ServerPaymentQuote;

  if (
    typeof quote.quoteId !==
      'string' ||
    quote.quoteId !==
      document.quoteId ||
    typeof quote.expiresAt !==
      'string' ||
    quote.expiresAt !==
      document.expiresAt
  ) {
    throw new Error(
      'Stored payment quote is invalid.',
    );
  }

  return {
    quoteId:
      document.quoteId,

    customerUid:
      document.customerUid,

    quote,

    status:
      document.status,

    createdAt:
      document.createdAt,

    expiresAt:
      document.expiresAt,

    consumedAt:
      typeof document.consumedAt ===
        'string'
        ? document.consumedAt
        : null,

    consumedByOperationId:
      typeof document
        .consumedByOperationId ===
        'string'
        ? document
            .consumedByOperationId
        : null,
  };
}

/**
 * Persist a newly-created authoritative quote.
 *
 * The quote MUST already have been produced by
 * createServerPaymentQuote().
 *
 * Browser objects must never be supplied directly here.
 */
export async function saveServerPaymentQuote(
  customerUid: string,
  quote: ServerPaymentQuote,
): Promise<StoredPaymentQuote> {
  const normalizedUid =
    normalizeUid(
      customerUid,
    );

  const quoteId =
    normalizeQuoteId(
      quote.quoteId,
    );

  if (
    quote.quoteId !==
      quoteId
  ) {
    throw new Error(
      'Invalid payment quote.',
    );
  }

  if (
    getServerPaymentQuoteStatus(
      quote,
    ) !==
      'ACTIVE'
  ) {
    throw new Error(
      'Cannot persist an expired payment quote.',
    );
  }

  if (
    !Number.isFinite(
      Date.parse(
        quote.createdAt,
      ),
    ) ||
    !Number.isFinite(
      Date.parse(
        quote.expiresAt,
      ),
    )
  ) {
    throw new Error(
      'Invalid payment quote timestamps.',
    );
  }

  const stored:
    StoredPaymentQuote =
  {
    quoteId,

    customerUid:
      normalizedUid,

    quote,

    status:
      'ACTIVE',

    createdAt:
      quote.createdAt,

    expiresAt:
      quote.expiresAt,

    consumedAt:
      null,

    consumedByOperationId:
      null,
  };

  const quoteRef =
    getQuoteRef(
      quoteId,
    );

  await quoteRef.create({
    ...stored,

    serverCreatedAt:
      FieldValue.serverTimestamp(),

    serverUpdatedAt:
      FieldValue.serverTimestamp(),
  });

  return stored;
}

/**
 * Read a quote outside a transaction.
 *
 * Useful for server-side display/diagnostic workflows.
 * Checkout settlement should use the transactional
 * preparation helper below.
 */
export async function getStoredServerPaymentQuote(
  quoteId: string,
): Promise<StoredPaymentQuote | null> {
  const normalizedQuoteId =
    normalizeQuoteId(
      quoteId,
    );

  const snapshot =
    await getQuoteRef(
      normalizedQuoteId,
    ).get();

  if (
    !snapshot.exists
  ) {
    return null;
  }

  return parseStoredQuote(
    snapshot.data(),
  );
}

/**
 * PREPARE quote consumption inside a larger Firestore
 * transaction.
 *
 * THIS FUNCTION PERFORMS READS ONLY.
 *
 * Secure checkout can therefore:
 *
 *   1. read payment quote
 *   2. read financial account
 *   3. read stock
 *   4. read order/idempotency state
 *   5. only then enter the write phase
 *
 * This preserves Firestore transaction requirements.
 */
export async function preparePaymentQuoteConsumptionInTransaction(
  transaction:
    Transaction,

  input: {
    quoteId: string;

    customerUid: string;

    operationId: string;

    now?: Date;
  },
): Promise<PreparedPaymentQuoteConsumption> {
  const quoteId =
    normalizeQuoteId(
      input.quoteId,
    );

  const customerUid =
    normalizeUid(
      input.customerUid,
    );

  const operationId =
    normalizeOperationId(
      input.operationId,
    );

  const now =
    input.now ??
    new Date();

  const quoteRef =
    getQuoteRef(
      quoteId,
    );

  const snapshot =
    await transaction.get(
      quoteRef,
    );

  if (
    !snapshot.exists
  ) {
    throw new Error(
      'Payment quote not found.',
    );
  }

  const storedQuote =
    parseStoredQuote(
      snapshot.data(),
    );

  /**
   * QUOTE OWNERSHIP
   *
   * A customer can never settle another user's quote.
   */
  if (
    storedQuote.customerUid !==
      customerUid
  ) {
    throw new Error(
      'Payment quote does not belong to this customer.',
    );
  }

  /**
   * If the quote was already consumed by exactly the same
   * checkout operation, treat the attempt as idempotent.
   *
   * This is important for:
   *
   * - browser retry
   * - network timeout
   * - mobile reconnect
   * - repeated callback handling
   */
  if (
    storedQuote.status ===
      'CONSUMED'
  ) {
    if (
      storedQuote
        .consumedByOperationId ===
        operationId
    ) {
      return {
        quoteRef,

        storedQuote,

        operationId,

        idempotent:
          true,
      };
    }

    throw new Error(
      'Payment quote has already been consumed.',
    );
  }

  if (
    storedQuote.status !==
      'ACTIVE'
  ) {
    throw new Error(
      'Payment quote is not active.',
    );
  }

  /**
   * Expiration is re-evaluated server-side.
   *
   * Browser-provided status is irrelevant.
   */
  if (
    getServerPaymentQuoteStatus(
      storedQuote.quote,
      now,
    ) !==
      'ACTIVE'
  ) {
    throw new Error(
      'Payment quote has expired.',
    );
  }

  return {
    quoteRef,

    storedQuote,

    operationId,

    idempotent:
      false,
  };
}

/**
 * WRITE PHASE ONLY.
 *
 * Must be called after all required transaction reads have
 * completed.
 */
export function commitPreparedPaymentQuoteConsumption(
  transaction:
    Transaction,

  prepared:
    PreparedPaymentQuoteConsumption,
): StoredPaymentQuote {
  if (
    prepared.idempotent
  ) {
    return prepared.storedQuote;
  }

  const consumedAt =
    new Date().toISOString();

  const consumedQuote:
    StoredPaymentQuote =
  {
    ...prepared.storedQuote,

    status:
      'CONSUMED',

    consumedAt,

    consumedByOperationId:
      prepared.operationId,
  };

  transaction.update(
    prepared.quoteRef,
    {
      status:
        'CONSUMED',

      consumedAt,

      consumedByOperationId:
        prepared.operationId,

      serverUpdatedAt:
        FieldValue.serverTimestamp(),
    },
  );

  return consumedQuote;
}