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
  'withdrawal-security-test-user';

const OTHER_UID =
  'withdrawal-security-other-user';

const TEST_ENCRYPTION_KEY =
  Buffer.from(
    'PHCL-withdrawal-test-key-32byte!',
    'utf8',
  ).toString(
    'base64url',
  );

const TEST_NOW =
  2_000_000_000_000;

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

type WithdrawalSecurityModule =
  typeof import(
    '@/lib/server-withdrawal-security'
  );

let adminDb:
  Firestore;

let createPendingWithdrawalRequest:
  WithdrawalSecurityModule[
    'createPendingWithdrawalRequest'
  ];

const originalEncryptionKey =
  process.env
    .WITHDRAWAL_DATA_ENCRYPTION_KEY;

const originalExpirySeconds =
  process.env
    .WITHDRAWAL_REQUEST_EXPIRY_SECONDS;

function requireFirestoreEmulator():
  void {
  if (
    !process.env
      .FIRESTORE_EMULATOR_HOST
  ) {
    throw new Error(
      'Withdrawal security tests must run against the Firestore Emulator.',
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

  const batches:
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
      batches.push(
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
    batches.push(
      batch.commit(),
    );
  }

  await Promise.all(
    batches,
  );
}

async function clearTestData():
  Promise<void> {
  await Promise.all([
    deleteCollection(
      'withdrawal_requests',
    ),

    deleteCollection(
      'financial_accounts',
    ),
  ]);
}

async function seedFinancialAccount(
  uid = TEST_UID,
  balancesAtomic = DEFAULT_BALANCES,
): Promise<void> {
  await adminDb
    .collection(
      'financial_accounts',
    )
    .doc(uid)
    .set({
      uid,

      balancesAtomic: {
        ...balancesAtomic,
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
      'withdrawal-test-operation-001',

    asset:
      'TZS' as const,

    rail:
      'MOBILE_MONEY' as const,

    providerCode:
      'MPESA',

    destination:
      '+255700123456',

    amountAtomic:
      '100000',
  };
}

before(
  async () => {
    requireFirestoreEmulator();

    process.env
      .WITHDRAWAL_DATA_ENCRYPTION_KEY =
      TEST_ENCRYPTION_KEY;

    process.env
      .WITHDRAWAL_REQUEST_EXPIRY_SECONDS =
      '3600';

    const firebaseAdminModule =
      await import(
        '@/lib/firebase-admin'
      );

    const withdrawalSecurityModule =
      await import(
        '@/lib/server-withdrawal-security'
      );

    adminDb =
      firebaseAdminModule.adminDb;

    createPendingWithdrawalRequest =
      withdrawalSecurityModule
        .createPendingWithdrawalRequest;
  },
);

beforeEach(
  async () => {
    process.env
      .WITHDRAWAL_DATA_ENCRYPTION_KEY =
      TEST_ENCRYPTION_KEY;

    process.env
      .WITHDRAWAL_REQUEST_EXPIRY_SECONDS =
      '3600';

    await clearTestData();

    await seedFinancialAccount();
  },
);

after(
  async () => {
    await clearTestData();

    if (
      originalEncryptionKey ===
      undefined
    ) {
      delete process.env
        .WITHDRAWAL_DATA_ENCRYPTION_KEY;
    } else {
      process.env
        .WITHDRAWAL_DATA_ENCRYPTION_KEY =
        originalEncryptionKey;
    }

    if (
      originalExpirySeconds ===
      undefined
    ) {
      delete process.env
        .WITHDRAWAL_REQUEST_EXPIRY_SECONDS;
    } else {
      process.env
        .WITHDRAWAL_REQUEST_EXPIRY_SECONDS =
        originalExpirySeconds;
    }
  },
);

describe(
  'PHCL withdrawal security',
  {
    concurrency:
      false,
  },
  () => {
    test(
      'creates a pending withdrawal request without debiting the account',
      async () => {
        const input =
          createBaseRequest();

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
          await createPendingWithdrawalRequest(
            input,
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
          'PENDING_REVIEW',
        );

        assert.equal(
          result.asset,
          'TZS',
        );

        assert.equal(
          result.rail,
          'MOBILE_MONEY',
        );

        assert.equal(
          result.providerCode,
          'MPESA',
        );

        assert.equal(
          result.amountAtomic,
          '100000',
        );

        assert.equal(
          result.destinationMasked,
          '••••3456',
        );

        assert.equal(
          result.expiresAtMs,
          TEST_NOW +
            3_600_000,
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
              'withdrawal_requests',
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
          'PENDING_REVIEW',
        );

        assert.equal(
          requestData
            ?.settlementStatus,
          'NOT_STARTED',
        );

        assert.equal(
          requestData
            ?.checkedBalanceAtomic,
          DEFAULT_BALANCES.tzs,
        );

        assert.equal(
          requestData
            ?.amountAtomic,
          '100000',
        );
      },
    );

    test(
      'encrypts the destination and never stores its plaintext value',
      async () => {
        const input =
          createBaseRequest();

        const result =
          await createPendingWithdrawalRequest(
            input,
            TEST_NOW,
          );

        const requestSnapshot =
          await adminDb
            .collection(
              'withdrawal_requests',
            )
            .doc(
              result.requestId,
            )
            .get();

        const requestData =
          requestSnapshot.data();

        assert.ok(
          requestData,
        );

        const serializedData =
          JSON.stringify(
            requestData,
          );

        assert.equal(
          serializedData.includes(
            input.destination,
          ),
          false,
        );

        assert.equal(
          serializedData.includes(
            '+255700123456',
          ),
          false,
        );

        assert.equal(
          requestData
            ?.destinationMasked,
          '••••3456',
        );

        assert.equal(
          typeof requestData
            ?.destinationFingerprint,
          'string',
        );

        assert.equal(
          requestData
            ?.destinationFingerprint
            .length,
          64,
        );

        const encryptedDestination =
          requestData
            ?.encryptedDestination;

        assert.equal(
          encryptedDestination
            ?.algorithm,
          'aes-256-gcm',
        );

        assert.equal(
          encryptedDestination
            ?.version,
          1,
        );

        assert.equal(
          typeof encryptedDestination
            ?.initializationVector,
          'string',
        );

        assert.equal(
          typeof encryptedDestination
            ?.ciphertext,
          'string',
        );

        assert.equal(
          typeof encryptedDestination
            ?.authenticationTag,
          'string',
        );

        assert.notEqual(
          encryptedDestination
            ?.ciphertext,
          input.destination,
        );
      },
    );

    test(
      'returns the existing request for an identical retry',
      async () => {
        const input =
          createBaseRequest();

        const firstResult =
          await createPendingWithdrawalRequest(
            input,
            TEST_NOW,
          );

        const secondResult =
          await createPendingWithdrawalRequest(
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

        const snapshot =
          await adminDb
            .collection(
              'withdrawal_requests',
            )
            .where(
              'uid',
              '==',
              TEST_UID,
            )
            .get();

        assert.equal(
          snapshot.size,
          1,
        );
      },
    );

    test(
      'rejects reuse of an operation ID with a different payload',
      async () => {
        const input =
          createBaseRequest();

        await createPendingWithdrawalRequest(
          input,
          TEST_NOW,
        );

        await assert.rejects(
          createPendingWithdrawalRequest(
            {
              ...input,

              destination:
                '+255700999999',
            },
            TEST_NOW +
              1_000,
          ),
          {
            message:
              'WITHDRAWAL_OPERATION_CONFLICT',
          },
        );

        const snapshot =
          await adminDb
            .collection(
              'withdrawal_requests',
            )
            .get();

        assert.equal(
          snapshot.size,
          1,
        );
      },
    );

    test(
      'rejects a withdrawal when the authoritative balance is insufficient',
      async () => {
        const input =
          createBaseRequest();

        await assert.rejects(
          createPendingWithdrawalRequest(
            {
              ...input,

              amountAtomic:
                '500000001',
            },
            TEST_NOW,
          ),
          {
            message:
              'INSUFFICIENT_FUNDS',
          },
        );

        const requests =
          await adminDb
            .collection(
              'withdrawal_requests',
            )
            .get();

        assert.equal(
          requests.empty,
          true,
        );

        const account =
          await adminDb
            .collection(
              'financial_accounts',
            )
            .doc(
              TEST_UID,
            )
            .get();

        assert.deepEqual(
          account.data()
            ?.balancesAtomic,
          DEFAULT_BALANCES,
        );
      },
    );

    test(
      'fails closed when the financial account does not exist',
      async () => {
        const input =
          createBaseRequest();

        await assert.rejects(
          createPendingWithdrawalRequest(
            {
              ...input,

              uid:
                OTHER_UID,

              clientOperationId:
                'withdrawal-missing-account',
            },
            TEST_NOW,
          ),
          {
            message:
              'INSUFFICIENT_FUNDS',
          },
        );

        const requests =
          await adminDb
            .collection(
              'withdrawal_requests',
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
          createPendingWithdrawalRequest(
            createBaseRequest(),
            TEST_NOW,
          ),
          {
            message:
              'WITHDRAWAL_ACCOUNT_IDENTITY_MISMATCH',
          },
        );

        const requests =
          await adminDb
            .collection(
              'withdrawal_requests',
            )
            .get();

        assert.equal(
          requests.empty,
          true,
        );
      },
    );

    test(
      'accepts supported TZS bank withdrawal route',
      async () => {
        const result =
          await createPendingWithdrawalRequest(
            {
              ...createBaseRequest(),

              clientOperationId:
                'withdrawal-tzs-bank',

              rail:
                'BANK',

              providerCode:
                'CRDB',

              destination:
                '0123456789012',
            },
            TEST_NOW,
          );

        assert.equal(
          result.asset,
          'TZS',
        );

        assert.equal(
          result.rail,
          'BANK',
        );

        assert.equal(
          result.status,
          'PENDING_REVIEW',
        );
      },
    );

    test(
      'accepts supported USD bank withdrawal route',
      async () => {
        const result =
          await createPendingWithdrawalRequest(
            {
              ...createBaseRequest(),

              clientOperationId:
                'withdrawal-usd-bank',

              asset:
                'USD',

              rail:
                'BANK',

              providerCode:
                'OTHER_BANK',

              destination:
                'US-ACCOUNT-123456',

              amountAtomic:
                '1000',
            },
            TEST_NOW,
          );

        assert.equal(
          result.asset,
          'USD',
        );

        assert.equal(
          result.rail,
          'BANK',
        );

        assert.equal(
          result.status,
          'PENDING_REVIEW',
        );
      },
    );

    test(
      'accepts supported Pi blockchain withdrawal route',
      async () => {
        const result =
          await createPendingWithdrawalRequest(
            {
              ...createBaseRequest(),

              clientOperationId:
                'withdrawal-pi-blockchain',

              asset:
                'PI',

              rail:
                'BLOCKCHAIN',

              providerCode:
                'PI_NETWORK',

              destination:
                'GBRPYHIL2CI3KEXAMPLEPHCLWALLET',

              amountAtomic:
                '1000000',
            },
            TEST_NOW,
          );

        assert.equal(
          result.asset,
          'PI',
        );

        assert.equal(
          result.rail,
          'BLOCKCHAIN',
        );

        assert.equal(
          result.status,
          'PENDING_REVIEW',
        );
      },
    );

    test(
      'rejects unsupported asset and rail combinations',
      async () => {
        await assert.rejects(
          createPendingWithdrawalRequest(
            {
              ...createBaseRequest(),

              clientOperationId:
                'withdrawal-unsupported-route',

              asset:
                'USD',

              rail:
                'BLOCKCHAIN',
            },
            TEST_NOW,
          ),
          {
            message:
              'WITHDRAWAL_ROUTE_NOT_SUPPORTED',
          },
        );

        await assert.rejects(
          createPendingWithdrawalRequest(
            {
              ...createBaseRequest(),

              clientOperationId:
                'withdrawal-ntzs-route',

              asset:
                'NTZS',

              rail:
                'BANK',
            },
            TEST_NOW,
          ),
          {
            message:
              'WITHDRAWAL_ROUTE_NOT_SUPPORTED',
          },
        );

        const requests =
          await adminDb
            .collection(
              'withdrawal_requests',
            )
            .get();

        assert.equal(
          requests.empty,
          true,
        );
      },
    );

    test(
      'rejects invalid withdrawal amounts',
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
            createPendingWithdrawalRequest(
              {
                ...createBaseRequest(),

                clientOperationId:
                  `invalid-amount-${amountAtomic || 'empty'}`,

                amountAtomic,
              },
              TEST_NOW,
            ),
            {
              message:
                'INVALID_WITHDRAWAL_AMOUNT',
            },
          );
        }

        const requests =
          await adminDb
            .collection(
              'withdrawal_requests',
            )
            .get();

        assert.equal(
          requests.empty,
          true,
        );
      },
    );

    test(
      'fails closed when the encryption key is missing',
      async () => {
        delete process.env
          .WITHDRAWAL_DATA_ENCRYPTION_KEY;

        await assert.rejects(
          createPendingWithdrawalRequest(
            createBaseRequest(),
            TEST_NOW,
          ),
          {
            message:
              'WITHDRAWAL_ENCRYPTION_KEY_NOT_CONFIGURED',
          },
        );

        const requests =
          await adminDb
            .collection(
              'withdrawal_requests',
            )
            .get();

        assert.equal(
          requests.empty,
          true,
        );
      },
    );

    test(
      'fails closed when the encryption key is not exactly 32 bytes',
      async () => {
        process.env
          .WITHDRAWAL_DATA_ENCRYPTION_KEY =
          Buffer.from(
            'short-test-key',
            'utf8',
          ).toString(
            'base64url',
          );

        await assert.rejects(
          createPendingWithdrawalRequest(
            createBaseRequest(),
            TEST_NOW,
          ),
          {
            message:
              'WITHDRAWAL_ENCRYPTION_KEY_INVALID',
          },
        );

        const requests =
          await adminDb
            .collection(
              'withdrawal_requests',
            )
            .get();

        assert.equal(
          requests.empty,
          true,
        );
      },
    );
  },
);