import 'server-only';

import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  Server,
} from 'node:http';

import {
  installMediaValidationWorkerShutdownHandlersWithDependencies,
} from '../worker/media-validation-process';

function createTestServer(): Server {
  return {} as Server;
}

test(
  'SIGTERM closes the media validation worker server once',
  async () => {
    const server =
      createTestServer();

    let closeCalls =
      0;

    const cleanup =
      installMediaValidationWorkerShutdownHandlersWithDependencies(
        server,
        {
          closeServer:
            async (
              receivedServer
            ) => {
              assert.equal(
                receivedServer,
                server
              );

              closeCalls +=
                1;
            },
        }
      );

    try {
      process.emit(
        'SIGTERM'
      );

      await new Promise<void>(
        (resolve) => {
          setImmediate(
            resolve
          );
        }
      );

      assert.equal(
        closeCalls,
        1
      );
    } finally {
      cleanup();
    }
  }
);

test(
  'SIGINT closes the media validation worker server once',
  async () => {
    const server =
      createTestServer();

    let closeCalls =
      0;

    const cleanup =
      installMediaValidationWorkerShutdownHandlersWithDependencies(
        server,
        {
          closeServer:
            async () => {
              closeCalls +=
                1;
            },
        }
      );

    try {
      process.emit(
        'SIGINT'
      );

      await new Promise<void>(
        (resolve) => {
          setImmediate(
            resolve
          );
        }
      );

      assert.equal(
        closeCalls,
        1
      );
    } finally {
      cleanup();
    }
  }
);

test(
  'multiple shutdown signals do not close the server more than once',
  async () => {
    const server =
      createTestServer();

    let closeCalls =
      0;

    const cleanup =
      installMediaValidationWorkerShutdownHandlersWithDependencies(
        server,
        {
          closeServer:
            async () => {
              closeCalls +=
                1;
            },
        }
      );

    try {
      process.emit(
        'SIGTERM'
      );

      process.emit(
        'SIGINT'
      );

      await new Promise<void>(
        (resolve) => {
          setImmediate(
            resolve
          );
        }
      );

      assert.equal(
        closeCalls,
        1
      );
    } finally {
      cleanup();
    }
  }
);

test(
  'shutdown failure sets a non-zero process exit code',
  async () => {
    const server =
      createTestServer();

    const previousExitCode =
      process.exitCode;

    process.exitCode =
      undefined;

    const cleanup =
      installMediaValidationWorkerShutdownHandlersWithDependencies(
        server,
        {
          closeServer:
            async () => {
              throw new Error(
                'TEST_CLOSE_FAILURE'
              );
            },
        }
      );

    try {
      process.emit(
        'SIGTERM'
      );

      await new Promise<void>(
        (resolve) => {
          setImmediate(
            resolve
          );
        }
      );

      assert.equal(
        process.exitCode,
        1
      );
    } finally {
      cleanup();

      process.exitCode =
        previousExitCode;
    }
  }
);