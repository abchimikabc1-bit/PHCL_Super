import 'server-only';

import {
  NextResponse,
} from 'next/server';

import {
  authenticateFirebaseUser,
} from '@/lib/firebase-user-auth';

import {
  captureDepositProvider,
} from '@/lib/server-deposit-provider-capture';

import {
  ProviderAdapterError,
} from '@/lib/server-payment-provider-types';

import {
  consumeTransferRateLimit,
  getTransferNetworkKey,
  type TransferRateLimitResult,
} from '@/lib/server-transfer-security';

export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';

const MAX_REQUEST_BODY_BYTES =
  8_192;

const MAX_REQUEST_ID_LENGTH =
  200;

type PayPalCaptureRequestBody = {
  requestId?:
    unknown;
};

function noStoreJson(
  body:
    unknown,

  status:
    number,

  additionalHeaders?:
    Record<
      string,
      string
    >,
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

        ...additionalHeaders,
      },
    },
  );
}

function createRateLimitHeaders(
  result:
    TransferRateLimitResult,
): Record<
  string,
  string
> {
  const resetSeconds =
    Math.max(
      0,
      Math.ceil(
        (
          result.resetAtMs -
          Date.now()
        ) /
          1_000,
      ),
    );

  const headers:
    Record<
      string,
      string
    > = {
      'X-RateLimit-Remaining':
        String(
          Math.max(
            0,
            result.remaining,
          ),
        ),

      'X-RateLimit-Reset':
        String(
          resetSeconds,
        ),
    };

  if (!result.allowed) {
    headers['Retry-After'] =
      String(
        Math.max(
          1,
          resetSeconds,
        ),
      );
  }

  return headers;
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

async function readJsonBody(
  request:
    Request,
): Promise<
  PayPalCaptureRequestBody
> {
  const contentLength =
    request.headers.get(
      'content-length',
    );

  if (contentLength) {
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
        MAX_REQUEST_BODY_BYTES
    ) {
      throw new Error(
        'INVALID_REQUEST_BODY',
      );
    }
  }

  const rawBody =
    await request.text();

  if (
    !rawBody ||
    Buffer.byteLength(
      rawBody,
      'utf8',
    ) >
      MAX_REQUEST_BODY_BYTES
  ) {
    throw new Error(
      'INVALID_REQUEST_BODY',
    );
  }

  let parsed:
    unknown;

  try {
    parsed =
      JSON.parse(
        rawBody,
      ) as unknown;
  } catch {
    throw new Error(
      'INVALID_REQUEST_BODY',
    );
  }

  if (
    !isPlainObject(
      parsed,
    )
  ) {
    throw new Error(
      'INVALID_REQUEST_BODY',
    );
  }

  const keys =
    Object.keys(
      parsed,
    );

  if (
    keys.length !== 1 ||
    keys[0] !==
      'requestId'
  ) {
    throw new Error(
      'INVALID_REQUEST_BODY',
    );
  }

  return parsed as
    PayPalCaptureRequestBody;
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
      'INVALID_CAPTURE_REQUEST',
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
      'INVALID_CAPTURE_REQUEST',
    );
  }

  return requestId;
}

function getErrorCode(
  error:
    unknown,
): string {
  if (
    error instanceof
      ProviderAdapterError
  ) {
    return error.code;
  }

  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return '';
}

