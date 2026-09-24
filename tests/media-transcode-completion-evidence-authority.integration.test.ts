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

type EvidenceModule =
  typeof import(
    '@/lib/media-transcode-completion-evidence-authority'
  );

const MEDIA_ID =
  'media_transcode_evidence_001';

const SECOND_MEDIA_ID =
  'media_transcode_evidence_002';

const OWNER_ID =
  'media_transcode_evidence_owner';

const FILE_NAME =
  'video.mp4';

const SOURCE_OBJECT =
  `media/ingest/${OWNER_ID}/${MEDIA_ID}/${FILE_NAME}`;

const GENERATION =
  '123456789';

const JOB_NAME =
  'projects/823513556612/locations/me-central1/jobs/job-123';

let adminDb:
  Firestore;

let readMediaTranscodeCompletionEvidence:
  EvidenceModule[
    'readMediaTranscodeCompletionEvidence'
  ];

function requireFirestoreEmulator(): void {
  if (
    !process.env
      .FIRESTORE_EMULATOR_HOST
  ) {
    throw new Error(
      'Media transcode completion evidence tests require the Firestore Emulator.'
    );
  }
}

async function resetTestState():
  Promise<void> {
  await Promise.all([
    adminDb
      .collection('media')
      .doc(MEDIA_ID)
      .delete(),
    adminDb
      .collection('media')
      .doc(SECOND_MEDIA_ID)
      .delete(),
  ]);
}

function mediaRecord(
  mediaId: string = MEDIA_ID,
  overrides:
    Record<string, unknown> = {}
) {
  const sourceObject =
    mediaId === MEDIA_ID
      ? SOURCE_OBJECT
      : `media/ingest/${OWNER_ID}/${mediaId}/${FILE_NAME}`;

  return {
    schemaVersion:
      2,
    mediaId,
    ownerId:
      OWNER_ID,
    sourceObject,
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
      1_800_000_000_000,
    createdAtMs:
      1,
    updatedAtMs:
      1_800_000_000_000,
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

    const evidenceModule =
      await import(
        '@/lib/media-transcode-completion-evidence-authority'
      );

    adminDb =
      firebaseAdminModule.adminDb;

    readMediaTranscodeCompletionEvidence =
      evidenceModule
        .readMediaTranscodeCompletionEvidence;

    await resetTestState();
  }
);

beforeEach(
  async () => {
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
  'reads exact authoritative TRANSCODING media by transcoder job name',
  async () => {
    await adminDb
      .collection('media')
      .doc(MEDIA_ID)
      .set(
        mediaRecord()
      );

    const evidence =
      await readMediaTranscodeCompletionEvidence(
        JOB_NAME
      );

    assert.deepEqual(
      evidence,
      {
        mediaId:
          MEDIA_ID,
        sourceObject:
          SOURCE_OBJECT,
        verifiedGeneration:
          GENERATION,
        transcoderJobName:
          JOB_NAME,
        status:
          'TRANSCODING',
      }
    );
  }
);

test(
  'allows exact READY media for idempotent completion redelivery',
  async () => {
    await adminDb
      .collection('media')
      .doc(MEDIA_ID)
      .set(
        mediaRecord(
          MEDIA_ID,
          {
            status:
              'READY',
          }
        )
      );

    const evidence =
      await readMediaTranscodeCompletionEvidence(
        JOB_NAME
      );

    assert.equal(
      evidence?.status,
      'READY'
    );
  }
);

test(
  'allows exact TRANSCODE_FAILED media for idempotent failure redelivery',
  async () => {
    await adminDb
      .collection('media')
      .doc(MEDIA_ID)
      .set(
        mediaRecord(
          MEDIA_ID,
          {
            status:
              'TRANSCODE_FAILED',
            transcodeFailedGeneration:
              GENERATION,
            transcodeFailureCode:
              'TRANSCODER_JOB_FAILED',
            transcodeFailedAtMs:
              1_800_000_001_000,
          }
        )
      );

    const evidence =
      await readMediaTranscodeCompletionEvidence(
        JOB_NAME
      );

    assert.equal(
      evidence?.status,
      'TRANSCODE_FAILED'
    );
  }
);

test(
  'rejects incomplete TRANSCODE_FAILED evidence',
  async () => {
    for (
      const failureFields
      of [
        {},
        {
          transcodeFailedGeneration:
            GENERATION,
          transcodeFailureCode:
            'UNTRUSTED_FAILURE',
          transcodeFailedAtMs:
            1_800_000_001_000,
        },
      ]
    ) {
      await adminDb
        .collection('media')
        .doc(MEDIA_ID)
        .set(
          mediaRecord(
            MEDIA_ID,
            {
              status:
                'TRANSCODE_FAILED',
              ...failureFields,
            }
          )
        );

      await assert.rejects(
        readMediaTranscodeCompletionEvidence(
          JOB_NAME
        ),
        /INVALID_MEDIA_TRANSCODE_COMPLETION_EVIDENCE/
      );
    }
  }
);

test(
  'returns null when no media owns the exact transcoder job',
  async () => {
    assert.equal(
      await readMediaTranscodeCompletionEvidence(
        JOB_NAME
      ),
      null
    );
  }
);

test(
  'fails closed when multiple media documents claim one transcoder job',
  async () => {
    await Promise.all([
      adminDb
        .collection('media')
        .doc(MEDIA_ID)
        .set(
          mediaRecord()
        ),
      adminDb
        .collection('media')
        .doc(SECOND_MEDIA_ID)
        .set(
          mediaRecord(
            SECOND_MEDIA_ID
          )
        ),
    ]);

    await assert.rejects(
      readMediaTranscodeCompletionEvidence(
        JOB_NAME
      ),
      /AMBIGUOUS_MEDIA_TRANSCODE_COMPLETION_EVIDENCE/
    );
  }
);

test(
  'rejects malformed media identity and invalid lifecycle status',
  async () => {
    for (
      const overrides
      of [
        {
          sourceObject:
            'media/ingest/attacker/media/video.mp4',
        },
        {
          transcodeSubmittedGeneration:
            '987654321',
        },
        {
          status:
            'TRANSCODE_PENDING',
        },
      ]
    ) {
      await adminDb
        .collection('media')
        .doc(MEDIA_ID)
        .set(
          mediaRecord(
            MEDIA_ID,
            overrides
          )
        );

      await assert.rejects(
        readMediaTranscodeCompletionEvidence(
          JOB_NAME
        ),
        /INVALID_MEDIA_TRANSCODE_COMPLETION_EVIDENCE/
      );
    }
  }
);

test(
  'rejects unsafe job name before Firestore lookup',
  async () => {
    await assert.rejects(
      readMediaTranscodeCompletionEvidence(
        '../jobs/job-123'
      ),
      /INVALID_MEDIA_TRANSCODE_COMPLETION_JOB_NAME/
    );
  }
);
