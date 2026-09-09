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
  createPendingDepositRequest,
  type DepositRail,
} from '@/lib/server-deposit-security';

import {
  initiateDepositProvider,
} from '@/lib/server-deposit-provider-initiation';

import type {
  PaymentProviderCode,
} from '@/lib/server-payment-provider-types';

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

const MAX_PROVIDER_CODE_LENGTH =
  40;

const SUPPORTED_DEPOSIT_ASSETS =
  new Set<FinancialAsset>([
    'USD',
    'TZS',
    'PI',
  ]);

const ACTIVE_MOBILE_MONEY_ADAPTERS =
  new Set<PaymentProviderCode>([
    'MPESA',
    'AIRTEL_MONEY',
    'HALOPESA',
  ]);

type DepositRequestBody = {
  asset?:
    unknown;

  rail?:
    unknown;

  providerCode?:
    unknown;

  amount?:
    unknown;

  operationId?:
    unknown;
};

type DepositEligibilityErrorCode =
  | 'EMAIL_VERIFICATION_REQUIRED'
  | 'PHONE_VERIFICATION_REQUIRED'
  | 'ACCOUNT_RESTRICTED'
  | 'KYC_REQUIRED'
  | 'KYS_REQUIRED'
  | 'KYB_REQUIRED'
  | 'STRONG_AUTHENTICATION_REQUIRED';

class DepositEligibilityError
  extends Error {
  readonly code:
    DepositEligibilityErrorCode;

  constructor(
    code:
      DepositEligibilityErrorCode,
    message:
      string,
  ) {
    super(
      message,
    );

    this.name =
      'DepositEligibilityError';

    this.code =
      code;
  }
}

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
    headers[
      'Retry-After'
    ] =
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
  DepositRequestBody
> {
  const contentType =
    request.headers
      .get(
        'content-type',
      )
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

  if (
    contentLength
  ) {
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
        'DEPOSIT_REQUEST_TOO_LARGE',
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
      'INVALID_DEPOSIT_REQUEST',
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
      'INVALID_DEPOSIT_REQUEST',
    );
  }

  if (
    !isPlainObject(
      parsed,
    )
  ) {
    throw new Error(
      'INVALID_DEPOSIT_REQUEST',
    );
  }

  const allowedKeys =
    new Set([
      'asset',
      'rail',
      'providerCode',
      'amount',
      'operationId',
    ]);

  if (
    Object.keys(
      parsed,
    ).some(
      (
        key,
      ) =>
        !allowedKeys.has(
          key,
        ),
    )
  ) {
    throw new Error(
      'INVALID_DEPOSIT_REQUEST',
    );
  }

  return parsed;
}

function normalizeAsset(
  value:
    unknown,
): FinancialAsset {
  if (
    typeof value !==
      'string'
  ) {
    throw new Error(
      'INVALID_DEPOSIT_ASSET',
    );
  }

  const asset =
    value
      .trim()
      .toUpperCase() as
        FinancialAsset;

  if (
    !SUPPORTED_DEPOSIT_ASSETS.has(
      asset,
    )
  ) {
    throw new Error(
      'DEPOSIT_ASSET_NOT_SUPPORTED',
    );
  }

  return asset;
}

function normalizeRail(
  value:
    unknown,
): DepositRail {
  if (
    typeof value !==
      'string'
  ) {
    throw new Error(
      'INVALID_DEPOSIT_RAIL',
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
      'INVALID_DEPOSIT_RAIL',
    );
  }

  return rail;
}

