import 'server-only';

import {
  createHash,
  createHmac,
  timingSafeEqual,
} from 'node:crypto';

import type {
  InitiateProviderDepositInput,
  NormalizedProviderCallback,
  PaymentProviderAdapter,
  ProviderCallbackRequest,
  ProviderDepositInitiationResult,
} from '@/lib/server-payment-provider-types';

const PROVIDER_CODE =
  'AIRTEL_MONEY' as const;

const PROVIDER_ENVIRONMENT =
  'SANDBOX' as const;

const CALLBACK_SECRET_ENV =
  'AIRTEL_MONEY_SANDBOX_CALLBACK_SECRET';

const CALLBACK_MAX_AGE_ENV =
  'AIRTEL_MONEY_SANDBOX_CALLBACK_MAX_AGE_SECONDS';

const DEFAULT_CALLBACK_MAX_AGE_SECONDS =
  300;

const MAX_CALLBACK_BODY_BYTES =
  65_536;

const MAX_IDENTIFIER_LENGTH =
  160;

const IDENTIFIER_PATTERN =
  /^[A-Za-z0-9._:-]+$/;

type SandboxCallbackBody = {
  requestId?:
    unknown;

  providerEventId?:
    unknown;

  providerTransactionId?:
    unknown;

  status?:
    unknown;

  failureReason?:
    unknown;
};

