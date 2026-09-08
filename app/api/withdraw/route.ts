import 'server-only';

import {
  NextResponse,
} from 'next/server';

import {
  authenticateFirebaseUser,
} from '@/lib/firebase-user-auth';

import {
  consumeTransferRateLimit,
  getTransferNetworkKey,
  type TransferRateLimitResult,
} from '@/lib/server-transfer-security';

import {
  assessVerificationRequirements,
  type VerificationAssessment,
  type VerificationFacts,
} from '@/lib/server-verification-requirements';

import {
  getServerVerificationFacts,
} from '@/lib/server-verification-facts';

import {
  displayAmountToAtomic,
  type FinancialAsset,
} from '@/lib/server-financial-ledger';

import {
  createPendingWithdrawalRequest,
  type WithdrawalRail,
} from '@/lib/server-withdrawal-security';

export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';

const MAX_REQUEST_BODY_BYTES =
  8_192;

const MAX_OPERATION_ID_LENGTH =
  120;

const MAX_DISPLAY_AMOUNT_LENGTH =
  64;

const MAX_DESTINATION_LENGTH =
  200;

const MAX_PROVIDER_CODE_LENGTH =
  40;

const SUPPORTED_WITHDRAWAL_ASSETS =
  new Set<FinancialAsset>([
    'USD',
    'TZS',
    'PI',
  ]);

type WithdrawalRequestBody = {
  asset?: unknown;

  rail?: unknown;

  providerCode?: unknown;

  destination?: unknown;

  amount?: unknown;

  operationId?: unknown;
};

type WithdrawalEligibilityErrorCode =
  | 'EMAIL_VERIFICATION_REQUIRED'
  | 'PHONE_VERIFICATION_REQUIRED'
  | 'ACCOUNT_RESTRICTED'
  | 'KYC_REQUIRED'
  | 'KYS_REQUIRED'
  | 'KYB_REQUIRED'
  | 'STRONG_AUTHENTICATION_REQUIRED';

class WithdrawalEligibilityError
  extends Error {
  readonly code:
    WithdrawalEligibilityErrorCode;

  constructor(
    code:
      WithdrawalEligibilityErrorCode,
    message: string,
  ) {
    super(
      message,
    );

    this.name =
      'WithdrawalEligibilityError';

    this.code =
      code;
  }
}

function noStoreJson(
  body: unknown,
  status: number,
  additionalHeaders?: Record<
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
): Record<string, string> {
  const resetSeconds =
    Math.max(
      0,
      Math.ceil(
        (
          result.resetAtMs -
          Date.now()
        ) /
          1000,
      ),
    );

  const headers:
    Record<string, string> = {
    'RateLimit-Remaining':
      String(
        result.remaining,
      ),

    'RateLimit-Reset':
      String(
        resetSeconds,
      ),
  };

  if (
    !result.allowed
  ) {
    headers['Retry-After'] =
      String(
        Math.max(
          1,
          result.retryAfterSeconds,
        ),
      );
  }

  return headers;
}

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

async function readJsonBody(
  request: Request,
): Promise<WithdrawalRequestBody> {
  const contentType =
    request.headers
      .get('content-type')
      ?.toLowerCase() ??
    '';

  if (
    !contentType.startsWith(
      'application/json',
    )
  ) {
    throw new Error(
      'INVALID_CONTENT_TYPE',
    );
  }

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
      !Number.isFinite(
        parsedLength,
      ) ||
      parsedLength < 0 ||
      parsedLength >
        MAX_REQUEST_BODY_BYTES
    ) {
      throw new Error(
        'WITHDRAWAL_REQUEST_TOO_LARGE',
      );
    }
  }

  const raw =
    await request.text();

  if (
    !raw ||
    new TextEncoder()
      .encode(
        raw,
      )
      .byteLength >
        MAX_REQUEST_BODY_BYTES
  ) {
    throw new Error(
      'INVALID_WITHDRAWAL_REQUEST',
    );
  }

  let parsed:
    unknown;

  try {
    parsed =
      JSON.parse(
        raw,
      );
  } catch {
    throw new Error(
      'INVALID_WITHDRAWAL_REQUEST',
    );
  }

  if (
    !isPlainObject(
      parsed,
    )
  ) {
    throw new Error(
      'INVALID_WITHDRAWAL_REQUEST',
    );
  }

  const allowedKeys =
    new Set([
      'asset',
      'rail',
      'providerCode',
      'destination',
      'amount',
      'operationId',
    ]);

  if (
    Object.keys(
      parsed,
    ).some(
      (key) =>
        !allowedKeys.has(
          key,
        ),
    )
  ) {
    throw new Error(
      'INVALID_WITHDRAWAL_REQUEST',
    );
  }

  return parsed;
}

