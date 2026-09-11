import {
  after,
  before,
  test,
} from 'node:test';

import assert from 'node:assert/strict';

import type {
  Firestore,
} from 'firebase-admin/firestore';

const TEST_OWNER_ID =
  'media_ingest_owner_001';

const TEST_FILE_NAME =
  'video.mp4';

let adminDb:
  Firestore;

let initiateMediaIngest:
  typeof import(
    '@/lib/media-ingest-authority'
  )['initiateMediaIngest'];

function requireFirestoreEmulator() {
  if (
    !process.env
      .FIRESTORE_EMULATOR_HOST
  ) {
    throw new Error(
      'FIRESTORE_EMULATOR_HOST is required.'
    );
  }
}

before(
  async () => {
    requireFirestoreEmulator();

    const firebaseAdmin =
      await import(
        '@/lib/firebase-admin'
      );

    const mediaAuthority =
      await import(
        '@/lib/media-ingest-authority'
      );

    adminDb =
      firebaseAdmin.adminDb;

    initiateMediaIngest =
      mediaAuthority
        .initiateMediaIngest;
  }
);

after(
  async () => {
    if (!adminDb) {
      return;
    }

    const snapshot =
      await adminDb
        .collection('media')
        .where(
          'ownerId',
          '==',
          TEST_OWNER_ID
        )
        .get();

    if (snapshot.empty) {
      return;
    }

    const batch =
      adminDb.batch();

    for (
      const document
      of snapshot.docs
    ) {
      batch.delete(
        document.ref
      );
    }

    await batch.commit();
  }
);

test(
  'initiates authoritative media ingest with a server-generated canonical identity',
  async () => {
    const result =
      await initiateMediaIngest({
        ownerId:
          TEST_OWNER_ID,

        sourceFileName:
          TEST_FILE_NAME,
      });

    assert.match(
      result.mediaId,
      /^[A-Za-z0-9_-]{1,128}$/
    );

    assert.equal(
      result.ownerId,
      TEST_OWNER_ID
    );

    assert.equal(
      result.sourceFileName,
      TEST_FILE_NAME
    );

    assert.equal(
      result.sourceObject,
      `media/ingest/${TEST_OWNER_ID}/${result.mediaId}/${TEST_FILE_NAME}`
    );

    assert.equal(
      result.status,
      'UPLOADING'
    );

    const snapshot =
      await adminDb
        .collection('media')
        .doc(result.mediaId)
        .get();

    assert.equal(
      snapshot.exists,
      true
    );

    const stored =
      snapshot.data();

    assert.equal(
      stored?.mediaId,
      result.mediaId
    );

    assert.equal(
      stored?.ownerId,
      TEST_OWNER_ID
    );

    assert.equal(
      stored?.sourceFileName,
      TEST_FILE_NAME
    );

    assert.equal(
      stored?.sourceObject,
      result.sourceObject
    );

    assert.equal(
      stored?.status,
      'UPLOADING'
    );

    assert.ok(
      stored?.serverCreatedAt
    );

    assert.ok(
      stored?.serverUpdatedAt
    );
  }
);