function getCaptureErrorResponse(
  error:
    unknown,

  rateLimitHeaders:
    Record<
      string,
      string
    >,
) {
  const code =
    getErrorCode(
      error,
    );

  if (
    code ===
      'DEPOSIT_CAPTURE_REQUEST_ID_INVALID' ||
    code ===
      'DEPOSIT_CAPTURE_ACCOUNT_INVALID' ||
    code ===
      'INVALID_CAPTURE_REQUEST' ||
    code ===
      'PROVIDER_REQUEST_INVALID' ||
    code ===
      'PROVIDER_ROUTE_NOT_SUPPORTED'
  ) {
    return noStoreJson(
      {
        ok:
          false,

        code:
          'INVALID_CAPTURE_REQUEST',

        message:
          'PayPal capture request is invalid.',
      },
      400,
      rateLimitHeaders,
    );
  }

  /*
   * Missing requests and ownership mismatches deliberately
   * return the same response to prevent request enumeration.
   */
  if (
    code ===
      'DEPOSIT_CAPTURE_REQUEST_NOT_FOUND' ||
    code ===
      'DEPOSIT_CAPTURE_ACCOUNT_MISMATCH' ||
    code ===
      'DEPOSIT_CAPTURE_REQUEST_IDENTITY_MISMATCH'
  ) {
    return noStoreJson(
      {
        ok:
          false,

        code:
          'CAPTURE_REQUEST_NOT_FOUND',

        message:
          'Eligible PayPal deposit request was not found.',
      },
      404,
      rateLimitHeaders,
    );
  }

  if (
    code ===
      'DEPOSIT_CAPTURE_ALREADY_SETTLED' ||
    code ===
      'DEPOSIT_CAPTURE_OPERATION_CONFLICT' ||
    code ===
      'DEPOSIT_CAPTURE_PROVIDER_REFERENCE_CONFLICT' ||
    code ===
      'DEPOSIT_CAPTURE_RESULT_CONFLICT' ||
    code ===
      'PROVIDER_OPERATION_CONFLICT'
  ) {
    return noStoreJson(
      {
        ok:
          false,

        code:
          'CAPTURE_CONFLICT',

        message:
          'PayPal capture request conflicts with its current state.',
      },
      409,
      rateLimitHeaders,
    );
  }

  if (
    code ===
      'DEPOSIT_CAPTURE_ROUTE_NOT_SUPPORTED' ||
    code ===
      'DEPOSIT_CAPTURE_REQUEST_STATE_INVALID' ||
    code ===
      'DEPOSIT_CAPTURE_PROVIDER_NOT_INITIATED' ||
    code ===
      'DEPOSIT_CAPTURE_CREDIT_STATE_INVALID'
  ) {
    return noStoreJson(
      {
        ok:
          false,

        code:
          'CAPTURE_NOT_ALLOWED',

        message:
          'This deposit cannot be captured.',
      },
      409,
      rateLimitHeaders,
    );
  }

  if (
    code ===
      'PROVIDER_CONFIGURATION_INVALID' ||
    code ===
      'PROVIDER_NOT_CONFIGURED' ||
    code ===
      'DEPOSIT_CAPTURE_PROVIDER_NOT_CONFIGURED' ||
    code ===
      'PROVIDER_TEMPORARILY_UNAVAILABLE'
  ) {
    return noStoreJson(
      {
        ok:
          false,

        code:
          'PAYPAL_TEMPORARILY_UNAVAILABLE',

        message:
          'PayPal capture is temporarily unavailable.',
      },
      503,
      rateLimitHeaders,
    );
  }

  if (
    code ===
      'PROVIDER_REQUEST_FAILED' ||
    code ===
      'PROVIDER_RESPONSE_INVALID' ||
    code ===
      'DEPOSIT_CAPTURE_PROVIDER_RESULT_INVALID' ||
    code ===
      'DEPOSIT_CAPTURE_PROVIDER_REFERENCE_INVALID' ||
    code ===
      'DEPOSIT_CAPTURE_RECORD_INVALID'
  ) {
    return noStoreJson(
      {
        ok:
          false,

        code:
          'PAYPAL_CAPTURE_FAILED',

        message:
          'PayPal could not confirm this capture safely.',
      },
      502,
      rateLimitHeaders,
    );
  }

  return noStoreJson(
    {
      ok:
        false,

      code:
        'CAPTURE_SECURITY_UNAVAILABLE',

      message:
        'PayPal capture security is temporarily unavailable.',
    },
    503,
    rateLimitHeaders,
  );
}

export async function POST(
  request:
    Request,
) {
  const authentication =
    await authenticateFirebaseUser(
      request,
    );

  if (
    !authentication.authenticated
  ) {
    return noStoreJson(
      {
        ok:
          false,

        code:
          'UNAUTHENTICATED',

        message:
          'Authentication required.',
      },
      401,
    );
  }

  let rateLimit:
    TransferRateLimitResult;

  try {
    /*
     * Capture shares the financial-action limiter used by
     * deposits, withdrawals and transfers.
     */
    rateLimit =
      await consumeTransferRateLimit(
        authentication.user.uid,
        getTransferNetworkKey(
          request,
        ),
      );
  } catch {
    return noStoreJson(
      {
        ok:
          false,

        code:
          'CAPTURE_SECURITY_UNAVAILABLE',

        message:
          'PayPal capture security is temporarily unavailable.',
      },
      503,
    );
  }

  const rateLimitHeaders =
    createRateLimitHeaders(
      rateLimit,
    );

  if (!rateLimit.allowed) {
    return noStoreJson(
      {
        ok:
          false,

        code:
          'CAPTURE_RATE_LIMITED',

        message:
          'Too many capture requests. Try again later.',
      },
      429,
      rateLimitHeaders,
    );
  }

  let requestId:
    string;

  try {
    const body =
      await readJsonBody(
        request,
      );

    requestId =
      normalizeRequestId(
        body.requestId,
      );
  } catch {
    return noStoreJson(
      {
        ok:
          false,

        code:
          'INVALID_CAPTURE_REQUEST',

        message:
          'PayPal capture request is invalid.',
      },
      400,
      rateLimitHeaders,
    );
  }

  try {
    const result =
      await captureDepositProvider({
        uid:
          authentication.user.uid,

        requestId,
      });

    /*
     * SUCCESS here describes PayPal's capture response.
     * It does not mean that PHCL has credited the account.
     * Credit remains callback-only.
     */
    return noStoreJson(
      {
        ok:
          true,

        capture: {
          requestId:
            result.capture
              .requestId,

          providerCode:
            result.capture
              .providerCode,

          providerRequestId:
            result.capture
              .providerRequestId,

          providerTransactionId:
            result.capture
              .providerTransactionId,

          status:
            result.capture
              .status,

          idempotent:
            result.idempotent,
        },

        settlementStatus:
          'AWAITING_VERIFIED_CALLBACK',

        credited:
          false,

        message:
          result.capture.status ===
            'SUCCESS'
            ? 'PayPal capture received. The account will remain unchanged until a verified provider callback is settled.'
            : 'PayPal capture is still pending. No account balance has been credited.',
      },
      result.capture.status ===
        'PENDING'
        ? 202
        : 200,
      rateLimitHeaders,
    );
  } catch (
    error
  ) {
    return getCaptureErrorResponse(
      error,
      rateLimitHeaders,
    );
  }
}

function methodNotAllowed() {
  return noStoreJson(
    {
      ok:
        false,

      code:
        'METHOD_NOT_ALLOWED',

      message:
        'Method not allowed.',
    },
    405,
    {
      Allow:
        'POST',
    },
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