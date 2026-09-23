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

type ClaimModule =
  typeof import(
    '@/lib/media-transcode-work-claim-authority'
  );

type CompletionModule =
  typeof import(
    '@/lib/media-transcode-work-completion-authority'
  );

const MEDIA_ID =
  'media_transcode_completion_001';

const OWNER_ID =
  'media_transcode_completion_owner';

const FILE_NAME =
  'video.mp4';

const SOURCE_OBJECT =
  `media/ingest/${OWNER_ID}/${MEDIA_ID}/${FILE_NAME}`;

const GENERATION =
  '123456789';

const JOB_NAME =
  'projects/823513556612/locations/me-central1/jobs/job-123';

const WORK_COLLECTION =
  'mediaTranscodeWork';

const CLAIM_COLLECTION =
  'mediaTranscodeWorkClaims';

let adminDb:
  Firestore;

let claimMediaTranscodeWork:
  ClaimModule[
    'claimMediaTranscodeWork'
  ];

let completeMediaTranscodeWork:
  CompletionModule[
    'completeMediaTranscodeWork'
  ];

let releaseMediaTranscodeWorkClaim:
  CompletionModule[
    'releaseMediaTranscodeWorkClaim'
  ];

function requireFirestoreEmulator(): void {
  if (
    !process.env
      .FIRESTORE_EMULATOR_HOST
  ) {
    throw new Error(
      'Media transcode completion tests require the Firestore Emulator.'
    );
  }
}

async function resetTestState(): Promise<void> {
  await Promise.all([
    adminDb
      .collection('media')
      .doc(MEDIA_ID)
      .delete(),
    adminDb
      .collection(WORK_COLLECTION)
      .doc(MEDIA_ID)
      .delete(),
    adminDb
      .collection(CLAIM_COLLECTION)
      .doc(MEDIA_ID)
      .delete(),
  ]);
}

async function createPendingWork(): Promise<void> {
  await Promise.all([
    adminDb
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
          'TRANSCODE_PENDING',
        verifiedGeneration:
          GENERATION,
        validatedGeneration:
          GENERATION,
        createdAtMs:
          1,
        updatedAtMs:
          1,
      }),

    adminDb
      .collection(WORK_COLLECTION)
      .doc(MEDIA_ID)
      .set({
        workId:
          MEDIA_ID,
        mediaId:
          MEDIA_ID,
        workType:
          'MEDIA_TRANSCODE',
        sourceObject:
          SOURCE_OBJECT,
        verifiedGeneration:
          GENERATION,
      }),
  ]);
}

async function readState() {
  const [
    media,
    work,
    claim,
  ] =
    await Promise.all([
      adminDb
        .collection('media')
        .doc(MEDIA_ID)
        .get(),
      adminDb
        .collection(WORK_COLLECTION)
        .doc(MEDIA_ID)
        .get(),
      adminDb
        .collection(CLAIM_COLLECTION)
        .doc(MEDIA_ID)
        .get(),
    ]);

  return {
    media,
    work,
    claim,
  };
}

