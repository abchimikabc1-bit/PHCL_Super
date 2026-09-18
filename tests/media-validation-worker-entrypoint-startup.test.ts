import 'server-only';

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  startMediaValidationWorkerEntrypointWithDependencies,
} from '../worker/media-validation-entrypoint';

test(
  'runs the media validation worker process successfully',
  async () => {
    let runCalls =
      0;

    await startMediaValidationWorkerEntrypointWithDependencies(
      {
        runProcess:
          async () => {
            runCalls +=
              1;
          },
      }
    );

    assert.equal(
      runCalls,
      1
    );
  }
);

test(
  'startup failure sets a non-zero process exit code and propagates a stable error',
  async () => {
    const previousExitCode =
      process.exitCode;

    process.exitCode =
      undefined;

    try {
      await assert.rejects(
        () =>
          startMediaValidationWorkerEntrypointWithDependencies(
            {
              runProcess:
                async () => {
                  throw new Error(
                    'TEST_STARTUP_FAILURE'
                  );
                },
            }
          ),
        /MEDIA_VALIDATION_WORKER_STARTUP_FAILED/
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