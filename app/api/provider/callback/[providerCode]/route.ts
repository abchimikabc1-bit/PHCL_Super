import 'server-only';

import {
  NextResponse,
} from 'next/server';

import {
  processProviderSettlement,
  type FinancialSettlementKind,
  type ProviderSettlementOutcome,
} from '@/lib/server-financial-settlement';

import {
  verifyProviderCallbackRequest,
} from '@/lib/server-provider-callback-security';

export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';

const ALLOWED_PAYLOAD_KEYS =
  new Set([
    'kind',
    'requestId',
    'providerEventId',
    'providerTransactionId',
    'outcome',
    'failureReason',
  ]);

type RouteContext = {
  params:
    Promise<{
      providerCode:
        string;
    }>;
};

type CanonicalProviderPayload = {
  kind:
    FinancialSettlementKind;

  requestId:
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

function noStoreJson(
  body:
    unknown,
  status:
    number,
) {
  return NextResponse.json(
    body,
    {
      status,

      headers: {
        'Cache-Control':
          'no-store, max-age=0',

        Pragma:
          'no-cache',

        'X-Content-Type-Options':
          'nosniff',
      },
    },
  );
}

function isPlainObject(
  value:
    unknown,
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

function assertOnlyAllowedKeys(
  payload:
    Record<
      string,
      unknown
    >,
) {
  for (
    const key of
      Object.keys(
        payload,
      )
  ) {
    if (
      !ALLOWED_PAYLOAD_KEYS.has(
        key,
      )
    ) {
      throw new Error(
        'INVALID_CALLBACK_PAYLOAD',
      );
    }
  }
}

function normalizeRequiredString(
  value:
    unknown,
): string {
  if (
    typeof value !==
      'string'
  ) {
    throw new Error(
      'INVALID_CALLBACK_PAYLOAD',
    );
  }

  const normalized =
    value.trim();

  if (
    !normalized
  ) {
    throw new Error(
      'INVALID_CALLBACK_PAYLOAD',
    );
  }

  return normalized;
}

function normalizeOptionalString(
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
      'INVALID_CALLBACK_PAYLOAD',
    );
  }

  const normalized =
    value.trim();

  return normalized || null;
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
      'INVALID_CALLBACK_PAYLOAD',
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
      'INVALID_CALLBACK_PAYLOAD',
    );
  }

  return value;
}

function parseCanonicalPayload(
  value:
    unknown,
): CanonicalProviderPayload {
  if (
    !isPlainObject(
      value,
    )
  ) {
    throw new Error(
      'INVALID_CALLBACK_PAYLOAD',
    );
  }

  assertOnlyAllowedKeys(
    value,
  );

  const kind =
    normalizeKind(
      value.kind,
    );

  const requestId =
    normalizeRequiredString(
      value.requestId,
    );

  const providerEventId =
    normalizeRequiredString(
      value.providerEventId,
    );

  const providerTransactionId =
    normalizeOptionalString(
      value.providerTransactionId,
    );

  const outcome =
    normalizeOutcome(
      value.outcome,
    );

  const failureReason =
    normalizeOptionalString(
      value.failureReason,
    );

  if (
    outcome === 'SUCCESS' &&
    !providerTransactionId
  ) {
    throw new Error(
      'INVALID_CALLBACK_PAYLOAD',
    );
  }

  if (
    outcome !== 'FAILED' &&
    failureReason
  ) {
    throw new Error(
      'INVALID_CALLBACK_PAYLOAD',
    );
  }

  return {
    kind,
    requestId,
    providerEventId,
    providerTransactionId,
    outcome,
    failureReason,
  };
}

function isAuthenticationError(
  errorCode:
    string,
): boolean {
  return (
    errorCode ===
      'CALLBACK_AUTHENTICATION_REQUIRED' ||
    errorCode ===
      'INVALID_CALLBACK_SECURITY_HEADER' ||
    errorCode ===
      'INVALID_CALLBACK_SIGNATURE' ||
    errorCode ===
      'CALLBACK_TIMESTAMP_OUTSIDE_ALLOWED_WINDOW' ||
    errorCode ===
      'INVALID_CALLBACK_TIMESTAMP' ||
    errorCode ===
      'INVALID_CALLBACK_PROVIDER'
  );
}

function isConfigurationError(
  errorCode:
    string,
): boolean {
  return (
    errorCode ===
      'PROVIDER_CALLBACK_SECRET_NOT_CONFIGURED' ||
    errorCode ===
      'PROVIDER_CALLBACK_SECRET_TOO_SHORT' ||
    errorCode ===
      'INVALID_CALLBACK_CLOCK'
  );
}

function isBadRequestError(
  errorCode:
    string,
): boolean {
  return (
    errorCode ===
      'INVALID_CALLBACK_PAYLOAD' ||
    errorCode ===
      'INVALID_CALLBACK_JSON' ||
    errorCode ===
      'CALLBACK_REQUEST_BODY_REQUIRED' ||
    errorCode ===
      'CALLBACK_CONTENT_TYPE_NOT_SUPPORTED' ||
    errorCode ===
      'INVALID_PROVIDER_TRANSACTION_ID' ||
    errorCode ===
      'PROVIDER_TRANSACTION_ID_REQUIRED' ||
    errorCode ===
      'INVALID_PROVIDER_EVENT_ID' ||
    errorCode ===
      'INVALID_SETTLEMENT_REQUEST_ID' ||
    errorCode ===
      'INVALID_SETTLEMENT_KIND' ||
    errorCode ===
      'INVALID_PROVIDER_OUTCOME' ||
    errorCode ===
      'INVALID_FAILURE_REASON'
  );
}

