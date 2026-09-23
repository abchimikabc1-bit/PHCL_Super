import assert from 'node:assert/strict';
import test from 'node:test';

import {
  handleMediaTranscodeWorkerRequestWithDependencies,
  type MediaTranscodeWorkerHandlerDependencies,
} from '@/lib/media-transcode-worker-handler';

function request(): Request {
  return new Request(
    'https://worker.invalid/media-transcode',
    {
      method: 'POST',
      body:
        JSON.stringify({
          mediaId:
            'media-123',
        }),
    }
  );
}

function dependencies(
  overrides:
    Partial<MediaTranscodeWorkerHandlerDependencies> = {}
): MediaTranscodeWorkerHandlerDependencies {
  return {
    authenticateRequest:
      async () =>
        true,
    readInvocation:
      async () => ({
        mediaId:
          'media-123',
      }),
    consumeMediaTranscodeWork:
      async () =>
        null,
    ...overrides,
  };
}

test(
  'rejects unauthenticated invocation before parsing or consuming work',
  async () => {
    let parsed = false;
    let consumed = false;

    const response =
      await handleMediaTranscodeWorkerRequestWithDependencies(
        request(),
        dependencies({
          authenticateRequest:
            async () =>
              false,
          readInvocation:
            async () => {
              parsed = true;

              return {
                mediaId:
                  'media-123',
              };
            },
          consumeMediaTranscodeWork:
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
  }
);

test(
  'maps oversized and invalid authenticated invocation to 413 and 400',
  async () => {
    for (
      const [
        message,
        status,
      ]
      of [
        [
          'REQUEST_TOO_LARGE',
          413,
        ],
        [
          'INVALID_REQUEST',
          400,
        ],
      ] as const
    ) {
      let consumed = false;

      const response =
        await handleMediaTranscodeWorkerRequestWithDependencies(
          request(),
          dependencies({
            readInvocation:
              async () => {
                throw new Error(
                  message
                );
              },
            consumeMediaTranscodeWork:
              async () => {
                consumed = true;

                return null;
              },
          })
        );

      assert.equal(
        response.status,
        status
      );

      assert.equal(
        consumed,
        false
      );
    }
  }
);

test(
  'acknowledges completed, duplicate or absent work without exposing details',
  async () => {
    for (
      const result
      of [
        null,
        {
          mediaId:
            'media-123',
          status:
            'TRANSCODING' as const,
          verifiedGeneration:
            '17',
          transcoderJobName:
            'projects/phcl-super-f0d21/locations/us-east1/jobs/job-123',
        },
      ]
    ) {
      let receivedMediaId:
        string | null = null;

      const response =
        await handleMediaTranscodeWorkerRequestWithDependencies(
          request(),
          dependencies({
            consumeMediaTranscodeWork:
              async (mediaId) => {
                receivedMediaId =
                  mediaId;

                return result;
              },
          })
        );

      assert.equal(
        response.status,
        204
      );

      assert.equal(
        receivedMediaId,
        'media-123'
      );

      assert.equal(
        await response.text(),
        ''
      );
    }
  }
);

test(
  'preserves operational execution failure for transport retry',
  async () => {
    const expectedError =
      new Error(
        'TRANSCODE_SUBMISSION_FAILED'
      );

    await assert.rejects(
      handleMediaTranscodeWorkerRequestWithDependencies(
        request(),
        dependencies({
          consumeMediaTranscodeWork:
            async () => {
              throw expectedError;
            },
        })
      ),
      (error: unknown) =>
        error === expectedError
    );
  }
);
