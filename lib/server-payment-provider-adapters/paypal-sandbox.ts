import 'server-only';

import {
  createHash,
} from 'node:crypto';

import {
  ProviderAdapterError,
  type CaptureProviderDepositInput,
  type InitiateProviderDepositInput,
  type NormalizedProviderCallback,
  type PaymentProviderAdapter,
  type ProviderCallbackRequest,
  type ProviderDepositCaptureResult,
  type ProviderDepositInitiationResult,
} from '@/lib/server-payment-provider-types';

const PAYPAL_SANDBOX_API_ORIGIN =
  'https://api-m.sandbox.paypal.com';

const PAYPAL_CLIENT_ID_ENV =
  'PAYPAL_SANDBOX_CLIENT_ID';

const PAYPAL_CLIENT_SECRET_ENV =
  'PAYPAL_SANDBOX_CLIENT_SECRET';

const PAYPAL_WEBHOOK_ID_ENV =
  'PAYPAL_SANDBOX_WEBHOOK_ID';

const SITE_URL_ENV =
  'NEXT_PUBLIC_SITE_URL';

const REQUEST_TIMEOUT_MS =
  15_000;

const MAX_PROVIDER_RESPONSE_BYTES =
  65_536;

const MAX_PAYPAL_REQUEST_ID_LENGTH =
  108;

const MAX_IDENTIFIER_LENGTH =
  200;

const MAX_EMAIL_LENGTH =
  254;

const MAX_CALLBACK_AGE_MS =
  5 * 60 * 1_000;

type JsonRecord =
  Record<
    string,
    unknown
  >;

type PayPalAccessTokenResponse = {
  access_token?:
    unknown;

  token_type?:
    unknown;

  expires_in?:
    unknown;
};

type PayPalLink = {
  href?:
    unknown;

  rel?:
    unknown;

  method?:
    unknown;
};

type PayPalOrderResponse = {
  id?:
    unknown;

  status?:
    unknown;

  links?:
    unknown;
};


type PayPalCaptureRecord = {
  id?:
    unknown;
};

type PayPalCaptureResponse = {
  id?:
    unknown;

  status?:
    unknown;

  purchase_units?:
    unknown;
};
type PayPalWebhookVerificationResponse = {
  verification_status?:
    unknown;
};

type PayPalWebhookEvent = {
  id?:
    unknown;

  event_type?:
    unknown;

  create_time?:
    unknown;

  resource?:
    unknown;
};

type PayPalHttpResult = {
  response:
    Response;

  rawBody:
    string;

  parsed:
    unknown;
};

type CachedAccessToken = {
  token:
    string;

  expiresAtMs:
    number;
};

let cachedAccessToken:
  CachedAccessToken | null =
  null;

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

