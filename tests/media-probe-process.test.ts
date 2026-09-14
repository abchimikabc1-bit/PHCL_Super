import assert from 'node:assert/strict';
import test from 'node:test';

import {
  executeMediaProbeProcessWithDependencies,
  type MediaProbeProcessDependencies,
} from '@/lib/media-probe-process';

test(
  'executes the fixed probe command with the controlled media file path',
  async () => {
    const calls: unknown[][] = [];

    const rawOutput = {
      stdout: '{"streams":[]}',
      stderr: '',
    };

    const dependencies:
      MediaProbeProcessDependencies = {
        async executeFile(
          executable,
          args,
          options
        ) {
          calls.push([
            executable,
            args,
            options,
          ]);

          return rawOutput;
        },
      };

    const result =
      await executeMediaProbeProcessWithDependencies(
        '/controlled/media-probe/input.mp4',
        dependencies
      );

    assert.equal(
      result,
      rawOutput
    );

    assert.deepEqual(
      calls,
      [
        [
          'ffprobe',
          [
            '-v',
            'error',
            '-show_format',
            '-show_streams',
            '-of',
            'json',
            '/controlled/media-probe/input.mp4',
          ],
          {
            shell: false,
            timeout: 15_000,
            maxBuffer: 1_048_576,
            windowsHide: true,
          },
        ],
      ]
    );
  }
);

test(
  'does not accept caller-authored executable or arguments',
  () => {
    assert.equal(
      executeMediaProbeProcessWithDependencies.length,
      2
    );
  }
);