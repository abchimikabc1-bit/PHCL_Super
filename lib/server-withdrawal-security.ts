import 'server-only';

import {
  createCipheriv,
  createHash,
  createHmac,
  randomBytes,
} from 'node:crypto';

import {
  FieldValue,
} from 'firebase-admin/firestore';

import {
  adminDb,
} from '@/lib/firebase-admin';

import {
  FINANCIAL_ASSETS,
  type FinancialAsset,
} from '@/lib/server-financial-ledger';

const FINANCIAL_ACCOUNT_COLLECTION =
  'financial_accounts';

const WITHDRAWAL_REQUEST_COLLECTION =
  'withdrawal_requests';

const DEFAULT_REQUEST_EXPIRY_SECONDS =
  24 * 60 * 60;

const MAX_OPERATION_ID_LENGTH =
  120;

const MAX_DESTINATION_LENGTH =
  200;

const MAX_PROVIDER_CODE_LENGTH =
  40;

const MAX_ATOMIC_AMOUNT_LENGTH =
  40;

const ENCRYPTION_ALGORITHM =
  'aes-256-gcm';

const ENCRYPTION_VERSION =
  1 as const;

export type WithdrawalRail =
  | 'BANK'
  | 'MOBILE_MONEY'
  | 'BLOCKCHAIN';

export type WithdrawalRequestStatus =
  | 'PENDING_REVIEW';

type AtomicBalanceKey =
  | 'usd'
  | 'tzs'
  | 'ntzs'
  | 'pi';

type StoredFinancialAccount = {
  uid?: unknown;

  balancesAtomic?: unknown;
};

type StoredWithdrawalRequest = {
  requestId?: unknown;

  fingerprint?: unknown;

  uid?: unknown;

  asset?: unknown;

  rail?: unknown;

  providerCode?: unknown;

  amountAtomic?: unknown;

  status?: unknown;

  destinationMasked?: unknown;

  expiresAtMs?: unknown;
};

export type CreateWithdrawalRequestInput = {
  uid: string;

  clientOperationId: string;

  asset:
    FinancialAsset;

  rail:
    WithdrawalRail;

  providerCode: string;

  destination: string;

  amountAtomic: string;
};

export type PendingWithdrawalRequestResult = {
  success: true;

  idempotent: boolean;

  requestId: string;

  clientOperationId: string;

  asset:
    FinancialAsset;

  rail:
    WithdrawalRail;

  providerCode: string;

  amountAtomic: string;

  destinationMasked: string;

  status:
    WithdrawalRequestStatus;

  expiresAtMs: number;
};

