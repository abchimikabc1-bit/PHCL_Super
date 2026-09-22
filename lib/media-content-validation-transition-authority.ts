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

import type {
  MediaContentProbe,
  MediaContentValidationFailureReason,
  MediaContentValidationResult,
} from '@/lib/media-content-validation';

import {
  buildMediaTranscodeWork,
} from '@/lib/media-transcode-work-authority';

const MEDIA_COLLECTION =
  'media';

const MEDIA_TRANSCODE_WORK_COLLECTION =
  'mediaTranscodeWork';

const MEDIA_SCHEMA_VERSION =
  2;

const MEDIA_CONTENT_TYPE =
  'video/mp4';

const MAX_MEDIA_SIZE_BYTES =
  524_288_000;

const MEDIA_VALIDATING_STATUS =
  'VALIDATING';

export const MEDIA_TRANSCODE_PENDING_STATUS =
  'TRANSCODE_PENDING' as const;

export const MEDIA_REJECTED_STATUS =
  'REJECTED' as const;

export type MediaPostValidationStatus =
  | typeof MEDIA_TRANSCODE_PENDING_STATUS
  | typeof MEDIA_REJECTED_STATUS;

export type TransitionMediaContentValidationInput = {
  mediaId: string;
  sourceObject: string;
  verifiedGeneration: string;
  validation: MediaContentValidationResult;
};

export type MediaContentValidationTransitionResult = {
  mediaId: string;
  status: MediaPostValidationStatus;
  verifiedGeneration: string;
};

const VALIDATION_FAILURE_REASONS:
  ReadonlySet<string> =
    new Set([
      'INVALID_CONTAINER',
      'INVALID_DURATION',
      'INVALID_VIDEO_CODEC',
      'INVALID_DIMENSIONS',
      'INVALID_FRAME_RATE',
      'INVALID_AUDIO_CODEC',
    ]);

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

function isValidFailureReason(
  value: unknown
): value is MediaContentValidationFailureReason {
  return (
    typeof value === 'string' &&
    VALIDATION_FAILURE_REASONS.has(
      value
    )
  );
}

function isValidProbe(
  value: unknown
): value is MediaContentProbe {
  if (!isPlainRecord(value)) {
    return false;
  }

  const keys =
    Object.keys(value);

  const expectedKeys = [
    'container',
    'durationMs',
    'videoCodec',
    'width',
    'height',
    'frameRate',
    'audioCodec',
  ];

  if (
    keys.length !==
      expectedKeys.length ||
    !expectedKeys.every(
      (key) =>
        Object.prototype
          .hasOwnProperty
          .call(value, key)
    )
  ) {
    return false;
  }

  return (
    isCanonicalNonEmptyString(
      value.container
    ) &&
    typeof value.durationMs ===
      'number' &&
    Number.isSafeInteger(
      value.durationMs
    ) &&
    isCanonicalNonEmptyString(
      value.videoCodec
    ) &&
    typeof value.width ===
      'number' &&
    Number.isSafeInteger(
      value.width
    ) &&
    typeof value.height ===
      'number' &&
    Number.isSafeInteger(
      value.height
    ) &&
    typeof value.frameRate ===
      'number' &&
    Number.isFinite(
      value.frameRate
    ) &&
    isCanonicalNonEmptyString(
      value.audioCodec
    )
  );
}

function assertValidationResult(
  value: unknown
): asserts value is MediaContentValidationResult {
  if (!isPlainRecord(value)) {
    throw new Error(
      'INVALID_MEDIA_VALIDATION_RESULT'
    );
  }

  if (value.valid === true) {
    const keys =
      Object.keys(value);

    if (
      keys.length !== 2 ||
      !Object.prototype
        .hasOwnProperty
        .call(value, 'probe') ||
      !isValidProbe(
        value.probe
      )
    ) {
      throw new Error(
        'INVALID_MEDIA_VALIDATION_RESULT'
      );
    }

    return;
  }

  if (value.valid === false) {
    const keys =
      Object.keys(value);

    if (
      keys.length !== 2 ||
      !Object.prototype
        .hasOwnProperty
        .call(value, 'reason') ||
      !isValidFailureReason(
        value.reason
      )
    ) {
      throw new Error(
        'INVALID_MEDIA_VALIDATION_RESULT'
      );
    }

    return;
  }

  throw new Error(
    'INVALID_MEDIA_VALIDATION_RESULT'
  );
}

