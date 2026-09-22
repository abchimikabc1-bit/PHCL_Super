import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  MediaTranscodeWorkClaim,
} from '@/lib/media-transcode-work-claim-authority';

import type {
  MediaTranscodeWorkCompletionResult,
} from '@/lib/media-transcode-work-completion-authority';

import {
  executeMediaTranscodeWorkWithDependencies,
  type MediaTranscodeWorkExecutionOrchestratorDependencies,
} from '@/lib/media-transcode-work-execution-orchestrator';

const MEDIA_ID =
  'media-transcode-worker-test';

const SOURCE_OBJECT =
  `media/ingest/transcode-owner/${MEDIA_ID}/video.mp4`;

const GENERATION =
  '123456789';

const CLAIM_ID =
  'transcode-worker-claim';

const JOB_NAME =
  'projects/phcl-super-f0d21/locations/us-east1/jobs/job-123';

const CLAIM_NOW_MS =
  1_000;

const COMPLETION_NOW_MS =
  2_000;

const CLAIM:
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
      SOURCE_OBJECT,
    verifiedGeneration:
      GENERATION,
    claimedAtMs:
      CLAIM_NOW_MS,
    leaseExpiresAtMs:
      121_000,
  };

const COMPLETION_RESULT:
  MediaTranscodeWorkCompletionResult = {
    mediaId:
      MEDIA_ID,
    status:
      'TRANSCODING',
    verifiedGeneration:
      GENERATION,
    transcoderJobName:
      JOB_NAME,
  };

function createDependencies(
  overrides:
    Partial<MediaTranscodeWorkExecutionOrchestratorDependencies> = {}
): MediaTranscodeWorkExecutionOrchestratorDependencies {
  return {
    nowMs: () =>
      CLAIM_NOW_MS,

    readMediaTranscoderRuntimeConfig:
      () => ({
        projectId:
          'phcl-super-f0d21',
        location:
          'us-east1',
        bucketName:
          'phcl-super-f0d21.firebasestorage.app',
        completionTopic:
          'projects/phcl-super-f0d21/topics/media-transcode-complete',
      }),

    claimMediaTranscodeWork:
      async () =>
        CLAIM,

    startMediaTranscodeWorkClaimHeartbeat:
      () => ({
        stopAndWait:
          async () =>
            true,
      }),

    submitMediaTranscodeJob:
      async () => ({
        jobName:
          JOB_NAME,
        created:
          true,
      }),

    completeMediaTranscodeWork:
      async () =>
        COMPLETION_RESULT,

    releaseMediaTranscodeWorkClaim:
      async () =>
        true,

    ...overrides,
  };
}

test(
  'claims, submits, settles ownership and atomically completes transcode work',
  async () => {
    const calls: string[] = [];

    const result =
      await executeMediaTranscodeWorkWithDependencies(
        MEDIA_ID,
        createDependencies({
          nowMs: () => {
            calls.push('now');

            return calls.filter(
              (call) =>
                call === 'now'
            ).length === 1
              ? CLAIM_NOW_MS
              : COMPLETION_NOW_MS;
          },

          claimMediaTranscodeWork:
            async (
              mediaId,
              nowMs
            ) => {
              calls.push('claim');

              assert.equal(
                mediaId,
                MEDIA_ID
              );

              assert.equal(
                nowMs,
                CLAIM_NOW_MS
              );

              return CLAIM;
            },

          startMediaTranscodeWorkClaimHeartbeat:
            (
              mediaId,
              claimId
            ) => {
              calls.push(
                'heartbeat-start'
              );

              assert.equal(
                mediaId,
                MEDIA_ID
              );

              assert.equal(
                claimId,
                CLAIM_ID
              );

              return {
                stopAndWait:
                  async () => {
                    calls.push(
                      'heartbeat-stop'
                    );

                    return true;
                  },
              };
            },

          readMediaTranscoderRuntimeConfig:
            () => {
              calls.push('config');

              return createDependencies()
                .readMediaTranscoderRuntimeConfig();
            },

          submitMediaTranscodeJob:
            async (input) => {
              calls.push('submit');

              assert.deepEqual(
                input,
                {
                  projectId:
                    'phcl-super-f0d21',
                  location:
                    'us-east1',
                  bucketName:
                    'phcl-super-f0d21.firebasestorage.app',
                  completionTopic:
                    'projects/phcl-super-f0d21/topics/media-transcode-complete',
                  mediaId:
                    MEDIA_ID,
                  sourceObject:
                    SOURCE_OBJECT,
                  verifiedGeneration:
                    GENERATION,
                }
              );

              return {
                jobName:
                  JOB_NAME,
                created:
                  true,
              };
            },

          completeMediaTranscodeWork:
            async (input) => {
              calls.push('complete');

              assert.deepEqual(
                input,
                {
                  mediaId:
                    MEDIA_ID,
                  claimId:
                    CLAIM_ID,
                  sourceObject:
                    SOURCE_OBJECT,
                  verifiedGeneration:
                    GENERATION,
                  transcoderJobName:
                    JOB_NAME,
                  nowMs:
                    COMPLETION_NOW_MS,
                }
              );

              return COMPLETION_RESULT;
            },
        })
      );

    assert.deepEqual(
      result,
      COMPLETION_RESULT
    );

    assert.deepEqual(
      calls,
      [
        'now',
        'claim',
        'heartbeat-start',
        'config',
        'submit',
        'heartbeat-stop',
        'now',
        'complete',
      ]
    );
  }
);

