import assert from 'node:assert/strict';
import test from 'node:test';

import {
  readMediaPlaybackSessionRequest,
} from '@/lib/media-playback-session-request';

const MEDIA_ID =
  'efc7cf40-9dc5-4a0f-ae48-2259337eefc9';

function createRequest(
  body: string,
  contentLength?: string
): Request {
  const headers =
    new Headers({
      'content-type':
        'application/json',
    });

  if (
    contentLength !== undefined
  ) {
    headers.set(
      'content-length',
      contentLength
    );
  }

  return new Request(
    'https://phclsuper.com/api/media/playback/session',
    {
      method:
        'POST',
      headers,
      body,
    }
  );
}

test(
  'reads an exact media playback session request',
  async () => {
    const body =
      JSON.stringify({
        mediaId:
          MEDIA_ID,
      });

    assert.deepEqual(
      await readMediaPlaybackSessionRequest(
        createRequest(
          body,
          String(
            Buffer.byteLength(
              body,
              'utf8'
            )
          )
        )
      ),
      {
        mediaId:
          MEDIA_ID,
      }
    );
  }
);

test(
  'rejects malformed JSON and unexpected fields',
  async () => {
    const invalidBodies = [
      '{',
      'null',
      '[]',
      '{}',
      JSON.stringify({
        mediaId:
          MEDIA_ID,
        ownerId:
          'forged-owner',
      }),
    ];

    for (
      const body
      of invalidBodies
    ) {
      await assert.rejects(
        readMediaPlaybackSessionRequest(
          createRequest(body)
        ),
        /INVALID_MEDIA_PLAYBACK_SESSION_REQUEST/
      );
    }
  }
);

test(
  'rejects unsafe media identity',
  async () => {
    const unsafeIds = [
      '',
      ' media-id',
      '../media-id',
      'media/id',
      'media.id',
      'x'.repeat(129),
    ];

    for (
      const mediaId
      of unsafeIds
    ) {
      await assert.rejects(
        readMediaPlaybackSessionRequest(
          createRequest(
            JSON.stringify({
              mediaId,
            })
          )
        ),
        /INVALID_MEDIA_PLAYBACK_SESSION_REQUEST/
      );
    }
  }
);

test(
  'rejects oversized declared and actual bodies',
  async () => {
    await assert.rejects(
      readMediaPlaybackSessionRequest(
        createRequest(
          JSON.stringify({
            mediaId:
              MEDIA_ID,
          }),
          '1025'
        )
      ),
      /REQUEST_TOO_LARGE/
    );

    await assert.rejects(
      readMediaPlaybackSessionRequest(
        createRequest(
          JSON.stringify({
            mediaId:
              MEDIA_ID,
            padding:
              'x'.repeat(1_024),
          })
        )
      ),
      /REQUEST_TOO_LARGE/
    );
  }
);

test(
  'rejects malformed content length',
  async () => {
    await assert.rejects(
      readMediaPlaybackSessionRequest(
        createRequest(
          JSON.stringify({
            mediaId:
              MEDIA_ID,
          }),
          '-1'
        )
      ),
      /INVALID_CONTENT_LENGTH/
    );
  }
);
