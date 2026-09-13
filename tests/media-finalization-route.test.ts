import assert from 'node:assert/strict';
import test from 'node:test';

import {
  POST,
} from '@/app/api/media/finalize/route';

test(
  'rejects unauthenticated media finalization before request processing',
  async () => {
    const request =
      new Request(
        'http://localhost/api/media/finalize',
        {
          method: 'POST',

          headers: {
            'content-type':
              'application/json',
          },

          body:
            JSON.stringify({
              mediaId:
                'media-123',
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
  'authentication failure wins over an invalid media finalization request body',
  async () => {
    const request =
      new Request(
        'http://localhost/api/media/finalize',
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