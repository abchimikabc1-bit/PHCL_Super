import {
  after,
  before,
  beforeEach,
  describe,
  test,
} from 'node:test';

import assert from 'node:assert/strict';

import {
  createHmac,
} from 'node:crypto';

import type {
  InitiateProviderDepositInput,
  PaymentProviderAdapter,
  ProviderCallbackRequest,
} from '@/lib/server-payment-provider-types';

type AdapterModule =
  typeof import(
    '@/lib/server-payment-provider-adapters/airtel-money-sandbox'
  );

const CALLBACK_SECRET =
  'phcl-airtel-money-sandbox-callback-secret-for-tests-only';

const mutableProcessEnvironment =
  process.env as Record<
    string,
    string | undefined
  >;

const originalCallbackSecret =
  process.env
    .AIRTEL_MONEY_SANDBOX_CALLBACK_SECRET;

const originalCallbackMaxAge =
  process.env
    .AIRTEL_MONEY_SANDBOX_CALLBACK_MAX_AGE_SECONDS;

let adapter:
  PaymentProviderAdapter;

function createDepositInput(
  overrides:
    Partial<
      InitiateProviderDepositInput
    > = {},
): InitiateProviderDepositInput {
  return {
    requestId:
      'airtel-deposit-request-001',

    operationId:
      'airtel-deposit-operation-001',

    providerCode:
      'AIRTEL_MONEY',

    environment:
      'SANDBOX',

    rail:
      'MOBILE_MONEY',

    asset:
      'TZS',

    amountAtomic:
      '100000',

    payer: {
      type:
        'MSISDN',

      value:
        '+255682345678',
    },

    metadata: {
      purpose:
        'sandbox-test',
    },

    ...overrides,
  };
}

function createSignedCallback(
  body:
    Record<
      string,
      unknown
    >,

  options: {
    timestampMs?:
      number;

    secret?:
      string;

    signature?:
      string;
  } = {},
): ProviderCallbackRequest {
  const rawBody =
    JSON.stringify(
      body,
    );

  const timestampMs =
    options.timestampMs ??
    Date.now();

  const timestampText =
    String(
      timestampMs,
    );

  const secret =
    options.secret ??
    CALLBACK_SECRET;

  const signature =
    options.signature ??
    createHmac(
      'sha256',
      secret,
    )
      .update(
        `${timestampText}.${rawBody}`,
        'utf8',
      )
      .digest(
        'hex',
      );

  return {
    providerCode:
      'AIRTEL_MONEY',

    environment:
      'SANDBOX',

    rawBody,

    receivedAtMs:
      timestampMs,

    headers: {
      'x-phcl-sandbox-timestamp':
        timestampText,

      'x-phcl-sandbox-signature':
        signature,
    },
  };
}

before(
  async () => {
    const adapterModule:
      AdapterModule =
        await import(
          '@/lib/server-payment-provider-adapters/airtel-money-sandbox'
        );

    adapter =
      adapterModule
        .airtelMoneySandboxAdapter;
  },
);

beforeEach(
  () => {
    mutableProcessEnvironment
      .AIRTEL_MONEY_SANDBOX_CALLBACK_SECRET =
      CALLBACK_SECRET;

    mutableProcessEnvironment
      .AIRTEL_MONEY_SANDBOX_CALLBACK_MAX_AGE_SECONDS =
      '300';
  },
);

after(
  () => {
    if (
      originalCallbackSecret ===
        undefined
    ) {
      delete mutableProcessEnvironment
        .AIRTEL_MONEY_SANDBOX_CALLBACK_SECRET;
    } else {
      mutableProcessEnvironment
        .AIRTEL_MONEY_SANDBOX_CALLBACK_SECRET =
        originalCallbackSecret;
    }

    if (
      originalCallbackMaxAge ===
        undefined
    ) {
      delete mutableProcessEnvironment
        .AIRTEL_MONEY_SANDBOX_CALLBACK_MAX_AGE_SECONDS;
    } else {
      mutableProcessEnvironment
        .AIRTEL_MONEY_SANDBOX_CALLBACK_MAX_AGE_SECONDS =
        originalCallbackMaxAge;
    }
  },
);

