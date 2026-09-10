import 'server-only';

import {
  createHash,
  createHmac,
  createPrivateKey,
  sign,
  timingSafeEqual,
  X509Certificate,
} from 'node:crypto';

import type {
  FinancialAsset,
} from '@/lib/server-financial-ledger';

import {
  ProviderAdapterError,
  type InitiateProviderDepositInput,
  type NormalizedProviderCallback,
  type PaymentProviderAdapter,
  type PaymentProviderRail,
  type ProviderCallbackRequest,
  type ProviderDepositInitiationResult,
} from '@/lib/server-payment-provider-types';

const VISA_ACCEPTANCE_SANDBOX_API_ORIGIN =
  'https://apitest.visaacceptance.com';

const VISA_PAYMENTS_PATH =
  '/pts/v2/payments';

const VISA_MERCHANT_ID_ENV =
  'VISA_ACCEPTANCE_SANDBOX_MERCHANT_ID';

const VISA_JWT_CERTIFICATE_ENV =
  'VISA_ACCEPTANCE_SANDBOX_JWT_CERTIFICATE';

const VISA_JWT_PRIVATE_KEY_ENV =
  'VISA_ACCEPTANCE_SANDBOX_JWT_PRIVATE_KEY';

const VISA_WEBHOOK_KEY_ID_ENV =
  'VISA_ACCEPTANCE_SANDBOX_WEBHOOK_KEY_ID';

const VISA_WEBHOOK_SECRET_ENV =
  'VISA_ACCEPTANCE_SANDBOX_WEBHOOK_SECRET';

const VISA_CALLBACK_MAX_AGE_ENV =
  'VISA_ACCEPTANCE_SANDBOX_CALLBACK_MAX_AGE_SECONDS';

const VISA_PAYMENT_TOKEN_MAX_AGE_ENV =
  'VISA_ACCEPTANCE_SANDBOX_PAYMENT_TOKEN_MAX_AGE_SECONDS';

const REQUEST_TIMEOUT_MS =
  15_000;

const MAX_PROVIDER_RESPONSE_BYTES =
  256 * 1024;

const MAX_PAYMENT_TOKEN_LENGTH =
  16_384;

const MAX_IDENTIFIER_LENGTH =
  120;

const DEFAULT_CALLBACK_MAX_AGE_SECONDS =
  300;

const DEFAULT_PAYMENT_TOKEN_MAX_AGE_SECONDS =
  900;

type JsonRecord =
  Record<string, unknown>;

type VisaPaymentResponse = {
  id?: unknown;

  status?: unknown;

  submitTimeUtc?: unknown;

  clientReferenceInformation?:
    unknown;

  processorInformation?:
    unknown;

  errorInformation?:
    unknown;
};

type VisaCallbackBody = {
  id?: unknown;

  eventId?: unknown;

  eventType?: unknown;

  status?: unknown;

  payload?: unknown;

  data?: unknown;

  resource?: unknown;

  clientReferenceInformation?:
    unknown;

  processorInformation?:
    unknown;
};

type VisaSignature = {
  timestampMs:
    number;

  keyId:
    string;

  signature:
    Buffer;
};

function isPlainObject(
  value:
    unknown,
): value is JsonRecord {
  return (
    typeof value ===
      'object' &&
    value !== null &&
    !Array.isArray(
      value,
    )
  );
}

function sha256Hex(
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

function sha256Base64(
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
      'base64',
    );
}

function base64UrlJson(
  value:
    unknown,
): string {
  return Buffer
    .from(
      JSON.stringify(
        value,
      ),
      'utf8',
    )
    .toString(
      'base64url',
    );
}

function throwAdapterError(
  code:
    ConstructorParameters<
      typeof ProviderAdapterError
    >[0],
  options?: {
    retryable?:
      boolean;

    cause?:
      unknown;
  },
): never {
  throw new ProviderAdapterError(
    code,
    options,
  );
}

function readRequiredSecret(
  name:
    string,
): string {
  const value =
    process.env[name]
      ?.trim();

  if (
    !value
  ) {
    throwAdapterError(
      'PROVIDER_CONFIGURATION_INVALID',
    );
  }

  return value;
}

