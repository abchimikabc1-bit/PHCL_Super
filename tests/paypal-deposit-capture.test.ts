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
  'paypal-capture-test-user';

const OTHER_UID =
  'paypal-capture-other-user';

const TEST_REQUEST_ID =
  `deposit_${'a'.repeat(64)}`;

const TEST_PROVIDER_ORDER_ID =
  'PAYPAL-ORDER-CAPTURE-SECURITY-001';

const TEST_PROVIDER_TRANSACTION_ID =
  'PAYPAL-CAPTURE-SECURITY-001';

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

type CaptureModule =
  typeof import(
    '@/lib/server-deposit-provider-capture'
  );

type CaptureStatus =
  | 'COMPLETED'
  | 'APPROVED'
  | 'DENIED';

type RecordedFetch = {
  url:
    string;

  init:
    RequestInit | undefined;
};

let adminDb:
  Firestore;

let captureDepositProvider:
  CaptureModule[
    'captureDepositProvider'
  ];

let recordedFetches:
  RecordedFetch[] = [];

let captureStatus:
  CaptureStatus =
  'COMPLETED';

let returnedOrderId =
  TEST_PROVIDER_ORDER_ID;

let returnedTransactionId:
  string | null =
  TEST_PROVIDER_TRANSACTION_ID;

let captureHttpStatus =
  200;

const originalFetch =
  globalThis.fetch;

const mutableProcessEnvironment =
  process.env as Record<
    string,
    string | undefined
  >;

const originalEnvironment = {
  providerEnvironment:
    process.env
      .PAYMENT_PROVIDER_ENVIRONMENT,

  paypalClientId:
    process.env
      .PAYPAL_SANDBOX_CLIENT_ID,

  paypalClientSecret:
    process.env
      .PAYPAL_SANDBOX_CLIENT_SECRET,

  paypalWebhookId:
    process.env
      .PAYPAL_SANDBOX_WEBHOOK_ID,

  siteUrl:
    process.env
      .NEXT_PUBLIC_SITE_URL,
};

function requireFirestoreEmulator():
  void {
  if (
    !process.env
      .FIRESTORE_EMULATOR_HOST
  ) {
    throw new Error(
      'PayPal capture tests must run against the Firestore Emulator.',
    );
  }
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
    delete mutableProcessEnvironment[
      name
    ];

    return;
  }

  mutableProcessEnvironment[
    name
  ] =
    value;
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
          Date.now() -
            86_400_000,
        ),

      updatedAt:
        new Date(),
    });
}

async function seedDepositRequest(
  overrides:
    Record<
      string,
      unknown
    > = {},
): Promise<void> {
  await adminDb
    .collection(
      'deposit_requests',
    )
    .doc(
      TEST_REQUEST_ID,
    )
    .set({
      requestId:
        TEST_REQUEST_ID,

      fingerprint:
        'b'.repeat(64),

      uid:
        TEST_UID,

      clientOperationId:
        'paypal-capture-client-operation-001',

      asset:
        'USD',

      rail:
        'DIGITAL_WALLET',

      providerCode:
        'PAYPAL',

      amountAtomic:
        '1025',

      status:
        'PENDING_PROVIDER_INITIATION',

      providerStatus:
        'NOT_STARTED',

      providerInitiationStatus:
        'INITIATED',

      providerRequestId:
        TEST_PROVIDER_ORDER_ID,

      providerTransactionId:
        null,

      providerOperationStatus:
        'REQUIRES_CUSTOMER_ACTION',

      providerResponseFingerprint:
        'c'.repeat(64),

      settlementStatus:
        'NOT_STARTED',

      credited:
        false,

      createdAt:
        new Date(),

      updatedAt:
        new Date(),

      expiresAt:
        new Date(
          Date.now() +
            1_800_000,
        ),

      expiresAtMs:
        Date.now() +
          1_800_000,

      ...overrides,
    });
}

