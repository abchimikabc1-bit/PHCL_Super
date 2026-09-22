import 'server-only';

import {
  buildMediaIngestPath,
} from '@/lib/media-storage-paths';

const MAX_REQUEST_BODY_BYTES =
  4 * 1024;

export type MediaTranscodeWorkerInvocation = {
  mediaId: string;
};

function invalidRequest(): never {
  throw new Error(
    'INVALID_REQUEST'
  );
}

function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function assertMediaId(
  value: unknown
): asserts value is string {
  if (typeof value !== 'string') {
    return invalidRequest();
  }

  try {
    buildMediaIngestPath(
      'transcode-invocation',
      value,
      'source.mp4'
    );
  } catch {
    return invalidRequest();
  }
}

export async function readMediaTranscodeWorkerInvocation(
  request: Request
): Promise<MediaTranscodeWorkerInvocation> {
  const contentLength =
    request.headers.get(
      'content-length'
    );

  if (contentLength) {
    const parsedLength =
      Number(contentLength);

    if (
      !Number.isFinite(
        parsedLength
      ) ||
      parsedLength < 0 ||
      parsedLength >
        MAX_REQUEST_BODY_BYTES
    ) {
      throw new Error(
        'REQUEST_TOO_LARGE'
      );
    }
  }

  const raw =
    await request.text();

  if (
    Buffer.byteLength(
      raw,
      'utf8'
    ) >
    MAX_REQUEST_BODY_BYTES
  ) {
    throw new Error(
      'REQUEST_TOO_LARGE'
    );
  }

  let parsed: unknown;

  try {
    parsed =
      JSON.parse(raw);
  } catch {
    return invalidRequest();
  }

  if (!isPlainObject(parsed)) {
    return invalidRequest();
  }

  const keys =
    Object.keys(parsed);

  if (
    keys.length !== 1 ||
    keys[0] !== 'mediaId'
  ) {
    return invalidRequest();
  }

  assertMediaId(
    parsed.mediaId
  );

  return {
    mediaId:
      parsed.mediaId,
  };
}