function readPositiveIntegerEnv(
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

function normalizeIdentifier(
  value:
    unknown,
): string {
  if (
    typeof value !==
      'string'
  ) {
    throwAdapterError(
      'PROVIDER_REQUEST_INVALID',
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
    throwAdapterError(
      'PROVIDER_REQUEST_INVALID',
    );
  }

  return normalized;
}

function atomicUsdToDecimal(
  value:
    string,
): string {
  if (
    !/^[1-9][0-9]*$/.test(
      value,
    ) ||
    value.length > 40
  ) {
    throwAdapterError(
      'PROVIDER_REQUEST_INVALID',
    );
  }

  const padded =
    value.padStart(
      3,
      '0',
    );

  const whole =
    padded.slice(
      0,
      -2,
    );

  const fractional =
    padded.slice(
      -2,
    );

  return `${whole}.${fractional}`;
}

function decodePaymentTokenPayload(
  token:
    string,
): JsonRecord {
  const parts =
    token.split(
      '.',
    );

  if (
    parts.length !== 3 ||
    parts.some(
      (
        part,
      ) =>
        !part ||
        !/^[A-Za-z0-9_-]+$/.test(
          part,
        ),
    )
  ) {
    throwAdapterError(
      'PROVIDER_REQUEST_INVALID',
    );
  }

  try {
    const payload =
      JSON.parse(
        Buffer
          .from(
            parts[1],
            'base64url',
          )
          .toString(
            'utf8',
          ),
      ) as unknown;

    if (
      !isPlainObject(
        payload,
      )
    ) {
      throw new Error(
        'INVALID_PAYMENT_TOKEN',
      );
    }

    return payload;
  } catch (
    error
  ) {
    throwAdapterError(
      'PROVIDER_REQUEST_INVALID',
      {
        cause:
          error,
      },
    );
  }
}

function normalizePaymentToken(
  value:
    unknown,
  nowMs =
    Date.now(),
): string {
  if (
    typeof value !==
      'string'
  ) {
    throwAdapterError(
      'PROVIDER_REQUEST_INVALID',
    );
  }

  const token =
    value.trim();

  if (
    !token ||
    token.length >
      MAX_PAYMENT_TOKEN_LENGTH
  ) {
    throwAdapterError(
      'PROVIDER_REQUEST_INVALID',
    );
  }

  const payload =
    decodePaymentTokenPayload(
      token,
    );

  const issuedAt =
    payload.iat;

  const expiresAt =
    payload.exp;

  if (
    typeof issuedAt !==
      'number' ||
    !Number.isSafeInteger(
      issuedAt,
    ) ||
    typeof expiresAt !==
      'number' ||
    !Number.isSafeInteger(
      expiresAt,
    )
  ) {
    throwAdapterError(
      'PROVIDER_REQUEST_INVALID',
    );
  }

  const nowSeconds =
    Math.floor(
      nowMs /
        1_000,
    );

  const maxAgeSeconds =
    readPositiveIntegerEnv(
      VISA_PAYMENT_TOKEN_MAX_AGE_ENV,
      DEFAULT_PAYMENT_TOKEN_MAX_AGE_SECONDS,
    );

  if (
    issuedAt >
      nowSeconds + 60 ||
    expiresAt <=
      nowSeconds ||
    expiresAt <=
      issuedAt ||
    expiresAt -
      issuedAt >
      maxAgeSeconds
  ) {
    throwAdapterError(
      'PROVIDER_REQUEST_INVALID',
    );
  }

  return token;
}

function normalizeCertificate(
  value:
    string,
): {
  certificate:
    X509Certificate;

  x5c:
    string;
} {
  const normalized =
    value.replace(
      /\\n/g,
      '\n',
    );

  try {
    const certificate =
      new X509Certificate(
        normalized,
      );

    const x5c =
      certificate.raw
        .toString(
          'base64',
        );

    return {
      certificate,

      x5c,
    };
  } catch (
    error
  ) {
    throwAdapterError(
      'PROVIDER_CONFIGURATION_INVALID',
      {
        cause:
          error,
      },
    );
  }
}

function normalizePrivateKey(
  value:
    string,
) {
  const normalized =
    value.replace(
      /\\n/g,
      '\n',
    );

  try {
    return createPrivateKey(
      normalized,
    );
  } catch (
    error
  ) {
    throwAdapterError(
      'PROVIDER_CONFIGURATION_INVALID',
      {
        cause:
          error,
      },
    );
  }
}

function createAuthorizationToken(
  requestBody:
    string,
  now =
    new Date(),
): string {
  const merchantId =
    normalizeIdentifier(
      readRequiredSecret(
        VISA_MERCHANT_ID_ENV,
      ),
    );

  const {
    certificate,
    x5c,
  } =
    normalizeCertificate(
      readRequiredSecret(
        VISA_JWT_CERTIFICATE_ENV,
      ),
    );

  const privateKey =
    normalizePrivateKey(
      readRequiredSecret(
        VISA_JWT_PRIVATE_KEY_ENV,
      ),
    );

  const header =
    base64UrlJson({
      alg:
        'RS256',

      typ:
        'JWT',

      kid:
        certificate
          .serialNumber,

      x5c: [
        x5c,
      ],

      'v-c-merchant-id':
        merchantId,
    });

  const claims =
    base64UrlJson({
      iat:
        now.toUTCString(),

      digest:
        sha256Base64(
          requestBody,
        ),

      digestAlgorithm:
        'SHA-256',
    });

  const signingInput =
    `${header}.${claims}`;

  let signature:
    Buffer;

  try {
    signature =
      sign(
        'RSA-SHA256',
        Buffer.from(
          signingInput,
          'utf8',
        ),
        privateKey,
      );
  } catch (
    error
  ) {
    throwAdapterError(
      'PROVIDER_CONFIGURATION_INVALID',
      {
        cause:
          error,
      },
    );
  }

  return [
    signingInput,
    signature.toString(
      'base64url',
    ),
  ].join(
    '.',
  );
}

function getHeader(
  headers:
    Readonly<
      Record<
        string,
        string
      >
    >,
  name:
    string,
): string | null {
  const direct =
    headers[
      name.toLowerCase()
    ];

  if (
    typeof direct ===
      'string'
  ) {
    return direct;
  }

  for (
    const [
      key,
      value,
    ] of Object.entries(
      headers,
    )
  ) {
    if (
      key.toLowerCase() ===
        name.toLowerCase()
    ) {
      return value;
    }
  }

  return null;
}

function parseJson(
  raw:
    string,
): JsonRecord {
  try {
    const parsed =
      JSON.parse(
        raw,
      ) as unknown;

    if (
      !isPlainObject(
        parsed,
      )
    ) {
      throw new Error(
        'INVALID_JSON_OBJECT',
      );
    }

    return parsed;
  } catch (
    error
  ) {
    throwAdapterError(
      'PROVIDER_RESPONSE_INVALID',
      {
        cause:
          error,
      },
    );
  }
}

async function readProviderResponse(
  response:
    Response,
): Promise<{
  raw:
    string;

  body:
    JsonRecord;
}> {
  const contentLength =
    response.headers.get(
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
      parsedLength >
        MAX_PROVIDER_RESPONSE_BYTES
    ) {
      throwAdapterError(
        'PROVIDER_RESPONSE_INVALID',
      );
    }
  }

  const raw =
    await response.text();

  if (
    Buffer.byteLength(
      raw,
      'utf8',
    ) >
      MAX_PROVIDER_RESPONSE_BYTES
  ) {
    throwAdapterError(
      'PROVIDER_RESPONSE_INVALID',
    );
  }

  const body =
    parseJson(
      raw,
    );

  return {
    raw,

    body,
  };
}

async function visaFetch(
  requestBody:
    string,
): Promise<{
  raw:
    string;

  body:
    JsonRecord;
}> {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      REQUEST_TIMEOUT_MS,
    );

  try {
    const authorization =
      createAuthorizationToken(
        requestBody,
      );

    const merchantId =
      normalizeIdentifier(
        readRequiredSecret(
          VISA_MERCHANT_ID_ENV,
        ),
      );

    const response =
      await fetch(
        `${VISA_ACCEPTANCE_SANDBOX_API_ORIGIN}${VISA_PAYMENTS_PATH}`,
        {
          method:
            'POST',

          headers: {
            Accept:
              'application/json',

            Authorization:
              `Bearer ${authorization}`,

            'Content-Type':
              'application/json',

            'v-c-merchant-id':
              merchantId,
          },

          body:
            requestBody,

          cache:
            'no-store',

          redirect:
            'error',

          signal:
            controller.signal,
        },
      );

    const result =
      await readProviderResponse(
        response,
      );

    if (
      !response.ok
    ) {
      throwAdapterError(
        response.status >= 500
          ? 'PROVIDER_TEMPORARILY_UNAVAILABLE'
          : 'PROVIDER_REQUEST_FAILED',
        {
          retryable:
            response.status >= 500,
        },
      );
    }

    return result;
  } catch (
    error
  ) {
    if (
      error instanceof
        ProviderAdapterError
    ) {
      throw error;
    }

    throwAdapterError(
      'PROVIDER_TEMPORARILY_UNAVAILABLE',
      {
        retryable:
          true,

        cause:
          error,
      },
    );
  } finally {
    clearTimeout(
      timeout,
    );
  }
}

