import 'server-only';

import {
  createHash,
} from 'node:crypto';


import {
  FieldValue,
  type DocumentReference,
  type Transaction,
} from 'firebase-admin/firestore';

import {
  adminDb,
} from '@/lib/firebase-admin';

/**
 * ============================================================
 * PHCL SUPER — SERVER FINANCIAL LEDGER
 * ============================================================
 *
 * SECURITY PRINCIPLES
 *
 * 1. Browser/client NEVER mutates balances directly.
 * 2. Financial balances are represented in atomic integer units.
 * 3. Atomic balances are stored as decimal strings in Firestore.
 * 4. Firestore transactions provide atomic balance mutations.
 * 5. Every mutation creates an immutable ledger entry.
 * 6. Every mutation requires an idempotency operation ID.
 * 7. Reusing an operation ID with different data is rejected.
 * 8. This module is server-only.
 *
 * IMPORTANT:
 *
 * Existing:
 *
 *   users/{uid}.balances
 *
 * is currently a compatibility/read-model field.
 *
 * It is NOT the financial source of truth for the new PHCL ledger.
 *
 * The new authoritative balances live in:
 *
 *   financial_accounts/{uid}
 *
 * Ledger entries live in:
 *
 *   financial_ledger/{ledgerEntryId}
 *
 * Idempotency records live in:
 *
 *   financial_operations/{operationId}
 */

export const FINANCIAL_ASSETS = [
  'USD',
  'TZS',
  'NTZS',
  'PI',
] as const;

export type FinancialAsset =
  (typeof FINANCIAL_ASSETS)[number];

export type FinancialOperationType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'TRANSFER'
  | 'PURCHASE'
  | 'REFUND'
  | 'ADJUSTMENT'
  | 'SETTLEMENT';

export type FinancialLedgerDirection =
  | 'CREDIT'
  | 'DEBIT';

export type FinancialOperationStatus =
  | 'COMPLETED';

type AtomicBalanceKey =
  | 'usd'
  | 'tzs'
  | 'ntzs'
  | 'pi';

export type FinancialAtomicBalances = {
  usd: string;
  tzs: string;
  ntzs: string;
  pi: string;
};

export type ServerFinancialAccount = {
  uid: string;
  balancesAtomic:
    FinancialAtomicBalances;
  updatedAt?: unknown;
};

export type FinancialLedgerMetadata =
  Record<
    string,
    | string
    | number
    | boolean
    | null
  >;

type StoredFinancialAccount = {
  uid?: unknown;
  balancesAtomic?: unknown;
  updatedAt?: unknown;
};

type StoredFinancialOperation = {
  operationId?: unknown;
  fingerprint?: unknown;
  uid?: unknown;
  operationType?: unknown;
  asset?: unknown;
  amountAtomic?: unknown;
  status?: unknown;
  balanceBeforeAtomic?: unknown;
  balanceAfterAtomic?: unknown;
  createdAt?: unknown;
};

export type FinancialMutationInput = {
  operationId: string;

  uid: string;

  operationType:
    FinancialOperationType;

  asset:
    FinancialAsset;

  direction:
    FinancialLedgerDirection;

  /**
   * Positive atomic amount represented
   * as a decimal string.
   *
   * Examples:
   *
   * USD 10.25:
   *   "1025"
   *
   * TZS 5,000:
   *   "5000"
   *
   * PI 1.5:
   *   "150000000"
   */
  amountAtomic: string;

  /**
   * Optional internal server-controlled
   * description.
   */
  description?: string;

  /**
   * Server-controlled metadata only.
   *
   * NEVER forward arbitrary browser objects
   * directly into this property.
   */
  metadata?: FinancialLedgerMetadata;
};

export type FinancialMutationResult = {
  success: true;

  idempotent: boolean;

  operationId: string;

  uid: string;

  operationType:
    FinancialOperationType;

  asset:
    FinancialAsset;

  direction:
    FinancialLedgerDirection;

  amountAtomic: string;

  balanceBeforeAtomic: string;

  balanceAfterAtomic: string;

  ledgerEntryId: string;
};

export type FinancialTransferInput = {
  operationId: string;

  senderUid: string;

  recipientUid: string;

  asset:
    FinancialAsset;

  amountAtomic: string;

  description?: string;

  metadata?: FinancialLedgerMetadata;
};

export type FinancialTransferResult = {
  success: true;

  idempotent: boolean;

  operationId: string;

  asset:
    FinancialAsset;

  amountAtomic: string;

  senderUid: string;

  recipientUid: string;

  senderBalanceBeforeAtomic:
    string;

  senderBalanceAfterAtomic:
    string;

  recipientBalanceBeforeAtomic:
    string;

  recipientBalanceAfterAtomic:
    string;

  senderLedgerEntryId:
    string;

  recipientLedgerEntryId:
    string;
};

