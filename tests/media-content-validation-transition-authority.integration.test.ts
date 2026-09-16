import {
  after,
  before,
  test,
} from 'node:test';

import assert from 'node:assert/strict';

import type {
  Firestore,
} from 'firebase-admin/firestore';

import type {
  MediaContentProbe,
} from '@/lib/media-content-validation';

type MediaContentValidationTransitionModule =
  typeof import(
    '@/lib/media-content-validation-transition-authority'
  );

const TEST_MEDIA_ID =
  'media_content_validation_transition_001';

const TEST_OWNER_ID =
  'media_content_validation_owner_001';

const TEST_FILE_NAME =
  'video.mp4';

const TEST_SOURCE_OBJECT =
  `media/ingest/${TEST_OWNER_ID}/${TEST_MEDIA_ID}/${TEST_FILE_NAME}`;

const TEST_GENERATION =
  '987654321';

const VALID_PROBE:
  MediaContentProbe = {
    container:
      'mp4',
    durationMs:
      30_000,
    videoCodec:
      'h264',
    width:
      1080,
    height:
      1920,
    frameRate:
      30,
    audioCodec:
      'aac',
  };

let adminDb:
  Firestore;

let transitionMediaContentValidation:
  MediaContentValidationTransitionModule[
    'transitionMediaContentValidation'
  ];

