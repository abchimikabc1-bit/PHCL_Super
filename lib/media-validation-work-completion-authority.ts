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
  MEDIA_VALIDATION_WORK_TYPE,
  type MediaValidationWork,
} from '@/lib/media-validation-work-authority';

import type {
  MediaContentProbe,
  MediaContentValidationFailureReason,
  MediaContentValidationResult,
} from '@/lib/media-content-validation';

import {
  MEDIA_REJECTED_STATUS,
  MEDIA_TRANSCODE_PENDING_STATUS,
  type MediaContentValidationTransitionResult,
} from '@/lib/media-content-validation-transition-authority';

import {
  buildMediaTranscodeWork,
} from '@/lib/media-transcode-work-authority';

const MEDIA_COLLECTION =
  'media';

const MEDIA_VALIDATION_WORK_COLLECTION =
  'mediaValidationWork';

const MEDIA_VALIDATION_WORK_CLAIM_COLLECTION =
  'mediaValidationWorkClaims';

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

const MEDIA_VALIDATION_WORK_KEYS = [
  'workId',
  'mediaId',
  'workType',
] as const;

const MEDIA_VALIDATION_WORK_CLAIM_KEYS = [
  'claimId',
  'workId',
  'mediaId',
  'workType',
  'claimedAtMs',
  'leaseExpiresAtMs',
] as const;

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

type MediaValidationWorkClaim = {
  claimId: string;
  workId: string;
  mediaId: string;
  workType:
    typeof MEDIA_VALIDATION_WORK_TYPE;
  claimedAtMs: number;
  leaseExpiresAtMs: number;
};

