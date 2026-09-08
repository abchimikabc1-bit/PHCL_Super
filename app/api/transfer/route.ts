import 'server-only';

import {
  createHash,
} from 'node:crypto';

import type {
  UserRecord,
} from 'firebase-admin/auth';

import {
  NextResponse,
} from 'next/server';

import {
  adminAuth,
} from '@/lib/firebase-admin';

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
  runServerFinancialTransfer,
  type FinancialAsset,
} from '@/lib/server-financial-ledger';

export const runtime =
  'nodejs';

export const dynamic =
  'force-dynamic';

const MAX_REQUEST_BODY_BYTES =
  8_192;

const MAX_EMAIL_LENGTH =
  320;

const MAX_CLIENT_OPERATION_ID_LENGTH =
  120;

const MAX_DISPLAY_AMOUNT_LENGTH =
  64;

const SUPPORTED_TRANSFER_ASSETS =
  new Set<FinancialAsset>([
    'USD',
    'TZS',
    'NTZS',
    'PI',
  ]);

type TransferRequestBody = {
  recipientEmail?: unknown;

  asset?: unknown;

  amount?: unknown;

  operationId?: unknown;
};

type TransferEligibilityErrorCode =
  | 'EMAIL_VERIFICATION_REQUIRED'
  | 'PHONE_VERIFICATION_REQUIRED'
  | 'ACCOUNT_RESTRICTED'
  | 'KYC_REQUIRED'
  | 'KYS_REQUIRED'
  | 'KYB_REQUIRED'
  | 'STRONG_AUTHENTICATION_REQUIRED';

class TransferEligibilityError extends Error {
  readonly code:
    TransferEligibilityErrorCode;

  constructor(
    code:
      TransferEligibilityErrorCode,
    message: string,
  ) {
    super(message);

    this.name =
      'TransferEligibilityError';

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

function normalizeRecipientEmail(
  value: unknown,
): string {
  if (
    typeof value !==
      'string'
  ) {
    throw new Error(
      'Invalid recipient.',
    );
  }

  const email =
    value
      .trim()
      .toLowerCase();

  if (
    !email ||
    email.length >
      MAX_EMAIL_LENGTH ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email,
    )
  ) {
    throw new Error(
      'Invalid recipient.',
    );
  }

  return email;
}

function normalizeAsset(
  value: unknown,
): FinancialAsset {
  if (
    typeof value !==
      'string'
  ) {
    throw new Error(
      'Invalid transfer asset.',
    );
  }

  const asset =
    value
      .trim()
      .toUpperCase() as
        FinancialAsset;

  if (
    !SUPPORTED_TRANSFER_ASSETS.has(
      asset,
    )
  ) {
    throw new Error(
      'Unsupported transfer asset.',
    );
  }

  return asset;
}

function normalizeDisplayAmount(
  value: unknown,
): string {
  if (
    typeof value !==
      'string'
  ) {
    throw new Error(
      'Invalid transfer amount.',
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
      'Invalid transfer amount.',
    );
  }

  return amount;
}

function normalizeClientOperationId(
  value: unknown,
): string {
  if (
    typeof value !==
      'string'
  ) {
    throw new Error(
      'Invalid transfer operation ID.',
    );
  }

  const operationId =
    value.trim();

  if (
    !operationId ||
    operationId.length >
      MAX_CLIENT_OPERATION_ID_LENGTH ||
    !/^[A-Za-z0-9._:-]+$/.test(
      operationId,
    )
  ) {
    throw new Error(
      'Invalid transfer operation ID.',
    );
  }

  return operationId;
}

/**
 * Converts a browser-generated
 * idempotency key into a UID-scoped
 * authoritative operation identifier.
 */
function createServerOperationId(
  senderUid: string,
  clientOperationId: string,
): string {
  const digest =
    createHash(
      'sha256',
    )
      .update(
        [
          'customer_transfer_v1',
          senderUid,
          clientOperationId,
        ].join('|'),
        'utf8',
      )
      .digest('hex');

  return `transfer:${digest}`;
}

async function readJsonBody(
  request: Request,
): Promise<TransferRequestBody> {
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
      'Invalid content type.',
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
        'Transfer request is too large.',
      );
    }
  }

  const raw =
    await request.text();

  if (
    !raw ||
    new TextEncoder()
      .encode(raw)
      .byteLength >
        MAX_REQUEST_BODY_BYTES
  ) {
    throw new Error(
      'Invalid transfer request.',
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
      'Invalid transfer request.',
    );
  }

  if (
    !isPlainObject(
      parsed,
    )
  ) {
    throw new Error(
      'Invalid transfer request.',
    );
  }

  const allowedKeys =
    new Set([
      'recipientEmail',
      'asset',
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
      'Invalid transfer request.',
    );
  }

  return parsed;
}