function requireFirestoreEmulator():
  void {
  if (
    !process.env
      .FIRESTORE_EMULATOR_HOST
  ) {
    throw new Error(
      'Media content validation transition integration tests must run against the Firestore Emulator.'
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
      schemaVersion:
        2,
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

    const transitionModule =
      await import(
        '@/lib/media-content-validation-transition-authority'
      );

    adminDb =
      firebaseAdminModule.adminDb;

    transitionMediaContentValidation =
      transitionModule
        .transitionMediaContentValidation;

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
  'atomically transitions matching VALIDATING media to VALIDATED',
  async () => {
    await writeTestMedia();

    const result =
      await transitionMediaContentValidation({
        mediaId:
          TEST_MEDIA_ID,
        sourceObject:
          TEST_SOURCE_OBJECT,
        verifiedGeneration:
          TEST_GENERATION,
        validation: {
          valid:
            true,
          probe:
            VALID_PROBE,
        },
      });

    assert.equal(
      result.mediaId,
      TEST_MEDIA_ID
    );

    assert.equal(
      result.status,
      'VALIDATED'
    );

    assert.equal(
      result.verifiedGeneration,
      TEST_GENERATION
    );

    const snapshot =
      await adminDb
        .collection('media')
        .doc(TEST_MEDIA_ID)
        .get();

    const media =
      snapshot.data();

    assert.equal(
      media?.status,
      'VALIDATED'
    );

    assert.equal(
      media?.verifiedGeneration,
      TEST_GENERATION
    );

    assert.equal(
      media?.validatedGeneration,
      TEST_GENERATION
    );

    assert.deepEqual(
      media?.validationProbe,
      VALID_PROBE
    );

    assert.equal(
      media?.validationFailureReason,
      undefined
    );

    assert.equal(
      typeof media?.validatedAtMs,
      'number'
    );

    assert.equal(
      typeof media?.updatedAtMs,
      'number'
    );
  }
);

test(
  'atomically transitions semantic policy rejection to REJECTED',
  async () => {
    await writeTestMedia();

    const result =
      await transitionMediaContentValidation({
        mediaId:
          TEST_MEDIA_ID,
        sourceObject:
          TEST_SOURCE_OBJECT,
        verifiedGeneration:
          TEST_GENERATION,
        validation: {
          valid:
            false,
          reason:
            'INVALID_FRAME_RATE',
        },
      });

    assert.equal(
      result.mediaId,
      TEST_MEDIA_ID
    );

    assert.equal(
      result.status,
      'REJECTED'
    );

    assert.equal(
      result.verifiedGeneration,
      TEST_GENERATION
    );

    const snapshot =
      await adminDb
        .collection('media')
        .doc(TEST_MEDIA_ID)
        .get();

    const media =
      snapshot.data();

    assert.equal(
      media?.status,
      'REJECTED'
    );

    assert.equal(
      media?.validatedGeneration,
      TEST_GENERATION
    );

    assert.equal(
      media?.validationFailureReason,
      'INVALID_FRAME_RATE'
    );

    assert.equal(
      media?.validationProbe,
      undefined
    );

    assert.equal(
      typeof media?.validatedAtMs,
      'number'
    );
  }
);

test(
  'rejects a stale validation result when verified generation does not match',
  async () => {
    await writeTestMedia();

    await assert.rejects(
      transitionMediaContentValidation({
        mediaId:
          TEST_MEDIA_ID,
        sourceObject:
          TEST_SOURCE_OBJECT,
        verifiedGeneration:
          'stale-generation',
        validation: {
          valid:
            true,
          probe:
            VALID_PROBE,
        },
      }),
      /MEDIA_VALIDATION_MISMATCH/
    );

    const snapshot =
      await adminDb
        .collection('media')
        .doc(TEST_MEDIA_ID)
        .get();

    assert.equal(
      snapshot.data()?.status,
      'VALIDATING'
    );

    assert.equal(
      snapshot.data()
        ?.validatedGeneration,
      undefined
    );
  }
);

test(
  'rejects a stale validation result when authoritative source object does not match',
  async () => {
    await writeTestMedia();

    await assert.rejects(
      transitionMediaContentValidation({
        mediaId:
          TEST_MEDIA_ID,
        sourceObject:
          `media/ingest/${TEST_OWNER_ID}/${TEST_MEDIA_ID}/other.mp4`,
        verifiedGeneration:
          TEST_GENERATION,
        validation: {
          valid:
            true,
          probe:
            VALID_PROBE,
        },
      }),
      /MEDIA_VALIDATION_MISMATCH/
    );

    const snapshot =
      await adminDb
        .collection('media')
        .doc(TEST_MEDIA_ID)
        .get();

    assert.equal(
      snapshot.data()?.status,
      'VALIDATING'
    );
  }
);

test(
  'rejects post-validation transition when media is no longer VALIDATING',
  async () => {
    await writeTestMedia({
      status:
        'VALIDATED',
    });

    await assert.rejects(
      transitionMediaContentValidation({
        mediaId:
          TEST_MEDIA_ID,
        sourceObject:
          TEST_SOURCE_OBJECT,
        verifiedGeneration:
          TEST_GENERATION,
        validation: {
          valid:
            true,
          probe:
            VALID_PROBE,
        },
      }),
      /MEDIA_INVALID_VALIDATION_TRANSITION/
    );
  }
);

test(
  'rejects unsupported authoritative media metadata schema',
  async () => {
    await writeTestMedia({
      schemaVersion:
        1,
    });

    await assert.rejects(
      transitionMediaContentValidation({
        mediaId:
          TEST_MEDIA_ID,
        sourceObject:
          TEST_SOURCE_OBJECT,
        verifiedGeneration:
          TEST_GENERATION,
        validation: {
          valid:
            true,
          probe:
            VALID_PROBE,
        },
      }),
      /INVALID_MEDIA_METADATA/
    );
  }
);

test(
  'rejects transition when authoritative media metadata is missing',
  async () => {
    await deleteTestMedia();

    await assert.rejects(
      transitionMediaContentValidation({
        mediaId:
          TEST_MEDIA_ID,
        sourceObject:
          TEST_SOURCE_OBJECT,
        verifiedGeneration:
          TEST_GENERATION,
        validation: {
          valid:
            true,
          probe:
            VALID_PROBE,
        },
      }),
      /MEDIA_NOT_FOUND/
    );
  }
);