describe(
  'PHCL Airtel Money sandbox adapter',
  {
    concurrency:
      false,
  },
  () => {
    test(
      'exposes the expected immutable adapter configuration',
      () => {
        assert.equal(
          adapter.providerCode,
          'AIRTEL_MONEY',
        );

        assert.equal(
          adapter.environment,
          'SANDBOX',
        );

        assert.deepEqual(
          adapter.supportedRails,
          [
            'MOBILE_MONEY',
          ],
        );

        assert.deepEqual(
          adapter.supportedAssets,
          [
            'TZS',
          ],
        );

        assert.equal(
          Object.isFrozen(
            adapter,
          ),
          true,
        );

        assert.equal(
          Object.isFrozen(
            adapter.supportedRails,
          ),
          true,
        );

        assert.equal(
          Object.isFrozen(
            adapter.supportedAssets,
          ),
          true,
        );
      },
    );

    test(
      'initiates an Airtel Money sandbox deposit without settling funds',
      async () => {
        const result =
          await adapter
            .initiateDeposit(
              createDepositInput(),
            );

        assert.equal(
          result.success,
          true,
        );

        assert.equal(
          result.providerCode,
          'AIRTEL_MONEY',
        );

        assert.equal(
          result.environment,
          'SANDBOX',
        );

        assert.equal(
          result.requestId,
          'airtel-deposit-request-001',
        );

        assert.equal(
          result.operationId,
          'airtel-deposit-operation-001',
        );

        assert.match(
          result.providerRequestId,
          /^airtel_money_req_[a-f0-9]{32}$/,
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
          'USSD_PROMPT',
        );

        assert.equal(
          typeof result
            .responseFingerprint,
          'string',
        );

        assert.match(
          result.responseFingerprint,
          /^[a-f0-9]{64}$/,
        );
      },
    );

    test(
      'returns stable references for an identical retry',
      async () => {
        const input =
          createDepositInput();

        const first =
          await adapter
            .initiateDeposit(
              input,
            );

        const second =
          await adapter
            .initiateDeposit(
              input,
            );

        assert.equal(
          first.providerRequestId,
          second.providerRequestId,
        );

        assert.equal(
          first.responseFingerprint,
          second.responseFingerprint,
        );
      },
    );

    test(
      'does not expose the payer phone number in its result',
      async () => {
        const phoneNumber =
          '+255682345678';

        const result =
          await adapter
            .initiateDeposit(
              createDepositInput({
                payer: {
                  type:
                    'MSISDN',

                  value:
                    phoneNumber,
                },
              }),
            );

        const serialized =
          JSON.stringify(
            result,
          );

        assert.equal(
          serialized.includes(
            phoneNumber,
          ),
          false,
        );

        assert.equal(
          serialized.includes(
            '255682345678',
          ),
          false,
        );
      },
    );

    test(
      'accepts and normalizes a Tanzanian local mobile number',
      async () => {
        const result =
          await adapter
            .initiateDeposit(
              createDepositInput({
                payer: {
                  type:
                    'MSISDN',

                  value:
                    '0682 345 678',
                },
              }),
            );

        assert.equal(
          result.success,
          true,
        );
      },
    );

    test(
      'rejects an unsupported asset',
      async () => {
        await assert.rejects(
          adapter.initiateDeposit(
            createDepositInput({
              asset:
                'USD',
            }),
          ),
          /PAYMENT_PROVIDER_UNSUPPORTED_ROUTE/,
        );
      },
    );

    test(
      'rejects an unsupported payment rail',
      async () => {
        await assert.rejects(
          adapter.initiateDeposit(
            createDepositInput({
              rail:
                'CARD',
            }),
          ),
          /PAYMENT_PROVIDER_UNSUPPORTED_ROUTE/,
        );
      },
    );

    test(
      'rejects a non-MSISDN payer reference',
      async () => {
        await assert.rejects(
          adapter.initiateDeposit(
            createDepositInput({
              payer: {
                type:
                  'EMAIL',

                value:
                  'customer@example.test',
              },
            }),
          ),
          /PAYMENT_PROVIDER_INVALID_PAYER_REFERENCE/,
        );
      },
    );

    test(
      'rejects an invalid Tanzanian mobile number',
      async () => {
        await assert.rejects(
          adapter.initiateDeposit(
            createDepositInput({
              payer: {
                type:
                  'MSISDN',

                value:
                  '12345',
              },
            }),
          ),
          /PAYMENT_PROVIDER_INVALID_PAYER_REFERENCE/,
        );
      },
    );

    test(
      'rejects zero, negative and decimal atomic amounts',
      async () => {
        for (
          const amountAtomic
          of [
            '0',
            '-1',
            '1.5',
            '',
          ]
        ) {
          await assert.rejects(
            adapter.initiateDeposit(
              createDepositInput({
                amountAtomic,
              }),
            ),
            /PAYMENT_PROVIDER_INVALID_AMOUNT/,
          );
        }
      },
    );

    test(
      'accepts and normalizes a correctly signed success callback',
      async () => {
        const request =
          createSignedCallback({
            requestId:
              'airtel-deposit-request-001',

            providerEventId:
              'airtel-provider-event-001',

            providerTransactionId:
              'airtel-provider-transaction-001',

            status:
              'SUCCESS',
          });

        const result =
          await adapter
            .verifyAndNormalizeCallback(
              request,
            );

        assert.equal(
          result.providerCode,
          'AIRTEL_MONEY',
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
          'airtel-deposit-request-001',
        );

        assert.equal(
          result.providerEventId,
          'airtel-provider-event-001',
        );

        assert.equal(
          result.providerTransactionId,
          'airtel-provider-transaction-001',
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
      'normalizes a correctly signed pending callback',
      async () => {
        const request =
          createSignedCallback({
            requestId:
              'airtel-deposit-request-002',

            providerEventId:
              'airtel-provider-event-002',

            providerTransactionId:
              null,

            status:
              'PENDING',

            failureReason:
              'This must not be returned.',
          });

        const result =
          await adapter
            .verifyAndNormalizeCallback(
              request,
            );

        assert.equal(
          result.outcome,
          'PENDING',
        );

        assert.equal(
          result.failureReason,
          null,
        );

        assert.equal(
          result.providerTransactionId,
          null,
        );
      },
    );

    test(
      'normalizes a correctly signed failed callback',
      async () => {
        const request =
          createSignedCallback({
            requestId:
              'airtel-deposit-request-003',

            providerEventId:
              'airtel-provider-event-003',

            providerTransactionId:
              null,

            status:
              'FAILED',

            failureReason:
              'CUSTOMER_CANCELLED',
          });

        const result =
          await adapter
            .verifyAndNormalizeCallback(
              request,
            );

        assert.equal(
          result.outcome,
          'FAILED',
        );

        assert.equal(
          result.failureReason,
          'CUSTOMER_CANCELLED',
        );
      },
    );

    test(
      'rejects a callback with an invalid signature',
      async () => {
        const request =
          createSignedCallback(
            {
              requestId:
                'airtel-deposit-request-004',

              providerEventId:
                'airtel-provider-event-004',

              providerTransactionId:
                null,

              status:
                'SUCCESS',
            },
            {
              signature:
                '0'.repeat(
                  64,
                ),
            },
          );

        await assert.rejects(
          adapter
            .verifyAndNormalizeCallback(
              request,
            ),
          /PAYMENT_PROVIDER_CALLBACK_UNAUTHORIZED/,
        );
      },
    );

    test(
      'rejects a callback body modified after signing',
      async () => {
        const request =
          createSignedCallback({
            requestId:
              'airtel-deposit-request-005',

            providerEventId:
              'airtel-provider-event-005',

            providerTransactionId:
              null,

            status:
              'PENDING',
          });

        const modifiedRequest = {
          ...request,

          rawBody:
            request.rawBody.replace(
              '"PENDING"',
              '"SUCCESS"',
            ),
        };

        await assert.rejects(
          adapter
            .verifyAndNormalizeCallback(
              modifiedRequest,
            ),
          /PAYMENT_PROVIDER_CALLBACK_UNAUTHORIZED/,
        );
      },
    );

    test(
      'rejects an expired callback',
      async () => {
        const timestampMs =
          Date.now() -
          301_000;

        const request =
          createSignedCallback(
            {
              requestId:
                'airtel-deposit-request-006',

              providerEventId:
                'airtel-provider-event-006',

              providerTransactionId:
                null,

              status:
                'SUCCESS',
            },
            {
              timestampMs,
            },
          );

        request.receivedAtMs =
          Date.now();

        await assert.rejects(
          adapter
            .verifyAndNormalizeCallback(
              request,
            ),
          /PAYMENT_PROVIDER_CALLBACK_EXPIRED/,
        );
      },
    );

    test(
      'fails closed when the callback secret is missing',
      async () => {
        delete mutableProcessEnvironment
          .AIRTEL_MONEY_SANDBOX_CALLBACK_SECRET;

        const request =
          createSignedCallback({
            requestId:
              'airtel-deposit-request-007',

            providerEventId:
              'airtel-provider-event-007',

            providerTransactionId:
              null,

            status:
              'SUCCESS',
          });

        await assert.rejects(
          adapter
            .verifyAndNormalizeCallback(
              request,
            ),
          /PAYMENT_PROVIDER_CALLBACK_SECRET_NOT_CONFIGURED/,
        );
      },
    );

    test(
      'fails closed when the callback secret is too short',
      async () => {
        mutableProcessEnvironment
          .AIRTEL_MONEY_SANDBOX_CALLBACK_SECRET =
          'too-short';

        const request =
          createSignedCallback({
            requestId:
              'airtel-deposit-request-008',

            providerEventId:
              'airtel-provider-event-008',

            providerTransactionId:
              null,

            status:
              'SUCCESS',
          });

        await assert.rejects(
          adapter
            .verifyAndNormalizeCallback(
              request,
            ),
          /PAYMENT_PROVIDER_CALLBACK_SECRET_NOT_CONFIGURED/,
        );
      },
    );

    test(
      'rejects malformed callback JSON',
      async () => {
        const timestampMs =
          Date.now();

        const timestampText =
          String(
            timestampMs,
          );

        const rawBody =
          '{"invalid":';

        const signature =
          createHmac(
            'sha256',
            CALLBACK_SECRET,
          )
            .update(
              `${timestampText}.${rawBody}`,
              'utf8',
            )
            .digest(
              'hex',
            );

        const request:
          ProviderCallbackRequest = {
            providerCode:
              'AIRTEL_MONEY',

            environment:
              'SANDBOX',

            rawBody,

            receivedAtMs:
              timestampMs,

            headers: {
              'x-phcl-sandbox-timestamp':
                timestampText,

              'x-phcl-sandbox-signature':
                signature,
            },
          };

        await assert.rejects(
          adapter
            .verifyAndNormalizeCallback(
              request,
            ),
          /PAYMENT_PROVIDER_INVALID_CALLBACK/,
        );
      },
    );
  },
);