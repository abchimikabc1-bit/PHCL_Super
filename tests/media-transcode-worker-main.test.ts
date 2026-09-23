import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  Server,
} from 'node:http';

import {
  runMediaTranscodeWorkerProcessWithDependencies,
} from '../worker/media-transcode-main';

test(
  'starts the transcode worker and installs shutdown handlers on its exact server',
  async () => {
    const server =
      {} as Server;

    const calls: string[] = [];

    await runMediaTranscodeWorkerProcessWithDependencies({
      startWorker:
        async () => {
          calls.push('start');

          return server;
        },

      installShutdownHandlers:
        (receivedServer) => {
          calls.push('shutdown');

          assert.equal(
            receivedServer,
            server
          );

          return () => {};
        },
    });

    assert.deepEqual(
      calls,
      [
        'start',
        'shutdown',
      ]
    );
  }
);

test(
  'does not install shutdown handlers when worker startup fails',
  async () => {
    const expectedError =
      new Error(
        'START_FAILED'
      );

    let installed = false;

    await assert.rejects(
      runMediaTranscodeWorkerProcessWithDependencies({
        startWorker:
          async () => {
            throw expectedError;
          },
        installShutdownHandlers:
          () => {
            installed = true;

            return () => {};
          },
      }),
      (error: unknown) =>
        error === expectedError
    );

    assert.equal(
      installed,
      false
    );
  }
);
