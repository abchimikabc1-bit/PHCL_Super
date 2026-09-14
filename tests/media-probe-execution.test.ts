import assert from 'node:assert/strict';
import test from 'node:test';

import {
  executeMediaProbeWithDependencies,
  type MediaProbeExecutionDependencies,
} from '@/lib/media-probe-execution';

const SOURCE_OBJECT =
  'media/ingest/owner-123/media-123/video.mp4';

const GENERATION =
  '1740000000000000';

test(
  'executes the probe against the controlled seekable input and cleans it up',
  async () => {
    const calls: string[] = [];

    const rawProbe = {
      format: 'untrusted-runtime-output',
    };

    const dependencies:
      MediaProbeExecutionDependencies = {
        async createSeekableMediaProbeInput(
          sourceObject,
          generation
        ) {
          calls.push(
            `create:${sourceObject}:${generation}`
          );

          return {
            filePath:
              '/controlled/media-probe/input.mp4',

            async cleanup() {
              calls.push('cleanup');
            },
          };
        },

        async executeProbeProcess(
          filePath
        ): Promise<unknown> {
          calls.push(
            `execute:${filePath}`
          );

          return rawProbe;
        },
      };

    const result =
      await executeMediaProbeWithDependencies(
        SOURCE_OBJECT,
        GENERATION,
        dependencies
      );

    assert.equal(
      result,
      rawProbe
    );

    assert.deepEqual(calls, [
      `create:${SOURCE_OBJECT}:${GENERATION}`,
      'execute:/controlled/media-probe/input.mp4',
      'cleanup',
    ]);
  }
);

test(
  'cleans up the seekable input when probe execution fails',
  async () => {
    const calls: string[] = [];

    const dependencies:
      MediaProbeExecutionDependencies = {
        async createSeekableMediaProbeInput() {
          return {
            filePath:
              '/controlled/media-probe/input.mp4',

            async cleanup() {
              calls.push('cleanup');
            },
          };
        },

        async executeProbeProcess() {
          calls.push('execute');

          throw new Error(
            'MEDIA_PROBE_PROCESS_FAILED'
          );
        },
      };

    await assert.rejects(
      () =>
        executeMediaProbeWithDependencies(
          SOURCE_OBJECT,
          GENERATION,
          dependencies
        ),
      /MEDIA_PROBE_PROCESS_FAILED/
    );

    assert.deepEqual(calls, [
      'execute',
      'cleanup',
    ]);
  }
);