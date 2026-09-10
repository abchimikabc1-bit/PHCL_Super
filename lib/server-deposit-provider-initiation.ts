import 'server-only';

import {
  FieldValue,
} from 'firebase-admin/firestore';

import {
  adminDb,
} from '@/lib/firebase-admin';

import type {
  FinancialAsset,
} from '@/lib/server-financial-ledger';

import {
  createPendingDepositRequest,
  type DepositRail,
  type PendingDepositRequestResult,
} from '@/lib/server-deposit-security';

import {
  getConfiguredPaymentProvider,
} from '@/lib/server-payment-provider-registry';

import type {
  PaymentProviderCode,
  ProviderCustomerAction,
  ProviderDepositInitiationResult,
  ProviderOperationStatus,
  ProviderPayerReference,
} from '@/lib/server-payment-provider-types';

const DEPOSIT_REQUEST_COLLECTION =
  'deposit_requests';

type StoredDepositRequest = {
  requestId?:
    unknown;

  uid?:
    unknown;

  clientOperationId?:
    unknown;

  asset?:
    unknown;

  rail?:
    unknown;

  providerCode?:
    unknown;

  amountAtomic?:
    unknown;

  providerInitiationStatus?:
    unknown;

  providerRequestId?:
    unknown;

  providerTransactionId?:
    unknown;

  providerOperationStatus?:
    unknown;

  providerResponseFingerprint?:
    unknown;
};

export type InitiateDepositProviderInput = {
  uid:
    string;

  clientOperationId:
    string;

  asset:
    FinancialAsset;

  rail:
    DepositRail;

  providerCode:
    PaymentProviderCode;

  amountAtomic:
    string;

  payer:
    ProviderPayerReference;

  /**
   * Optional server-controlled provider return URLs.
   * Never copy arbitrary browser URLs into these fields.
   */
  returnUrl?:
    string | null;

  cancelUrl?:
    string | null;
};

export type DepositProviderInitiationResult = {
  success:
    true;

  idempotent:
    boolean;

  deposit:
    PendingDepositRequestResult;

  provider:
    ProviderDepositInitiationResult;
};

function normalizeStoredString(
  value:
    unknown,

  errorCode:
    string,
): string {
  if (
    typeof value !==
      'string'
  ) {
    throw new Error(
      errorCode,
    );
  }

  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      errorCode,
    );
  }

  return normalized;
}

function readOptionalStoredString(
  value:
    unknown,
): string | null {
  return typeof value ===
    'string' &&
    value.trim()
      ? value.trim()
      : null;
}

function assertStoredRequestIdentity(
  stored:
    StoredDepositRequest,

  input:
    InitiateDepositProviderInput,

  requestId:
    string,
): void {
  if (
    normalizeStoredString(
      stored.requestId,
      'DEPOSIT_PROVIDER_REQUEST_INVALID',
    ) !== requestId
  ) {
    throw new Error(
      'DEPOSIT_PROVIDER_REQUEST_IDENTITY_MISMATCH',
    );
  }

  if (
    normalizeStoredString(
      stored.uid,
      'DEPOSIT_PROVIDER_REQUEST_INVALID',
    ) !== input.uid
  ) {
    throw new Error(
      'DEPOSIT_PROVIDER_ACCOUNT_MISMATCH',
    );
  }

  if (
    normalizeStoredString(
      stored.clientOperationId,
      'DEPOSIT_PROVIDER_REQUEST_INVALID',
    ) !==
      input.clientOperationId
  ) {
    throw new Error(
      'DEPOSIT_PROVIDER_OPERATION_MISMATCH',
    );
  }

  if (
    stored.asset !==
      input.asset ||
    stored.rail !==
      input.rail ||
    stored.providerCode !==
      input.providerCode ||
    stored.amountAtomic !==
      input.amountAtomic
  ) {
    throw new Error(
      'DEPOSIT_PROVIDER_REQUEST_MISMATCH',
    );
  }
}

function assertProviderResult(
  result:
    ProviderDepositInitiationResult,

  input:
    InitiateDepositProviderInput,

  requestId:
    string,
): void {
  if (
    result.success !==
      true ||
    result.providerCode !==
      input.providerCode ||
    result.requestId !==
      requestId ||
    result.operationId !==
      input.clientOperationId
  ) {
    throw new Error(
      'DEPOSIT_PROVIDER_RESULT_INVALID',
    );
  }

  if (
    typeof result.providerRequestId !==
      'string' ||
    !result.providerRequestId.trim() ||
    result.providerRequestId.length >
      200
  ) {
    throw new Error(
      'DEPOSIT_PROVIDER_RESULT_INVALID',
    );
  }

  if (
    result.providerTransactionId !==
      null &&
    (
      typeof result.providerTransactionId !==
        'string' ||
      !result.providerTransactionId.trim() ||
      result.providerTransactionId.length >
        200
    )
  ) {
    throw new Error(
      'DEPOSIT_PROVIDER_RESULT_INVALID',
    );
  }

  if (
    result.status !==
      'PENDING' &&
    result.status !==
      'REQUIRES_CUSTOMER_ACTION' &&
    result.status !==
      'SUCCESS' &&
    result.status !==
      'FAILED'
  ) {
    throw new Error(
      'DEPOSIT_PROVIDER_RESULT_INVALID',
    );
  }

  if (
    typeof result.responseFingerprint !==
      'string' ||
    !/^[a-f0-9]{64}$/.test(
      result.responseFingerprint,
    )
  ) {
    throw new Error(
      'DEPOSIT_PROVIDER_RESULT_INVALID',
    );
  }

  if (
    result.expiresAtMs !==
      null &&
    (
      !Number.isSafeInteger(
        result.expiresAtMs,
      ) ||
      result.expiresAtMs <= 0
    )
  ) {
    throw new Error(
      'DEPOSIT_PROVIDER_RESULT_INVALID',
    );
  }
}

