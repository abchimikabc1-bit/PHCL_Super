import 'server-only';

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adminDb,
} from '@/lib/firebase-admin';

import {
  MEDIA_TRANSCODE_WORK_TYPE,
} from '@/lib/media-transcode-work-authority';

import {
  claimMediaTranscodeWork,
  renewMediaTranscodeWorkClaim,
} from '@/lib/media-transcode-work-claim-authority';

const WORK_COLLECTION =
  'mediaTranscodeWork';

const CLAIM_COLLECTION =
  'mediaTranscodeWorkClaims';

const MEDIA_ID =
  'media-transcode-claim-test';

const SOURCE_OBJECT =
  `media/ingest/owner/${MEDIA_ID}/source.mp4`;

const VERIFIED_GENERATION =
  '17';

async function deleteTestState(): Promise<void> {
  await Promise.all([
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

async function createTestWork(): Promise<void> {
  await adminDb
    .collection(WORK_COLLECTION)
    .doc(MEDIA_ID)
    .set({
      workId:
        MEDIA_ID,
      mediaId:
        MEDIA_ID,
      workType:
        MEDIA_TRANSCODE_WORK_TYPE,
      sourceObject:
        SOURCE_OBJECT,
      verifiedGeneration:
        VERIFIED_GENERATION,
    });
}

test.beforeEach(
  async () => {
    await deleteTestState();
  }
);

test.after(
  async () => {
    await deleteTestState();
  }
);

test(
  'atomically claims authoritative durable transcode work',
  async () => {
    await createTestWork();

    const nowMs =
      1_800_000_000_000;

    const claim =
      await claimMediaTranscodeWork(
        MEDIA_ID,
        nowMs
      );

    assert.ok(claim);

    assert.equal(
      claim.mediaId,
      MEDIA_ID
    );

    assert.equal(
      claim.sourceObject,
      SOURCE_OBJECT
    );

    assert.equal(
      claim.verifiedGeneration,
      VERIFIED_GENERATION
    );

    assert.equal(
      claim.claimedAtMs,
      nowMs
    );

    assert.equal(
      claim.leaseExpiresAtMs,
      nowMs + 120_000
    );

    const snapshot =
      await adminDb
        .collection(CLAIM_COLLECTION)
        .doc(MEDIA_ID)
        .get();

    assert.deepEqual(
      snapshot.data(),
      claim
    );
  }
);

test(
  'allows only one concurrent transcode claimant',
  async () => {
    await createTestWork();

    const nowMs =
      1_800_000_000_000;

    const results =
      await Promise.all([
        claimMediaTranscodeWork(
          MEDIA_ID,
          nowMs
        ),
        claimMediaTranscodeWork(
          MEDIA_ID,
          nowMs
        ),
      ]);

    assert.equal(
      results.filter(
        (value) =>
          value !== null
      ).length,
      1
    );
  }
);

test(
  'does not replace an active claim and reclaims an expired lease',
  async () => {
    await createTestWork();

    const firstClaim =
      await claimMediaTranscodeWork(
        MEDIA_ID,
        1_800_000_000_000
      );

    assert.ok(firstClaim);

    assert.equal(
      await claimMediaTranscodeWork(
        MEDIA_ID,
        firstClaim.claimedAtMs + 1
      ),
      null
    );

    const reclaimed =
      await claimMediaTranscodeWork(
        MEDIA_ID,
        firstClaim.leaseExpiresAtMs
      );

    assert.ok(reclaimed);

    assert.notEqual(
      reclaimed.claimId,
      firstClaim.claimId
    );

    assert.equal(
      reclaimed.claimedAtMs,
      firstClaim.leaseExpiresAtMs
    );
  }
);

test(
  'does not claim missing work and rejects malformed work',
  async () => {
    assert.equal(
      await claimMediaTranscodeWork(
        MEDIA_ID,
        1_800_000_000_000
      ),
      null
    );

    await adminDb
      .collection(WORK_COLLECTION)
      .doc(MEDIA_ID)
      .set({
        workId:
          MEDIA_ID,
        mediaId:
          MEDIA_ID,
        workType:
          'OTHER_WORK_TYPE',
        sourceObject:
          SOURCE_OBJECT,
        verifiedGeneration:
          VERIFIED_GENERATION,
      });

    await assert.rejects(
      claimMediaTranscodeWork(
        MEDIA_ID,
        1_800_000_000_000
      ),
      /INVALID_MEDIA_TRANSCODE_WORK/
    );

    const claimSnapshot =
      await adminDb
        .collection(CLAIM_COLLECTION)
        .doc(MEDIA_ID)
        .get();

    assert.equal(
      claimSnapshot.exists,
      false
    );
  }
);

test(
  'renews only the exact active claim',
  async () => {
    await createTestWork();

    const claim =
      await claimMediaTranscodeWork(
        MEDIA_ID,
        1_800_000_000_000
      );

    assert.ok(claim);

    assert.equal(
      await renewMediaTranscodeWorkClaim(
        MEDIA_ID,
        'stale-claim-id',
        claim.claimedAtMs + 60_000
      ),
      null
    );

    const renewed =
      await renewMediaTranscodeWorkClaim(
        MEDIA_ID,
        claim.claimId,
        claim.claimedAtMs + 60_000
      );

    assert.ok(renewed);

    assert.equal(
      renewed.claimId,
      claim.claimId
    );

    assert.equal(
      renewed.claimedAtMs,
      claim.claimedAtMs
    );

    assert.equal(
      renewed.leaseExpiresAtMs,
      claim.claimedAtMs + 180_000
    );
  }
);

test(
  'does not renew an expired claim or a claim whose work identity changed',
  async () => {
    await createTestWork();

    const claim =
      await claimMediaTranscodeWork(
        MEDIA_ID,
        1_800_000_000_000
      );

    assert.ok(claim);

    assert.equal(
      await renewMediaTranscodeWorkClaim(
        MEDIA_ID,
        claim.claimId,
        claim.leaseExpiresAtMs
      ),
      null
    );

    await adminDb
      .collection(WORK_COLLECTION)
      .doc(MEDIA_ID)
      .set({
        workId:
          MEDIA_ID,
        mediaId:
          MEDIA_ID,
        workType:
          MEDIA_TRANSCODE_WORK_TYPE,
        sourceObject:
          SOURCE_OBJECT,
        verifiedGeneration:
          '18',
      });

    assert.equal(
      await renewMediaTranscodeWorkClaim(
        MEDIA_ID,
        claim.claimId,
        claim.claimedAtMs + 60_000
      ),
      null
    );
  }
);
