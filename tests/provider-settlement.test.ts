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
  Firestore,
} from 'firebase-admin/firestore';

const TEST_UID =
  'provider-settlement-test-user';

const TEST_NOW =
  2_100_000_000_000;

const TEST_TIMESTAMP_SECONDS =
  Math.floor(
    TEST_NOW / 1000,
  );

const TEST_PROVIDER_CODE =
  'MPESA';

const TEST_CALLBACK_SECRET =
  'provider-settlement-test-secret-0123456789';

const INITIAL_BALANCES = {
  usd:
    '500000',

  tzs:
    '2000000',

  ntzs:
    '100000000',

  pi:
    '250000000',
};

type SettlementModule =
  typeof import(
    '@/lib/server-financial-settlement'
  );

type CallbackSecurityModule =
  typeof import(
    '@/lib/server-provider-callback-security'
  );

let adminDb:
  Firestore;

let processProviderSettlement:
  SettlementModule[
    'processProviderSettlement'
  ];

let verifyProviderCallbackRequest:
  CallbackSecurityModule[
    'verifyProviderCallbackRequest'
  ];

const originalCallbackSecret =
  process.env
    .PROVIDER_CALLBACK_SECRET_MPESA;

const originalCallbackMaxAge =
  process.env
    .PROVIDER_CALLBACK_MAX_AGE_SECONDS;

