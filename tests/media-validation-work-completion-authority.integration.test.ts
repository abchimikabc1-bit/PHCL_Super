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

import {
  MEDIA_VALIDATION_WORK_TYPE,
} from '@/lib/media-validation-work-authority';

import type {
  MediaContentProbe,
} from '@/lib/media-content-validation';

type MediaUploadTransitionModule =
  typeof import(
    '@/lib/media-upload-transition-authority'
  );

type MediaValidationWorkClaimModule =
  typeof import(
    '@/lib/media-validation-work-claim-authority'
  );

type MediaValidationWorkCompletionModule =
  typeof import(
    '@/lib/media-validation-work-completion-authority'
  );

const TEST_MEDIA_ID =
  'media_validation_work_completion_001';

const TEST_OWNER_ID =
  'media_validation_work_completion_owner_001';

const TEST_FILE_NAME =
  'video.mp4';

const TEST_SOURCE_OBJECT =
  `media/ingest/${TEST_OWNER_ID}/${TEST_MEDIA_ID}/${TEST_FILE_NAME}`;

const TEST_GENERATION =
  '123456789';

const MEDIA_VALIDATION_WORK_COLLECTION =
  'mediaValidationWork';

const MEDIA_VALIDATION_WORK_CLAIM_COLLECTION =
  'mediaValidationWorkClaims';

const MEDIA_TRANSCODE_WORK_COLLECTION =
  'mediaTranscodeWork';

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

let transitionVerifiedMediaToValidating:
  MediaUploadTransitionModule[
    'transitionVerifiedMediaToValidating'
  ];

let claimMediaValidationWork:
  MediaValidationWorkClaimModule[
    'claimMediaValidationWork'
  ];

let completeMediaValidationWork:
  MediaValidationWorkCompletionModule[
    'completeMediaValidationWork'
  ];

let releaseMediaValidationWorkClaim:
  MediaValidationWorkCompletionModule[
    'releaseMediaValidationWorkClaim'
  ];

function requireFirestoreEmulator():
  void {
  if (
    !process.env
      .FIRESTORE_EMULATOR_HOST
  ) {
    throw new Error(
      'Media validation work completion integration tests must run against the Firestore Emulator.'
    );
  }
}

async function resetTestState():
  Promise<void> {
  await Promise.all([
    adminDb
      .collection('media')
      .doc(TEST_MEDIA_ID)
      .delete(),

    adminDb
      .collection(
        MEDIA_VALIDATION_WORK_COLLECTION
      )
      .doc(TEST_MEDIA_ID)
      .delete(),

    adminDb
      .collection(
        MEDIA_VALIDATION_WORK_CLAIM_COLLECTION
      )
      .doc(TEST_MEDIA_ID)
      .delete(),

    adminDb
      .collection(
        MEDIA_TRANSCODE_WORK_COLLECTION
      )
      .doc(TEST_MEDIA_ID)
      .delete(),
  ]);
}

async function writeUploadingMedia():
  Promise<void> {
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
        'UPLOADING',

      createdAtMs:
        1,

      updatedAtMs:
        1,
    });
}

async function createValidatingWork():
  Promise<void> {
  await writeUploadingMedia();

  await transitionVerifiedMediaToValidating({
    mediaId:
      TEST_MEDIA_ID,

    sourceObject:
      TEST_SOURCE_OBJECT,

    generation:
      TEST_GENERATION,
  });
}

async function readMedia() {
  return adminDb
    .collection('media')
    .doc(TEST_MEDIA_ID)
    .get();
}

async function readWork() {
  return adminDb
    .collection(
      MEDIA_VALIDATION_WORK_COLLECTION
    )
    .doc(TEST_MEDIA_ID)
    .get();
}

async function readClaim() {
  return adminDb
    .collection(
      MEDIA_VALIDATION_WORK_CLAIM_COLLECTION
    )
    .doc(TEST_MEDIA_ID)
    .get();
}

