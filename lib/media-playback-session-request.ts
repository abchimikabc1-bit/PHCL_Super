const MAX_PLAYBACK_SESSION_REQUEST_BYTES =
  1_024;

const SAFE_MEDIA_ID_PATTERN =
  /^[A-Za-z0-9_-]{1,128}$/;

export type MediaPlaybackSessionRequest = {
  mediaId: string;
};

function isPlainRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function readDeclaredLength(
  request: Request
): number | null {
  const rawLength =
    request.headers.get(
      'content-length'
    );

  if (rawLength === null) {
    return null;
  }

  if (
    !/^[0-9]+$/.test(
      rawLength
    )
  ) {
    throw new Error(
      'INVALID_CONTENT_LENGTH'
    );
  }

  const parsedLength =
    Number(rawLength);

  if (
    !Number.isSafeInteger(
      parsedLength
    ) ||
    parsedLength < 0
  ) {
    throw new Error(
      'INVALID_CONTENT_LENGTH'
    );
  }

  return parsedLength;
}

export async function readMediaPlaybackSessionRequest(
  request: Request
): Promise<MediaPlaybackSessionRequest> {
  const declaredLength =
    readDeclaredLength(
      request
    );

  if (
    declaredLength !== null &&
    declaredLength >
      MAX_PLAYBACK_SESSION_REQUEST_BYTES
  ) {
    throw new Error(
      'REQUEST_TOO_LARGE'
    );
  }

  const rawBody =
    await request.text();

  if (
    Buffer.byteLength(
      rawBody,
      'utf8'
    ) >
      MAX_PLAYBACK_SESSION_REQUEST_BYTES
  ) {
    throw new Error(
      'REQUEST_TOO_LARGE'
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
      'INVALID_MEDIA_PLAYBACK_SESSION_REQUEST'
    );
  }

  if (
    !isPlainRecord(value) ||
    Object.keys(value).length !== 1 ||
    typeof value.mediaId !==
      'string' ||
    value.mediaId.trim() !==
      value.mediaId ||
    !SAFE_MEDIA_ID_PATTERN.test(
      value.mediaId
    )
  ) {
    throw new Error(
      'INVALID_MEDIA_PLAYBACK_SESSION_REQUEST'
    );
  }

  return {
    mediaId:
      value.mediaId,
  };
}
