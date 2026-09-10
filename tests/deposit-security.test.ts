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

const TEST_UID =
  'deposit-security-test-user';

const OTHER_UID =
  'deposit-security-other-user';

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

type DepositSecurityModule =
  typeof import(
    '@/lib/server-deposit-security'
  );

let adminDb:
  Firestore;

let createPendingDepositRequest:
  DepositSecurityModule[
    'createPendingDepositRequest'
  ];

const originalExpirySeconds =
  process.env
    .DEPOSIT_REQUEST_EXPIRY_SECONDS;

function requireFirestoreEmulator():
  void {
  if (
    !process.env
      .FIRESTORE_EMULATOR_HOST
  ) {
    throw new Error(
      'Deposit security tests must run against the Firestore Emulator.',
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

  if (snapshot.empty) {
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
  ]);
}

async function seedFinancialAccount(
  uid = TEST_UID,
): Promise<void> {
  await adminDb
    .collection(
      'financial_accounts',
    )
    .doc(uid)
    .set({
      uid,

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

function createBaseRequest() {
  return {
    uid:
      TEST_UID,

    clientOperationId:
      'deposit-test-operation-001',

    asset:
      'TZS' as const,

    rail:
      'MOBILE_MONEY' as const,

    providerCode:
      'MPESA',

    amountAtomic:
      '100000',
  };
}

before(
  async () => {
    requireFirestoreEmulator();

    process.env
      .DEPOSIT_REQUEST_EXPIRY_SECONDS =
      '1800';

    const firebaseAdminModule =
      await import(
        '@/lib/firebase-admin'
      );

    const depositSecurityModule =
      await import(
        '@/lib/server-deposit-security'
      );

    adminDb =
      firebaseAdminModule.adminDb;

    createPendingDepositRequest =
      depositSecurityModule
        .createPendingDepositRequest;
  },
);

beforeEach(
  async () => {
    process.env
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
      originalExpirySeconds ===
      undefined
    ) {
      delete process.env
        .DEPOSIT_REQUEST_EXPIRY_SECONDS;
    } else {
      process.env
        .DEPOSIT_REQUEST_EXPIRY_SECONDS =
        originalExpirySeconds;
    }
  },
);

describe(
  'PHCL deposit security',
  {
    concurrency:
      false,
  },
  () => {
    test(
      'creates a pending provider initiation without crediting the account',
      async () => {
        const accountBefore =
          await adminDb
            .collection(
              'financial_accounts',
            )
            .doc(
              TEST_UID,
            )
            .get();

        const balancesBefore =
          accountBefore.data()
            ?.balancesAtomic;

        const result =
          await createPendingDepositRequest(
            createBaseRequest(),
            TEST_NOW,
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
          result.status,
          'PENDING_PROVIDER_INITIATION',
        );

        assert.equal(
          result.expiresAtMs,
          TEST_NOW +
            1_800_000,
        );

        const accountAfter =
          await adminDb
            .collection(
              'financial_accounts',
            )
            .doc(
              TEST_UID,
            )
            .get();

        assert.deepEqual(
          accountAfter.data()
            ?.balancesAtomic,
          balancesBefore,
        );

        const requestSnapshot =
          await adminDb
            .collection(
              'deposit_requests',
            )
            .doc(
              result.requestId,
            )
            .get();

        assert.equal(
          requestSnapshot.exists,
          true,
        );

        const requestData =
          requestSnapshot.data();

        assert.equal(
          requestData?.status,
          'PENDING_PROVIDER_INITIATION',
        );

        assert.equal(
          requestData
            ?.providerStatus,
          'NOT_STARTED',
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
          'paymentInstructions'
            in (requestData ?? {}),
          false,
        );

        assert.equal(
          'walletAddress'
            in (requestData ?? {}),
          false,
        );
      },
    );

    test(
      'returns the same request for an identical retry',
      async () => {
        const input =
          createBaseRequest();

        const firstResult =
          await createPendingDepositRequest(
            input,
            TEST_NOW,
          );

        const secondResult =
          await createPendingDepositRequest(
            input,
            TEST_NOW +
              5_000,
          );

        assert.equal(
          firstResult.idempotent,
          false,
        );

        assert.equal(
          secondResult.idempotent,
          true,
        );

        assert.equal(
          secondResult.requestId,
          firstResult.requestId,
        );

        assert.equal(
          secondResult.expiresAtMs,
          firstResult.expiresAtMs,
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
      'rejects reuse of an operation ID with a different amount',
      async () => {
        const input =
          createBaseRequest();

        await createPendingDepositRequest(
          input,
          TEST_NOW,
        );

        await assert.rejects(
          createPendingDepositRequest(
            {
              ...input,

              amountAtomic:
                '200000',
            },
            TEST_NOW +
              1_000,
          ),
          {
            message:
              'DEPOSIT_OPERATION_CONFLICT',
          },
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
      'fails closed when the financial account does not exist',
      async () => {
        await assert.rejects(
          createPendingDepositRequest(
            {
              ...createBaseRequest(),

              uid:
                OTHER_UID,

              clientOperationId:
                'deposit-missing-account',
            },
            TEST_NOW,
          ),
          {
            message:
              'DEPOSIT_ACCOUNT_NOT_FOUND',
          },
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
      'rejects an account document whose UID conflicts with its document ID',
      async () => {
        await adminDb
          .collection(
            'financial_accounts',
          )
          .doc(
            TEST_UID,
          )
          .set({
            uid:
              OTHER_UID,

            balancesAtomic: {
              ...DEFAULT_BALANCES,
            },
          });

        await assert.rejects(
          createPendingDepositRequest(
            createBaseRequest(),
            TEST_NOW,
          ),
          {
            message:
              'DEPOSIT_ACCOUNT_IDENTITY_MISMATCH',
          },
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
      'accepts supported TZS bank deposit route',
      async () => {
        const depositRequest =
          await createPendingDepositRequest(
            {
              ...createBaseRequest(),

              clientOperationId:
                'deposit-tzs-bank',

              rail:
                'BANK',

              providerCode:
                'CRDB',
            },
            TEST_NOW,
          );

        assert.equal(
          depositRequest.asset,
          'TZS',
        );

        assert.equal(
          depositRequest.rail,
          'BANK',
        );
      },
    );

    test(
      'accepts supported USD bank deposit route',
      async () => {
        const depositRequest =
          await createPendingDepositRequest(
            {
              ...createBaseRequest(),

              clientOperationId:
                'deposit-usd-bank',

              asset:
                'USD',

              rail:
                'BANK',

              providerCode:
                'OTHER_BANK',

              amountAtomic:
                '1000',
            },
            TEST_NOW,
          );

        assert.equal(
          depositRequest.asset,
          'USD',
        );

        assert.equal(
          depositRequest.rail,
          'BANK',
        );
      },
    );

    test(
      'accepts supported Pi blockchain deposit route',
      async () => {
        const depositRequest =
          await createPendingDepositRequest(
            {
              ...createBaseRequest(),

              clientOperationId:
                'deposit-pi-blockchain',

              asset:
                'PI',

              rail:
                'BLOCKCHAIN',

              providerCode:
                'PI_NETWORK',

              amountAtomic:
                '1000000',
            },
            TEST_NOW,
          );

        assert.equal(
          depositRequest.asset,
          'PI',
        );

        assert.equal(
          depositRequest.rail,
          'BLOCKCHAIN',
        );
      },
    );


        test(
      'accepts supported USD Visa Acceptance card deposit route',
      async () => {
        const accountBefore =
          await adminDb
            .collection(
              'financial_accounts',
            )
            .doc(
              TEST_UID,
            )
            .get();

        const balancesBefore =
          accountBefore.data()
            ?.balancesAtomic;

        const result =
          await createPendingDepositRequest(
            {
              ...createBaseRequest(),

              clientOperationId:
                'deposit-usd-visa-card',

              asset:
                'USD',

              rail:
                'CARD',

              providerCode:
                'VISA_ACCEPTANCE',

              amountAtomic:
                '2599',
            },
            TEST_NOW,
          );

        assert.equal(
          result.asset,
          'USD',
        );

        assert.equal(
          result.rail,
          'CARD',
        );

        assert.equal(
          result.providerCode,
          'VISA_ACCEPTANCE',
        );

        assert.equal(
          result.amountAtomic,
          '2599',
        );

        assert.equal(
          result.status,
          'PENDING_PROVIDER_INITIATION',
        );

        assert.equal(
          result.idempotent,
          false,
        );

        const requestSnapshot =
          await adminDb
            .collection(
              'deposit_requests',
            )
            .doc(
              result.requestId,
            )
            .get();

        const requestData =
          requestSnapshot.data();

        assert.equal(
          requestData?.credited,
          false,
        );

        assert.equal(
          requestData
            ?.providerStatus,
          'NOT_STARTED',
        );

        assert.equal(
          requestData
            ?.settlementStatus,
          'NOT_STARTED',
        );

        /*
         * Card data and the transient payment token must
         * never be stored by the deposit security layer.
         */
        const serializedRequest =
          JSON.stringify(
            requestData,
          );

        assert.equal(
          /paymentToken|transientTokenJwt|cardNumber|securityCode|cvv|pan/i.test(
            serializedRequest,
          ),
          false,
        );

        const accountAfter =
          await adminDb
            .collection(
              'financial_accounts',
            )
            .doc(
              TEST_UID,
            )
            .get();

        assert.deepEqual(
          accountAfter.data()
            ?.balancesAtomic,
          balancesBefore,
        );
      },
    );

    test(
      'rejects unsupported Visa Acceptance asset and rail combinations',
      async () => {
        const unsupportedRequests = [
          {
            clientOperationId:
              'deposit-visa-tzs-card',

            asset:
              'TZS' as const,

            rail:
              'CARD' as const,
          },
          {
            clientOperationId:
              'deposit-visa-pi-card',

            asset:
              'PI' as const,

            rail:
              'CARD' as const,
          },
          {
            clientOperationId:
              'deposit-visa-usd-mobile',

            asset:
              'USD' as const,

            rail:
              'MOBILE_MONEY' as const,
          },
          {
            clientOperationId:
              'deposit-visa-usd-wallet',

            asset:
              'USD' as const,

            rail:
              'DIGITAL_WALLET' as const,
          },
          {
            clientOperationId:
              'deposit-visa-usd-bank',

            asset:
              'USD' as const,

            rail:
              'BANK' as const,
          },
        ];

        for (
          const unsupported
          of unsupportedRequests
        ) {
          await assert.rejects(
            createPendingDepositRequest(
              {
                ...createBaseRequest(),

                ...unsupported,

                providerCode:
                  'VISA_ACCEPTANCE',

                amountAtomic:
                  '2599',
              },
              TEST_NOW,
            ),
            {
              message:
                'DEPOSIT_ROUTE_NOT_SUPPORTED',
            },
          );
        }

        const rejectedRequests =
          await adminDb
            .collection(
              'deposit_requests',
            )
            .where(
              'providerCode',
              '==',
              'VISA_ACCEPTANCE',
            )
            .get();

        assert.equal(
          rejectedRequests.empty,
          true,
        );
      },
    );

    test(
      'accepts supported USD PayPal digital-wallet deposit route',
      async () => {
        const accountBefore =
          await adminDb
            .collection(
              'financial_accounts',
            )
            .doc(
              TEST_UID,
            )
            .get();

        const balancesBefore =
          accountBefore.data()
            ?.balancesAtomic;

        const result =
          await createPendingDepositRequest(
            {
              ...createBaseRequest(),

              clientOperationId:
                'deposit-usd-paypal-digital-wallet',

              asset:
                'USD',

              rail:
                'DIGITAL_WALLET',

              providerCode:
                'PAYPAL',

              amountAtomic:
                '1025',
            },
            TEST_NOW,
          );

        assert.equal(
          result.asset,
          'USD',
        );

        assert.equal(
          result.rail,
          'DIGITAL_WALLET',
        );

        assert.equal(
          result.providerCode,
          'PAYPAL',
        );

        assert.equal(
          result.amountAtomic,
          '1025',
        );

        assert.equal(
          result.status,
          'PENDING_PROVIDER_INITIATION',
        );

        assert.equal(
          result.idempotent,
          false,
        );

        const requestSnapshot =
          await adminDb
            .collection(
              'deposit_requests',
            )
            .doc(
              result.requestId,
            )
            .get();

        const requestData =
          requestSnapshot.data();

        assert.equal(
          requestData?.credited,
          false,
        );

        assert.equal(
          requestData
            ?.settlementStatus,
          'NOT_STARTED',
        );

        const accountAfter =
          await adminDb
            .collection(
              'financial_accounts',
            )
            .doc(
              TEST_UID,
            )
            .get();

        assert.deepEqual(
          accountAfter.data()
            ?.balancesAtomic,
          balancesBefore,
        );
      },
    );

    test(
      'rejects unsupported PayPal asset and rail combinations',
      async () => {
        const unsupportedRequests = [
          {
            clientOperationId:
              'deposit-paypal-tzs-wallet',

            asset:
              'TZS' as const,

            rail:
              'DIGITAL_WALLET' as const,
          },
          {
            clientOperationId:
              'deposit-paypal-pi-wallet',

            asset:
              'PI' as const,

            rail:
              'DIGITAL_WALLET' as const,
          },
          {
            clientOperationId:
              'deposit-paypal-usd-mobile',

            asset:
              'USD' as const,

            rail:
              'MOBILE_MONEY' as const,
          },
          {
            clientOperationId:
              'deposit-paypal-usd-bank',

            asset:
              'USD' as const,

            rail:
              'BANK' as const,
          },
        ];

        for (
          const unsupported
          of unsupportedRequests
        ) {
          await assert.rejects(
            createPendingDepositRequest(
              {
                ...createBaseRequest(),

                ...unsupported,

                providerCode:
                  'PAYPAL',

                amountAtomic:
                  '1000',
              },
              TEST_NOW,
            ),
            {
              message:
                'DEPOSIT_ROUTE_NOT_SUPPORTED',
            },
          );
        }

        const rejectedRequests =
          await adminDb
            .collection(
              'deposit_requests',
            )
            .where(
              'providerCode',
              '==',
              'PAYPAL',
            )
            .get();

        assert.equal(
          rejectedRequests.empty,
          true,
        );
      },
    );

    test(
      'rejects unsupported asset, rail and provider combinations',
      async () => {
        await assert.rejects(
          createPendingDepositRequest(
            {
              ...createBaseRequest(),

              clientOperationId:
                'deposit-usd-blockchain',

              asset:
                'USD',

              rail:
                'BLOCKCHAIN',

              providerCode:
                'PI_NETWORK',
            },
            TEST_NOW,
          ),
          {
            message:
              'DEPOSIT_ROUTE_NOT_SUPPORTED',
          },
        );

        await assert.rejects(
          createPendingDepositRequest(
            {
              ...createBaseRequest(),

              clientOperationId:
                'deposit-ntzs-bank',

              asset:
                'NTZS',

              rail:
                'BANK',

              providerCode:
                'CRDB',
            },
            TEST_NOW,
          ),
          {
            message:
              'DEPOSIT_ROUTE_NOT_SUPPORTED',
          },
        );

        await assert.rejects(
          createPendingDepositRequest(
            {
              ...createBaseRequest(),

              clientOperationId:
                'deposit-unknown-provider',

              providerCode:
                'UNKNOWN_PROVIDER',
            },
            TEST_NOW,
          ),
          {
            message:
              'DEPOSIT_ROUTE_NOT_SUPPORTED',
          },
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
      'rejects invalid deposit amounts',
      async () => {
        const invalidAmounts = [
          '0',
          '-1',
          '1.5',
          '01',
          '',
          'not-a-number',
        ];

        for (
          const amountAtomic
          of invalidAmounts
        ) {
          await assert.rejects(
            createPendingDepositRequest(
              {
                ...createBaseRequest(),

                clientOperationId:
                  `invalid-deposit-${amountAtomic || 'empty'}`,

                amountAtomic,
              },
              TEST_NOW,
            ),
            {
              message:
                'INVALID_DEPOSIT_AMOUNT',
            },
          );
        }

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
      'rejects invalid operation identifiers',
      async () => {
        await assert.rejects(
          createPendingDepositRequest(
            {
              ...createBaseRequest(),

              clientOperationId:
                'invalid operation/id',
            },
            TEST_NOW,
          ),
          {
            message:
              'INVALID_DEPOSIT_OPERATION_ID',
          },
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
      'never stores a Firebase UID as a payment destination',
      async () => {
        const result =
          await createPendingDepositRequest(
            createBaseRequest(),
            TEST_NOW,
          );

        const requestSnapshot =
          await adminDb
            .collection(
              'deposit_requests',
            )
            .doc(
              result.requestId,
            )
            .get();

        const serializedData =
          JSON.stringify(
            requestSnapshot.data(),
          );

        assert.equal(
          serializedData.includes(
            'walletAddress',
          ),
          false,
        );

        assert.equal(
          serializedData.includes(
            'paymentDestination',
          ),
          false,
        );

        assert.equal(
          serializedData.includes(
            'paymentInstructions',
          ),
          false,
        );
      },
    );
  },
);
