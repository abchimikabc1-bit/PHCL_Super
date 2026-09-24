import 'server-only';

import {
  FieldValue,
} from 'firebase-admin/firestore';

import {
  adminDb,
} from '@/lib/firebase-admin';

import {
  buildMediaIngestPath,
} from '@/lib/media-storage-paths';

import {
  MEDIA_TRANSCODING_STATUS,
} from '@/lib/media-transcode-work-completion-authority';

const MEDIA_COLLECTION =
  'media';

const MEDIA_SCHEMA_VERSION =
  2;

const MEDIA_CONTENT_TYPE =
  'video/mp4';

const MAX_MEDIA_SIZE_BYTES =
  524_288_000;

const TRANSCODER_JOB_NAME_PATTERN =
  /^projects\/([a-z][a-z0-9-]{4,28}[a-z0-9]|[1-9][0-9]{5,19})\/locations\/[a-z][a-z0-9-]{0,62}\/jobs\/[A-Za-z0-9_-]+$/;

export const MEDIA_TRANSCODE_FAILED_STATUS =
  'TRANSCODE_FAILED' as const;

export const MEDIA_TRANSCODER_FAILURE_CODE =
  'TRANSCODER_JOB_FAILED' as const;

export type FailMediaTranscodeProcessingInput = {
  mediaId: string;
  sourceObject: string;
  verifiedGeneration: string;
  transcoderJobName: string;
  nowMs: number;
};

export type MediaTranscodeProcessingFailureResult = {
  mediaId: string;
  status:
    typeof MEDIA_TRANSCODE_FAILED_STATUS;
  verifiedGeneration: string;
  transcoderJobName: string;
  failureCode:
    typeof MEDIA_TRANSCODER_FAILURE_CODE;
  failedAtMs: number;
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

function isValidTimestampMs(
  value: unknown
): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}

function invalidFailure(): never {
  throw new Error(
    'INVALID_MEDIA_TRANSCODE_PROCESSING_FAILURE'
  );
}

function assertInput(
  input: FailMediaTranscodeProcessingInput
): void {
  try {
    buildMediaIngestPath(
      'transcode-processing-failure',
      input.mediaId,
      'source.mp4'
    );
  } catch {
    return invalidFailure();
  }

  if (
    !isCanonicalNonEmptyString(
      input.sourceObject
    ) ||
    !/^[0-9]{1,32}$/.test(
      input.verifiedGeneration
    ) ||
    !TRANSCODER_JOB_NAME_PATTERN.test(
      input.transcoderJobName
    ) ||
    !isValidTimestampMs(
      input.nowMs
    )
  ) {
    return invalidFailure();
  }
}

function assertBaseMedia(
  value: unknown,
  input: FailMediaTranscodeProcessingInput
): asserts value is Record<string, unknown> {
  if (!isPlainRecord(value)) {
    throw new Error(
      'INVALID_MEDIA_METADATA'
    );
  }

  if (
    value.schemaVersion !==
      MEDIA_SCHEMA_VERSION ||
    value.mediaId !== input.mediaId ||
    !isCanonicalNonEmptyString(
      value.ownerId
    ) ||
    !isCanonicalNonEmptyString(
      value.sourceObject
    ) ||
    !isCanonicalNonEmptyString(
      value.sourceFileName
    ) ||
    value.contentType !==
      MEDIA_CONTENT_TYPE ||
    typeof value.declaredSizeBytes !==
      'number' ||
    !Number.isSafeInteger(
      value.declaredSizeBytes
    ) ||
    value.declaredSizeBytes <= 0 ||
    value.declaredSizeBytes >
      MAX_MEDIA_SIZE_BYTES ||
    !isCanonicalNonEmptyString(
      value.verifiedGeneration
    ) ||
    value.validatedGeneration !==
      value.verifiedGeneration ||
    !isValidTimestampMs(
      value.createdAtMs
    ) ||
    !isValidTimestampMs(
      value.updatedAtMs
    ) ||
    value.sourceObject !==
      input.sourceObject ||
    value.verifiedGeneration !==
      input.verifiedGeneration ||
    value.transcoderJobName !==
      input.transcoderJobName ||
    value.transcodeSubmittedGeneration !==
      input.verifiedGeneration ||
    !isValidTimestampMs(
      value.transcodeSubmittedAtMs
    )
  ) {
    throw new Error(
      'MEDIA_TRANSCODE_FAILURE_MISMATCH'
    );
  }

  let canonicalSourceObject:
    string;

  try {
    canonicalSourceObject =
      buildMediaIngestPath(
        value.ownerId,
        input.mediaId,
        value.sourceFileName
      );
  } catch {
    throw new Error(
      'INVALID_MEDIA_METADATA'
    );
  }

  if (
    value.sourceObject !==
    canonicalSourceObject
  ) {
    throw new Error(
      'INVALID_MEDIA_METADATA'
    );
  }
}

