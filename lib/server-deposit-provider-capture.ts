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
  getConfiguredPaymentProvider,
} from '@/lib/server-payment-provider-registry';

import type {
  PaymentProviderCode,
  ProviderDepositCaptureResult,
} from '@/lib/server-payment-provider-types';

const DEPOSIT_REQUEST_COLLECTION =
  'deposit_requests';

const MAX_REQUEST_ID_LENGTH =
  200;

type ProviderCaptureStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED';

type StoredDepositRequest = {
  requestId?:
    unknown;

  uid?:
    unknown;

  asset?:
    unknown;

  rail?:
    unknown;

  providerCode?:
    unknown;

  status?:
    unknown;

  settlementStatus?:
    unknown;

  credited?:
    unknown;

  providerInitiationStatus?:
    unknown;

  providerRequestId?:
    unknown;

  providerOperationStatus?:
    unknown;

  providerTransactionId?:
    unknown;

  providerCaptureOperationId?:
    unknown;

  providerCaptureStatus?:
    unknown;

  providerCaptureResponseFingerprint?:
    unknown;
};

export type CaptureDepositProviderInput = {
  /**
   * Authenticated Firebase UID.
   *
   * This must come only from a verified Firebase token.
   */
  uid:
    string;

  /**
   * PHCL server-generated deposit request identifier.
   */
  requestId:
    string;
};

export type CaptureDepositProviderResult = {
  success:
    true;

  idempotent:
    boolean;

  capture:
    ProviderDepositCaptureResult;
};

function normalizeUid(
  value:
    unknown,
): string {
  if (
    typeof value !==
      'string'
  ) {
    throw new Error(
      'DEPOSIT_CAPTURE_ACCOUNT_INVALID',
    );
  }

  const uid =
    value.trim();

  if (
    !uid ||
    uid.length > 128 ||
    uid.includes('/')
  ) {
    throw new Error(
      'DEPOSIT_CAPTURE_ACCOUNT_INVALID',
    );
  }

  return uid;
}

function normalizeRequestId(
  value:
    unknown,
): string {
  if (
    typeof value !==
      'string'
  ) {
    throw new Error(
      'DEPOSIT_CAPTURE_REQUEST_ID_INVALID',
    );
  }

  const requestId =
    value.trim();

  if (
    !requestId ||
    requestId.length >
      MAX_REQUEST_ID_LENGTH ||
    !/^deposit_[a-f0-9]{64}$/.test(
      requestId,
    )
  ) {
    throw new Error(
      'DEPOSIT_CAPTURE_REQUEST_ID_INVALID',
    );
  }

  return requestId;
}

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

function normalizeCaptureStatus(
  value:
    unknown,
): ProviderCaptureStatus {
  if (
    value !== 'PENDING' &&
    value !== 'SUCCESS' &&
    value !== 'FAILED'
  ) {
    throw new Error(
      'DEPOSIT_CAPTURE_RECORD_INVALID',
    );
  }

  return value;
}

function createCaptureOperationId(
  requestId:
    string,
): string {
  const digest =
    createHash(
      'sha256',
    )
      .update(
        [
          'phcl_paypal_capture_v1',
          requestId,
        ].join('|'),
        'utf8',
      )
      .digest(
        'hex',
      );

  /*
   * PayPal-Request-Id accepts this deterministic value.
   * Repeated capture attempts reuse exactly the same ID.
   */
  return `paypal_capture_${digest}`;
}

function assertAuthoritativeRequest(
  stored:
    StoredDepositRequest,

  uid:
    string,

  requestId:
    string,
): string {
  if (
    normalizeStoredString(
      stored.requestId,
      'DEPOSIT_CAPTURE_RECORD_INVALID',
    ) !== requestId
  ) {
    throw new Error(
      'DEPOSIT_CAPTURE_REQUEST_IDENTITY_MISMATCH',
    );
  }

  if (
    normalizeStoredString(
      stored.uid,
      'DEPOSIT_CAPTURE_RECORD_INVALID',
    ) !== uid
  ) {
    throw new Error(
      'DEPOSIT_CAPTURE_ACCOUNT_MISMATCH',
    );
  }

  if (
    stored.providerCode !==
      'PAYPAL' ||
    stored.asset !==
      'USD' ||
    stored.rail !==
      'DIGITAL_WALLET'
  ) {
    throw new Error(
      'DEPOSIT_CAPTURE_ROUTE_NOT_SUPPORTED',
    );
  }

  if (
    stored.status !==
      'PENDING_PROVIDER_INITIATION'
  ) {
    throw new Error(
      'DEPOSIT_CAPTURE_REQUEST_STATE_INVALID',
    );
  }

  if (
    stored.providerInitiationStatus !==
      'INITIATED'
  ) {
    throw new Error(
      'DEPOSIT_CAPTURE_PROVIDER_NOT_INITIATED',
    );
  }

  if (
    stored.credited !==
      false
  ) {
    throw new Error(
      'DEPOSIT_CAPTURE_CREDIT_STATE_INVALID',
    );
  }

  if (
    stored.settlementStatus !==
      'NOT_STARTED'
  ) {
    throw new Error(
      'DEPOSIT_CAPTURE_ALREADY_SETTLED',
    );
  }

  return normalizeStoredString(
    stored.providerRequestId,
    'DEPOSIT_CAPTURE_PROVIDER_REFERENCE_INVALID',
  );
}

