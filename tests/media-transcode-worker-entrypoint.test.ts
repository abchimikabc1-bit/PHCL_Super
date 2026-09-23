import assert from 'node:assert/strict';
import test from 'node:test';

import {
  startMediaTranscodeWorkerEntrypointWithDependencies,
} from '../worker/media-transcode-entrypoint';

test(
  'starts the transcode worker process',
  async () => {
    let calls = 0;

    await startMediaTranscodeWorkerEntrypointWithDependencies({
      runProcess:
        async () => {
          calls += 1;
        },
    });

    assert.equal(
      calls,
      1
    );
  }
);

test(
  'fails closed and sets exit code when transcode worker startup fails',
  async () => {
    const previousExitCode =
      process.exitCode;

    process.exitCode =
      undefined;

    try {
      await assert.rejects(
        startMediaTranscodeWorkerEntrypointWithDependencies({
          runProcess:
            async () => {
              throw new Error(
                'START_FAILED'
              );
            },
        }),
        /MEDIA_TRANSCODE_WORKER_STARTUP_FAILED/
      );

      assert.equal(
        process.exitCode,
        1
      );
    } finally {
      process.exitCode =
        previousExitCode;
    }
  }
);
