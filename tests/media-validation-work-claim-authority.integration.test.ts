import 'server-only';

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adminDb,
} from '@/lib/firebase-admin';

import {
  MEDIA_VALIDATION_WORK_TYPE,
} from '@/lib/media-validation-work-authority';

import {
  claimMediaValidationWork,
  renewMediaValidationWorkClaim,
} from '@/lib/media-validation-work-claim-authority';

const MEDIA_VALIDATION_WORK_COLLECTION =
  'mediaValidationWork';

const MEDIA_VALIDATION_WORK_CLAIM_COLLECTION =
  'mediaValidationWorkClaims';

const TEST_MEDIA_ID =
  'media-validation-work-claim-test';

async function deleteTestState(): Promise<void> {
  await Promise.all([
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
  ]);
}

async function createTestWork(): Promise<void> {
  await adminDb
    .collection(
      MEDIA_VALIDATION_WORK_COLLECTION
    )
    .doc(TEST_MEDIA_ID)
    .set({
      workId:
        TEST_MEDIA_ID,

      mediaId:
        TEST_MEDIA_ID,

      workType:
        MEDIA_VALIDATION_WORK_TYPE,
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
  'atomically claims authoritative durable validation work',
  async () => {
    await createTestWork();

    const nowMs =
      1_800_000_000_000;

    const claim =
      await claimMediaValidationWork(
        TEST_MEDIA_ID,
        nowMs
      );

    assert.ok(claim);

    assert.equal(
      claim.mediaId,
      TEST_MEDIA_ID
    );

    assert.equal(
      claim.workId,
      TEST_MEDIA_ID
    );

    assert.equal(
      claim.workType,
      MEDIA_VALIDATION_WORK_TYPE
    );

    assert.equal(
      claim.claimedAtMs,
      nowMs
    );

    assert.ok(
      claim.leaseExpiresAtMs >
        claim.claimedAtMs
    );

    assert.match(
      claim.claimId,
      /^[A-Za-z0-9_-]+$/
    );

    const snapshot =
      await adminDb
        .collection(
          MEDIA_VALIDATION_WORK_CLAIM_COLLECTION
        )
        .doc(TEST_MEDIA_ID)
        .get();

    assert.equal(
      snapshot.exists,
      true
    );

    assert.deepEqual(
      snapshot.data(),
      claim
    );
  }
);

test(
  'does not replace an active validation work claim',
  async () => {
    await createTestWork();

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
        nowMs + 1
      );

    assert.equal(
      secondClaim,
      null
    );

    const snapshot =
      await adminDb
        .collection(
          MEDIA_VALIDATION_WORK_CLAIM_COLLECTION
        )
        .doc(TEST_MEDIA_ID)
        .get();

    assert.deepEqual(
      snapshot.data(),
      firstClaim
    );
  }
);

test(
  'reclaims validation work after the previous lease expires',
  async () => {
    await createTestWork();

    const firstClaim =
      await claimMediaValidationWork(
        TEST_MEDIA_ID,
        1_800_000_000_000
      );

    assert.ok(firstClaim);

    const reclaimed =
      await claimMediaValidationWork(
        TEST_MEDIA_ID,
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

    assert.ok(
      reclaimed.leaseExpiresAtMs >
        reclaimed.claimedAtMs
    );

    const snapshot =
      await adminDb
        .collection(
          MEDIA_VALIDATION_WORK_CLAIM_COLLECTION
        )
        .doc(TEST_MEDIA_ID)
        .get();

    assert.deepEqual(
      snapshot.data(),
      reclaimed
    );
  }
);

test(
  'does not claim missing durable validation work',
  async () => {
    const claim =
      await claimMediaValidationWork(
        TEST_MEDIA_ID,
        1_800_000_000_000
      );

    assert.equal(
      claim,
      null
    );

    const snapshot =
      await adminDb
        .collection(
          MEDIA_VALIDATION_WORK_CLAIM_COLLECTION
        )
        .doc(TEST_MEDIA_ID)
        .get();

    assert.equal(
      snapshot.exists,
      false
    );
  }
);

test(
  'rejects malformed authoritative durable validation work without creating a claim',
  async () => {
    await adminDb
      .collection(
        MEDIA_VALIDATION_WORK_COLLECTION
      )
      .doc(TEST_MEDIA_ID)
      .set({
        workId:
          TEST_MEDIA_ID,

        mediaId:
          TEST_MEDIA_ID,

        workType:
          'OTHER_WORK_TYPE',
      });

    await assert.rejects(
      () =>
        claimMediaValidationWork(
          TEST_MEDIA_ID,
          1_800_000_000_000
        ),
      /INVALID_MEDIA_VALIDATION_WORK/
    );

    const snapshot =
      await adminDb
        .collection(
          MEDIA_VALIDATION_WORK_CLAIM_COLLECTION
        )
        .doc(TEST_MEDIA_ID)
        .get();

    assert.equal(
      snapshot.exists,
      false
    );
  }
);

test(
  'allows only one concurrent claimant to acquire the active lease',
  async () => {
    await createTestWork();

    const nowMs =
      1_800_000_000_000;

    const [
      firstResult,
      secondResult,
    ] =
      await Promise.all([
        claimMediaValidationWork(
          TEST_MEDIA_ID,
          nowMs
        ),

        claimMediaValidationWork(
          TEST_MEDIA_ID,
          nowMs
        ),
      ]);

    const successfulClaims =
      [
        firstResult,
        secondResult,
      ].filter(
        (claim) =>
          claim !== null
      );

    assert.equal(
      successfulClaims.length,
      1
    );

    const snapshot =
      await adminDb
        .collection(
          MEDIA_VALIDATION_WORK_CLAIM_COLLECTION
        )
        .doc(TEST_MEDIA_ID)
        .get();

    assert.equal(
      snapshot.exists,
      true
    );

    assert.deepEqual(
      snapshot.data(),
      successfulClaims[0]
    );
  }
);

test(
  'atomically renews the exact active validation work claim',
  async () => {
    await createTestWork();

    const claimedAtMs =
      1_800_000_000_000;

    const claim =
      await claimMediaValidationWork(
        TEST_MEDIA_ID,
        claimedAtMs
      );

    assert.ok(claim);

    const renewalNowMs =
      claimedAtMs + 60_000;

    const renewed =
      await renewMediaValidationWorkClaim(
        TEST_MEDIA_ID,
        claim.claimId,
        renewalNowMs
      );

    assert.ok(renewed);

    assert.equal(
      renewed.claimId,
      claim.claimId
    );

    assert.equal(
      renewed.workId,
      claim.workId
    );

    assert.equal(
      renewed.mediaId,
      claim.mediaId
    );

    assert.equal(
      renewed.workType,
      claim.workType
    );

    assert.equal(
      renewed.claimedAtMs,
      claim.claimedAtMs
    );

    assert.ok(
      renewed.leaseExpiresAtMs >
        claim.leaseExpiresAtMs
    );

    assert.ok(
      renewed.leaseExpiresAtMs >
        renewalNowMs
    );

    const snapshot =
      await adminDb
        .collection(
          MEDIA_VALIDATION_WORK_CLAIM_COLLECTION
        )
        .doc(TEST_MEDIA_ID)
        .get();

    assert.deepEqual(
      snapshot.data(),
      renewed
    );
  }
);

test(
  'does not renew a validation work claim for a stale claimant',
  async () => {
    await createTestWork();

    const claim =
      await claimMediaValidationWork(
        TEST_MEDIA_ID,
        1_800_000_000_000
      );

    assert.ok(claim);

    const renewed =
      await renewMediaValidationWorkClaim(
        TEST_MEDIA_ID,
        'stale-validation-work-claim',
        claim.claimedAtMs + 60_000
      );

    assert.equal(
      renewed,
      null
    );

    const snapshot =
      await adminDb
        .collection(
          MEDIA_VALIDATION_WORK_CLAIM_COLLECTION
        )
        .doc(TEST_MEDIA_ID)
        .get();

    assert.deepEqual(
      snapshot.data(),
      claim
    );
  }
);

test(
  'does not resurrect an expired validation work claim',
  async () => {
    await createTestWork();

    const claim =
      await claimMediaValidationWork(
        TEST_MEDIA_ID,
        1_800_000_000_000
      );

    assert.ok(claim);

    const renewed =
      await renewMediaValidationWorkClaim(
        TEST_MEDIA_ID,
        claim.claimId,
        claim.leaseExpiresAtMs
      );

    assert.equal(
      renewed,
      null
    );

    const snapshot =
      await adminDb
        .collection(
          MEDIA_VALIDATION_WORK_CLAIM_COLLECTION
        )
        .doc(TEST_MEDIA_ID)
        .get();

    assert.deepEqual(
      snapshot.data(),
      claim
    );
  }
);

test(
  'does not renew a claim when durable validation work is missing',
  async () => {
    await createTestWork();

    const claim =
      await claimMediaValidationWork(
        TEST_MEDIA_ID,
        1_800_000_000_000
      );

    assert.ok(claim);

    await adminDb
      .collection(
        MEDIA_VALIDATION_WORK_COLLECTION
      )
      .doc(TEST_MEDIA_ID)
      .delete();

    const renewed =
      await renewMediaValidationWorkClaim(
        TEST_MEDIA_ID,
        claim.claimId,
        claim.claimedAtMs + 60_000
      );

    assert.equal(
      renewed,
      null
    );

    const snapshot =
      await adminDb
        .collection(
          MEDIA_VALIDATION_WORK_CLAIM_COLLECTION
        )
        .doc(TEST_MEDIA_ID)
        .get();

    assert.deepEqual(
      snapshot.data(),
      claim
    );
  }
);