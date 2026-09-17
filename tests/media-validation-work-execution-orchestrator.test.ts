import test from 'node:test';
import assert from 'node:assert/strict';

import type {
  MediaContentValidationEvidence,
} from '@/lib/media-content-validation-evidence-authority';

import type {
  MediaContentProbe,
  MediaContentValidationResult,
} from '@/lib/media-content-validation';

import type {
  MediaValidationWorkClaim,
} from '@/lib/media-validation-work-claim-authority';

import type {
  MediaContentValidationTransitionResult,
} from '@/lib/media-content-validation-transition-authority';

import {
  executeMediaValidationWorkWithDependencies,
} from '@/lib/media-validation-work-execution-orchestrator';

const MEDIA_ID =
  'media-validation-worker-test';

const SOURCE_OBJECT =
  `media/ingest/validation-worker/${MEDIA_ID}/video.mp4`;

const VERIFIED_GENERATION =
  '123456789';

const CLAIM_ID =
  'validation-worker-claim';

const CLAIM_NOW_MS =
  1_000;

const COMPLETION_NOW_MS =
  2_000;

const VALID_PROBE: MediaContentProbe = {
  container: 'mp4',
  durationMs: 30_000,
  videoCodec: 'h264',
  width: 1080,
  height: 1920,
  frameRate: 30,
  audioCodec: 'aac',
};

const VALIDATION_RESULT: MediaContentValidationResult = {
  valid: true,
  probe: VALID_PROBE,
};

const EVIDENCE: MediaContentValidationEvidence = {
  mediaId: MEDIA_ID,
  sourceObject: SOURCE_OBJECT,
  verifiedGeneration: VERIFIED_GENERATION,
  probe: VALID_PROBE,
};

const CLAIM: MediaValidationWorkClaim = {
  claimId: CLAIM_ID,
  workId: MEDIA_ID,
  mediaId: MEDIA_ID,
  workType: 'MEDIA_CONTENT_VALIDATION',
  claimedAtMs: CLAIM_NOW_MS,
  leaseExpiresAtMs: 121_000,
};

const TERMINAL_RESULT:
  MediaContentValidationTransitionResult = {
    mediaId: MEDIA_ID,
    status: 'VALIDATED',
    verifiedGeneration:
      VERIFIED_GENERATION,
  };


const RETAINED_HEARTBEAT_DEPENDENCIES = {
  startMediaValidationWorkClaimHeartbeat:
    () => ({
      stopAndWait:
        async () =>
          true,
    }),
};