function validateCaptureResult(
  result:
    ProviderDepositCaptureResult,

  requestId:
    string,

  operationId:
    string,

  providerRequestId:
    string,
): void {
  if (
    result.success !==
      true ||
    result.providerCode !==
      'PAYPAL' ||
    result.environment !==
      'SANDBOX' ||
    result.requestId !==
      requestId ||
    result.operationId !==
      operationId ||
    result.providerRequestId !==
      providerRequestId
  ) {
    throw new Error(
      'DEPOSIT_CAPTURE_PROVIDER_RESULT_INVALID',
    );
  }

  if (
    result.status !==
      'PENDING' &&
    result.status !==
      'SUCCESS' &&
    result.status !==
      'FAILED'
  ) {
    throw new Error(
      'DEPOSIT_CAPTURE_PROVIDER_RESULT_INVALID',
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
      'DEPOSIT_CAPTURE_PROVIDER_RESULT_INVALID',
    );
  }

  if (
    result.status ===
      'SUCCESS' &&
    result.providerTransactionId ===
      null
  ) {
    throw new Error(
      'DEPOSIT_CAPTURE_PROVIDER_RESULT_INVALID',
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
      'DEPOSIT_CAPTURE_PROVIDER_RESULT_INVALID',
    );
  }
}

function readExistingCapture(
  stored:
    StoredDepositRequest,

  requestId:
    string,

  operationId:
    string,

  providerRequestId:
    string,
): ProviderDepositCaptureResult | null {
  if (
    stored.providerCaptureStatus ===
      undefined
  ) {
    return null;
  }

  const storedOperationId =
    normalizeStoredString(
      stored.providerCaptureOperationId,
      'DEPOSIT_CAPTURE_RECORD_INVALID',
    );

  const storedFingerprint =
    normalizeStoredString(
      stored.providerCaptureResponseFingerprint,
      'DEPOSIT_CAPTURE_RECORD_INVALID',
    );

  const status =
    normalizeCaptureStatus(
      stored.providerCaptureStatus,
    );

  if (
    storedOperationId !==
      operationId
  ) {
    throw new Error(
      'DEPOSIT_CAPTURE_OPERATION_CONFLICT',
    );
  }

  const providerTransactionId =
    readOptionalStoredString(
      stored.providerTransactionId,
    );

  if (
    status ===
      'SUCCESS' &&
    providerTransactionId ===
      null
  ) {
    throw new Error(
      'DEPOSIT_CAPTURE_RECORD_INVALID',
    );
  }

  return {
    success:
      true,

    providerCode:
      'PAYPAL',

    environment:
      'SANDBOX',

    requestId,

    operationId,

    providerRequestId,

    providerTransactionId,

    status,

    responseFingerprint:
      storedFingerprint,
  };
}

async function loadCaptureRequest(
  uid:
    string,

  requestId:
    string,
): Promise<{
  providerRequestId:
    string;

  operationId:
    string;

  existingCapture:
    ProviderDepositCaptureResult | null;
}> {
  const documentReference =
    adminDb
      .collection(
        DEPOSIT_REQUEST_COLLECTION,
      )
      .doc(
        requestId,
      );

  const snapshot =
    await documentReference.get();

  if (!snapshot.exists) {
    throw new Error(
      'DEPOSIT_CAPTURE_REQUEST_NOT_FOUND',
    );
  }

  const stored =
    snapshot.data() as
      StoredDepositRequest;

  const providerRequestId =
    assertAuthoritativeRequest(
      stored,
      uid,
      requestId,
    );

  const operationId =
    createCaptureOperationId(
      requestId,
    );

  return {
    providerRequestId,

    operationId,

    existingCapture:
      readExistingCapture(
        stored,
        requestId,
        operationId,
        providerRequestId,
      ),
  };
}

