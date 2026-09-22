import assert from 'node:assert/strict';
import test from 'node:test';

import {
  readMediaTranscodeWorkerInvocation,
} from '@/lib/media-transcode-worker-invocation';

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
    'https://worker.invalid/media-transcode',
    {
      method: 'POST',
      headers,
      body,
    }
  );
}

test(
  'accepts the exact canonical media transcode invocation contract',
  async () => {
    assert.deepEqual(
      await readMediaTranscodeWorkerInvocation(
        createRequest(
          JSON.stringify({
            mediaId:
              'media-123',
          })
        )
      ),
      {
        mediaId:
          'media-123',
      }
    );
  }
);

test(
  'rejects malformed, non-object, incomplete or expanded JSON contracts',
  async () => {
    const bodies = [
      '{',
      JSON.stringify([
        'media-123',
      ]),
      JSON.stringify({}),
      JSON.stringify({
        mediaId:
          123,
      }),
      JSON.stringify({
        mediaId:
          'media-123',
        claimId:
          'caller-controlled',
      }),
    ];

    for (const body of bodies) {
      await assert.rejects(
        readMediaTranscodeWorkerInvocation(
          createRequest(body)
        ),
        /INVALID_REQUEST/
      );
    }
  }
);

test(
  'rejects unsafe or noncanonical media identifiers',
  async () => {
    for (
      const mediaId
      of [
        '',
        ' media-123',
        'media-123 ',
        'media/123',
        '../media-123',
      ]
    ) {
      await assert.rejects(
        readMediaTranscodeWorkerInvocation(
          createRequest(
            JSON.stringify({
              mediaId,
            })
          )
        ),
        /INVALID_REQUEST/
      );
    }
  }
);

test(
  'rejects oversized declared or actual request bodies',
  async () => {
    await assert.rejects(
      readMediaTranscodeWorkerInvocation(
        createRequest(
          JSON.stringify({
            mediaId:
              'media-123',
          }),
          '4097'
        )
      ),
      /REQUEST_TOO_LARGE/
    );

    await assert.rejects(
      readMediaTranscodeWorkerInvocation(
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
