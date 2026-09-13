import assert from 'node:assert/strict';
import test from 'node:test';

import {
  readMediaIngestRequest,
} from '@/lib/media-ingest-request';

function createRequest(
  body: string,
  headers?: HeadersInit
): Request {
  return new Request(
    'http://localhost/api/media/ingest',
    {
      method: 'POST',
      headers: {
        'content-type':
          'application/json',
        ...headers,
      },
      body,
    }
  );
}

test(
  'accepts the exact media ingest request contract',
  async () => {
    const result =
      await readMediaIngestRequest(
        createRequest(
          JSON.stringify({
            sourceFileName:
              'video.mp4',

            contentType:
              'video/mp4',

            declaredSizeBytes:
              1024,
          })
        )
      );

    assert.deepEqual(
      result,
      {
        sourceFileName:
          'video.mp4',

        contentType:
          'video/mp4',

        declaredSizeBytes:
          1024,
      }
    );
  }
);

test(
  'rejects malformed and non-object JSON',
  async () => {
    for (
      const body of [
        '{',
        'null',
        '[]',
        '"video.mp4"',
        '123',
      ]
    ) {
      await assert.rejects(
        readMediaIngestRequest(
          createRequest(body)
        ),
        /INVALID_REQUEST/
      );
    }
  }
);

test(
  'rejects missing or invalid required media fields',
  async () => {
    for (
      const body of [
        {},
        {
          sourceFileName:
            null,
          contentType:
            'video/mp4',
          declaredSizeBytes:
            1024,
        },
        {
          sourceFileName:
            'video.mp4',
          contentType:
            null,
          declaredSizeBytes:
            1024,
        },
        {
          sourceFileName:
            'video.mp4',
          contentType:
            'video/mp4',
          declaredSizeBytes:
            null,
        },
        {
          sourceFileName:
            'video.mp4',
          contentType:
            'video/mp4',
          declaredSizeBytes:
            '1024',
        },
      ]
    ) {
      await assert.rejects(
        readMediaIngestRequest(
          createRequest(
            JSON.stringify(body)
          )
        ),
        /INVALID_REQUEST/
      );
    }
  }
);

test(
  'rejects client-controlled identity and path fields',
  async () => {
    for (
      const extraField of [
        'ownerId',
        'mediaId',
        'sourceObject',
      ]
    ) {
      await assert.rejects(
        readMediaIngestRequest(
          createRequest(
            JSON.stringify({
              sourceFileName:
                'video.mp4',

              contentType:
                'video/mp4',

              declaredSizeBytes:
                1024,

              [extraField]:
                'attacker-controlled',
            })
          )
        ),
        /INVALID_REQUEST/
      );
    }
  }
);

test(
  'rejects arbitrary extra request fields',
  async () => {
    await assert.rejects(
      readMediaIngestRequest(
        createRequest(
          JSON.stringify({
            sourceFileName:
              'video.mp4',

            contentType:
              'video/mp4',

            declaredSizeBytes:
              1024,

            unexpected:
              'value',
          })
        )
      ),
      /INVALID_REQUEST/
    );
  }
);

test(
  'rejects an oversized actual request body',
  async () => {
    const body =
      JSON.stringify({
        sourceFileName:
          'a'.repeat(5000),

        contentType:
          'video/mp4',

        declaredSizeBytes:
          1024,
      });

    await assert.rejects(
      readMediaIngestRequest(
        createRequest(body)
      ),
      /REQUEST_TOO_LARGE/
    );
  }
);

test(
  'rejects invalid or oversized declared content length',
  async () => {
    for (
      const contentLength of [
        '4097',
        '-1',
        'not-a-number',
      ]
    ) {
      await assert.rejects(
        readMediaIngestRequest(
          createRequest(
            JSON.stringify({
              sourceFileName:
                'video.mp4',

              contentType:
                'video/mp4',

              declaredSizeBytes:
                1024,
            }),
            {
              'content-length':
                contentLength,
            }
          )
        ),
        /REQUEST_TOO_LARGE/
      );
    }
  }
);