function assertProviderRouteSupported(
  providerCode:
    PaymentProviderCode,

  rail:
    DepositRail,

  asset:
    FinancialAsset,
): void {
  const adapter =
    getConfiguredPaymentProvider(
      providerCode,
    );

  if (
    !adapter.supportedRails.includes(
      rail,
    ) ||
    !adapter.supportedAssets.includes(
      asset,
    )
  ) {
    throw new Error(
      'DEPOSIT_PROVIDER_ROUTE_NOT_SUPPORTED',
    );
  }
}

function createProviderInput(
  input:
    InitiateDepositProviderInput,

  deposit:
    PendingDepositRequestResult,
) {
  const adapter =
    getConfiguredPaymentProvider(
      input.providerCode,
    );

  return {
    adapter,

    providerInput: {
      requestId:
        deposit.requestId,

      operationId:
        deposit.clientOperationId,

      providerCode:
        input.providerCode,

      environment:
        adapter.environment,

      rail:
        input.rail,

      asset:
        input.asset,

      amountAtomic:
        input.amountAtomic,

      payer:
        input.payer,


      returnUrl:
        input.returnUrl,

      cancelUrl:
        input.cancelUrl,

      metadata: {
        source:
          'PHCL_DEPOSIT_API',
      },
    },
  };
}

function assertExistingInitiationMatches(
  stored:
    StoredDepositRequest,

  result:
    ProviderDepositInitiationResult,
): void {
  const storedProviderRequestId =
    normalizeStoredString(
      stored.providerRequestId,
      'DEPOSIT_PROVIDER_INITIATION_RECORD_INVALID',
    );

  const storedFingerprint =
    normalizeStoredString(
      stored.providerResponseFingerprint,
      'DEPOSIT_PROVIDER_INITIATION_RECORD_INVALID',
    );

  const storedTransactionId =
    readOptionalStoredString(
      stored.providerTransactionId,
    );

  if (
    storedProviderRequestId !==
      result.providerRequestId ||
    storedFingerprint !==
      result.responseFingerprint ||
    storedTransactionId !==
      result.providerTransactionId
  ) {
    throw new Error(
      'DEPOSIT_PROVIDER_INITIATION_CONFLICT',
    );
  }
}

async function persistProviderInitiation(
  input:
    InitiateDepositProviderInput,

  deposit:
    PendingDepositRequestResult,

  providerResult:
    ProviderDepositInitiationResult,
): Promise<boolean> {
  const documentReference =
    adminDb
      .collection(
        DEPOSIT_REQUEST_COLLECTION,
      )
      .doc(
        deposit.requestId,
      );

  return adminDb.runTransaction(
    async (
      transaction,
    ) => {
      const snapshot =
        await transaction.get(
          documentReference,
        );

      if (
        !snapshot.exists
      ) {
        throw new Error(
          'DEPOSIT_PROVIDER_REQUEST_NOT_FOUND',
        );
      }

      const stored =
        snapshot.data() as
          StoredDepositRequest;

      assertStoredRequestIdentity(
        stored,
        input,
        deposit.requestId,
      );

      if (
        stored.providerInitiationStatus ===
          'INITIATED'
      ) {
        assertExistingInitiationMatches(
          stored,
          providerResult,
        );

        return true;
      }

      if (
        stored.providerInitiationStatus !==
          undefined &&
        stored.providerInitiationStatus !==
          'NOT_STARTED'
      ) {
        throw new Error(
          'DEPOSIT_PROVIDER_INITIATION_STATE_INVALID',
        );
      }

      transaction.update(
        documentReference,
        {
          providerInitiationStatus:
            'INITIATED',

          providerRequestId:
            providerResult.providerRequestId,

          providerTransactionId:
            providerResult.providerTransactionId,

          providerOperationStatus:
            providerResult.status,

          providerCustomerAction:
            providerResult.customerAction,

          providerResponseFingerprint:
            providerResult.responseFingerprint,

          providerInitiatedAt:
            FieldValue.serverTimestamp(),

          providerExpiresAt:
            providerResult.expiresAtMs ===
              null
              ? null
              : new Date(
                  providerResult.expiresAtMs,
                ),

          updatedAt:
            FieldValue.serverTimestamp(),
        },
      );

      return false;
    },
  );
}

/**
 * Creates the authoritative deposit request, calls the
 * configured provider adapter and records only the safe,
 * provider-controlled initiation result.
 *
 * This function never credits a financial account.
 * Settlement remains callback-only.
 */
export async function initiateDepositProvider(
  input:
    InitiateDepositProviderInput,
): Promise<
  DepositProviderInitiationResult
> {
  assertProviderRouteSupported(
    input.providerCode,
    input.rail,
    input.asset,
  );

  const deposit =
    await createPendingDepositRequest({
      uid:
        input.uid,

      clientOperationId:
        input.clientOperationId,

      asset:
        input.asset,

      rail:
        input.rail,

      providerCode:
        input.providerCode,

      amountAtomic:
        input.amountAtomic,
    });

  const {
    adapter,
    providerInput,
  } =
    createProviderInput(
      input,
      deposit,
    );

  const providerResult =
    await adapter.initiateDeposit(
      providerInput,
    );

  assertProviderResult(
    providerResult,
    input,
    deposit.requestId,
  );

  const storedIdempotently =
    await persistProviderInitiation(
      input,
      deposit,
      providerResult,
    );

  return {
    success:
      true,

    idempotent:
      deposit.idempotent ||
      storedIdempotently,

    deposit,

    provider:
      providerResult,
  };
}

export type {
  ProviderCustomerAction,
  ProviderOperationStatus,
};
