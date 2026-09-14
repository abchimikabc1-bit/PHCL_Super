import assert from 'node:assert/strict';
import test from 'node:test';

import {
  executeMediaProbeFileWithDependencies,
  type MediaProbeExecFileDependencies,
} from '@/lib/media-probe-exec-file';

test(
  'executes a probe file without a shell and returns bounded string output',
  async () => {
    const calls: unknown[][] = [];

    const dependencies:
      MediaProbeExecFileDependencies = {
        execFile(
          executable,
          args,
          options,
          callback
        ) {
          calls.push([
            executable,
            args,
            options,
          ]);

          callback(
            null,
            '{"streams":[]}',
            ''
          );
        },
      };

    const result =
      await executeMediaProbeFileWithDependencies(
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
        dependencies
      );

    assert.deepEqual(result, {
      stdout: '{"streams":[]}',
      stderr: '',
    });

    assert.deepEqual(calls, [
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
          encoding: 'utf8',
        },
      ],
    ]);
  }
);

test(
  'rejects when execFile reports a process error',
  async () => {
    const processError =
      new Error(
        'MEDIA_PROBE_EXEC_FILE_FAILED'
      );

    const dependencies:
      MediaProbeExecFileDependencies = {
        execFile(
          _executable,
          _args,
          _options,
          callback
        ) {
          callback(
            processError,
            '',
            'probe failed'
          );
        },
      };

    await assert.rejects(
      () =>
        executeMediaProbeFileWithDependencies(
          'ffprobe',
          [],
          {
            shell: false,
            timeout: 15_000,
            maxBuffer: 1_048_576,
            windowsHide: true,
          },
          dependencies
        ),
      (error) =>
        error === processError
    );
  }
);