before(
  async () => {
    requireFirestoreEmulator();

    const firebaseAdminModule =
      await import(
        '@/lib/firebase-admin'
      );

    const claimModule =
      await import(
        '@/lib/media-transcode-work-claim-authority'
      );

    const completionModule =
      await import(
        '@/lib/media-transcode-work-completion-authority'
      );

    adminDb =
      firebaseAdminModule.adminDb;

    claimMediaTranscodeWork =
      claimModule
        .claimMediaTranscodeWork;

    completeMediaTranscodeWork =
      completionModule
        .completeMediaTranscodeWork;

    releaseMediaTranscodeWorkClaim =
      completionModule
        .releaseMediaTranscodeWorkClaim;

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
  'atomically transitions pending media to TRANSCODING and consumes exact work and claim',
  async () => {
    await createPendingWork();

    const nowMs =
      1_800_000_000_000;

    const claim =
      await claimMediaTranscodeWork(
        MEDIA_ID,
        nowMs
      );

    assert.ok(claim);

    const result =
      await completeMediaTranscodeWork({
        mediaId:
          MEDIA_ID,
        claimId:
          claim.claimId,
        sourceObject:
          SOURCE_OBJECT,
        verifiedGeneration:
          GENERATION,
        transcoderJobName:
          JOB_NAME,
        nowMs:
          nowMs + 1,
      });

    assert.deepEqual(
      result,
      {
        mediaId:
          MEDIA_ID,
        status:
          'TRANSCODING',
        verifiedGeneration:
          GENERATION,
        transcoderJobName:
          JOB_NAME,
      }
    );

    const state =
      await readState();

    assert.equal(
      state.media.data()?.status,
      'TRANSCODING'
    );

    assert.equal(
      state.media.data()
        ?.transcoderJobName,
      JOB_NAME
    );

    assert.equal(
      state.media.data()
        ?.transcodeSubmittedGeneration,
      GENERATION
    );

    assert.equal(
      state.work.exists,
      false
    );

    assert.equal(
      state.claim.exists,
      false
    );
  }
);

test(
  'rejects the wrong or expired claimant without consuming retryable work',
  async () => {
    await createPendingWork();

    const claim =
      await claimMediaTranscodeWork(
        MEDIA_ID,
        1_800_000_000_000
      );

    assert.ok(claim);

    await assert.rejects(
      completeMediaTranscodeWork({
        mediaId:
          MEDIA_ID,
        claimId:
          'wrong-claim',
        sourceObject:
          SOURCE_OBJECT,
        verifiedGeneration:
          GENERATION,
        transcoderJobName:
          JOB_NAME,
        nowMs:
          claim.claimedAtMs + 1,
      }),
      /MEDIA_TRANSCODE_WORK_CLAIM_MISMATCH/
    );

    await assert.rejects(
      completeMediaTranscodeWork({
        mediaId:
          MEDIA_ID,
        claimId:
          claim.claimId,
        sourceObject:
          SOURCE_OBJECT,
        verifiedGeneration:
          GENERATION,
        transcoderJobName:
          JOB_NAME,
        nowMs:
          claim.leaseExpiresAtMs,
      }),
      /MEDIA_TRANSCODE_WORK_CLAIM_EXPIRED/
    );

    const state =
      await readState();

    assert.equal(
      state.media.data()?.status,
      'TRANSCODE_PENDING'
    );

    assert.equal(
      state.work.exists,
      true
    );

    assert.equal(
      state.claim.exists,
      true
    );
  }
);

test(
  'rejects stale media generation without consuming work or claim',
  async () => {
    await createPendingWork();

    const claim =
      await claimMediaTranscodeWork(
        MEDIA_ID,
        1_800_000_000_000
      );

    assert.ok(claim);

    await assert.rejects(
      completeMediaTranscodeWork({
        mediaId:
          MEDIA_ID,
        claimId:
          claim.claimId,
        sourceObject:
          SOURCE_OBJECT,
        verifiedGeneration:
          '987654321',
        transcoderJobName:
          JOB_NAME,
        nowMs:
          claim.claimedAtMs + 1,
      }),
      /MEDIA_TRANSCODE_MISMATCH/
    );

    const state =
      await readState();

    assert.equal(
      state.work.exists,
      true
    );

    assert.equal(
      state.claim.exists,
      true
    );
  }
);

test(
  'rejects media that is no longer TRANSCODE_PENDING',
  async () => {
    await createPendingWork();

    const claim =
      await claimMediaTranscodeWork(
        MEDIA_ID,
        1_800_000_000_000
      );

    assert.ok(claim);

    await adminDb
      .collection('media')
      .doc(MEDIA_ID)
      .update({
        status:
          'TRANSCODING',
      });

    await assert.rejects(
      completeMediaTranscodeWork({
        mediaId:
          MEDIA_ID,
        claimId:
          claim.claimId,
        sourceObject:
          SOURCE_OBJECT,
        verifiedGeneration:
          GENERATION,
        transcoderJobName:
          JOB_NAME,
        nowMs:
          claim.claimedAtMs + 1,
      }),
      /MEDIA_INVALID_TRANSCODE_TRANSITION/
    );
  }
);

test(
  'releases the exact claim while preserving durable transcode work for retry',
  async () => {
    await createPendingWork();

    const claim =
      await claimMediaTranscodeWork(
        MEDIA_ID,
        1_800_000_000_000
      );

    assert.ok(claim);

    assert.equal(
      await releaseMediaTranscodeWorkClaim(
        MEDIA_ID,
        claim.claimId
      ),
      true
    );

    const state =
      await readState();

    assert.equal(
      state.media.data()?.status,
      'TRANSCODE_PENDING'
    );

    assert.equal(
      state.work.exists,
      true
    );

    assert.equal(
      state.claim.exists,
      false
    );
  }
);

test(
  'does not let a stale claimant release a newer reclaimed lease',  async () => {
    await createPendingWork();

    const firstClaim =
      await claimMediaTranscodeWork(
        MEDIA_ID,
        1_800_000_000_000
      );

    assert.ok(firstClaim);

    const secondClaim =
      await claimMediaTranscodeWork(
        MEDIA_ID,
        firstClaim.leaseExpiresAtMs
      );

    assert.ok(secondClaim);

    assert.equal(
      await releaseMediaTranscodeWorkClaim(
        MEDIA_ID,
        firstClaim.claimId
      ),
      false
    );

    const state =
      await readState();

    assert.equal(
      state.claim.data()?.claimId,
      secondClaim.claimId
    );
  }
);