function normalizeAsset(
  value: unknown,
): FinancialAsset {
  if (
    typeof value !==
      'string'
  ) {
    throw new Error(
      'INVALID_WITHDRAWAL_ASSET',
    );
  }

  const asset =
    value
      .trim()
      .toUpperCase() as
        FinancialAsset;

  if (
    !SUPPORTED_WITHDRAWAL_ASSETS.has(
      asset,
    )
  ) {
    throw new Error(
      'WITHDRAWAL_ASSET_NOT_SUPPORTED',
    );
  }

  return asset;
}

function normalizeRail(
  value: unknown,
): WithdrawalRail {
  if (
    typeof value !==
      'string'
  ) {
    throw new Error(
      'INVALID_WITHDRAWAL_RAIL',
    );
  }

  const rail =
    value
      .trim()
      .toUpperCase();

  if (
    rail !==
      'BANK' &&
    rail !==
      'MOBILE_MONEY' &&
    rail !==
      'BLOCKCHAIN'
  ) {
    throw new Error(
      'INVALID_WITHDRAWAL_RAIL',
    );
  }

  return rail;
}

function normalizeProviderCode(
  value: unknown,
): string {
  if (
    typeof value !==
      'string'
  ) {
    throw new Error(
      'INVALID_WITHDRAWAL_PROVIDER',
    );
  }

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
  value: unknown,
): string {
  if (
    typeof value !==
      'string'
  ) {
    throw new Error(
      'INVALID_WITHDRAWAL_DESTINATION',
    );
  }

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

function normalizeDisplayAmount(
  value: unknown,
): string {
  if (
    typeof value !==
      'string'
  ) {
    throw new Error(
      'INVALID_WITHDRAWAL_AMOUNT',
    );
  }

  const amount =
    value.trim();

  if (
    !amount ||
    amount.length >
      MAX_DISPLAY_AMOUNT_LENGTH ||
    !/^\d+(?:\.\d+)?$/.test(
      amount,
    )
  ) {
    throw new Error(
      'INVALID_WITHDRAWAL_AMOUNT',
    );
  }

  return amount;
}

function normalizeOperationId(
  value: unknown,
): string {
  if (
    typeof value !==
      'string'
  ) {
    throw new Error(
      'INVALID_WITHDRAWAL_OPERATION_ID',
    );
  }

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

function requireWithdrawalEligibility(
  facts:
    VerificationFacts,
  assessment:
    VerificationAssessment,
): void {
  if (
    !facts.emailVerified
  ) {
    throw new WithdrawalEligibilityError(
      'EMAIL_VERIFICATION_REQUIRED',
      'Email verification is required.',
    );
  }

  if (
    !facts.phoneVerified
  ) {
    throw new WithdrawalEligibilityError(
      'PHONE_VERIFICATION_REQUIRED',
      'Phone verification is required.',
    );
  }

  if (
    !facts.goodAccountStanding
  ) {
    throw new WithdrawalEligibilityError(
      'ACCOUNT_RESTRICTED',
      'The account is not eligible for withdrawals.',
    );
  }

  if (
    assessment.kyc.status !==
      'APPROVED'
  ) {
    throw new WithdrawalEligibilityError(
      'KYC_REQUIRED',
      'Approved KYC is required.',
    );
  }

  if (
    facts.tier ===
      'small_business' &&
    assessment.kys.status !==
      'APPROVED'
  ) {
    throw new WithdrawalEligibilityError(
      'KYS_REQUIRED',
      'Approved KYS is required.',
    );
  }

  if (
    facts.tier ===
      'corporate' &&
    assessment.kyb.status !==
      'APPROVED'
  ) {
    throw new WithdrawalEligibilityError(
      'KYB_REQUIRED',
      'Approved KYB is required.',
    );
  }

  if (
    !assessment.security
      .strongAuthenticationReady
  ) {
    throw new WithdrawalEligibilityError(
      'STRONG_AUTHENTICATION_REQUIRED',
      'Strong authentication is required.',
    );
  }
}

async function requireEligibleCustomer(
  uid: string,
): Promise<void> {
  const facts =
    await getServerVerificationFacts(
      uid,
    );

  const assessment =
    assessVerificationRequirements(
      facts,
    );

  requireWithdrawalEligibility(
    facts,
    assessment,
  );
}

export async function POST(
  request: Request,
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
        ok: false,

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
     * Transfers and withdrawals deliberately
     * share one financial-action limiter.
     * This prevents alternating endpoints to
     * bypass abuse controls.
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
        ok: false,

        code:
          'WITHDRAWAL_SECURITY_UNAVAILABLE',

        message:
          'Withdrawal security is temporarily unavailable.',
      },
      503,
    );
  }

  const rateLimitHeaders =
    createRateLimitHeaders(
      rateLimit,
    );

  if (
    !rateLimit.allowed
  ) {
    return noStoreJson(
      {
        ok: false,

        code:
          'WITHDRAWAL_RATE_LIMITED',

        message:
          'Too many withdrawal requests. Try again later.',
      },
      429,
      rateLimitHeaders,
    );
  }

  let body:
    WithdrawalRequestBody;

  try {
    body =
      await readJsonBody(
        request,
      );
  } catch {
    return noStoreJson(
      {
        ok: false,

        code:
          'INVALID_REQUEST',

        message:
          'Invalid withdrawal request.',
      },
      400,
      rateLimitHeaders,
    );
  }

  let asset:
    FinancialAsset;

  let rail:
    WithdrawalRail;

  let providerCode:
    string;

  let destination:
    string;

  let amount:
    string;

  let amountAtomic:
    string;

  let operationId:
    string;

  try {
    asset =
      normalizeAsset(
        body.asset,
      );

    rail =
      normalizeRail(
        body.rail,
      );

    providerCode =
      normalizeProviderCode(
        body.providerCode,
      );

    destination =
      normalizeDestination(
        body.destination,
      );

    amount =
      normalizeDisplayAmount(
        body.amount,
      );

    operationId =
      normalizeOperationId(
        body.operationId,
      );

    amountAtomic =
      displayAmountToAtomic(
        amount,
        asset,
      );

    if (
      BigInt(
        amountAtomic,
      ) <= 0n ||
      amountAtomic.length >
        40
    ) {
      throw new Error(
        'INVALID_WITHDRAWAL_AMOUNT',
      );
    }
  } catch {
    return noStoreJson(
      {
        ok: false,

        code:
          'INVALID_WITHDRAWAL',

        message:
          'Withdrawal details are invalid or unsupported.',
      },
      400,
      rateLimitHeaders,
    );
  }

  try {
    const uid =
      authentication.user.uid;

    await requireEligibleCustomer(
      uid,
    );

    const result =
      await createPendingWithdrawalRequest(
        {
          uid,

          clientOperationId:
            operationId,

          asset,

          rail,

          providerCode,

          destination,

          amountAtomic,
        },
      );

    return noStoreJson(
      {
        ok: true,

        withdrawal: {
          requestId:
            result.requestId,

          operationId:
            result.clientOperationId,

          asset:
            result.asset,

          rail:
            result.rail,

          providerCode:
            result.providerCode,

          amount,

          destination:
            result.destinationMasked,

          status:
            result.status,

          idempotent:
            result.idempotent,

          expiresAt:
            new Date(
              result.expiresAtMs,
            ).toISOString(),
        },

        message:
          'Withdrawal request received for secure review. No external payout has been marked complete.',
      },
      202,
      rateLimitHeaders,
    );
  } catch (error) {
    if (
      error instanceof
        WithdrawalEligibilityError
    ) {
      return noStoreJson(
        {
          ok: false,

          code:
            error.code,

          message:
            error.message,
        },
        403,
        rateLimitHeaders,
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : '';

    if (
      message ===
      'INSUFFICIENT_FUNDS'
    ) {
      return noStoreJson(
        {
          ok: false,

          code:
            'INSUFFICIENT_FUNDS',

          message:
            'Insufficient funds.',
        },
        409,
        rateLimitHeaders,
      );
    }

    if (
      message ===
        'WITHDRAWAL_OPERATION_CONFLICT'
    ) {
      return noStoreJson(
        {
          ok: false,

          code:
            'WITHDRAWAL_CONFLICT',

          message:
            'Withdrawal operation conflict.',
        },
        409,
        rateLimitHeaders,
      );
    }

    if (
      message ===
        'WITHDRAWAL_ROUTE_NOT_SUPPORTED'
    ) {
      return noStoreJson(
        {
          ok: false,

          code:
            'WITHDRAWAL_ROUTE_NOT_SUPPORTED',

          message:
            'This withdrawal route is not available.',
        },
        400,
        rateLimitHeaders,
      );
    }

    if (
      message ===
        'WITHDRAWAL_ENCRYPTION_KEY_NOT_CONFIGURED' ||
      message ===
        'WITHDRAWAL_ENCRYPTION_KEY_INVALID'
    ) {
      return noStoreJson(
        {
          ok: false,

          code:
            'WITHDRAWAL_SECURITY_UNAVAILABLE',

          message:
            'Withdrawal security is temporarily unavailable.',
        },
        503,
        rateLimitHeaders,
      );
    }

    console.error(
      'Unable to create secure withdrawal request:',
      error instanceof Error
        ? error.name
        : 'UnknownError',
    );

    return noStoreJson(
      {
        ok: false,

        code:
          'WITHDRAWAL_FAILED',

        message:
          'Unable to create withdrawal request.',
      },
      500,
      rateLimitHeaders,
    );
  }
}

function methodNotAllowed() {
  return noStoreJson(
    {
      ok: false,

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