function createPayPalCaptureResponse() {
  const captures =
    returnedTransactionId ===
      null
      ? []
      : [
          {
            id:
              returnedTransactionId,

            status:
              captureStatus,
          },
        ];

  return {
    id:
      returnedOrderId,

    status:
      captureStatus,

    purchase_units: [
      {
        payments: {
          captures,
        },
      },
    ],
  };
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

  if (
    url ===
      'https://api-m.sandbox.paypal.com/v1/oauth2/token'
  ) {
    return new Response(
      JSON.stringify({
        access_token:
          'paypal-capture-test-access-token',

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
      `https://api-m.sandbox.paypal.com/v2/checkout/orders/${TEST_PROVIDER_ORDER_ID}/capture`
  ) {
    return new Response(
      JSON.stringify(
        captureHttpStatus >= 400
          ? {
              name:
                'PAYPAL_CAPTURE_ERROR',
            }
          : createPayPalCaptureResponse(),
      ),
      {
        status:
          captureHttpStatus,

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
}

function getCaptureRequests():
  RecordedFetch[] {
  return recordedFetches.filter(
    (
      recorded,
    ) =>
      recorded.url.includes(
        '/v2/checkout/orders/',
      ) &&
      recorded.url.endsWith(
        '/capture',
      ),
  );
}

async function assertRejectsWithCode(
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
        error instanceof Error,
      );

      assert.equal(
        error.message,
        expectedCode,
      );

      return true;
    },
  );
}

before(
  async () => {
    requireFirestoreEmulator();

    mutableProcessEnvironment
      .PAYMENT_PROVIDER_ENVIRONMENT =
      'SANDBOX';

    mutableProcessEnvironment
      .PAYPAL_SANDBOX_CLIENT_ID =
      'paypal-capture-test-client-id';

    mutableProcessEnvironment
      .PAYPAL_SANDBOX_CLIENT_SECRET =
      'paypal-capture-test-client-secret';

    mutableProcessEnvironment
      .PAYPAL_SANDBOX_WEBHOOK_ID =
      'PAYPALCAPTUREWEBHOOKTEST001';

    mutableProcessEnvironment
      .NEXT_PUBLIC_SITE_URL =
      'https://www.phclsuper.com';

    const firebaseAdminModule =
      await import(
        '@/lib/firebase-admin'
      );

    const captureModule =
      await import(
        '@/lib/server-deposit-provider-capture'
      );

    adminDb =
      firebaseAdminModule.adminDb;

    captureDepositProvider =
      captureModule
        .captureDepositProvider;
  },
);

beforeEach(
  async () => {
    mutableProcessEnvironment
      .PAYMENT_PROVIDER_ENVIRONMENT =
      'SANDBOX';

    mutableProcessEnvironment
      .PAYPAL_SANDBOX_CLIENT_ID =
      'paypal-capture-test-client-id';

    mutableProcessEnvironment
      .PAYPAL_SANDBOX_CLIENT_SECRET =
      'paypal-capture-test-client-secret';

    recordedFetches =
      [];

    captureStatus =
      'COMPLETED';

    returnedOrderId =
      TEST_PROVIDER_ORDER_ID;

    returnedTransactionId =
      TEST_PROVIDER_TRANSACTION_ID;

    captureHttpStatus =
      200;

    globalThis.fetch =
      fetchMock as
        typeof fetch;

    await clearTestData();

    await seedFinancialAccount();

    await seedDepositRequest();
  },
);

after(
  async () => {
    await clearTestData();

    globalThis.fetch =
      originalFetch;

    restoreEnvironmentVariable(
      'PAYMENT_PROVIDER_ENVIRONMENT',
      originalEnvironment
        .providerEnvironment,
    );

    restoreEnvironmentVariable(
      'PAYPAL_SANDBOX_CLIENT_ID',
      originalEnvironment
        .paypalClientId,
    );

    restoreEnvironmentVariable(
      'PAYPAL_SANDBOX_CLIENT_SECRET',
      originalEnvironment
        .paypalClientSecret,
    );

    restoreEnvironmentVariable(
      'PAYPAL_SANDBOX_WEBHOOK_ID',
      originalEnvironment
        .paypalWebhookId,
    );

    restoreEnvironmentVariable(
      'NEXT_PUBLIC_SITE_URL',
      originalEnvironment
        .siteUrl,
    );
  },
);

describe(
  'PHCL PayPal deposit capture security',
  {
    concurrency:
      false,
  },
  () => {
    test(
      'captures the authoritative PayPal order without settling funds',
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
          await captureDepositProvider({
            uid:
              TEST_UID,

            requestId:
              TEST_REQUEST_ID,
          });

        assert.equal(
          result.success,
          true,
        );

        assert.equal(
          result.idempotent,
          false,
        );

        assert.equal(
          result.capture
            .providerCode,
          'PAYPAL',
        );

        assert.equal(
          result.capture
            .providerRequestId,
          TEST_PROVIDER_ORDER_ID,
        );

        assert.equal(
          result.capture
            .providerTransactionId,
          TEST_PROVIDER_TRANSACTION_ID,
        );

        assert.equal(
          result.capture.status,
          'SUCCESS',
        );

        const captureRequests =
          getCaptureRequests();

        assert.equal(
          captureRequests.length,
          1,
        );

        assert.equal(
          captureRequests[0]
            ?.url,
          `https://api-m.sandbox.paypal.com/v2/checkout/orders/${TEST_PROVIDER_ORDER_ID}/capture`,
        );

        assert.equal(
          captureRequests[0]
            ?.init
            ?.method,
          'POST',
        );

        const captureHeaders =
          new Headers(
            captureRequests[0]
              ?.init
              ?.headers,
          );

        const idempotencyKey =
          captureHeaders.get(
            'PayPal-Request-Id',
          );

        assert.ok(
          idempotencyKey,
        );

        assert.match(
          idempotencyKey,
          /^paypal_capture_[a-f0-9]{64}$/,
        );

        const requestSnapshot =
          await adminDb
            .collection(
              'deposit_requests',
            )
            .doc(
              TEST_REQUEST_ID,
            )
            .get();

        const requestData =
          requestSnapshot.data();

        assert.equal(
          requestData
            ?.providerCaptureStatus,
          'SUCCESS',
        );

        assert.equal(
          requestData
            ?.providerCaptureOperationId,
          idempotencyKey,
        );

        assert.equal(
          requestData
            ?.providerTransactionId,
          TEST_PROVIDER_TRANSACTION_ID,
        );

        assert.match(
          requestData
            ?.providerCaptureResponseFingerprint,
          /^[a-f0-9]{64}$/,
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
      'returns a completed capture idempotently without calling PayPal again',
      async () => {
        const first =
          await captureDepositProvider({
            uid:
              TEST_UID,

            requestId:
              TEST_REQUEST_ID,
          });

        const capturesAfterFirst =
          getCaptureRequests()
            .length;

        const second =
          await captureDepositProvider({
            uid:
              TEST_UID,

            requestId:
              TEST_REQUEST_ID,
          });

        assert.equal(
          first.capture
            .providerTransactionId,
          second.capture
            .providerTransactionId,
        );

        assert.equal(
          second.idempotent,
          true,
        );

        assert.equal(
          getCaptureRequests()
            .length,
          capturesAfterFirst,
        );
      },
    );

    test(
      'rejects capture by a different authenticated account',
      async () => {
        await assertRejectsWithCode(
          () =>
            captureDepositProvider({
              uid:
                OTHER_UID,

              requestId:
                TEST_REQUEST_ID,
            }),
          'DEPOSIT_CAPTURE_ACCOUNT_MISMATCH',
        );

        assert.equal(
          getCaptureRequests()
            .length,
          0,
        );
      },
    );

    test(
      'uses the provider order ID stored in Firestore',
      async () => {
        await captureDepositProvider({
          uid:
            TEST_UID,

          requestId:
            TEST_REQUEST_ID,
        });

        const captureRequests =
          getCaptureRequests();

        assert.equal(
          captureRequests.length,
          1,
        );

        assert.equal(
          captureRequests[0]
            ?.url.includes(
              TEST_PROVIDER_ORDER_ID,
            ),
          true,
        );

        const serializedInput =
          JSON.stringify({
            uid:
              TEST_UID,

            requestId:
              TEST_REQUEST_ID,
          });

        assert.equal(
          serializedInput.includes(
            TEST_PROVIDER_ORDER_ID,
          ),
          false,
        );
      },
    );

    test(
      'rejects a non-PayPal deposit request',
      async () => {
        await seedDepositRequest({
          providerCode:
            'MPESA',

          asset:
            'TZS',

          rail:
            'MOBILE_MONEY',

          providerRequestId:
            'mpesa_req_test_reference',
        });

        await assertRejectsWithCode(
          () =>
            captureDepositProvider({
              uid:
                TEST_UID,

              requestId:
                TEST_REQUEST_ID,
            }),
          'DEPOSIT_CAPTURE_ROUTE_NOT_SUPPORTED',
        );

        assert.equal(
          getCaptureRequests()
            .length,
          0,
        );
      },
    );

    test(
      'rejects a deposit that has not completed provider initiation',
      async () => {
        await seedDepositRequest({
          providerInitiationStatus:
            'NOT_STARTED',

          providerRequestId:
            null,
        });

        await assertRejectsWithCode(
          () =>
            captureDepositProvider({
              uid:
                TEST_UID,

              requestId:
                TEST_REQUEST_ID,
            }),
          'DEPOSIT_CAPTURE_PROVIDER_NOT_INITIATED',
        );

        assert.equal(
          getCaptureRequests()
            .length,
          0,
        );
      },
    );

    test(
      'rejects a deposit that has already been settled',
      async () => {
        await seedDepositRequest({
          settlementStatus:
            'SETTLED',

          credited:
            true,
        });

        await assertRejectsWithCode(
          () =>
            captureDepositProvider({
              uid:
                TEST_UID,

              requestId:
                TEST_REQUEST_ID,
            }),
          'DEPOSIT_CAPTURE_CREDIT_STATE_INVALID',
        );

        assert.equal(
          getCaptureRequests()
            .length,
          0,
        );
      },
    );

    test(
      'records a pending capture without settling funds',
      async () => {
        captureStatus =
          'APPROVED';

        returnedTransactionId =
          null;

        const result =
          await captureDepositProvider({
            uid:
              TEST_UID,

            requestId:
              TEST_REQUEST_ID,
          });

        assert.equal(
          result.capture.status,
          'PENDING',
        );

        assert.equal(
          result.capture
            .providerTransactionId,
          null,
        );

        const requestSnapshot =
          await adminDb
            .collection(
              'deposit_requests',
            )
            .doc(
              TEST_REQUEST_ID,
            )
            .get();

        const requestData =
          requestSnapshot.data();

        assert.equal(
          requestData
            ?.providerCaptureStatus,
          'PENDING',
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
      },
    );

    test(
      'records a failed capture without settling funds',
      async () => {
        captureStatus =
          'DENIED';

        returnedTransactionId =
          null;

        const result =
          await captureDepositProvider({
            uid:
              TEST_UID,

            requestId:
              TEST_REQUEST_ID,
          });

        assert.equal(
          result.capture.status,
          'FAILED',
        );

        assert.equal(
          result.capture
            .providerTransactionId,
          null,
        );

        const requestSnapshot =
          await adminDb
            .collection(
              'deposit_requests',
            )
            .doc(
              TEST_REQUEST_ID,
            )
            .get();

        const requestData =
          requestSnapshot.data();

        assert.equal(
          requestData
            ?.providerCaptureStatus,
          'FAILED',
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
      },
    );

    test(
      'rejects a PayPal response containing a different order ID',
      async () => {
        returnedOrderId =
          'PAYPAL-ORDER-ATTACKER-001';

        await assertRejectsWithCode(
          () =>
            captureDepositProvider({
              uid:
                TEST_UID,

              requestId:
                TEST_REQUEST_ID,
            }),
          'PROVIDER_OPERATION_CONFLICT',
        );

        const requestSnapshot =
          await adminDb
            .collection(
              'deposit_requests',
            )
            .doc(
              TEST_REQUEST_ID,
            )
            .get();

        assert.equal(
          requestSnapshot.data()
            ?.providerCaptureStatus,
          undefined,
        );
      },
    );

    test(
      'does not create a financial ledger entry during capture',
      async () => {
        await captureDepositProvider({
          uid:
            TEST_UID,

          requestId:
            TEST_REQUEST_ID,
        });

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
      'does not create a financial operation during capture',
      async () => {
        await captureDepositProvider({
          uid:
            TEST_UID,

          requestId:
            TEST_REQUEST_ID,
        });

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
      },
    );
  },
);