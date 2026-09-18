import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createMediaValidationWorkerEventarcRequestHandlerWithDependencies,
} from '@/lib/media-validation-worker-eventarc-handler';

function createEventarcRequest(): Request {
  return new Request(
    'https://worker.invalid/media-validation',
    {
      method: 'POST',

      headers: {
        'ce-specversion':
          '1.0',

        'ce-id':
          'event-123',

        'ce-type':
          'google.cloud.firestore.document.v1.created',

        'ce-source':
          '//firestore.googleapis.com/projects/phcl-super-f0d21/databases/(default)',

        'ce-document':
          'mediaValidationWork/media-123',
      },
    }
  );
}

test(
  'rejects an unauthenticated Eventarc invocation before Eventarc parsing',
  async () => {
    let consumed = false;

    const handler =
      createMediaValidationWorkerEventarcRequestHandlerWithDependencies({
        authenticateRequest:
          async () => false,

        consumeMediaValidationWork:
          async () => {
            consumed = true;

            return null;
          },
      });

    const response =
      await handler(
        new Request(
          'https://worker.invalid/media-validation',
          {
            method: 'POST',
          }
        )
      );

    assert.equal(
      response.status,
      401
    );

    assert.equal(
      consumed,
      false
    );
  }
);

test(
  'maps an invalid authenticated Eventarc invocation to 400 without consuming work',
  async () => {
    let consumed = false;

    const handler =
      createMediaValidationWorkerEventarcRequestHandlerWithDependencies({
        authenticateRequest:
          async () => true,

        consumeMediaValidationWork:
          async () => {
            consumed = true;

            return null;
          },
      });

    const response =
      await handler(
        new Request(
          'https://worker.invalid/media-validation',
          {
            method: 'POST',
          }
        )
      );

    assert.equal(
      response.status,
      400
    );

    assert.equal(
      consumed,
      false
    );
  }
);

test(
  'passes the Eventarc media id to the injected consumer',
  async () => {
    let consumedMediaId:
      string | null = null;

    const handler =
      createMediaValidationWorkerEventarcRequestHandlerWithDependencies({
        authenticateRequest:
          async () => true,

        consumeMediaValidationWork:
          async (mediaId) => {
            consumedMediaId =
              mediaId;

            return null;
          },
      });

    const response =
      await handler(
        createEventarcRequest()
      );

    assert.equal(
      response.status,
      204
    );

    assert.equal(
      consumedMediaId,
      'media-123'
    );

    assert.equal(
      await response.text(),
      ''
    );
  }
);

test(
  'preserves Eventarc worker execution failure for transport retry',
  async () => {
    const failure =
      new Error(
        'PROBE_FAILED'
      );

    const handler =
      createMediaValidationWorkerEventarcRequestHandlerWithDependencies({
        authenticateRequest:
          async () => true,

        consumeMediaValidationWork:
          async () => {
            throw failure;
          },
      });

    await assert.rejects(
      handler(
        createEventarcRequest()
      ),
      (error) =>
        error === failure
    );
  }
);