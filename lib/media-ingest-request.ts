import 'server-only';

const MAX_REQUEST_BODY_BYTES =
  4 * 1024;

export type MediaIngestRequestBody = {
  sourceFileName: string;
};

function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

export async function readMediaIngestRequest(
  request: Request
): Promise<MediaIngestRequestBody> {
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
    throw new Error(
      'INVALID_REQUEST'
    );
  }

  if (!isPlainObject(parsed)) {
    throw new Error(
      'INVALID_REQUEST'
    );
  }

  const keys =
    Object.keys(parsed);

  if (
    keys.length !== 1 ||
    keys[0] !==
      'sourceFileName' ||
    typeof parsed.sourceFileName !==
      'string'
  ) {
    throw new Error(
      'INVALID_REQUEST'
    );
  }

  return {
    sourceFileName:
      parsed.sourceFileName,
  };
}
