import assert from 'node:assert/strict';
import test from 'node:test';

import {
  POST,
} from '@/app/api/media/ingest/route';

test(
  'rejects unauthenticated media ingest before request processing',
  async () => {
    const request =
      new Request(
        'http://localhost/api/media/ingest',
        {
          method: 'POST',

          headers: {
            'content-type':
              'application/json',
          },

          body:
            JSON.stringify({
              sourceFileName:
                'video.mp4',
            }),
        }
      );

    const response =
      await POST(request);

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

    assert.equal(
      response.headers.get(
        'pragma'
      ),
      'no-cache'
    );

    assert.deepEqual(
      await response.json(),
      {
        error:
          'Authentication required.',
      }
    );
  }
);

test(
  'authentication failure wins over an invalid media request body',
  async () => {
    const request =
      new Request(
        'http://localhost/api/media/ingest',
        {
          method: 'POST',

          headers: {
            'content-type':
              'application/json',
          },

          body:
            '{',
        }
      );

    const response =
      await POST(request);

    assert.equal(
      response.status,
      401
    );

    assert.deepEqual(
      await response.json(),
      {
        error:
          'Authentication required.',
      }
    );
  }
);