function requireTransferEligibility(
  facts:
    VerificationFacts,
  assessment:
    VerificationAssessment,
): void {
  if (
    !facts.emailVerified
  ) {
    throw new TransferEligibilityError(
      'EMAIL_VERIFICATION_REQUIRED',
      'Email verification is required.',
    );
  }

  if (
    !facts.phoneVerified
  ) {
    throw new TransferEligibilityError(
      'PHONE_VERIFICATION_REQUIRED',
      'Phone verification is required.',
    );
  }

  if (
    !facts.goodAccountStanding
  ) {
    throw new TransferEligibilityError(
      'ACCOUNT_RESTRICTED',
      'The account is not eligible for transfers.',
    );
  }

  if (
    assessment.kyc.status !==
      'APPROVED'
  ) {
    throw new TransferEligibilityError(
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
    throw new TransferEligibilityError(
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
    throw new TransferEligibilityError(
      'KYB_REQUIRED',
      'Approved KYB is required.',
    );
  }

  if (
    !assessment.security
      .strongAuthenticationReady
  ) {
    throw new TransferEligibilityError(
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

  requireTransferEligibility(
    facts,
    assessment,
  );
}

async function findRecipient(
  recipientEmail: string,
): Promise<UserRecord | null> {
  try {
    return await adminAuth
      .getUserByEmail(
        recipientEmail,
      );
  } catch {
    /**
     * Do not reveal whether a Firebase
     * account exists or which check failed.
     */
    return null;
  }
}

/**
 * ============================================================
 * PHCL SUPER — SECURE CUSTOMER TRANSFER API
 * ============================================================
 *
 * Browser authority is limited to:
 *
 * - recipientEmail
 * - asset
 * - amount
 * - operationId
 *
 * Sender identity comes exclusively from
 * a verified, non-revoked Firebase token.
 *
 * All balance mutations and ledger writes
 * are executed server-side and atomically.
 */
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
    rateLimit =
      await consumeTransferRateLimit(
        authentication.user.uid,
        getTransferNetworkKey(
          request,
        ),
      );
  } catch {
    /**
     * Financial activity fails closed
     * if abuse prevention is unavailable
     * or misconfigured.
     */
    return noStoreJson(
      {
        ok: false,

        code:
          'TRANSFER_SECURITY_UNAVAILABLE',

        message:
          'Transfer security is temporarily unavailable.',
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
          'TRANSFER_RATE_LIMITED',

        message:
          'Too many transfer requests. Try again later.',
      },
      429,
      rateLimitHeaders,
    );
  }

  let body:
    TransferRequestBody;

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
          'Invalid transfer request.',
      },
      400,
      rateLimitHeaders,
    );
  }

  let recipientEmail:
    string;

  let asset:
    FinancialAsset;

  let amount:
    string;

  let clientOperationId:
    string;

  let amountAtomic:
    string;

  try {
    recipientEmail =
      normalizeRecipientEmail(
        body.recipientEmail,
      );

    asset =
      normalizeAsset(
        body.asset,
      );

    amount =
      normalizeDisplayAmount(
        body.amount,
      );

    clientOperationId =
      normalizeClientOperationId(
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
        'Invalid transfer amount.',
      );
    }
  } catch {
    return noStoreJson(
      {
        ok: false,

        code:
          'INVALID_TRANSFER',

        message:
          'Recipient, currency or amount is invalid.',
      },
      400,
      rateLimitHeaders,
    );
  }

  const senderUid =
    authentication.user.uid;

  try {
    const senderRecord =
      await adminAuth.getUser(
        senderUid,
      );

    const senderEmail =
      senderRecord.email
        ?.trim()
        .toLowerCase() ??
      '';

    if (
      !senderEmail ||
      senderEmail ===
        recipientEmail
    ) {
      return noStoreJson(
        {
          ok: false,

          code:
            'SELF_TRANSFER_NOT_ALLOWED',

          message:
            'You cannot transfer funds to your own account.',
        },
        400,
        rateLimitHeaders,
      );
    }

    await requireEligibleCustomer(
      senderUid,
    );

    const recipientRecord =
      await findRecipient(
        recipientEmail,
      );

    if (
      !recipientRecord ||
      recipientRecord.uid ===
        senderUid ||
      recipientRecord.disabled ===
        true
    ) {
      return noStoreJson(
        {
          ok: false,

          code:
            'RECIPIENT_NOT_AVAILABLE',

          message:
            'The recipient account is not available.',
        },
        404,
        rateLimitHeaders,
      );
    }

    try {
      await requireEligibleCustomer(
        recipientRecord.uid,
      );
    } catch {
      /**
       * Do not disclose the recipient's
       * KYC, KYS, KYB, phone, security
       * or account-standing status.
       */
      return noStoreJson(
        {
          ok: false,

          code:
            'RECIPIENT_NOT_AVAILABLE',

          message:
            'The recipient account is not available.',
        },
        404,
        rateLimitHeaders,
      );
    }

    const serverOperationId =
      createServerOperationId(
        senderUid,
        clientOperationId,
      );

    const result =
      await runServerFinancialTransfer({
        operationId:
          serverOperationId,

        senderUid,

        recipientUid:
          recipientRecord.uid,

        asset,

        amountAtomic,

        description:
          'Customer account transfer',

        metadata: {
          channel:
            'PHCL_WEB',

          initiatedBy:
            'CUSTOMER',

          policyVersion:
            'customer_transfer_v1',
        },
      });

    return noStoreJson(
      {
        ok: true,

        transfer: {
          operationId:
            clientOperationId,

          asset:
            result.asset,

          amount,

          status:
            'COMPLETED',

          idempotent:
            result.idempotent,
        },
      },
      200,
      rateLimitHeaders,
    );
  } catch (error) {
    if (
      error instanceof
        TransferEligibilityError
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
      /insufficient funds/i.test(
        message,
      )
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
      /operation ID has already been used/i.test(
        message,
      )
    ) {
      return noStoreJson(
        {
          ok: false,

          code:
            'TRANSFER_CONFLICT',

          message:
            'Transfer operation conflict.',
        },
        409,
        rateLimitHeaders,
      );
    }

    /**
     * Do not expose Firebase Admin,
     * Firestore, ledger, rate-limit or
     * verification internals.
     */
    return noStoreJson(
      {
        ok: false,

        code:
          'TRANSFER_FAILED',

        message:
          'Unable to complete transfer.',
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