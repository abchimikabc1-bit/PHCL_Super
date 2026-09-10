import assert from 'node:assert/strict';

import {
  createHmac,
} from 'node:crypto';

import {
  afterEach,
  beforeEach,
  describe,
  test,
} from 'node:test';

import {
  visaAcceptanceSandboxAdapter,
} from '@/lib/server-payment-provider-adapters/visa-acceptance-sandbox';

import {
  ProviderAdapterError,
  type InitiateProviderDepositInput,
  type ProviderCallbackRequest,
} from '@/lib/server-payment-provider-types';

import {
  createVisaTestPrivateKey,
} from './fixtures/visa-acceptance-test-credentials';

const TEST_CERTIFICATE = `
-----BEGIN CERTIFICATE-----
MIIDIzCCAgugAwIBAgIUEJA6dvGd0XDrSVJQeFbevybih34wDQYJKoZIhvcNAQEL
BQAwITEfMB0GA1UEAwwWUEhDTCBWaXNhIEFkYXB0ZXIgVGVzdDAeFw0yNjA5MTAw
ODQ2NDVaFw0zNjA5MDcwODQ2NDVaMCExHzAdBgNVBAMMFlBIQ0wgVmlzYSBBZGFw
dGVyIFRlc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDLk+F5be6Z
PVwgKgMSN9Qhj/V6HGeNuXiekJa70rZcuvxQRRzBpfhPx42zZr9vcZM+My7+4oAR
RP59l7Uc5hO3Kih1iao/S7+uu9cb3jeU02ltaKpBQC/nk2J3g/wTSqR+5q0m4BUU
TErYbGl3zM/neHIKpUnUqd98ORLgadCxIS9eUzN+1LM64bQoy85vL+Nk/bxD/Adg
pvOaGPZfx97t4Bc295K5p9MEnHTELY5qZYpnCJhQmvYGqQX7LALT6wKhOXW5iVjo
9r6RU8/5RA5sdXKiRJj55R7XHtr6zOdFZIxkq14VqFUDgy5N9XKosjYUUD1bImH0
L8oeW132VEgLAgMBAAGjUzBRMB0GA1UdDgQWBBTXB0I2WypLI8ZbEqMvLszP7mIx
ZjAfBgNVHSMEGDAWgBTXB0I2WypLI8ZbEqMvLszP7mIxZjAPBgNVHRMBAf8EBTAD
AQH/MA0GCSqGSIb3DQEBCwUAA4IBAQCfVzPtVRnLRVIP3/xZnkyHATeyztD/AhIa
SC+s7Z5igtLOZpOzxFuKYpIgivXXPYZwF61PYLwqu7iEKjWj2NwjMpFp8ZmhrX0b
RCKajaDE/s1Y5ZvCSuuYyXrQyML4wte1SUJ78aTuABBvO5OXPK6KyBGDfwUzRkm1
2OgZk8vIkyWemdqaMnD0VXCVgqU+ITrxpPMF+D9PVitFFYSVzqQ9JY++PVCCEuNR
zdbQr0SFKLqVvo/Cy+RuUoYPtFQZuCaHpGdLsLpTLnjz/S5xm0dyRoRzl95xS13M
yc7bJYg+aqtHNtBcQUZmSNbQw7+q83cE4Mvn5uGyKuPXyBM/+JIh
-----END CERTIFICATE-----
`.trim();

const TEST_MERCHANT_ID =
  'phcl_test_merchant';

const TEST_WEBHOOK_KEY_ID =
  'phcl_visa_test_webhook_key';

const TEST_WEBHOOK_SECRET =
  Buffer
    .from(
      'phcl-visa-webhook-test-secret-value-2026',
      'utf8',
    )
    .toString(
      'base64',
    );

const ENVIRONMENT_VARIABLES = [
  'VISA_ACCEPTANCE_SANDBOX_MERCHANT_ID',
  'VISA_ACCEPTANCE_SANDBOX_JWT_CERTIFICATE',
  'VISA_ACCEPTANCE_SANDBOX_JWT_PRIVATE_KEY',
  'VISA_ACCEPTANCE_SANDBOX_WEBHOOK_KEY_ID',
  'VISA_ACCEPTANCE_SANDBOX_WEBHOOK_SECRET',
  'VISA_ACCEPTANCE_SANDBOX_CALLBACK_MAX_AGE_SECONDS',
  'VISA_ACCEPTANCE_SANDBOX_PAYMENT_TOKEN_MAX_AGE_SECONDS',
] as const;