/**
 * Prepared mutation plan.
 *
 * This split between PREPARE and COMMIT is
 * intentional.
 *
 * Secure checkout later needs:
 *
 * - financial account reads
 * - stock reads
 * - order reads
 * - idempotency reads
 *
 * BEFORE performing any Firestore writes.
 *
 * Firestore transactions require all reads
 * to happen before writes.
 */
export type PreparedFinancialMutation = {
  readonly kind:
    'financial_mutation';

  readonly idempotent:
    boolean;

  readonly result:
    FinancialMutationResult;

  readonly accountRef:
    DocumentReference;

  readonly operationRef:
    DocumentReference;

  readonly ledgerRef:
    DocumentReference;

  readonly updatedBalances:
    FinancialAtomicBalances;

  readonly fingerprint:
    string;

  readonly description:
    string | null;

  readonly metadata:
    FinancialLedgerMetadata;
};

export type PreparedFinancialTransfer = {
  readonly kind:
    'financial_transfer';

  readonly idempotent:
    boolean;

  readonly result:
    FinancialTransferResult;

  readonly senderAccountRef:
    DocumentReference;

  readonly recipientAccountRef:
    DocumentReference;

  readonly operationRef:
    DocumentReference;

  readonly senderLedgerRef:
    DocumentReference;

  readonly recipientLedgerRef:
    DocumentReference;

  readonly senderUpdatedBalances:
    FinancialAtomicBalances;

  readonly recipientUpdatedBalances:
    FinancialAtomicBalances;

  readonly fingerprint:
    string;

  readonly description:
    string | null;

  readonly metadata:
    FinancialLedgerMetadata;
};

const FINANCIAL_ACCOUNT_COLLECTION =
  'financial_accounts';

const FINANCIAL_LEDGER_COLLECTION =
  'financial_ledger';

const FINANCIAL_OPERATION_COLLECTION =
  'financial_operations';

const MAX_OPERATION_ID_LENGTH =
  160;

const MAX_UID_LENGTH =
  256;

const MAX_DESCRIPTION_LENGTH =
  500;

const MAX_METADATA_FIELDS =
  30;

const MAX_METADATA_KEY_LENGTH =
  80;

const MAX_METADATA_STRING_LENGTH =
  500;

/**
 * Financial precision currently used by
 * PHCL Super.
 *
 * USD:
 *   2 decimals (cents)
 *
 * TZS:
 *   integer shilling
 *
 * NTZS:
 *   integer digital shilling under current
 *   PHCL platform parity model
 *
 * PI:
 *   8 decimals
 */
const ASSET_DECIMALS:
  Record<FinancialAsset, number> =
{
  USD: 2,
  TZS: 0,
  NTZS: 0,
  PI: 8,
};

const ASSET_BALANCE_KEYS:
  Record<
    FinancialAsset,
    AtomicBalanceKey
  > =
{
  USD: 'usd',
  TZS: 'tzs',
  NTZS: 'ntzs',
  PI: 'pi',
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
      'Invalid financial account.',
    );
  }

  const normalized =
    value.trim();

  if (
    !normalized ||
    normalized.length >
      MAX_UID_LENGTH
  ) {
    throw new Error(
      'Invalid financial account.',
    );
  }

  if (
    normalized.includes(
      '/',
    )
  ) {
    throw new Error(
      'Invalid financial account.',
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
      'Invalid operation ID.',
    );
  }

  const normalized =
    value.trim();

  if (
    !normalized ||
    normalized.length >
      MAX_OPERATION_ID_LENGTH
  ) {
    throw new Error(
      'Invalid operation ID.',
    );
  }

  /**
   * Keep Firestore document IDs predictable
   * and safe.
   *
   * API layer can generate UUID-style
   * operation IDs.
   */
  if (
    !/^[A-Za-z0-9._:-]+$/.test(
      normalized,
    )
  ) {
    throw new Error(
      'Invalid operation ID.',
    );
  }

  return normalized;
}

function normalizeAsset(
  value: FinancialAsset,
): FinancialAsset {
  if (
    !FINANCIAL_ASSETS.includes(
      value,
    )
  ) {
    throw new Error(
      'Unsupported financial asset.',
    );
  }

  return value;
}

function normalizeOperationType(
  value:
    FinancialOperationType,
): FinancialOperationType {
  switch (value) {
    case 'DEPOSIT':
    case 'WITHDRAWAL':
    case 'TRANSFER':
    case 'PURCHASE':
    case 'REFUND':
    case 'ADJUSTMENT':
    case 'SETTLEMENT':
      return value;

    default:
      throw new Error(
        'Unsupported financial operation.',
      );
  }
}

function normalizeDirection(
  value:
    FinancialLedgerDirection,
): FinancialLedgerDirection {
  if (
    value !== 'CREDIT' &&
    value !== 'DEBIT'
  ) {
    throw new Error(
      'Invalid ledger direction.',
    );
  }

  return value;
}

