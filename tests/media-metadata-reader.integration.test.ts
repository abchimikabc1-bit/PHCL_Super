import {
  after,
  before,
  test,
} from 'node:test';

import assert from 'node:assert/strict';

import type {
  Firestore,
} from 'firebase-admin/firestore';

type MediaMetadataReaderModule =
  typeof import(
    '@/lib/media-metadata-reader'
  );

const TEST_MEDIA_ID =
  'media_reader_integration_001';

const TEST_OWNER_ID =
  'media_reader_owner_001';

const TEST_FILE_NAME =
  'video.mp4';

const TEST_SOURCE_OBJECT =
  `media/ingest/${TEST_OWNER_ID}/${TEST_MEDIA_ID}/${TEST_FILE_NAME}`;

let adminDb: Firestore;

let readMediaMetadataForVerification:
  MediaMetadataReaderModule[
    'readMediaMetadataForVerification'
  ];

function requireFirestoreEmulator():
  void {
  if (
    !process.env
      .FIRESTORE_EMULATOR_HOST
  ) {
    throw new Error(
      'Media metadata reader integration tests must run against the Firestore Emulator.'
    );
  }
}

async function deleteTestMedia():
  Promise<void> {
  await adminDb
    .collection('media')
    .doc(TEST_MEDIA_ID)
    .delete();
}

async function writeTestMedia(
  overrides: Record<
    string,
    unknown
  > = {}
): Promise<void> {
  await adminDb
    .collection('media')
    .doc(TEST_MEDIA_ID)
    .set({
      schemaVersion: 2,
      mediaId: TEST_MEDIA_ID,
      ownerId: TEST_OWNER_ID,
      sourceObject:
        TEST_SOURCE_OBJECT,
      sourceFileName:
        TEST_FILE_NAME,
      contentType:
        'video/mp4',
      declaredSizeBytes:
        1024,
      status:
        'UPLOADING',
      createdAtMs:
        1,
      updatedAtMs:
        1,
      ...overrides,
    });
}

before(
  async () => {
    requireFirestoreEmulator();

    const firebaseAdminModule =
      await import(
        '@/lib/firebase-admin'
      );

    const readerModule =
      await import(
        '@/lib/media-metadata-reader'
      );

    adminDb =
      firebaseAdminModule.adminDb;

    readMediaMetadataForVerification =
      readerModule
        .readMediaMetadataForVerification;

    await deleteTestMedia();
  }
);

after(
  async () => {
    await deleteTestMedia();
  }
);

test(
  'reads valid authoritative schema v2 media metadata for upload verification',
  async () => {
    await writeTestMedia();

    const record =
      await readMediaMetadataForVerification(
        TEST_MEDIA_ID
      );

    assert.equal(
      record.schemaVersion,
      2
    );

    assert.equal(
      record.mediaId,
      TEST_MEDIA_ID
    );

    assert.equal(
      record.ownerId,
      TEST_OWNER_ID
    );

    assert.equal(
      record.sourceObject,
      TEST_SOURCE_OBJECT
    );

    assert.equal(
      record.sourceFileName,
      TEST_FILE_NAME
    );

    assert.equal(
      record.contentType,
      'video/mp4'
    );

    assert.equal(
      record.declaredSizeBytes,
      1024
    );

    assert.equal(
      record.status,
      'UPLOADING'
    );
  }
);

test(
  'rejects unsupported media metadata schema versions',
  async () => {
    await writeTestMedia({
      schemaVersion: 1,
    });

    await assert.rejects(
      readMediaMetadataForVerification(
        TEST_MEDIA_ID
      ),
      /INVALID_MEDIA_METADATA/
    );
  }
);

test(
  'rejects inconsistent authoritative source object identity',
  async () => {
    await writeTestMedia({
      sourceObject:
        `media/ingest/${TEST_OWNER_ID}/${TEST_MEDIA_ID}/other.mp4`,
    });

    await assert.rejects(
      readMediaMetadataForVerification(
        TEST_MEDIA_ID
      ),
      /INVALID_MEDIA_METADATA/
    );
  }
);

test(
  'rejects unsupported authoritative media content type',
  async () => {
    await writeTestMedia({
      contentType:
        'video/webm',
    });

    await assert.rejects(
      readMediaMetadataForVerification(
        TEST_MEDIA_ID
      ),
      /INVALID_MEDIA_METADATA/
    );
  }
);

test(
  'rejects invalid authoritative declared media size',
  async () => {
    await writeTestMedia({
      declaredSizeBytes:
        0,
    });

    await assert.rejects(
      readMediaMetadataForVerification(
        TEST_MEDIA_ID
      ),
      /INVALID_MEDIA_METADATA/
    );
  }
);

test(
  'rejects media metadata outside the upload verification state',
  async () => {
    await writeTestMedia({
      status:
        'READY',
    });

    await assert.rejects(
      readMediaMetadataForVerification(
        TEST_MEDIA_ID
      ),
      /INVALID_MEDIA_METADATA/
    );
  }
);

test(
  'rejects missing authoritative media metadata',
  async () => {
    await deleteTestMedia();

    await assert.rejects(
      readMediaMetadataForVerification(
        TEST_MEDIA_ID
      ),
      /MEDIA_NOT_FOUND/
    );
  }
);