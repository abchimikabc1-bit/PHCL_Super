import {
  after,
  before,
  beforeEach,
  describe,
  test,
} from 'node:test';

import assert from 'node:assert/strict';

import type {
  Firestore,
} from 'firebase-admin/firestore';

import type {
  InitiateDepositProviderInput,
} from '@/lib/server-deposit-provider-initiation';

import type {
  PaymentProviderCode,
} from '@/lib/server-payment-provider-types';

const TEST_UID =
  'deposit-provider-test-user';

const TEST_NOW =
  2_100_000_000_000;

const DEFAULT_BALANCES = {
  usd:
    '500000',

  tzs:
    '500000000',

  ntzs:
    '100000000',

  pi:
    '250000000',
};

type DepositProviderModule =
  typeof import(
    '@/lib/server-deposit-provider-initiation'
  );

type ActiveProviderCase = {
  providerCode:
    Extract<
      PaymentProviderCode,
      | 'MPESA'
      | 'AIRTEL_MONEY'
      | 'HALOPESA'
      | 'MIXX_BY_YAS'
    >;

  displayName:
    string;

  phoneNumber:
    string;

  localPhoneNumber:
    string;

  normalizedPhoneNumber:
    string;

  requestPrefix:
    RegExp;
};

const ACTIVE_PROVIDER_CASES:
  readonly ActiveProviderCase[] = [
    {
      providerCode:
        'MPESA',

      displayName:
        'M-Pesa',

      phoneNumber:
        '+255712345678',

      localPhoneNumber:
        '0712345678',

      normalizedPhoneNumber:
        '255712345678',

      requestPrefix:
        /^mpesa_req_[a-f0-9]{32}$/,
    },

    {
      providerCode:
        'AIRTEL_MONEY',

      displayName:
        'Airtel Money',

      phoneNumber:
        '+255682345678',

      localPhoneNumber:
        '0682345678',

      normalizedPhoneNumber:
        '255682345678',

      requestPrefix:
        /^airtel_money_req_[a-f0-9]{32}$/,
    },

    {
      providerCode:
        'HALOPESA',

      displayName:
        'HaloPesa',

      phoneNumber:
        '+255622345678',

      localPhoneNumber:
        '0622345678',

      normalizedPhoneNumber:
        '255622345678',

      requestPrefix:
        /^halopesa_req_[a-f0-9]{32}$/,
    },

    {
      providerCode:
        'MIXX_BY_YAS',

      displayName:
        'Mixx by Yas',

      phoneNumber:
        '+255652345678',

      localPhoneNumber:
        '0652345678',

      normalizedPhoneNumber:
        '255652345678',

      requestPrefix:
        /^mixx_by_yas_req_[a-f0-9]{32}$/,
    },
  ];

let adminDb:
  Firestore;

let initiateDepositProvider:
  DepositProviderModule[
    'initiateDepositProvider'
  ];

const mutableProcessEnvironment =
  process.env as Record<
    string,
    string | undefined
  >;

const originalProviderEnvironment =
  process.env
    .PAYMENT_PROVIDER_ENVIRONMENT;

const originalDepositExpiry =
  process.env
    .DEPOSIT_REQUEST_EXPIRY_SECONDS;

function requireFirestoreEmulator():
  void {
  if (
    !process.env
      .FIRESTORE_EMULATOR_HOST
  ) {
    throw new Error(
      'Deposit provider initiation tests must run against the Firestore Emulator.',
    );
  }
}

async function deleteCollection(
  collectionName:
    string,
): Promise<void> {
  const snapshot =
    await adminDb
      .collection(
        collectionName,
      )
      .get();

  if (
    snapshot.empty
  ) {
    return;
  }

  const commits:
    Promise<unknown>[] = [];

  let batch =
    adminDb.batch();

  let operationCount =
    0;

  for (
    const documentSnapshot
    of snapshot.docs
  ) {
    batch.delete(
      documentSnapshot.ref,
    );

    operationCount +=
      1;

    if (
      operationCount ===
        400
    ) {
      commits.push(
        batch.commit(),
      );

      batch =
        adminDb.batch();

      operationCount =
        0;
    }
  }

  if (
    operationCount > 0
  ) {
    commits.push(
      batch.commit(),
    );
  }

  await Promise.all(
    commits,
  );
}

