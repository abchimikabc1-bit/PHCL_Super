import assert from 'node:assert/strict';
import test from 'node:test';

import { readMediaFinalizationRequest } from '@/lib/media-finalization-request';

function createRequest(
  body: string,
  contentLength?: string
): Request {
  const headers = new Headers({
    'content-type': 'application/json',
  });

  if (contentLength !== undefined) {
    headers.set(
      'content-length',
      contentLength
    );
  }

  return new Request(
    'https://phcl.test/api/media/finalize',
    {
      method: 'POST',
      headers,
      body,
    }
  );
}

test(
  'accepts request containing only mediaId',
  async () => {
    const request = createRequest(
      JSON.stringify({
        mediaId: 'media-123',
      })
    );

    const result =
      await readMediaFinalizationRequest(
        request
      );

    assert.deepEqual(result, {
      mediaId: 'media-123',
    });
  }
);

test(
  'rejects request containing unknown fields',
  async () => {
    const request = createRequest(
      JSON.stringify({
        mediaId: 'media-123',
        ownerId: 'attacker-controlled',
      })
    );

    await assert.rejects(
      () =>
        readMediaFinalizationRequest(
          request
        ),
      /INVALID_REQUEST/
    );
  }
);

test(
  'rejects request missing mediaId',
  async () => {
    const request = createRequest(
      JSON.stringify({})
    );

    await assert.rejects(
      () =>
        readMediaFinalizationRequest(
          request
        ),
      /INVALID_REQUEST/
    );
  }
);

test(
  'rejects non-string mediaId',
  async () => {
    const request = createRequest(
      JSON.stringify({
        mediaId: 123,
      })
    );

    await assert.rejects(
      () =>
        readMediaFinalizationRequest(
          request
        ),
      /INVALID_REQUEST/
    );
  }
);

test(
  'rejects malformed JSON',
  async () => {
    const request = createRequest(
      '{"mediaId":'
    );

    await assert.rejects(
      () =>
        readMediaFinalizationRequest(
          request
        ),
      /INVALID_REQUEST/
    );
  }
);

test(
  'rejects non-object JSON',
  async () => {
    const request = createRequest(
      JSON.stringify([
        'media-123',
      ])
    );

    await assert.rejects(
      () =>
        readMediaFinalizationRequest(
          request
        ),
      /INVALID_REQUEST/
    );
  }
);

test(
  'rejects declared request body larger than limit',
  async () => {
    const request = createRequest(
      JSON.stringify({
        mediaId: 'media-123',
      }),
      String(
        4 * 1024 + 1
      )
    );

    await assert.rejects(
      () =>
        readMediaFinalizationRequest(
          request
        ),
      /REQUEST_TOO_LARGE/
    );
  }
);

test(
  'rejects actual request body larger than limit',
  async () => {
    const request = createRequest(
      JSON.stringify({
        mediaId: 'x'.repeat(
          4 * 1024
        ),
      })
    );

    await assert.rejects(
      () =>
        readMediaFinalizationRequest(
          request
        ),
      /REQUEST_TOO_LARGE/
    );
  }
);