function requireFirestoreEmulator():
  void {
  if (
    !process.env
      .FIRESTORE_EMULATOR_HOST
  ) {
    throw new Error(
      'Provider settlement tests must run against the Firestore Emulator.',
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
    Promise<unknown>[] =
    [];

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
      'financial_accounts',
    ),

    deleteCollection(
      'financial_ledger',
    ),

    deleteCollection(
      'financial_operations',
    ),

    deleteCollection(
      'deposit_requests',
    ),

    deleteCollection(
      'withdrawal_requests',
    ),

    deleteCollection(
      'provider_callback_events',
    ),

    deleteCollection(
      'financial_settlement_audit',
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
        ...INITIAL_BALANCES,
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

async function seedDepositRequest(
  options?: {
    requestId?:
      string;

    amountAtomic?:
      string;

    asset?:
      'USD' |
      'TZS' |
      'NTZS' |
      'PI';
  },
): Promise<string> {
  const requestId =
    options?.requestId ??
    'deposit-settlement-request-001';

  await adminDb
    .collection(
      'deposit_requests',
    )
    .doc(
      requestId,
    )
    .set({
      requestId,

      uid:
        TEST_UID,

      clientOperationId:
        'deposit-client-operation-001',

      asset:
        options?.asset ??
        'TZS',

      rail:
        'MOBILE_MONEY',

      providerCode:
        TEST_PROVIDER_CODE,

      amountAtomic:
        options?.amountAtomic ??
        '500000',

      status:
        'PENDING_PROVIDER_INITIATION',

      providerStatus:
        'NOT_STARTED',

      settlementStatus:
        'NOT_STARTED',

      credited:
        false,

      createdAt:
        new Date(
          TEST_NOW -
            60_000,
        ),

      updatedAt:
        new Date(
          TEST_NOW -
            60_000,
        ),

      expiresAtMs:
        TEST_NOW +
        1_800_000,
    });

  return requestId;
}

async function seedWithdrawalRequest(
  options?: {
    requestId?:
      string;

    amountAtomic?:
      string;

    asset?:
      'USD' |
      'TZS' |
      'NTZS' |
      'PI';
  },
): Promise<string> {
  const requestId =
    options?.requestId ??
    'withdrawal-settlement-request-001';

  await adminDb
    .collection(
      'withdrawal_requests',
    )
    .doc(
      requestId,
    )
    .set({
      requestId,

      uid:
        TEST_UID,

      clientOperationId:
        'withdrawal-client-operation-001',

      asset:
        options?.asset ??
        'TZS',

      rail:
        'MOBILE_MONEY',

      providerCode:
        TEST_PROVIDER_CODE,

      amountAtomic:
        options?.amountAtomic ??
        '300000',

      status:
        'PENDING_REVIEW',

      providerStatus:
        'NOT_STARTED',

      settlementStatus:
        'NOT_STARTED',

      debited:
        false,

      createdAt:
        new Date(
          TEST_NOW -
            60_000,
        ),

      updatedAt:
        new Date(
          TEST_NOW -
            60_000,
        ),

      expiresAtMs:
        TEST_NOW +
        1_800_000,
    });

  return requestId;
}

function createSignature(
  timestampSeconds:
    number,
  rawBody:
    string,
): string {
  return createHmac(
    'sha256',
    TEST_CALLBACK_SECRET,
  )
    .update(
      `${timestampSeconds}.${rawBody}`,
      'utf8',
    )
    .digest(
      'hex',
    );
}

function createSignedRequest(
  payload:
    Record<
      string,
      unknown
    >,
  options?: {
    timestampSeconds?:
      number;

    signature?:
      string;

    rawBody?:
      string;
  },
): Request {
  const timestampSeconds =
    options?.timestampSeconds ??
    TEST_TIMESTAMP_SECONDS;

  const rawBody =
    options?.rawBody ??
    JSON.stringify(
      payload,
    );

  const signature =
    options?.signature ??
    createSignature(
      timestampSeconds,
      rawBody,
    );

  return new Request(
    'https://www.phclsuper.com/api/provider/callback/MPESA',
    {
      method:
        'POST',

      headers: {
        'content-type':
          'application/json',

        'x-phcl-timestamp':
          timestampSeconds.toString(),

        'x-phcl-signature':
          `sha256=${signature}`,
      },

      body:
        rawBody,
    },
  );
}

async function readBalances() {
  const snapshot =
    await adminDb
      .collection(
        'financial_accounts',
      )
      .doc(
        TEST_UID,
      )
      .get();

  return snapshot.data()
    ?.balancesAtomic as
    typeof INITIAL_BALANCES;
}

before(
  async () => {
    requireFirestoreEmulator();

    process.env
      .PROVIDER_CALLBACK_SECRET_MPESA =
      TEST_CALLBACK_SECRET;

    process.env
      .PROVIDER_CALLBACK_MAX_AGE_SECONDS =
      '300';

    const firebaseAdminModule =
      await import(
        '@/lib/firebase-admin'
      );

    const settlementModule =
      await import(
        '@/lib/server-financial-settlement'
      );

    const callbackSecurityModule =
      await import(
        '@/lib/server-provider-callback-security'
      );

    adminDb =
      firebaseAdminModule.adminDb;

    processProviderSettlement =
      settlementModule
        .processProviderSettlement;

    verifyProviderCallbackRequest =
      callbackSecurityModule
        .verifyProviderCallbackRequest;
  },
);

beforeEach(
  async () => {
    process.env
      .PROVIDER_CALLBACK_SECRET_MPESA =
      TEST_CALLBACK_SECRET;

    process.env
      .PROVIDER_CALLBACK_MAX_AGE_SECONDS =
      '300';

    await clearTestData();

    await seedFinancialAccount();
  },
);

after(
  async () => {
    await clearTestData();

    if (
      originalCallbackSecret ===
        undefined
    ) {
      delete process.env
        .PROVIDER_CALLBACK_SECRET_MPESA;
    } else {
      process.env
        .PROVIDER_CALLBACK_SECRET_MPESA =
        originalCallbackSecret;
    }

    if (
      originalCallbackMaxAge ===
        undefined
    ) {
      delete process.env
        .PROVIDER_CALLBACK_MAX_AGE_SECONDS;
    } else {
      process.env
        .PROVIDER_CALLBACK_MAX_AGE_SECONDS =
        originalCallbackMaxAge;
    }
  },
);

describe(
  'PHCL provider callback security',
  {
    concurrency:
      false,
  },
  () => {
    test(
      'accepts a correctly signed callback',
      async () => {
        const payload = {
          kind:
            'DEPOSIT',

          requestId:
            'deposit-request-001',

          providerEventId:
            'provider-event-001',

          providerTransactionId:
            'provider-transaction-001',

          outcome:
            'SUCCESS',
        };

        const request =
          createSignedRequest(
            payload,
          );

        const result =
          await verifyProviderCallbackRequest(
            request,
            {
              providerCode:
                TEST_PROVIDER_CODE,

              now:
                TEST_NOW,
            },
          );

        assert.equal(
          result.providerCode,
          TEST_PROVIDER_CODE,
        );

        assert.equal(
          result.timestampSeconds,
          TEST_TIMESTAMP_SECONDS,
        );

        assert.deepEqual(
          result.payload,
          payload,
        );
      },
    );

    test(
      'rejects an invalid callback signature',
      async () => {
        const request =
          createSignedRequest(
            {
              kind:
                'DEPOSIT',

              requestId:
                'deposit-request-001',

              providerEventId:
                'provider-event-001',

              providerTransactionId:
                'provider-transaction-001',

              outcome:
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
          verifyProviderCallbackRequest(
            request,
            {
              providerCode:
                TEST_PROVIDER_CODE,

              now:
                TEST_NOW,
            },
          ),
          /INVALID_CALLBACK_SIGNATURE/,
        );
      },
    );

    test(
      'rejects an expired callback timestamp',
      async () => {
        const oldTimestamp =
          TEST_TIMESTAMP_SECONDS -
          301;

        const request =
          createSignedRequest(
            {
              kind:
                'DEPOSIT',

              requestId:
                'deposit-request-001',

              providerEventId:
                'provider-event-001',

              providerTransactionId:
                'provider-transaction-001',

              outcome:
                'SUCCESS',
            },
            {
              timestampSeconds:
                oldTimestamp,
            },
          );

        await assert.rejects(
          verifyProviderCallbackRequest(
            request,
            {
              providerCode:
                TEST_PROVIDER_CODE,

              now:
                TEST_NOW,
            },
          ),
          /CALLBACK_TIMESTAMP_OUTSIDE_ALLOWED_WINDOW/,
        );
      },
    );

    test(
      'rejects a body changed after signing',
      async () => {
        const originalBody =
          JSON.stringify({
            kind:
              'DEPOSIT',

            requestId:
              'deposit-request-001',

            providerEventId:
              'provider-event-001',

            providerTransactionId:
              'provider-transaction-001',

            outcome:
              'SUCCESS',
          });

        const changedBody =
          JSON.stringify({
            kind:
              'DEPOSIT',

            requestId:
              'deposit-request-001',

            providerEventId:
              'provider-event-001',

            providerTransactionId:
              'provider-transaction-001',

            outcome:
              'FAILED',
          });

        const originalSignature =
          createSignature(
            TEST_TIMESTAMP_SECONDS,
            originalBody,
          );

        const request =
          createSignedRequest(
            {},
            {
              rawBody:
                changedBody,

              signature:
                originalSignature,
            },
          );

        await assert.rejects(
          verifyProviderCallbackRequest(
            request,
            {
              providerCode:
                TEST_PROVIDER_CODE,

              now:
                TEST_NOW,
            },
          ),
          /INVALID_CALLBACK_SIGNATURE/,
        );
      },
    );

    test(
      'fails closed when the provider secret is missing',
      async () => {
        delete process.env
          .PROVIDER_CALLBACK_SECRET_MPESA;

        const request =
          createSignedRequest({
            kind:
              'DEPOSIT',

            requestId:
              'deposit-request-001',

            providerEventId:
              'provider-event-001',

            providerTransactionId:
              'provider-transaction-001',

            outcome:
              'SUCCESS',
          });

        await assert.rejects(
          verifyProviderCallbackRequest(
            request,
            {
              providerCode:
                TEST_PROVIDER_CODE,

              now:
                TEST_NOW,
            },
          ),
          /PROVIDER_CALLBACK_SECRET_NOT_CONFIGURED/,
        );
      },
    );
  },
);

describe(
  'PHCL provider financial settlement',
  {
    concurrency:
      false,
  },
  () => {
    test(
      'credits a confirmed deposit exactly once',
      async () => {
        const requestId =
          await seedDepositRequest();

        const input = {
          kind:
            'DEPOSIT' as const,

          requestId,

          providerCode:
            TEST_PROVIDER_CODE,

          providerEventId:
            'deposit-success-event-001',

          providerTransactionId:
            'deposit-provider-transaction-001',

          outcome:
            'SUCCESS' as const,
        };

        const firstResult =
          await processProviderSettlement(
            input,
          );

        const balancesAfterFirst =
          await readBalances();

        assert.equal(
          firstResult.idempotent,
          false,
        );

        assert.equal(
          firstResult.settlementStatus,
          'COMPLETED',
        );

        assert.equal(
          balancesAfterFirst.tzs,
          '2500000',
        );

        const secondResult =
          await processProviderSettlement(
            input,
          );

        const balancesAfterSecond =
          await readBalances();

        assert.equal(
          secondResult.idempotent,
          true,
        );

        assert.equal(
          balancesAfterSecond.tzs,
          '2500000',
        );

        const ledgerSnapshot =
          await adminDb
            .collection(
              'financial_ledger',
            )
            .where(
              'operationType',
              '==',
              'DEPOSIT',
            )
            .get();

        assert.equal(
          ledgerSnapshot.size,
          1,
        );

        const requestSnapshot =
          await adminDb
            .collection(
              'deposit_requests',
            )
            .doc(
              requestId,
            )
            .get();

        assert.equal(
          requestSnapshot.data()
            ?.credited,
          true,
        );

        assert.equal(
          requestSnapshot.data()
            ?.settlementStatus,
          'COMPLETED',
        );
      },
    );

    test(
      'debits a confirmed withdrawal exactly once',
      async () => {
        const requestId =
          await seedWithdrawalRequest();

        const input = {
          kind:
            'WITHDRAWAL' as const,

          requestId,

          providerCode:
            TEST_PROVIDER_CODE,

          providerEventId:
            'withdrawal-success-event-001',

          providerTransactionId:
            'withdrawal-provider-transaction-001',

          outcome:
            'SUCCESS' as const,
        };

        const firstResult =
          await processProviderSettlement(
            input,
          );

        const balancesAfterFirst =
          await readBalances();

        assert.equal(
          firstResult.idempotent,
          false,
        );

        assert.equal(
          balancesAfterFirst.tzs,
          '1700000',
        );

        const secondResult =
          await processProviderSettlement(
            input,
          );

        const balancesAfterSecond =
          await readBalances();

        assert.equal(
          secondResult.idempotent,
          true,
        );

        assert.equal(
          balancesAfterSecond.tzs,
          '1700000',
        );

        const ledgerSnapshot =
          await adminDb
            .collection(
              'financial_ledger',
            )
            .where(
              'operationType',
              '==',
              'WITHDRAWAL',
            )
            .get();

        assert.equal(
          ledgerSnapshot.size,
          1,
        );

        const requestSnapshot =
          await adminDb
            .collection(
              'withdrawal_requests',
            )
            .doc(
              requestId,
            )
            .get();

        assert.equal(
          requestSnapshot.data()
            ?.debited,
          true,
        );

        assert.equal(
          requestSnapshot.data()
            ?.settlementStatus,
          'COMPLETED',
        );
      },
    );

    test(
      'does not change balances for a pending callback',
      async () => {
        const requestId =
          await seedDepositRequest({
            requestId:
              'deposit-pending-request-001',
          });

        const balancesBefore =
          await readBalances();

        const result =
          await processProviderSettlement({
            kind:
              'DEPOSIT',

            requestId,

            providerCode:
              TEST_PROVIDER_CODE,

            providerEventId:
              'deposit-pending-event-001',

            outcome:
              'PENDING',
          });

        const balancesAfter =
          await readBalances();

        assert.equal(
          result.settlementStatus,
          'PENDING',
        );

        assert.deepEqual(
          balancesAfter,
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
      },
    );

    test(
      'does not change balances for a failed callback',
      async () => {
        const requestId =
          await seedWithdrawalRequest({
            requestId:
              'withdrawal-failed-request-001',
          });

        const balancesBefore =
          await readBalances();

        const result =
          await processProviderSettlement({
            kind:
              'WITHDRAWAL',

            requestId,

            providerCode:
              TEST_PROVIDER_CODE,

            providerEventId:
              'withdrawal-failed-event-001',

            providerTransactionId:
              'failed-provider-transaction-001',

            outcome:
              'FAILED',

            failureReason:
              'Provider rejected the payout.',
          });

        const balancesAfter =
          await readBalances();

        assert.equal(
          result.settlementStatus,
          'FAILED',
        );

        assert.deepEqual(
          balancesAfter,
          balancesBefore,
        );

        const requestSnapshot =
          await adminDb
            .collection(
              'withdrawal_requests',
            )
            .doc(
              requestId,
            )
            .get();

        assert.equal(
          requestSnapshot.data()
            ?.settlementStatus,
          'FAILED',
        );

        assert.equal(
          requestSnapshot.data()
            ?.debited,
          false,
        );
      },
    );

    test(
      'rejects reuse of a provider event with a different payload',
      async () => {
        const firstRequestId =
          await seedDepositRequest({
            requestId:
              'deposit-replay-request-001',
          });

        const secondRequestId =
          await seedDepositRequest({
            requestId:
              'deposit-replay-request-002',
          });

        await processProviderSettlement({
          kind:
            'DEPOSIT',

          requestId:
            firstRequestId,

          providerCode:
            TEST_PROVIDER_CODE,

          providerEventId:
            'shared-provider-event-001',

          providerTransactionId:
            'provider-transaction-replay-001',

          outcome:
            'SUCCESS',
        });

        await assert.rejects(
          processProviderSettlement({
            kind:
              'DEPOSIT',

            requestId:
              secondRequestId,

            providerCode:
              TEST_PROVIDER_CODE,

            providerEventId:
              'shared-provider-event-001',

            providerTransactionId:
              'provider-transaction-replay-002',

            outcome:
              'SUCCESS',
          }),
          /PROVIDER_EVENT_REPLAY_CONFLICT/,
        );
      },
    );

    test(
      'rejects a callback from a different provider',
      async () => {
        const requestId =
          await seedDepositRequest({
            requestId:
              'deposit-provider-mismatch-001',
          });

        await assert.rejects(
          processProviderSettlement({
            kind:
              'DEPOSIT',

            requestId,

            providerCode:
              'AIRTEL_MONEY',

            providerEventId:
              'wrong-provider-event-001',

            providerTransactionId:
              'wrong-provider-transaction-001',

            outcome:
              'SUCCESS',
          }),
          /SETTLEMENT_PROVIDER_MISMATCH/,
        );
      },
    );

    test(
      'rejects settlement when the request does not exist',
      async () => {
        await assert.rejects(
          processProviderSettlement({
            kind:
              'DEPOSIT',

            requestId:
              'missing-deposit-request',

            providerCode:
              TEST_PROVIDER_CODE,

            providerEventId:
              'missing-request-event-001',

            providerTransactionId:
              'missing-request-transaction-001',

            outcome:
              'SUCCESS',
          }),
          /SETTLEMENT_REQUEST_NOT_FOUND/,
        );
      },
    );

    test(
      'creates immutable callback and audit records',
      async () => {
        const requestId =
          await seedDepositRequest({
            requestId:
              'deposit-audit-request-001',
          });

        await processProviderSettlement({
          kind:
            'DEPOSIT',

          requestId,

          providerCode:
            TEST_PROVIDER_CODE,

          providerEventId:
            'deposit-audit-event-001',

          providerTransactionId:
            'deposit-audit-transaction-001',

          outcome:
            'SUCCESS',
        });

        const callbackSnapshot =
          await adminDb
            .collection(
              'provider_callback_events',
            )
            .get();

        const auditSnapshot =
          await adminDb
            .collection(
              'financial_settlement_audit',
            )
            .get();

        assert.equal(
          callbackSnapshot.size,
          1,
        );

        assert.equal(
          auditSnapshot.size,
          1,
        );

        assert.equal(
          callbackSnapshot.docs[0]
            ?.data()
            .providerEventId,
          'deposit-audit-event-001',
        );

        assert.equal(
          auditSnapshot.docs[0]
            ?.data()
            .action,
          'PROVIDER_SETTLEMENT_CALLBACK',
        );
      },
    );
  },
);