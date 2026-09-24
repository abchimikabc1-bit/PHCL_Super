import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createMediaPlaybackClientSession,
} from '@/lib/media-playback-client';

const MEDIA_ID =
  'efc7cf40-9dc5-4a0f-ae48-2259337eefc9';

const BASE_URL =
  '/api/media/playback/object/';

function createSuccessfulResponse() {
  return {
    mediaId:
      MEDIA_ID,
    expiresAtMs:
      Date.now() + 600_000,
    masterManifestUrl:
      `${BASE_URL}master.m3u8`,
    mp4Urls: [
      `${BASE_URL}video-1080p.mp4`,
      `${BASE_URL}video-720p.mp4`,
      `${BASE_URL}video-480p.mp4`,
    ],
    thumbnailUrl:
      `${BASE_URL}thumbnail0000000000.jpeg`,
  };
}

test(
  'creates an authenticated same origin playback session',
  async () => {
    let requestedUrl =
      '';

    let requestedInit:
      RequestInit | undefined;

    const result =
      await createMediaPlaybackClientSession({
        mediaId:
          MEDIA_ID,
        getIdToken:
          async () =>
            'verified-id-token',
        fetchImplementation:
          async (input, init) => {
            requestedUrl =
              String(input);
            requestedInit =
              init;

            return Response.json(
              createSuccessfulResponse(),
              {
                status:
                  201,
              }
            );
          },
      });

    assert.equal(
      requestedUrl,
      '/api/media/playback/session'
    );
    assert.equal(
      requestedInit?.method,
      'POST'
    );
    assert.equal(
      requestedInit?.credentials,
      'same-origin'
    );
    assert.equal(
      (
        requestedInit?.headers as
          Record<string, string>
      ).Authorization,
      'Bearer verified-id-token'
    );
    assert.equal(
      JSON.parse(
        String(
          requestedInit?.body
        )
      ).mediaId,
      MEDIA_ID
    );
    assert.equal(
      result.mp4Urls[1],
      `${BASE_URL}video-720p.mp4`
    );
  }
);

test(
  'rejects unsafe input before requesting an ID token',
  async () => {
    let tokenReads =
      0;

    await assert.rejects(
      createMediaPlaybackClientSession({
        mediaId:
          '../forged',
        getIdToken:
          async () => {
            tokenReads += 1;

            return 'token';
          },
      }),
      /INVALID_MEDIA_PLAYBACK_CLIENT_INPUT/
    );

    assert.equal(
      tokenReads,
      0
    );
  }
);

test(
  'rejects failed session requests without reading an error body',
  async () => {
    let bodyReads =
      0;

    await assert.rejects(
      createMediaPlaybackClientSession({
        mediaId:
          MEDIA_ID,
        getIdToken:
          async () =>
            'verified-id-token',
        fetchImplementation:
          async () =>
            ({
              ok:
                false,
              text:
                async () => {
                  bodyReads += 1;

                  return 'sensitive';
                },
            }) as Response,
      }),
      /MEDIA_PLAYBACK_SESSION_REQUEST_FAILED/
    );

    assert.equal(
      bodyReads,
      0
    );
  }
);

test(
  'rejects expired forged and malformed session responses',
  async () => {
    const invalidResponses = [
      {
        ...createSuccessfulResponse(),
        expiresAtMs:
          Date.now() - 1,
      },
      {
        ...createSuccessfulResponse(),
        mediaId:
          'different-media',
      },
      {
        ...createSuccessfulResponse(),
        masterManifestUrl:
          'https://attacker.example/master.m3u8',
      },
      {
        ...createSuccessfulResponse(),
        mp4Urls: [
          `${BASE_URL}video-1080p.mp4`,
        ],
      },
    ];

    for (
      const responseBody
      of invalidResponses
    ) {
      await assert.rejects(
        createMediaPlaybackClientSession({
          mediaId:
            MEDIA_ID,
          getIdToken:
            async () =>
              'verified-id-token',
          fetchImplementation:
            async () =>
              Response.json(
                responseBody,
                {
                  status:
                    201,
                }
              ),
        }),
        /INVALID_MEDIA_PLAYBACK_SESSION_RESPONSE/
      );
    }
  }
);
