import {
  test,
} from 'node:test';

import assert from 'node:assert/strict';

import {
  adminStorageBucket,
} from '@/lib/firebase-admin';

test(
  'server media storage authority can read bucket metadata',
  async () => {
    const [
      metadata,
    ] =
      await adminStorageBucket
        .getMetadata();

    assert.equal(
      metadata.name,
      adminStorageBucket.name
    );

    assert.ok(
      metadata.location
    );
  }
);