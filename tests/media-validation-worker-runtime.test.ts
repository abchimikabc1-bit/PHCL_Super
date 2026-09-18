import 'server-only';

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  closeMediaValidationWorkerHttpServer,
} from '../worker/media-validation-server';

import {
  createMediaValidationWorkerRuntimeServer,
} from '../worker/media-validation-runtime';

test(
  'runtime composition preserves authentication before Eventarc processing',
  async () => {
    let authenticationCalls = 0;

    const server =
      createMediaValidationWorkerRuntimeServer(
        {
          authenticateRequest:
            async () => {
              authenticationCalls += 1;

              return false;
            },
        }
      );

    await new Promise<void>(
      (
        resolve,
        reject
      ) => {
        server.once(
          'error',
          reject
        );

        server.listen(
          0,
          '127.0.0.1',
          () => {
            server.off(
              'error',
              reject
            );

            resolve();
          }
        );
      }
    );

    try {
      const address =
        server.address();

      assert.ok(
        address &&
          typeof address !==
            'string'
      );

      const response =
        await fetch(
          `http://127.0.0.1:${address.port}/`,
          {
            method:
              'POST',

            headers: {
              'ce-specversion':
                '1.0',

              'ce-id':
                'event-1',

              'ce-type':
                'google.cloud.firestore.document.v1.created',

              'ce-source':
                '//firestore.googleapis.com/projects/test/databases/(default)',

              'ce-document':
                'mediaValidationWork/media-1',
            },
          }
        );

      assert.equal(
        authenticationCalls,
        1
      );

      assert.equal(
        response.status,
        401
      );

      assert.equal(
        response.headers.get(
          'cache-control'
        ),
        'no-store, max-age=0'
      );
    } finally {
      await closeMediaValidationWorkerHttpServer(
        server
      );
    }
  }
);