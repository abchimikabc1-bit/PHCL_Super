import assert from 'node:assert/strict';

import {
  after,
  afterEach,
  beforeEach,
  describe,
  test,
} from 'node:test';

import {
  paypalSandboxAdapter,
} from '@/lib/server-payment-provider-adapters/paypal-sandbox';

import {
  ProviderAdapterError,
  type CaptureProviderDepositInput,
  type InitiateProviderDepositInput,
  type ProviderCallbackRequest,
} from '@/lib/server-payment-provider-types';

const ORIGINAL_FETCH =
  globalThis.fetch;

const ORIGINAL_ENV = {
  clientId:
    process.env
      .PAYPAL_SANDBOX_CLIENT_ID,

  clientSecret:
    process.env
      .PAYPAL_SANDBOX_CLIENT_SECRET,

  webhookId:
    process.env
      .PAYPAL_SANDBOX_WEBHOOK_ID,

  siteUrl:
    process.env
      .NEXT_PUBLIC_SITE_URL,
};

type RecordedFetch = {
  url:
    string;

  init:
    RequestInit | undefined;
};

let recordedFetches:
  RecordedFetch[] = [];

let queuedResponses:
  Response[] = [];

function queueJsonResponse(
  body:
    unknown,

  status = 200,
): void {
  queuedResponses.push(
    new Response(
      JSON.stringify(
        body,
      ),
      {
        status,

        headers: {
          'Content-Type':
            'application/json',
        },
      },
    ),
  );
}

async function fetchMock(
  input:
    string | URL | Request,

  init?:
    RequestInit,
): Promise<Response> {
  const url =
    input instanceof Request
      ? input.url
      : String(
          input,
        );

  recordedFetches.push({
    url,
    init,
  });

  const response =
    queuedResponses.shift();

  if (!response) {
    throw new Error(
      `Unexpected fetch request: ${url}`,
    );
  }

  return response;
}

function restoreEnvironmentVariable(
  name:
    string,

  value:
    string | undefined,
): void {
  if (
    value === undefined
  ) {
    delete process.env[
      name
    ];

    return;
  }

  process.env[
    name
  ] =
    value;
}

function createInput(
  overrides:
    Partial<
      InitiateProviderDepositInput
    > = {},
): InitiateProviderDepositInput {
  return {
    requestId:
      'deposit-paypal-test-001',

    operationId:
      'paypal-operation-test-001',

    providerCode:
      'PAYPAL',

    environment:
      'SANDBOX',

    rail:
      'DIGITAL_WALLET',

    asset:
      'USD',

    amountAtomic:
      '1025',

    payer: {
      type:
        'EMAIL',

      value:
        'verified.customer@example.com',
    },

    returnUrl:
      'https://www.phclsuper.com/deposit/paypal/return',

    cancelUrl:
      'https://www.phclsuper.com/deposit/paypal/cancel',

    metadata: {
      source:
        'PHCL_DEPOSIT_API',
    },

    ...overrides,
  };
}

function createCaptureInput(
  overrides:
    Partial<
      CaptureProviderDepositInput
    > = {},
): CaptureProviderDepositInput {
  return {
    requestId:
      'deposit-paypal-capture-001',

    operationId:
      'paypal-capture-operation-001',

    providerCode:
      'PAYPAL',

    environment:
      'SANDBOX',

    providerRequestId:
      'PAYPAL-ORDER-CAPTURE-001',

    ...overrides,
  };
}

function queueAccessToken(): void {
  queueJsonResponse({
    access_token:
      'sandbox-access-token-for-tests',

    token_type:
      'Bearer',

    expires_in:
      28_800,
  });
}

function queueCreatedOrder(
  orderId =
    'PAYPAL-ORDER-TEST-001',
): void {
  queueJsonResponse(
    {
      id:
        orderId,

      status:
        'CREATED',

      links: [
        {
          href:
            `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}`,

          rel:
            'self',

          method:
            'GET',
        },

        {
          href:
            `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`,

          rel:
            'payer-action',

          method:
            'GET',
        },
      ],
    },
    201,
  );
}

