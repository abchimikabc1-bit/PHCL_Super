export type MediaPlaybackClientSession = {
  mediaId: string;
  expiresAtMs: number;
  masterManifestUrl: string;
  mp4Urls: [
    string,
    string,
    string,
  ];
  thumbnailUrl: string;
};

export type CreateMediaPlaybackClientSessionInput = {
  mediaId: string;
  getIdToken: () => Promise<string>;
  fetchImplementation?:
    typeof fetch;
};

const SAFE_MEDIA_ID_PATTERN =
  /^[A-Za-z0-9_-]{1,128}$/;

const PLAYBACK_OBJECT_URL_PATTERN =
  /^\/api\/media\/playback\/object\/[A-Za-z0-9._-]+$/;

const MAX_RESPONSE_BYTES =
  8_192;

function isPlainRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isValidPlaybackUrl(
  value: unknown
): value is string {
  return (
    typeof value === 'string' &&
    PLAYBACK_OBJECT_URL_PATTERN.test(
      value
    )
  );
}

function parsePlaybackSession(
  value: unknown,
  requestedMediaId: string
): MediaPlaybackClientSession {
  if (
    !isPlainRecord(value) ||
    value.mediaId !==
      requestedMediaId ||
    typeof value.expiresAtMs !==
      'number' ||
    !Number.isSafeInteger(
      value.expiresAtMs
    ) ||
    value.expiresAtMs <=
      Date.now() ||
    !isValidPlaybackUrl(
      value.masterManifestUrl
    ) ||
    !Array.isArray(
      value.mp4Urls
    ) ||
    value.mp4Urls.length !== 3 ||
    !value.mp4Urls.every(
      isValidPlaybackUrl
    ) ||
    !isValidPlaybackUrl(
      value.thumbnailUrl
    )
  ) {
    throw new Error(
      'INVALID_MEDIA_PLAYBACK_SESSION_RESPONSE'
    );
  }

  const expectedBase =
    '/api/media/playback/object/';

  if (
    value.masterManifestUrl !==
      `${expectedBase}master.m3u8` ||
    value.mp4Urls[0] !==
      `${expectedBase}video-1080p.mp4` ||
    value.mp4Urls[1] !==
      `${expectedBase}video-720p.mp4` ||
    value.mp4Urls[2] !==
      `${expectedBase}video-480p.mp4` ||
    value.thumbnailUrl !==
      `${expectedBase}thumbnail0000000000.jpeg`
  ) {
    throw new Error(
      'INVALID_MEDIA_PLAYBACK_SESSION_RESPONSE'
    );
  }

  return {
    mediaId:
      requestedMediaId,
    expiresAtMs:
      value.expiresAtMs,
    masterManifestUrl:
      value.masterManifestUrl,
    mp4Urls: [
      value.mp4Urls[0],
      value.mp4Urls[1],
      value.mp4Urls[2],
    ],
    thumbnailUrl:
      value.thumbnailUrl,
  };
}

export async function createMediaPlaybackClientSession(
  input: CreateMediaPlaybackClientSessionInput
): Promise<MediaPlaybackClientSession> {
  if (
    typeof input.mediaId !==
      'string' ||
    input.mediaId.trim() !==
      input.mediaId ||
    !SAFE_MEDIA_ID_PATTERN.test(
      input.mediaId
    )
  ) {
    throw new Error(
      'INVALID_MEDIA_PLAYBACK_CLIENT_INPUT'
    );
  }

  const idToken =
    await input.getIdToken();

  if (
    typeof idToken !== 'string' ||
    idToken.length === 0 ||
    idToken.length > 16_384 ||
    /\s/.test(idToken)
  ) {
    throw new Error(
      'INVALID_MEDIA_PLAYBACK_CLIENT_AUTHORITY'
    );
  }

  const fetchImplementation =
    input.fetchImplementation ??
    fetch;

  const response =
    await fetchImplementation(
      '/api/media/playback/session',
      {
        method:
          'POST',
        credentials:
          'same-origin',
        cache:
          'no-store',
        headers: {
          Authorization:
            `Bearer ${idToken}`,
          'Content-Type':
            'application/json',
          Accept:
            'application/json',
        },
        body:
          JSON.stringify({
            mediaId:
              input.mediaId,
          }),
      }
    );

  if (!response.ok) {
    throw new Error(
      'MEDIA_PLAYBACK_SESSION_REQUEST_FAILED'
    );
  }

  const rawBody =
    await response.text();

  if (
    new TextEncoder()
      .encode(rawBody)
      .byteLength >
    MAX_RESPONSE_BYTES
  ) {
    throw new Error(
      'INVALID_MEDIA_PLAYBACK_SESSION_RESPONSE'
    );
  }

  let value:
    unknown;

  try {
    value =
      JSON.parse(
        rawBody
      );
  } catch {
    throw new Error(
      'INVALID_MEDIA_PLAYBACK_SESSION_RESPONSE'
    );
  }

  return parsePlaybackSession(
    value,
    input.mediaId
  );
}
