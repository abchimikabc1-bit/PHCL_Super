import assert from 'node:assert/strict';
import test from 'node:test';

import {
  probeMediaObjectWithRuntimeCompositionDependencies,
} from '@/lib/media-runtime-probe-composition';

import type {
  MediaContentProbe,
} from '@/lib/media-content-validation';

const SOURCE_OBJECT =
  'media/ingest/owner-123/media-123/video.mp4';

const GENERATION =
  '1740000000000000';

const PARSED_PROBE: MediaContentProbe = {
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
  'composes the parsed probe execution with the runtime normalization boundary',
  async () => {
    const calls: string[] = [];

    const result =
      await probeMediaObjectWithRuntimeCompositionDependencies(
        SOURCE_OBJECT,
        GENERATION,
        {
          async executeAndParseMediaProbe(
            sourceObject,
            generation
          ) {
            calls.push(
              `execute:${sourceObject}:${generation}`
            );

            return PARSED_PROBE;
          },
        }
      );

    assert.deepEqual(
      result,
      PARSED_PROBE
    );

    assert.deepEqual(calls, [
      `execute:${SOURCE_OBJECT}:${GENERATION}`,
    ]);
  }
);

test(
  'preserves fail-closed runtime normalization for malformed composed output',
  async () => {
    await assert.rejects(
      () =>
        probeMediaObjectWithRuntimeCompositionDependencies(
          SOURCE_OBJECT,
          GENERATION,
          {
            async executeAndParseMediaProbe() {
              return {
                ...PARSED_PROBE,
                durationMs:
                  '12345',
              } as unknown as MediaContentProbe;
            },
          }
        ),
      /INVALID_MEDIA_CONTENT_PROBE/
    );
  }
);