const originalEnvironment =
  new Map<
    string,
    string | undefined
  >();

const originalFetch =
  globalThis.fetch;

function setEnvironmentVariable(
  name:
    string,
  value:
    string,
): void {
  Reflect.set(
    process.env,
    name,
    value,
  );
}

function deleteEnvironmentVariable(
  name:
    string,
): void {
  Reflect.deleteProperty(
    process.env,
    name,
  );
}

function restoreEnvironment(): void {
  for (
    const name of
      ENVIRONMENT_VARIABLES
  ) {
    const value =
      originalEnvironment.get(
        name,
      );

    if (
      value === undefined
    ) {
      deleteEnvironmentVariable(
        name,
      );
    } else {
      setEnvironmentVariable(
        name,
        value,
      );
    }
  }
}

function createPaymentToken(
  options?: {
    issuedAt?:
      number;

    expiresAt?:
      number;
  },
): string {
  const nowSeconds =
    Math.floor(
      Date.now() /
        1_000,
    );

  const header =
    Buffer
      .from(
        JSON.stringify({
          alg:
            'RS256',

          typ:
            'JWT',
        }),
        'utf8',
      )
      .toString(
        'base64url',
      );

  const payload =
    Buffer
      .from(
        JSON.stringify({
          iss:
            'Flex/Test',

          iat:
            options?.issuedAt ??
            nowSeconds,

          exp:
            options?.expiresAt ??
            nowSeconds + 600,

          jti:
            'phcl_test_transient_token',
        }),
        'utf8',
      )
      .toString(
        'base64url',
      );

  return `${header}.${payload}.test_signature`;
}

function createInitiationInput(
  overrides?: Partial<
    InitiateProviderDepositInput
  >,
): InitiateProviderDepositInput {
  return {
    requestId:
      'deposit_test_001',

    operationId:
      'operation_test_001',

    providerCode:
      'VISA_ACCEPTANCE',

    environment:
      'SANDBOX',

    rail:
      'CARD',

    asset:
      'USD',

    amountAtomic:
      '1250',

    payer: {
      type:
        'PAYMENT_TOKEN',

      value:
        createPaymentToken(),
    },

    ...overrides,
  };
}

function installSuccessfulFetch(
  options?: {
    requestId?:
      string;

    status?:
      string;
  },
): {
  calls:
    Array<{
      url:
        string;

      init:
        RequestInit;
    }>;
} {
  const calls:
    Array<{
      url:
        string;

      init:
        RequestInit;
    }> = [];

  globalThis.fetch =
    async (
      input:
        string | URL | Request,
      init?:
        RequestInit,
    ) => {
      calls.push({
        url:
          String(
            input,
          ),

        init:
          init ?? {},
      });

      return new Response(
        JSON.stringify({
          id:
            'visa_transaction_001',

          status:
            options?.status ??
            'AUTHORIZED',

          clientReferenceInformation: {
            code:
              options?.requestId ??
              'deposit_test_001',
          },

          submitTimeUtc:
            new Date()
              .toISOString(),
        }),
        {
          status:
            201,

          headers: {
            'content-type':
              'application/json',
          },
        },
      );
    };

  return {
    calls,
  };
}

function createCallbackBody(
  status:
    string,
): string {
  return JSON.stringify({
    id:
      `visa_event_${status.toLowerCase()}`,

    eventType:
      `PAYMENT.${status}`,

    payload: {
      resource: {
        id:
          'visa_transaction_001',

        status,

        clientReferenceInformation: {
          code:
            'deposit_test_001',
        },
      },
    },
  });
}

function createCallbackRequest(
  rawBody:
    string,
  options?: {
    timestampMs?:
      number;

    keyId?:
      string;

    signatureBody?:
      string;
  },
): ProviderCallbackRequest {
  const timestampMs =
    options?.timestampMs ??
    Date.now();

  const keyId =
    options?.keyId ??
    TEST_WEBHOOK_KEY_ID;

  const secret =
    Buffer.from(
      TEST_WEBHOOK_SECRET,
      'base64',
    );

  const signature =
    createHmac(
      'sha256',
      secret,
    )
      .update(
        `${timestampMs}.${options?.signatureBody ?? rawBody}`,
        'utf8',
      )
      .digest(
        'base64',
      );

  return {
    providerCode:
      'VISA_ACCEPTANCE',

    environment:
      'SANDBOX',

    rawBody,

    headers: {
      'v-c-signature':
        `t=${timestampMs};keyId=${keyId};sig=${signature}`,
    },

    receivedAtMs:
      Date.now(),
  };
}

