import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createMediaTranscodeWorkerRequestRouter,
} from '@/lib/media-transcode-worker-request-router';

function createRouter(
  calls: string[]
) {
  return createMediaTranscodeWorkerRequestRouter({
    handleEventarcRequest:
      async () => {
        calls.push(
          'eventarc'
        );

        return new Response(
          null,
          {
            status:
              201,
          }
        );
      },

    handleCompletionRequest:
      async () => {
        calls.push(
          'completion'
        );

        return new Response(
          null,
          {
            status:
              202,
          }
        );
      },
  });
}

test(
  'routes root POST only to the Eventarc work handler',
  async () => {
    const calls:
      string[] = [];

    const response =
      await createRouter(
        calls
      )(
        new Request(
          'https://worker.invalid/',
          {
            method:
              'POST',
          }
        )
      );

    assert.equal(
      response.status,
      201
    );

    assert.deepEqual(
      calls,
      [
        'eventarc',
      ]
    );
  }
);

test(
  'routes exact completion POST only to the Pub Sub completion handler',
  async () => {
    const calls:
      string[] = [];

    const response =
      await createRouter(
        calls
      )(
        new Request(
          'https://worker.invalid/media-transcode-completion',
          {
            method:
              'POST',
          }
        )
      );

    assert.equal(
      response.status,
      202
    );

    assert.deepEqual(
      calls,
      [
        'completion',
      ]
    );
  }
);

test(
  'rejects unknown paths and non POST methods without invoking a handler',
  async () => {
    for (
      const scenario
      of [
        {
          url:
            'https://worker.invalid/unknown',
          method:
            'POST',
          status:
            404,
        },
        {
          url:
            'https://worker.invalid/',
          method:
            'GET',
          status:
            405,
        },
        {
          url:
            'https://worker.invalid/media-transcode-completion/',
          method:
            'POST',
          status:
            404,
        },
      ]
    ) {
      const calls:
        string[] = [];

      const response =
        await createRouter(
          calls
        )(
          new Request(
            scenario.url,
            {
              method:
                scenario.method,
            }
          )
        );

      assert.equal(
        response.status,
        scenario.status
      );

      assert.deepEqual(
        calls,
        []
      );

      assert.equal(
        response.headers.get(
          'cache-control'
        ),
        'no-store, max-age=0'
      );
    }
  }
);