function createWebhookEvent(
  eventType:
    string,
) {
  return {
    id:
      `WH-${eventType.replace(
        /[^A-Z0-9]/g,
        '-',
      )}`,

    event_type:
      eventType,

    create_time:
      new Date()
        .toISOString(),

    resource: {
      id:
        'PAYPAL-CAPTURE-001',

      custom_id:
        'deposit-paypal-test-001',

      status:
        eventType.endsWith(
          'COMPLETED',
        )
          ? 'COMPLETED'
          : 'PENDING',
    },
  };
}

function createCallbackRequest(
  eventType:
    string,

  overrides:
    Partial<
      ProviderCallbackRequest
    > = {},
): ProviderCallbackRequest {
  const receivedAtMs =
    Date.now();

  return {
    providerCode:
      'PAYPAL',

    environment:
      'SANDBOX',

    rawBody:
      JSON.stringify(
        createWebhookEvent(
          eventType,
        ),
      ),

    headers: {
      'paypal-transmission-id':
        'transmission-test-001',

      'paypal-transmission-time':
        new Date(
          receivedAtMs -
            1_000,
        ).toISOString(),

      'paypal-cert-url':
        'https://api-m.sandbox.paypal.com/v1/notifications/certs/CERT-TEST-001',

      'paypal-auth-algo':
        'SHA256withRSA',

      'paypal-transmission-sig':
        'sandbox-signature-for-tests',
    },

    receivedAtMs,

    ...overrides,
  };
}

function queueSuccessfulWebhookVerification():
  void {
  queueJsonResponse({
    verification_status:
      'SUCCESS',
  });
}

async function assertProviderCode(
  action:
    () =>
      Promise<
        unknown
      >,

  expectedCode:
    string,
): Promise<void> {
  await assert.rejects(
    action,
    (
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

      assert.equal(
        error.message,
        expectedCode,
      );

      return true;
    },
  );
}

function getRequestHeaders(
  init:
    RequestInit | undefined,
): Headers {
  return new Headers(
    init?.headers,
  );
}

function parseRequestBody(
  init:
    RequestInit | undefined,
): Record<
  string,
  unknown
> {
  assert.equal(
    typeof init?.body,
    'string',
  );

  const parsed =
    JSON.parse(
      init.body as
        string,
    ) as unknown;

  assert.ok(
    typeof parsed ===
      'object' &&
    parsed !== null &&
    !Array.isArray(
      parsed,
    ),
  );

  return parsed as
    Record<
      string,
      unknown
    >;
}