function readNestedObject(
  value:
    unknown,
  key:
    string,
): JsonRecord | null {
  if (
    !isPlainObject(
      value,
    )
  ) {
    return null;
  }

  const nested =
    value[key];

  return isPlainObject(
    nested,
  )
    ? nested
    : null;
}

function readOptionalIdentifier(
  value:
    unknown,
): string | null {
  if (
    typeof value !==
      'string'
  ) {
    return null;
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
    return null;
  }

  return normalized;
}

function validateInitiationInput(
  input:
    InitiateProviderDepositInput,
): {
  requestId:
    string;

  operationId:
    string;

  amount:
    string;

  paymentToken:
    string;
} {
  if (
    input.providerCode !==
      'VISA_ACCEPTANCE' ||
    input.environment !==
      'SANDBOX' ||
    input.rail !==
      'CARD' ||
    input.asset !==
      'USD' ||
    input.payer.type !==
      'PAYMENT_TOKEN'
  ) {
    throwAdapterError(
      'PROVIDER_ROUTE_NOT_SUPPORTED',
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

    amount:
      atomicUsdToDecimal(
        input.amountAtomic,
      ),

    paymentToken:
      normalizePaymentToken(
        input.payer.value,
      ),
  };
}

function normalizePaymentStatus(
  value:
    unknown,
): ProviderDepositInitiationResult[
  'status'
] {
  if (
    typeof value !==
      'string'
  ) {
    throwAdapterError(
      'PROVIDER_RESPONSE_INVALID',
    );
  }

  const normalized =
    value
      .trim()
      .toUpperCase();

  if (
    normalized ===
      'AUTHORIZED' ||
    normalized ===
      'AUTHORIZED_PENDING_REVIEW' ||
    normalized ===
      'PENDING' ||
    normalized ===
      'PENDING_AUTHENTICATION' ||
    normalized ===
      'PENDING_REVIEW' ||
    normalized ===
      'TRANSMITTED'
  ) {
    /*
     * Even an authorization or provider-side capture does
     * not settle a PHCL balance. PHCL waits for a verified
     * callback before recording financial settlement.
     */
    return 'PENDING';
  }

  if (
    normalized ===
      'DECLINED' ||
    normalized ===
      'INVALID_REQUEST' ||
    normalized ===
      'SERVER_ERROR' ||
    normalized ===
      'REVERSED' ||
    normalized ===
      'VOIDED'
  ) {
    return 'FAILED';
  }

  throwAdapterError(
    'PROVIDER_RESPONSE_INVALID',
  );
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

  /*
   * SECURITY:
   *
   * The transient payment token is sent directly to Visa
   * Acceptance. It must never be logged, persisted, hashed
   * into metadata or returned to the browser.
   */
  const requestBody =
    JSON.stringify({
      clientReferenceInformation: {
        code:
          normalized.requestId,

        partner: {
          originalTransactionId:
            normalized.operationId,
        },
      },

      processingInformation: {
        capture:
          true,

        commerceIndicator:
          'internet',
      },

      tokenInformation: {
        transientTokenJwt:
          normalized.paymentToken,
      },

      orderInformation: {
        amountDetails: {
          totalAmount:
            normalized.amount,

          currency:
            'USD',
        },
      },
    });

  const response =
    await visaFetch(
      requestBody,
    );

  const body =
    response.body as
      VisaPaymentResponse;

  const providerTransactionId =
    readOptionalIdentifier(
      body.id,
    );

  if (
    !providerTransactionId
  ) {
    throwAdapterError(
      'PROVIDER_RESPONSE_INVALID',
    );
  }

  const clientReference =
    readNestedObject(
      body,
      'clientReferenceInformation',
    );

  const returnedRequestId =
    readOptionalIdentifier(
      clientReference?.code,
    );

  if (
    returnedRequestId &&
    returnedRequestId !==
      normalized.requestId
  ) {
    throwAdapterError(
      'PROVIDER_RESPONSE_INVALID',
    );
  }

  const status =
    normalizePaymentStatus(
      body.status,
    );

  return {
    success:
      true,

    providerCode:
      'VISA_ACCEPTANCE',

    environment:
      'SANDBOX',

    requestId:
      normalized.requestId,

    operationId:
      normalized.operationId,

    providerRequestId:
      providerTransactionId,

    providerTransactionId,

    status,

    customerAction:
      null,

    expiresAtMs:
      null,

    responseFingerprint:
      sha256Hex(
        response.raw,
      ),
  };
}

function parseVisaSignature(
  value:
    string | null,
): VisaSignature {
  if (
    !value ||
    value.length > 2_048
  ) {
    throwAdapterError(
      'PROVIDER_CALLBACK_UNAUTHORIZED',
    );
  }

  const values =
    new Map<
      string,
      string
    >();

  for (
    const component of
      value.split(
        ';',
      )
  ) {
    const separator =
      component.indexOf(
        '=',
      );

    if (
      separator <= 0
    ) {
      throwAdapterError(
        'PROVIDER_CALLBACK_UNAUTHORIZED',
      );
    }

    const key =
      component
        .slice(
          0,
          separator,
        )
        .trim();

    const componentValue =
      component
        .slice(
          separator + 1,
        )
        .trim()
        .replace(
          /^"|"$/g,
          '',
        );

    if (
      !key ||
      !componentValue ||
      values.has(
        key,
      )
    ) {
      throwAdapterError(
        'PROVIDER_CALLBACK_UNAUTHORIZED',
      );
    }

    values.set(
      key,
      componentValue,
    );
  }

  const timestampValue =
    values.get(
      't',
    );

  const keyId =
    values.get(
      'keyId',
    );

  const signatureValue =
    values.get(
      'sig',
    );

  const timestampMs =
    Number(
      timestampValue,
    );

  if (
    !timestampValue ||
    !Number.isSafeInteger(
      timestampMs,
    ) ||
    timestampMs <= 0 ||
    !keyId ||
    keyId.length >
      MAX_IDENTIFIER_LENGTH ||
    !signatureValue
  ) {
    throwAdapterError(
      'PROVIDER_CALLBACK_UNAUTHORIZED',
    );
  }

  let signature:
    Buffer;

  try {
    signature =
      Buffer.from(
        signatureValue,
        'base64',
      );
  } catch (
    error
  ) {
    throwAdapterError(
      'PROVIDER_CALLBACK_UNAUTHORIZED',
      {
        cause:
          error,
      },
    );
  }

  if (
    signature.length !== 32
  ) {
    throwAdapterError(
      'PROVIDER_CALLBACK_UNAUTHORIZED',
    );
  }

  return {
    timestampMs,

    keyId,

    signature,
  };
}

function readWebhookSecret(): Buffer {
  const encodedSecret =
    readRequiredSecret(
      VISA_WEBHOOK_SECRET_ENV,
    );

  let secret:
    Buffer;

  try {
    secret =
      Buffer.from(
        encodedSecret,
        'base64',
      );
  } catch (
    error
  ) {
    throwAdapterError(
      'PROVIDER_CONFIGURATION_INVALID',
      {
        cause:
          error,
      },
    );
  }

  if (
    secret.length < 32
  ) {
    throwAdapterError(
      'PROVIDER_CONFIGURATION_INVALID',
    );
  }

  return secret;
}

function verifyCallbackSignature(
  request:
    ProviderCallbackRequest,
): void {
  const signature =
    parseVisaSignature(
      getHeader(
        request.headers,
        'v-c-signature',
      ),
    );

  const configuredKeyId =
    readRequiredSecret(
      VISA_WEBHOOK_KEY_ID_ENV,
    );

  if (
    signature.keyId !==
      configuredKeyId
  ) {
    throwAdapterError(
      'PROVIDER_CALLBACK_UNAUTHORIZED',
    );
  }

  const maxAgeSeconds =
    readPositiveIntegerEnv(
      VISA_CALLBACK_MAX_AGE_ENV,
      DEFAULT_CALLBACK_MAX_AGE_SECONDS,
    );

  const ageMs =
    request.receivedAtMs -
    signature.timestampMs;

  if (
    ageMs < -60_000 ||
    ageMs >
      maxAgeSeconds *
        1_000
  ) {
    throwAdapterError(
      'PROVIDER_CALLBACK_EXPIRED',
    );
  }

  const expected =
    createHmac(
      'sha256',
      readWebhookSecret(),
    )
      .update(
        `${signature.timestampMs}.${request.rawBody}`,
        'utf8',
      )
      .digest();

  if (
    expected.length !==
      signature.signature.length ||
    !timingSafeEqual(
      expected,
      signature.signature,
    )
  ) {
    throwAdapterError(
      'PROVIDER_CALLBACK_UNAUTHORIZED',
    );
  }
}

function getCallbackResource(
  body:
    VisaCallbackBody,
): JsonRecord {
  const payload =
    isPlainObject(
      body.payload,
    )
      ? body.payload
      : null;

  const data =
    isPlainObject(
      body.data,
    )
      ? body.data
      : null;

  const directResource =
    isPlainObject(
      body.resource,
    )
      ? body.resource
      : null;

  const payloadResource =
    payload &&
    isPlainObject(
      payload.resource,
    )
      ? payload.resource
      : null;

  const dataResource =
    data &&
    isPlainObject(
      data.resource,
    )
      ? data.resource
      : null;

  return (
    payloadResource ??
    dataResource ??
    directResource ??
    payload ??
    data ??
    body
  );
}

function readCallbackRequestId(
  body:
    VisaCallbackBody,
  resource:
    JsonRecord,
): string {
  const directReference =
    readNestedObject(
      resource,
      'clientReferenceInformation',
    );

  const bodyReference =
    readNestedObject(
      body,
      'clientReferenceInformation',
    );

  const requestId =
    readOptionalIdentifier(
      directReference?.code,
    ) ??
    readOptionalIdentifier(
      bodyReference?.code,
    );

  if (
    !requestId
  ) {
    throwAdapterError(
      'PROVIDER_CALLBACK_INVALID',
    );
  }

  return requestId;
}

function readCallbackEventId(
  body:
    VisaCallbackBody,
  resource:
    JsonRecord,
  payloadFingerprint:
    string,
): string {
  return (
    readOptionalIdentifier(
      body.eventId,
    ) ??
    readOptionalIdentifier(
      body.id,
    ) ??
    readOptionalIdentifier(
      resource.id,
    ) ??
    `visa_event_${payloadFingerprint}`
  );
}

function normalizeCallbackOutcome(
  body:
    VisaCallbackBody,
  resource:
    JsonRecord,
): NormalizedProviderCallback[
  'outcome'
] {
  const rawStatus =
    resource.status ??
    body.status ??
    body.eventType;

  if (
    typeof rawStatus !==
      'string'
  ) {
    throwAdapterError(
      'PROVIDER_CALLBACK_INVALID',
    );
  }

  const status =
    rawStatus
      .trim()
      .toUpperCase();

  if (
    status.includes(
      'CAPTURED',
    ) ||
    status.includes(
      'SETTLED',
    ) ||
    status.includes(
      'COMPLETED',
    ) ||
    status ===
      'TRANSMITTED'
  ) {
    return 'SUCCESS';
  }

  if (
    status.includes(
      'PENDING',
    ) ||
    status.includes(
      'AUTHORIZED',
    ) ||
    status.includes(
      'REVIEW',
    )
  ) {
    return 'PENDING';
  }

  if (
    status.includes(
      'DECLINED',
    ) ||
    status.includes(
      'FAILED',
    ) ||
    status.includes(
      'REJECTED',
    ) ||
    status.includes(
      'REVERSED',
    ) ||
    status.includes(
      'VOIDED',
    ) ||
    status.includes(
      'CANCELLED',
    )
  ) {
    return 'FAILED';
  }

  throwAdapterError(
    'PROVIDER_CALLBACK_INVALID',
  );
}

function readFailureReason(
  resource:
    JsonRecord,
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

  const errorInformation =
    readNestedObject(
      resource,
      'errorInformation',
    );

  const reason =
    errorInformation?.reason;

  if (
    typeof reason !==
      'string'
  ) {
    return 'VISA_PAYMENT_FAILED';
  }

  const normalized =
    reason
      .trim()
      .toUpperCase()
      .replace(
        /[^A-Z0-9_-]/g,
        '_',
      )
      .slice(
        0,
        MAX_IDENTIFIER_LENGTH,
      );

  return (
    normalized ||
    'VISA_PAYMENT_FAILED'
  );
}

async function verifyAndNormalizeCallback(
  request:
    ProviderCallbackRequest,
): Promise<
  NormalizedProviderCallback
> {
  if (
    request.providerCode !==
      'VISA_ACCEPTANCE' ||
    request.environment !==
      'SANDBOX' ||
    typeof request.rawBody !==
      'string' ||
    !request.rawBody
  ) {
    throwAdapterError(
      'PROVIDER_CALLBACK_INVALID',
    );
  }

  verifyCallbackSignature(
    request,
  );

  let parsed:
    JsonRecord;

  try {
    parsed =
      JSON.parse(
        request.rawBody,
      ) as unknown as
        JsonRecord;
  } catch (
    error
  ) {
    throwAdapterError(
      'PROVIDER_CALLBACK_INVALID',
      {
        cause:
          error,
      },
    );
  }

  if (
    !isPlainObject(
      parsed,
    )
  ) {
    throwAdapterError(
      'PROVIDER_CALLBACK_INVALID',
    );
  }

  const body =
    parsed as
      VisaCallbackBody;

  const resource =
    getCallbackResource(
      body,
    );

  const payloadFingerprint =
    sha256Hex(
      request.rawBody,
    );

  const outcome =
    normalizeCallbackOutcome(
      body,
      resource,
    );

  const providerTransactionId =
    readOptionalIdentifier(
      resource.id,
    );

  return {
    providerCode:
      'VISA_ACCEPTANCE',

    environment:
      'SANDBOX',

    kind:
      'DEPOSIT',

    requestId:
      readCallbackRequestId(
        body,
        resource,
      ),

    providerEventId:
      readCallbackEventId(
        body,
        resource,
        payloadFingerprint,
      ),

    providerTransactionId,

    outcome,

    failureReason:
      readFailureReason(
        resource,
        outcome,
      ),

    payloadFingerprint,
  };
}

const SUPPORTED_RAILS:
  readonly PaymentProviderRail[] =
    Object.freeze([
      'CARD',
    ]);

const SUPPORTED_ASSETS:
  readonly FinancialAsset[] =
    Object.freeze([
      'USD',
    ]);

export const visaAcceptanceSandboxAdapter:
  PaymentProviderAdapter =
    Object.freeze({
      providerCode:
        'VISA_ACCEPTANCE',

      environment:
        'SANDBOX',

      supportedRails:
        SUPPORTED_RAILS,

      supportedAssets:
        SUPPORTED_ASSETS,

      initiateDeposit,

      verifyAndNormalizeCallback,
    });