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
  buildMediaValidationWork,
} from '@/lib/media-validation-work-authority';

const MEDIA_COLLECTION =
  'media';

const MEDIA_VALIDATION_WORK_COLLECTION =
  'mediaValidationWork';

const MEDIA_SCHEMA_VERSION =
  2;

const MEDIA_CONTENT_TYPE =
  'video/mp4';

const MAX_MEDIA_SIZE_BYTES =
  524_288_000;

const MEDIA_UPLOAD_STATUS =
  'UPLOADING';

export const MEDIA_VALIDATING_STATUS =
  'VALIDATING' as const;

export type MediaValidatingStatus =
  typeof MEDIA_VALIDATING_STATUS;

export type TransitionVerifiedMediaInput = {
  mediaId: string;
  sourceObject: string;
  generation: string;
};

export type VerifiedMediaTransitionResult = {
  mediaId: string;
  status: MediaValidatingStatus;
  verifiedGeneration: string;
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

function isValidTimestampMs(
  value: unknown
): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}

function assertValidVerificationInput(
  input: TransitionVerifiedMediaInput
): void {
  try {
    buildMediaIngestPath(
      'verification',
      input.mediaId,
      'verification.mp4'
    );
  } catch {
    throw new Error(
      'INVALID_MEDIA_VERIFICATION'
    );
  }

  if (
    typeof input.sourceObject !==
      'string' ||
    input.sourceObject.length === 0 ||
    input.sourceObject.trim() !==
      input.sourceObject ||
    typeof input.generation !==
      'string' ||
    input.generation.length === 0 ||
    input.generation.trim() !==
      input.generation
  ) {
    throw new Error(
      'INVALID_MEDIA_VERIFICATION'
    );
  }
}

function assertAuthoritativeUploadingMedia(
  value: unknown,
  requestedMediaId: string
): asserts value is Record<
  string,
  unknown
> {
  if (!isPlainRecord(value)) {
    throw new Error(
      'INVALID_MEDIA_METADATA'
    );
  }

  if (
    value.schemaVersion !==
      MEDIA_SCHEMA_VERSION ||
    typeof value.mediaId !==
      'string' ||
    value.mediaId !==
      requestedMediaId ||
    typeof value.ownerId !==
      'string' ||
    typeof value.sourceObject !==
      'string' ||
    typeof value.sourceFileName !==
      'string' ||
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
        value.mediaId,
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
    MEDIA_UPLOAD_STATUS
  ) {
    throw new Error(
      'MEDIA_INVALID_TRANSITION'
    );
  }
}

export async function transitionVerifiedMediaToValidating(
  input: TransitionVerifiedMediaInput
): Promise<VerifiedMediaTransitionResult> {
  assertValidVerificationInput(
    input
  );

  const mediaRef =
    adminDb
      .collection(MEDIA_COLLECTION)
      .doc(input.mediaId);

  const validationWork =
    buildMediaValidationWork(
      input.mediaId
    );

  const validationWorkRef =
    adminDb
      .collection(
        MEDIA_VALIDATION_WORK_COLLECTION
      )
      .doc(validationWork.workId);

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

      assertAuthoritativeUploadingMedia(
        media,
        input.mediaId
      );

      if (
        media.sourceObject !==
        input.sourceObject
      ) {
        throw new Error(
          'MEDIA_VERIFICATION_MISMATCH'
        );
      }

      const now =
        Date.now();

      transaction.update(
        mediaRef,
        {
          status:
            MEDIA_VALIDATING_STATUS,

          verifiedGeneration:
            input.generation,

          updatedAtMs:
            now,

          serverUpdatedAt:
            FieldValue.serverTimestamp(),
        }
      );

      transaction.create(
        validationWorkRef,
        validationWork
      );

      return {
        mediaId:
          input.mediaId,

        status:
          MEDIA_VALIDATING_STATUS,

        verifiedGeneration:
          input.generation,
      };
    }
  );
}