describe(
  'PHCL PayPal sandbox adapter',
  () => {
    beforeEach(
      () => {
        process.env
          .PAYPAL_SANDBOX_CLIENT_ID =
          'paypal-sandbox-client-id-test';

        process.env
          .PAYPAL_SANDBOX_CLIENT_SECRET =
          'paypal-sandbox-client-secret-test';

        process.env
          .PAYPAL_SANDBOX_WEBHOOK_ID =
          'PAYPALWEBHOOKTEST001';

        process.env
          .NEXT_PUBLIC_SITE_URL =
          'https://www.phclsuper.com';

        recordedFetches =
          [];

        queuedResponses =
          [];

        globalThis.fetch =
          fetchMock as
            typeof fetch;
      },
    );

    afterEach(
      () => {
        assert.equal(
          queuedResponses.length,
          0,
          'A mocked PayPal response was not consumed.',
        );
      },
    );

    after(
      () => {
        globalThis.fetch =
          ORIGINAL_FETCH;

        restoreEnvironmentVariable(
          'PAYPAL_SANDBOX_CLIENT_ID',
          ORIGINAL_ENV.clientId,
        );

        restoreEnvironmentVariable(
          'PAYPAL_SANDBOX_CLIENT_SECRET',
          ORIGINAL_ENV.clientSecret,
        );

        restoreEnvironmentVariable(
          'PAYPAL_SANDBOX_WEBHOOK_ID',
          ORIGINAL_ENV.webhookId,
        );

        restoreEnvironmentVariable(
          'NEXT_PUBLIC_SITE_URL',
          ORIGINAL_ENV.siteUrl,
        );
      },
    );

    test(
      'exposes the expected immutable adapter configuration',
      () => {
        assert.equal(
          paypalSandboxAdapter
            .providerCode,
          'PAYPAL',
        );

        assert.equal(
          paypalSandboxAdapter
            .environment,
          'SANDBOX',
        );

        assert.deepEqual(
          paypalSandboxAdapter
            .supportedRails,
          [
            'DIGITAL_WALLET',
          ],
        );

        assert.deepEqual(
          paypalSandboxAdapter
            .supportedAssets,
          [
            'USD',
          ],
        );

        assert.equal(
          Object.isFrozen(
            paypalSandboxAdapter,
          ),
          true,
        );

        assert.equal(
          Object.isFrozen(
            paypalSandboxAdapter
              .supportedRails,
          ),
          true,
        );

        assert.equal(
          Object.isFrozen(
            paypalSandboxAdapter
              .supportedAssets,
          ),
          true,
        );
      },
    );

    test(
      'fails closed when PayPal client ID is missing',
      async () => {
        delete process.env
          .PAYPAL_SANDBOX_CLIENT_ID;

        await assertProviderCode(
          () =>
            paypalSandboxAdapter
              .initiateDeposit(
                createInput(),
              ),
          'PROVIDER_CONFIGURATION_INVALID',
        );

        assert.equal(
          recordedFetches.length,
          0,
        );
      },
    );

    test(
      'fails closed when PayPal client secret is too short',
      async () => {
        process.env
          .PAYPAL_SANDBOX_CLIENT_SECRET =
          'short';

        await assertProviderCode(
          () =>
            paypalSandboxAdapter
              .initiateDeposit(
                createInput(),
              ),
          'PROVIDER_CONFIGURATION_INVALID',
        );

        assert.equal(
          recordedFetches.length,
          0,
        );
      },
    );

    test(
      'rejects an unsupported asset',
      async () => {
        await assertProviderCode(
          () =>
            paypalSandboxAdapter
              .initiateDeposit(
                createInput({
                  asset:
                    'TZS',
                }),
              ),
          'PROVIDER_ROUTE_NOT_SUPPORTED',
        );

        assert.equal(
          recordedFetches.length,
          0,
        );
      },
    );

    test(
      'rejects an unsupported payment rail',
      async () => {
        await assertProviderCode(
          () =>
            paypalSandboxAdapter
              .initiateDeposit(
                createInput({
                  rail:
                    'MOBILE_MONEY',
                }),
              ),
          'PROVIDER_ROUTE_NOT_SUPPORTED',
        );

        assert.equal(
          recordedFetches.length,
          0,
        );
      },
    );

    test(
      'rejects a non-email payer reference',
      async () => {
        await assertProviderCode(
          () =>
            paypalSandboxAdapter
              .initiateDeposit(
                createInput({
                  payer: {
                    type:
                      'NONE',
                  },
                }),
              ),
          'PROVIDER_REQUEST_INVALID',
        );

        assert.equal(
          recordedFetches.length,
          0,
        );
      },
    );

    test(
      'rejects an invalid payer email',
      async () => {
        await assertProviderCode(
          () =>
            paypalSandboxAdapter
              .initiateDeposit(
                createInput({
                  payer: {
                    type:
                      'EMAIL',

                    value:
                      'not-an-email',
                  },
                }),
              ),
          'PROVIDER_REQUEST_INVALID',
        );

        assert.equal(
          recordedFetches.length,
          0,
        );
      },
    );

    test(
      'rejects zero, negative and decimal atomic amounts',
      async () => {
        for (
          const amountAtomic of [
            '0',
            '-100',
            '10.25',
          ]
        ) {
          await assertProviderCode(
            () =>
              paypalSandboxAdapter
                .initiateDeposit(
                  createInput({
                    amountAtomic,
                  }),
                ),
            'PROVIDER_REQUEST_INVALID',
          );
        }

        assert.equal(
          recordedFetches.length,
          0,
        );
      },
    );

    test(
      'rejects a return URL outside the approved PHCL origin',
      async () => {
        await assertProviderCode(
          () =>
            paypalSandboxAdapter
              .initiateDeposit(
                createInput({
                  returnUrl:
                    'https://attacker.example/paypal/return',
                }),
              ),
          'PROVIDER_REQUEST_INVALID',
        );

        assert.equal(
          recordedFetches.length,
          0,
        );
      },
    );

    test(
      'rejects a cancel URL outside the approved PHCL origin',
      async () => {
        await assertProviderCode(
          () =>
            paypalSandboxAdapter
              .initiateDeposit(
                createInput({
                  cancelUrl:
                    'https://attacker.example/paypal/cancel',
                }),
              ),
          'PROVIDER_REQUEST_INVALID',
        );

        assert.equal(
          recordedFetches.length,
          0,
        );
      },
    );

    test(
      'creates a PayPal sandbox order without settling funds',
      async () => {
        queueAccessToken();
        queueCreatedOrder();

        const result =
          await paypalSandboxAdapter
            .initiateDeposit(
              createInput(),
            );

        assert.equal(
          result.success,
          true,
        );

        assert.equal(
          result.providerCode,
          'PAYPAL',
        );

        assert.equal(
          result.environment,
          'SANDBOX',
        );

        assert.equal(
          result.providerRequestId,
          'PAYPAL-ORDER-TEST-001',
        );

        assert.equal(
          result.providerTransactionId,
          null,
        );

        assert.equal(
          result.status,
          'REQUIRES_CUSTOMER_ACTION',
        );

        assert.equal(
          result.customerAction
            ?.type,
          'REDIRECT',
        );

        if (
          result.customerAction
            ?.type !==
          'REDIRECT'
        ) {
          assert.fail(
            'Expected PayPal redirect action.',
          );
        }

        assert.equal(
          result.customerAction
            .redirectUrl,
          'https://www.sandbox.paypal.com/checkoutnow?token=PAYPAL-ORDER-TEST-001',
        );

        assert.match(
          result.responseFingerprint,
          /^[a-f0-9]{64}$/,
        );

        assert.equal(
          recordedFetches.length,
          2,
        );

        assert.equal(
          recordedFetches[0]
            ?.url,
          'https://api-m.sandbox.paypal.com/v1/oauth2/token',
        );

        assert.equal(
          recordedFetches[1]
            ?.url,
          'https://api-m.sandbox.paypal.com/v2/checkout/orders',
        );
      },
    );

    test(
      'converts PHCL USD atomic units to PayPal decimal USD',
      async () => {
        queueCreatedOrder(
          'PAYPAL-ORDER-TEST-002',
        );

        await paypalSandboxAdapter
          .initiateDeposit(
            createInput({
              requestId:
                'deposit-paypal-test-002',

              operationId:
                'paypal-operation-test-002',

              amountAtomic:
                '12345',
            }),
          );

        assert.equal(
          recordedFetches.length,
          1,
        );

        const orderBody =
          parseRequestBody(
            recordedFetches[0]
              ?.init,
          );

        const purchaseUnits =
          orderBody
            .purchase_units;

        assert.ok(
          Array.isArray(
            purchaseUnits,
          ),
        );

        const firstPurchaseUnit =
          purchaseUnits[0];

        assert.ok(
          typeof firstPurchaseUnit ===
            'object' &&
          firstPurchaseUnit !==
            null,
        );

        const amount =
          (
            firstPurchaseUnit as
              Record<
                string,
                unknown
              >
          ).amount;

        assert.deepEqual(
          amount,
          {
            currency_code:
              'USD',

            value:
              '123.45',
          },
        );
      },
    );

    test(
      'uses the operation ID as PayPal idempotency key',
      async () => {
        queueCreatedOrder(
          'PAYPAL-ORDER-STABLE-001',
        );

        const input =
          createInput({
            requestId:
              'deposit-paypal-stable-001',

            operationId:
              'paypal-operation-stable-001',
          });

        const first =
          await paypalSandboxAdapter
            .initiateDeposit(
              input,
            );

        queueCreatedOrder(
          'PAYPAL-ORDER-STABLE-001',
        );

        const second =
          await paypalSandboxAdapter
            .initiateDeposit(
              input,
            );

        assert.equal(
          first.providerRequestId,
          second.providerRequestId,
        );

        assert.equal(
          recordedFetches.length,
          2,
        );

        for (
          const recorded of
            recordedFetches
        ) {
          const headers =
            getRequestHeaders(
              recorded.init,
            );

          assert.equal(
            headers.get(
              'PayPal-Request-Id',
            ),
            input.operationId,
          );
        }
      },
    );

    test(
      'does not expose the payer email in its result',
      async () => {
        queueCreatedOrder(
          'PAYPAL-ORDER-PRIVATE-001',
        );

        const privateEmail =
          'private.customer@example.com';

        const result =
          await paypalSandboxAdapter
            .initiateDeposit(
              createInput({
                requestId:
                  'deposit-paypal-private-001',

                operationId:
                  'paypal-operation-private-001',

                payer: {
                  type:
                    'EMAIL',

                  value:
                    privateEmail,
                },
              }),
            );

        assert.equal(
          JSON.stringify(
            result,
          ).includes(
            privateEmail,
          ),
          false,
        );
      },
    );

    test(
      'rejects an approval URL outside PayPal sandbox',
      async () => {
        queueJsonResponse(
          {
            id:
              'PAYPAL-ORDER-BAD-LINK-001',

            status:
              'CREATED',

            links: [
              {
                href:
                  'https://attacker.example/checkout',

                rel:
                  'payer-action',

                method:
                  'GET',
              },
            ],
          },
          201,
        );

        await assertProviderCode(
          () =>
            paypalSandboxAdapter
              .initiateDeposit(
                createInput({
                  requestId:
                    'deposit-paypal-bad-link-001',

                  operationId:
                    'paypal-operation-bad-link-001',
                }),
              ),
          'PROVIDER_RESPONSE_INVALID',
        );
      },
    );

        test(
      'captures an approved PayPal order successfully',
      async () => {
        queueJsonResponse({
          id:
            'PAYPAL-ORDER-CAPTURE-001',

          status:
            'COMPLETED',

          purchase_units: [
            {
              payments: {
                captures: [
                  {
                    id:
                      'PAYPAL-CAPTURE-001',

                    status:
                      'COMPLETED',
                  },
                ],
              },
            },
          ],
        });

        const captureDeposit =
          paypalSandboxAdapter
            .captureDeposit;

        assert.equal(
          typeof captureDeposit,
          'function',
        );

        if (!captureDeposit) {
          assert.fail(
            'PayPal capture handler is unavailable.',
          );
        }

        const input =
          createCaptureInput();

        const result =
          await captureDeposit(
            input,
          );

        assert.equal(
          result.success,
          true,
        );

        assert.equal(
          result.providerCode,
          'PAYPAL',
        );

        assert.equal(
          result.environment,
          'SANDBOX',
        );

        assert.equal(
          result.requestId,
          input.requestId,
        );

        assert.equal(
          result.operationId,
          input.operationId,
        );

        assert.equal(
          result.providerRequestId,
          input.providerRequestId,
        );

        assert.equal(
          result.providerTransactionId,
          'PAYPAL-CAPTURE-001',
        );

        assert.equal(
          result.status,
          'SUCCESS',
        );

        assert.match(
          result.responseFingerprint,
          /^[a-f0-9]{64}$/,
        );

        assert.equal(
          recordedFetches.length,
          1,
        );

        assert.equal(
          recordedFetches[0]?.url,
          'https://api-m.sandbox.paypal.com/v2/checkout/orders/PAYPAL-ORDER-CAPTURE-001/capture',
        );

        assert.equal(
          recordedFetches[0]
            ?.init
            ?.method,
          'POST',
        );

        const headers =
          getRequestHeaders(
            recordedFetches[0]
              ?.init,
          );

        assert.equal(
          headers.get(
            'PayPal-Request-Id',
          ),
          input.operationId,
        );

        assert.equal(
          recordedFetches[0]
            ?.init
            ?.body,
          '{}',
        );
      },
    );

    test(
      'keeps a pending PayPal capture unsettled',
      async () => {
        queueJsonResponse({
          id:
            'PAYPAL-ORDER-PENDING-001',

          status:
            'APPROVED',

          purchase_units: [],
        });

        const captureDeposit =
          paypalSandboxAdapter
            .captureDeposit;

        assert.ok(
          captureDeposit,
        );

        const result =
          await captureDeposit(
            createCaptureInput({
              requestId:
                'deposit-paypal-pending-001',

              operationId:
                'paypal-capture-pending-001',

              providerRequestId:
                'PAYPAL-ORDER-PENDING-001',
            }),
          );

        assert.equal(
          result.status,
          'PENDING',
        );

        assert.equal(
          result.providerTransactionId,
          null,
        );
      },
    );

    test(
      'rejects a capture response for a different PayPal order',
      async () => {
        queueJsonResponse({
          id:
            'PAYPAL-ORDER-ATTACKER-001',

          status:
            'COMPLETED',

          purchase_units: [
            {
              payments: {
                captures: [
                  {
                    id:
                      'PAYPAL-CAPTURE-ATTACKER-001',

                    status:
                      'COMPLETED',
                  },
                ],
              },
            },
          ],
        });

        const captureDeposit =
          paypalSandboxAdapter
            .captureDeposit;

        assert.ok(
          captureDeposit,
        );

        await assertProviderCode(
          () =>
            captureDeposit(
              createCaptureInput(),
            ),
          'PROVIDER_OPERATION_CONFLICT',
        );
      },
    );

    test(
      'rejects a completed PayPal order without a capture identifier',
      async () => {
        queueJsonResponse({
          id:
            'PAYPAL-ORDER-CAPTURE-001',

          status:
            'COMPLETED',

          purchase_units: [
            {
              payments: {
                captures: [],
              },
            },
          ],
        });

        const captureDeposit =
          paypalSandboxAdapter
            .captureDeposit;

        assert.ok(
          captureDeposit,
        );

        await assertProviderCode(
          () =>
            captureDeposit(
              createCaptureInput(),
            ),
          'PROVIDER_RESPONSE_INVALID',
        );
      },
    );

    test(
      'marks a PayPal rate-limit failure as retryable',
      async () => {
        queueJsonResponse(
          {
            name:
              'RATE_LIMIT_REACHED',
          },
          429,
        );

        const captureDeposit =
          paypalSandboxAdapter
            .captureDeposit;

        assert.ok(
          captureDeposit,
        );

        await assert.rejects(
          () =>
            captureDeposit(
              createCaptureInput(),
            ),
          (
            error:
              unknown,
          ) => {
            assert.ok(
              error instanceof
                ProviderAdapterError,
            );

            assert.equal(
              error.code,
              'PROVIDER_TEMPORARILY_UNAVAILABLE',
            );

            assert.equal(
              error.retryable,
              true,
            );

            return true;
          },
        );
      },
    );

    test(
      'normalizes a verified completed capture as success',
      async () => {
        queueSuccessfulWebhookVerification();

        const result =
          await paypalSandboxAdapter
            .verifyAndNormalizeCallback(
              createCallbackRequest(
                'PAYMENT.CAPTURE.COMPLETED',
              ),
            );

        assert.equal(
          result.providerCode,
          'PAYPAL',
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
          'deposit-paypal-test-001',
        );

        assert.equal(
          result.providerTransactionId,
          'PAYPAL-CAPTURE-001',
        );

        assert.equal(
          result.outcome,
          'SUCCESS',
        );

        assert.equal(
          result.failureReason,
          null,
        );

        assert.match(
          result.payloadFingerprint,
          /^[a-f0-9]{64}$/,
        );
      },
    );

    test(
      'normalizes an approved order as pending',
      async () => {
        queueSuccessfulWebhookVerification();

        const result =
          await paypalSandboxAdapter
            .verifyAndNormalizeCallback(
              createCallbackRequest(
                'CHECKOUT.ORDER.APPROVED',
              ),
            );

        assert.equal(
          result.outcome,
          'PENDING',
        );

        assert.equal(
          result.failureReason,
          null,
        );
      },
    );

    test(
      'normalizes a denied capture as failed',
      async () => {
        queueSuccessfulWebhookVerification();

        const result =
          await paypalSandboxAdapter
            .verifyAndNormalizeCallback(
              createCallbackRequest(
                'PAYMENT.CAPTURE.DENIED',
              ),
            );

        assert.equal(
          result.outcome,
          'FAILED',
        );

        assert.equal(
          result.failureReason,
          'PAYMENT.CAPTURE.DENIED',
        );
      },
    );

    test(
      'rejects a callback when PayPal verification fails',
      async () => {
        queueJsonResponse({
          verification_status:
            'FAILURE',
        });

        await assertProviderCode(
          () =>
            paypalSandboxAdapter
              .verifyAndNormalizeCallback(
                createCallbackRequest(
                  'PAYMENT.CAPTURE.COMPLETED',
                ),
              ),
          'PROVIDER_CALLBACK_UNAUTHORIZED',
        );
      },
    );

    test(
      'rejects an expired callback before verification',
      async () => {
        const receivedAtMs =
          Date.now();

        const request =
          createCallbackRequest(
            'PAYMENT.CAPTURE.COMPLETED',
            {
              receivedAtMs,

              headers: {
                'paypal-transmission-id':
                  'transmission-expired-001',

                'paypal-transmission-time':
                  new Date(
                    receivedAtMs -
                      10 * 60 * 1_000,
                  ).toISOString(),

                'paypal-cert-url':
                  'https://api-m.sandbox.paypal.com/v1/notifications/certs/CERT-TEST-001',

                'paypal-auth-algo':
                  'SHA256withRSA',

                'paypal-transmission-sig':
                  'sandbox-signature-for-tests',
              },
            },
          );

        await assertProviderCode(
          () =>
            paypalSandboxAdapter
              .verifyAndNormalizeCallback(
                request,
              ),
          'PROVIDER_CALLBACK_EXPIRED',
        );

        assert.equal(
          recordedFetches.length,
          0,
        );
      },
    );

    test(
      'rejects a malformed callback body',
      async () => {
        await assertProviderCode(
          () =>
            paypalSandboxAdapter
              .verifyAndNormalizeCallback(
                createCallbackRequest(
                  'PAYMENT.CAPTURE.COMPLETED',
                  {
                    rawBody:
                      '{invalid-json',
                  },
                ),
              ),
          'PROVIDER_CALLBACK_INVALID',
        );

        assert.equal(
          recordedFetches.length,
          0,
        );
      },
    );
  },
);