function assertProviderError(
  expectedCode:
    ProviderAdapterError['code'],
): (
  error:
    unknown,
) => boolean {
  return (
    error:
      unknown,
  ) => {
    assert.ok(
      error instanceof
        ProviderAdapterError,
    );

    assert.equal(
      error.code,
      expectedCode,
    );

    return true;
  };
}

beforeEach(
  () => {
    originalEnvironment.clear();

    for (
      const name of
        ENVIRONMENT_VARIABLES
    ) {
      originalEnvironment.set(
        name,
        process.env[name],
      );
    }

    setEnvironmentVariable(
      'VISA_ACCEPTANCE_SANDBOX_MERCHANT_ID',
      TEST_MERCHANT_ID,
    );

    setEnvironmentVariable(
      'VISA_ACCEPTANCE_SANDBOX_JWT_CERTIFICATE',
      TEST_CERTIFICATE,
    );

    setEnvironmentVariable(
      'VISA_ACCEPTANCE_SANDBOX_JWT_PRIVATE_KEY',
           createVisaTestPrivateKey(),
    );

    setEnvironmentVariable(
      'VISA_ACCEPTANCE_SANDBOX_WEBHOOK_KEY_ID',
      TEST_WEBHOOK_KEY_ID,
    );

    setEnvironmentVariable(
      'VISA_ACCEPTANCE_SANDBOX_WEBHOOK_SECRET',
      TEST_WEBHOOK_SECRET,
    );

    setEnvironmentVariable(
      'VISA_ACCEPTANCE_SANDBOX_CALLBACK_MAX_AGE_SECONDS',
      '300',
    );

    setEnvironmentVariable(
      'VISA_ACCEPTANCE_SANDBOX_PAYMENT_TOKEN_MAX_AGE_SECONDS',
      '900',
    );

    globalThis.fetch =
      originalFetch;
  },
);

afterEach(
  () => {
    restoreEnvironment();

    globalThis.fetch =
      originalFetch;
  },
);