function buildResult(
  input: FailMediaTranscodeProcessingInput,
  failedAtMs: number
): MediaTranscodeProcessingFailureResult {
  return {
    mediaId:
      input.mediaId,
    status:
      MEDIA_TRANSCODE_FAILED_STATUS,
    verifiedGeneration:
      input.verifiedGeneration,
    transcoderJobName:
      input.transcoderJobName,
    failureCode:
      MEDIA_TRANSCODER_FAILURE_CODE,
    failedAtMs,
  };
}

function readIdempotentFailureResult(
  media: Record<string, unknown>,
  input: FailMediaTranscodeProcessingInput
): MediaTranscodeProcessingFailureResult | null {
  if (
    media.status !==
      MEDIA_TRANSCODE_FAILED_STATUS
  ) {
    return null;
  }

  if (
    media.transcodeFailedGeneration !==
      input.verifiedGeneration ||
    media.transcodeFailureCode !==
      MEDIA_TRANSCODER_FAILURE_CODE ||
    !isValidTimestampMs(
      media.transcodeFailedAtMs
    )
  ) {
    throw new Error(
      'MEDIA_TRANSCODE_FAILURE_MISMATCH'
    );
  }

  return buildResult(
    input,
    media.transcodeFailedAtMs
  );
}

export async function failMediaTranscodeProcessing(
  input: FailMediaTranscodeProcessingInput
): Promise<MediaTranscodeProcessingFailureResult> {
  assertInput(
    input
  );

  const mediaRef =
    adminDb
      .collection(MEDIA_COLLECTION)
      .doc(input.mediaId);

  return adminDb.runTransaction(
    async (transaction) => {
      const snapshot =
        await transaction.get(
          mediaRef
        );

      if (!snapshot.exists) {
        throw new Error(
          'MEDIA_NOT_FOUND'
        );
      }

      const media =
        snapshot.data();

      assertBaseMedia(
        media,
        input
      );

      const idempotentResult =
        readIdempotentFailureResult(
          media,
          input
        );

      if (idempotentResult) {
        return idempotentResult;
      }

      if (
        media.status !==
          MEDIA_TRANSCODING_STATUS ||
        input.nowMs <
          (media.transcodeSubmittedAtMs as number)
      ) {
        throw new Error(
          'MEDIA_INVALID_TRANSCODE_FAILURE_TRANSITION'
        );
      }

      transaction.update(
        mediaRef,
        {
          status:
            MEDIA_TRANSCODE_FAILED_STATUS,
          transcodeFailedGeneration:
            input.verifiedGeneration,
          transcodeFailureCode:
            MEDIA_TRANSCODER_FAILURE_CODE,
          transcodeFailedAtMs:
            input.nowMs,
          updatedAtMs:
            input.nowMs,
          serverUpdatedAt:
            FieldValue.serverTimestamp(),
        }
      );

      return buildResult(
        input,
        input.nowMs
      );
    }
  );
}
