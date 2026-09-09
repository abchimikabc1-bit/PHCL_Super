import 'server-only';

import {
  createHmac,
  timingSafeEqual,
} from 'node:crypto';

const DEFAULT_CALLBACK_MAX_AGE_SECONDS =
  5 * 60;

const DEFAULT_MAX_REQUEST_BODY_BYTES =
  64 * 1024;

const MINIMUM_CALLBACK_SECRET_LENGTH =
  32;

const MAX_PROVIDER_CODE_LENGTH =
  40;

const MAX_TIMESTAMP_HEADER_LENGTH =
  20;

const SIGNATURE_HEX_LENGTH =
  64;

export type VerifiedProviderCallback = {
  providerCode:
    string;

  timestampSeconds:
    number;

  rawBody:
    string;

  payload:
    unknown;
};

type VerifyProviderCallbackOptions = {
  /**
   * Provider identity must come from a
   * server-controlled route parameter or
   * provider adapter.
   *
   * Never obtain it from the callback JSON.
   */
  providerCode:
    string;

  /**
   * Useful for deterministic unit tests.
   */
  now?:
    number;
};

function readPositiveIntegerEnvironment(
  name:
    string,
  fallback:
    number,
): number {
  const rawValue =
    process.env[name];

  if (
    !rawValue
  ) {
    return fallback;
  }

  const parsed =
    Number(
      rawValue,
    );

  if (
    !Number.isSafeInteger(
      parsed,
    ) ||
    parsed <= 0
  ) {
    return fallback;
  }

  return parsed;
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

function getSingleHeader(
  request:
    Request,
  headerName:
    string,
): string {
  const value =
    request.headers.get(
      headerName,
    );

  if (
    !value
  ) {
    throw new Error(
      'CALLBACK_AUTHENTICATION_REQUIRED',
    );
  }

  const normalized =
    value.trim();

  /*
   * Reject combined or duplicated security
   * headers. Some HTTP servers combine duplicate
   * headers using commas.
   */
  if (
    !normalized ||
    normalized.includes(
      ',',
    ) ||
    normalized.includes(
      '\r',
    ) ||
    normalized.includes(
      '\n',
    )
  ) {
    throw new Error(
      'INVALID_CALLBACK_SECURITY_HEADER',
    );
  }

  return normalized;
}

function normalizeTimestampSeconds(
  value:
    string,
): number {
  if (
    !value ||
    value.length >
      MAX_TIMESTAMP_HEADER_LENGTH ||
    !/^\d+$/.test(
      value,
    )
  ) {
    throw new Error(
      'INVALID_CALLBACK_TIMESTAMP',
    );
  }

  const parsed =
    Number(
      value,
    );

  if (
    !Number.isSafeInteger(
      parsed,
    ) ||
    parsed <= 0
  ) {
    throw new Error(
      'INVALID_CALLBACK_TIMESTAMP',
    );
  }

  /*
   * Only Unix timestamp seconds are accepted.
   * Millisecond timestamps are deliberately rejected
   * to keep one canonical signature representation.
   */
  if (
    parsed >
      9_999_999_999
  ) {
    throw new Error(
      'INVALID_CALLBACK_TIMESTAMP',
    );
  }

  return parsed;
}

function assertTimestampWithinAllowedWindow(
  timestampSeconds:
    number,
  now:
    number,
) {
  if (
    !Number.isFinite(
      now,
    ) ||
    now <= 0
  ) {
    throw new Error(
      'INVALID_CALLBACK_CLOCK',
    );
  }

  const currentTimestampSeconds =
    Math.floor(
      now / 1000,
    );

  const maximumAgeSeconds =
    readPositiveIntegerEnvironment(
      'PROVIDER_CALLBACK_MAX_AGE_SECONDS',
      DEFAULT_CALLBACK_MAX_AGE_SECONDS,
    );

  const difference =
    Math.abs(
      currentTimestampSeconds -
        timestampSeconds,
    );

  if (
    difference >
      maximumAgeSeconds
  ) {
    throw new Error(
      'CALLBACK_TIMESTAMP_OUTSIDE_ALLOWED_WINDOW',
    );
  }
}

function getProviderCallbackSecret(
  providerCode:
    string,
): string {
  /*
   * Examples:
   *
   * PROVIDER_CALLBACK_SECRET_MPESA
   * PROVIDER_CALLBACK_SECRET_AIRTEL_MONEY
   * PROVIDER_CALLBACK_SECRET_PI_NETWORK
   *
   * Each provider must use a separate secret.
   */
  const environmentName =
    `PROVIDER_CALLBACK_SECRET_${providerCode}`;

  const secret =
    process.env[
      environmentName
    ]?.trim();

  if (
    !secret
  ) {
    throw new Error(
      'PROVIDER_CALLBACK_SECRET_NOT_CONFIGURED',
    );
  }

  if (
    Buffer.byteLength(
      secret,
      'utf8',
    ) <
      MINIMUM_CALLBACK_SECRET_LENGTH
  ) {
    throw new Error(
      'PROVIDER_CALLBACK_SECRET_TOO_SHORT',
    );
  }

  return secret;
}

function normalizeSignature(
  rawSignature:
    string,
): string {
  const withoutPrefix =
    rawSignature
      .trim()
      .replace(
        /^sha256=/i,
        '',
      )
      .toLowerCase();

  if (
    withoutPrefix.length !==
      SIGNATURE_HEX_LENGTH ||
    !/^[a-f0-9]{64}$/.test(
      withoutPrefix,
    )
  ) {
    throw new Error(
      'INVALID_CALLBACK_SIGNATURE',
    );
  }

  return withoutPrefix;
}

function createExpectedSignature(
  secret:
    string,
  timestampHeader:
    string,
  rawBody:
    string,
): string {
  /*
   * Canonical signed message:
   *
   * <unix_timestamp_seconds>.<exact_raw_body>
   *
   * Do not JSON.parse or modify the body before
   * calculating this signature.
   */
  const signedMessage =
    `${timestampHeader}.${rawBody}`;

  return createHmac(
    'sha256',
    secret,
  )
    .update(
      signedMessage,
      'utf8',
    )
    .digest(
      'hex',
    );
}

function signaturesMatch(
  receivedSignature:
    string,
  expectedSignature:
    string,
): boolean {
  const receivedBuffer =
    Buffer.from(
      receivedSignature,
      'hex',
    );

  const expectedBuffer =
    Buffer.from(
      expectedSignature,
      'hex',
    );

  if (
    receivedBuffer.length !==
      expectedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    receivedBuffer,
    expectedBuffer,
  );
}

function assertJsonContentType(
  request:
    Request,
) {
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
) {
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

  const parsed =
    Number(
      contentLength,
    );

  if (
    !Number.isSafeInteger(
      parsed,
    ) ||
    parsed < 0 ||
    parsed >
      maximumBytes
  ) {
    throw new Error(
      'CALLBACK_REQUEST_TOO_LARGE',
    );
  }
}

async function readRawCallbackBody(
  request:
    Request,
): Promise<string> {
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

  const bodySize =
    new TextEncoder()
      .encode(
        rawBody,
      )
      .byteLength;

  if (
    bodySize >
      maximumBytes
  ) {
    throw new Error(
      'CALLBACK_REQUEST_TOO_LARGE',
    );
  }

  return rawBody;
}

function parseCallbackJson(
  rawBody:
    string,
): unknown {
  let payload:
    unknown;

  try {
    payload =
      JSON.parse(
        rawBody,
      );
  } catch {
    throw new Error(
      'INVALID_CALLBACK_JSON',
    );
  }

  if (
    typeof payload !==
      'object' ||
    payload === null ||
    Array.isArray(
      payload,
    )
  ) {
    throw new Error(
      'INVALID_CALLBACK_JSON',
    );
  }

  return payload;
}

/**
 * Verifies the cryptographic HTTP boundary of a
 * provider callback.
 *
 * Required headers:
 *
 * Content-Type: application/json
 * X-PHCL-Timestamp: <Unix timestamp seconds>
 * X-PHCL-Signature: sha256=<64-character HMAC hex>
 *
 * Signed message:
 *
 * <timestamp>.<exact raw request body>
 *
 * SECURITY:
 *
 * - providerCode must come from a trusted route or
 *   provider adapter, never from callback JSON;
 * - the exact raw body is verified before JSON parsing;
 * - callbacks outside the permitted time window fail;
 * - signatures are compared in constant time;
 * - every provider must have a separate secret;
 * - this function performs no financial mutation.
 *
 * Database-level replay and exactly-once protection are
 * enforced later by processProviderSettlement().
 */
export async function verifyProviderCallbackRequest(
  request:
    Request,
  options:
    VerifyProviderCallbackOptions,
): Promise<VerifiedProviderCallback> {
  const providerCode =
    normalizeProviderCode(
      options.providerCode,
    );

  assertJsonContentType(
    request,
  );

  const timestampHeader =
    getSingleHeader(
      request,
      'x-phcl-timestamp',
    );

  const signatureHeader =
    getSingleHeader(
      request,
      'x-phcl-signature',
    );

  const timestampSeconds =
    normalizeTimestampSeconds(
      timestampHeader,
    );

  assertTimestampWithinAllowedWindow(
    timestampSeconds,
    options.now ??
      Date.now(),
  );

  const rawBody =
    await readRawCallbackBody(
      request,
    );

  const receivedSignature =
    normalizeSignature(
      signatureHeader,
    );

  const secret =
    getProviderCallbackSecret(
      providerCode,
    );

  const expectedSignature =
    createExpectedSignature(
      secret,
      timestampHeader,
      rawBody,
    );

  if (
    !signaturesMatch(
      receivedSignature,
      expectedSignature,
    )
  ) {
    throw new Error(
      'INVALID_CALLBACK_SIGNATURE',
    );
  }

  const payload =
    parseCallbackJson(
      rawBody,
    );

  return {
    providerCode,
    timestampSeconds,
    rawBody,
    payload,
  };
}