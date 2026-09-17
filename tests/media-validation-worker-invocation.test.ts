import assert from 'node:assert/strict';
import test from 'node:test';

import {
  readMediaValidationWorkerInvocation,
} from '@/lib/media-validation-worker-invocation';

function createRequest(
  body: string,
  contentLength?: string
): Request {
  const headers =
    new Headers();

  if (contentLength !== undefined) {
    headers.set(
      'content-length',
      contentLength
    );
  }

  return new Request(
    'https://worker.invalid/media-validation',
    {
      method: 'POST',
      headers,
      body,
    }
  );
}

test(
  'accepts the exact media validation worker invocation contract',
  async () => {
    const invocation =
      await readMediaValidationWorkerInvocation(
        createRequest(
          JSON.stringify({
            mediaId: 'media-123',
          })
        )
      );

    assert.deepEqual(
      invocation,
      {
        mediaId: 'media-123',
      }
    );
  }
);

test(
  'rejects malformed JSON',
  async () => {
    await assert.rejects(
      readMediaValidationWorkerInvocation(
        createRequest('{')
      ),
      /INVALID_REQUEST/
    );
  }
);

test(
  'rejects non-object JSON',
  async () => {
    await assert.rejects(
      readMediaValidationWorkerInvocation(
        createRequest(
          JSON.stringify(
            ['media-123']
          )
        )
      ),
      /INVALID_REQUEST/
    );
  }
);

test(
  'rejects missing or non-string media id',
  async () => {
    await assert.rejects(
      readMediaValidationWorkerInvocation(
        createRequest(
          JSON.stringify({})
        )
      ),
      /INVALID_REQUEST/
    );

    await assert.rejects(
      readMediaValidationWorkerInvocation(
        createRequest(
          JSON.stringify({
            mediaId: 123,
          })
        )
      ),
      /INVALID_REQUEST/
    );
  }
);

test(
  'rejects unexpected invocation fields',
  async () => {
    await assert.rejects(
      readMediaValidationWorkerInvocation(
        createRequest(
          JSON.stringify({
            mediaId: 'media-123',
            claimId: 'caller-controlled',
          })
        )
      ),
      /INVALID_REQUEST/
    );
  }
);

test(
  'rejects an oversized declared request body',
  async () => {
    await assert.rejects(
      readMediaValidationWorkerInvocation(
        createRequest(
          JSON.stringify({
            mediaId: 'media-123',
          }),
          '4097'
        )
      ),
      /REQUEST_TOO_LARGE/
    );
  }
);

test(
  'rejects an oversized actual request body',
  async () => {
    await assert.rejects(
      readMediaValidationWorkerInvocation(
        createRequest(
          JSON.stringify({
            mediaId:
              'm'.repeat(4096),
          })
        )
      ),
      /REQUEST_TOO_LARGE/
    );
  }
);