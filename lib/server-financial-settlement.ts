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
  commitPreparedFinancialMutation,
  prepareFinancialMutationInTransaction,
  type FinancialAsset,
  type FinancialMutationResult,
} from '@/lib/server-financial-ledger';

const DEPOSIT_REQUEST_COLLECTION =
  'deposit_requests';

const WITHDRAWAL_REQUEST_COLLECTION =
  'withdrawal_requests';

const PROVIDER_CALLBACK_EVENT_COLLECTION =
  'provider_callback_events';

const FINANCIAL_SETTLEMENT_AUDIT_COLLECTION =
  'financial_settlement_audit';

const MAX_IDENTIFIER_LENGTH =
  200;

const MAX_PROVIDER_CODE_LENGTH =
  40;

const MAX_REASON_LENGTH =
  500;

export type FinancialSettlementKind =
  | 'DEPOSIT'
  | 'WITHDRAWAL';

export type ProviderSettlementOutcome =
  | 'SUCCESS'
  | 'PENDING'
  | 'FAILED';

export type ProcessProviderSettlementInput = {
  kind:
    FinancialSettlementKind;

  requestId:
    string;

  providerCode:
    string;

  providerEventId:
    string;

  providerTransactionId?:
    string | null;

  outcome:
    ProviderSettlementOutcome;

  failureReason?:
    string | null;
};

export type ProviderSettlementResult = {
  success:
    true;

  idempotent:
    boolean;

  kind:
    FinancialSettlementKind;

  requestId:
    string;

  providerCode:
    string;

  providerEventId:
    string;

  providerTransactionId:
    string | null;

  outcome:
    ProviderSettlementOutcome;

  settlementStatus:
    | 'PENDING'
    | 'COMPLETED'
    | 'FAILED';

  financialOperationId:
    string | null;

  ledgerEntryId:
    string | null;
};

type StoredSettlementRequest = {
  requestId?:
    unknown;

  uid?:
    unknown;

  asset?:
    unknown;

  providerCode?:
    unknown;

  amountAtomic?:
    unknown;

  status?:
    unknown;

  providerStatus?:
    unknown;

  settlementStatus?:
    unknown;

  providerTransactionId?:
    unknown;

  financialOperationId?:
    unknown;

  ledgerEntryId?:
    unknown;

  credited?:
    unknown;

  debited?:
    unknown;
};

type StoredCallbackEvent = {
  fingerprint?:
    unknown;

  kind?:
    unknown;

  requestId?:
    unknown;

  providerCode?:
    unknown;

  providerEventId?:
    unknown;

  providerTransactionId?:
    unknown;

  outcome?:
    unknown;

  settlementStatus?:
    unknown;

  financialOperationId?:
    unknown;

  ledgerEntryId?:
    unknown;
};

type NormalizedSettlementInput = {
  kind:
    FinancialSettlementKind;

  requestId:
    string;

  providerCode:
    string;

  providerEventId:
    string;

  providerTransactionId:
    string | null;

  outcome:
    ProviderSettlementOutcome;

  failureReason:
    string | null;
};

type ValidatedSettlementRequest = {
  uid:
    string;

  asset:
    FinancialAsset;

  amountAtomic:
    string;

  providerCode:
    string;

  settlementStatus:
    string;

  providerTransactionId:
    string | null;
};

function normalizeIdentifier(
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

  if (
    !normalized ||
    normalized.length >
      MAX_IDENTIFIER_LENGTH ||
    !/^[A-Za-z0-9._:-]+$/.test(
      normalized,
    )
  ) {
    throw new Error(
      errorCode,
    );
  }

  return normalized;
}

function normalizeOptionalIdentifier(
  value:
    unknown,
  errorCode:
    string,
): string | null {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  return normalizeIdentifier(
    value,
    errorCode,
  );
}

function normalizeProviderCode(
  value:
    unknown,
): string {
  const normalized =
    normalizeIdentifier(
      value,
      'INVALID_PROVIDER_CODE',
    ).toUpperCase();

  if (
    normalized.length >
      MAX_PROVIDER_CODE_LENGTH
  ) {
    throw new Error(
      'INVALID_PROVIDER_CODE',
    );
  }

  return normalized;
}

function normalizeKind(
  value:
    unknown,
): FinancialSettlementKind {
  if (
    value !== 'DEPOSIT' &&
    value !== 'WITHDRAWAL'
  ) {
    throw new Error(
      'INVALID_SETTLEMENT_KIND',
    );
  }

  return value;
}

