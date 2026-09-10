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
  getConfiguredPaymentProvider,
} from '@/lib/server-payment-provider-registry';

import {
  verifyProviderCallbackRequest,
} from '@/lib/server-provider-callback-security';

export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';

const DEFAULT_MAX_REQUEST_BODY_BYTES =
  64 * 1024;

const MAX_PROVIDER_CODE_LENGTH =
  40;

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

function readPositiveIntegerEnvironment(
  name:
    string,

  fallback:
    number,
): number {
  const raw =
    process.env[name];

  const value =
    Number(
      raw,
    );

  if (
    !raw ||
    !Number.isSafeInteger(
      value,
    ) ||
    value <= 0
  ) {
    return fallback;
  }

  return value;
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
): void {
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

function normalizeRouteProviderCode(
  value:
    unknown,
): string {
  if (
    typeof value !==
      'string'
  ) {
    throw new Error(
      'INVALID_CALLBACK_PROVIDER',
    );
  }

  const normalized =
    value
      .trim()
      .toUpperCase();

  if (
    !normalized ||
    normalized.length >
      MAX_PROVIDER_CODE_LENGTH ||
    !/^[A-Z0-9_]+$/.test(
      normalized,
    )
  ) {
    throw new Error(
      'INVALID_CALLBACK_PROVIDER',
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
    value !==
      'DEPOSIT' &&
    value !==
      'WITHDRAWAL'
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
    value !==
      'SUCCESS' &&
    value !==
      'PENDING' &&
    value !==
      'FAILED'
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
    outcome ===
      'SUCCESS' &&
    !providerTransactionId
  ) {
    throw new Error(
      'INVALID_CALLBACK_PAYLOAD',
    );
  }

  if (
    outcome !==
      'FAILED' &&
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

function assertJsonContentType(
  request:
    Request,
): void {
  const contentType =
    request.headers
      .get(
        'content-type',
      )
      ?.split(
        ';',
      )[0]
      ?.trim()
      .toLowerCase();

  if (
    contentType !==
      'application/json'
  ) {
    throw new Error(
      'CALLBACK_CONTENT_TYPE_NOT_SUPPORTED',
    );
  }
}

function assertContentLengthAllowed(
  request:
    Request,
  maximumBytes:
    number,
): void {
  const contentLength =
    request.headers.get(
      'content-length',
    );

  if (
    contentLength ===
      null
  ) {
    return;
  }

  const parsedLength =
    Number(
      contentLength,
    );

  if (
    !Number.isSafeInteger(
      parsedLength,
    ) ||
    parsedLength < 0 ||
    parsedLength >
      maximumBytes
  ) {
    throw new Error(
      'CALLBACK_REQUEST_TOO_LARGE',
    );
  }
}

async function readVisaRawBody(
  request:
    Request,
): Promise<string> {
  assertJsonContentType(
    request,
  );

  const maximumBytes =
    readPositiveIntegerEnvironment(
      'PROVIDER_CALLBACK_MAX_BODY_BYTES',
      DEFAULT_MAX_REQUEST_BODY_BYTES,
    );

  assertContentLengthAllowed(
    request,
    maximumBytes,
  );

  const rawBody =
    await request.text();

  if (
    !rawBody
  ) {
    throw new Error(
      'CALLBACK_REQUEST_BODY_REQUIRED',
    );
  }

  if (
    Buffer.byteLength(
      rawBody,
      'utf8',
    ) >
      maximumBytes
  ) {
    throw new Error(
      'CALLBACK_REQUEST_TOO_LARGE',
    );
  }

  return rawBody;
}

function createVisaCallbackHeaders(
  request:
    Request,
): Readonly<
  Record<
    string,
    string
  >
> {
  const signature =
    request.headers.get(
      'v-c-signature',
    );

  if (
    !signature
  ) {
    return Object.freeze({});
  }

  return Object.freeze({
    'v-c-signature':
      signature,
  });
}

async function processCanonicalSettlement(
  providerCode:
    string,
  payload:
    CanonicalProviderPayload,
) {
  const result =
    await processProviderSettlement({
      kind:
        payload.kind,

      requestId:
        payload.requestId,

      providerCode,

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
      'INVALID_CALLBACK_PROVIDER' ||
    errorCode ===
      'PROVIDER_CALLBACK_UNAUTHORIZED' ||
    errorCode ===
      'PROVIDER_CALLBACK_EXPIRED'
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
      'INVALID_CALLBACK_CLOCK' ||
    errorCode ===
      'PAYMENT_PROVIDER_NOT_CONFIGURED' ||
    errorCode ===
      'PROVIDER_NOT_CONFIGURED' ||
    errorCode ===
      'PROVIDER_CONFIGURATION_INVALID'
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
      'INVALID_FAILURE_REASON' ||
    errorCode ===
      'PROVIDER_CALLBACK_INVALID'
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
 * Visa Acceptance callbacks use the provider-native
 * v-c-signature header and are verified by the registered
 * Visa adapter.
 *
 * Other providers continue using the existing canonical
 * PHCL callback boundary:
 *
 * X-PHCL-Timestamp: <Unix timestamp seconds>
 * X-PHCL-Signature: sha256=<HMAC-SHA256 hex>
 *
 * SECURITY:
 *
 * - Provider identity comes from the route parameter.
 * - The exact raw body is authenticated before settlement.
 * - Firebase authentication is deliberately not used here.
 * - No callback can directly bypass settlement validation.
 * - Replay protection and balance mutation occur inside the
 *   financial settlement transaction.
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
      normalizeRouteProviderCode(
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
    /*
     * Visa Acceptance uses its native v-c-signature format.
     *
     * The adapter receives only:
     * - the trusted provider identity;
     * - the configured environment;
     * - the exact raw request body;
     * - the required signature header;
     * - the server receipt time.
     */
    if (
      providerCode ===
        'VISA_ACCEPTANCE'
    ) {
      const rawBody =
        await readVisaRawBody(
          request,
        );

      const adapter =
        getConfiguredPaymentProvider(
          'VISA_ACCEPTANCE',
        );

      const normalized =
        await adapter
          .verifyAndNormalizeCallback({
            providerCode:
              'VISA_ACCEPTANCE',

            environment:
              adapter.environment,

            rawBody,

            headers:
              createVisaCallbackHeaders(
                request,
              ),

            receivedAtMs:
              Date.now(),
          });

      /*
       * Re-parse the adapter output through the canonical
       * payload validator before financial settlement.
       */
      const payload =
        parseCanonicalPayload({
          kind:
            normalized.kind,

          requestId:
            normalized.requestId,

          providerEventId:
            normalized.providerEventId,

          providerTransactionId:
            normalized
              .providerTransactionId,

          outcome:
            normalized.outcome,

          failureReason:
            normalized.failureReason,
        });

      return processCanonicalSettlement(
        normalized.providerCode,
        payload,
      );
    }

    /*
     * Existing providers retain the canonical PHCL HMAC
     * callback contract until each provider-native callback
     * migration has been independently tested.
     */
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

    return processCanonicalSettlement(
      verifiedCallback.providerCode,
      payload,
    );
  } catch (
    error
  ) {
    const errorCode =
      error instanceof Error
        ? error.message
        : '';

    /*
     * Never log:
     *
     * - raw callback bodies;
     * - callback signatures;
     * - provider secrets;
     * - Authorization headers;
     * - payment tokens;
     * - customer or card information.
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