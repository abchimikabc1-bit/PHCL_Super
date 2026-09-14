import assert from 'node:assert/strict';
import test from 'node:test';

import {
  probeMediaObjectWithRuntimeDependencies,
  type MediaRuntimeProbeDependencies,
} from '@/lib/media-runtime-probe-adapter';

const SOURCE_OBJECT =
  'media/ingest/owner-123/media-123/video.mp4';

const GENERATION =
  '1740000000000000';

const RAW_PROBE = {
  container: 'mp4',
  durationMs: 30_000,
  videoCodec: 'h264',
  width: 1080,
  height: 1920,
  frameRate: 30,
  audioCodec: 'aac',
};

test(
  'executes the runtime probe for the exact source object and generation',
  async () => {
    const calls: Array<{
      sourceObject: string;
      generation: string;
    }> = [];

    const dependencies:
      MediaRuntimeProbeDependencies = {
        executeProbe:
          async (
            sourceObject,
            generation
          ): Promise<unknown> => {
            calls.push({
              sourceObject,
              generation,
            });

            return RAW_PROBE;
          },
      };

    const result =
      await probeMediaObjectWithRuntimeDependencies(
        SOURCE_OBJECT,
        GENERATION,
        dependencies
      );

    assert.deepEqual(calls, [
      {
        sourceObject: SOURCE_OBJECT,
        generation: GENERATION,
      },
    ]);

    assert.deepEqual(
      result,
      RAW_PROBE
    );
  }
);

test(
  'rejects malformed untrusted runtime probe output',
  async () => {
    const dependencies:
      MediaRuntimeProbeDependencies = {
        executeProbe:
          async (): Promise<unknown> => ({
            ...RAW_PROBE,
            durationMs: '30000',
          }),
      };

    await assert.rejects(
      () =>
        probeMediaObjectWithRuntimeDependencies(
          SOURCE_OBJECT,
          GENERATION,
          dependencies
        ),
      /INVALID_MEDIA_CONTENT_PROBE/
    );
  }
);

test(
  'rejects unexpected fields from the runtime probe',
  async () => {
    const dependencies:
      MediaRuntimeProbeDependencies = {
        executeProbe:
          async (): Promise<unknown> => ({
            ...RAW_PROBE,
            executable: 'untrusted',
          }),
      };

    await assert.rejects(
      () =>
        probeMediaObjectWithRuntimeDependencies(
          SOURCE_OBJECT,
          GENERATION,
          dependencies
        ),
      /INVALID_MEDIA_CONTENT_PROBE/
    );
  }
);