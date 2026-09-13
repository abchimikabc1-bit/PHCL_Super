import 'server-only';

const MAX_REQUEST_BODY_BYTES =
  4 * 1024;

export type MediaIngestRequestBody = {
  sourceFileName: string;
  contentType: string;
  declaredSizeBytes: number;
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
    keys.length !== 3 ||
    !keys.includes(
      'sourceFileName'
    ) ||
    !keys.includes(
      'contentType'
    ) ||
    !keys.includes(
      'declaredSizeBytes'
    ) ||
    typeof parsed.sourceFileName !==
      'string' ||
    typeof parsed.contentType !==
      'string' ||
    typeof parsed.declaredSizeBytes !==
      'number'
  ) {
    throw new Error(
      'INVALID_REQUEST'
    );
  }

  return {
    sourceFileName:
      parsed.sourceFileName,

    contentType:
      parsed.contentType,

    declaredSizeBytes:
      parsed.declaredSizeBytes,
  };
}