test(
  'returns null without reading configuration or submitting when work cannot be claimed',
  async () => {
    let configRead = false;
    let submitted = false;

    const result =
      await executeMediaTranscodeWorkWithDependencies(
        MEDIA_ID,
        createDependencies({
          claimMediaTranscodeWork:
            async () =>
              null,
          readMediaTranscoderRuntimeConfig:
            () => {
              configRead = true;

              return createDependencies()
                .readMediaTranscoderRuntimeConfig();
            },
          submitMediaTranscodeJob:
            async () => {
              submitted = true;

              return {
                jobName:
                  JOB_NAME,
                created:
                  true,
              };
            },
        })
      );

    assert.equal(
      result,
      null
    );

    assert.equal(
      configRead,
      false
    );

    assert.equal(
      submitted,
      false
    );
  }
);

test(
  'releases the claim and preserves configuration or submission failure',
  async () => {
    for (
      const stage
      of [
        'config',
        'submission',
      ] as const
    ) {
      const expectedError =
        new Error(
          `TRANSCODE_${stage.toUpperCase()}_FAILURE`
        );

      let releaseCount = 0;

      await assert.rejects(
        executeMediaTranscodeWorkWithDependencies(
          MEDIA_ID,
          createDependencies({
            readMediaTranscoderRuntimeConfig:
              () => {
                if (stage === 'config') {
                  throw expectedError;
                }

                return createDependencies()
                  .readMediaTranscoderRuntimeConfig();
              },
            submitMediaTranscodeJob:
              async () => {
                if (
                  stage ===
                  'submission'
                ) {
                  throw expectedError;
                }

                return {
                  jobName:
                    JOB_NAME,
                  created:
                    true,
                };
              },
            releaseMediaTranscodeWorkClaim:
              async () => {
                releaseCount += 1;

                return true;
              },
          })
        ),
        (error: unknown) =>
          error === expectedError
      );

      assert.equal(
        releaseCount,
        1
      );
    }
  }
);

test(
  'fails closed without completion when heartbeat reports lost ownership',
  async () => {
    let completed = false;
    let released = false;

    await assert.rejects(
      executeMediaTranscodeWorkWithDependencies(
        MEDIA_ID,
        createDependencies({
          startMediaTranscodeWorkClaimHeartbeat:
            () => ({
              stopAndWait:
                async () =>
                  false,
            }),
          completeMediaTranscodeWork:
            async () => {
              completed = true;

              return COMPLETION_RESULT;
            },
          releaseMediaTranscodeWorkClaim:
            async () => {
              released = true;

              return false;
            },
        })
      ),
      /MEDIA_TRANSCODE_WORK_CLAIM_LOST/
    );

    assert.equal(
      completed,
      false
    );

    assert.equal(
      released,
      true
    );
  }
);

test(
  'preserves completion failure and releases the claim for reconciliation retry',
  async () => {
    const completionError =
      new Error(
        'MEDIA_TRANSCODE_COMPLETION_FAILURE'
      );

    let releaseCount = 0;

    await assert.rejects(
      executeMediaTranscodeWorkWithDependencies(
        MEDIA_ID,
        createDependencies({
          completeMediaTranscodeWork:
            async () => {
              throw completionError;
            },
          releaseMediaTranscodeWorkClaim:
            async () => {
              releaseCount += 1;

              return true;
            },
        })
      ),
      (error: unknown) =>
        error === completionError
    );

    assert.equal(
      releaseCount,
      1
    );
  }
);

test(
  'releases the exact claim when heartbeat startup fails and preserves the original error',
  async () => {
    const heartbeatError =
      new Error(
        'MEDIA_TRANSCODE_HEARTBEAT_START_FAILURE'
      );

    const calls: string[] = [];

    await assert.rejects(
      executeMediaTranscodeWorkWithDependencies(
        MEDIA_ID,
        createDependencies({
          startMediaTranscodeWorkClaimHeartbeat:
            () => {
              calls.push(
                'heartbeat-start'
              );

              throw heartbeatError;
            },
          releaseMediaTranscodeWorkClaim:
            async (
              mediaId,
              claimId
            ) => {
              calls.push('release');

              assert.equal(
                mediaId,
                MEDIA_ID
              );

              assert.equal(
                claimId,
                CLAIM_ID
              );

              return true;
            },
        })
      ),
      (error: unknown) =>
        error === heartbeatError
    );

    assert.deepEqual(
      calls,
      [
        'heartbeat-start',
        'release',
      ]
    );
  }
);
