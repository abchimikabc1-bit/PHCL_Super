import assert from 'node:assert/strict';
import test from 'node:test';

import {
  probeValidatingMediaContentWithDependencies,
} from '@/lib/media-content-probe-authority';

import {
  probeMediaObjectWithRuntimeCompositionDependencies,
} from '@/lib/media-runtime-probe-composition';

import type {
  MediaContentProbe,
} from '@/lib/media-content-validation';

import type {
  ValidatingMediaRecord,
} from '@/lib/media-validating-reader';

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
    verifiedGeneration:
      '1740000000000000',
    createdAtMs: 1_000,
    updatedAtMs: 2_000,
  };

const PARSED_PROBE:
  MediaContentProbe = {
    container:
      'mov,mp4,m4a,3gp,3g2,mj2',
    durationMs: 12_345,
    videoCodec: 'h264',
    width: 1920,
    height: 1080,
    frameRate:
      30000 / 1001,
    audioCodec: 'aac',
  };

test(
  'composes authoritative validating media identity with the runtime probe boundary',
  async () => {
    const calls: string[] = [];

    const result =
      await probeValidatingMediaContentWithDependencies(
        VALIDATING_MEDIA.mediaId,
        {
          async readValidatingMedia(
            mediaId
          ) {
            calls.push(
              `read:${mediaId}`
            );

            return VALIDATING_MEDIA;
          },

          async probeMediaObject(
            sourceObject,
            generation
          ) {
            return probeMediaObjectWithRuntimeCompositionDependencies(
              sourceObject,
              generation,
              {
                async executeAndParseMediaProbe(
                  executionSourceObject,
                  executionGeneration
                ) {
                  calls.push(
                    `execute:${executionSourceObject}:${executionGeneration}`
                  );

                  return PARSED_PROBE;
                },
              }
            );
          },
        }
      );

    assert.deepEqual(
      result,
      PARSED_PROBE
    );

    assert.deepEqual(calls, [
      `read:${VALIDATING_MEDIA.mediaId}`,
      `execute:${VALIDATING_MEDIA.sourceObject}:${VALIDATING_MEDIA.verifiedGeneration}`,
    ]);
  }
);

test(
  'preserves fail-closed runtime normalization behind the authoritative media boundary',
  async () => {
    await assert.rejects(
      () =>
        probeValidatingMediaContentWithDependencies(
          VALIDATING_MEDIA.mediaId,
          {
            async readValidatingMedia() {
              return VALIDATING_MEDIA;
            },

            async probeMediaObject(
              sourceObject,
              generation
            ) {
              return probeMediaObjectWithRuntimeCompositionDependencies(
                sourceObject,
                generation,
                {
                  async executeAndParseMediaProbe() {
                    return {
                      ...PARSED_PROBE,
                      durationMs:
                        '12345',
                    } as unknown as MediaContentProbe;
                  },
                }
              );
            },
          }
        ),
      /INVALID_MEDIA_CONTENT_PROBE/
    );
  }
);