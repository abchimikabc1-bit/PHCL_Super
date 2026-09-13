import {
  after,
  before,
  test,
} from 'node:test';

import assert from 'node:assert/strict';

import {
  FieldValue,
  type Firestore,
} from 'firebase-admin/firestore';

type MediaValidatingReaderModule =
  typeof import(
    '@/lib/media-validating-reader'
  );

const TEST_MEDIA_ID =
  'media_validating_reader_001';

const TEST_OWNER_ID =
  'media_validating_owner_001';

const TEST_FILE_NAME =
  'video.mp4';

const TEST_SOURCE_OBJECT =
  `media/ingest/${TEST_OWNER_ID}/${TEST_MEDIA_ID}/${TEST_FILE_NAME}`;

const TEST_GENERATION =
  '123456789';

let adminDb: Firestore;

let readValidatingMedia:
  MediaValidatingReaderModule[
    'readValidatingMedia'
  ];

function requireFirestoreEmulator():
  void {
  if (
    !process.env
      .FIRESTORE_EMULATOR_HOST
  ) {
    throw new Error(
      'Media validating reader integration tests must run against the Firestore Emulator.'
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
      mediaId:
        TEST_MEDIA_ID,
      ownerId:
        TEST_OWNER_ID,
      sourceObject:
        TEST_SOURCE_OBJECT,
      sourceFileName:
        TEST_FILE_NAME,
      contentType:
        'video/mp4',
      declaredSizeBytes:
        1024,
      status:
        'VALIDATING',
      verifiedGeneration:
        TEST_GENERATION,
      createdAtMs:
        1,
      updatedAtMs:
        2,
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
        '@/lib/media-validating-reader'
      );

    adminDb =
      firebaseAdminModule.adminDb;

    readValidatingMedia =
      readerModule
        .readValidatingMedia;

    await deleteTestMedia();
  }
);

after(
  async () => {
    if (adminDb) {
      await deleteTestMedia();
    }
  }
);

test(
  'reads authoritative VALIDATING media with verified generation',
  async () => {
    await writeTestMedia();

    const media =
      await readValidatingMedia(
        TEST_MEDIA_ID
      );

    assert.equal(
      media.schemaVersion,
      2
    );

    assert.equal(
      media.mediaId,
      TEST_MEDIA_ID
    );

    assert.equal(
      media.ownerId,
      TEST_OWNER_ID
    );

    assert.equal(
      media.sourceObject,
      TEST_SOURCE_OBJECT
    );

    assert.equal(
      media.sourceFileName,
      TEST_FILE_NAME
    );

    assert.equal(
      media.contentType,
      'video/mp4'
    );

    assert.equal(
      media.declaredSizeBytes,
      1024
    );

    assert.equal(
      media.status,
      'VALIDATING'
    );

    assert.equal(
      media.verifiedGeneration,
      TEST_GENERATION
    );

    assert.equal(
      media.createdAtMs,
      1
    );

    assert.equal(
      media.updatedAtMs,
      2
    );
  }
);

test(
  'rejects media that is not in VALIDATING state',
  async () => {
    await writeTestMedia({
      status:
        'UPLOADING',
    });

    await assert.rejects(
      readValidatingMedia(
        TEST_MEDIA_ID
      ),
      /MEDIA_INVALID_VALIDATING_STATE/
    );
  }
);

test(
  'rejects VALIDATING media without verified generation',
  async () => {
    await writeTestMedia();

    await adminDb
      .collection('media')
      .doc(TEST_MEDIA_ID)
      .update({
        verifiedGeneration:
          FieldValue.delete(),
      });

    await assert.rejects(
      readValidatingMedia(
        TEST_MEDIA_ID
      ),
      /INVALID_MEDIA_METADATA/
    );
  }
);

test(
  'rejects blank verified generation',
  async () => {
    await writeTestMedia({
      verifiedGeneration:
        ' ',
    });

    await assert.rejects(
      readValidatingMedia(
        TEST_MEDIA_ID
      ),
      /INVALID_MEDIA_METADATA/
    );
  }
);

test(
  'rejects non-canonical source object',
  async () => {
    await writeTestMedia({
      sourceObject:
        `media/ingest/${TEST_OWNER_ID}/${TEST_MEDIA_ID}/other.mp4`,
    });

    await assert.rejects(
      readValidatingMedia(
        TEST_MEDIA_ID
      ),
      /INVALID_MEDIA_METADATA/
    );
  }
);

test(
  'rejects unsupported media metadata schema',
  async () => {
    await writeTestMedia({
      schemaVersion:
        1,
    });

    await assert.rejects(
      readValidatingMedia(
        TEST_MEDIA_ID
      ),
      /INVALID_MEDIA_METADATA/
    );
  }
);

test(
  'rejects missing authoritative media',
  async () => {
    await deleteTestMedia();

    await assert.rejects(
      readValidatingMedia(
        TEST_MEDIA_ID
      ),
      /MEDIA_NOT_FOUND/
    );
  }
);