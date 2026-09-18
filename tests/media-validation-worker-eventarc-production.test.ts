import 'server-only';

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createProductionMediaValidationWorkerEventarcRequestHandler,
} from '@/lib/media-validation-worker-eventarc-production';

test(
  'production Eventarc composition preserves the authentication gate',
  async () => {
    let authenticationCalls = 0;

    const handler =
      createProductionMediaValidationWorkerEventarcRequestHandler(
        async () => {
          authenticationCalls += 1;

          return false;
        }
      );

    const response =
      await handler(
        new Request(
          'https://media-worker.example.test/',
          {
            method: 'POST',

            headers: {
              'ce-specversion': '1.0',
              'ce-id': 'event-1',
              'ce-type':
                'google.cloud.firestore.document.v1.created',
              'ce-source':
                '//firestore.googleapis.com/projects/test/databases/(default)',
              'ce-document':
                'mediaValidationWork/media-1',
            },
          }
        )
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
  }
);