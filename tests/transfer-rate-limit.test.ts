import assert from 'node:assert/strict';

import {
  after,
  beforeEach,
  describe,
  test,
} from 'node:test';

import {
  adminDb,
} from '@/lib/firebase-admin';

import {
  consumeTransferRateLimit,
  getTransferNetworkKey,
} from '@/lib/server-transfer-security';

const COLLECTION =
  'transfer_rate_limits';

const TEST_SECRET =
  'phcl-transfer-rate-limit-test-secret-2026-secure';

const TEST_WINDOW_SECONDS =
  10;

const TEST_BLOCK_SECONDS =
  5;

async function clearRateLimitDocuments():
  Promise<void> {
  const snapshot =
    await adminDb
      .collection(
        COLLECTION,
      )
      .get();

  if (snapshot.empty) {
    return;
  }

  const batch =
    adminDb.batch();

  for (
    const document of
    snapshot.docs
  ) {
    batch.delete(
      document.ref,
    );
  }

  await batch.commit();
}

function configureRateLimits({
  maxAccountRequests = 2,
  maxNetworkRequests = 10,
}: {
  maxAccountRequests?: number;
  maxNetworkRequests?: number;
} = {}): void {
  process.env
    .TRANSFER_RATE_LIMIT_SECRET =
    TEST_SECRET;

  process.env
    .TRANSFER_RATE_LIMIT_WINDOW_SECONDS =
    String(
      TEST_WINDOW_SECONDS,
    );

  process.env
    .TRANSFER_RATE_LIMIT_BLOCK_SECONDS =
    String(
      TEST_BLOCK_SECONDS,
    );

  process.env
    .TRANSFER_RATE_LIMIT_MAX_ACCOUNT_REQUESTS =
    String(
      maxAccountRequests,
    );

  process.env
    .TRANSFER_RATE_LIMIT_MAX_NETWORK_REQUESTS =
    String(
      maxNetworkRequests,
    );
}

beforeEach(
  async () => {
    configureRateLimits();

    await clearRateLimitDocuments();
  },
);

after(
  async () => {
    await clearRateLimitDocuments();
  },
);