function normalizeDescription(
  value: string | undefined,
): string | null {
  if (
    value === undefined
  ) {
    return null;
  }

  if (
    typeof value !==
    'string'
  ) {
    throw new Error(
      'Invalid financial description.',
    );
  }

  const normalized =
    value
      .trim()
      .slice(
        0,
        MAX_DESCRIPTION_LENGTH,
      );

  return normalized ||
    null;
}

function normalizeMetadata(
  value:
    FinancialLedgerMetadata |
    undefined,
): FinancialLedgerMetadata {
  if (
    value === undefined
  ) {
    return {};
  }

  if (
    !isPlainObject(value)
  ) {
    throw new Error(
      'Invalid financial metadata.',
    );
  }

  const result:
    FinancialLedgerMetadata =
    {};

  const entries =
    Object.entries(
      value,
    ).slice(
      0,
      MAX_METADATA_FIELDS,
    );

  for (
    const [
      rawKey,
      rawValue,
    ] of entries
  ) {
    const key =
      rawKey
        .trim()
        .slice(
          0,
          MAX_METADATA_KEY_LENGTH,
        );

    if (
      !key ||
      !/^[A-Za-z0-9_.:-]+$/.test(
        key,
      )
    ) {
      continue;
    }

    if (
      rawValue === null ||
      typeof rawValue ===
        'boolean'
    ) {
      result[key] =
        rawValue;

      continue;
    }

    if (
      typeof rawValue ===
        'number'
    ) {
      if (
        Number.isFinite(
          rawValue,
        )
      ) {
        result[key] =
          rawValue;
      }

      continue;
    }

    if (
      typeof rawValue ===
        'string'
    ) {
      result[key] =
        rawValue
          .trim()
          .slice(
            0,
            MAX_METADATA_STRING_LENGTH,
          );
    }
  }

  return result;
}

function normalizeAtomicString(
  value: unknown,
  options?: {
    allowZero?: boolean;
  },
): string {
  if (
    typeof value !==
    'string'
  ) {
    throw new Error(
      'Invalid atomic amount.',
    );
  }

  const normalized =
    value.trim();

  if (
    !/^\d+$/.test(
      normalized,
    )
  ) {
    throw new Error(
      'Invalid atomic amount.',
    );
  }

  const canonical =
    normalized.replace(
      /^0+(?=\d)/,
      '',
    );

  const amount =
    BigInt(
      canonical,
    );

  if (
    amount < 0n
  ) {
    throw new Error(
      'Invalid atomic amount.',
    );
  }

  if (
    !options?.allowZero &&
    amount === 0n
  ) {
    throw new Error(
      'Financial amount must be greater than zero.',
    );
  }

  return amount.toString();
}

function readStoredAtomicBalance(
  value: unknown,
): string {
  if (
    typeof value !==
      'string' ||
    !/^\d+$/.test(
      value,
    )
  ) {
    return '0';
  }

  try {
    return BigInt(
      value,
    ).toString();
  } catch {
    return '0';
  }
}

function createZeroBalances():
FinancialAtomicBalances {
  return {
    usd: '0',
    tzs: '0',
    ntzs: '0',
    pi: '0',
  };
}

function normalizeStoredBalances(
  value: unknown,
): FinancialAtomicBalances {
  if (
    !isPlainObject(value)
  ) {
    return createZeroBalances();
  }

  return {
    usd:
      readStoredAtomicBalance(
        value.usd,
      ),

    tzs:
      readStoredAtomicBalance(
        value.tzs,
      ),

    ntzs:
      readStoredAtomicBalance(
        value.ntzs,
      ),

    pi:
      readStoredAtomicBalance(
        value.pi,
      ),
  };
}

function cloneBalances(
  balances:
    FinancialAtomicBalances,
): FinancialAtomicBalances {
  return {
    usd:
      balances.usd,

    tzs:
      balances.tzs,

    ntzs:
      balances.ntzs,

    pi:
      balances.pi,
  };
}

function getBalanceAtomic(
  balances:
    FinancialAtomicBalances,
  asset:
    FinancialAsset,
): string {
  return balances[
    ASSET_BALANCE_KEYS[
      asset
    ]
  ];
}

