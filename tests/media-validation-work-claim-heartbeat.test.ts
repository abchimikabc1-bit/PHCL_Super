import test from 'node:test';
import assert from 'node:assert/strict';

import {
  startMediaValidationWorkClaimHeartbeatWithDependencies,
} from '@/lib/media-validation-work-claim-heartbeat';

import type {
  MediaValidationWorkClaim,
} from '@/lib/media-validation-work-claim-authority';

const MEDIA_ID =
  'media-validation-heartbeat-test';

const CLAIM_ID =
  'media-validation-heartbeat-claim';

const CLAIMED_AT_MS =
  1_000;

const INITIAL_LEASE_EXPIRES_AT_MS =
  121_000;

const RENEWED_LEASE_EXPIRES_AT_MS =
  181_000;

const RENEWAL_NOW_MS =
  61_000;

const CLAIM: MediaValidationWorkClaim = {
  claimId: CLAIM_ID,
  workId: MEDIA_ID,
  mediaId: MEDIA_ID,
  workType: 'MEDIA_CONTENT_VALIDATION',
  claimedAtMs: CLAIMED_AT_MS,
  leaseExpiresAtMs:
    INITIAL_LEASE_EXPIRES_AT_MS,
};

const RENEWED_CLAIM:
  MediaValidationWorkClaim = {
    ...CLAIM,
    leaseExpiresAtMs:
      RENEWED_LEASE_EXPIRES_AT_MS,
  };

type ScheduledCallback =
  (() => void) | null;

function createControlledScheduler() {
  let scheduledCallback:
    ScheduledCallback = null;

  let cleared = false;

  const schedule = (
    callback: () => void,
    delayMs: number
  ): unknown => {
    assert.equal(
      delayMs,
      60_000
    );

    assert.equal(
      scheduledCallback,
      null
    );

    scheduledCallback =
      callback;

    cleared = false;

    return {
      heartbeatTimer: true,
    };
  };

  const clear = (
    timer: unknown
  ): void => {
    assert.deepEqual(
      timer,
      {
        heartbeatTimer: true,
      }
    );

    cleared = true;
    scheduledCallback = null;
  };

  const fire = (): void => {
    assert.ok(
      scheduledCallback
    );

    const callback =
      scheduledCallback;

    scheduledCallback = null;

    callback();
  };

  const hasScheduledCallback =
    (): boolean =>
      scheduledCallback !== null;

  const wasCleared =
    (): boolean =>
      cleared;

  return {
    schedule,
    clear,
    fire,
    hasScheduledCallback,
    wasCleared,
  };
}

test(
  'renews the exact active validation work claim and schedules the next heartbeat',
  async () => {
    const scheduler =
      createControlledScheduler();

    const renewalCalls:
      Array<{
        mediaId: string;
        claimId: string;
        nowMs: number;
      }> = [];

    const heartbeat =
      startMediaValidationWorkClaimHeartbeatWithDependencies(
        MEDIA_ID,
        CLAIM_ID,
        {
          nowMs: () =>
            RENEWAL_NOW_MS,

          schedule:
            scheduler.schedule,

          clear:
            scheduler.clear,

          renewMediaValidationWorkClaim:
            async (
              mediaId,
              claimId,
              nowMs
            ) => {
              renewalCalls.push({
                mediaId,
                claimId,
                nowMs,
              });

              return RENEWED_CLAIM;
            },
        }
      );

    assert.equal(
      scheduler.hasScheduledCallback(),
      true
    );

    scheduler.fire();

    await Promise.resolve();
    await Promise.resolve();

    assert.deepEqual(
      renewalCalls,
      [
        {
          mediaId: MEDIA_ID,
          claimId: CLAIM_ID,
          nowMs: RENEWAL_NOW_MS,
        },
      ]
    );

    assert.equal(
      scheduler.hasScheduledCallback(),
      true
    );

    const ownershipRetained =
      await heartbeat.stopAndWait();

    assert.equal(
      ownershipRetained,
      true
    );

    assert.equal(
      scheduler.wasCleared(),
      true
    );

    assert.equal(
      scheduler.hasScheduledCallback(),
      false
    );
  }
);

test(
  'marks claim ownership lost when exact renewal is rejected',
  async () => {
    const scheduler =
      createControlledScheduler();

    const heartbeat =
      startMediaValidationWorkClaimHeartbeatWithDependencies(
        MEDIA_ID,
        CLAIM_ID,
        {
          nowMs: () =>
            RENEWAL_NOW_MS,

          schedule:
            scheduler.schedule,

          clear:
            scheduler.clear,

          renewMediaValidationWorkClaim:
            async () =>
              null,
        }
      );

    scheduler.fire();

    await Promise.resolve();
    await Promise.resolve();

    assert.equal(
      scheduler.hasScheduledCallback(),
      false
    );

    const ownershipRetained =
      await heartbeat.stopAndWait();

    assert.equal(
      ownershipRetained,
      false
    );
  }
);