describe(
  'PHCL transfer rate limiter',
  {
    concurrency: false,
  },
  () => {
    test(
      'allows requests that remain below the account limit',
      async () => {
        const first =
          await consumeTransferRateLimit(
            'customer-one',
            'network-one',
            1_000_000,
          );

        const second =
          await consumeTransferRateLimit(
            'customer-one',
            'network-one',
            1_000_001,
          );

        assert.equal(
          first.allowed,
          true,
        );

        assert.equal(
          first.remaining,
          1,
        );

        assert.equal(
          second.allowed,
          true,
        );

        assert.equal(
          second.remaining,
          0,
        );

        assert.equal(
          second.retryAfterSeconds,
          0,
        );
      },
    );

    test(
      'blocks the next request after the account limit is exhausted',
      async () => {
        await consumeTransferRateLimit(
          'customer-one',
          'network-one',
          2_000_000,
        );

        await consumeTransferRateLimit(
          'customer-one',
          'network-one',
          2_000_001,
        );

        const blocked =
          await consumeTransferRateLimit(
            'customer-one',
            'network-one',
            2_000_002,
          );

        assert.equal(
          blocked.allowed,
          false,
        );

        assert.equal(
          blocked.remaining,
          0,
        );

        assert.equal(
          blocked.retryAfterSeconds,
          TEST_BLOCK_SECONDS,
        );

               assert.equal(
          blocked.resetAtMs,
          2_000_000 +
            TEST_WINDOW_SECONDS *
              1000,
        );

        assert.ok(
          blocked.resetAtMs >=
            2_000_002 +
              TEST_BLOCK_SECONDS *
                1000,
        );
      },
    );

    test(
      'continues blocking an account during its block period',
      async () => {
        await consumeTransferRateLimit(
          'customer-one',
          'network-one',
          3_000_000,
        );

        await consumeTransferRateLimit(
          'customer-one',
          'network-one',
          3_000_001,
        );

        await consumeTransferRateLimit(
          'customer-one',
          'network-one',
          3_000_002,
        );

        const stillBlocked =
          await consumeTransferRateLimit(
            'customer-one',
            'network-two',
            3_002_002,
          );

        assert.equal(
          stillBlocked.allowed,
          false,
        );

        assert.equal(
          stillBlocked.remaining,
          0,
        );

        assert.equal(
          stillBlocked.retryAfterSeconds,
          3,
        );
      },
    );

    test(
      'allows the account again after the complete window has expired',
      async () => {
        const start =
          4_000_000;

        await consumeTransferRateLimit(
          'customer-one',
          'network-one',
          start,
        );

        await consumeTransferRateLimit(
          'customer-one',
          'network-one',
          start + 1,
        );

        const blocked =
          await consumeTransferRateLimit(
            'customer-one',
            'network-one',
            start + 2,
          );

        assert.equal(
          blocked.allowed,
          false,
        );

        const afterWindow =
          await consumeTransferRateLimit(
            'customer-one',
            'network-one',
            start +
              TEST_WINDOW_SECONDS *
                1000 +
              1,
          );

        assert.equal(
          afterWindow.allowed,
          true,
        );

        assert.equal(
          afterWindow.remaining,
          1,
        );
      },
    );

    test(
      'enforces the shared network limit across different accounts',
      async () => {
        configureRateLimits({
          maxAccountRequests:
            10,

          maxNetworkRequests:
            3,
        });

        const networkKey =
          'shared-network';

        const first =
          await consumeTransferRateLimit(
            'customer-one',
            networkKey,
            5_000_000,
          );

        const second =
          await consumeTransferRateLimit(
            'customer-two',
            networkKey,
            5_000_001,
          );

        const third =
          await consumeTransferRateLimit(
            'customer-three',
            networkKey,
            5_000_002,
          );

        const fourth =
          await consumeTransferRateLimit(
            'customer-four',
            networkKey,
            5_000_003,
          );

        assert.equal(
          first.allowed,
          true,
        );

        assert.equal(
          second.allowed,
          true,
        );

        assert.equal(
          third.allowed,
          true,
        );

        assert.equal(
          fourth.allowed,
          false,
        );

        assert.equal(
          fourth.remaining,
          0,
        );

        assert.equal(
          fourth.retryAfterSeconds,
          TEST_BLOCK_SECONDS,
        );
      },
    );

    test(
      'creates a stable network key from forwarding headers',
      () => {
        const request =
          new Request(
            'https://www.phclsuper.com/api/transfer',
            {
              headers: {
                'x-forwarded-for':
                  '203.0.113.10',

                'x-real-ip':
                  '203.0.113.11',

                'x-forwarded-host':
                  'www.phclsuper.com',
              },
            },
          );

        const networkKey =
          getTransferNetworkKey(
            request,
          );

        assert.equal(
          networkKey,
          '203.0.113.10|203.0.113.11|www.phclsuper.com',
        );
      },
    );

    test(
      'does not store raw UID, IP address, email or authorization data',
      async () => {
        const rawUid =
          'customer-sensitive-uid';

        const rawIp =
          '203.0.113.77';

        const rawEmail =
          'customer@example.com';

        const rawAuthorization =
          'Bearer private-test-token';

        const networkKey =
          [
            rawIp,
            rawEmail,
            rawAuthorization,
          ].join('|');

        await consumeTransferRateLimit(
          rawUid,
          networkKey,
          6_000_000,
        );

        const snapshot =
          await adminDb
            .collection(
              COLLECTION,
            )
            .get();

        assert.equal(
          snapshot.size,
          2,
        );

        const serialized =
          JSON.stringify(
            snapshot.docs.map(
              (document) => ({
                id:
                  document.id,

                data:
                  document.data(),
              }),
            ),
          );

        assert.equal(
          serialized.includes(
            rawUid,
          ),
          false,
        );

        assert.equal(
          serialized.includes(
            rawIp,
          ),
          false,
        );

        assert.equal(
          serialized.includes(
            rawEmail,
          ),
          false,
        );

        assert.equal(
          serialized.includes(
            rawAuthorization,
          ),
          false,
        );

        for (
          const document of
          snapshot.docs
        ) {
          assert.match(
            document.id,
            /^(account|network)_[a-f0-9]{64}$/,
          );
        }
      },
    );

    test(
      'rejects an invalid account identifier',
      async () => {
        await assert.rejects(
          consumeTransferRateLimit(
            'invalid/account',
            'network-one',
            7_000_000,
          ),
          {
            message:
              'INVALID_TRANSFER_RATE_LIMIT_ACCOUNT',
          },
        );
      },
    );

    test(
      'fails closed when the rate-limit secret is missing',
      async () => {
        delete process.env
          .TRANSFER_RATE_LIMIT_SECRET;

        await assert.rejects(
          consumeTransferRateLimit(
            'customer-one',
            'network-one',
            8_000_000,
          ),
          {
            message:
              'TRANSFER_RATE_LIMIT_SECRET_NOT_CONFIGURED',
          },
        );
      },
    );

    test(
      'fails closed when the rate-limit secret is too short',
      async () => {
        process.env
          .TRANSFER_RATE_LIMIT_SECRET =
          'too-short';

        await assert.rejects(
          consumeTransferRateLimit(
            'customer-one',
            'network-one',
            9_000_000,
          ),
          {
            message:
              'TRANSFER_RATE_LIMIT_SECRET_TOO_SHORT',
          },
        );
      },
    );
  },
);