export type CompleteMediaValidationWorkInput = {
  mediaId: string;
  claimId: string;
  sourceObject: string;
  verifiedGeneration: string;
  validation: MediaContentValidationResult;
  nowMs: number;
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

function hasExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[]
): boolean {
  const keys =
    Object.keys(value).sort();

  const sortedExpectedKeys =
    [...expectedKeys].sort();

  return (
    keys.length ===
      sortedExpectedKeys.length &&
    keys.every(
      (key, index) =>
        key ===
        sortedExpectedKeys[index]
    )
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
    !hasExactKeys(
      value,
      expectedKeys
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
    if (
      !hasExactKeys(
        value,
        [
          'valid',
          'probe',
        ]
      ) ||
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
    if (
      !hasExactKeys(
        value,
        [
          'valid',
          'reason',
        ]
      ) ||
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

function assertCompletionInput(
  input: CompleteMediaValidationWorkInput
): void {
  try {
    buildMediaIngestPath(
      'validation-completion',
      input.mediaId,
      'validation.mp4'
    );
  } catch {
    throw new Error(
      'INVALID_MEDIA_VALIDATION_WORK_COMPLETION'
    );
  }

  if (
    !isCanonicalNonEmptyString(
      input.claimId
    ) ||
    !isCanonicalNonEmptyString(
      input.sourceObject
    ) ||
    !isCanonicalNonEmptyString(
      input.verifiedGeneration
    ) ||
    !isValidTimestampMs(
      input.nowMs
    )
  ) {
    throw new Error(
      'INVALID_MEDIA_VALIDATION_WORK_COMPLETION'
    );
  }

  assertValidationResult(
    input.validation
  );
}

function assertReleaseInput(
  mediaId: string,
  claimId: string
): void {
  try {
    buildMediaIngestPath(
      'validation-release',
      mediaId,
      'validation.mp4'
    );
  } catch {
    throw new Error(
      'INVALID_MEDIA_VALIDATION_WORK_RELEASE'
    );
  }

  if (
    !isCanonicalNonEmptyString(
      claimId
    )
  ) {
    throw new Error(
      'INVALID_MEDIA_VALIDATION_WORK_RELEASE'
    );
  }
}

function parseMediaValidationWork(
  value: unknown,
  expectedMediaId: string
): MediaValidationWork {
  if (
    !isPlainRecord(value) ||
    !hasExactKeys(
      value,
      MEDIA_VALIDATION_WORK_KEYS
    ) ||
    typeof value.workId !== 'string' ||
    typeof value.mediaId !== 'string' ||
    value.workType !==
      MEDIA_VALIDATION_WORK_TYPE ||
    value.workId !==
      expectedMediaId ||
    value.mediaId !==
      expectedMediaId
  ) {
    throw new Error(
      'INVALID_MEDIA_VALIDATION_WORK'
    );
  }

  return {
    workId:
      value.workId,

    mediaId:
      value.mediaId,

    workType:
      MEDIA_VALIDATION_WORK_TYPE,
  };
}

function parseMediaValidationWorkClaim(
  value: unknown,
  expectedMediaId: string
): MediaValidationWorkClaim {
  if (
    !isPlainRecord(value) ||
    !hasExactKeys(
      value,
      MEDIA_VALIDATION_WORK_CLAIM_KEYS
    ) ||
    typeof value.claimId !== 'string' ||
    value.claimId.length === 0 ||
    typeof value.workId !== 'string' ||
    typeof value.mediaId !== 'string' ||
    value.workType !==
      MEDIA_VALIDATION_WORK_TYPE ||
    typeof value.claimedAtMs !== 'number' ||
    !Number.isSafeInteger(
      value.claimedAtMs
    ) ||
    typeof value.leaseExpiresAtMs !==
      'number' ||
    !Number.isSafeInteger(
      value.leaseExpiresAtMs
    ) ||
    value.claimedAtMs < 0 ||
    value.leaseExpiresAtMs <=
      value.claimedAtMs ||
    value.workId !==
      expectedMediaId ||
    value.mediaId !==
      expectedMediaId
  ) {
    throw new Error(
      'INVALID_MEDIA_VALIDATION_WORK_CLAIM'
    );
  }

  return {
    claimId:
      value.claimId,

    workId:
      value.workId,

    mediaId:
      value.mediaId,

    workType:
      MEDIA_VALIDATION_WORK_TYPE,

    claimedAtMs:
      value.claimedAtMs,

    leaseExpiresAtMs:
      value.leaseExpiresAtMs,
  };
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

export async function completeMediaValidationWork(
  input: CompleteMediaValidationWorkInput
): Promise<MediaContentValidationTransitionResult> {
  assertCompletionInput(
    input
  );

  const mediaRef =
    adminDb
      .collection(
        MEDIA_COLLECTION
      )
      .doc(input.mediaId);

  const workRef =
    adminDb
      .collection(
        MEDIA_VALIDATION_WORK_COLLECTION
      )
      .doc(input.mediaId);

  const claimRef =
    adminDb
      .collection(
        MEDIA_VALIDATION_WORK_CLAIM_COLLECTION
      )
      .doc(input.mediaId);

  const transcodeWorkRef =
    adminDb
      .collection(
        MEDIA_TRANSCODE_WORK_COLLECTION
      )
      .doc(input.mediaId);

  return adminDb.runTransaction(
    async (transaction) => {
      const [
        mediaSnapshot,
        workSnapshot,
        claimSnapshot,
      ] =
        await Promise.all([
          transaction.get(
            mediaRef
          ),

          transaction.get(
            workRef
          ),

          transaction.get(
            claimRef
          ),
        ]);

      if (!mediaSnapshot.exists) {
        throw new Error(
          'MEDIA_NOT_FOUND'
        );
      }

      if (!workSnapshot.exists) {
        throw new Error(
          'MEDIA_VALIDATION_WORK_NOT_FOUND'
        );
      }

      if (!claimSnapshot.exists) {
        throw new Error(
          'MEDIA_VALIDATION_WORK_CLAIM_NOT_FOUND'
        );
      }

      const media =
        mediaSnapshot.data();

      assertAuthoritativeValidatingMedia(
        media,
        input.mediaId
      );

      parseMediaValidationWork(
        workSnapshot.data(),
        input.mediaId
      );

      const claim =
        parseMediaValidationWorkClaim(
          claimSnapshot.data(),
          input.mediaId
        );

      if (
        claim.claimId !==
        input.claimId
      ) {
        throw new Error(
          'MEDIA_VALIDATION_WORK_CLAIM_MISMATCH'
        );
      }

      if (
        claim.leaseExpiresAtMs <=
        input.nowMs
      ) {
        throw new Error(
          'MEDIA_VALIDATION_WORK_CLAIM_EXPIRED'
        );
      }

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

      if (input.validation.valid === true) {
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
              input.validation.probe,

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

        transaction.delete(
          workRef
        );

        transaction.delete(
          claimRef
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
            input.validation.reason,

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

      transaction.delete(
        workRef
      );

      transaction.delete(
        claimRef
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

export async function releaseMediaValidationWorkClaim(
  mediaId: string,
  claimId: string
): Promise<boolean> {
  assertReleaseInput(
    mediaId,
    claimId
  );

  const workRef =
    adminDb
      .collection(
        MEDIA_VALIDATION_WORK_COLLECTION
      )
      .doc(mediaId);

  const claimRef =
    adminDb
      .collection(
        MEDIA_VALIDATION_WORK_CLAIM_COLLECTION
      )
      .doc(mediaId);

  return adminDb.runTransaction(
    async (transaction) => {
      const [
        workSnapshot,
        claimSnapshot,
      ] =
        await Promise.all([
          transaction.get(
            workRef
          ),

          transaction.get(
            claimRef
          ),
        ]);

      if (
        !workSnapshot.exists ||
        !claimSnapshot.exists
      ) {
        return false;
      }

      parseMediaValidationWork(
        workSnapshot.data(),
        mediaId
      );

      const claim =
        parseMediaValidationWorkClaim(
          claimSnapshot.data(),
          mediaId
        );

      if (
        claim.claimId !==
        claimId
      ) {
        return false;
      }

      transaction.delete(
        claimRef
      );

      return true;
    }
  );
}