describe(
  'PHCL Visa Acceptance sandbox adapter',
  {
    concurrency:
      false,
  },
  () => {
    test(
      'exposes the expected immutable adapter configuration',
      () => {
        assert.equal(
          visaAcceptanceSandboxAdapter
            .providerCode,
          'VISA_ACCEPTANCE',
        );

        assert.equal(
          visaAcceptanceSandboxAdapter
            .environment,
          'SANDBOX',
        );

        assert.deepEqual(
          visaAcceptanceSandboxAdapter
            .supportedRails,
          [
            'CARD',
          ],
        );

        assert.deepEqual(
          visaAcceptanceSandboxAdapter
            .supportedAssets,
          [
            'USD',
          ],
        );

        assert.equal(
          Object.isFrozen(
            visaAcceptanceSandboxAdapter,
          ),
          true,
        );

        assert.equal(
          Object.isFrozen(
            visaAcceptanceSandboxAdapter
              .supportedRails,
          ),
          true,
        );

        assert.equal(
          Object.isFrozen(
            visaAcceptanceSandboxAdapter
              .supportedAssets,
          ),
          true,
        );
      },
    );

    test(
      'initiates a tokenized Visa sandbox deposit without settling PHCL funds',
      async () => {
        installSuccessfulFetch();

        const result =
          await visaAcceptanceSandboxAdapter
            .initiateDeposit(
              createInitiationInput(),
            );

        assert.equal(
          result.success,
          true,
        );

        assert.equal(
          result.providerCode,
          'VISA_ACCEPTANCE',
        );

        assert.equal(
          result.environment,
          'SANDBOX',
        );

        assert.equal(
          result.status,
          'PENDING',
        );

        assert.equal(
          result.providerRequestId,
          'visa_transaction_001',
        );

        assert.equal(
          result.providerTransactionId,
          'visa_transaction_001',
        );

        assert.equal(
          result.customerAction,
          null,
        );
      },
    );

    test(
      'sends only the transient payment token and never sends PAN or CVV',
      async () => {
        const token =
          createPaymentToken();

        const {
          calls,
        } =
          installSuccessfulFetch();

        await visaAcceptanceSandboxAdapter
          .initiateDeposit(
            createInitiationInput({
              payer: {
                type:
                  'PAYMENT_TOKEN',

                value:
                  token,
              },
            }),
          );

        assert.equal(
          calls.length,
          1,
        );

        const body =
          JSON.parse(
            String(
              calls[0].init.body,
            ),
          ) as Record<
            string,
            unknown
          >;

        const serialized =
          JSON.stringify(
            body,
          );

        assert.match(
          serialized,
          /transientTokenJwt/,
        );

        assert.equal(
          serialized.includes(
            token,
          ),
          true,
        );

        assert.equal(
          /cardNumber|securityCode|cvv|pan/i.test(
            serialized,
          ),
          false,
        );
      },
    );

    test(
      'does not expose the transient payment token in its result',
      async () => {
        const token =
          createPaymentToken();

        installSuccessfulFetch();

        const result =
          await visaAcceptanceSandboxAdapter
            .initiateDeposit(
              createInitiationInput({
                payer: {
                  type:
                    'PAYMENT_TOKEN',

                  value:
                    token,
                },
              }),
            );

        assert.equal(
          JSON.stringify(
            result,
          ).includes(
            token,
          ),
          false,
        );
      },
    );

    test(
      'sends a signed RS256 authorization JWT',
      async () => {
        const {
          calls,
        } =
          installSuccessfulFetch();

        await visaAcceptanceSandboxAdapter
          .initiateDeposit(
            createInitiationInput(),
          );

        const headers =
          new Headers(
            calls[0].init
              .headers,
          );

        const authorization =
          headers.get(
            'authorization',
          );

        assert.ok(
          authorization,
        );

        assert.match(
          authorization,
          /^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
        );

        const token =
          authorization.replace(
            /^Bearer /,
            '',
          );

        const [
          encodedHeader,
          encodedClaims,
        ] =
          token.split(
            '.',
          );

        const jwtHeader =
          JSON.parse(
            Buffer
              .from(
                encodedHeader,
                'base64url',
              )
              .toString(
                'utf8',
              ),
          ) as Record<
            string,
            unknown
          >;

        const claims =
          JSON.parse(
            Buffer
              .from(
                encodedClaims,
                'base64url',
              )
              .toString(
                'utf8',
              ),
          ) as Record<
            string,
            unknown
          >;

        assert.equal(
          jwtHeader.alg,
          'RS256',
        );

        assert.equal(
          jwtHeader[
            'v-c-merchant-id'
          ],
          TEST_MERCHANT_ID,
        );

        assert.ok(
          Array.isArray(
            jwtHeader.x5c,
          ),
        );

        assert.equal(
          claims.digestAlgorithm,
          'SHA-256',
        );

        assert.equal(
          typeof claims.digest,
          'string',
        );
      },
    );

    test(
      'uses the Visa Acceptance sandbox payments endpoint',
      async () => {
        const {
          calls,
        } =
          installSuccessfulFetch();

        await visaAcceptanceSandboxAdapter
          .initiateDeposit(
            createInitiationInput(),
          );

        assert.equal(
          calls[0].url,
          'https://apitest.visaacceptance.com/pts/v2/payments',
        );

        assert.equal(
          calls[0].init.method,
          'POST',
        );
      },
    );

    test(
      'converts USD atomic units to a two-decimal amount',
      async () => {
        const {
          calls,
        } =
          installSuccessfulFetch();

        await visaAcceptanceSandboxAdapter
          .initiateDeposit(
            createInitiationInput({
              amountAtomic:
                '1250',
            }),
          );

        const body =
          JSON.parse(
            String(
              calls[0].init.body,
            ),
          ) as {
            orderInformation: {
              amountDetails: {
                totalAmount:
                  string;

                currency:
                  string;
              };
            };
          };

        assert.equal(
          body.orderInformation
            .amountDetails
            .totalAmount,
          '12.50',
        );

        assert.equal(
          body.orderInformation
            .amountDetails
            .currency,
          'USD',
        );
      },
    );

    test(
      'rejects a non-card payment rail',
      async () => {
        await assert.rejects(
          visaAcceptanceSandboxAdapter
            .initiateDeposit(
              createInitiationInput({
                rail:
                  'DIGITAL_WALLET',
              }),
            ),
          assertProviderError(
            'PROVIDER_ROUTE_NOT_SUPPORTED',
          ),
        );
      },
    );

    test(
      'rejects a non-USD asset',
      async () => {
        await assert.rejects(
          visaAcceptanceSandboxAdapter
            .initiateDeposit(
              createInitiationInput({
                asset:
                  'TZS',
              }),
            ),
          assertProviderError(
            'PROVIDER_ROUTE_NOT_SUPPORTED',
          ),
        );
      },
    );

    test(
      'rejects a payer reference that is not a payment token',
      async () => {
        await assert.rejects(
          visaAcceptanceSandboxAdapter
            .initiateDeposit(
              createInitiationInput({
                payer: {
                  type:
                    'NONE',
                },
              }),
            ),
          assertProviderError(
            'PROVIDER_ROUTE_NOT_SUPPORTED',
          ),
        );
      },
    );

    test(
      'rejects zero, negative and decimal atomic amounts',
      async () => {
        for (
          const amountAtomic of [
            '0',
            '-1',
            '12.50',
          ]
        ) {
          await assert.rejects(
            visaAcceptanceSandboxAdapter
              .initiateDeposit(
                createInitiationInput({
                  amountAtomic,
                }),
              ),
            assertProviderError(
              'PROVIDER_REQUEST_INVALID',
            ),
          );
        }
      },
    );

    test(
      'rejects an expired transient payment token',
      async () => {
        const nowSeconds =
          Math.floor(
            Date.now() /
              1_000,
          );

        await assert.rejects(
          visaAcceptanceSandboxAdapter
            .initiateDeposit(
              createInitiationInput({
                payer: {
                  type:
                    'PAYMENT_TOKEN',

                  value:
                    createPaymentToken({
                      issuedAt:
                        nowSeconds -
                        1_000,

                      expiresAt:
                        nowSeconds -
                        100,
                    }),
                },
              }),
            ),
          assertProviderError(
            'PROVIDER_REQUEST_INVALID',
          ),
        );
      },
    );

    test(
      'rejects a malformed transient payment token',
      async () => {
        await assert.rejects(
          visaAcceptanceSandboxAdapter
            .initiateDeposit(
              createInitiationInput({
                payer: {
                  type:
                    'PAYMENT_TOKEN',

                  value:
                    'not-a-jwt',
                },
              }),
            ),
          assertProviderError(
            'PROVIDER_REQUEST_INVALID',
          ),
        );
      },
    );

    test(
      'fails closed when the merchant ID is missing',
      async () => {
        deleteEnvironmentVariable(
          'VISA_ACCEPTANCE_SANDBOX_MERCHANT_ID',
        );

        installSuccessfulFetch();

        await assert.rejects(
          visaAcceptanceSandboxAdapter
            .initiateDeposit(
              createInitiationInput(),
            ),
          assertProviderError(
            'PROVIDER_CONFIGURATION_INVALID',
          ),
        );
      },
    );

    test(
      'fails closed when the JWT private key is invalid',
      async () => {
        setEnvironmentVariable(
          'VISA_ACCEPTANCE_SANDBOX_JWT_PRIVATE_KEY',
          'invalid-private-key',
        );

        installSuccessfulFetch();

        await assert.rejects(
          visaAcceptanceSandboxAdapter
            .initiateDeposit(
              createInitiationInput(),
            ),
          assertProviderError(
            'PROVIDER_CONFIGURATION_INVALID',
          ),
        );
      },
    );

    test(
      'rejects a Visa response containing a different request ID',
      async () => {
        installSuccessfulFetch({
          requestId:
            'different_deposit_request',
        });

        await assert.rejects(
          visaAcceptanceSandboxAdapter
            .initiateDeposit(
              createInitiationInput(),
            ),
          assertProviderError(
            'PROVIDER_RESPONSE_INVALID',
          ),
        );
      },
    );

    test(
      'accepts and normalizes a correctly signed successful callback',
      async () => {
        const rawBody =
          createCallbackBody(
            'CAPTURED',
          );

        const result =
          await visaAcceptanceSandboxAdapter
            .verifyAndNormalizeCallback(
              createCallbackRequest(
                rawBody,
              ),
            );

        assert.equal(
          result.providerCode,
          'VISA_ACCEPTANCE',
        );

        assert.equal(
          result.environment,
          'SANDBOX',
        );

        assert.equal(
          result.kind,
          'DEPOSIT',
        );

        assert.equal(
          result.requestId,
          'deposit_test_001',
        );

        assert.equal(
          result.providerTransactionId,
          'visa_transaction_001',
        );

        assert.equal(
          result.outcome,
          'SUCCESS',
        );

        assert.equal(
          result.failureReason,
          null,
        );
      },
    );

    test(
      'normalizes a correctly signed pending callback',
      async () => {
        const rawBody =
          createCallbackBody(
            'AUTHORIZED',
          );

        const result =
          await visaAcceptanceSandboxAdapter
            .verifyAndNormalizeCallback(
              createCallbackRequest(
                rawBody,
              ),
            );

        assert.equal(
          result.outcome,
          'PENDING',
        );
      },
    );

    test(
      'normalizes a correctly signed failed callback',
      async () => {
        const rawBody =
          createCallbackBody(
            'DECLINED',
          );

        const result =
          await visaAcceptanceSandboxAdapter
            .verifyAndNormalizeCallback(
              createCallbackRequest(
                rawBody,
              ),
            );

        assert.equal(
          result.outcome,
          'FAILED',
        );

        assert.equal(
          result.failureReason,
          'VISA_PAYMENT_FAILED',
        );
      },
    );

    test(
      'rejects a callback signed with a different key ID',
      async () => {
        const rawBody =
          createCallbackBody(
            'CAPTURED',
          );

        await assert.rejects(
          visaAcceptanceSandboxAdapter
            .verifyAndNormalizeCallback(
              createCallbackRequest(
                rawBody,
                {
                  keyId:
                    'wrong_key_id',
                },
              ),
            ),
          assertProviderError(
            'PROVIDER_CALLBACK_UNAUTHORIZED',
          ),
        );
      },
    );

    test(
      'rejects a callback body modified after signing',
      async () => {
        const originalBody =
          createCallbackBody(
            'CAPTURED',
          );

        const modifiedBody =
          createCallbackBody(
            'DECLINED',
          );

        await assert.rejects(
          visaAcceptanceSandboxAdapter
            .verifyAndNormalizeCallback(
              createCallbackRequest(
                modifiedBody,
                {
                  signatureBody:
                    originalBody,
                },
              ),
            ),
          assertProviderError(
            'PROVIDER_CALLBACK_UNAUTHORIZED',
          ),
        );
      },
    );

    test(
      'rejects an expired callback',
      async () => {
        const rawBody =
          createCallbackBody(
            'CAPTURED',
          );

        const oldTimestamp =
          Date.now() -
          301_000;

        await assert.rejects(
          visaAcceptanceSandboxAdapter
            .verifyAndNormalizeCallback(
              createCallbackRequest(
                rawBody,
                {
                  timestampMs:
                    oldTimestamp,
                },
              ),
            ),
          assertProviderError(
            'PROVIDER_CALLBACK_EXPIRED',
          ),
        );
      },
    );

    test(
      'fails closed when the webhook secret is missing',
      async () => {
        deleteEnvironmentVariable(
          'VISA_ACCEPTANCE_SANDBOX_WEBHOOK_SECRET',
        );

        const rawBody =
          createCallbackBody(
            'CAPTURED',
          );

        await assert.rejects(
          visaAcceptanceSandboxAdapter
            .verifyAndNormalizeCallback(
              createCallbackRequest(
                rawBody,
              ),
            ),
          assertProviderError(
            'PROVIDER_CONFIGURATION_INVALID',
          ),
        );
      },
    );

    test(
      'rejects malformed callback JSON after signature verification',
      async () => {
        const rawBody =
          '{"invalid":';

        await assert.rejects(
          visaAcceptanceSandboxAdapter
            .verifyAndNormalizeCallback(
              createCallbackRequest(
                rawBody,
              ),
            ),
          assertProviderError(
            'PROVIDER_CALLBACK_INVALID',
          ),
        );
      },
    );
  },
);