function normalizeOutcome(
  value:
    unknown,
): ProviderSettlementOutcome {
  if (
    value !== 'SUCCESS' &&
    value !== 'PENDING' &&
    value !== 'FAILED'
  ) {
    throw new Error(
      'INVALID_PROVIDER_OUTCOME',
    );
  }

  return value;
}

function normalizeFailureReason(
  value:
    unknown,
): string | null {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  if (
    typeof value !==
      'string'
  ) {
    throw new Error(
      'INVALID_FAILURE_REASON',
    );
  }

  const normalized =
    value
      .trim()
      .slice(
        0,
        MAX_REASON_LENGTH,
      );

  return normalized || null;
}

function normalizeInput(
  input:
    ProcessProviderSettlementInput,
): NormalizedSettlementInput {
  const outcome =
    normalizeOutcome(
      input.outcome,
    );

  const providerTransactionId =
    normalizeOptionalIdentifier(
      input.providerTransactionId,
      'INVALID_PROVIDER_TRANSACTION_ID',
    );

  if (
    outcome === 'SUCCESS' &&
    !providerTransactionId
  ) {
    throw new Error(
      'PROVIDER_TRANSACTION_ID_REQUIRED',
    );
  }

  return {
    kind:
      normalizeKind(
        input.kind,
      ),

    requestId:
      normalizeIdentifier(
        input.requestId,
        'INVALID_SETTLEMENT_REQUEST_ID',
      ),

    providerCode:
      normalizeProviderCode(
        input.providerCode,
      ),

    providerEventId:
      normalizeIdentifier(
        input.providerEventId,
        'INVALID_PROVIDER_EVENT_ID',
      ),

    providerTransactionId,

    outcome,

    failureReason:
      normalizeFailureReason(
        input.failureReason,
      ),
  };
}

function normalizeStoredProviderCode(
  value:
    unknown,
): string {
  if (
    typeof value !==
      'string'
  ) {
    throw new Error(
      'SETTLEMENT_REQUEST_INVALID',
    );
  }

  return normalizeProviderCode(
    value,
  );
}

function normalizeStoredUid(
  value:
    unknown,
): string {
  return normalizeIdentifier(
    value,
    'SETTLEMENT_REQUEST_INVALID',
  );
}

function normalizeStoredAsset(
  value:
    unknown,
): FinancialAsset {
  if (
    typeof value !==
      'string' ||
    !FINANCIAL_ASSETS.includes(
      value as FinancialAsset,
    )
  ) {
    throw new Error(
      'SETTLEMENT_REQUEST_INVALID',
    );
  }

  return value as
    FinancialAsset;
}

