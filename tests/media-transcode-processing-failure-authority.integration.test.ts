import {
  after,
  before,
  beforeEach,
  test,
} from 'node:test';

import assert from 'node:assert/strict';

import type {
  Firestore,
} from 'firebase-admin/firestore';

type FailureModule =
  typeof import(
    '@/lib/media-transcode-processing-failure-authority'
  );

const MEDIA_ID =
  'media_transcode_failed_001';

const OWNER_ID =
  'media_transcode_failed_owner';

const FILE_NAME =
  'video.mp4';

const SOURCE_OBJECT =
  `media/ingest/${OWNER_ID}/${MEDIA_ID}/${FILE_NAME}`;

const GENERATION =
  '123456789';

const JOB_NAME =
  'projects/823513556612/locations/me-central1/jobs/job-123';

const SUBMITTED_AT_MS =
  1_800_000_000_000;

const FAILED_AT_MS =
  SUBMITTED_AT_MS + 1_000;

let adminDb:
  Firestore;

let failMediaTranscodeProcessing:
  FailureModule[
    'failMediaTranscodeProcessing'
  ];

function requireFirestoreEmulator(): void {
  if (
    !process.env
      .FIRESTORE_EMULATOR_HOST
  ) {
    throw new Error(
      'Media transcode processing failure tests require the Firestore Emulator.'
    );
  }
}

async function deleteTestMedia():
  Promise<void> {
  await adminDb
    .collection('media')
    .doc(MEDIA_ID)
    .delete();
}

async function createTranscodingMedia(
  overrides:
    Record<string, unknown> = {}
): Promise<void> {
  await adminDb
    .collection('media')
    .doc(MEDIA_ID)
    .set({
      schemaVersion:
        2,
      mediaId:
        MEDIA_ID,
      ownerId:
        OWNER_ID,
      sourceObject:
        SOURCE_OBJECT,
      sourceFileName:
        FILE_NAME,
      contentType:
        'video/mp4',
      declaredSizeBytes:
        1024,
      status:
        'TRANSCODING',
      verifiedGeneration:
        GENERATION,
      validatedGeneration:
        GENERATION,
      transcoderJobName:
        JOB_NAME,
      transcodeSubmittedGeneration:
        GENERATION,
      transcodeSubmittedAtMs:
        SUBMITTED_AT_MS,
      createdAtMs:
        1,
      updatedAtMs:
        SUBMITTED_AT_MS,
      ...overrides,
    });
}

function failureInput(
  overrides:
    Partial<
      Parameters<
        typeof failMediaTranscodeProcessing
      >[0]
    > = {}
) {
  return {
    mediaId:
      MEDIA_ID,
    sourceObject:
      SOURCE_OBJECT,
    verifiedGeneration:
      GENERATION,
    transcoderJobName:
      JOB_NAME,
    nowMs:
      FAILED_AT_MS,
    ...overrides,
  };
}

before(
  async () => {
    requireFirestoreEmulator();

    const firebaseAdminModule =
      await import(
        '@/lib/firebase-admin'
      );

    const failureModule =
      await import(
        '@/lib/media-transcode-processing-failure-authority'
      );

    adminDb =
      firebaseAdminModule.adminDb;

    failMediaTranscodeProcessing =
      failureModule
        .failMediaTranscodeProcessing;

    await deleteTestMedia();
  }
);

beforeEach(
  async () => {
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
  'atomically transitions exact TRANSCODING media to TRANSCODE_FAILED',
  async () => {
    await createTranscodingMedia();

    const result =
      await failMediaTranscodeProcessing(
        failureInput()
      );

    assert.deepEqual(
      result,
      {
        mediaId:
          MEDIA_ID,
        status:
          'TRANSCODE_FAILED',
        verifiedGeneration:
          GENERATION,
        transcoderJobName:
          JOB_NAME,
        failureCode:
          'TRANSCODER_JOB_FAILED',
        failedAtMs:
          FAILED_AT_MS,
      }
    );

    const snapshot =
      await adminDb
        .collection('media')
        .doc(MEDIA_ID)
        .get();

    assert.equal(
      snapshot.data()?.status,
      'TRANSCODE_FAILED'
    );

    assert.equal(
      snapshot.data()
        ?.transcodeFailedGeneration,
      GENERATION
    );

    assert.equal(
      snapshot.data()
        ?.transcodeFailureCode,
      'TRANSCODER_JOB_FAILED'
    );

    assert.equal(
      snapshot.data()
        ?.transcodeFailedAtMs,
      FAILED_AT_MS
    );
  }
);

test(
  'treats exact repeated failure as idempotent without replacing failure time',
  async () => {
    await createTranscodingMedia();

    await failMediaTranscodeProcessing(
      failureInput()
    );

    const repeated =
      await failMediaTranscodeProcessing(
        failureInput({
          nowMs:
            FAILED_AT_MS + 5_000,
        })
      );

    assert.equal(
      repeated.failedAtMs,
      FAILED_AT_MS
    );

    const snapshot =
      await adminDb
        .collection('media')
        .doc(MEDIA_ID)
        .get();

    assert.equal(
      snapshot.data()
        ?.transcodeFailedAtMs,
      FAILED_AT_MS
    );

    assert.equal(
      snapshot.data()?.updatedAtMs,
      FAILED_AT_MS
    );
  }
);

test(
  'rejects stale generation or wrong transcoder job without failing media',
  async () => {
    for (
      const overrides
      of [
        {
          verifiedGeneration:
            '987654321',
        },
        {
          transcoderJobName:
            'projects/823513556612/locations/me-central1/jobs/other-job',
        },
      ]
    ) {
      await createTranscodingMedia();

      await assert.rejects(
        failMediaTranscodeProcessing(
          failureInput(
            overrides
          )
        ),
        /MEDIA_TRANSCODE_FAILURE_MISMATCH/
      );

      const snapshot =
        await adminDb
          .collection('media')
          .doc(MEDIA_ID)
          .get();

      assert.equal(
        snapshot.data()?.status,
        'TRANSCODING'
      );
    }
  }
);

test(
  'rejects unsafe failure input before reading Firestore',
  async () => {
    await createTranscodingMedia();

    await assert.rejects(
      failMediaTranscodeProcessing(
        failureInput({
          mediaId:
            '../other-media',
        })
      ),
      /INVALID_MEDIA_TRANSCODE_PROCESSING_FAILURE/
    );

    const snapshot =
      await adminDb
        .collection('media')
        .doc(MEDIA_ID)
        .get();

    assert.equal(
      snapshot.data()?.status,
      'TRANSCODING'
    );
  }
);

test(
  'rejects media outside TRANSCODING and never replaces READY',
  async () => {
    for (
      const status
      of [
        'TRANSCODE_PENDING',
        'READY',
      ]
    ) {
      await createTranscodingMedia({
        status,
      });

      await assert.rejects(
        failMediaTranscodeProcessing(
          failureInput()
        ),
        /MEDIA_INVALID_TRANSCODE_FAILURE_TRANSITION/
      );

      const snapshot =
        await adminDb
          .collection('media')
          .doc(MEDIA_ID)
          .get();

      assert.equal(
        snapshot.data()?.status,
        status
      );
    }
  }
);

test(
  'rejects a failure timestamp earlier than transcode submission',
  async () => {
    await createTranscodingMedia();

    await assert.rejects(
      failMediaTranscodeProcessing(
        failureInput({
          nowMs:
            SUBMITTED_AT_MS - 1,
        })
      ),
      /MEDIA_INVALID_TRANSCODE_FAILURE_TRANSITION/
    );
  }
);
