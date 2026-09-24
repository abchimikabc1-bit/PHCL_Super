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

import type {
  MediaTranscodeOutputEvidence,
} from '@/lib/media-transcode-output-evidence';

type CompletionModule =
  typeof import(
    '@/lib/media-transcode-processing-completion-authority'
  );

const MEDIA_ID =
  'media_transcode_ready_001';

const OWNER_ID =
  'media_transcode_ready_owner';

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

const COMPLETED_AT_MS =
  SUBMITTED_AT_MS + 1_000;

let adminDb:
  Firestore;

let completeMediaTranscodeProcessing:
  CompletionModule[
    'completeMediaTranscodeProcessing'
  ];

function requireFirestoreEmulator(): void {
  if (
    !process.env
      .FIRESTORE_EMULATOR_HOST
  ) {
    throw new Error(
      'Media transcode processing completion tests require the Firestore Emulator.'
    );
  }
}

function outputPath(
  fileName: string
): string {
  return (
    `media/processed/${MEDIA_ID}/` +
    fileName
  );
}

function createOutputEvidence():
  MediaTranscodeOutputEvidence {
  return {
    mediaId:
      MEDIA_ID,
    outputPrefix:
      `media/processed/${MEDIA_ID}/`,
    masterManifestObject:
      outputPath(
        'master.m3u8'
      ),
    hlsManifestObjects: [
      outputPath(
        'hls-1080p.m3u8'
      ),
      outputPath(
        'hls-720p.m3u8'
      ),
      outputPath(
        'hls-480p.m3u8'
      ),
    ],
    hlsFirstSegmentObjects: [
      outputPath(
        'hls-1080p0000000000.ts'
      ),
      outputPath(
        'hls-720p0000000000.ts'
      ),
      outputPath(
        'hls-480p0000000000.ts'
      ),
    ],
    mp4Objects: [
      outputPath(
        'video-1080p.mp4'
      ),
      outputPath(
        'video-720p.mp4'
      ),
      outputPath(
        'video-480p.mp4'
      ),
    ],
    thumbnailObject:
      outputPath(
        'thumbnail0000000000.jpeg'
      ),
  };
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

function completionInput(
  overrides:
    Partial<
      Parameters<
        typeof completeMediaTranscodeProcessing
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
    outputEvidence:
      createOutputEvidence(),
    nowMs:
      COMPLETED_AT_MS,
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

    const completionModule =
      await import(
        '@/lib/media-transcode-processing-completion-authority'
      );

    adminDb =
      firebaseAdminModule.adminDb;

    completeMediaTranscodeProcessing =
      completionModule
        .completeMediaTranscodeProcessing;

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
  'atomically transitions exact TRANSCODING media to READY with canonical outputs',
  async () => {
    await createTranscodingMedia();

    const result =
      await completeMediaTranscodeProcessing(
        completionInput()
      );

    assert.deepEqual(
      result,
      {
        mediaId:
          MEDIA_ID,
        status:
          'READY',
        verifiedGeneration:
          GENERATION,
        transcoderJobName:
          JOB_NAME,
        outputPrefix:
          `media/processed/${MEDIA_ID}/`,
        masterManifestObject:
          outputPath(
            'master.m3u8'
          ),
        mp4Objects:
          createOutputEvidence()
            .mp4Objects,
        thumbnailObject:
          outputPath(
            'thumbnail0000000000.jpeg'
          ),
        completedAtMs:
          COMPLETED_AT_MS,
      }
    );

    const snapshot =
      await adminDb
        .collection('media')
        .doc(MEDIA_ID)
        .get();

    assert.equal(
      snapshot.data()?.status,
      'READY'
    );

    assert.equal(
      snapshot.data()
        ?.transcodeCompletedGeneration,
      GENERATION
    );

    assert.equal(
      snapshot.data()
        ?.transcodeCompletedAtMs,
      COMPLETED_AT_MS
    );

    assert.deepEqual(
      snapshot.data()
        ?.hlsManifestObjects,
      createOutputEvidence()
        .hlsManifestObjects
    );
  }
);

test(
  'treats an exact repeated completion as idempotent without replacing completion time',
  async () => {
    await createTranscodingMedia();

    await completeMediaTranscodeProcessing(
      completionInput()
    );

    const repeated =
      await completeMediaTranscodeProcessing(
        completionInput({
          nowMs:
            COMPLETED_AT_MS + 5_000,
        })
      );

    assert.equal(
      repeated.completedAtMs,
      COMPLETED_AT_MS
    );

    const snapshot =
      await adminDb
        .collection('media')
        .doc(MEDIA_ID)
        .get();

    assert.equal(
      snapshot.data()
        ?.transcodeCompletedAtMs,
      COMPLETED_AT_MS
    );

    assert.equal(
      snapshot.data()?.updatedAtMs,
      COMPLETED_AT_MS
    );
  }
);

test(
  'rejects stale generation or wrong transcoder job without transitioning media',
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
        completeMediaTranscodeProcessing(
          completionInput(
            overrides
          )
        ),
        /MEDIA_TRANSCODE_COMPLETION_MISMATCH/
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
  'rejects noncanonical output evidence before reading Firestore',
  async () => {
    await createTranscodingMedia();

    await assert.rejects(
      completeMediaTranscodeProcessing(
        completionInput({
          outputEvidence: {
            ...createOutputEvidence(),
            masterManifestObject:
              'media/processed/other-media/master.m3u8',
          },
        })
      ),
      /INVALID_MEDIA_TRANSCODE_OUTPUT_EVIDENCE/
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
  'rejects media outside the TRANSCODING lifecycle state',
  async () => {
    await createTranscodingMedia({
      status:
        'TRANSCODE_PENDING',
    });

    await assert.rejects(
      completeMediaTranscodeProcessing(
        completionInput()
      ),
      /MEDIA_INVALID_TRANSCODE_COMPLETION_TRANSITION/
    );
  }
);