function setBalanceAtomic(
  balances:
    FinancialAtomicBalances,
  asset:
    FinancialAsset,
  amountAtomic:
    string,
): FinancialAtomicBalances {
  const updated =
    cloneBalances(
      balances,
    );

  updated[
    ASSET_BALANCE_KEYS[
      asset
    ]
  ] =
    normalizeAtomicString(
      amountAtomic,
      {
        allowZero: true,
      },
    );

  return updated;
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

function createMutationFingerprint(
  input: {
    operationId: string;
    uid: string;
    operationType:
      FinancialOperationType;
    asset:
      FinancialAsset;
    direction:
      FinancialLedgerDirection;
    amountAtomic: string;
  },
): string {
  return hashValue(
    [
      'financial_mutation_v1',
      input.operationId,
      input.uid,
      input.operationType,
      input.asset,
      input.direction,
      input.amountAtomic,
    ].join(
      '|',
    ),
  );
}

function createTransferFingerprint(
  input: {
    operationId: string;
    senderUid: string;
    recipientUid: string;
    asset:
      FinancialAsset;
    amountAtomic: string;
  },
): string {
  return hashValue(
    [
      'financial_transfer_v1',
      input.operationId,
      input.senderUid,
      input.recipientUid,
      input.asset,
      input.amountAtomic,
    ].join(
      '|',
    ),
  );
}

function createLedgerDocumentId(
  parts: string[],
): string {
  return hashValue(
    parts.join(
      '|',
    ),
  );
}

function getFinancialAccountRef(
  uid: string,
) {
  return adminDb
    .collection(
      FINANCIAL_ACCOUNT_COLLECTION,
    )
    .doc(
      uid,
    );
}

function getFinancialOperationRef(
  operationId: string,
) {
  return adminDb
    .collection(
      FINANCIAL_OPERATION_COLLECTION,
    )
    .doc(
      operationId,
    );
}

function getFinancialLedgerRef(
  ledgerEntryId: string,
) {
  return adminDb
    .collection(
      FINANCIAL_LEDGER_COLLECTION,
    )
    .doc(
      ledgerEntryId,
    );
}

function readFinancialAccountData(
  uid: string,
  data:
    StoredFinancialAccount |
    undefined,
): ServerFinancialAccount {
  return {
    uid,

    balancesAtomic:
      normalizeStoredBalances(
        data?.balancesAtomic,
      ),

    updatedAt:
      data?.updatedAt,
  };
}

function readCompletedMutationResult(
  operationData:
    StoredFinancialOperation,
  expected: {
    operationId: string;
    fingerprint: string;
    uid: string;
    operationType:
      FinancialOperationType;
    asset:
      FinancialAsset;
    amountAtomic: string;
    direction:
      FinancialLedgerDirection;
    ledgerEntryId: string;
  },
): FinancialMutationResult | null {
  if (
    operationData.status !==
      'COMPLETED' ||
    operationData.fingerprint !==
      expected.fingerprint ||
    operationData.operationId !==
      expected.operationId ||
    operationData.uid !==
      expected.uid ||
    operationData.operationType !==
      expected.operationType ||
    operationData.asset !==
      expected.asset ||
    operationData.amountAtomic !==
      expected.amountAtomic
  ) {
    return null;
  }

  const before =
    typeof operationData.balanceBeforeAtomic ===
      'string'
      ? operationData.balanceBeforeAtomic
      : null;

  const after =
    typeof operationData.balanceAfterAtomic ===
      'string'
      ? operationData.balanceAfterAtomic
      : null;

  if (
    !before ||
    !after
  ) {
    return null;
  }

  return {
    success: true,

    idempotent: true,

    operationId:
      expected.operationId,

    uid:
      expected.uid,

    operationType:
      expected.operationType,

    asset:
      expected.asset,

    direction:
      expected.direction,

    amountAtomic:
      expected.amountAtomic,

    balanceBeforeAtomic:
      before,

    balanceAfterAtomic:
      after,

    ledgerEntryId:
      expected.ledgerEntryId,
  };
}

/**
 * Convert a human/display amount into an
 * exact atomic integer string.
 *
 * Examples:
 *
 * displayAmountToAtomic(
 *   '10.25',
 *   'USD',
 * )
 * => "1025"
 *
 * displayAmountToAtomic(
 *   '5000',
 *   'TZS',
 * )
 * => "5000"
 *
 * displayAmountToAtomic(
 *   '1.5',
 *   'PI',
 * )
 * => "150000000"
 *
 * NOTE:
 *
 * Financial server APIs should preferably
 * pass decimal strings instead of JS
 * floating-point numbers.
 */
export function displayAmountToAtomic(
  rawValue:
    string |
    number,
  asset:
    FinancialAsset,
): string {
  const normalizedAsset =
    normalizeAsset(
      asset,
    );

  const decimals =
    ASSET_DECIMALS[
      normalizedAsset
    ];

  let value: string;

  if (
    typeof rawValue ===
      'number'
  ) {
    if (
      !Number.isFinite(
        rawValue,
      ) ||
      rawValue < 0
    ) {
      throw new Error(
        'Invalid financial amount.',
      );
    }

    value =
      rawValue.toFixed(
        decimals,
      );
  } else {
    value =
      rawValue.trim();
  }

  if (
    !/^\d+(?:\.\d+)?$/.test(
      value,
    )
  ) {
    throw new Error(
      'Invalid financial amount.',
    );
  }

  const [
    wholePart,
    fractionPart = '',
  ] =
    value.split(
      '.',
    );

  if (
    fractionPart.length >
      decimals
  ) {
    throw new Error(
      `Too many decimal places for ${normalizedAsset}.`,
    );
  }

  const paddedFraction =
    fractionPart.padEnd(
      decimals,
      '0',
    );

  const atomicText =
    `${
      wholePart
    }${
      paddedFraction
    }`
      .replace(
        /^0+(?=\d)/,
        '',
      );

  return normalizeAtomicString(
    atomicText || '0',
    {
      allowZero: true,
    },
  );
}

/**
 * Convert atomic units into a human-readable
 * decimal string without using floating point.
 */
export function atomicAmountToDisplay(
  rawAtomic:
    string,
  asset:
    FinancialAsset,
): string {
  const atomic =
    normalizeAtomicString(
      rawAtomic,
      {
        allowZero: true,
      },
    );

  const decimals =
    ASSET_DECIMALS[
      normalizeAsset(
        asset,
      )
    ];

  if (
    decimals === 0
  ) {
    return atomic;
  }

  const padded =
    atomic.padStart(
      decimals + 1,
      '0',
    );

  const whole =
    padded.slice(
      0,
      -decimals,
    );

  const fraction =
    padded.slice(
      -decimals,
    );

  return `${whole}.${fraction}`;
}

/**
 * Read authoritative server-side financial
 * account state.
 */
export async function getServerFinancialAccount(
  uid: string,
): Promise<ServerFinancialAccount> {
  const normalizedUid =
    normalizeUid(
      uid,
    );

  const snapshot =
    await getFinancialAccountRef(
      normalizedUid,
    ).get();

  return readFinancialAccountData(
    normalizedUid,
    snapshot.exists
      ? (
          snapshot.data() as
            StoredFinancialAccount
        )
      : undefined,
  );
}

/**
 * PREPARE a single account financial mutation.
 *
 * IMPORTANT:
 *
 * This function performs Firestore reads
 * but intentionally performs NO writes.
 *
 * Checkout coordinator can therefore:
 *
 * 1. prepare financial mutation
 * 2. read stock/order/other documents
 * 3. commit all changes together
 *
 * inside one Firestore transaction.
 */
export async function prepareFinancialMutationInTransaction(
  transaction:
    Transaction,
  rawInput:
    FinancialMutationInput,
): Promise<PreparedFinancialMutation> {
  const operationId =
    normalizeOperationId(
      rawInput.operationId,
    );

  const uid =
    normalizeUid(
      rawInput.uid,
    );

  const operationType =
    normalizeOperationType(
      rawInput.operationType,
    );

  const asset =
    normalizeAsset(
      rawInput.asset,
    );

  const direction =
    normalizeDirection(
      rawInput.direction,
    );

  const amountAtomic =
    normalizeAtomicString(
      rawInput.amountAtomic,
    );

  const description =
    normalizeDescription(
      rawInput.description,
    );

  const metadata =
    normalizeMetadata(
      rawInput.metadata,
    );

  const fingerprint =
    createMutationFingerprint(
      {
        operationId,
        uid,
        operationType,
        asset,
        direction,
        amountAtomic,
      },
    );

  const accountRef =
    getFinancialAccountRef(
      uid,
    );

  const operationRef =
    getFinancialOperationRef(
      operationId,
    );

  const ledgerEntryId =
    createLedgerDocumentId(
      [
        'ledger_v1',
        operationId,
        uid,
        direction,
      ],
    );

  const ledgerRef =
    getFinancialLedgerRef(
      ledgerEntryId,
    );

  /**
   * ALL READS.
   *
   * No writes occur in this function.
   */
  const operationSnapshot =
    await transaction.get(
      operationRef,
    );

  const accountSnapshot =
    await transaction.get(
      accountRef,
    );

  if (
    operationSnapshot.exists
  ) {
    const operationData =
      operationSnapshot.data() as
        StoredFinancialOperation;

    const completed =
      readCompletedMutationResult(
        operationData,
        {
          operationId,
          fingerprint,
          uid,
          operationType,
          asset,
          amountAtomic,
          direction,
          ledgerEntryId,
        },
      );

    if (
      !completed
    ) {
      throw new Error(
        'Operation ID has already been used for a different financial operation.',
      );
    }

    return {
      kind:
        'financial_mutation',

      idempotent:
        true,

      result:
        completed,

      accountRef,

      operationRef,

      ledgerRef,

      updatedBalances:
        accountSnapshot.exists
          ? normalizeStoredBalances(
              (
                accountSnapshot.data() as
                  StoredFinancialAccount
              )
                .balancesAtomic,
            )
          : createZeroBalances(),

      fingerprint,

      description,

      metadata,
    };
  }

  const account =
    readFinancialAccountData(
      uid,
      accountSnapshot.exists
        ? (
            accountSnapshot.data() as
              StoredFinancialAccount
          )
        : undefined,
    );

  const balanceBeforeAtomic =
    getBalanceAtomic(
      account.balancesAtomic,
      asset,
    );

  const before =
    BigInt(
      balanceBeforeAtomic,
    );

  const amount =
    BigInt(
      amountAtomic,
    );

  let after:
    bigint;

  if (
    direction ===
      'DEBIT'
  ) {
    if (
      before <
      amount
    ) {
      throw new Error(
        'Insufficient funds.',
      );
    }

    after =
      before -
      amount;
  } else {
    after =
      before +
      amount;
  }

  const balanceAfterAtomic =
    after.toString();

  const updatedBalances =
    setBalanceAtomic(
      account.balancesAtomic,
      asset,
      balanceAfterAtomic,
    );

  const result:
    FinancialMutationResult =
  {
    success: true,

    idempotent: false,

    operationId,

    uid,

    operationType,

    asset,

    direction,

    amountAtomic,

    balanceBeforeAtomic,

    balanceAfterAtomic,

    ledgerEntryId,
  };

  return {
    kind:
      'financial_mutation',

    idempotent:
      false,

    result,

    accountRef,

    operationRef,

    ledgerRef,

    updatedBalances,

    fingerprint,

    description,

    metadata,
  };
}

/**
 * COMMIT an already-prepared mutation.
 *
 * This function performs WRITES ONLY.
 *
 * Therefore secure checkout can perform all
 * required reads first and then commit:
 *
 * - financial account
 * - ledger
 * - stock
 * - order
 * - audit
 *
 * atomically.
 */
export function commitPreparedFinancialMutation(
  transaction:
    Transaction,
  prepared:
    PreparedFinancialMutation,
): FinancialMutationResult {
  if (
    prepared.idempotent
  ) {
    return prepared.result;
  }

  const {
    result,
  } =
    prepared;

  transaction.set(
    prepared.accountRef,
    {
      uid:
        result.uid,

      balancesAtomic:
        prepared.updatedBalances,

      updatedAt:
        FieldValue.serverTimestamp(),
    },
    {
      merge: true,
    },
  );

  transaction.create(
    prepared.ledgerRef,
    {
      ledgerEntryId:
        result.ledgerEntryId,

      operationId:
        result.operationId,

      uid:
        result.uid,

      operationType:
        result.operationType,

      asset:
        result.asset,

      direction:
        result.direction,

      amountAtomic:
        result.amountAtomic,

      balanceBeforeAtomic:
        result.balanceBeforeAtomic,

      balanceAfterAtomic:
        result.balanceAfterAtomic,

      description:
        prepared.description,

      metadata:
        prepared.metadata,

      createdAt:
        FieldValue.serverTimestamp(),
    },
  );

  transaction.create(
    prepared.operationRef,
    {
      operationId:
        result.operationId,

      fingerprint:
        prepared.fingerprint,

      uid:
        result.uid,

      operationType:
        result.operationType,

      asset:
        result.asset,

      direction:
        result.direction,

      amountAtomic:
        result.amountAtomic,

      balanceBeforeAtomic:
        result.balanceBeforeAtomic,

      balanceAfterAtomic:
        result.balanceAfterAtomic,

      ledgerEntryId:
        result.ledgerEntryId,

      status:
        'COMPLETED' satisfies
          FinancialOperationStatus,

      createdAt:
        FieldValue.serverTimestamp(),
    },
  );

  return result;
}

/**
 * High-level helper for a standalone
 * financial mutation.
 *
 * Examples:
 *
 * - server-approved deposit
 * - withdrawal settlement
 * - purchase debit
 * - refund credit
 *
 * Checkout can instead call:
 *
 * prepareFinancialMutationInTransaction()
 *
 * +
 *
 * commitPreparedFinancialMutation()
 *
 * inside its larger transaction.
 */
export async function runServerFinancialMutation(
  input:
    FinancialMutationInput,
): Promise<FinancialMutationResult> {
  return adminDb.runTransaction(
    async (
      transaction,
    ) => {
      const prepared =
        await prepareFinancialMutationInTransaction(
          transaction,
          input,
        );

      return commitPreparedFinancialMutation(
        transaction,
        prepared,
      );
    },
  );
}

/**
 * PREPARE an atomic transfer between two
 * PHCL financial accounts.
 *
 * No writes occur here.
 */
export async function prepareFinancialTransferInTransaction(
  transaction:
    Transaction,
  rawInput:
    FinancialTransferInput,
): Promise<PreparedFinancialTransfer> {
  const operationId =
    normalizeOperationId(
      rawInput.operationId,
    );

  const senderUid =
    normalizeUid(
      rawInput.senderUid,
    );

  const recipientUid =
    normalizeUid(
      rawInput.recipientUid,
    );

  if (
    senderUid ===
    recipientUid
  ) {
    throw new Error(
      'Sender and recipient must be different accounts.',
    );
  }

  const asset =
    normalizeAsset(
      rawInput.asset,
    );

  const amountAtomic =
    normalizeAtomicString(
      rawInput.amountAtomic,
    );

  const description =
    normalizeDescription(
      rawInput.description,
    );

  const metadata =
    normalizeMetadata(
      rawInput.metadata,
    );

  const fingerprint =
    createTransferFingerprint(
      {
        operationId,
        senderUid,
        recipientUid,
        asset,
        amountAtomic,
      },
    );

  const senderAccountRef =
    getFinancialAccountRef(
      senderUid,
    );

  const recipientAccountRef =
    getFinancialAccountRef(
      recipientUid,
    );

  const operationRef =
    getFinancialOperationRef(
      operationId,
    );

  const senderLedgerEntryId =
    createLedgerDocumentId(
      [
        'transfer_ledger_v1',
        operationId,
        senderUid,
        'DEBIT',
      ],
    );

  const recipientLedgerEntryId =
    createLedgerDocumentId(
      [
        'transfer_ledger_v1',
        operationId,
        recipientUid,
        'CREDIT',
      ],
    );

  const senderLedgerRef =
    getFinancialLedgerRef(
      senderLedgerEntryId,
    );

  const recipientLedgerRef =
    getFinancialLedgerRef(
      recipientLedgerEntryId,
    );

  /**
   * ALL READS FIRST.
   */
  const operationSnapshot =
    await transaction.get(
      operationRef,
    );

  const senderSnapshot =
    await transaction.get(
      senderAccountRef,
    );

  const recipientSnapshot =
    await transaction.get(
      recipientAccountRef,
    );

  if (
    operationSnapshot.exists
  ) {
    const data =
      operationSnapshot.data();

    if (
      data.status !==
        'COMPLETED' ||
      data.fingerprint !==
        fingerprint ||
      data.operationType !==
        'TRANSFER'
    ) {
      throw new Error(
        'Operation ID has already been used for a different financial operation.',
      );
    }

    if (
      typeof data.senderBalanceBeforeAtomic !==
        'string' ||
      typeof data.senderBalanceAfterAtomic !==
        'string' ||
      typeof data.recipientBalanceBeforeAtomic !==
        'string' ||
      typeof data.recipientBalanceAfterAtomic !==
        'string'
    ) {
      throw new Error(
        'Stored transfer operation is invalid.',
      );
    }

    const result:
      FinancialTransferResult =
    {
      success: true,

      idempotent: true,

      operationId,

      asset,

      amountAtomic,

      senderUid,

      recipientUid,

      senderBalanceBeforeAtomic:
        data.senderBalanceBeforeAtomic,

      senderBalanceAfterAtomic:
        data.senderBalanceAfterAtomic,

      recipientBalanceBeforeAtomic:
        data.recipientBalanceBeforeAtomic,

      recipientBalanceAfterAtomic:
        data.recipientBalanceAfterAtomic,

      senderLedgerEntryId,

      recipientLedgerEntryId,
    };

    return {
      kind:
        'financial_transfer',

      idempotent:
        true,

      result,

      senderAccountRef,

      recipientAccountRef,

      operationRef,

      senderLedgerRef,

      recipientLedgerRef,

      senderUpdatedBalances:
        senderSnapshot.exists
          ? normalizeStoredBalances(
              (
                senderSnapshot.data() as
                  StoredFinancialAccount
              )
                .balancesAtomic,
            )
          : createZeroBalances(),

      recipientUpdatedBalances:
        recipientSnapshot.exists
          ? normalizeStoredBalances(
              (
                recipientSnapshot.data() as
                  StoredFinancialAccount
              )
                .balancesAtomic,
            )
          : createZeroBalances(),

      fingerprint,

      description,

      metadata,
    };
  }

  const senderAccount =
    readFinancialAccountData(
      senderUid,
      senderSnapshot.exists
        ? (
            senderSnapshot.data() as
              StoredFinancialAccount
          )
        : undefined,
    );

  const recipientAccount =
    readFinancialAccountData(
      recipientUid,
      recipientSnapshot.exists
        ? (
            recipientSnapshot.data() as
              StoredFinancialAccount
          )
        : undefined,
    );

  const senderBalanceBeforeAtomic =
    getBalanceAtomic(
      senderAccount.balancesAtomic,
      asset,
    );

  const recipientBalanceBeforeAtomic =
    getBalanceAtomic(
      recipientAccount.balancesAtomic,
      asset,
    );

  const senderBefore =
    BigInt(
      senderBalanceBeforeAtomic,
    );

  const recipientBefore =
    BigInt(
      recipientBalanceBeforeAtomic,
    );

  const amount =
    BigInt(
      amountAtomic,
    );

  if (
    senderBefore <
    amount
  ) {
    throw new Error(
      'Insufficient funds.',
    );
  }

  const senderAfter =
    senderBefore -
    amount;

  const recipientAfter =
    recipientBefore +
    amount;

  const senderBalanceAfterAtomic =
    senderAfter.toString();

  const recipientBalanceAfterAtomic =
    recipientAfter.toString();

  const senderUpdatedBalances =
    setBalanceAtomic(
      senderAccount.balancesAtomic,
      asset,
      senderBalanceAfterAtomic,
    );

  const recipientUpdatedBalances =
    setBalanceAtomic(
      recipientAccount.balancesAtomic,
      asset,
      recipientBalanceAfterAtomic,
    );

  const result:
    FinancialTransferResult =
  {
    success: true,

    idempotent: false,

    operationId,

    asset,

    amountAtomic,

    senderUid,

    recipientUid,

    senderBalanceBeforeAtomic,

    senderBalanceAfterAtomic,

    recipientBalanceBeforeAtomic,

    recipientBalanceAfterAtomic,

    senderLedgerEntryId,

    recipientLedgerEntryId,
  };

  return {
    kind:
      'financial_transfer',

    idempotent:
      false,

    result,

    senderAccountRef,

    recipientAccountRef,

    operationRef,

    senderLedgerRef,

    recipientLedgerRef,

    senderUpdatedBalances,

    recipientUpdatedBalances,

    fingerprint,

    description,

    metadata,
  };
}

/**
 * COMMIT a prepared transfer.
 *
 * Writes both balances + both ledger sides +
 * one idempotency operation record in the
 * same Firestore transaction.
 */
export function commitPreparedFinancialTransfer(
  transaction:
    Transaction,
  prepared:
    PreparedFinancialTransfer,
): FinancialTransferResult {
  if (
    prepared.idempotent
  ) {
    return prepared.result;
  }

  const {
    result,
  } =
    prepared;

  transaction.set(
    prepared.senderAccountRef,
    {
      uid:
        result.senderUid,

      balancesAtomic:
        prepared.senderUpdatedBalances,

      updatedAt:
        FieldValue.serverTimestamp(),
    },
    {
      merge: true,
    },
  );

  transaction.set(
    prepared.recipientAccountRef,
    {
      uid:
        result.recipientUid,

      balancesAtomic:
        prepared.recipientUpdatedBalances,

      updatedAt:
        FieldValue.serverTimestamp(),
    },
    {
      merge: true,
    },
  );

  transaction.create(
    prepared.senderLedgerRef,
    {
      ledgerEntryId:
        result.senderLedgerEntryId,

      operationId:
        result.operationId,

      uid:
        result.senderUid,

      counterpartyUid:
        result.recipientUid,

      operationType:
        'TRANSFER',

      asset:
        result.asset,

      direction:
        'DEBIT',

      amountAtomic:
        result.amountAtomic,

      balanceBeforeAtomic:
        result.senderBalanceBeforeAtomic,

      balanceAfterAtomic:
        result.senderBalanceAfterAtomic,

      description:
        prepared.description,

      metadata:
        prepared.metadata,

      createdAt:
        FieldValue.serverTimestamp(),
    },
  );

  transaction.create(
    prepared.recipientLedgerRef,
    {
      ledgerEntryId:
        result.recipientLedgerEntryId,

      operationId:
        result.operationId,

      uid:
        result.recipientUid,

      counterpartyUid:
        result.senderUid,

      operationType:
        'TRANSFER',

      asset:
        result.asset,

      direction:
        'CREDIT',

      amountAtomic:
        result.amountAtomic,

      balanceBeforeAtomic:
        result.recipientBalanceBeforeAtomic,

      balanceAfterAtomic:
        result.recipientBalanceAfterAtomic,

      description:
        prepared.description,

      metadata:
        prepared.metadata,

      createdAt:
        FieldValue.serverTimestamp(),
    },
  );

  transaction.create(
    prepared.operationRef,
    {
      operationId:
        result.operationId,

      fingerprint:
        prepared.fingerprint,

      operationType:
        'TRANSFER',

      asset:
        result.asset,

      amountAtomic:
        result.amountAtomic,

      senderUid:
        result.senderUid,

      recipientUid:
        result.recipientUid,

      senderBalanceBeforeAtomic:
        result.senderBalanceBeforeAtomic,

      senderBalanceAfterAtomic:
        result.senderBalanceAfterAtomic,

      recipientBalanceBeforeAtomic:
        result.recipientBalanceBeforeAtomic,

      recipientBalanceAfterAtomic:
        result.recipientBalanceAfterAtomic,

      senderLedgerEntryId:
        result.senderLedgerEntryId,

      recipientLedgerEntryId:
        result.recipientLedgerEntryId,

      status:
        'COMPLETED' satisfies
          FinancialOperationStatus,

      createdAt:
        FieldValue.serverTimestamp(),
    },
  );

  return result;
}

/**
 * Standalone server transfer.
 *
 * API security/auth/KYC/limits must be
 * enforced by the route/service calling this
 * function.
 *
 * This function intentionally does NOT trust
 * browser authorization by itself.
 */
export async function runServerFinancialTransfer(
  input:
    FinancialTransferInput,
): Promise<FinancialTransferResult> {
  return adminDb.runTransaction(
    async (
      transaction,
    ) => {
      const prepared =
        await prepareFinancialTransferInTransaction(
          transaction,
          input,
        );

      return commitPreparedFinancialTransfer(
        transaction,
        prepared,
      );
    },
  );
}