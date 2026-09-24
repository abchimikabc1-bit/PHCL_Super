import 'server-only';

import {
  adminDb,
} from '@/lib/firebase-admin';

import {
  buildMediaIngestPath,
} from '@/lib/media-storage-paths';

import {
  MEDIA_READY_STATUS,
} from '@/lib/media-transcode-processing-completion-authority';

import {
  MEDIA_TRANSCODE_FAILED_STATUS,
  MEDIA_TRANSCODER_FAILURE_CODE,
} from '@/lib/media-transcode-processing-failure-authority';

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

export type MediaTranscodeCompletionEvidence = {
  mediaId: string;
  sourceObject: string;
  verifiedGeneration: string;
  transcoderJobName: string;
  status:
    | typeof MEDIA_TRANSCODING_STATUS
    | typeof MEDIA_READY_STATUS
    | typeof MEDIA_TRANSCODE_FAILED_STATUS;
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

function assertJobName(
  transcoderJobName: string
): void {
  if (
    !TRANSCODER_JOB_NAME_PATTERN.test(
      transcoderJobName
    )
  ) {
    throw new Error(
      'INVALID_MEDIA_TRANSCODE_COMPLETION_JOB_NAME'
    );
  }
}

function parseEvidence(
  documentId: string,
  value: unknown,
  expectedJobName: string
): MediaTranscodeCompletionEvidence {
  if (!isPlainRecord(value)) {
    throw new Error(
      'INVALID_MEDIA_TRANSCODE_COMPLETION_EVIDENCE'
    );
  }

  if (
    value.schemaVersion !==
      MEDIA_SCHEMA_VERSION ||
    value.mediaId !== documentId ||
    !isCanonicalNonEmptyString(
      value.mediaId
    ) ||
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
    !/^[0-9]{1,32}$/.test(
      String(
        value.verifiedGeneration ?? ''
      )
    ) ||
    value.validatedGeneration !==
      value.verifiedGeneration ||
    value.transcodeSubmittedGeneration !==
      value.verifiedGeneration ||
    value.transcoderJobName !==
      expectedJobName ||
    !isValidTimestampMs(
      value.transcodeSubmittedAtMs
    ) ||
    !isValidTimestampMs(
      value.createdAtMs
    ) ||
    !isValidTimestampMs(
      value.updatedAtMs
    ) ||
    (
      value.status !==
        MEDIA_TRANSCODING_STATUS &&
      value.status !==
        MEDIA_READY_STATUS &&
      value.status !==
        MEDIA_TRANSCODE_FAILED_STATUS
    )
  ) {
    throw new Error(
      'INVALID_MEDIA_TRANSCODE_COMPLETION_EVIDENCE'
    );
  }

  let canonicalSourceObject:
    string;

  try {
    canonicalSourceObject =
      buildMediaIngestPath(
        value.ownerId,
        value.mediaId,
        value.sourceFileName
      );
  } catch {
    throw new Error(
      'INVALID_MEDIA_TRANSCODE_COMPLETION_EVIDENCE'
    );
  }

  if (
    value.sourceObject !==
    canonicalSourceObject
  ) {
    throw new Error(
      'INVALID_MEDIA_TRANSCODE_COMPLETION_EVIDENCE'
    );
  }

  if (
    value.status ===
      MEDIA_TRANSCODE_FAILED_STATUS &&
    (
      value.transcodeFailedGeneration !==
        value.verifiedGeneration ||
      value.transcodeFailureCode !==
        MEDIA_TRANSCODER_FAILURE_CODE ||
      !isValidTimestampMs(
        value.transcodeFailedAtMs
      )
    )
  ) {
    throw new Error(
      'INVALID_MEDIA_TRANSCODE_COMPLETION_EVIDENCE'
    );
  }

  return {
    mediaId:
      value.mediaId,
    sourceObject:
      value.sourceObject,
    verifiedGeneration:
      value.verifiedGeneration as string,
    transcoderJobName:
      expectedJobName,
    status:
      value.status,
  };
}

export async function readMediaTranscodeCompletionEvidence(
  transcoderJobName: string
): Promise<MediaTranscodeCompletionEvidence | null> {
  assertJobName(
    transcoderJobName
  );

  const snapshot =
    await adminDb
      .collection(MEDIA_COLLECTION)
      .where(
        'transcoderJobName',
        '==',
        transcoderJobName
      )
      .limit(2)
      .get();

  if (snapshot.empty) {
    return null;
  }

  if (snapshot.size !== 1) {
    throw new Error(
      'AMBIGUOUS_MEDIA_TRANSCODE_COMPLETION_EVIDENCE'
    );
  }

  const document =
    snapshot.docs[0];

  if (!document) {
    throw new Error(
      'INVALID_MEDIA_TRANSCODE_COMPLETION_EVIDENCE'
    );
  }

  return parseEvidence(
    document.id,
    document.data(),
    transcoderJobName
  );
}
