import 'server-only';

import {
  FieldValue,
} from 'firebase-admin/firestore';

import {
  adminDb,
} from '@/lib/firebase-admin';

import type {
  MediaTranscodeOutputEvidence,
} from '@/lib/media-transcode-output-evidence';

import {
  buildMediaIngestPath,
  buildMediaProcessedPath,
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

const HLS_MANIFEST_FILES = [
  'hls-1080p.m3u8',
  'hls-720p.m3u8',
  'hls-480p.m3u8',
] as const;

const HLS_FIRST_SEGMENT_FILES = [
  'hls-1080p0000000000.ts',
  'hls-720p0000000000.ts',
  'hls-480p0000000000.ts',
] as const;

const MP4_FILES = [
  'video-1080p.mp4',
  'video-720p.mp4',
  'video-480p.mp4',
] as const;

export const MEDIA_READY_STATUS =
  'READY' as const;

export type CompleteMediaTranscodeProcessingInput = {
  mediaId: string;
  sourceObject: string;
  verifiedGeneration: string;
  transcoderJobName: string;
  outputEvidence:
    MediaTranscodeOutputEvidence;
  nowMs: number;
};

export type MediaTranscodeProcessingCompletionResult = {
  mediaId: string;
  status: typeof MEDIA_READY_STATUS;
  verifiedGeneration: string;
  transcoderJobName: string;
  outputPrefix: string;
  masterManifestObject: string;
  mp4Objects: string[];
  thumbnailObject: string;
  completedAtMs: number;
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

function arraysEqual(
  left: unknown,
  right: readonly string[]
): boolean {
  return (
    Array.isArray(left) &&
    left.length === right.length &&
    left.every(
      (value, index) =>
        value === right[index]
    )
  );
}

function buildProcessedObject(
  mediaId: string,
  fileName: string
): string {
  try {
    return buildMediaProcessedPath(
      mediaId,
      fileName
    );
  } catch {
    throw new Error(
      'INVALID_MEDIA_TRANSCODE_PROCESSING_COMPLETION'
    );
  }
}

function assertOutputEvidence(
  mediaId: string,
  evidence: MediaTranscodeOutputEvidence
): void {
  const expectedPrefix =
    `media/processed/${mediaId}/`;

  const expectedMasterManifest =
    buildProcessedObject(
      mediaId,
      'master.m3u8'
    );

  const expectedHlsManifests =
    HLS_MANIFEST_FILES.map(
      (fileName) =>
        buildProcessedObject(
          mediaId,
          fileName
        )
    );

  const expectedFirstSegments =
    HLS_FIRST_SEGMENT_FILES.map(
      (fileName) =>
        buildProcessedObject(
          mediaId,
          fileName
        )
    );

  const expectedMp4Objects =
    MP4_FILES.map(
      (fileName) =>
        buildProcessedObject(
          mediaId,
          fileName
        )
    );

  const expectedThumbnail =
    buildProcessedObject(
      mediaId,
      'thumbnail0000000000.jpeg'
    );

  if (
    evidence.mediaId !== mediaId ||
    evidence.outputPrefix !==
      expectedPrefix ||
    evidence.masterManifestObject !==
      expectedMasterManifest ||
    !arraysEqual(
      evidence.hlsManifestObjects,
      expectedHlsManifests
    ) ||
    !arraysEqual(
      evidence.hlsFirstSegmentObjects,
      expectedFirstSegments
    ) ||
    !arraysEqual(
      evidence.mp4Objects,
      expectedMp4Objects
    ) ||
    evidence.thumbnailObject !==
      expectedThumbnail
  ) {
    throw new Error(
      'INVALID_MEDIA_TRANSCODE_OUTPUT_EVIDENCE'
    );
  }
}

function assertInput(
  input: CompleteMediaTranscodeProcessingInput
): void {
  try {
    buildMediaIngestPath(
      'transcode-processing-completion',
      input.mediaId,
      'source.mp4'
    );
  } catch {
    throw new Error(
      'INVALID_MEDIA_TRANSCODE_PROCESSING_COMPLETION'
    );
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
    throw new Error(
      'INVALID_MEDIA_TRANSCODE_PROCESSING_COMPLETION'
    );
  }

  assertOutputEvidence(
    input.mediaId,
    input.outputEvidence
  );
}

function assertBaseMedia(
  value: unknown,
  input: CompleteMediaTranscodeProcessingInput
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
      'MEDIA_TRANSCODE_COMPLETION_MISMATCH'
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
  input: CompleteMediaTranscodeProcessingInput,
  completedAtMs: number
): MediaTranscodeProcessingCompletionResult {
  return {
    mediaId:
      input.mediaId,
    status:
      MEDIA_READY_STATUS,
    verifiedGeneration:
      input.verifiedGeneration,
    transcoderJobName:
      input.transcoderJobName,
    outputPrefix:
      input.outputEvidence.outputPrefix,
    masterManifestObject:
      input.outputEvidence
        .masterManifestObject,
    mp4Objects:
      [...input.outputEvidence.mp4Objects],
    thumbnailObject:
      input.outputEvidence.thumbnailObject,
    completedAtMs,
  };
}

function readIdempotentReadyResult(
  media: Record<string, unknown>,
  input: CompleteMediaTranscodeProcessingInput
): MediaTranscodeProcessingCompletionResult | null {
  if (
    media.status !==
      MEDIA_READY_STATUS
  ) {
    return null;
  }

  if (
    media.transcodeCompletedGeneration !==
      input.verifiedGeneration ||
    media.processedOutputPrefix !==
      input.outputEvidence.outputPrefix ||
    media.masterManifestObject !==
      input.outputEvidence
        .masterManifestObject ||
    !arraysEqual(
      media.hlsManifestObjects,
      input.outputEvidence
        .hlsManifestObjects
    ) ||
    !arraysEqual(
      media.mp4Objects,
      input.outputEvidence.mp4Objects
    ) ||
    media.thumbnailObject !==
      input.outputEvidence.thumbnailObject ||
    !isValidTimestampMs(
      media.transcodeCompletedAtMs
    )
  ) {
    throw new Error(
      'MEDIA_TRANSCODE_COMPLETION_MISMATCH'
    );
  }

  return buildResult(
    input,
    media.transcodeCompletedAtMs
  );
}

export async function completeMediaTranscodeProcessing(
  input: CompleteMediaTranscodeProcessingInput
): Promise<MediaTranscodeProcessingCompletionResult> {
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
        readIdempotentReadyResult(
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
          'MEDIA_INVALID_TRANSCODE_COMPLETION_TRANSITION'
        );
      }

      transaction.update(
        mediaRef,
        {
          status:
            MEDIA_READY_STATUS,
          transcodeCompletedGeneration:
            input.verifiedGeneration,
          transcodeCompletedAtMs:
            input.nowMs,
          processedOutputPrefix:
            input.outputEvidence.outputPrefix,
          masterManifestObject:
            input.outputEvidence
              .masterManifestObject,
          hlsManifestObjects:
            input.outputEvidence
              .hlsManifestObjects,
          mp4Objects:
            input.outputEvidence.mp4Objects,
          thumbnailObject:
            input.outputEvidence
              .thumbnailObject,
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
