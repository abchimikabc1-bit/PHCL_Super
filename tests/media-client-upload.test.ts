import assert from 'node:assert/strict';

import {
  test,
} from 'node:test';

import {
  executeMediaClientUpload,
} from '@/lib/media-client-upload';

test(
  'executes the authorized media upload flow in order',
  async () => {
    const file =
      new File(
        [
          new Uint8Array([
            1,
            2,
            3,
            4,
          ]),
        ],
        'phcl-test-video.mp4',
        {
          type:
            'video/mp4',
        },
      );

    const calls:
      string[] = [];

    const result =
      await executeMediaClientUpload(
        {
          file,

          getIdToken:
            async () => {
              calls.push(
                'TOKEN',
              );

              return 'firebase-id-token-test';
            },

          fetch:
            async (
              input,
              init,
            ) => {
              const url =
                input instanceof
                Request
                  ? input.url
                  : String(
                      input,
                    );

              calls.push(
                `${init?.method ?? 'GET'} ${url}`,
              );

              if (
                url ===
                '/api/media/ingest'
              ) {
                const headers =
                  new Headers(
                    init?.headers,
                  );

                assert.equal(
                  init?.method,
                  'POST',
                );

                assert.equal(
                  headers.get(
                    'Authorization',
                  ),
                  'Bearer firebase-id-token-test',
                );

                assert.equal(
                  headers.get(
                    'Content-Type',
                  ),
                  'application/json',
                );

                assert.equal(
                  init?.body,
                  JSON.stringify({
                    sourceFileName:
                      'phcl-test-video.mp4',

                    contentType:
                      'video/mp4',

                    declaredSizeBytes:
                      4,
                  }),
                );

                return new Response(
                  JSON.stringify({
                    mediaId:
                      'media-test-001',

                    sourceObject:
                      'media/ingest/user-test-001/media-test-001/phcl-test-video.mp4',

                    status:
                      'UPLOADING',
                  }),
                  {
                    status:
                      201,

                    headers: {
                      'Content-Type':
                        'application/json',
                    },
                  },
                );
              }

              if (
                url ===
                '/api/media/upload-session'
              ) {
                const headers =
                  new Headers(
                    init?.headers,
                  );

                assert.equal(
                  init?.method,
                  'POST',
                );

                assert.equal(
                  headers.get(
                    'Authorization',
                  ),
                  'Bearer firebase-id-token-test',
                );

                assert.equal(
                  init?.body,
                  JSON.stringify({
                    mediaId:
                      'media-test-001',
                  }),
                );

                return new Response(
                  JSON.stringify({
                    sourceObject:
                      'media/ingest/user-test-001/media-test-001/phcl-test-video.mp4',

                    uploadUri:
                      'https://storage.googleapis.test/resumable-session-001',
                  }),
                  {
                    status:
                      200,

                    headers: {
                      'Content-Type':
                        'application/json',
                    },
                  },
                );
              }

              if (
                url ===
                'https://storage.googleapis.test/resumable-session-001'
              ) {
                const headers =
                  new Headers(
                    init?.headers,
                  );

                assert.equal(
                  init?.method,
                  'PUT',
                );

                assert.equal(
                  headers.get(
                    'Authorization',
                  ),
                  null,
                );

                assert.equal(
                  headers.get(
                    'Content-Type',
                  ),
                  'video/mp4',
                );

                assert.equal(
                  init?.body,
                  file,
                );

                return new Response(
                  null,
                  {
                    status:
                      200,
                  },
                );
              }

              if (
                url ===
                '/api/media/finalize'
              ) {
                const headers =
                  new Headers(
                    init?.headers,
                  );

                assert.equal(
                  init?.method,
                  'POST',
                );

                assert.equal(
                  headers.get(
                    'Authorization',
                  ),
                  'Bearer firebase-id-token-test',
                );

                assert.equal(
                  init?.body,
                  JSON.stringify({
                    mediaId:
                      'media-test-001',
                  }),
                );

                return new Response(
                  JSON.stringify({
                    mediaId:
                      'media-test-001',

                    status:
                      'VALIDATING',
                  }),
                  {
                    status:
                      200,

                    headers: {
                      'Content-Type':
                        'application/json',
                    },
                  },
                );
              }

              throw new Error(
                `Unexpected fetch request: ${url}`,
              );
            },
        },
      );

    assert.deepEqual(
      calls,
      [
        'TOKEN',
        'POST /api/media/ingest',
        'POST /api/media/upload-session',
        'PUT https://storage.googleapis.test/resumable-session-001',
        'POST /api/media/finalize',
      ],
    );

    assert.deepEqual(
      result,
      {
        mediaId:
          'media-test-001',

        sourceObject:
          'media/ingest/user-test-001/media-test-001/phcl-test-video.mp4',

        status:
          'VALIDATING',
      },
    );
  },
);