async function clearTestData():
  Promise<void> {
  await Promise.all([
    deleteCollection(
      'deposit_requests',
    ),

    deleteCollection(
      'financial_accounts',
    ),

    deleteCollection(
      'financial_ledger',
    ),

    deleteCollection(
      'financial_operations',
    ),
  ]);
}

async function seedFinancialAccount():
  Promise<void> {
  await adminDb
    .collection(
      'financial_accounts',
    )
    .doc(
      TEST_UID,
    )
    .set({
      uid:
        TEST_UID,

      balancesAtomic: {
        ...DEFAULT_BALANCES,
      },

      createdAt:
        new Date(
          TEST_NOW -
            86_400_000,
        ),

      updatedAt:
        new Date(
          TEST_NOW -
            60_000,
        ),
    });
}

function createBaseInput(
  provider:
    ActiveProviderCase =
      ACTIVE_PROVIDER_CASES[0],

  overrides:
    Partial<
      InitiateDepositProviderInput
    > = {},
): InitiateDepositProviderInput {
  return {
    uid:
      TEST_UID,

    clientOperationId:
      `deposit-provider-${provider.providerCode.toLowerCase()}-001`,

    asset:
      'TZS',

    rail:
      'MOBILE_MONEY',

    providerCode:
      provider.providerCode,

    amountAtomic:
      '100000',

    payer: {
      type:
        'MSISDN',

      value:
        provider.phoneNumber,
    },

    ...overrides,
  };
}

before(
  async () => {
    requireFirestoreEmulator();

    mutableProcessEnvironment
      .PAYMENT_PROVIDER_ENVIRONMENT =
      'SANDBOX';

    mutableProcessEnvironment
      .DEPOSIT_REQUEST_EXPIRY_SECONDS =
      '1800';

    const firebaseAdminModule =
      await import(
        '@/lib/firebase-admin'
      );

    const depositProviderModule =
      await import(
        '@/lib/server-deposit-provider-initiation'
      );

    adminDb =
      firebaseAdminModule.adminDb;

    initiateDepositProvider =
      depositProviderModule
        .initiateDepositProvider;
  },
);

beforeEach(
  async () => {
    mutableProcessEnvironment
      .PAYMENT_PROVIDER_ENVIRONMENT =
      'SANDBOX';

    mutableProcessEnvironment
      .DEPOSIT_REQUEST_EXPIRY_SECONDS =
      '1800';

    await clearTestData();

    await seedFinancialAccount();
  },
);

after(
  async () => {
    await clearTestData();

    if (
      originalProviderEnvironment ===
        undefined
    ) {
      delete mutableProcessEnvironment
        .PAYMENT_PROVIDER_ENVIRONMENT;
    } else {
      mutableProcessEnvironment
        .PAYMENT_PROVIDER_ENVIRONMENT =
        originalProviderEnvironment;
    }

    if (
      originalDepositExpiry ===
        undefined
    ) {
      delete mutableProcessEnvironment
        .DEPOSIT_REQUEST_EXPIRY_SECONDS;
    } else {
      mutableProcessEnvironment
        .DEPOSIT_REQUEST_EXPIRY_SECONDS =
        originalDepositExpiry;
    }
  },
);