test(
  'executes claimed validation work through authoritative evidence, evaluation, and atomic completion',
  async () => {
    const calls: string[] = [];

    const result =
      await executeMediaValidationWorkWithDependencies(
        MEDIA_ID,
        {
          ...RETAINED_HEARTBEAT_DEPENDENCIES,
          nowMs: () => {
            calls.push('now');

            return calls.filter(
              (call) => call === 'now'
            ).length === 1
              ? CLAIM_NOW_MS
              : COMPLETION_NOW_MS;
          },

          claimMediaValidationWork:
            async (mediaId, nowMs) => {
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

          readMediaContentValidationEvidence:
            async (mediaId) => {
              calls.push('evidence');

              assert.equal(
                mediaId,
                MEDIA_ID
              );

              return EVIDENCE;
            },

          evaluateMediaContentValidation:
            (probe) => {
              calls.push('evaluate');

              assert.deepEqual(
                probe,
                VALID_PROBE
              );

              return VALIDATION_RESULT;
            },

          completeMediaValidationWork:
            async (input) => {
              calls.push('complete');

              assert.deepEqual(
                input,
                {
                  mediaId: MEDIA_ID,
                  claimId: CLAIM_ID,
                  sourceObject:
                    SOURCE_OBJECT,
                  verifiedGeneration:
                    VERIFIED_GENERATION,
                  validation:
                    VALIDATION_RESULT,
                  nowMs:
                    COMPLETION_NOW_MS,
                }
              );

              return TERMINAL_RESULT;
            },

          releaseMediaValidationWorkClaim:
            async () => {
              calls.push('release');

              return true;
            },
        }
      );

    assert.deepEqual(
      result,
      TERMINAL_RESULT
    );

    assert.deepEqual(
      calls,
      [
        'now',
        'claim',
        'evidence',
        'evaluate',
        'now',
        'complete',
      ]
    );
  }
);

test(
  'returns null without reading evidence when durable work cannot be claimed',
  async () => {
    let evidenceRead = false;
    let completed = false;
    let released = false;

    const result =
      await executeMediaValidationWorkWithDependencies(
        MEDIA_ID,
        {
          ...RETAINED_HEARTBEAT_DEPENDENCIES,
          nowMs: () =>
            CLAIM_NOW_MS,

          claimMediaValidationWork:
            async () => null,

          readMediaContentValidationEvidence:
            async () => {
              evidenceRead = true;

              return EVIDENCE;
            },

          evaluateMediaContentValidation:
            () =>
              VALIDATION_RESULT,

          completeMediaValidationWork:
            async () => {
              completed = true;

              return TERMINAL_RESULT;
            },

          releaseMediaValidationWorkClaim:
            async () => {
              released = true;

              return true;
            },
        }
      );

    assert.equal(
      result,
      null
    );

    assert.equal(
      evidenceRead,
      false
    );

    assert.equal(
      completed,
      false
    );

    assert.equal(
      released,
      false
    );
  }
);

test(
  'releases the acquired claim and rethrows when authoritative evidence fails',
  async () => {
    const operationalError =
      new Error(
        'MEDIA_PROBE_OPERATIONAL_FAILURE'
      );

    let releasedMediaId:
      string | null = null;

    let releasedClaimId:
      string | null = null;

    await assert.rejects(
      () =>
        executeMediaValidationWorkWithDependencies(
          MEDIA_ID,
          {
            ...RETAINED_HEARTBEAT_DEPENDENCIES,
            nowMs: () =>
              CLAIM_NOW_MS,

            claimMediaValidationWork:
              async () => CLAIM,

            readMediaContentValidationEvidence:
              async () => {
                throw operationalError;
              },

            evaluateMediaContentValidation:
              () =>
                VALIDATION_RESULT,

            completeMediaValidationWork:
              async () =>
                TERMINAL_RESULT,

            releaseMediaValidationWorkClaim:
              async (
                mediaId,
                claimId
              ) => {
                releasedMediaId =
                  mediaId;

                releasedClaimId =
                  claimId;

                return true;
              },
          }
        ),
      (error: unknown) =>
        error === operationalError
    );

    assert.equal(
      releasedMediaId,
      MEDIA_ID
    );

    assert.equal(
      releasedClaimId,
      CLAIM_ID
    );
  }
);

test(
  'releases the acquired claim and rethrows when semantic evaluation throws',
  async () => {
    const evaluationError =
      new Error(
        'MEDIA_VALIDATION_EVALUATION_FAILURE'
      );

    let releaseCount = 0;

    await assert.rejects(
      () =>
        executeMediaValidationWorkWithDependencies(
          MEDIA_ID,
          {
            ...RETAINED_HEARTBEAT_DEPENDENCIES,
            nowMs: () =>
              CLAIM_NOW_MS,

            claimMediaValidationWork:
              async () => CLAIM,

            readMediaContentValidationEvidence:
              async () =>
                EVIDENCE,

            evaluateMediaContentValidation:
              () => {
                throw evaluationError;
              },

            completeMediaValidationWork:
              async () =>
                TERMINAL_RESULT,

            releaseMediaValidationWorkClaim:
              async (
                mediaId,
                claimId
              ) => {
                releaseCount += 1;

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
          }
        ),
      (error: unknown) =>
        error === evaluationError
    );

    assert.equal(
      releaseCount,
      1
    );
  }
);

test(
  'releases the acquired claim and preserves the original error when atomic completion fails',
  async () => {
    const completionError =
      new Error(
        'MEDIA_VALIDATION_COMPLETION_FAILURE'
      );

    let releaseCount = 0;

    await assert.rejects(
      () =>
        executeMediaValidationWorkWithDependencies(
          MEDIA_ID,
          {
            ...RETAINED_HEARTBEAT_DEPENDENCIES,
            nowMs: () =>
              COMPLETION_NOW_MS,

            claimMediaValidationWork:
              async () => CLAIM,

            readMediaContentValidationEvidence:
              async () =>
                EVIDENCE,

            evaluateMediaContentValidation:
              () =>
                VALIDATION_RESULT,

            completeMediaValidationWork:
              async () => {
                throw completionError;
              },

            releaseMediaValidationWorkClaim:
              async () => {
                releaseCount += 1;

                return false;
              },
          }
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
  'preserves the original operational error even when claim release itself throws',
  async () => {
    const operationalError =
      new Error(
        'MEDIA_PROBE_OPERATIONAL_FAILURE'
      );

    const releaseError =
      new Error(
        'MEDIA_VALIDATION_RELEASE_FAILURE'
      );

    await assert.rejects(
      () =>
        executeMediaValidationWorkWithDependencies(
          MEDIA_ID,
          {
            ...RETAINED_HEARTBEAT_DEPENDENCIES,
            nowMs: () =>
              CLAIM_NOW_MS,

            claimMediaValidationWork:
              async () => CLAIM,

            readMediaContentValidationEvidence:
              async () => {
                throw operationalError;
              },

            evaluateMediaContentValidation:
              () =>
                VALIDATION_RESULT,

            completeMediaValidationWork:
              async () =>
                TERMINAL_RESULT,

            releaseMediaValidationWorkClaim:
              async () => {
                throw releaseError;
              },
          }
        ),
      (error: unknown) =>
        error === operationalError
    );
  }
);
test(
  'starts the exact-claim heartbeat after claim acquisition and settles it before atomic completion',
  async () => {
    const calls: string[] = [];

    const dependencies = {
      nowMs: () => {
        calls.push('now');

        return calls.filter(
          (call) => call === 'now'
        ).length === 1
          ? CLAIM_NOW_MS
          : COMPLETION_NOW_MS;
      },

      claimMediaValidationWork:
        async () => {
          calls.push('claim');

          return CLAIM;
        },

      startMediaValidationWorkClaimHeartbeat:
        (
          mediaId: string,
          claimId: string
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

      readMediaContentValidationEvidence:
        async () => {
          calls.push('evidence');

          return EVIDENCE;
        },

      evaluateMediaContentValidation:
        () => {
          calls.push('evaluate');

          return VALIDATION_RESULT;
        },

      completeMediaValidationWork:
        async () => {
          calls.push('complete');

          return TERMINAL_RESULT;
        },

      releaseMediaValidationWorkClaim:
        async () => {
          calls.push('release');

          return true;
        },
    };

    const result =
      await executeMediaValidationWorkWithDependencies(
        MEDIA_ID,
        dependencies
      );

    assert.deepEqual(
      result,
      TERMINAL_RESULT
    );

    assert.deepEqual(
      calls,
      [
        'now',
        'claim',
        'heartbeat-start',
        'evidence',
        'evaluate',
        'heartbeat-stop',
        'now',
        'complete',
      ]
    );
  }
);

test(
  'fails closed without atomic completion when heartbeat reports lost claim ownership',
  async () => {
    let completed = false;
    let released = false;

    const dependencies = {
      nowMs: () =>
        CLAIM_NOW_MS,

      claimMediaValidationWork:
        async () =>
          CLAIM,

      startMediaValidationWorkClaimHeartbeat:
        () => ({
          stopAndWait:
            async () =>
              false,
        }),

      readMediaContentValidationEvidence:
        async () =>
          EVIDENCE,

      evaluateMediaContentValidation:
        () =>
          VALIDATION_RESULT,

      completeMediaValidationWork:
        async () => {
          completed = true;

          return TERMINAL_RESULT;
        },

      releaseMediaValidationWorkClaim:
        async (
          mediaId: string,
          claimId: string
        ) => {
          released = true;

          assert.equal(
            mediaId,
            MEDIA_ID
          );

          assert.equal(
            claimId,
            CLAIM_ID
          );

          return false;
        },
    };

    await assert.rejects(
      () =>
        executeMediaValidationWorkWithDependencies(
          MEDIA_ID,
          dependencies
        ),
      (error: unknown) =>
        error instanceof Error &&
        error.message ===
          'MEDIA_VALIDATION_WORK_CLAIM_LOST'
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
  'settles the heartbeat before releasing the claim when evidence execution fails',
  async () => {
    const operationalError =
      new Error(
        'MEDIA_PROBE_OPERATIONAL_FAILURE'
      );

    const calls: string[] = [];

    const dependencies = {
      nowMs: () =>
        CLAIM_NOW_MS,

      claimMediaValidationWork:
        async () => {
          calls.push('claim');

          return CLAIM;
        },

      startMediaValidationWorkClaimHeartbeat:
        () => {
          calls.push(
            'heartbeat-start'
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

      readMediaContentValidationEvidence:
        async () => {
          calls.push('evidence');

          throw operationalError;
        },

      evaluateMediaContentValidation:
        () =>
          VALIDATION_RESULT,

      completeMediaValidationWork:
        async () =>
          TERMINAL_RESULT,

      releaseMediaValidationWorkClaim:
        async () => {
          calls.push('release');

          return true;
        },
    };

    await assert.rejects(
      () =>
        executeMediaValidationWorkWithDependencies(
          MEDIA_ID,
          dependencies
        ),
      (error: unknown) =>
        error === operationalError
    );

    assert.deepEqual(
      calls,
      [
        'claim',
        'heartbeat-start',
        'evidence',
        'heartbeat-stop',
        'release',
      ]
    );
  }
);

test(
  'releases the acquired claim and preserves the heartbeat start error when heartbeat startup fails',
  async () => {
    const heartbeatStartError =
      new Error(
        'MEDIA_VALIDATION_HEARTBEAT_START_FAILURE'
      );

    const releaseError =
      new Error(
        'MEDIA_VALIDATION_RELEASE_FAILURE'
      );

    const calls: string[] = [];

    let evidenceRead = false;
    let completed = false;

    await assert.rejects(
      () =>
        executeMediaValidationWorkWithDependencies(
          MEDIA_ID,
          {
            nowMs: () =>
              CLAIM_NOW_MS,

            claimMediaValidationWork:
              async () => {
                calls.push('claim');

                return CLAIM;
              },

            startMediaValidationWorkClaimHeartbeat:
              () => {
                calls.push(
                  'heartbeat-start'
                );

                throw heartbeatStartError;
              },

            readMediaContentValidationEvidence:
              async () => {
                evidenceRead = true;

                return EVIDENCE;
              },

            evaluateMediaContentValidation:
              () =>
                VALIDATION_RESULT,

            completeMediaValidationWork:
              async () => {
                completed = true;

                return TERMINAL_RESULT;
              },

            releaseMediaValidationWorkClaim:
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

                throw releaseError;
              },
          }
        ),
      (error: unknown) =>
        error === heartbeatStartError
    );

    assert.deepEqual(
      calls,
      [
        'claim',
        'heartbeat-start',
        'release',
      ]
    );

    assert.equal(
      evidenceRead,
      false
    );

    assert.equal(
      completed,
      false
    );
  }
);
