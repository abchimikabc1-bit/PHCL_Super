import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateMediaContentWithDependencies,
  type MediaContentValidationOrchestratorDependencies,
} from '@/lib/media-content-validation-orchestrator';

import type {
  MediaContentProbe,
  MediaContentValidationResult,
} from '@/lib/media-content-validation';

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

test(
  'evaluates the authoritative probe result for the requested media',
  async () => {
    const calls: string[] = [];

    const expected:
      MediaContentValidationResult = {
        valid: true,
        probe: VALID_PROBE,
      };

    const dependencies:
      MediaContentValidationOrchestratorDependencies = {
        probeValidatingMediaContent:
          async (mediaId) => {
            calls.push(
              `probe:${mediaId}`
            );

            return VALID_PROBE;
          },

        evaluateMediaContentValidation:
          (probe) => {
            calls.push(
              'evaluate'
            );

            assert.deepEqual(
              probe,
              VALID_PROBE
            );

            return expected;
          },
      };

    const result =
      await validateMediaContentWithDependencies(
        'media-123',
        dependencies
      );

    assert.deepEqual(
      calls,
      [
        'probe:media-123',
        'evaluate',
      ]
    );

    assert.deepEqual(
      result,
      expected
    );
  }
);

test(
  'preserves semantic rejection from the content validation policy',
  async () => {
    const rejected:
      MediaContentValidationResult = {
        valid: false,
        reason:
          'INVALID_FRAME_RATE',
      };

    const dependencies:
      MediaContentValidationOrchestratorDependencies = {
        probeValidatingMediaContent:
          async () =>
            VALID_PROBE,

        evaluateMediaContentValidation:
          () =>
            rejected,
      };

    const result =
      await validateMediaContentWithDependencies(
        'media-123',
        dependencies
      );

    assert.deepEqual(
      result,
      rejected
    );
  }
);

test(
  'does not convert probe failure into semantic rejection',
  async () => {
    const probeFailure =
      new Error(
        'MEDIA_PROBE_FAILED'
      );

    let evaluationCalled =
      false;

    const dependencies:
      MediaContentValidationOrchestratorDependencies = {
        probeValidatingMediaContent:
          async () => {
            throw probeFailure;
          },

        evaluateMediaContentValidation:
          () => {
            evaluationCalled =
              true;

            return {
              valid: false,
              reason:
                'INVALID_CONTAINER',
            };
          },
      };

    await assert.rejects(
      validateMediaContentWithDependencies(
        'media-123',
        dependencies
      ),
      (error) =>
        error === probeFailure
    );

    assert.equal(
      evaluationCalled,
      false
    );
  }
);