function sha256(
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

function throwAdapterError(
  code:
    ConstructorParameters<
      typeof ProviderAdapterError
    >[0],

  retryable = false,

  cause?:
    unknown,
): never {
  throw new ProviderAdapterError(
    code,
    {
      retryable,
      cause,
    },
  );
}

function readRequiredSecret(
  variableName:
    string,
): string {
  const value =
    process.env[
      variableName
    ]?.trim();

  if (
    !value ||
    value.length < 8 ||
    value.length >
      4_096
  ) {
    throwAdapterError(
      'PROVIDER_CONFIGURATION_INVALID',
    );
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

function normalizePayPalRequestId(
  value:
    unknown,
): string {
  const normalized =
    normalizeIdentifier(
      value,
    );

  if (
    normalized.length >
      MAX_PAYPAL_REQUEST_ID_LENGTH
  ) {
    throwAdapterError(
      'PROVIDER_REQUEST_INVALID',
    );
  }

  return normalized;
}

function normalizeEmail(
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
    throwAdapterError(
      'PROVIDER_REQUEST_INVALID',
    );
  }

  return email;
}

function atomicUsdToDecimal(
  value:
    unknown,
): string {
  if (
    typeof value !==
      'string' ||
    !/^[0-9]+$/.test(
      value,
    )
  ) {
    throwAdapterError(
      'PROVIDER_REQUEST_INVALID',
    );
  }

  let amountAtomic:
    bigint;

  try {
    amountAtomic =
      BigInt(
        value,
      );
  } catch {
    throwAdapterError(
      'PROVIDER_REQUEST_INVALID',
    );
  }

  if (
    amountAtomic <= 0n
  ) {
    throwAdapterError(
      'PROVIDER_REQUEST_INVALID',
    );
  }

  const dollars =
    amountAtomic /
    100n;

  const cents =
    amountAtomic %
    100n;

  return `${dollars}.${cents
    .toString()
    .padStart(
      2,
      '0',
    )}`;
}

function getApprovedSiteOrigin():
  string {
  const configured =
    process.env[
      SITE_URL_ENV
    ]?.trim();

  if (!configured) {
    throwAdapterError(
      'PROVIDER_CONFIGURATION_INVALID',
    );
  }

  let siteUrl:
    URL;

  try {
    siteUrl =
      new URL(
        configured,
      );
  } catch {
    throwAdapterError(
      'PROVIDER_CONFIGURATION_INVALID',
    );
  }

  if (
    siteUrl.protocol !==
      'https:' ||
    siteUrl.username ||
    siteUrl.password ||
    siteUrl.search ||
    siteUrl.hash
  ) {
    throwAdapterError(
      'PROVIDER_CONFIGURATION_INVALID',
    );
  }

  return siteUrl.origin;
}

function normalizeApprovedUrl(
  value:
    string | null | undefined,
): string {
  if (
    typeof value !==
      'string'
  ) {
    throwAdapterError(
      'PROVIDER_REQUEST_INVALID',
    );
  }

  let parsed:
    URL;

  try {
    parsed =
      new URL(
        value,
      );
  } catch {
    throwAdapterError(
      'PROVIDER_REQUEST_INVALID',
    );
  }

  if (
    parsed.protocol !==
      'https:' ||
    parsed.origin !==
      getApprovedSiteOrigin() ||
    parsed.username ||
    parsed.password ||
    parsed.hash
  ) {
    throwAdapterError(
      'PROVIDER_REQUEST_INVALID',
    );
  }

  return parsed.toString();
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
): string {
  const value =
    headers[
      name.toLowerCase()
    ]?.trim();

  if (!value) {
    throwAdapterError(
      'PROVIDER_CALLBACK_UNAUTHORIZED',
    );
  }

  return value;
}

function parseJson(
  rawBody:
    string,

  errorCode:
    | 'PROVIDER_RESPONSE_INVALID'
    | 'PROVIDER_CALLBACK_INVALID',
): unknown {
  try {
    return JSON.parse(
      rawBody,
    );
  } catch {
    throwAdapterError(
      errorCode,
    );
  }
}

async function readResponse(
  response:
    Response,
): Promise<PayPalHttpResult> {
  let rawBody:
    string;

  try {
    rawBody =
      await response.text();
  } catch (
    error
  ) {
    throwAdapterError(
      'PROVIDER_REQUEST_FAILED',
      true,
      error,
    );
  }

  if (
    new TextEncoder()
      .encode(
        rawBody,
      )
      .byteLength >
        MAX_PROVIDER_RESPONSE_BYTES
  ) {
    throwAdapterError(
      'PROVIDER_RESPONSE_INVALID',
    );
  }

  const parsed =
    rawBody
      ? parseJson(
          rawBody,
          'PROVIDER_RESPONSE_INVALID',
        )
      : null;

  return {
    response,
    rawBody,
    parsed,
  };
}

async function paypalFetch(
  pathname:
    string,

  init:
    RequestInit,
): Promise<PayPalHttpResult> {
  let response:
    Response;

  try {
    response =
      await fetch(
        `${PAYPAL_SANDBOX_API_ORIGIN}${pathname}`,
        {
          ...init,

          cache:
            'no-store',

          signal:
            AbortSignal.timeout(
              REQUEST_TIMEOUT_MS,
            ),
        },
      );
  } catch (
    error
  ) {
    throwAdapterError(
      'PROVIDER_TEMPORARILY_UNAVAILABLE',
      true,
      error,
    );
  }

  return readResponse(
    response,
  );
}

async function requestAccessToken():
  Promise<string> {
  const now =
    Date.now();

  if (
    cachedAccessToken &&
    cachedAccessToken
      .expiresAtMs >
      now + 60_000
  ) {
    return cachedAccessToken
      .token;
  }

  const clientId =
    readRequiredSecret(
      PAYPAL_CLIENT_ID_ENV,
    );

  const clientSecret =
    readRequiredSecret(
      PAYPAL_CLIENT_SECRET_ENV,
    );

  const authorization =
    Buffer
      .from(
        `${clientId}:${clientSecret}`,
        'utf8',
      )
      .toString(
        'base64',
      );

  const result =
    await paypalFetch(
      '/v1/oauth2/token',
      {
        method:
          'POST',

        headers: {
          Accept:
            'application/json',

          Authorization:
            `Basic ${authorization}`,

          'Content-Type':
            'application/x-www-form-urlencoded',
        },

        body:
          'grant_type=client_credentials',
      },
    );

  if (
    !result.response.ok ||
    !isPlainObject(
      result.parsed,
    )
  ) {
    throwAdapterError(
      result.response.status >= 500
        ? 'PROVIDER_TEMPORARILY_UNAVAILABLE'
        : 'PROVIDER_AUTHENTICATION_FAILED',
      result.response.status >= 500,
    );
  }

  const data =
    result.parsed as
      PayPalAccessTokenResponse;

  const accessToken =
    typeof data.access_token ===
      'string'
      ? data.access_token.trim()
      : '';

  const expiresIn =
    typeof data.expires_in ===
      'number' &&
    Number.isFinite(
      data.expires_in,
    )
      ? Math.floor(
          data.expires_in,
        )
      : 0;

  if (
    !accessToken ||
    accessToken.length >
      8_192 ||
    expiresIn <= 0
  ) {
    throwAdapterError(
      'PROVIDER_RESPONSE_INVALID',
    );
  }

  cachedAccessToken = {
    token:
      accessToken,

    expiresAtMs:
      now +
      Math.min(
        expiresIn,
        28_800,
      ) *
        1_000,
  };

  return accessToken;
}

function getApprovalUrl(
  links:
    unknown,
): string {
  if (
    !Array.isArray(
      links,
    )
  ) {
    throwAdapterError(
      'PROVIDER_RESPONSE_INVALID',
    );
  }

  const approvalLink =
    links.find(
      (
        value,
      ) => {
        if (
          !isPlainObject(
            value,
          )
        ) {
          return false;
        }

        const link =
          value as
            PayPalLink;

        return (
          (
            link.rel ===
              'payer-action' ||
            link.rel ===
              'approve'
          ) &&
          typeof link.href ===
            'string'
        );
      },
    ) as
      PayPalLink |
      undefined;

  if (
    !approvalLink ||
    typeof approvalLink.href !==
      'string'
  ) {
    throwAdapterError(
      'PROVIDER_RESPONSE_INVALID',
    );
  }

  let parsed:
    URL;

  try {
    parsed =
      new URL(
        approvalLink.href,
      );
  } catch {
    throwAdapterError(
      'PROVIDER_RESPONSE_INVALID',
    );
  }

  if (
    parsed.protocol !==
      'https:' ||
    (
      parsed.hostname !==
        'www.sandbox.paypal.com' &&
      parsed.hostname !==
        'sandbox.paypal.com'
    ) ||
    parsed.username ||
    parsed.password
  ) {
    throwAdapterError(
      'PROVIDER_RESPONSE_INVALID',
    );
  }

  return parsed.toString();
}

function validateInitiationInput(
  input:
    InitiateProviderDepositInput,
) {
  if (
    input.providerCode !==
      'PAYPAL' ||
    input.environment !==
      'SANDBOX' ||
    input.rail !==
      'DIGITAL_WALLET' ||
    input.asset !==
      'USD'
  ) {
    throwAdapterError(
      'PROVIDER_ROUTE_NOT_SUPPORTED',
    );
  }

  const requestId =
    normalizeIdentifier(
      input.requestId,
    );

  const operationId =
    normalizePayPalRequestId(
      input.operationId,
    );

  if (
    input.payer.type !==
      'EMAIL'
  ) {
    throwAdapterError(
      'PROVIDER_REQUEST_INVALID',
    );
  }

  const payerEmail =
    normalizeEmail(
      input.payer.value,
    );

  const amount =
    atomicUsdToDecimal(
      input.amountAtomic,
    );

  const returnUrl =
    normalizeApprovedUrl(
      input.returnUrl,
    );

  const cancelUrl =
    normalizeApprovedUrl(
      input.cancelUrl,
    );

  return {
    requestId,
    operationId,
    payerEmail,
    amount,
    returnUrl,
    cancelUrl,
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

  const accessToken =
    await requestAccessToken();

  const safeRequestBody = {
    intent:
      'CAPTURE',

    purchase_units: [
      {
        reference_id:
          normalized.requestId,

        custom_id:
          normalized.requestId,

        amount: {
          currency_code:
            'USD',

          value:
            normalized.amount,
        },
      },
    ],

    payment_source: {
      paypal: {
        email_address:
          normalized.payerEmail,

        experience_context: {
          brand_name:
            'PHCL Super',

          locale:
            'en-US',

          landing_page:
            'LOGIN',

          shipping_preference:
            'NO_SHIPPING',

          user_action:
            'PAY_NOW',

          return_url:
            normalized.returnUrl,

          cancel_url:
            normalized.cancelUrl,
        },
      },
    },
  };

  const result =
    await paypalFetch(
      '/v2/checkout/orders',
      {
        method:
          'POST',

        headers: {
          Accept:
            'application/json',

          Authorization:
            `Bearer ${accessToken}`,

          'Content-Type':
            'application/json',

          'PayPal-Request-Id':
            normalized.operationId,

          Prefer:
            'return=representation',
        },

        body:
          JSON.stringify(
            safeRequestBody,
          ),
      },
    );

  if (
    !result.response.ok
  ) {
    throwAdapterError(
      result.response.status >= 500 ||
      result.response.status === 429
        ? 'PROVIDER_TEMPORARILY_UNAVAILABLE'
        : 'PROVIDER_REQUEST_FAILED',
      result.response.status >= 500 ||
      result.response.status === 429,
    );
  }

  if (
    !isPlainObject(
      result.parsed,
    )
  ) {
    throwAdapterError(
      'PROVIDER_RESPONSE_INVALID',
    );
  }

  const response =
    result.parsed as
      PayPalOrderResponse;

  const providerRequestId =
    normalizeIdentifier(
      response.id,
    );

  const approvalUrl =
    getApprovalUrl(
      response.links,
    );

  if (
    response.status !==
      'CREATED' &&
    response.status !==
      'PAYER_ACTION_REQUIRED'
  ) {
    throwAdapterError(
      'PROVIDER_RESPONSE_INVALID',
    );
  }

  return {
    success:
      true,

    providerCode:
      'PAYPAL',

    environment:
      'SANDBOX',

    requestId:
      normalized.requestId,

    operationId:
      normalized.operationId,

    providerRequestId,

    providerTransactionId:
      null,

    status:
      'REQUIRES_CUSTOMER_ACTION',

    customerAction: {
      type:
        'REDIRECT',

      redirectUrl:
        approvalUrl,

      expiresAtMs:
        null,
    },

    expiresAtMs:
      null,

    responseFingerprint:
      sha256(
        result.rawBody,
      ),
  };
}

function validateCaptureInput(
  input:
    CaptureProviderDepositInput,
) {
  if (
    input.providerCode !==
      'PAYPAL' ||
    input.environment !==
      'SANDBOX'
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
      normalizePayPalRequestId(
        input.operationId,
      ),

    providerRequestId:
      normalizeIdentifier(
        input.providerRequestId,
      ),
  };
}

function readCaptureTransactionId(
  purchaseUnits:
    unknown,
): string | null {
  if (
    !Array.isArray(
      purchaseUnits,
    )
  ) {
    return null;
  }

  for (
    const purchaseUnit
    of purchaseUnits
  ) {
    if (
      !isPlainObject(
        purchaseUnit,
      )
    ) {
      continue;
    }

    const payments =
      purchaseUnit.payments;

    if (
      !isPlainObject(
        payments,
      ) ||
      !Array.isArray(
        payments.captures,
      )
    ) {
      continue;
    }

    for (
      const capture
      of payments.captures
    ) {
      if (
        !isPlainObject(
          capture,
        )
      ) {
        continue;
      }

      const captureRecord =
        capture as
          PayPalCaptureRecord;

      const captureId =
        readOptionalIdentifier(
          captureRecord.id,
        );

      if (captureId) {
        return captureId;
      }
    }
  }

  return null;
}

function normalizeCaptureStatus(
  value:
    unknown,
): ProviderDepositCaptureResult[
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

  switch (
    value
      .trim()
      .toUpperCase()
  ) {
    case 'COMPLETED':
      return 'SUCCESS';

    case 'APPROVED':
    case 'CREATED':
    case 'PAYER_ACTION_REQUIRED':
    case 'PENDING':
      return 'PENDING';

    case 'VOIDED':
    case 'DENIED':
    case 'DECLINED':
    case 'FAILED':
      return 'FAILED';

    default:
      throwAdapterError(
        'PROVIDER_RESPONSE_INVALID',
      );
  }
}

/**
 * Captures a PayPal order after buyer approval.
 *
 * This method never credits a PHCL balance and never
 * writes a financial ledger entry. Settlement remains
 * dependent on a verified provider SUCCESS callback.
 */
async function captureDeposit(
  input:
    CaptureProviderDepositInput,
): Promise<
  ProviderDepositCaptureResult
> {
  const normalized =
    validateCaptureInput(
      input,
    );

  const accessToken =
    await requestAccessToken();

  const capturePath =
    [
      '/v2/checkout/orders',
      encodeURIComponent(
        normalized.providerRequestId,
      ),
      'capture',
    ].join(
      '/',
    );

  const result =
    await paypalFetch(
      capturePath,
      {
        method:
          'POST',

        headers: {
          Accept:
            'application/json',

          Authorization:
            `Bearer ${accessToken}`,

          'Content-Type':
            'application/json',

          'PayPal-Request-Id':
            normalized.operationId,

          Prefer:
            'return=representation',
        },

        body:
          '{}',
      },
    );

  if (
    !result.response.ok
  ) {
    throwAdapterError(
      result.response.status >= 500 ||
      result.response.status === 429
        ? 'PROVIDER_TEMPORARILY_UNAVAILABLE'
        : 'PROVIDER_REQUEST_FAILED',
      result.response.status >= 500 ||
      result.response.status === 429,
    );
  }

  if (
    !isPlainObject(
      result.parsed,
    )
  ) {
    throwAdapterError(
      'PROVIDER_RESPONSE_INVALID',
    );
  }

  const response =
    result.parsed as
      PayPalCaptureResponse;

  const returnedOrderId =
    normalizeIdentifier(
      response.id,
    );

  if (
    returnedOrderId !==
      normalized.providerRequestId
  ) {
    throwAdapterError(
      'PROVIDER_OPERATION_CONFLICT',
    );
  }

  const status =
    normalizeCaptureStatus(
      response.status,
    );

  const providerTransactionId =
    readCaptureTransactionId(
      response.purchase_units,
    );

  if (
    status ===
      'SUCCESS' &&
    providerTransactionId ===
      null
  ) {
    throwAdapterError(
      'PROVIDER_RESPONSE_INVALID',
    );
  }

  return {
    success:
      true,

    providerCode:
      'PAYPAL',

    environment:
      'SANDBOX',

    requestId:
      normalized.requestId,

    operationId:
      normalized.operationId,

    providerRequestId:
      normalized.providerRequestId,

    providerTransactionId,

    status,

    responseFingerprint:
      sha256(
        result.rawBody,
      ),
  };
}
function getCallbackAgeMs(
  transmissionTime:
    string,

  receivedAtMs:
    number,
): number {
  const timestampMs =
    Date.parse(
      transmissionTime,
    );

  if (
    !Number.isFinite(
      timestampMs,
    ) ||
    !Number.isSafeInteger(
      receivedAtMs,
    ) ||
    receivedAtMs <= 0
  ) {
    throwAdapterError(
      'PROVIDER_CALLBACK_INVALID',
    );
  }

  return Math.abs(
    receivedAtMs -
      timestampMs,
  );
}

async function verifyWebhook(
  request:
    ProviderCallbackRequest,

  webhookEvent:
    JsonRecord,
): Promise<void> {
  const transmissionId =
    getHeader(
      request.headers,
      'paypal-transmission-id',
    );

  const transmissionTime =
    getHeader(
      request.headers,
      'paypal-transmission-time',
    );

  const certificateUrl =
    getHeader(
      request.headers,
      'paypal-cert-url',
    );

  const authAlgorithm =
    getHeader(
      request.headers,
      'paypal-auth-algo',
    );

  const transmissionSignature =
    getHeader(
      request.headers,
      'paypal-transmission-sig',
    );

  if (
    getCallbackAgeMs(
      transmissionTime,
      request.receivedAtMs,
    ) >
      MAX_CALLBACK_AGE_MS
  ) {
    throwAdapterError(
      'PROVIDER_CALLBACK_EXPIRED',
    );
  }

  if (
    transmissionId.length >
      100 ||
    transmissionTime.length >
      100 ||
    authAlgorithm.length >
      100 ||
    transmissionSignature.length >
      1_024
  ) {
    throwAdapterError(
      'PROVIDER_CALLBACK_INVALID',
    );
  }

  let parsedCertificateUrl:
    URL;

  try {
    parsedCertificateUrl =
      new URL(
        certificateUrl,
      );
  } catch {
    throwAdapterError(
      'PROVIDER_CALLBACK_INVALID',
    );
  }

  if (
    parsedCertificateUrl.protocol !==
      'https:' ||
    !(
      parsedCertificateUrl.hostname ===
        'api-m.sandbox.paypal.com' ||
      parsedCertificateUrl.hostname ===
        'api.sandbox.paypal.com'
    ) ||
    parsedCertificateUrl.username ||
    parsedCertificateUrl.password
  ) {
    throwAdapterError(
      'PROVIDER_CALLBACK_INVALID',
    );
  }

  const webhookId =
    readRequiredSecret(
      PAYPAL_WEBHOOK_ID_ENV,
    );

  const accessToken =
    await requestAccessToken();

  const verification =
    await paypalFetch(
      '/v1/notifications/verify-webhook-signature',
      {
        method:
          'POST',

        headers: {
          Accept:
            'application/json',

          Authorization:
            `Bearer ${accessToken}`,

          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({
            auth_algo:
              authAlgorithm,

            cert_url:
              certificateUrl,

            transmission_id:
              transmissionId,

            transmission_sig:
              transmissionSignature,

            transmission_time:
              transmissionTime,

            webhook_id:
              webhookId,

            webhook_event:
              webhookEvent,
          }),
      },
    );

  if (
    !verification.response.ok ||
    !isPlainObject(
      verification.parsed,
    )
  ) {
    throwAdapterError(
      verification.response.status >=
        500
        ? 'PROVIDER_TEMPORARILY_UNAVAILABLE'
        : 'PROVIDER_CALLBACK_UNAUTHORIZED',
      verification.response.status >=
        500,
    );
  }

  const response =
    verification.parsed as
      PayPalWebhookVerificationResponse;

  if (
    response.verification_status !==
      'SUCCESS'
  ) {
    throwAdapterError(
      'PROVIDER_CALLBACK_UNAUTHORIZED',
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
    value[
      key
    ];

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

function getRequestId(
  resource:
    JsonRecord,
): string {
  const direct =
    readOptionalIdentifier(
      resource.custom_id,
    );

  if (direct) {
    return direct;
  }

  const purchaseUnit =
    readNestedObject(
      resource,
      'purchase_unit',
    );

  const purchaseUnitId =
    readOptionalIdentifier(
      purchaseUnit
        ?.custom_id,
    );

  if (purchaseUnitId) {
    return purchaseUnitId;
  }

  throwAdapterError(
    'PROVIDER_CALLBACK_INVALID',
  );
}

function normalizeCallbackOutcome(
  eventType:
    string,
): {
  outcome:
    'SUCCESS' |
    'PENDING' |
    'FAILED';

  failureReason:
    string | null;
} {
  switch (
    eventType
  ) {
    case 'PAYMENT.CAPTURE.COMPLETED':
      return {
        outcome:
          'SUCCESS',

        failureReason:
          null,
      };

    case 'CHECKOUT.ORDER.APPROVED':
    case 'PAYMENT.CAPTURE.PENDING':
      return {
        outcome:
          'PENDING',

        failureReason:
          null,
      };

    case 'PAYMENT.CAPTURE.DENIED':
    case 'PAYMENT.CAPTURE.DECLINED':
    case 'PAYMENT.CAPTURE.REVERSED':
      return {
        outcome:
          'FAILED',

        failureReason:
          eventType,
      };

    default:
      throwAdapterError(
        'PROVIDER_CALLBACK_INVALID',
      );
  }
}

async function verifyAndNormalizeCallback(
  request:
    ProviderCallbackRequest,
): Promise<
  NormalizedProviderCallback
> {
  if (
    request.providerCode !==
      'PAYPAL' ||
    request.environment !==
      'SANDBOX' ||
    typeof request.rawBody !==
      'string' ||
    !request.rawBody ||
    new TextEncoder()
      .encode(
        request.rawBody,
      )
      .byteLength >
        MAX_PROVIDER_RESPONSE_BYTES
  ) {
    throwAdapterError(
      'PROVIDER_CALLBACK_INVALID',
    );
  }

  const parsed =
    parseJson(
      request.rawBody,
      'PROVIDER_CALLBACK_INVALID',
    );

  if (
    !isPlainObject(
      parsed,
    )
  ) {
    throwAdapterError(
      'PROVIDER_CALLBACK_INVALID',
    );
  }

  await verifyWebhook(
    request,
    parsed,
  );

  const event =
    parsed as
      PayPalWebhookEvent;

  const providerEventId =
    normalizeIdentifier(
      event.id,
    );

  if (
    typeof event.event_type !==
      'string'
  ) {
    throwAdapterError(
      'PROVIDER_CALLBACK_INVALID',
    );
  }

  const eventType =
    event.event_type.trim();

  if (
    !isPlainObject(
      event.resource,
    )
  ) {
    throwAdapterError(
      'PROVIDER_CALLBACK_INVALID',
    );
  }

  const resource =
    event.resource;

  const requestId =
    getRequestId(
      resource,
    );

  const normalizedOutcome =
    normalizeCallbackOutcome(
      eventType,
    );

  const providerTransactionId =
    readOptionalIdentifier(
      resource.id,
    );

  return {
    providerCode:
      'PAYPAL',

    environment:
      'SANDBOX',

    kind:
      'DEPOSIT',

    requestId,

    providerEventId,

    providerTransactionId,

    outcome:
      normalizedOutcome.outcome,

    failureReason:
      normalizedOutcome.failureReason,

    payloadFingerprint:
      sha256(
        request.rawBody,
      ),
  };
}

export const paypalSandboxAdapter:
  PaymentProviderAdapter =
  Object.freeze({
    providerCode:
      'PAYPAL',

    environment:
      'SANDBOX',

    supportedRails:
      Object.freeze(
        [
          'DIGITAL_WALLET',
        ] as const,
      ),

    supportedAssets:
      Object.freeze(
        [
          'USD',
        ] as const,
      ),

    initiateDeposit,

    captureDeposit,

    verifyAndNormalizeCallback,
  });