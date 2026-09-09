import 'server-only';

import {
  createHash,
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

const DEPOSIT_REQUEST_COLLECTION =
  'deposit_requests';

const DEFAULT_REQUEST_EXPIRY_SECONDS =
  30 * 60;

const MAX_OPERATION_ID_LENGTH =
  120;

const MAX_PROVIDER_CODE_LENGTH =
  40;

const MAX_ATOMIC_AMOUNT_LENGTH =
  40;

export type DepositRail =
  | 'BANK'
  | 'MOBILE_MONEY'
  | 'BLOCKCHAIN';

export type DepositRequestStatus =
  | 'PENDING_PROVIDER_INITIATION';

type StoredFinancialAccount = {
  uid?: unknown;
};

type StoredDepositRequest = {
  requestId?: unknown;

  fingerprint?: unknown;

  uid?: unknown;

  asset?: unknown;

  rail?: unknown;

  providerCode?: unknown;

  amountAtomic?: unknown;

  status?: unknown;

  expiresAtMs?: unknown;
};

export type CreateDepositRequestInput = {
  uid: string;

  clientOperationId: string;

  asset:
    FinancialAsset;

  rail:
    DepositRail;

  providerCode: string;

  amountAtomic: string;
};

export type PendingDepositRequestResult = {
  success: true;

  idempotent: boolean;

  requestId: string;

  clientOperationId: string;

  asset:
    FinancialAsset;

  rail:
    DepositRail;

  providerCode: string;

  amountAtomic: string;

  status:
    DepositRequestStatus;

  expiresAtMs: number;
};

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
      'INVALID_DEPOSIT_ACCOUNT',
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
      'INVALID_DEPOSIT_OPERATION_ID',
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
      'INVALID_DEPOSIT_ASSET',
    );
  }

  return value;
}

function normalizeRail(
  value: DepositRail,
): DepositRail {
  if (
    value !==
      'BANK' &&
    value !==
      'MOBILE_MONEY' &&
    value !==
      'BLOCKCHAIN'
  ) {
    throw new Error(
      'INVALID_DEPOSIT_RAIL',
    );
  }

  return value;
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
      'INVALID_DEPOSIT_PROVIDER',
    );
  }

  return providerCode;
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
      'INVALID_DEPOSIT_AMOUNT',
    );
  }

  return amountAtomic;
}

function requireSupportedRoute(
  asset: FinancialAsset,
  rail: DepositRail,
  providerCode: string,
): void {
  const supported =
    (
      asset ===
        'TZS' &&
      rail ===
        'MOBILE_MONEY' &&
      [
        'MPESA',
        'AIRTEL_MONEY',
        'MIXX_BY_YAS',
        'HALOPESA',
      ].includes(
        providerCode,
      )
    ) ||
    (
      asset ===
        'TZS' &&
      rail ===
        'BANK' &&
      [
        'CRDB',
        'NMB',
        'NBC',
        'EXIM',
        'OTHER_BANK',
      ].includes(
        providerCode,
      )
    ) ||
    (
      asset ===
        'USD' &&
      rail ===
        'BANK' &&
      providerCode ===
        'OTHER_BANK'
    ) ||
    (
      asset ===
        'PI' &&
      rail ===
        'BLOCKCHAIN' &&
      providerCode ===
        'PI_NETWORK'
    );

  if (!supported) {
    throw new Error(
      'DEPOSIT_ROUTE_NOT_SUPPORTED',
    );
  }
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
          'phcl_deposit_request_v1',
          uid,
          clientOperationId,
        ].join('|'),
        'utf8',
      )
      .digest(
        'hex',
      );

  return `deposit_${digest}`;
}

function createRequestFingerprint(
  input: {
    uid: string;

    clientOperationId:
      string;

    asset:
      FinancialAsset;

    rail:
      DepositRail;

    providerCode:
      string;

    amountAtomic:
      string;
  },
): string {
  return createHash(
    'sha256',
  )
    .update(
      [
        'phcl_deposit_request_fingerprint_v1',
        input.uid,
        input.clientOperationId,
        input.asset,
        input.rail,
        input.providerCode,
        input.amountAtomic,
      ].join('|'),
      'utf8',
    )
    .digest(
      'hex',
    );
}

function readExistingResult(
  existing:
    StoredDepositRequest,
  expectedFingerprint:
    string,
  clientOperationId:
    string,
): PendingDepositRequestResult {
  if (
    existing.fingerprint !==
      expectedFingerprint
  ) {
    throw new Error(
      'DEPOSIT_OPERATION_CONFLICT',
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
      'PENDING_PROVIDER_INITIATION'
  ) {
    throw new Error(
      'INVALID_STORED_DEPOSIT_REQUEST',
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

    status:
      'PENDING_PROVIDER_INITIATION',

    expiresAtMs:
      existing.expiresAtMs,
  };
}

/**
 * Creates an idempotent deposit intent.
 *
 * SECURITY BOUNDARY:
 *
 * - It does not credit any financial balance.
 * - It does not claim that payment was received.
 * - It does not create a wallet address from a Firebase UID.
 * - It does not accept payment destination details from a client.
 * - It stores no provider secret or callback credential.
 *
 * A provider adapter must later initiate payment and return only
 * provider-authorized instructions. An authenticated callback must
 * atomically credit the ledger after independent verification.
 */
export async function createPendingDepositRequest(
  rawInput:
    CreateDepositRequestInput,
  now = Date.now(),
): Promise<PendingDepositRequestResult> {
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

  const providerCode =
    normalizeProviderCode(
      rawInput.providerCode,
    );

  requireSupportedRoute(
    asset,
    rail,
    providerCode,
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

  const fingerprint =
    createRequestFingerprint({
      uid,
      clientOperationId,
      asset,
      rail,
      providerCode,
      amountAtomic,
    });

  const expirySeconds =
    readPositiveIntegerEnv(
      'DEPOSIT_REQUEST_EXPIRY_SECONDS',
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
      .doc(uid);

  const requestReference =
    adminDb
      .collection(
        DEPOSIT_REQUEST_COLLECTION,
      )
      .doc(requestId);

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
            StoredDepositRequest,
          fingerprint,
          clientOperationId,
        );
      }

      if (
        !accountSnapshot.exists
      ) {
        throw new Error(
          'DEPOSIT_ACCOUNT_NOT_FOUND',
        );
      }

      const account =
        accountSnapshot.data() as
          StoredFinancialAccount;

      if (
        typeof account.uid ===
          'string' &&
        account.uid.trim() !==
          uid
      ) {
        throw new Error(
          'DEPOSIT_ACCOUNT_IDENTITY_MISMATCH',
        );
      }

      const result:
        PendingDepositRequestResult = {
        success: true,

        idempotent: false,

        requestId,

        clientOperationId,

        asset,

        rail,

        providerCode,

        amountAtomic,

        status:
          'PENDING_PROVIDER_INITIATION',

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

          status:
            'PENDING_PROVIDER_INITIATION' satisfies
              DepositRequestStatus,

          providerStatus:
            'NOT_STARTED',

          settlementStatus:
            'NOT_STARTED',

          credited:
            false,

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