test(
  'marks claim ownership lost when renewal throws',
  async () => {
    const scheduler =
      createControlledScheduler();

    const renewalError =
      new Error(
        'MEDIA_VALIDATION_RENEWAL_FAILURE'
      );

    const heartbeat =
      startMediaValidationWorkClaimHeartbeatWithDependencies(
        MEDIA_ID,
        CLAIM_ID,
        {
          nowMs: () =>
            RENEWAL_NOW_MS,

          schedule:
            scheduler.schedule,

          clear:
            scheduler.clear,

          renewMediaValidationWorkClaim:
            async () => {
              throw renewalError;
            },
        }
      );

    scheduler.fire();

    await Promise.resolve();
    await Promise.resolve();

    assert.equal(
      scheduler.hasScheduledCallback(),
      false
    );

    const ownershipRetained =
      await heartbeat.stopAndWait();

    assert.equal(
      ownershipRetained,
      false
    );
  }
);

test(
  'does not overlap validation work claim renewals',
  async () => {
    const scheduler =
      createControlledScheduler();

    let resolveRenewal:
      (
        value:
          MediaValidationWorkClaim | null
      ) => void =
        () => {
          throw new Error(
            'RENEWAL_RESOLVER_NOT_READY'
          );
        };

    const renewalPromise =
      new Promise<
        MediaValidationWorkClaim | null
      >((resolve) => {
        resolveRenewal =
          resolve;
      });

    let renewalCount = 0;

    const heartbeat =
      startMediaValidationWorkClaimHeartbeatWithDependencies(
        MEDIA_ID,
        CLAIM_ID,
        {
          nowMs: () =>
            RENEWAL_NOW_MS,

          schedule:
            scheduler.schedule,

          clear:
            scheduler.clear,

          renewMediaValidationWorkClaim:
            async () => {
              renewalCount += 1;

              return renewalPromise;
            },
        }
      );

    scheduler.fire();

    await Promise.resolve();

    assert.equal(
      renewalCount,
      1
    );

    assert.equal(
      scheduler.hasScheduledCallback(),
      false
    );

    resolveRenewal(
      RENEWED_CLAIM
    );

    await renewalPromise;
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(
      renewalCount,
      1
    );

    assert.equal(
      scheduler.hasScheduledCallback(),
      true
    );

    const ownershipRetained =
      await heartbeat.stopAndWait();

    assert.equal(
      ownershipRetained,
      true
    );
  }
);

test(
  'stopAndWait prevents future renewals after the heartbeat is stopped',
  async () => {
    const scheduler =
      createControlledScheduler();

    let renewalCount = 0;

    const heartbeat =
      startMediaValidationWorkClaimHeartbeatWithDependencies(
        MEDIA_ID,
        CLAIM_ID,
        {
          nowMs: () =>
            RENEWAL_NOW_MS,

          schedule:
            scheduler.schedule,

          clear:
            scheduler.clear,

          renewMediaValidationWorkClaim:
            async () => {
              renewalCount += 1;

              return RENEWED_CLAIM;
            },
        }
      );

    assert.equal(
      scheduler.hasScheduledCallback(),
      true
    );

    const ownershipRetained =
      await heartbeat.stopAndWait();

    assert.equal(
      ownershipRetained,
      true
    );

    assert.equal(
      scheduler.hasScheduledCallback(),
      false
    );

    assert.equal(
      renewalCount,
      0
    );
  }
);

test(
  'stopAndWait waits for an in-flight renewal before reporting ownership',
  async () => {
    const scheduler =
      createControlledScheduler();

    let resolveRenewal:
      (
        value:
          MediaValidationWorkClaim | null
      ) => void =
        () => {
          throw new Error(
            'RENEWAL_RESOLVER_NOT_READY'
          );
        };

    const renewalPromise =
      new Promise<
        MediaValidationWorkClaim | null
      >((resolve) => {
        resolveRenewal =
          resolve;
      });

    const heartbeat =
      startMediaValidationWorkClaimHeartbeatWithDependencies(
        MEDIA_ID,
        CLAIM_ID,
        {
          nowMs: () =>
            RENEWAL_NOW_MS,

          schedule:
            scheduler.schedule,

          clear:
            scheduler.clear,

          renewMediaValidationWorkClaim:
            async () =>
              renewalPromise,
        }
      );

    scheduler.fire();

    await Promise.resolve();

    let stopSettled = false;

    const stopPromise =
      heartbeat
        .stopAndWait()
        .then(
          (ownershipRetained) => {
            stopSettled = true;

            return ownershipRetained;
          }
        );

    await Promise.resolve();

    assert.equal(
      stopSettled,
      false
    );

    resolveRenewal(
      RENEWED_CLAIM
    );

    const ownershipRetained =
      await stopPromise;

    assert.equal(
      ownershipRetained,
      true
    );

    assert.equal(
      scheduler.hasScheduledCallback(),
      false
    );
  }
);