import {
  after,
  before,
  test,
} from 'node:test';

import assert from 'node:assert/strict';

import type {
  Firestore,
} from 'firebase-admin/firestore';

import {
  MEDIA_VALIDATION_WORK_TYPE,
} from '@/lib/media-validation-work-authority';

type MediaUploadTransitionModule =
  typeof import(
    '@/lib/media-upload-transition-authority'
  );

const TEST_MEDIA_ID =
  'media_transition_integration_001';

const TEST_OWNER_ID =
  'media_transition_owner_001';

const TEST_FILE_NAME =
  'video.mp4';

const TEST_SOURCE_OBJECT =
  `media/ingest/${TEST_OWNER_ID}/${TEST_MEDIA_ID}/${TEST_FILE_NAME}`;

const TEST_GENERATION =
  '123456789';

const MEDIA_VALIDATION_WORK_COLLECTION =
  'mediaValidationWork';

let adminDb: Firestore;

let transitionVerifiedMediaToValidating:
  MediaUploadTransitionModule[
    'transitionVerifiedMediaToValidating'
  ];

function requireFirestoreEmulator():
  void {
  if (
    !process.env
      .FIRESTORE_EMULATOR_HOST
  ) {
    throw new Error(
      'Media upload transition integration tests must run against the Firestore Emulator.'
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

async function deleteTestValidationWork():
  Promise<void> {
  await adminDb
    .collection(
      MEDIA_VALIDATION_WORK_COLLECTION
    )
    .doc(TEST_MEDIA_ID)
    .delete();
}

async function resetTestState():
  Promise<void> {
  await Promise.all([
    deleteTestMedia(),
    deleteTestValidationWork(),
  ]);
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

async function readTestValidationWork() {
  return adminDb
    .collection(
      MEDIA_VALIDATION_WORK_COLLECTION
    )
    .doc(TEST_MEDIA_ID)
    .get();
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
        '@/lib/media-upload-transition-authority'
      );

    adminDb =
      firebaseAdminModule.adminDb;

    transitionVerifiedMediaToValidating =
      transitionModule
        .transitionVerifiedMediaToValidating;

    await resetTestState();
  }
);

after(
  async () => {
    if (adminDb) {
      await resetTestState();
    }
  }
);

test(
  'atomically transitions an exact verified upload from UPLOADING to VALIDATING and creates deterministic validation work',
  async () => {
    await resetTestState();
    await writeTestMedia();

    const result =
      await transitionVerifiedMediaToValidating({
        mediaId:
          TEST_MEDIA_ID,
        sourceObject:
          TEST_SOURCE_OBJECT,
        generation:
          TEST_GENERATION,
      });

    assert.equal(
      result.mediaId,
      TEST_MEDIA_ID
    );

    assert.equal(
      result.status,
      'VALIDATING'
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

    assert.equal(
      snapshot.data()?.status,
      'VALIDATING'
    );

    assert.equal(
      snapshot.data()
        ?.verifiedGeneration,
      TEST_GENERATION
    );

    const workSnapshot =
      await readTestValidationWork();

    assert.equal(
      workSnapshot.exists,
      true
    );

    assert.deepEqual(
      workSnapshot.data(),
      {
        workId:
          TEST_MEDIA_ID,

        mediaId:
          TEST_MEDIA_ID,

        workType:
          MEDIA_VALIDATION_WORK_TYPE,
      }
    );
  }
);

test(
  'rejects transition when authoritative source object does not match verified source object without creating validation work',
  async () => {
    await resetTestState();
    await writeTestMedia();

    await assert.rejects(
      transitionVerifiedMediaToValidating({
        mediaId:
          TEST_MEDIA_ID,
        sourceObject:
          `media/ingest/${TEST_OWNER_ID}/${TEST_MEDIA_ID}/other.mp4`,
        generation:
          TEST_GENERATION,
      }),
      /MEDIA_VERIFICATION_MISMATCH/
    );

    const snapshot =
      await adminDb
        .collection('media')
        .doc(TEST_MEDIA_ID)
        .get();

    assert.equal(
      snapshot.data()?.status,
      'UPLOADING'
    );

    assert.equal(
      snapshot.data()
        ?.verifiedGeneration,
      undefined
    );

    const workSnapshot =
      await readTestValidationWork();

    assert.equal(
      workSnapshot.exists,
      false
    );
  }
);

test(
  'rejects transition when media is no longer in UPLOADING state without creating validation work',
  async () => {
    await resetTestState();

    await writeTestMedia({
      status:
        'VALIDATING',
      verifiedGeneration:
        TEST_GENERATION,
    });

    await assert.rejects(
      transitionVerifiedMediaToValidating({
        mediaId:
          TEST_MEDIA_ID,
        sourceObject:
          TEST_SOURCE_OBJECT,
        generation:
          TEST_GENERATION,
      }),
      /MEDIA_INVALID_TRANSITION/
    );

    const workSnapshot =
      await readTestValidationWork();

    assert.equal(
      workSnapshot.exists,
      false
    );
  }
);

test(
  'rejects transition for unsupported media metadata schema without creating validation work',
  async () => {
    await resetTestState();

    await writeTestMedia({
      schemaVersion:
        1,
    });

    await assert.rejects(
      transitionVerifiedMediaToValidating({
        mediaId:
          TEST_MEDIA_ID,
        sourceObject:
          TEST_SOURCE_OBJECT,
        generation:
          TEST_GENERATION,
      }),
      /INVALID_MEDIA_METADATA/
    );

    const workSnapshot =
      await readTestValidationWork();

    assert.equal(
      workSnapshot.exists,
      false
    );
  }
);

test(
  'rejects transition when authoritative media metadata is missing without creating validation work',
  async () => {
    await resetTestState();

    await assert.rejects(
      transitionVerifiedMediaToValidating({
        mediaId:
          TEST_MEDIA_ID,
        sourceObject:
          TEST_SOURCE_OBJECT,
        generation:
          TEST_GENERATION,
      }),
      /MEDIA_NOT_FOUND/
    );

    const workSnapshot =
      await readTestValidationWork();

    assert.equal(
      workSnapshot.exists,
      false
    );
  }
);

test(
  'rejects an invalid verified object generation without creating validation work',
  async () => {
    await resetTestState();
    await writeTestMedia();

    await assert.rejects(
      transitionVerifiedMediaToValidating({
        mediaId:
          TEST_MEDIA_ID,
        sourceObject:
          TEST_SOURCE_OBJECT,
        generation:
          '',
      }),
      /INVALID_MEDIA_VERIFICATION/
    );

    const snapshot =
      await adminDb
        .collection('media')
        .doc(TEST_MEDIA_ID)
        .get();

    assert.equal(
      snapshot.data()?.status,
      'UPLOADING'
    );

    const workSnapshot =
      await readTestValidationWork();

    assert.equal(
      workSnapshot.exists,
      false
    );
  }
);

test(
  'fails atomically when deterministic validation work already exists',
  async () => {
    await resetTestState();
    await writeTestMedia();

    await adminDb
      .collection(
        MEDIA_VALIDATION_WORK_COLLECTION
      )
      .doc(TEST_MEDIA_ID)
      .create({
        workId:
          TEST_MEDIA_ID,

        mediaId:
          TEST_MEDIA_ID,

        workType:
          MEDIA_VALIDATION_WORK_TYPE,
      });

    await assert.rejects(
      transitionVerifiedMediaToValidating({
        mediaId:
          TEST_MEDIA_ID,
        sourceObject:
          TEST_SOURCE_OBJECT,
        generation:
          TEST_GENERATION,
      })
    );

    const snapshot =
      await adminDb
        .collection('media')
        .doc(TEST_MEDIA_ID)
        .get();

    assert.equal(
      snapshot.data()?.status,
      'UPLOADING'
    );

    assert.equal(
      snapshot.data()
        ?.verifiedGeneration,
      undefined
    );
  }
);