function fail(
  code:
    string,
): never {
  throw new Error(
    code,
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

function normalizeIdentifier(
  value:
    unknown,
): string {
  if (
    typeof value !==
      'string'
  ) {
    return fail(
      'PAYMENT_PROVIDER_INVALID_IDENTIFIER',
    );
  }

  const normalized =
    value.trim();

  if (
    !normalized ||
    normalized.length >
      MAX_IDENTIFIER_LENGTH ||
    !IDENTIFIER_PATTERN.test(
      normalized,
    )
  ) {
    return fail(
      'PAYMENT_PROVIDER_INVALID_IDENTIFIER',
    );
  }

  return normalized;
}

function normalizeOptionalIdentifier(
  value:
    unknown,
): string | null {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  return normalizeIdentifier(
    value,
  );
}

function normalizeAmountAtomic(
  value:
    string,
): string {
  if (
    !/^[1-9][0-9]*$/.test(
      value,
    )
  ) {
    return fail(
      'PAYMENT_PROVIDER_INVALID_AMOUNT',
    );
  }

  try {
    if (
      BigInt(
        value,
      ) <= 0n
    ) {
      return fail(
        'PAYMENT_PROVIDER_INVALID_AMOUNT',
      );
    }
  } catch {
    return fail(
      'PAYMENT_PROVIDER_INVALID_AMOUNT',
    );
  }

  return value;
}

function normalizeMsisdn(
  value:
    string,
): string {
  let normalized =
    value
      .trim()
      .replace(
        /[\s()-]/g,
        '',
      );

  if (
    normalized.startsWith(
      '+255',
    )
  ) {
    normalized =
      normalized.slice(
        1,
      );
  } else if (
    normalized.startsWith(
      '0',
    )
  ) {
    normalized =
      `255${normalized.slice(1)}`;
  }

  /*
   * A Tanzanian mobile number is accepted without relying
   * on its original network prefix because mobile-number
   * portability may move a number between operators.
   */
  if (
    !/^255[67][0-9]{8}$/.test(
      normalized,
    )
  ) {
    return fail(
      'PAYMENT_PROVIDER_INVALID_PAYER_REFERENCE',
    );
  }

  return normalized;
}

function createFingerprint(
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

function createSandboxReference(
  prefix:
    string,

  value:
    string,
): string {
  return (
    `${prefix}_` +
    createFingerprint(
      value,
    ).slice(
      0,
      32,
    )
  );
}

function readCallbackSecret():
  string {
  const secret =
    process.env[
      CALLBACK_SECRET_ENV
    ]?.trim();

  if (
    !secret ||
    secret.length < 32
  ) {
    return fail(
      'PAYMENT_PROVIDER_CALLBACK_SECRET_NOT_CONFIGURED',
    );
  }

  return secret;
}

function readCallbackMaxAgeSeconds():
  number {
  const raw =
    process.env[
      CALLBACK_MAX_AGE_ENV
    ];

  if (!raw) {
    return DEFAULT_CALLBACK_MAX_AGE_SECONDS;
  }

  const parsed =
    Number(
      raw,
    );

  if (
    !Number.isSafeInteger(
      parsed,
    ) ||
    parsed <= 0 ||
    parsed > 3_600
  ) {
    return fail(
      'PAYMENT_PROVIDER_INVALID_CONFIGURATION',
    );
  }

  return parsed;
}

function getRequiredHeader(
  headers:
    Readonly<
      Record<
        string,
        string
      >
    >,

  name:
    string,
): string {
  const value =
    headers[
      name.toLowerCase()
    ]?.trim();

  if (!value) {
    return fail(
      'PAYMENT_PROVIDER_CALLBACK_UNAUTHORIZED',
    );
  }

  return value;
}

function verifyCallbackAuthentication(
  request:
    ProviderCallbackRequest,
): void {
  const timestampText =
    getRequiredHeader(
      request.headers,
      'x-phcl-sandbox-timestamp',
    );

  const signatureText =
    getRequiredHeader(
      request.headers,
      'x-phcl-sandbox-signature',
    );

  if (
    !/^[0-9]{10,13}$/.test(
      timestampText,
    )
  ) {
    fail(
      'PAYMENT_PROVIDER_CALLBACK_UNAUTHORIZED',
    );
  }

  const timestamp =
    Number(
      timestampText,
    );

  const timestampMs =
    timestampText.length ===
      10
      ? timestamp * 1_000
      : timestamp;

  const maxAgeMs =
    readCallbackMaxAgeSeconds() *
    1_000;

  if (
    !Number.isSafeInteger(
      timestampMs,
    ) ||
    Math.abs(
      request.receivedAtMs -
        timestampMs,
    ) > maxAgeMs
  ) {
    fail(
      'PAYMENT_PROVIDER_CALLBACK_EXPIRED',
    );
  }

  if (
    !/^[a-fA-F0-9]{64}$/.test(
      signatureText,
    )
  ) {
    fail(
      'PAYMENT_PROVIDER_CALLBACK_UNAUTHORIZED',
    );
  }

  const expectedSignature =
    createHmac(
      'sha256',
      readCallbackSecret(),
    )
      .update(
        `${timestampText}.${request.rawBody}`,
        'utf8',
      )
      .digest();

  const receivedSignature =
    Buffer.from(
      signatureText,
      'hex',
    );

  if (
    expectedSignature.length !==
      receivedSignature.length ||
    !timingSafeEqual(
      expectedSignature,
      receivedSignature,
    )
  ) {
    fail(
      'PAYMENT_PROVIDER_CALLBACK_UNAUTHORIZED',
    );
  }
}

function parseCallbackBody(
  rawBody:
    string,
): SandboxCallbackBody {
  if (
    !rawBody ||
    Buffer.byteLength(
      rawBody,
      'utf8',
    ) >
      MAX_CALLBACK_BODY_BYTES
  ) {
    return fail(
      'PAYMENT_PROVIDER_INVALID_CALLBACK',
    );
  }

  let parsed:
    unknown;

  try {
    parsed =
      JSON.parse(
        rawBody,
      );
  } catch {
    return fail(
      'PAYMENT_PROVIDER_INVALID_CALLBACK',
    );
  }

  if (
    !isPlainObject(
      parsed,
    )
  ) {
    return fail(
      'PAYMENT_PROVIDER_INVALID_CALLBACK',
    );
  }

  return parsed;
}

function normalizeCallbackOutcome(
  value:
    unknown,
): NormalizedProviderCallback[
  'outcome'
] {
  if (
    value === 'SUCCESS' ||
    value === 'PENDING' ||
    value === 'FAILED'
  ) {
    return value;
  }

  return fail(
    'PAYMENT_PROVIDER_INVALID_CALLBACK',
  );
}

function normalizeFailureReason(
  value:
    unknown,

  outcome:
    NormalizedProviderCallback[
      'outcome'
    ],
): string | null {
  if (
    outcome !==
      'FAILED'
  ) {
    return null;
  }

  if (
    typeof value !==
      'string'
  ) {
    return 'PROVIDER_REPORTED_FAILURE';
  }

  return (
    value
      .trim()
      .slice(
        0,
        240,
      ) ||
    'PROVIDER_REPORTED_FAILURE'
  );
}

function validateInitiationInput(
  input:
    InitiateProviderDepositInput,
) {
  if (
    input.providerCode !==
      PROVIDER_CODE ||
    input.environment !==
      PROVIDER_ENVIRONMENT
  ) {
    fail(
      'PAYMENT_PROVIDER_ADAPTER_MISMATCH',
    );
  }

  if (
    input.rail !==
      'MOBILE_MONEY' ||
    input.asset !==
      'TZS'
  ) {
    fail(
      'PAYMENT_PROVIDER_UNSUPPORTED_ROUTE',
    );
  }

  if (
    input.payer.type !==
      'MSISDN'
  ) {
    fail(
      'PAYMENT_PROVIDER_INVALID_PAYER_REFERENCE',
    );
  }

  return {
    requestId:
      normalizeIdentifier(
        input.requestId,
      ),

    operationId:
      normalizeIdentifier(
        input.operationId,
      ),

    amountAtomic:
      normalizeAmountAtomic(
        input.amountAtomic,
      ),

    msisdn:
      normalizeMsisdn(
        input.payer.value,
      ),
  };
}

async function initiateDeposit(
  input:
    InitiateProviderDepositInput,
): Promise<
  ProviderDepositInitiationResult
> {
  const normalized =
    validateInitiationInput(
      input,
    );

  const expiresAtMs =
    Date.now() +
    5 * 60 * 1_000;

  return {
    success:
      true,

    providerCode:
      PROVIDER_CODE,

    environment:
      PROVIDER_ENVIRONMENT,

    requestId:
      normalized.requestId,

    operationId:
      normalized.operationId,

    providerRequestId:
      createSandboxReference(
        'airtel_money_req',
        [
          normalized.requestId,
          normalized.operationId,
        ].join(
          '|',
        ),
      ),

    providerTransactionId:
      null,

    status:
      'REQUIRES_CUSTOMER_ACTION',

    customerAction: {
      type:
        'USSD_PROMPT',

      message:
        'Approve the Airtel Money sandbox payment prompt on your phone.',

      expiresAtMs,
    },

    expiresAtMs,

    responseFingerprint:
      createFingerprint(
        [
          PROVIDER_CODE,
          PROVIDER_ENVIRONMENT,
          normalized.requestId,
          normalized.operationId,
          normalized.amountAtomic,
          normalized.msisdn,
        ].join(
          '|',
        ),
      ),
  };
}

async function verifyAndNormalizeCallback(
  request:
    ProviderCallbackRequest,
): Promise<
  NormalizedProviderCallback
> {
  if (
    request.providerCode !==
      PROVIDER_CODE ||
    request.environment !==
      PROVIDER_ENVIRONMENT
  ) {
    fail(
      'PAYMENT_PROVIDER_ADAPTER_MISMATCH',
    );
  }

  verifyCallbackAuthentication(
    request,
  );

  const body =
    parseCallbackBody(
      request.rawBody,
    );

  const outcome =
    normalizeCallbackOutcome(
      body.status,
    );

  return {
    providerCode:
      PROVIDER_CODE,

    environment:
      PROVIDER_ENVIRONMENT,

    kind:
      'DEPOSIT',

    requestId:
      normalizeIdentifier(
        body.requestId,
      ),

    providerEventId:
      normalizeIdentifier(
        body.providerEventId,
      ),

    providerTransactionId:
      normalizeOptionalIdentifier(
        body.providerTransactionId,
      ),

    outcome,

    failureReason:
      normalizeFailureReason(
        body.failureReason,
        outcome,
      ),

    payloadFingerprint:
      createFingerprint(
        request.rawBody,
      ),
  };
}

export const airtelMoneySandboxAdapter:
  PaymentProviderAdapter =
    Object.freeze({
      providerCode:
        PROVIDER_CODE,

      environment:
        PROVIDER_ENVIRONMENT,

      supportedRails:
        Object.freeze(
          [
            'MOBILE_MONEY',
          ] as const,
        ),

      supportedAssets:
        Object.freeze(
          [
            'TZS',
          ] as const,
        ),

      initiateDeposit,

      verifyAndNormalizeCallback,
    });

export default
  airtelMoneySandboxAdapter;