import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createMediaTranscodeWorkerEventarcRequestHandlerWithDependencies,
} from '@/lib/media-transcode-worker-eventarc-handler';

function eventarcRequest(): Request {
  return new Request(
    'https://worker.invalid/media-transcode',
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
          'mediaTranscodeWork/media-123',
      },
    }
  );
}

test(
  'rejects unauthenticated Eventarc invocation before parsing',
  async () => {
    let consumed = false;

    const handler =
      createMediaTranscodeWorkerEventarcRequestHandlerWithDependencies({
        authenticateRequest:
          async () =>
            false,
        consumeMediaTranscodeWork:
          async () => {
            consumed = true;

            return null;
          },
      });

    const response =
      await handler(
        new Request(
          'https://worker.invalid/media-transcode',
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
  'maps invalid authenticated Eventarc invocation to 400 without consuming work',
  async () => {
    let consumed = false;

    const handler =
      createMediaTranscodeWorkerEventarcRequestHandlerWithDependencies({
        authenticateRequest:
          async () =>
            true,
        consumeMediaTranscodeWork:
          async () => {
            consumed = true;

            return null;
          },
      });

    const response =
      await handler(
        new Request(
          'https://worker.invalid/media-transcode',
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
  'passes exact Eventarc media id to the transcode consumer',
  async () => {
    let receivedMediaId:
      string | null = null;

    const handler =
      createMediaTranscodeWorkerEventarcRequestHandlerWithDependencies({
        authenticateRequest:
          async () =>
            true,
        consumeMediaTranscodeWork:
          async (mediaId) => {
            receivedMediaId =
              mediaId;

            return null;
          },
      });

    const response =
      await handler(
        eventarcRequest()
      );

    assert.equal(
      response.status,
      204
    );

    assert.equal(
      receivedMediaId,
      'media-123'
    );
  }
);

test(
  'preserves Eventarc transcode execution failure for transport retry',
  async () => {
    const expectedError =
      new Error(
        'TRANSCODE_EXECUTION_FAILED'
      );

    const handler =
      createMediaTranscodeWorkerEventarcRequestHandlerWithDependencies({
        authenticateRequest:
          async () =>
            true,
        consumeMediaTranscodeWork:
          async () => {
            throw expectedError;
          },
      });

    await assert.rejects(
      handler(
        eventarcRequest()
      ),
      (error: unknown) =>
        error === expectedError
    );
  }
);
