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

import {
  createVisaTestPaymentToken,
  createVisaTestPrivateKey,
  VISA_TEST_CERTIFICATE,
  VISA_TEST_MERCHANT_ID,
  VISA_TEST_WEBHOOK_KEY_ID,
  VISA_TEST_WEBHOOK_SECRET,
} from './fixtures/visa-acceptance-test-credentials';

const TEST_UID =
  'visa-deposit-provider-test-user';

const TEST_NOW =
  2_100_000_000_000;

const TEST_PROVIDER_TRANSACTION_ID =
  'visa_provider_transaction_001';

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

const ENVIRONMENT_VARIABLES = [
  'PAYMENT_PROVIDER_ENVIRONMENT',
  'DEPOSIT_REQUEST_EXPIRY_SECONDS',
  'VISA_ACCEPTANCE_SANDBOX_MERCHANT_ID',
  'VISA_ACCEPTANCE_SANDBOX_JWT_CERTIFICATE',
  'VISA_ACCEPTANCE_SANDBOX_JWT_PRIVATE_KEY',
  'VISA_ACCEPTANCE_SANDBOX_WEBHOOK_KEY_ID',
  'VISA_ACCEPTANCE_SANDBOX_WEBHOOK_SECRET',
  'VISA_ACCEPTANCE_SANDBOX_CALLBACK_MAX_AGE_SECONDS',
  'VISA_ACCEPTANCE_SANDBOX_PAYMENT_TOKEN_MAX_AGE_SECONDS',
] as const;

type DepositProviderModule =
  typeof import(
    '@/lib/server-deposit-provider-initiation'
  );

const originalEnvironment =
  new Map<
    string,
    string | undefined
  >();

const originalFetch =
  globalThis.fetch;

let adminDb:
  Firestore;

let initiateDepositProvider:
  DepositProviderModule[
    'initiateDepositProvider'
  ];

function requireFirestoreEmulator():
  void {
  if (
    !process.env
      .FIRESTORE_EMULATOR_HOST
  ) {
    throw new Error(
      'Visa deposit provider tests must run against the Firestore Emulator.',
    );
  }
}

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

function restoreEnvironment():
  void {
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

function createInput(
  paymentToken:
    string,
): InitiateDepositProviderInput {
  return {
    uid:
      TEST_UID,

    clientOperationId:
      'visa-deposit-provider-operation-001',

    asset:
      'USD',

    rail:
      'CARD',

    providerCode:
      'VISA_ACCEPTANCE',

    amountAtomic:
      '1025',

    payer: {
      type:
        'PAYMENT_TOKEN',

      value:
        paymentToken,
    },
  };
}

function readClientReferenceCode(
  init:
    RequestInit | undefined,
): string {
  if (
    typeof init?.body !==
      'string'
  ) {
    throw new Error(
      'Expected Visa request body.',
    );
  }

  const body =
    JSON.parse(
      init.body,
    ) as {
      clientReferenceInformation?: {
        code?:
          unknown;
      };
    };

  const code =
    body
      .clientReferenceInformation
      ?.code;

  if (
    typeof code !==
      'string' ||
    !code
  ) {
    throw new Error(
      'Expected Visa client reference code.',
    );
  }

  return code;
}

before(
  async () => {
    requireFirestoreEmulator();

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
      'PAYMENT_PROVIDER_ENVIRONMENT',
      'SANDBOX',
    );

    setEnvironmentVariable(
      'DEPOSIT_REQUEST_EXPIRY_SECONDS',
      '1800',
    );

    setEnvironmentVariable(
      'VISA_ACCEPTANCE_SANDBOX_MERCHANT_ID',
      VISA_TEST_MERCHANT_ID,
    );

    setEnvironmentVariable(
      'VISA_ACCEPTANCE_SANDBOX_JWT_CERTIFICATE',
      VISA_TEST_CERTIFICATE,
    );

    setEnvironmentVariable(
      'VISA_ACCEPTANCE_SANDBOX_JWT_PRIVATE_KEY',
      createVisaTestPrivateKey(),
    );

    setEnvironmentVariable(
      'VISA_ACCEPTANCE_SANDBOX_WEBHOOK_KEY_ID',
      VISA_TEST_WEBHOOK_KEY_ID,
    );

    setEnvironmentVariable(
      'VISA_ACCEPTANCE_SANDBOX_WEBHOOK_SECRET',
      VISA_TEST_WEBHOOK_SECRET,
    );

    setEnvironmentVariable(
      'VISA_ACCEPTANCE_SANDBOX_CALLBACK_MAX_AGE_SECONDS',
      '300',
    );

    setEnvironmentVariable(
      'VISA_ACCEPTANCE_SANDBOX_PAYMENT_TOKEN_MAX_AGE_SECONDS',
      '900',
    );

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
    await clearTestData();

    await seedFinancialAccount();

    globalThis.fetch =
      originalFetch;
  },
);

