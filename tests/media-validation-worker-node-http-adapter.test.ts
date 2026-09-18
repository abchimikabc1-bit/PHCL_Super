import 'server-only';

import assert from 'node:assert/strict';
import {
  createServer,
} from 'node:http';
import test from 'node:test';

import {
  createMediaValidationWorkerNodeHttpListener,
} from '@/lib/media-validation-worker-node-http-adapter';

async function startTestServer(
  handler:
    (
      request: Request
    ) => Promise<Response>
) {
  const server =
    createServer(
      createMediaValidationWorkerNodeHttpListener(
        handler
      )
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

  const address =
    server.address();

  assert.ok(
    address &&
      typeof address !==
        'string'
  );

  return {
    server,

    url:
      `http://127.0.0.1:${address.port}`,
  };
}

async function closeTestServer(
  server:
    ReturnType<
      typeof createServer
    >
): Promise<void> {
  await new Promise<void>(
    (
      resolve,
      reject
    ) => {
      server.close(
        (
          error
        ) => {
          if (error) {
            reject(
              error
            );

            return;
          }

          resolve();
        }
      );
    }
  );
}

test(
  'Node HTTP adapter preserves method, CloudEvent headers, URL, and body',
  async () => {
    let receivedRequest:
      Request | null =
        null;

    const {
      server,
      url,
    } =
      await startTestServer(
        async (
          request
        ) => {
          receivedRequest =
            request;

          return new Response(
            null,
            {
              status: 204,

              headers: {
                'Cache-Control':
                  'no-store, max-age=0',
              },
            }
          );
        }
      );

    try {
      const response =
        await fetch(
          `${url}/events?source=test`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',

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

            body:
              JSON.stringify(
                {
                  value:
                    'payload',
                }
              ),
          }
        );

      assert.equal(
        response.status,
        204
      );

      assert.equal(
        response.headers.get(
          'cache-control'
        ),
        'no-store, max-age=0'
      );

      assert.ok(
        receivedRequest
      );

      const request =
        receivedRequest as Request;

      assert.equal(
        request.method,
        'POST'
      );

      assert.equal(
        new URL(
          request.url
        ).pathname,
        '/events'
      );

      assert.equal(
        new URL(
          request.url
        ).search,
        '?source=test'
      );

      assert.equal(
        request.headers.get(
          'ce-document'
        ),
        'mediaValidationWork/media-1'
      );

      assert.deepEqual(
        await request.json(),
        {
          value:
            'payload',
        }
      );
    } finally {
      await closeTestServer(
        server
      );
    }
  }
);

test(
  'Node HTTP adapter returns fail-closed 500 when the handler throws',
  async () => {
    const {
      server,
      url,
    } =
      await startTestServer(
        async () => {
          throw new Error(
            'TEST_FAILURE'
          );
        }
      );

    try {
      const response =
        await fetch(
          url,
          {
            method: 'POST',
          }
        );

      assert.equal(
        response.status,
        500
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
    } finally {
      await closeTestServer(
        server
      );
    }
  }
);