async function readTranscodeWork() {
  return adminDb
    .collection(
      MEDIA_TRANSCODE_WORK_COLLECTION
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

    const uploadTransitionModule =
      await import(
        '@/lib/media-upload-transition-authority'
      );

    const claimModule =
      await import(
        '@/lib/media-validation-work-claim-authority'
      );

    const completionModule =
      await import(
        '@/lib/media-validation-work-completion-authority'
      );

    adminDb =
      firebaseAdminModule.adminDb;

    transitionVerifiedMediaToValidating =
      uploadTransitionModule
        .transitionVerifiedMediaToValidating;

    claimMediaValidationWork =
      claimModule
        .claimMediaValidationWork;

    completeMediaValidationWork =
      completionModule
        .completeMediaValidationWork;

    releaseMediaValidationWorkClaim =
      completionModule
        .releaseMediaValidationWorkClaim;

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
  'atomically completes valid media validation, consumes validation work and creates durable transcode work',
  async () => {
    await createValidatingWork();

    const nowMs =
      1_800_000_000_000;

    const claim =
      await claimMediaValidationWork(
        TEST_MEDIA_ID,
        nowMs
      );

    assert.ok(claim);

    const result =
      await completeMediaValidationWork({
        mediaId:
          TEST_MEDIA_ID,

        claimId:
          claim.claimId,

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

        nowMs:
          nowMs + 1,
      });

    assert.equal(
      result.mediaId,
      TEST_MEDIA_ID
    );

    assert.equal(
      result.status,
      'TRANSCODE_PENDING'
    );

    const [
      mediaSnapshot,
      workSnapshot,
      claimSnapshot,
      transcodeWorkSnapshot,
    ] =
      await Promise.all([
        readMedia(),
        readWork(),
        readClaim(),
        readTranscodeWork(),
      ]);

    assert.equal(
      mediaSnapshot.data()?.status,
      'TRANSCODE_PENDING'
    );

    assert.equal(
      mediaSnapshot.data()
        ?.validatedGeneration,
      TEST_GENERATION
    );

    assert.deepEqual(
      mediaSnapshot.data()
        ?.validationProbe,
      VALID_PROBE
    );

    assert.equal(
      workSnapshot.exists,
      false
    );

    assert.equal(
      claimSnapshot.exists,
      false
    );

    assert.deepEqual(
      transcodeWorkSnapshot.data(),
      {
        workId:
          TEST_MEDIA_ID,
        mediaId:
          TEST_MEDIA_ID,
        workType:
          'MEDIA_TRANSCODE',
        sourceObject:
          TEST_SOURCE_OBJECT,
        verifiedGeneration:
          TEST_GENERATION,
      }
    );
  }
);

test(
  'atomically completes semantic rejection and consumes durable work and claim',
  async () => {
    await createValidatingWork();

    const nowMs =
      1_800_000_000_000;

    const claim =
      await claimMediaValidationWork(
        TEST_MEDIA_ID,
        nowMs
      );

    assert.ok(claim);

    const result =
      await completeMediaValidationWork({
        mediaId:
          TEST_MEDIA_ID,

        claimId:
          claim.claimId,

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

        nowMs:
          nowMs + 1,
      });

    assert.equal(
      result.status,
      'REJECTED'
    );

    const [
      mediaSnapshot,
      workSnapshot,
      claimSnapshot,
      transcodeWorkSnapshot,
    ] =
      await Promise.all([
        readMedia(),
        readWork(),
        readClaim(),
        readTranscodeWork(),
      ]);

    assert.equal(
      mediaSnapshot.data()?.status,
      'REJECTED'
    );

    assert.equal(
      mediaSnapshot.data()
        ?.validationFailureReason,
      'INVALID_FRAME_RATE'
    );

    assert.equal(
      workSnapshot.exists,
      false
    );

    assert.equal(
      claimSnapshot.exists,
      false
    );

    assert.equal(
      transcodeWorkSnapshot.exists,
      false
    );
  }
);

test(
  'rejects completion by the wrong claimant without mutating media work or claim',
  async () => {
    await createValidatingWork();

    const nowMs =
      1_800_000_000_000;

    const claim =
      await claimMediaValidationWork(
        TEST_MEDIA_ID,
        nowMs
      );

    assert.ok(claim);

    await assert.rejects(
      completeMediaValidationWork({
        mediaId:
          TEST_MEDIA_ID,

        claimId:
          'wrong-claim-id',

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

        nowMs:
          nowMs + 1,
      }),
      /MEDIA_VALIDATION_WORK_CLAIM_MISMATCH/
    );

    const [
      mediaSnapshot,
      workSnapshot,
      claimSnapshot,
    ] =
      await Promise.all([
        readMedia(),
        readWork(),
        readClaim(),
      ]);

    assert.equal(
      mediaSnapshot.data()?.status,
      'VALIDATING'
    );

    assert.equal(
      workSnapshot.exists,
      true
    );

    assert.equal(
      claimSnapshot.exists,
      true
    );

    assert.equal(
      claimSnapshot.data()?.claimId,
      claim.claimId
    );
  }
);

test(
  'rejects completion after the claim lease expires without consuming retryable work',
  async () => {
    await createValidatingWork();

    const nowMs =
      1_800_000_000_000;

    const claim =
      await claimMediaValidationWork(
        TEST_MEDIA_ID,
        nowMs
      );

    assert.ok(claim);

    await assert.rejects(
      completeMediaValidationWork({
        mediaId:
          TEST_MEDIA_ID,

        claimId:
          claim.claimId,

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

        nowMs:
          claim.leaseExpiresAtMs,
      }),
      /MEDIA_VALIDATION_WORK_CLAIM_EXPIRED/
    );

    const [
      mediaSnapshot,
      workSnapshot,
      claimSnapshot,
    ] =
      await Promise.all([
        readMedia(),
        readWork(),
        readClaim(),
      ]);

    assert.equal(
      mediaSnapshot.data()?.status,
      'VALIDATING'
    );

    assert.equal(
      workSnapshot.exists,
      true
    );

    assert.equal(
      claimSnapshot.exists,
      true
    );
  }
);

test(
  'rejects stale validation identity without consuming durable work or claim',
  async () => {
    await createValidatingWork();

    const nowMs =
      1_800_000_000_000;

    const claim =
      await claimMediaValidationWork(
        TEST_MEDIA_ID,
        nowMs
      );

    assert.ok(claim);

    await assert.rejects(
      completeMediaValidationWork({
        mediaId:
          TEST_MEDIA_ID,

        claimId:
          claim.claimId,

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

        nowMs:
          nowMs + 1,
      }),
      /MEDIA_VALIDATION_MISMATCH/
    );

    const [
      mediaSnapshot,
      workSnapshot,
      claimSnapshot,
    ] =
      await Promise.all([
        readMedia(),
        readWork(),
        readClaim(),
      ]);

    assert.equal(
      mediaSnapshot.data()?.status,
      'VALIDATING'
    );

    assert.equal(
      workSnapshot.exists,
      true
    );

    assert.equal(
      claimSnapshot.exists,
      true
    );
  }
);

test(
  'releases the current claim while preserving durable validation work for retry',
  async () => {
    await createValidatingWork();

    const nowMs =
      1_800_000_000_000;

    const claim =
      await claimMediaValidationWork(
        TEST_MEDIA_ID,
        nowMs
      );

    assert.ok(claim);

    const released =
      await releaseMediaValidationWorkClaim(
        TEST_MEDIA_ID,
        claim.claimId
      );

    assert.equal(
      released,
      true
    );

    const [
      mediaSnapshot,
      workSnapshot,
      claimSnapshot,
    ] =
      await Promise.all([
        readMedia(),
        readWork(),
        readClaim(),
      ]);

    assert.equal(
      mediaSnapshot.data()?.status,
      'VALIDATING'
    );

    assert.equal(
      workSnapshot.exists,
      true
    );

    assert.equal(
      workSnapshot.data()?.workType,
      MEDIA_VALIDATION_WORK_TYPE
    );

    assert.equal(
      claimSnapshot.exists,
      false
    );
  }
);

test(
  'does not let a stale claimant release a newer reclaimed lease',
  async () => {
    await createValidatingWork();

    const nowMs =
      1_800_000_000_000;

    const firstClaim =
      await claimMediaValidationWork(
        TEST_MEDIA_ID,
        nowMs
      );

    assert.ok(firstClaim);

    const secondClaim =
      await claimMediaValidationWork(
        TEST_MEDIA_ID,
        firstClaim.leaseExpiresAtMs
      );

    assert.ok(secondClaim);

    assert.notEqual(
      secondClaim.claimId,
      firstClaim.claimId
    );

    const released =
      await releaseMediaValidationWorkClaim(
        TEST_MEDIA_ID,
        firstClaim.claimId
      );

    assert.equal(
      released,
      false
    );

    const claimSnapshot =
      await readClaim();

    assert.equal(
      claimSnapshot.exists,
      true
    );

    assert.equal(
      claimSnapshot.data()?.claimId,
      secondClaim.claimId
    );
  }
);
