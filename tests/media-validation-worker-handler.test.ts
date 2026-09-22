import assert from 'node:assert/strict';
import test from 'node:test';

import {
  handleMediaValidationWorkerRequestWithDependencies,
  type MediaValidationWorkerHandlerDependencies,
} from '@/lib/media-validation-worker-handler';

function createRequest(
  body = JSON.stringify({
    mediaId: 'media-123',
  })
): Request {
  return new Request(
    'https://worker.invalid/media-validation',
    {
      method: 'POST',

      headers: {
        'content-type':
          'application/json',
      },

      body,
    }
  );
}

function createDependencies(
  overrides: Partial<MediaValidationWorkerHandlerDependencies> = {}
): MediaValidationWorkerHandlerDependencies {
  return {
    authenticateRequest:
      async () => true,

    readInvocation:
      async () => ({
        mediaId:
          'media-123',
      }),

    consumeMediaValidationWork:
      async () => null,

    ...overrides,
  };
}

test(
  'rejects an unauthenticated worker invocation before request parsing',
  async () => {
    let parsed = false;
    let consumed = false;

    const response =
      await handleMediaValidationWorkerRequestWithDependencies(
        createRequest('{'),
        createDependencies({
          authenticateRequest:
            async () => false,

          readInvocation:
            async () => {
              parsed = true;

              throw new Error(
                'INVALID_REQUEST'
              );
            },

          consumeMediaValidationWork:
            async () => {
              consumed = true;

              return null;
            },
        })
      );

    assert.equal(
      response.status,
      401
    );

    assert.equal(
      parsed,
      false
    );

    assert.equal(
      consumed,
      false
    );

    assert.equal(
      response.headers.get(
        'cache-control'
      ),
      'no-store, max-age=0'
    );

    assert.equal(
      response.headers.get(
        'pragma'
      ),
      'no-cache'
    );
  }
);

test(
  'maps an oversized authenticated invocation to 413 without consuming work',
  async () => {
    let consumed = false;

    const response =
      await handleMediaValidationWorkerRequestWithDependencies(
        createRequest(),
        createDependencies({
          readInvocation:
            async () => {
              throw new Error(
                'REQUEST_TOO_LARGE'
              );
            },

          consumeMediaValidationWork:
            async () => {
              consumed = true;

              return null;
            },
        })
      );

    assert.equal(
      response.status,
      413
    );

    assert.equal(
      consumed,
      false
    );
  }
);

test(
  'maps an invalid authenticated invocation to 400 without consuming work',
  async () => {
    let consumed = false;

    const response =
      await handleMediaValidationWorkerRequestWithDependencies(
        createRequest(),
        createDependencies({
          readInvocation:
            async () => {
              throw new Error(
                'INVALID_REQUEST'
              );
            },

          consumeMediaValidationWork:
            async () => {
              consumed = true;

              return null;
            },
        })
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
  'acknowledges completed validation work without exposing execution details',
  async () => {
    const response =
      await handleMediaValidationWorkerRequestWithDependencies(
        createRequest(),
        createDependencies({
          consumeMediaValidationWork:
            async (mediaId) => {
              assert.equal(
                mediaId,
                'media-123'
              );

              return {
                mediaId:
                  'media-123',

                status:
                  'TRANSCODE_PENDING',

                verifiedGeneration:
                  '12345',
              };
            },
        })
      );

    assert.equal(
      response.status,
      204
    );

    assert.equal(
      await response.text(),
      ''
    );
  }
);

test(
  'acknowledges an unclaimed duplicate or absent work invocation',
  async () => {
    const response =
      await handleMediaValidationWorkerRequestWithDependencies(
        createRequest(),
        createDependencies({
          consumeMediaValidationWork:
            async () => null,
        })
      );

    assert.equal(
      response.status,
      204
    );

    assert.equal(
      await response.text(),
      ''
    );
  }
);

test(
  'preserves operational execution failure for transport retry',
  async () => {
    const failure =
      new Error(
        'PROBE_FAILED'
      );

    await assert.rejects(
      handleMediaValidationWorkerRequestWithDependencies(
        createRequest(),
        createDependencies({
          consumeMediaValidationWork:
            async () => {
              throw failure;
            },
        })
      ),
      (error) =>
        error === failure
    );
  }
);