describe(
  'PHCL deposit provider initiation',
  {
    concurrency:
      false,
  },
  () => {
    for (
      const provider
      of ACTIVE_PROVIDER_CASES
    ) {
      test(
        `initiates ${provider.displayName} without crediting the financial account`,
        async () => {
          const accountReference =
            adminDb
              .collection(
                'financial_accounts',
              )
              .doc(
                TEST_UID,
              );

          const accountBefore =
            await accountReference.get();

          const balancesBefore =
            accountBefore.data()
              ?.balancesAtomic;

          const result =
            await initiateDepositProvider(
              createBaseInput(
                provider,
              ),
            );

          assert.equal(
            result.success,
            true,
          );

          assert.equal(
            result.idempotent,
            false,
          );

          assert.equal(
            result.deposit
              .providerCode,
            provider.providerCode,
          );

          assert.equal(
            result.deposit.status,
            'PENDING_PROVIDER_INITIATION',
          );

          assert.equal(
            result.provider
              .providerCode,
            provider.providerCode,
          );

          assert.equal(
            result.provider
              .environment,
            'SANDBOX',
          );

          assert.equal(
            result.provider.status,
            'REQUIRES_CUSTOMER_ACTION',
          );

          assert.equal(
            result.provider
              .customerAction
              ?.type,
            'USSD_PROMPT',
          );

          const accountAfter =
            await accountReference.get();

          assert.deepEqual(
            accountAfter.data()
              ?.balancesAtomic,
            balancesBefore,
          );
        },
      );

      test(
        `stores only safe ${provider.displayName} initiation fields`,
        async () => {
          const result =
            await initiateDepositProvider(
              createBaseInput(
                provider,
              ),
            );

          const requestSnapshot =
            await adminDb
              .collection(
                'deposit_requests',
              )
              .doc(
                result.deposit
                  .requestId,
              )
              .get();

          assert.equal(
            requestSnapshot.exists,
            true,
          );

          const requestData =
            requestSnapshot.data();

          assert.equal(
            requestData
              ?.providerCode,
            provider.providerCode,
          );

          assert.equal(
            requestData
              ?.providerInitiationStatus,
            'INITIATED',
          );

          assert.equal(
            requestData
              ?.providerOperationStatus,
            'REQUIRES_CUSTOMER_ACTION',
          );

          assert.match(
            requestData
              ?.providerRequestId,
            provider.requestPrefix,
          );

          assert.equal(
            requestData
              ?.providerTransactionId,
            null,
          );

          assert.match(
            requestData
              ?.providerResponseFingerprint,
            /^[a-f0-9]{64}$/,
          );

          assert.equal(
            requestData
              ?.settlementStatus,
            'NOT_STARTED',
          );

          assert.equal(
            requestData
              ?.credited,
            false,
          );
        },
      );

      test(
        `never stores the ${provider.displayName} payer phone number`,
        async () => {
          const result =
            await initiateDepositProvider(
              createBaseInput(
                provider,
              ),
            );

          const requestSnapshot =
            await adminDb
              .collection(
                'deposit_requests',
              )
              .doc(
                result.deposit
                  .requestId,
              )
              .get();

          const serialized =
            JSON.stringify(
              requestSnapshot.data(),
            );

          assert.equal(
            serialized.includes(
              provider.phoneNumber,
            ),
            false,
          );

          assert.equal(
            serialized.includes(
              provider
                .normalizedPhoneNumber,
            ),
            false,
          );

          assert.equal(
            serialized.includes(
              provider.localPhoneNumber,
            ),
            false,
          );

          assert.equal(
            serialized.includes(
              '"payer"',
            ),
            false,
          );

          assert.equal(
            serialized.includes(
              '"msisdn"',
            ),
            false,
          );
        },
      );

      test(
        `returns the same ${provider.displayName} reference for an identical retry`,
        async () => {
          const input =
            createBaseInput(
              provider,
            );

          const first =
            await initiateDepositProvider(
              input,
            );

          const second =
            await initiateDepositProvider(
              input,
            );

          assert.equal(
            first.idempotent,
            false,
          );

          assert.equal(
            second.idempotent,
            true,
          );

          assert.equal(
            second.deposit
              .requestId,
            first.deposit
              .requestId,
          );

          assert.equal(
            second.provider
              .providerRequestId,
            first.provider
              .providerRequestId,
          );

          assert.equal(
            second.provider
              .responseFingerprint,
            first.provider
              .responseFingerprint,
          );

          const requests =
            await adminDb
              .collection(
                'deposit_requests',
              )
              .get();

          assert.equal(
            requests.size,
            1,
          );
        },
      );

      test(
        `rejects an unsupported ${provider.displayName} asset`,
        async () => {
          await assert.rejects(
            initiateDepositProvider(
              createBaseInput(
                provider,
                {
                  asset:
                    'USD',
                },
              ),
            ),
            /DEPOSIT_PROVIDER_ROUTE_NOT_SUPPORTED/,
          );

          const requests =
            await adminDb
              .collection(
                'deposit_requests',
              )
              .get();

          assert.equal(
            requests.empty,
            true,
          );
        },
      );

      test(
        `rejects an unsupported ${provider.displayName} rail`,
        async () => {
          await assert.rejects(
            initiateDepositProvider(
              createBaseInput(
                provider,
                {
                  rail:
                    'BANK',
                },
              ),
            ),
            /DEPOSIT_PROVIDER_ROUTE_NOT_SUPPORTED/,
          );

          const requests =
            await adminDb
              .collection(
                'deposit_requests',
              )
              .get();

          assert.equal(
            requests.empty,
            true,
          );
        },
      );
    }

    test(
      'initiates PayPal safely without crediting the financial account',
      async () => {
        const originalFetch =
          globalThis.fetch;

        const originalClientId =
          process.env
            .PAYPAL_SANDBOX_CLIENT_ID;

        const originalClientSecret =
          process.env
            .PAYPAL_SANDBOX_CLIENT_SECRET;

        const originalWebhookId =
          process.env
            .PAYPAL_SANDBOX_WEBHOOK_ID;

        const originalSiteUrl =
          process.env
            .NEXT_PUBLIC_SITE_URL;

        const payerEmail =
          'verified.customer@example.com';

        const providerOrderId =
          'PAYPAL-ORDER-INITIATION-001';

        const approvalUrl =
          `https://www.sandbox.paypal.com/checkoutnow?token=${providerOrderId}`;

        const fetchedUrls:
          string[] = [];

        const restoreVariable = (
          name:
            string,

          value:
            string | undefined,
        ): void => {
          if (
            value === undefined
          ) {
            delete mutableProcessEnvironment[
              name
            ];

            return;
          }

          mutableProcessEnvironment[
            name
          ] =
            value;
        };

        mutableProcessEnvironment
          .PAYPAL_SANDBOX_CLIENT_ID =
          'paypal-initiation-client-id';

        mutableProcessEnvironment
          .PAYPAL_SANDBOX_CLIENT_SECRET =
          'paypal-initiation-client-secret';

        mutableProcessEnvironment
          .PAYPAL_SANDBOX_WEBHOOK_ID =
          'PAYPALWEBHOOKINITIATION001';

        mutableProcessEnvironment
          .NEXT_PUBLIC_SITE_URL =
          'https://www.phclsuper.com';

        globalThis.fetch =
          async (
            input:
              string | URL | Request,
          ): Promise<Response> => {
            const url =
              input instanceof Request
                ? input.url
                : String(
                    input,
                  );

            fetchedUrls.push(
              url,
            );

            if (
              url ===
                'https://api-m.sandbox.paypal.com/v1/oauth2/token'
            ) {
              return new Response(
                JSON.stringify({
                  access_token:
                    'paypal-initiation-access-token',

                  token_type:
                    'Bearer',

                  expires_in:
                    28_800,
                }),
                {
                  status:
                    200,

                  headers: {
                    'Content-Type':
                      'application/json',
                  },
                },
              );
            }

            if (
              url ===
                'https://api-m.sandbox.paypal.com/v2/checkout/orders'
            ) {
              return new Response(
                JSON.stringify({
                  id:
                    providerOrderId,

                  status:
                    'CREATED',

                  links: [
                    {
                      href:
                        `https://api-m.sandbox.paypal.com/v2/checkout/orders/${providerOrderId}`,

                      rel:
                        'self',

                      method:
                        'GET',
                    },
                    {
                      href:
                        approvalUrl,

                      rel:
                        'payer-action',

                      method:
                        'GET',
                    },
                  ],
                }),
                {
                  status:
                    201,

                  headers: {
                    'Content-Type':
                      'application/json',
                  },
                },
              );
            }

            throw new Error(
              `Unexpected PayPal request: ${url}`,
            );
          };

        try {
          const accountReference =
            adminDb
              .collection(
                'financial_accounts',
              )
              .doc(
                TEST_UID,
              );

          const accountBefore =
            await accountReference.get();

          const balancesBefore =
            accountBefore.data()
              ?.balancesAtomic;

          const input:
            InitiateDepositProviderInput = {
              uid:
                TEST_UID,

              clientOperationId:
                'deposit-provider-paypal-001',

              asset:
                'USD',

              rail:
                'DIGITAL_WALLET',

              providerCode:
                'PAYPAL',

              amountAtomic:
                '1025',

              payer: {
                type:
                  'EMAIL',

                value:
                  payerEmail,
              },

              returnUrl:
                'https://www.phclsuper.com/deposit?paypal=approved',

              cancelUrl:
                'https://www.phclsuper.com/deposit?paypal=cancelled',
            };

          const first =
            await initiateDepositProvider(
              input,
            );

          assert.equal(
            first.success,
            true,
          );

          assert.equal(
            first.idempotent,
            false,
          );

          assert.equal(
            first.deposit.asset,
            'USD',
          );

          assert.equal(
            first.deposit.rail,
            'DIGITAL_WALLET',
          );

          assert.equal(
            first.deposit
              .providerCode,
            'PAYPAL',
          );

          assert.equal(
            first.provider
              .providerRequestId,
            providerOrderId,
          );

          assert.equal(
            first.provider
              .providerTransactionId,
            null,
          );

          assert.equal(
            first.provider.status,
            'REQUIRES_CUSTOMER_ACTION',
          );

          assert.equal(
            first.provider
              .customerAction
              ?.type,
            'REDIRECT',
          );

          if (
            first.provider
              .customerAction
              ?.type !==
            'REDIRECT'
          ) {
            assert.fail(
              'Expected PayPal redirect action.',
            );
          }

          assert.equal(
            first.provider
              .customerAction
              .redirectUrl,
            approvalUrl,
          );

          const requestReference =
            adminDb
              .collection(
                'deposit_requests',
              )
              .doc(
                first.deposit
                  .requestId,
              );

          const requestSnapshot =
            await requestReference.get();

          const requestData =
            requestSnapshot.data();

          assert.equal(
            requestData
              ?.providerInitiationStatus,
            'INITIATED',
          );

          assert.equal(
            requestData
              ?.providerOperationStatus,
            'REQUIRES_CUSTOMER_ACTION',
          );

          assert.equal(
            requestData
              ?.providerRequestId,
            providerOrderId,
          );

          assert.equal(
            requestData
              ?.providerTransactionId,
            null,
          );

          assert.equal(
            requestData
              ?.settlementStatus,
            'NOT_STARTED',
          );

          assert.equal(
            requestData?.credited,
            false,
          );

          const serializedRequest =
            JSON.stringify(
              requestData,
            );

          assert.equal(
            serializedRequest.includes(
              payerEmail,
            ),
            false,
          );

          assert.equal(
            serializedRequest.includes(
              'paypal-initiation-access-token',
            ),
            false,
          );

          assert.equal(
            serializedRequest.includes(
              'paypal-initiation-client-secret',
            ),
            false,
          );

          const accountAfter =
            await accountReference.get();

          assert.deepEqual(
            accountAfter.data()
              ?.balancesAtomic,
            balancesBefore,
          );

          const ledgerSnapshot =
            await adminDb
              .collection(
                'financial_ledger',
              )
              .get();

          assert.equal(
            ledgerSnapshot.empty,
            true,
          );

          const operationSnapshot =
            await adminDb
              .collection(
                'financial_operations',
              )
              .get();

          assert.equal(
            operationSnapshot.empty,
            true,
          );

          const second =
            await initiateDepositProvider(
              input,
            );

          assert.equal(
            second.idempotent,
            true,
          );

          assert.equal(
            second.deposit
              .requestId,
            first.deposit
              .requestId,
          );

          assert.equal(
            second.provider
              .providerRequestId,
            first.provider
              .providerRequestId,
          );

          const matchingRequests =
            await adminDb
              .collection(
                'deposit_requests',
              )
              .where(
                'clientOperationId',
                '==',
                input.clientOperationId,
              )
              .get();

          assert.equal(
            matchingRequests.size,
            1,
          );

          assert.deepEqual(
            fetchedUrls,
            [
              'https://api-m.sandbox.paypal.com/v1/oauth2/token',
              'https://api-m.sandbox.paypal.com/v2/checkout/orders',
              'https://api-m.sandbox.paypal.com/v2/checkout/orders',
            ],
          );
        } finally {
          globalThis.fetch =
            originalFetch;

          restoreVariable(
            'PAYPAL_SANDBOX_CLIENT_ID',
            originalClientId,
          );

          restoreVariable(
            'PAYPAL_SANDBOX_CLIENT_SECRET',
            originalClientSecret,
          );

          restoreVariable(
            'PAYPAL_SANDBOX_WEBHOOK_ID',
            originalWebhookId,
          );

          restoreVariable(
            'NEXT_PUBLIC_SITE_URL',
            originalSiteUrl,
          );
        }
      },
    );

    test(
      'rejects reuse of an operation ID with a different amount',
      async () => {
        const input =
          createBaseInput();

        await initiateDepositProvider(
          input,
        );

        await assert.rejects(
          initiateDepositProvider({
            ...input,

            amountAtomic:
              '200000',
          }),
          /DEPOSIT_OPERATION_CONFLICT/,
        );
      },
    );

    test(
      'rejects reuse of an operation ID with a different provider',
      async () => {
        const mpesa =
          ACTIVE_PROVIDER_CASES[0];

        const airtel =
          ACTIVE_PROVIDER_CASES[1];

        const operationId =
          'shared-provider-operation-001';

        await initiateDepositProvider(
          createBaseInput(
            mpesa,
            {
              clientOperationId:
                operationId,
            },
          ),
        );

        await assert.rejects(
          initiateDepositProvider(
            createBaseInput(
              airtel,
              {
                clientOperationId:
                  operationId,
              },
            ),
          ),
          /DEPOSIT_OPERATION_CONFLICT/,
        );
      },
    );

    test(
      'rejects an unregistered sandbox provider',
      async () => {
        await assert.rejects(
          initiateDepositProvider(
            createBaseInput(
              ACTIVE_PROVIDER_CASES[0],
              {
                providerCode:
                  'VISA_ACCEPTANCE',
              },
            ),
          ),
          /PAYMENT_PROVIDER_NOT_CONFIGURED/,
        );

        const requests =
          await adminDb
            .collection(
              'deposit_requests',
            )
            .get();

        assert.equal(
          requests.empty,
          true,
        );
      },
    );

    test(
      'fails closed when the financial account is missing',
      async () => {
        await adminDb
          .collection(
            'financial_accounts',
          )
          .doc(
            TEST_UID,
          )
          .delete();

        await assert.rejects(
          initiateDepositProvider(
            createBaseInput(),
          ),
          /DEPOSIT_ACCOUNT_NOT_FOUND/,
        );
      },
    );

    test(
      'rejects a financial account with a conflicting UID',
      async () => {
        await adminDb
          .collection(
            'financial_accounts',
          )
          .doc(
            TEST_UID,
          )
          .set(
            {
              uid:
                'different-user',
            },
            {
              merge:
                true,
            },
          );

        await assert.rejects(
          initiateDepositProvider(
            createBaseInput(),
          ),
          /DEPOSIT_ACCOUNT_IDENTITY_MISMATCH|DEPOSIT_PROVIDER_ACCOUNT_MISMATCH/,
        );
      },
    );

    test(
      'keeps settlement callback-only after provider initiation',
      async () => {
        for (
          const provider
          of ACTIVE_PROVIDER_CASES
        ) {
          const result =
            await initiateDepositProvider(
              createBaseInput(
                provider,
                {
                  clientOperationId:
                    `callback-only-${provider.providerCode.toLowerCase()}`,
                },
              ),
            );

          const requestSnapshot =
            await adminDb
              .collection(
                'deposit_requests',
              )
              .doc(
                result.deposit
                  .requestId,
              )
              .get();

          const requestData =
            requestSnapshot.data();

          assert.equal(
            requestData?.status,
            'PENDING_PROVIDER_INITIATION',
          );

          assert.equal(
            requestData
              ?.providerOperationStatus,
            'REQUIRES_CUSTOMER_ACTION',
          );

          assert.equal(
            requestData
              ?.settlementStatus,
            'NOT_STARTED',
          );

          assert.equal(
            requestData?.credited,
            false,
          );

          assert.equal(
            'creditedAt'
              in (requestData ?? {}),
            false,
          );

          assert.equal(
            'financialOperationId'
              in (requestData ?? {}),
            false,
          );

          assert.equal(
            'ledgerEntryId'
              in (requestData ?? {}),
            false,
          );
        }
      },
    );

    test(
      'does not create a ledger entry during provider initiation',
      async () => {
        for (
          const provider
          of ACTIVE_PROVIDER_CASES
        ) {
          await initiateDepositProvider(
            createBaseInput(
              provider,
              {
                clientOperationId:
                  `no-ledger-${provider.providerCode.toLowerCase()}`,
              },
            ),
          );
        }

        const ledgerSnapshot =
          await adminDb
            .collection(
              'financial_ledger',
            )
            .get();

        assert.equal(
          ledgerSnapshot.empty,
          true,
        );
      },
    );

    test(
      'does not create a financial operation during provider initiation',
      async () => {
        for (
          const provider
          of ACTIVE_PROVIDER_CASES
        ) {
          await initiateDepositProvider(
            createBaseInput(
              provider,
              {
                clientOperationId:
                  `no-operation-${provider.providerCode.toLowerCase()}`,
              },
            ),
          );
        }

        const operationsSnapshot =
          await adminDb
            .collection(
              'financial_operations',
            )
            .get();

        assert.equal(
          operationsSnapshot.empty,
          true,
        );
      },
    );
  },
);