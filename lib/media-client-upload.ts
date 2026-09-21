export type MediaClientUploadInput = {
  file: File;

  getIdToken:
    () => Promise<string>;

  fetch?:
    typeof fetch;
};

export type MediaClientUploadResult = {
  mediaId: string;

  sourceObject: string;

  status: 'VALIDATING';
};

type MediaIngestResponse = {
  mediaId: string;

  sourceObject: string;

  status: 'UPLOADING';
};

type MediaUploadSessionResponse = {
  sourceObject: string;

  uploadUri: string;
};

type MediaFinalizeResponse = {
  mediaId: string;

  status: 'VALIDATING';
};

function isRecord(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function requireNonEmptyString(
  value: unknown,
  errorCode: string,
): string {
  if (
    typeof value !== 'string' ||
    value.trim().length === 0
  ) {
    throw new Error(
      errorCode,
    );
  }

  return value;
}

function requireMediaFile(
  file: File,
): void {
  if (
    !(file instanceof File) ||
    file.name.trim().length === 0 ||
    file.type !== 'video/mp4' ||
    !Number.isSafeInteger(
      file.size,
    ) ||
    file.size <= 0 ||
    file.size >
      524_288_000
  ) {
    throw new Error(
      'MEDIA_UPLOAD_FILE_INVALID',
    );
  }
}

async function readJson(
  response: Response,
  errorCode: string,
): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error(
      errorCode,
    );
  }
}

function parseIngestResponse(
  value: unknown,
): MediaIngestResponse {
  if (!isRecord(value)) {
    throw new Error(
      'MEDIA_INGEST_RESPONSE_INVALID',
    );
  }

  const mediaId =
    requireNonEmptyString(
      value.mediaId,
      'MEDIA_INGEST_RESPONSE_INVALID',
    );

  const sourceObject =
    requireNonEmptyString(
      value.sourceObject,
      'MEDIA_INGEST_RESPONSE_INVALID',
    );

  if (
    value.status !==
      'UPLOADING'
  ) {
    throw new Error(
      'MEDIA_INGEST_RESPONSE_INVALID',
    );
  }

  return {
    mediaId,
    sourceObject,
    status:
      'UPLOADING',
  };
}

function parseUploadSessionResponse(
  value: unknown,
): MediaUploadSessionResponse {
  if (!isRecord(value)) {
    throw new Error(
      'MEDIA_UPLOAD_SESSION_RESPONSE_INVALID',
    );
  }

  return {
    sourceObject:
      requireNonEmptyString(
        value.sourceObject,
        'MEDIA_UPLOAD_SESSION_RESPONSE_INVALID',
      ),

    uploadUri:
      requireNonEmptyString(
        value.uploadUri,
        'MEDIA_UPLOAD_SESSION_RESPONSE_INVALID',
      ),
  };
}

function parseFinalizeResponse(
  value: unknown,
): MediaFinalizeResponse {
  if (!isRecord(value)) {
    throw new Error(
      'MEDIA_FINALIZE_RESPONSE_INVALID',
    );
  }

  const mediaId =
    requireNonEmptyString(
      value.mediaId,
      'MEDIA_FINALIZE_RESPONSE_INVALID',
    );

  if (
    value.status !==
      'VALIDATING'
  ) {
    throw new Error(
      'MEDIA_FINALIZE_RESPONSE_INVALID',
    );
  }

  return {
    mediaId,
    status:
      'VALIDATING',
  };
}

function createAuthenticatedHeaders(
  idToken: string,
): Headers {
  const token =
    idToken.trim();

  if (!token) {
    throw new Error(
      'MEDIA_UPLOAD_AUTH_REQUIRED',
    );
  }

  return new Headers({
    Authorization:
      `Bearer ${token}`,

    'Content-Type':
      'application/json',
  });
}

export async function executeMediaClientUpload(
  input: MediaClientUploadInput,
): Promise<MediaClientUploadResult> {
  requireMediaFile(
    input.file,
  );

  const fetchImpl =
    input.fetch ??
    globalThis.fetch;

  if (
    typeof fetchImpl !==
      'function'
  ) {
    throw new Error(
      'MEDIA_UPLOAD_FETCH_UNAVAILABLE',
    );
  }

  const idToken =
    await input.getIdToken();

  const authenticatedHeaders =
    createAuthenticatedHeaders(
      idToken,
    );

  const ingestResponse =
    await fetchImpl(
      '/api/media/ingest',
      {
        method:
          'POST',

        headers:
          authenticatedHeaders,

        body:
          JSON.stringify({
            sourceFileName:
              input.file.name,

            contentType:
              input.file.type,

            declaredSizeBytes:
              input.file.size,
          }),
      },
    );

  if (!ingestResponse.ok) {
    throw new Error(
      'MEDIA_INGEST_FAILED',
    );
  }

  const ingest =
    parseIngestResponse(
      await readJson(
        ingestResponse,
        'MEDIA_INGEST_RESPONSE_INVALID',
      ),
    );

  const uploadSessionResponse =
    await fetchImpl(
      '/api/media/upload-session',
      {
        method:
          'POST',

        headers:
          authenticatedHeaders,

        body:
          JSON.stringify({
            mediaId:
              ingest.mediaId,
          }),
      },
    );

  if (
    !uploadSessionResponse.ok
  ) {
    throw new Error(
      'MEDIA_UPLOAD_SESSION_FAILED',
    );
  }

  const uploadSession =
    parseUploadSessionResponse(
      await readJson(
        uploadSessionResponse,
        'MEDIA_UPLOAD_SESSION_RESPONSE_INVALID',
      ),
    );

  if (
    uploadSession.sourceObject !==
    ingest.sourceObject
  ) {
    throw new Error(
      'MEDIA_UPLOAD_SOURCE_MISMATCH',
    );
  }

  const storageResponse =
    await fetchImpl(
      uploadSession.uploadUri,
      {
        method:
          'PUT',

        headers: {
          'Content-Type':
            input.file.type,
        },

        body:
          input.file,
      },
    );

  if (!storageResponse.ok) {
    throw new Error(
      'MEDIA_STORAGE_UPLOAD_FAILED',
    );
  }

  const finalizeResponse =
    await fetchImpl(
      '/api/media/finalize',
      {
        method:
          'POST',

        headers:
          authenticatedHeaders,

        body:
          JSON.stringify({
            mediaId:
              ingest.mediaId,
          }),
      },
    );

  if (!finalizeResponse.ok) {
    throw new Error(
      'MEDIA_FINALIZE_FAILED',
    );
  }

  const finalized =
    parseFinalizeResponse(
      await readJson(
        finalizeResponse,
        'MEDIA_FINALIZE_RESPONSE_INVALID',
      ),
    );

  if (
    finalized.mediaId !==
    ingest.mediaId
  ) {
    throw new Error(
      'MEDIA_FINALIZE_ID_MISMATCH',
    );
  }

  return {
    mediaId:
      finalized.mediaId,

    sourceObject:
      ingest.sourceObject,

    status:
      finalized.status,
  };
}