function assertTransitionInput(
  input: TransitionMediaContentValidationInput
): void {
  try {
    buildMediaIngestPath(
      'validation',
      input.mediaId,
      'validation.mp4'
    );
  } catch {
    throw new Error(
      'INVALID_MEDIA_VALIDATION'
    );
  }

  if (
    !isCanonicalNonEmptyString(
      input.sourceObject
    ) ||
    !isCanonicalNonEmptyString(
      input.verifiedGeneration
    )
  ) {
    throw new Error(
      'INVALID_MEDIA_VALIDATION'
    );
  }

  assertValidationResult(
    input.validation
  );
}

function assertAuthoritativeValidatingMedia(
  value: unknown,
  requestedMediaId: string
): asserts value is Record<string, unknown> {
  if (!isPlainRecord(value)) {
    throw new Error(
      'INVALID_MEDIA_METADATA'
    );
  }

  if (
    value.schemaVersion !==
      MEDIA_SCHEMA_VERSION ||
    value.mediaId !==
      requestedMediaId ||
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
    !isValidTimestampMs(
      value.createdAtMs
    ) ||
    !isValidTimestampMs(
      value.updatedAtMs
    )
  ) {
    throw new Error(
      'INVALID_MEDIA_METADATA'
    );
  }

  let canonicalSourceObject:
    string;

  try {
    canonicalSourceObject =
      buildMediaIngestPath(
        value.ownerId,
        requestedMediaId,
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

  if (
    value.status !==
    MEDIA_VALIDATING_STATUS
  ) {
    throw new Error(
      'MEDIA_INVALID_VALIDATION_TRANSITION'
    );
  }
}

export async function transitionMediaContentValidation(
  input: TransitionMediaContentValidationInput
): Promise<MediaContentValidationTransitionResult> {
  assertTransitionInput(
    input
  );

  const validation =
    input.validation;

  const mediaRef =
    adminDb
      .collection(MEDIA_COLLECTION)
      .doc(input.mediaId);

  const transcodeWorkRef =
    adminDb
      .collection(
        MEDIA_TRANSCODE_WORK_COLLECTION
      )
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

      assertAuthoritativeValidatingMedia(
        media,
        input.mediaId
      );

      if (
        media.sourceObject !==
          input.sourceObject ||
        media.verifiedGeneration !==
          input.verifiedGeneration
      ) {
        throw new Error(
          'MEDIA_VALIDATION_MISMATCH'
        );
      }

      const now =
        Date.now();

      if (validation.valid === true) {
        const transcodeWork =
          buildMediaTranscodeWork(
            input.mediaId,
            input.sourceObject,
            input.verifiedGeneration
          );

        transaction.update(
          mediaRef,
          {
            status:
              MEDIA_TRANSCODE_PENDING_STATUS,

            validatedGeneration:
              input.verifiedGeneration,

            validationProbe:
              validation.probe,

            validationFailureReason:
              FieldValue.delete(),

            validatedAtMs:
              now,

            updatedAtMs:
              now,

            serverUpdatedAt:
              FieldValue.serverTimestamp(),
          }
        );

        transaction.create(
          transcodeWorkRef,
          transcodeWork
        );

        return {
          mediaId:
            input.mediaId,

          status:
            MEDIA_TRANSCODE_PENDING_STATUS,

          verifiedGeneration:
            input.verifiedGeneration,
        };
      }

      transaction.update(
        mediaRef,
        {
          status:
            MEDIA_REJECTED_STATUS,

          validatedGeneration:
            input.verifiedGeneration,

          validationFailureReason:
            validation.reason,

          validationProbe:
            FieldValue.delete(),

          validatedAtMs:
            now,

          updatedAtMs:
            now,

          serverUpdatedAt:
            FieldValue.serverTimestamp(),
        }
      );

      return {
        mediaId:
          input.mediaId,

        status:
          MEDIA_REJECTED_STATUS,

        verifiedGeneration:
          input.verifiedGeneration,
      };
    }
  );
}