function isConflictError(
  errorCode:
    string,
): boolean {
  return (
    errorCode ===
      'PROVIDER_EVENT_REPLAY_CONFLICT' ||
    errorCode ===
      'SETTLEMENT_ALREADY_FINALIZED' ||
    errorCode ===
      'PROVIDER_TRANSACTION_CONFLICT' ||
    errorCode.includes(
      'Operation ID has already been used',
    ) ||
    errorCode ===
      'Insufficient funds.'
  );
}

/**
 * POST /api/provider/callback/[providerCode]
 *
 * This is a provider-neutral canonical callback
 * boundary.
 *
 * Provider-specific adapters must convert external
 * provider payloads into this canonical JSON:
 *
 * {
 *   "kind": "DEPOSIT" | "WITHDRAWAL",
 *   "requestId": "...",
 *   "providerEventId": "...",
 *   "providerTransactionId": "...",
 *   "outcome": "SUCCESS" | "PENDING" | "FAILED",
 *   "failureReason": "..."
 * }
 *
 * Required headers:
 *
 * Content-Type: application/json
 * X-PHCL-Timestamp: <Unix timestamp seconds>
 * X-PHCL-Signature: sha256=<HMAC-SHA256 hex>
 *
 * The HMAC message is:
 *
 * <timestamp>.<exact raw JSON body>
 *
 * SECURITY:
 *
 * - Provider identity comes from the route parameter.
 * - The raw body is authenticated before JSON parsing.
 * - The browser cannot authorize settlement.
 * - Firebase user authentication is intentionally not
 *   used for provider callbacks.
 * - Settlement and replay prevention happen in one
 *   Firestore transaction.
 */
export async function POST(
  request:
    Request,
  context:
    RouteContext,
) {
  let providerCode:
    string;

  try {
    const params =
      await context.params;

    providerCode =
      normalizeRequiredString(
        params.providerCode,
      );
  } catch {
    return noStoreJson(
      {
        success:
          false,

        code:
          'INVALID_PROVIDER',
      },
      404,
    );
  }

  try {
    const verifiedCallback =
      await verifyProviderCallbackRequest(
        request,
        {
          providerCode,
        },
      );

    const payload =
      parseCanonicalPayload(
        verifiedCallback.payload,
      );

    const result =
      await processProviderSettlement({
        kind:
          payload.kind,

        requestId:
          payload.requestId,

        providerCode:
          verifiedCallback.providerCode,

        providerEventId:
          payload.providerEventId,

        providerTransactionId:
          payload.providerTransactionId,

        outcome:
          payload.outcome,

        failureReason:
          payload.failureReason,
      });

    return noStoreJson(
      {
        success:
          true,

        acknowledged:
          true,

        idempotent:
          result.idempotent,

        kind:
          result.kind,

        requestId:
          result.requestId,

        outcome:
          result.outcome,

        settlementStatus:
          result.settlementStatus,
      },
      200,
    );
  } catch (
    error
  ) {
    const errorCode =
      error instanceof Error
        ? error.message
        : '';

    /*
     * Do not log:
     *
     * - raw callback body;
     * - callback signature;
     * - provider secret;
     * - authorization headers;
     * - customer destination details.
     */

    if (
      isAuthenticationError(
        errorCode,
      )
    ) {
      return noStoreJson(
        {
          success:
            false,

          code:
            'CALLBACK_UNAUTHORIZED',
        },
        401,
      );
    }

    if (
      errorCode ===
        'CALLBACK_REQUEST_TOO_LARGE'
    ) {
      return noStoreJson(
        {
          success:
            false,

          code:
            'CALLBACK_REQUEST_TOO_LARGE',
        },
        413,
      );
    }

    if (
      isBadRequestError(
        errorCode,
      )
    ) {
      return noStoreJson(
        {
          success:
            false,

          code:
            'INVALID_CALLBACK',
        },
        400,
      );
    }

    if (
      errorCode ===
        'SETTLEMENT_REQUEST_NOT_FOUND'
    ) {
      return noStoreJson(
        {
          success:
            false,

          code:
            'SETTLEMENT_REQUEST_NOT_FOUND',
        },
        404,
      );
    }

    if (
      errorCode ===
        'SETTLEMENT_PROVIDER_MISMATCH' ||
      errorCode ===
        'SETTLEMENT_REQUEST_IDENTITY_MISMATCH'
    ) {
      return noStoreJson(
        {
          success:
            false,

          code:
            'CALLBACK_NOT_ALLOWED',
        },
        403,
      );
    }

    if (
      isConflictError(
        errorCode,
      )
    ) {
      return noStoreJson(
        {
          success:
            false,

          code:
            'SETTLEMENT_CONFLICT',
        },
        409,
      );
    }

    if (
      isConfigurationError(
        errorCode,
      )
    ) {
      return noStoreJson(
        {
          success:
            false,

          code:
            'CALLBACK_SERVICE_UNAVAILABLE',
        },
        503,
      );
    }

    return noStoreJson(
      {
        success:
          false,

        code:
          'CALLBACK_PROCESSING_FAILED',
      },
      500,
    );
  }
}

function methodNotAllowed() {
  return noStoreJson(
    {
      success:
        false,

      code:
        'METHOD_NOT_ALLOWED',

      error:
        'Method not allowed.',
    },
    405,
  );
}

export async function GET() {
  return methodNotAllowed();
}

export async function PUT() {
  return methodNotAllowed();
}

export async function PATCH() {
  return methodNotAllowed();
}

export async function DELETE() {
  return methodNotAllowed();
}