async function persistCaptureResult(
  uid:
    string,

  requestId:
    string,

  operationId:
    string,

  providerRequestId:
    string,

  result:
    ProviderDepositCaptureResult,
): Promise<boolean> {
  const documentReference =
    adminDb
      .collection(
        DEPOSIT_REQUEST_COLLECTION,
      )
      .doc(
        requestId,
      );

  return adminDb.runTransaction(
    async (
      transaction,
    ) => {
      const snapshot =
        await transaction.get(
          documentReference,
        );

      if (!snapshot.exists) {
        throw new Error(
          'DEPOSIT_CAPTURE_REQUEST_NOT_FOUND',
        );
      }

      const stored =
        snapshot.data() as
          StoredDepositRequest;

      const currentProviderRequestId =
        assertAuthoritativeRequest(
          stored,
          uid,
          requestId,
        );

      if (
        currentProviderRequestId !==
          providerRequestId
      ) {
        throw new Error(
          'DEPOSIT_CAPTURE_PROVIDER_REFERENCE_CONFLICT',
        );
      }

      const existingCapture =
        readExistingCapture(
          stored,
          requestId,
          operationId,
          providerRequestId,
        );

      if (
        existingCapture &&
        (
          existingCapture.status ===
            'SUCCESS' ||
          existingCapture.status ===
            'FAILED'
        )
      ) {
        if (
          existingCapture.status !==
            result.status ||
          existingCapture
            .providerTransactionId !==
            result.providerTransactionId
        ) {
          throw new Error(
            'DEPOSIT_CAPTURE_RESULT_CONFLICT',
          );
        }

        return true;
      }

      transaction.update(
        documentReference,
        {
          providerCaptureOperationId:
            operationId,

          providerCaptureStatus:
            result.status,

          providerCaptureResponseFingerprint:
            result.responseFingerprint,

          /*
           * This is provider state only.
           * It is not proof of PHCL settlement.
           */
          providerOperationStatus:
            result.status,

          providerTransactionId:
            result.providerTransactionId,

          providerCaptureRecordedAt:
            FieldValue.serverTimestamp(),

          updatedAt:
            FieldValue.serverTimestamp(),
        },
      );

      return false;
    },
  );
}

/**
 * Captures an already-created PayPal order.
 *
 * Security guarantees:
 *
 * - UID comes from verified Firebase authentication.
 * - PayPal order ID comes from Firestore, never the browser.
 * - Capture idempotency key is generated by PHCL.
 * - No financial balance or ledger entry is modified.
 * - Settlement remains dependent on a verified callback.
 */
export async function captureDepositProvider(
  rawInput:
    CaptureDepositProviderInput,
): Promise<
  CaptureDepositProviderResult
> {
  const uid =
    normalizeUid(
      rawInput.uid,
    );

  const requestId =
    normalizeRequestId(
      rawInput.requestId,
    );

  const storedRequest =
    await loadCaptureRequest(
      uid,
      requestId,
    );

  if (
    storedRequest.existingCapture &&
    (
      storedRequest
        .existingCapture
        .status ===
          'SUCCESS' ||
      storedRequest
        .existingCapture
        .status ===
          'FAILED'
    )
  ) {
    return {
      success:
        true,

      idempotent:
        true,

      capture:
        storedRequest
          .existingCapture,
    };
  }

  const providerCode:
    PaymentProviderCode =
    'PAYPAL';

  const adapter =
    getConfiguredPaymentProvider(
      providerCode,
    );

  if (
    adapter.environment !==
      'SANDBOX' ||
    typeof adapter.captureDeposit !==
      'function'
  ) {
    throw new Error(
      'DEPOSIT_CAPTURE_PROVIDER_NOT_CONFIGURED',
    );
  }

  const providerResult =
    await adapter.captureDeposit({
      requestId,

      operationId:
        storedRequest.operationId,

      providerCode,

      environment:
        adapter.environment,

      providerRequestId:
        storedRequest
          .providerRequestId,
    });

  validateCaptureResult(
    providerResult,
    requestId,
    storedRequest.operationId,
    storedRequest.providerRequestId,
  );

  const storedIdempotently =
    await persistCaptureResult(
      uid,
      requestId,
      storedRequest.operationId,
      storedRequest.providerRequestId,
      providerResult,
    );

  return {
    success:
      true,

    idempotent:
      storedIdempotently,

    capture:
      providerResult,
  };
}