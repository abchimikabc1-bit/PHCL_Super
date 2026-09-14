import test from 'node:test';
import assert from 'node:assert/strict';

import {
  probeValidatingMediaContentWithDependencies,
  type MediaContentProbeAuthorityDependencies,
} from '@/lib/media-content-probe-authority';

import type {
  ValidatingMediaRecord,
} from '@/lib/media-validating-reader';

import type {
  MediaContentProbe,
} from '@/lib/media-content-validation';

const VALIDATING_MEDIA:
  ValidatingMediaRecord = {
    schemaVersion: 2,
    mediaId: 'media-123',
    ownerId: 'owner-123',
    sourceObject:
      'media/ingest/owner-123/media-123/video.mp4',
    sourceFileName: 'video.mp4',
    contentType: 'video/mp4',
    declaredSizeBytes: 12_345_678,
    status: 'VALIDATING',
    verifiedGeneration: '1740000000000000',
    createdAtMs: 1_000,
    updatedAtMs: 2_000,
  };

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
  'probes the authoritative source object at its verified generation',
  async () => {
    const calls: Array<{
      sourceObject: string;
      generation: string;
    }> = [];

    const dependencies:
      MediaContentProbeAuthorityDependencies = {
        readValidatingMedia:
          async (mediaId) => {
            assert.equal(
              mediaId,
              VALIDATING_MEDIA.mediaId
            );

            return VALIDATING_MEDIA;
          },

        probeMediaObject:
          async (
            sourceObject,
            generation
          ) => {
            calls.push({
              sourceObject,
              generation,
            });

            return VALID_PROBE;
          },
      };

    const result =
      await probeValidatingMediaContentWithDependencies(
        VALIDATING_MEDIA.mediaId,
        dependencies
      );

    assert.deepEqual(
      calls,
      [
        {
          sourceObject:
            VALIDATING_MEDIA.sourceObject,
          generation:
            VALIDATING_MEDIA.verifiedGeneration,
        },
      ]
    );

    assert.deepEqual(
      result,
      VALID_PROBE
    );
  }
);

test(
  'does not accept caller-authored source object or generation',
  async () => {
    const dependencies:
      MediaContentProbeAuthorityDependencies = {
        readValidatingMedia:
          async () =>
            VALIDATING_MEDIA,

        probeMediaObject:
          async (
            sourceObject,
            generation
          ) => {
            assert.equal(
              sourceObject,
              VALIDATING_MEDIA.sourceObject
            );

            assert.equal(
              generation,
              VALIDATING_MEDIA.verifiedGeneration
            );

            return VALID_PROBE;
          },
      };

    await probeValidatingMediaContentWithDependencies(
      VALIDATING_MEDIA.mediaId,
      dependencies
    );
  }
);