function normalizeProviderCode(
  value:
    unknown,
): string {
  if (
    typeof value !==
      'string'
  ) {
    throw new Error(
      'INVALID_DEPOSIT_PROVIDER',
    );
  }

  const providerCode =
    value
      .trim()
      .toUpperCase();

  if (
    providerCode.length < 2 ||
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

function normalizeDisplayAmount(
  value:
    unknown,
): string {
  if (
    typeof value !==
      'string'
  ) {
    throw new Error(
      'INVALID_DEPOSIT_AMOUNT',
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
      'INVALID_DEPOSIT_AMOUNT',
    );
  }

  return amount;
}

function normalizeOperationId(
  value:
    unknown,
): string {
  if (
    typeof value !==
      'string'
  ) {
    throw new Error(
      'INVALID_DEPOSIT_OPERATION_ID',
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
      'INVALID_DEPOSIT_OPERATION_ID',
    );
  }

  return operationId;
}

function isActiveMobileMoneyProvider(
  asset:
    FinancialAsset,
  rail:
    DepositRail,
  providerCode:
    string,
): providerCode is PaymentProviderCode {
  return (
    asset ===
      'TZS' &&
    rail ===
      'MOBILE_MONEY' &&
    ACTIVE_MOBILE_MONEY_ADAPTERS.has(
      providerCode as
        PaymentProviderCode,
    )
  );
}

function getProviderDisplayName(
  providerCode:
    PaymentProviderCode,
): string {
  if (
    providerCode ===
      'MPESA'
  ) {
    return 'M-Pesa';
  }

  if (
    providerCode ===
      'AIRTEL_MONEY'
  ) {
    return 'Airtel Money';
  }

  if (
    providerCode ===
      'HALOPESA'
  ) {
    return 'HaloPesa';
  }

  return providerCode;
}

function requireDepositEligibility(
  facts:
    VerificationFacts,
  assessment:
    VerificationAssessment,
): void {
  if (
    !facts.emailVerified
  ) {
    throw new DepositEligibilityError(
      'EMAIL_VERIFICATION_REQUIRED',
      'Email verification is required.',
    );
  }

  if (
    !facts.phoneVerified
  ) {
    throw new DepositEligibilityError(
      'PHONE_VERIFICATION_REQUIRED',
      'Phone verification is required.',
    );
  }

  if (
    !facts.goodAccountStanding
  ) {
    throw new DepositEligibilityError(
      'ACCOUNT_RESTRICTED',
      'The account is not eligible for deposits.',
    );
  }

  if (
    assessment.kyc.status !==
      'APPROVED'
  ) {
    throw new DepositEligibilityError(
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
    throw new DepositEligibilityError(
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
    throw new DepositEligibilityError(
      'KYB_REQUIRED',
      'Approved KYB is required.',
    );
  }

  if (
    !assessment.security
      .strongAuthenticationReady
  ) {
    throw new DepositEligibilityError(
      'STRONG_AUTHENTICATION_REQUIRED',
      'Strong authentication is required.',
    );
  }
}

async function requireEligibleCustomer(
  uid:
    string,
): Promise<void> {
  const facts =
    await getServerVerificationFacts(
      uid,
    );

  const assessment =
    assessVerificationRequirements(
      facts,
    );

  requireDepositEligibility(
    facts,
    assessment,
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
     * Deposits, transfers and withdrawals deliberately
     * share one financial-action limiter. Alternating
     * endpoints cannot bypass account/network controls.
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
          'DEPOSIT_SECURITY_UNAVAILABLE',

        message:
          'Deposit security is temporarily unavailable.',
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
        ok:
          false,

        code:
          'DEPOSIT_RATE_LIMITED',

        message:
          'Too many deposit requests. Try again later.',
      },
      429,
      rateLimitHeaders,
    );
  }

  let body:
    DepositRequestBody;

  try {
    body =
      await readJsonBody(
        request,
      );
  } catch {
    return noStoreJson(
      {
        ok:
          false,

        code:
          'INVALID_REQUEST',

        message:
          'Invalid deposit request.',
      },
      400,
      rateLimitHeaders,
    );
  }

  let asset:
    FinancialAsset;

  let rail:
    DepositRail;

  let providerCode:
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
        'INVALID_DEPOSIT_AMOUNT',
      );
    }
  } catch {
    return noStoreJson(
      {
        ok:
          false,

        code:
          'INVALID_DEPOSIT',

        message:
          'Deposit details are invalid or unsupported.',
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

    if (
      isActiveMobileMoneyProvider(
        asset,
        rail,
        providerCode,
      )
    ) {
      const phoneNumber =
        authentication.user
          .phoneNumber;

      const providerDisplayName =
        getProviderDisplayName(
          providerCode,
        );

      if (
        !phoneNumber
      ) {
        return noStoreJson(
          {
            ok:
              false,

            code:
              'PHONE_NUMBER_REQUIRED',

            message:
              `A verified Firebase phone number is required for ${providerDisplayName} deposits.`,
          },
          403,
          rateLimitHeaders,
        );
      }

      const initiation =
        await initiateDepositProvider({
          uid,

          clientOperationId:
            operationId,

          asset,

          rail,

          providerCode,

          amountAtomic,

          payer: {
            type:
              'MSISDN',

            value:
              phoneNumber,
          },
        });

      const result =
        initiation.deposit;

      return noStoreJson(
        {
          ok:
            true,

          deposit: {
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

            status:
              result.status,

            idempotent:
              initiation.idempotent,

            expiresAt:
              new Date(
                result.expiresAtMs,
              ).toISOString(),
          },

          paymentInstructions:
            initiation.provider
              .customerAction,

          providerStatus:
            initiation.provider
              .status,

          providerExpiresAt:
            initiation.provider
              .expiresAtMs ===
              null
              ? null
              : new Date(
                  initiation.provider
                    .expiresAtMs,
                ).toISOString(),

          message:
            `${providerDisplayName} sandbox deposit request initiated. No balance has been credited.`,
        },
        202,
        rateLimitHeaders,
      );
    }

    /*
     * Providers without an installed adapter retain the
     * secure pending-request behavior. They issue no payment
     * instructions and cannot credit a balance.
     */
    const result =
      await createPendingDepositRequest({
        uid,

        clientOperationId:
          operationId,

        asset,

        rail,

        providerCode,

        amountAtomic,
      });

    return noStoreJson(
      {
        ok:
          true,

        deposit: {
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

          status:
            result.status,

          idempotent:
            result.idempotent,

          expiresAt:
            new Date(
              result.expiresAtMs,
            ).toISOString(),
        },

        paymentInstructions:
          null,

        message:
          'Deposit request received. No payment instruction has been issued and no balance has been credited.',
      },
      202,
      rateLimitHeaders,
    );
  } catch (
    error
  ) {
    if (
      error instanceof
        DepositEligibilityError
    ) {
      return noStoreJson(
        {
          ok:
            false,

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
        'DEPOSIT_OPERATION_CONFLICT'
    ) {
      return noStoreJson(
        {
          ok:
            false,

          code:
            'DEPOSIT_CONFLICT',

          message:
            'Deposit operation conflict.',
        },
        409,
        rateLimitHeaders,
      );
    }

    if (
      message ===
        'DEPOSIT_ROUTE_NOT_SUPPORTED' ||
      message ===
        'PAYMENT_PROVIDER_UNSUPPORTED_ROUTE'
    ) {
      return noStoreJson(
        {
          ok:
            false,

          code:
            'DEPOSIT_ROUTE_NOT_SUPPORTED',

          message:
            'This deposit route is not available.',
        },
        400,
        rateLimitHeaders,
      );
    }

    if (
      message ===
        'DEPOSIT_ACCOUNT_NOT_FOUND'
    ) {
      return noStoreJson(
        {
          ok:
            false,

          code:
            'DEPOSIT_ACCOUNT_NOT_READY',

          message:
            'The financial account is not ready for deposits.',
        },
        409,
        rateLimitHeaders,
      );
    }

    if (
      message ===
        'PAYMENT_PROVIDER_NOT_CONFIGURED'
    ) {
      return noStoreJson(
        {
          ok:
            false,

          code:
            'DEPOSIT_PROVIDER_UNAVAILABLE',

          message:
            'The selected payment provider is not available.',
        },
        503,
        rateLimitHeaders,
      );
    }

    console.error(
      'Unable to create secure deposit request:',
      error instanceof Error
        ? error.name
        : 'UnknownError',
    );

    return noStoreJson(
      {
        ok:
          false,

        code:
          'DEPOSIT_FAILED',

        message:
          'Unable to create deposit request.',
      },
      500,
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