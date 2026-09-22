import test from 'node:test';
import assert from 'node:assert/strict';

import {
  persistMediaContentValidationWithDependencies,
  type MediaContentValidationPersistenceOrchestratorDependencies,
} from '@/lib/media-content-validation-persistence-orchestrator';

import type {
  MediaContentValidationEvidence,
} from '@/lib/media-content-validation-evidence-authority';

import type {
  MediaContentProbe,
  MediaContentValidationResult,
} from '@/lib/media-content-validation';

import type {
  MediaContentValidationTransitionResult,
  TransitionMediaContentValidationInput,
} from '@/lib/media-content-validation-transition-authority';

const VALID_PROBE:
  MediaContentProbe = {
    container: 'mp4',
    durationMs: 30_000,
    videoCodec: 'h264',
    width: 1080,
    height: 1920,
    frameRate: 30,
    audioCodec: 'aac',
  };

const INVALID_PROBE:
  MediaContentProbe = {
    ...VALID_PROBE,
    videoCodec: 'vp9',
  };

const VALID_EVIDENCE:
  MediaContentValidationEvidence = {
    mediaId: 'media-123',
    sourceObject:
      'media/ingest/owner-123/media-123/video.mp4',
    verifiedGeneration:
      '1740000000000000',
    probe:
      VALID_PROBE,
  };

const TRANSCODE_PENDING_RESULT:
  MediaContentValidationTransitionResult = {
    mediaId:
      VALID_EVIDENCE.mediaId,
    status:
      'TRANSCODE_PENDING',
    verifiedGeneration:
      VALID_EVIDENCE.verifiedGeneration,
  };

const REJECTED_RESULT:
  MediaContentValidationTransitionResult = {
    mediaId:
      VALID_EVIDENCE.mediaId,
    status:
      'REJECTED',
    verifiedGeneration:
      VALID_EVIDENCE.verifiedGeneration,
  };

test(
  'evaluates authoritative evidence and persists the exact valid validation result',
  async () => {
    const calls:
      TransitionMediaContentValidationInput[] = [];

    const dependencies:
      MediaContentValidationPersistenceOrchestratorDependencies = {
        readMediaContentValidationEvidence:
          async (mediaId) => {
            assert.equal(
              mediaId,
              VALID_EVIDENCE.mediaId
            );

            return VALID_EVIDENCE;
          },

        evaluateMediaContentValidation:
          (probe) => {
            assert.deepEqual(
              probe,
              VALID_EVIDENCE.probe
            );

            return {
              valid: true,
              probe,
            };
          },

        transitionMediaContentValidation:
          async (input) => {
            calls.push(input);

            return TRANSCODE_PENDING_RESULT;
          },
      };

    const result =
      await persistMediaContentValidationWithDependencies(
        VALID_EVIDENCE.mediaId,
        dependencies
      );

    assert.deepEqual(
      calls,
      [
        {
          mediaId:
            VALID_EVIDENCE.mediaId,
          sourceObject:
            VALID_EVIDENCE.sourceObject,
          verifiedGeneration:
            VALID_EVIDENCE.verifiedGeneration,
          validation: {
            valid: true,
            probe:
              VALID_EVIDENCE.probe,
          },
        },
      ]
    );

    assert.deepEqual(
      result,
      TRANSCODE_PENDING_RESULT
    );
  }
);

test(
  'preserves semantic rejection and persists it against the same authoritative identity',
  async () => {
    const invalidEvidence:
      MediaContentValidationEvidence = {
        ...VALID_EVIDENCE,
        probe:
          INVALID_PROBE,
      };

    const semanticRejection:
      MediaContentValidationResult = {
        valid: false,
        reason:
          'INVALID_VIDEO_CODEC',
      };

    const calls:
      TransitionMediaContentValidationInput[] = [];

    const dependencies:
      MediaContentValidationPersistenceOrchestratorDependencies = {
        readMediaContentValidationEvidence:
          async () =>
            invalidEvidence,

        evaluateMediaContentValidation:
          (probe) => {
            assert.deepEqual(
              probe,
              INVALID_PROBE
            );

            return semanticRejection;
          },

        transitionMediaContentValidation:
          async (input) => {
            calls.push(input);

            return REJECTED_RESULT;
          },
      };

    const result =
      await persistMediaContentValidationWithDependencies(
        invalidEvidence.mediaId,
        dependencies
      );

    assert.deepEqual(
      calls,
      [
        {
          mediaId:
            invalidEvidence.mediaId,
          sourceObject:
            invalidEvidence.sourceObject,
          verifiedGeneration:
            invalidEvidence.verifiedGeneration,
          validation:
            semanticRejection,
        },
      ]
    );

    assert.deepEqual(
      result,
      REJECTED_RESULT
    );
  }
);

test(
  'uses authoritative evidence identity instead of caller-authored source identity',
  async () => {
    const transitionCalls:
      TransitionMediaContentValidationInput[] = [];

    const dependencies:
      MediaContentValidationPersistenceOrchestratorDependencies = {
        readMediaContentValidationEvidence:
          async (mediaId) => {
            assert.equal(
              mediaId,
              VALID_EVIDENCE.mediaId
            );

            return VALID_EVIDENCE;
          },

        evaluateMediaContentValidation:
          (probe) => ({
            valid: true,
            probe,
          }),

        transitionMediaContentValidation:
          async (input) => {
            transitionCalls.push(
              input
            );

            return TRANSCODE_PENDING_RESULT;
          },
      };

    await persistMediaContentValidationWithDependencies(
      VALID_EVIDENCE.mediaId,
      dependencies
    );

    assert.equal(
      transitionCalls.length,
      1
    );

    assert.equal(
      transitionCalls[0]
        .sourceObject,
      VALID_EVIDENCE.sourceObject
    );

    assert.equal(
      transitionCalls[0]
        .verifiedGeneration,
      VALID_EVIDENCE.verifiedGeneration
    );
  }
);

test(
  'propagates operational evidence failure without evaluating or transitioning media',
  async () => {
    const evidenceFailure =
      new Error(
        'MEDIA_PROBE_FAILED'
      );

    let evaluationCalls =
      0;

    let transitionCalls =
      0;

    const dependencies:
      MediaContentValidationPersistenceOrchestratorDependencies = {
        readMediaContentValidationEvidence:
          async () => {
            throw evidenceFailure;
          },

        evaluateMediaContentValidation:
          () => {
            evaluationCalls += 1;

            return {
              valid: true,
              probe:
                VALID_PROBE,
            };
          },

        transitionMediaContentValidation:
          async () => {
            transitionCalls += 1;

            return TRANSCODE_PENDING_RESULT;
          },
      };

    await assert.rejects(
      persistMediaContentValidationWithDependencies(
        VALID_EVIDENCE.mediaId,
        dependencies
      ),
      (error) =>
        error === evidenceFailure
    );

    assert.equal(
      evaluationCalls,
      0
    );

    assert.equal(
      transitionCalls,
      0
    );
  }
);
