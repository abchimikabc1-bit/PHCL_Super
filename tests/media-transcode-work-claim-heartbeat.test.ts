import test from 'node:test';
import assert from 'node:assert/strict';

import {
  startMediaTranscodeWorkClaimHeartbeatWithDependencies,
} from '@/lib/media-transcode-work-claim-heartbeat';

import type {
  MediaTranscodeWorkClaim,
} from '@/lib/media-transcode-work-claim-authority';

const MEDIA_ID =
  'media-transcode-heartbeat-test';

const CLAIM_ID =
  'media-transcode-heartbeat-claim';

const RENEWAL_NOW_MS =
  61_000;

const RENEWED_CLAIM:
  MediaTranscodeWorkClaim = {
    claimId:
      CLAIM_ID,
    workId:
      MEDIA_ID,
    mediaId:
      MEDIA_ID,
    workType:
      'MEDIA_TRANSCODE',
    sourceObject:
      `media/ingest/owner/${MEDIA_ID}/source.mp4`,
    verifiedGeneration:
      '17',
    claimedAtMs:
      1_000,
    leaseExpiresAtMs:
      181_000,
  };

function createControlledScheduler() {
  let callback:
    (() => void) | null = null;

  let cleared = false;

  return {
    schedule(
      scheduledCallback: () => void,
      delayMs: number
    ): unknown {
      assert.equal(
        delayMs,
        60_000
      );

      assert.equal(
        callback,
        null
      );

      callback =
        scheduledCallback;

      cleared = false;

      return {
        heartbeatTimer: true,
      };
    },

    clear(
      timer: unknown
    ): void {
      assert.deepEqual(
        timer,
        {
          heartbeatTimer: true,
        }
      );

      cleared = true;
      callback = null;
    },

    fire(): void {
      assert.ok(callback);

      const scheduledCallback =
        callback;

      callback = null;

      scheduledCallback();
    },

    hasScheduledCallback(): boolean {
      return callback !== null;
    },

    wasCleared(): boolean {
      return cleared;
    },
  };
}

async function settleRenewal(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

test(
  'renews the exact transcode claim and schedules the next heartbeat',
  async () => {
    const scheduler =
      createControlledScheduler();

    const calls:
      Array<{
        mediaId: string;
        claimId: string;
        nowMs: number;
      }> = [];

    const heartbeat =
      startMediaTranscodeWorkClaimHeartbeatWithDependencies(
        MEDIA_ID,
        CLAIM_ID,
        {
          nowMs: () =>
            RENEWAL_NOW_MS,

          schedule:
            scheduler.schedule,

          clear:
            scheduler.clear,

          renewMediaTranscodeWorkClaim:
            async (
              mediaId,
              claimId,
              nowMs
            ) => {
              calls.push({
                mediaId,
                claimId,
                nowMs,
              });

              return RENEWED_CLAIM;
            },
        }
      );

    scheduler.fire();

    await settleRenewal();

    assert.deepEqual(
      calls,
      [
        {
          mediaId:
            MEDIA_ID,
          claimId:
            CLAIM_ID,
          nowMs:
            RENEWAL_NOW_MS,
        },
      ]
    );

    assert.equal(
      scheduler.hasScheduledCallback(),
      true
    );

    assert.equal(
      await heartbeat.stopAndWait(),
      true
    );

    assert.equal(
      scheduler.wasCleared(),
      true
    );
  }
);

test(
  'reports lost ownership when exact claim renewal is rejected',
  async () => {
    const scheduler =
      createControlledScheduler();

    const heartbeat =
      startMediaTranscodeWorkClaimHeartbeatWithDependencies(
        MEDIA_ID,
        CLAIM_ID,
        {
          nowMs: () =>
            RENEWAL_NOW_MS,
          schedule:
            scheduler.schedule,
          clear:
            scheduler.clear,
          renewMediaTranscodeWorkClaim:
            async () =>
              null,
        }
      );

    scheduler.fire();

    await settleRenewal();

    assert.equal(
      scheduler.hasScheduledCallback(),
      false
    );

    assert.equal(
      await heartbeat.stopAndWait(),
      false
    );
  }
);

test(
  'reports lost ownership when renewal throws',
  async () => {
    const scheduler =
      createControlledScheduler();

    const heartbeat =
      startMediaTranscodeWorkClaimHeartbeatWithDependencies(
        MEDIA_ID,
        CLAIM_ID,
        {
          nowMs: () =>
            RENEWAL_NOW_MS,
          schedule:
            scheduler.schedule,
          clear:
            scheduler.clear,
          renewMediaTranscodeWorkClaim:
            async () => {
              throw new Error(
                'TRANSCODE_RENEWAL_FAILED'
              );
            },
        }
      );

    scheduler.fire();

    await settleRenewal();

    assert.equal(
      await heartbeat.stopAndWait(),
      false
    );
  }
);

test(
  'does not overlap transcode claim renewals and waits for an in-flight renewal',
  async () => {
    const scheduler =
      createControlledScheduler();

    let resolveRenewal:
      (
        value:
          MediaTranscodeWorkClaim | null
      ) => void =
        () => {
          throw new Error(
            'RENEWAL_RESOLVER_NOT_READY'
          );
        };

    const renewalPromise =
      new Promise<
        MediaTranscodeWorkClaim | null
      >((resolve) => {
        resolveRenewal =
          resolve;
      });

    let renewalCount = 0;

    const heartbeat =
      startMediaTranscodeWorkClaimHeartbeatWithDependencies(
        MEDIA_ID,
        CLAIM_ID,
        {
          nowMs: () =>
            RENEWAL_NOW_MS,
          schedule:
            scheduler.schedule,
          clear:
            scheduler.clear,
          renewMediaTranscodeWorkClaim:
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

    let stopSettled = false;

    const stopPromise =
      heartbeat
        .stopAndWait()
        .then(
          (retained) => {
            stopSettled = true;

            return retained;
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

    assert.equal(
      await stopPromise,
      true
    );

    assert.equal(
      renewalCount,
      1
    );

    assert.equal(
      scheduler.hasScheduledCallback(),
      false
    );
  }
);

test(
  'stopping before the first heartbeat prevents every renewal',
  async () => {
    const scheduler =
      createControlledScheduler();

    let renewalCount = 0;

    const heartbeat =
      startMediaTranscodeWorkClaimHeartbeatWithDependencies(
        MEDIA_ID,
        CLAIM_ID,
        {
          nowMs: () =>
            RENEWAL_NOW_MS,
          schedule:
            scheduler.schedule,
          clear:
            scheduler.clear,
          renewMediaTranscodeWorkClaim:
            async () => {
              renewalCount += 1;

              return RENEWED_CLAIM;
            },
        }
      );

    assert.equal(
      await heartbeat.stopAndWait(),
      true
    );

    assert.equal(
      renewalCount,
      0
    );

    assert.equal(
      scheduler.hasScheduledCallback(),
      false
    );
  }
);