function isRecord(
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

function getEncryptionKey():
  Buffer {
  const encodedKey =
    process.env
      .WITHDRAWAL_DATA_ENCRYPTION_KEY
      ?.trim();

  if (!encodedKey) {
    throw new Error(
      'WITHDRAWAL_ENCRYPTION_KEY_NOT_CONFIGURED',
    );
  }

  let key:
    Buffer;

  try {
    key =
      Buffer.from(
        encodedKey,
        'base64url',
      );
  } catch {
    throw new Error(
      'WITHDRAWAL_ENCRYPTION_KEY_INVALID',
    );
  }

  if (
    key.length !==
    32
  ) {
    throw new Error(
      'WITHDRAWAL_ENCRYPTION_KEY_INVALID',
    );
  }

  return key;
}

function readPositiveIntegerEnv(
  name: string,
  fallback: number,
): number {
  const raw =
    process.env[name];

  const parsed =
    Number(
      raw,
    );

  if (
    !raw ||
    !Number.isSafeInteger(
      parsed,
    ) ||
    parsed <= 0
  ) {
    return fallback;
  }

  return parsed;
}

function normalizeUid(
  value: string,
): string {
  const uid =
    value.trim();

  if (
    !uid ||
    uid.length >
      256 ||
    uid.includes(
      '/',
    )
  ) {
    throw new Error(
      'INVALID_WITHDRAWAL_ACCOUNT',
    );
  }

  return uid;
}

function normalizeOperationId(
  value: string,
): string {
  const operationId =
    value.trim();

  if (
    !operationId ||
    operationId.length >
      MAX_OPERATION_ID_LENGTH ||
    !/^[A-Za-z0-9._:-]+$/.test(
      operationId,
    )
  ) {
    throw new Error(
      'INVALID_WITHDRAWAL_OPERATION_ID',
    );
  }

  return operationId;
}

function normalizeAsset(
  value: FinancialAsset,
): FinancialAsset {
  if (
    !(
      FINANCIAL_ASSETS as
        readonly string[]
    ).includes(
      value,
    )
  ) {
    throw new Error(
      'INVALID_WITHDRAWAL_ASSET',
    );
  }

  return value;
}

function normalizeRail(
  value: WithdrawalRail,
): WithdrawalRail {
  if (
    value !==
      'BANK' &&
    value !==
      'MOBILE_MONEY' &&
    value !==
      'BLOCKCHAIN'
  ) {
    throw new Error(
      'INVALID_WITHDRAWAL_RAIL',
    );
  }

  return value;
}

function requireSupportedRoute(
  asset: FinancialAsset,
  rail: WithdrawalRail,
): void {
  const supported =
    (
      asset ===
        'TZS' &&
      (
        rail ===
          'BANK' ||
        rail ===
          'MOBILE_MONEY'
      )
    ) ||
    (
      asset ===
        'USD' &&
      rail ===
        'BANK'
    ) ||
    (
      asset ===
        'PI' &&
      rail ===
        'BLOCKCHAIN'
    );

  if (!supported) {
    throw new Error(
      'WITHDRAWAL_ROUTE_NOT_SUPPORTED',
    );
  }

}

function normalizeProviderCode(
  value: string,
): string {
  const providerCode =
    value
      .trim()
      .toUpperCase();

  if (
    providerCode.length <
      2 ||
    providerCode.length >
      MAX_PROVIDER_CODE_LENGTH ||
    !/^[A-Z0-9_-]+$/.test(
      providerCode,
    )
  ) {
    throw new Error(
      'INVALID_WITHDRAWAL_PROVIDER',
    );
  }

  return providerCode;
}

function normalizeDestination(
  value: string,
): string {
  const destination =
    value.trim();

  if (
    destination.length <
      4 ||
    destination.length >
      MAX_DESTINATION_LENGTH ||
    /[\u0000-\u001F\u007F]/.test(
      destination,
    )
  ) {
    throw new Error(
      'INVALID_WITHDRAWAL_DESTINATION',
    );
  }

  return destination;
}

function normalizeAtomicAmount(
  value: string,
): string {
  const amountAtomic =
    value.trim();

  if (
    !/^[1-9][0-9]*$/.test(
      amountAtomic,
    ) ||
    amountAtomic.length >
      MAX_ATOMIC_AMOUNT_LENGTH
  ) {
    throw new Error(
      'INVALID_WITHDRAWAL_AMOUNT',
    );
  }

  return amountAtomic;
}

function assetToBalanceKey(
  asset: FinancialAsset,
): AtomicBalanceKey {
  switch (asset) {
    case 'USD':
      return 'usd';

    case 'TZS':
      return 'tzs';

    case 'NTZS':
      return 'ntzs';

    case 'PI':
      return 'pi';
  }
}

function readAtomicBalance(
  account:
    StoredFinancialAccount |
    undefined,
  asset: FinancialAsset,
): string {
  if (
    !account ||
    !isRecord(
      account.balancesAtomic,
    )
  ) {
    return '0';
  }

  const balanceKey =
    assetToBalanceKey(
      asset,
    );

  const value =
    account
      .balancesAtomic[
        balanceKey
      ];

  if (
    typeof value !==
      'string' ||
    !/^(0|[1-9][0-9]*)$/.test(
      value,
    )
  ) {
    return '0';
  }

  return value;
}

function createRequestId(
  uid: string,
  clientOperationId: string,
): string {
  const digest =
    createHash(
      'sha256',
    )
      .update(
        [
          'phcl_withdrawal_request_v1',
          uid,
          clientOperationId,
        ].join('|'),
        'utf8',
      )
      .digest(
        'hex',
      );

  return `withdrawal_${digest}`;
}

function createDestinationFingerprint(
  key: Buffer,
  destination: string,
): string {
  return createHmac(
    'sha256',
    key,
  )
    .update(
      `phcl_withdrawal_destination_v1|${destination}`,
      'utf8',
    )
    .digest(
      'hex',
    );
}

function createRequestFingerprint(
  key: Buffer,
  input: {
    uid: string;

    clientOperationId:
      string;

    asset:
      FinancialAsset;

    rail:
      WithdrawalRail;

    providerCode:
      string;

    amountAtomic:
      string;

    destinationFingerprint:
      string;
  },
): string {
  return createHmac(
    'sha256',
    key,
  )
    .update(
      [
        'phcl_withdrawal_request_fingerprint_v1',
        input.uid,
        input.clientOperationId,
        input.asset,
        input.rail,
        input.providerCode,
        input.amountAtomic,
        input.destinationFingerprint,
      ].join('|'),
      'utf8',
    )
    .digest(
      'hex',
    );
}

function maskDestination(
  destination: string,
): string {
  const compact =
    destination.replace(
      /\s+/g,
      '',
    );

  const visibleSuffix =
    compact.slice(
      -4,
    );

  return `••••${visibleSuffix}`;
}

function encryptDestination(
  key: Buffer,
  requestId: string,
  uid: string,
  destination: string,
) {
  const initializationVector =
    randomBytes(
      12,
    );

  const cipher =
    createCipheriv(
      ENCRYPTION_ALGORITHM,
      key,
      initializationVector,
    );

  const additionalData =
    Buffer.from(
      [
        'phcl_withdrawal_destination_v1',
        requestId,
        uid,
      ].join('|'),
      'utf8',
    );

  cipher.setAAD(
    additionalData,
  );

  const ciphertext =
    Buffer.concat([
      cipher.update(
        destination,
        'utf8',
      ),

      cipher.final(),
    ]);

  const authenticationTag =
    cipher.getAuthTag();

  return {
    algorithm:
      ENCRYPTION_ALGORITHM,

    version:
      ENCRYPTION_VERSION,

    initializationVector:
      initializationVector.toString(
        'base64url',
      ),

    ciphertext:
      ciphertext.toString(
        'base64url',
      ),

    authenticationTag:
      authenticationTag.toString(
        'base64url',
      ),
  };
}

function readExistingResult(
  existing:
    StoredWithdrawalRequest,
  expectedFingerprint:
    string,
  clientOperationId:
    string,
): PendingWithdrawalRequestResult {
  if (
    existing.fingerprint !==
      expectedFingerprint
  ) {
    throw new Error(
      'WITHDRAWAL_OPERATION_CONFLICT',
    );
  }

  if (
    typeof existing.requestId !==
      'string' ||
    typeof existing.uid !==
      'string' ||
    typeof existing.providerCode !==
      'string' ||
    typeof existing.amountAtomic !==
      'string' ||
    typeof existing.destinationMasked !==
      'string' ||
    typeof existing.expiresAtMs !==
      'number' ||
    !Number.isSafeInteger(
      existing.expiresAtMs,
    ) ||
    !(
      FINANCIAL_ASSETS as
        readonly unknown[]
    ).includes(
      existing.asset,
    ) ||
    (
      existing.rail !==
        'BANK' &&
      existing.rail !==
        'MOBILE_MONEY' &&
      existing.rail !==
        'BLOCKCHAIN'
    ) ||
    existing.status !==
      'PENDING_REVIEW'
  ) {
    throw new Error(
      'INVALID_STORED_WITHDRAWAL_REQUEST',
    );
  }

  return {
    success: true,

    idempotent: true,

    requestId:
      existing.requestId,

    clientOperationId,

    asset:
      existing.asset as
        FinancialAsset,

    rail:
      existing.rail,

    providerCode:
      existing.providerCode,

    amountAtomic:
      existing.amountAtomic,

    destinationMasked:
      existing.destinationMasked,

    status:
      'PENDING_REVIEW',

    expiresAtMs:
      existing.expiresAtMs,
  };
}

/**
 * Creates an encrypted, idempotent withdrawal request.
 *
 * SECURITY BOUNDARY:
 *
 * - This does not mark a withdrawal COMPLETED.
 * - This does not debit the financial ledger.
 * - This does not claim that an external payout succeeded.
 * - The destination is encrypted before storage.
 * - The authoritative balance is checked server-side.
 *
 * Final debit/settlement must later occur atomically after
 * an authenticated payout-provider callback or protected
 * operational approval workflow.
 */
export async function createPendingWithdrawalRequest(
  rawInput:
    CreateWithdrawalRequestInput,
  now = Date.now(),
): Promise<PendingWithdrawalRequestResult> {
  const key =
    getEncryptionKey();

  const uid =
    normalizeUid(
      rawInput.uid,
    );

  const clientOperationId =
    normalizeOperationId(
      rawInput.clientOperationId,
    );

  const asset =
    normalizeAsset(
      rawInput.asset,
    );

  const rail =
    normalizeRail(
      rawInput.rail,
    );

  requireSupportedRoute(
    asset,
    rail,
  );

  const providerCode =
    normalizeProviderCode(
      rawInput.providerCode,
    );

  const destination =
    normalizeDestination(
      rawInput.destination,
    );

  const amountAtomic =
    normalizeAtomicAmount(
      rawInput.amountAtomic,
    );

  const requestId =
    createRequestId(
      uid,
      clientOperationId,
    );

  const destinationFingerprint =
    createDestinationFingerprint(
      key,
      destination,
    );

  const fingerprint =
    createRequestFingerprint(
      key,
      {
        uid,

        clientOperationId,

        asset,

        rail,

        providerCode,

        amountAtomic,

        destinationFingerprint,
      },
    );

  const destinationMasked =
    maskDestination(
      destination,
    );

  const encryptedDestination =
    encryptDestination(
      key,
      requestId,
      uid,
      destination,
    );

  const expirySeconds =
    readPositiveIntegerEnv(
      'WITHDRAWAL_REQUEST_EXPIRY_SECONDS',
      DEFAULT_REQUEST_EXPIRY_SECONDS,
    );

  const expiresAtMs =
    now +
    expirySeconds *
      1000;

  const accountReference =
    adminDb
      .collection(
        FINANCIAL_ACCOUNT_COLLECTION,
      )
      .doc(
        uid,
      );

  const requestReference =
    adminDb
      .collection(
        WITHDRAWAL_REQUEST_COLLECTION,
      )
      .doc(
        requestId,
      );

  return adminDb.runTransaction(
    async (
      transaction,
    ) => {
      const [
        accountSnapshot,
        requestSnapshot,
      ] =
        await Promise.all([
          transaction.get(
            accountReference,
          ),

          transaction.get(
            requestReference,
          ),
        ]);

      if (
        requestSnapshot.exists
      ) {
        return readExistingResult(
          requestSnapshot.data() as
            StoredWithdrawalRequest,
          fingerprint,
          clientOperationId,
        );
      }

      const account =
        accountSnapshot.exists
          ? (
              accountSnapshot.data() as
                StoredFinancialAccount
            )
          : undefined;

      if (
        account &&
        typeof account.uid ===
          'string' &&
        account.uid.trim() !==
          uid
      ) {
        throw new Error(
          'WITHDRAWAL_ACCOUNT_IDENTITY_MISMATCH',
        );
      }

      const balanceAtomic =
        readAtomicBalance(
          account,
          asset,
        );

      if (
        BigInt(
          balanceAtomic,
        ) <
        BigInt(
          amountAtomic,
        )
      ) {
        throw new Error(
          'INSUFFICIENT_FUNDS',
        );
      }

      const result:
        PendingWithdrawalRequestResult = {
        success: true,

        idempotent: false,

        requestId,

        clientOperationId,

        asset,

        rail,

        providerCode,

        amountAtomic,

        destinationMasked,

        status:
          'PENDING_REVIEW',

        expiresAtMs,
      };

      transaction.create(
        requestReference,
        {
          requestId,

          fingerprint,

          uid,

          clientOperationId,

          asset,

          rail,

          providerCode,

          amountAtomic,

          destinationMasked,

          destinationFingerprint,

          encryptedDestination,

          encryptionVersion:
            ENCRYPTION_VERSION,

          status:
            'PENDING_REVIEW' satisfies
              WithdrawalRequestStatus,

          /*
           * This balance is evidence of the
           * server-side eligibility check only.
           * It is not a reserved or debited balance.
           */
          checkedBalanceAtomic:
            balanceAtomic,

          settlementStatus:
            'NOT_STARTED',

          createdAt:
            FieldValue.serverTimestamp(),

          updatedAt:
            FieldValue.serverTimestamp(),

          expiresAt:
            new Date(
              expiresAtMs,
            ),

          expiresAtMs,
        },
      );

      return result;
    },
  );
}
