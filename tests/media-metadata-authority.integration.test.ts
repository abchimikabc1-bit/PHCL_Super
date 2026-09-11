import {
  after,
  before,
  test,
} from 'node:test';

import assert from 'node:assert/strict';

import type {
  Firestore,
} from 'firebase-admin/firestore';

type MediaMetadataAuthorityModule =
  typeof import(
    '@/lib/media-metadata-authority'
  );

const TEST_MEDIA_ID =
  'media_metadata_integration_001';

const TEST_OWNER_ID =
  'media_test_owner_001';

const TEST_FILE_NAME =
  'video.mp4';

let adminDb:
  Firestore;

let createMediaMetadata:
  MediaMetadataAuthorityModule[
    'createMediaMetadata'
  ];

function requireFirestoreEmulator():
  void {
  if (
    !process.env
      .FIRESTORE_EMULATOR_HOST
  ) {
    throw new Error(
      'Media metadata integration tests must run against the Firestore Emulator.'
    );
  }
}

async function deleteTestMedia():
  Promise<void> {
  await adminDb
    .collection(
      'media'
    )
    .doc(
      TEST_MEDIA_ID
    )
    .delete();
}

before(
  async () => {
    requireFirestoreEmulator();

    const firebaseAdminModule =
      await import(
        '@/lib/firebase-admin'
      );

    const mediaMetadataModule =
      await import(
        '@/lib/media-metadata-authority'
      );

    adminDb =
      firebaseAdminModule.adminDb;

    createMediaMetadata =
      mediaMetadataModule
        .createMediaMetadata;

    await deleteTestMedia();
  }
);

after(
  async () => {
    await deleteTestMedia();
  }
);

test(
  'creates authoritative media ownership metadata and rejects duplicate reassignment',
  async () => {
    const created =
      await createMediaMetadata({
        ownerId:
          TEST_OWNER_ID,

        mediaId:
          TEST_MEDIA_ID,

        sourceFileName:
          TEST_FILE_NAME,
      });

    assert.equal(
      created.mediaId,
      TEST_MEDIA_ID
    );

    assert.equal(
      created.ownerId,
      TEST_OWNER_ID
    );

    assert.equal(
      created.sourceObject,
      `media/ingest/${TEST_OWNER_ID}/${TEST_MEDIA_ID}/${TEST_FILE_NAME}`
    );

    assert.equal(
      created.status,
      'UPLOADING'
    );

    const mediaRef =
      adminDb
        .collection(
          'media'
        )
        .doc(
          TEST_MEDIA_ID
        );

    const firstSnapshot =
      await mediaRef.get();

    assert.equal(
      firstSnapshot.exists,
      true
    );

    const firstData =
      firstSnapshot.data();

    assert.equal(
      firstData?.ownerId,
      TEST_OWNER_ID
    );

    assert.equal(
      firstData?.sourceObject,
      created.sourceObject
    );

    assert.equal(
      firstData?.sourceFileName,
      TEST_FILE_NAME
    );

    assert.equal(
      firstData?.status,
      'UPLOADING'
    );

    assert.equal(
      firstData?.schemaVersion,
      1
    );

    assert.ok(
      firstData?.serverCreatedAt
    );

    assert.ok(
      firstData?.serverUpdatedAt
    );

    await assert.rejects(
      createMediaMetadata({
        ownerId:
          'different_owner_001',

        mediaId:
          TEST_MEDIA_ID,

        sourceFileName:
          'different.mp4',
      }),
      /MEDIA_ALREADY_EXISTS/
    );

    const finalSnapshot =
      await mediaRef.get();

    const finalData =
      finalSnapshot.data();

    assert.equal(
      finalData?.ownerId,
      TEST_OWNER_ID
    );

    assert.equal(
      finalData?.sourceObject,
      created.sourceObject
    );

    assert.equal(
      finalData?.sourceFileName,
      TEST_FILE_NAME
    );

    assert.equal(
      finalData?.status,
      'UPLOADING'
    );
  }
);