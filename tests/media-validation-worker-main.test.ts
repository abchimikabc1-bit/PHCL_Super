import 'server-only';

import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  Server,
} from 'node:http';

import {
  runMediaValidationWorkerProcessWithDependencies,
} from '../worker/media-validation-main';

test(
  'starts the worker before installing shutdown handlers for the returned server',
  async () => {
    const server =
      {} as Server;

    const calls:
      string[] = [];

    await runMediaValidationWorkerProcessWithDependencies(
      {
        startWorker:
          async () => {
            calls.push(
              'start'
            );

            return server;
          },

        installShutdownHandlers:
          (
            receivedServer
          ) => {
            assert.equal(
              receivedServer,
              server
            );

            calls.push(
              'install-shutdown'
            );

            return () => {};
          },
      }
    );

    assert.deepEqual(
      calls,
      [
        'start',
        'install-shutdown',
      ]
    );
  }
);

test(
  'does not install shutdown handlers when worker startup fails',
  async () => {
    let installCalls =
      0;

    await assert.rejects(
      () =>
        runMediaValidationWorkerProcessWithDependencies(
          {
            startWorker:
              async () => {
                throw new Error(
                  'TEST_START_FAILURE'
                );
              },

            installShutdownHandlers:
              () => {
                installCalls +=
                  1;

                return () => {};
              },
          }
        ),
      /TEST_START_FAILURE/
    );

    assert.equal(
      installCalls,
      0
    );
  }
);