function normalizeStoredAtomicAmount(
  value:
    unknown,
): string {
  if (
    typeof value !==
      'string' ||
    !/^[1-9]\d*$/.test(
      value,
    )
  ) {
    throw new Error(
      'SETTLEMENT_REQUEST_INVALID',
    );
  }

  return BigInt(
    value,
  ).toString();
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

function validateSettlementRequest(
  data:
    StoredSettlementRequest,
  input:
    NormalizedSettlementInput,
): ValidatedSettlementRequest {
  const requestId =
    normalizeIdentifier(
      data.requestId,
      'SETTLEMENT_REQUEST_INVALID',
    );

  if (
    requestId !==
      input.requestId
  ) {
    throw new Error(
      'SETTLEMENT_REQUEST_IDENTITY_MISMATCH',
    );
  }

  const providerCode =
    normalizeStoredProviderCode(
      data.providerCode,
    );

  if (
    providerCode !==
      input.providerCode
  ) {
    throw new Error(
      'SETTLEMENT_PROVIDER_MISMATCH',
    );
  }

  return {
    uid:
      normalizeStoredUid(
        data.uid,
      ),

    asset:
      normalizeStoredAsset(
        data.asset,
      ),

    amountAtomic:
      normalizeStoredAtomicAmount(
        data.amountAtomic,
      ),

    providerCode,

    settlementStatus:
      readOptionalStoredString(
        data.settlementStatus,
      ) ?? 'NOT_STARTED',

    providerTransactionId:
      readOptionalStoredString(
        data.providerTransactionId,
      ),
  };
}

function createSha256(
  value:
    string,
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

function createCallbackDocumentId(
  providerCode:
    string,
  providerEventId:
    string,
): string {
  return createSha256(
    [
      'provider_callback_v1',
      providerCode,
      providerEventId,
    ].join('|'),
  );
}

function createAuditDocumentId(
  callbackDocumentId:
    string,
): string {
  return createSha256(
    [
      'settlement_audit_v1',
      callbackDocumentId,
    ].join('|'),
  );
}

function createFinancialOperationId(
  kind:
    FinancialSettlementKind,
  requestId:
    string,
): string {
  return [
    'settlement',
    kind.toLowerCase(),
    createSha256(
      requestId,
    ),
  ].join(':');
}

function createCallbackFingerprint(
  input:
    NormalizedSettlementInput,
): string {
  return createSha256(
    JSON.stringify({
      version:
        1,

      kind:
        input.kind,

      requestId:
        input.requestId,

      providerCode:
        input.providerCode,

      providerEventId:
        input.providerEventId,

      providerTransactionId:
        input.providerTransactionId,

      outcome:
        input.outcome,

      failureReason:
        input.failureReason,
    }),
  );
}

function getSettlementStatus(
  outcome:
    ProviderSettlementOutcome,
): ProviderSettlementResult[
  'settlementStatus'
] {
  switch (
    outcome
  ) {
    case 'SUCCESS':
      return 'COMPLETED';

    case 'FAILED':
      return 'FAILED';

    case 'PENDING':
      return 'PENDING';
  }
}

function readExistingCallbackResult(
  data:
    StoredCallbackEvent,
  fingerprint:
    string,
): ProviderSettlementResult {
  if (
    data.fingerprint !==
      fingerprint
  ) {
    throw new Error(
      'PROVIDER_EVENT_REPLAY_CONFLICT',
    );
  }

  if (
    data.kind !== 'DEPOSIT' &&
    data.kind !== 'WITHDRAWAL'
  ) {
    throw new Error(
      'CALLBACK_EVENT_RECORD_INVALID',
    );
  }

  if (
    data.outcome !== 'SUCCESS' &&
    data.outcome !== 'PENDING' &&
    data.outcome !== 'FAILED'
  ) {
    throw new Error(
      'CALLBACK_EVENT_RECORD_INVALID',
    );
  }

  if (
    data.settlementStatus !==
      'PENDING' &&
    data.settlementStatus !==
      'COMPLETED' &&
    data.settlementStatus !==
      'FAILED'
  ) {
    throw new Error(
      'CALLBACK_EVENT_RECORD_INVALID',
    );
  }

  return {
    success:
      true,

    idempotent:
      true,

    kind:
      data.kind,

    requestId:
      normalizeIdentifier(
        data.requestId,
        'CALLBACK_EVENT_RECORD_INVALID',
      ),

    providerCode:
      normalizeProviderCode(
        data.providerCode,
      ),

    providerEventId:
      normalizeIdentifier(
        data.providerEventId,
        'CALLBACK_EVENT_RECORD_INVALID',
      ),

    providerTransactionId:
      readOptionalStoredString(
        data.providerTransactionId,
      ),

    outcome:
      data.outcome,

    settlementStatus:
      data.settlementStatus,

    financialOperationId:
      readOptionalStoredString(
        data.financialOperationId,
      ),

    ledgerEntryId:
      readOptionalStoredString(
        data.ledgerEntryId,
      ),
  };
}

function assertAllowedTransition(
  request:
    ValidatedSettlementRequest,
  input:
    NormalizedSettlementInput,
) {
  if (
    request.settlementStatus ===
      'COMPLETED' ||
    request.settlementStatus ===
      'FAILED'
  ) {
    throw new Error(
      'SETTLEMENT_ALREADY_FINALIZED',
    );
  }

  if (
    request.providerTransactionId &&
    input.providerTransactionId &&
    request.providerTransactionId !==
      input.providerTransactionId
  ) {
    throw new Error(
      'PROVIDER_TRANSACTION_CONFLICT',
    );
  }
}

function writeCallbackAndAudit(
  transaction:
    FirebaseFirestore.Transaction,

  options: {
    callbackReference:
      FirebaseFirestore.DocumentReference;

    auditReference:
      FirebaseFirestore.DocumentReference;

    callbackDocumentId:
      string;

    fingerprint:
      string;

    input:
      NormalizedSettlementInput;

    request:
      ValidatedSettlementRequest;

    result:
      ProviderSettlementResult;
  },
) {
  const {
    callbackReference,
    auditReference,
    callbackDocumentId,
    fingerprint,
    input,
    request,
    result,
  } =
    options;

  transaction.create(
    callbackReference,
    {
      callbackEventId:
        callbackDocumentId,

      fingerprint,

      kind:
        input.kind,

      requestId:
        input.requestId,

      uid:
        request.uid,

      providerCode:
        input.providerCode,

      providerEventId:
        input.providerEventId,

      providerTransactionId:
        input.providerTransactionId,

      outcome:
        input.outcome,

      settlementStatus:
        result.settlementStatus,

      financialOperationId:
        result.financialOperationId,

      ledgerEntryId:
        result.ledgerEntryId,

      processedAt:
        FieldValue.serverTimestamp(),

      createdAt:
        FieldValue.serverTimestamp(),
    },
  );

  transaction.create(
    auditReference,
    {
      auditId:
        auditReference.id,

      action:
        'PROVIDER_SETTLEMENT_CALLBACK',

      callbackEventId:
        callbackDocumentId,

      kind:
        input.kind,

      requestId:
        input.requestId,

      uid:
        request.uid,

      asset:
        request.asset,

      amountAtomic:
        request.amountAtomic,

      providerCode:
        input.providerCode,

      providerEventId:
        input.providerEventId,

      providerTransactionId:
        input.providerTransactionId,

      outcome:
        input.outcome,

      settlementStatus:
        result.settlementStatus,

      failureReason:
        input.failureReason,

      financialOperationId:
        result.financialOperationId,

      ledgerEntryId:
        result.ledgerEntryId,

      createdAt:
        FieldValue.serverTimestamp(),
    },
  );
}

function createRequestUpdate(
  input:
    NormalizedSettlementInput,
  result:
    ProviderSettlementResult,
): Record<
  string,
  unknown
> {
  const common = {
    providerStatus:
      input.outcome,

    settlementStatus:
      result.settlementStatus,

    providerTransactionId:
      input.providerTransactionId,

    lastProviderEventId:
      input.providerEventId,

    failureReason:
      input.outcome ===
        'FAILED'
        ? input.failureReason
        : null,

    financialOperationId:
      result.financialOperationId,

    ledgerEntryId:
      result.ledgerEntryId,

    updatedAt:
      FieldValue.serverTimestamp(),
  };

  if (
    input.outcome ===
      'PENDING'
  ) {
    return common;
  }

  if (
    input.outcome ===
      'FAILED'
  ) {
    return {
      ...common,

      status:
        'FAILED',

      failedAt:
        FieldValue.serverTimestamp(),
    };
  }

  if (
    input.kind ===
      'DEPOSIT'
  ) {
    return {
      ...common,

      status:
        'COMPLETED',

      credited:
        true,

      creditedAt:
        FieldValue.serverTimestamp(),

      settledAt:
        FieldValue.serverTimestamp(),
    };
  }

  return {
    ...common,

    status:
      'COMPLETED',

    debited:
      true,

    debitedAt:
      FieldValue.serverTimestamp(),

    settledAt:
      FieldValue.serverTimestamp(),
  };
}

/**
 * Applies a provider-confirmed financial settlement.
 *
 * SECURITY REQUIREMENTS:
 *
 * This function must only be called AFTER the HTTP callback
 * boundary has independently verified:
 *
 * - provider signature or MAC;
 * - callback timestamp;
 * - allowed clock skew;
 * - provider identity;
 * - exact raw request body.
 *
 * Never pass browser-controlled settlement claims directly
 * to this function.
 *
 * SUCCESS:
 *
 * - DEPOSIT credits the authoritative financial account.
 * - WITHDRAWAL debits the authoritative financial account.
 *
 * PENDING and FAILED do not mutate balances.
 *
 * The callback event, request state, financial operation,
 * immutable ledger entry and audit record are committed in
 * one Firestore transaction.
 */
export async function processProviderSettlement(
  rawInput:
    ProcessProviderSettlementInput,
): Promise<ProviderSettlementResult> {
  const input =
    normalizeInput(
      rawInput,
    );

  const requestCollection =
    input.kind ===
      'DEPOSIT'
      ? DEPOSIT_REQUEST_COLLECTION
      : WITHDRAWAL_REQUEST_COLLECTION;

  const callbackDocumentId =
    createCallbackDocumentId(
      input.providerCode,
      input.providerEventId,
    );

  const fingerprint =
    createCallbackFingerprint(
      input,
    );

  const requestReference =
    adminDb
      .collection(
        requestCollection,
      )
      .doc(
        input.requestId,
      );

  const callbackReference =
    adminDb
      .collection(
        PROVIDER_CALLBACK_EVENT_COLLECTION,
      )
      .doc(
        callbackDocumentId,
      );

  const auditReference =
    adminDb
      .collection(
        FINANCIAL_SETTLEMENT_AUDIT_COLLECTION,
      )
      .doc(
        createAuditDocumentId(
          callbackDocumentId,
        ),
      );

  return adminDb.runTransaction(
    async (
      transaction,
    ) => {
      /*
       * Firestore requires transaction reads to happen
       * before writes.
       */
      const [
        callbackSnapshot,
        requestSnapshot,
      ] =
        await Promise.all([
          transaction.get(
            callbackReference,
          ),

          transaction.get(
            requestReference,
          ),
        ]);

      if (
        callbackSnapshot.exists
      ) {
        return readExistingCallbackResult(
          callbackSnapshot.data() as
            StoredCallbackEvent,
          fingerprint,
        );
      }

      if (
        !requestSnapshot.exists
      ) {
        throw new Error(
          'SETTLEMENT_REQUEST_NOT_FOUND',
        );
      }

      const request =
        validateSettlementRequest(
          requestSnapshot.data() as
            StoredSettlementRequest,
          input,
        );

      assertAllowedTransition(
        request,
        input,
      );

      const settlementStatus =
        getSettlementStatus(
          input.outcome,
        );

      if (
        input.outcome !==
          'SUCCESS'
      ) {
        const result:
          ProviderSettlementResult = {
          success:
            true,

          idempotent:
            false,

          kind:
            input.kind,

          requestId:
            input.requestId,

          providerCode:
            input.providerCode,

          providerEventId:
            input.providerEventId,

          providerTransactionId:
            input.providerTransactionId,

          outcome:
            input.outcome,

          settlementStatus,

          financialOperationId:
            null,

          ledgerEntryId:
            null,
        };

        transaction.update(
          requestReference,
          createRequestUpdate(
            input,
            result,
          ),
        );

        writeCallbackAndAudit(
          transaction,
          {
            callbackReference,
            auditReference,
            callbackDocumentId,
            fingerprint,
            input,
            request,
            result,
          },
        );

        return result;
      }

      const financialOperationId =
        createFinancialOperationId(
          input.kind,
          input.requestId,
        );

      const direction =
        input.kind ===
          'DEPOSIT'
          ? 'CREDIT'
          : 'DEBIT';

      const preparedMutation =
        await prepareFinancialMutationInTransaction(
          transaction,
          {
            operationId:
              financialOperationId,

            uid:
              request.uid,

            operationType:
              input.kind,

            asset:
              request.asset,

            direction,

            amountAtomic:
              request.amountAtomic,

            description:
              input.kind ===
                'DEPOSIT'
                ? 'Provider-confirmed deposit settlement.'
                : 'Provider-confirmed withdrawal settlement.',

            metadata: {
              settlementKind:
                input.kind,

              requestId:
                input.requestId,

              providerCode:
                input.providerCode,

              providerEventId:
                input.providerEventId,

              providerTransactionId:
                input.providerTransactionId,
            },
          },
        );

      const financialResult:
        FinancialMutationResult =
        commitPreparedFinancialMutation(
          transaction,
          preparedMutation,
        );

      const result:
        ProviderSettlementResult = {
        success:
          true,

        idempotent:
          preparedMutation.idempotent,

        kind:
          input.kind,

        requestId:
          input.requestId,

        providerCode:
          input.providerCode,

        providerEventId:
          input.providerEventId,

        providerTransactionId:
          input.providerTransactionId,

        outcome:
          input.outcome,

        settlementStatus:
          'COMPLETED',

        financialOperationId,

        ledgerEntryId:
          financialResult.ledgerEntryId,
      };

      transaction.update(
        requestReference,
        createRequestUpdate(
          input,
          result,
        ),
      );

      writeCallbackAndAudit(
        transaction,
        {
          callbackReference,
          auditReference,
          callbackDocumentId,
          fingerprint,
          input,
          request,
          result,
        },
      );

      return result;
    },
  );
}