after(
  async () => {
    globalThis.fetch =
      originalFetch;

    await clearTestData();

    restoreEnvironment();
  },
);

describe(
  'PHCL Visa deposit provider initiation',
  {
    concurrency:
      false,
  },
  () => {
    test(
      'initiates a tokenized Visa payment without crediting or exposing sensitive payment data',
      async () => {
        const paymentToken =
          createVisaTestPaymentToken({
            tokenId:
              'visa_initiation_transient_token',
          });

        const fetchedUrls:
          string[] = [];

        const transmittedBodies:
          string[] = [];

        globalThis.fetch =
          async (
            input:
              string | URL | Request,

            init?:
              RequestInit,
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
              typeof init?.body ===
                'string'
            ) {
              transmittedBodies.push(
                init.body,
              );
            }

            const requestId =
              readClientReferenceCode(
                init,
              );

            return new Response(
              JSON.stringify({
                id:
                  TEST_PROVIDER_TRANSACTION_ID,

                status:
                  'AUTHORIZED',

                clientReferenceInformation: {
                  code:
                    requestId,
                },

                submitTimeUtc:
                  '2026-09-10T10:00:00.000Z',
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
          };

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

        const input =
          createInput(
            paymentToken,
          );

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
          'CARD',
        );

        assert.equal(
          first.deposit
            .providerCode,
          'VISA_ACCEPTANCE',
        );

        assert.equal(
          first.deposit.status,
          'PENDING_PROVIDER_INITIATION',
        );

        assert.equal(
          first.provider
            .providerCode,
          'VISA_ACCEPTANCE',
        );

        assert.equal(
          first.provider
            .environment,
          'SANDBOX',
        );

        assert.equal(
          first.provider
            .providerRequestId,
          TEST_PROVIDER_TRANSACTION_ID,
        );

        assert.equal(
          first.provider
            .providerTransactionId,
          TEST_PROVIDER_TRANSACTION_ID,
        );

        assert.equal(
          first.provider.status,
          'PENDING',
        );

        assert.equal(
          first.provider
            .customerAction,
          null,
        );

        assert.equal(
          JSON.stringify(
            first,
          ).includes(
            paymentToken,
          ),
          false,
        );

        assert.deepEqual(
          fetchedUrls,
          [
            'https://apitest.visaacceptance.com/pts/v2/payments',
          ],
        );

        assert.equal(
          transmittedBodies.length,
          1,
        );

        assert.equal(
          transmittedBodies[0]
            .includes(
              paymentToken,
            ),
          true,
        );

        assert.equal(
          /cardNumber|securityCode|cvv|pan/i.test(
            transmittedBodies[0],
          ),
          false,
        );

        const requestSnapshot =
          await adminDb
            .collection(
              'deposit_requests',
            )
            .doc(
              first.deposit
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
          'VISA_ACCEPTANCE',
        );

        assert.equal(
          requestData
            ?.providerInitiationStatus,
          'INITIATED',
        );

        assert.equal(
          requestData
            ?.providerOperationStatus,
          'PENDING',
        );

        assert.equal(
          requestData
            ?.providerRequestId,
          TEST_PROVIDER_TRANSACTION_ID,
        );

        assert.equal(
          requestData
            ?.providerTransactionId,
          TEST_PROVIDER_TRANSACTION_ID,
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
            paymentToken,
          ),
          false,
        );

        assert.equal(
          /cardNumber|securityCode|cvv|pan/i.test(
            serializedRequest,
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

        assert.equal(
          fetchedUrls.length,
          2,
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
      },
    );
  },
);