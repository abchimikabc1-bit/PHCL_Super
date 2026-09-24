import 'server-only';

const MAX_REQUEST_BODY_BYTES =
  64 * 1024;

const MAX_DECODED_MESSAGE_BYTES =
  8 * 1024;

const TRANSCODER_JOB_NAME_PATTERN =
  /^projects\/([a-z][a-z0-9-]{4,28}[a-z0-9]|[1-9][0-9]{5,19})\/locations\/[a-z][a-z0-9-]{0,62}\/jobs\/[A-Za-z0-9_-]+$/;

export type MediaTranscodeCompletionState =
  | 'SUCCEEDED'
  | 'FAILED';

export type MediaTranscodeCompletionInvocation = {
  messageId: string;
  jobName: string;
  state: MediaTranscodeCompletionState;
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

function isCanonicalNonEmptyString(
  value: unknown
): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.trim() === value
  );
}

function invalidInvocation(): never {
  throw new Error(
    'INVALID_MEDIA_TRANSCODE_COMPLETION_INVOCATION'
  );
}

function readDeclaredLength(
  request: Request
): void {
  const contentLength =
    request.headers.get(
      'content-length'
    );

  if (!contentLength) {
    return;
  }

  if (
    !/^[0-9]+$/.test(
      contentLength
    )
  ) {
    throw new Error(
      'REQUEST_TOO_LARGE'
    );
  }

  const parsedLength =
    Number(contentLength);

  if (
    !Number.isSafeInteger(
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

function decodeCanonicalBase64(
  value: unknown
): string {
  if (
    !isCanonicalNonEmptyString(
      value
    ) ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      value
    )
  ) {
    return invalidInvocation();
  }

  const decoded =
    Buffer.from(
      value,
      'base64'
    );

  if (
    decoded.length === 0 ||
    decoded.length >
      MAX_DECODED_MESSAGE_BYTES ||
    decoded.toString('base64') !==
      value
  ) {
    return invalidInvocation();
  }

  return decoded.toString(
    'utf8'
  );
}

function parseJobResult(
  decodedMessage: string
): {
  jobName: string;
  state: MediaTranscodeCompletionState;
} {
  let parsed: unknown;

  try {
    parsed =
      JSON.parse(
        decodedMessage
      );
  } catch {
    return invalidInvocation();
  }

  if (
    !isPlainRecord(parsed) ||
    !isPlainRecord(parsed.job)
  ) {
    return invalidInvocation();
  }

  const jobName =
    parsed.job.name;

  const state =
    parsed.job.state;

  if (
    !isCanonicalNonEmptyString(
      jobName
    ) ||
    !TRANSCODER_JOB_NAME_PATTERN.test(
      jobName
    ) ||
    (
      state !== 'SUCCEEDED' &&
      state !== 'FAILED'
    )
  ) {
    return invalidInvocation();
  }

  return {
    jobName,
    state,
  };
}

export async function readMediaTranscodeCompletionPubSubInvocation(
  request: Request
): Promise<MediaTranscodeCompletionInvocation> {
  readDeclaredLength(
    request
  );

  const raw =
    await request.text();

  if (
    Buffer.byteLength(
      raw,
      'utf8'
    ) > MAX_REQUEST_BODY_BYTES
  ) {
    throw new Error(
      'REQUEST_TOO_LARGE'
    );
  }

  let envelope: unknown;

  try {
    envelope =
      JSON.parse(raw);
  } catch {
    return invalidInvocation();
  }

  if (
    !isPlainRecord(envelope) ||
    !isPlainRecord(envelope.message) ||
    !isCanonicalNonEmptyString(
      envelope.message.messageId
    )
  ) {
    return invalidInvocation();
  }

  const decodedMessage =
    decodeCanonicalBase64(
      envelope.message.data
    );

  const jobResult =
    parseJobResult(
      decodedMessage
    );

  return {
    messageId:
      envelope.message.messageId,
    jobName:
      jobResult.jobName,
    state:
      jobResult.state,
  };
}
