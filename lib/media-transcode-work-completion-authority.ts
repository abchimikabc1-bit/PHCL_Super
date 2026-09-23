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
  MEDIA_TRANSCODE_PENDING_STATUS,
} from '@/lib/media-content-validation-transition-authority';

import {
  MEDIA_TRANSCODE_WORK_TYPE,
  type MediaTranscodeWork,
} from '@/lib/media-transcode-work-authority';

import type {
  MediaTranscodeWorkClaim,
} from '@/lib/media-transcode-work-claim-authority';

const MEDIA_COLLECTION =
  'media';

const MEDIA_TRANSCODE_WORK_COLLECTION =
  'mediaTranscodeWork';

const MEDIA_TRANSCODE_WORK_CLAIM_COLLECTION =
  'mediaTranscodeWorkClaims';

const MEDIA_SCHEMA_VERSION =
  2;

const MEDIA_CONTENT_TYPE =
  'video/mp4';

const MAX_MEDIA_SIZE_BYTES =
  524_288_000;

const TRANSCODE_WORK_KEYS = [
  'workId',
  'mediaId',
  'workType',
  'sourceObject',
  'verifiedGeneration',
] as const;

const TRANSCODE_CLAIM_KEYS = [
  'claimId',
  'workId',
  'mediaId',
  'workType',
  'sourceObject',
  'verifiedGeneration',
  'claimedAtMs',
  'leaseExpiresAtMs',
] as const;

const TRANSCODER_JOB_NAME_PATTERN =
  /^projects\/([a-z][a-z0-9-]{4,28}[a-z0-9]|[1-9][0-9]{5,19})\/locations\/[a-z][a-z0-9-]{0,62}\/jobs\/[A-Za-z0-9_-]+$/;

export const MEDIA_TRANSCODING_STATUS =
  'TRANSCODING' as const;

export type CompleteMediaTranscodeWorkInput = {
  mediaId: string;
  claimId: string;
  sourceObject: string;
  verifiedGeneration: string;
  transcoderJobName: string;
  nowMs: number;
};

export type MediaTranscodeWorkCompletionResult = {
  mediaId: string;
  status: typeof MEDIA_TRANSCODING_STATUS;
  verifiedGeneration: string;
  transcoderJobName: string;
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

function assertMediaId(
  mediaId: string,
  errorCode: string
): void {
  try {
    buildMediaIngestPath(
      'transcode-completion',
      mediaId,
      'source.mp4'
    );
  } catch {
    throw new Error(
      errorCode
    );
  }
}

function assertCompletionInput(
  input: CompleteMediaTranscodeWorkInput
): void {
  assertMediaId(
    input.mediaId,
    'INVALID_MEDIA_TRANSCODE_WORK_COMPLETION'
  );

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
    !isCanonicalNonEmptyString(
      input.transcoderJobName
    ) ||
    !TRANSCODER_JOB_NAME_PATTERN.test(
      input.transcoderJobName
    ) ||
    !isValidTimestampMs(
      input.nowMs
    )
  ) {
    throw new Error(
      'INVALID_MEDIA_TRANSCODE_WORK_COMPLETION'
    );
  }
}

function parseWork(
  value: unknown,
  expectedMediaId: string
): MediaTranscodeWork {
  if (
    !isPlainRecord(value) ||
    !hasExactKeys(
      value,
      TRANSCODE_WORK_KEYS
    ) ||
    value.workId !== expectedMediaId ||
    value.mediaId !== expectedMediaId ||
    value.workType !==
      MEDIA_TRANSCODE_WORK_TYPE ||
    !isCanonicalNonEmptyString(
      value.sourceObject
    ) ||
    !isCanonicalNonEmptyString(
      value.verifiedGeneration
    )
  ) {
    throw new Error(
      'INVALID_MEDIA_TRANSCODE_WORK'
    );
  }

  return {
    workId:
      expectedMediaId,
    mediaId:
      expectedMediaId,
    workType:
      MEDIA_TRANSCODE_WORK_TYPE,
    sourceObject:
      value.sourceObject,
    verifiedGeneration:
      value.verifiedGeneration,
  };
}

function parseClaim(
  value: unknown,
  expectedMediaId: string
): MediaTranscodeWorkClaim {
  if (
    !isPlainRecord(value) ||
    !hasExactKeys(
      value,
      TRANSCODE_CLAIM_KEYS
    ) ||
    !isCanonicalNonEmptyString(
      value.claimId
    ) ||
    value.workId !== expectedMediaId ||
    value.mediaId !== expectedMediaId ||
    value.workType !==
      MEDIA_TRANSCODE_WORK_TYPE ||
    !isCanonicalNonEmptyString(
      value.sourceObject
    ) ||
    !isCanonicalNonEmptyString(
      value.verifiedGeneration
    ) ||
    !isValidTimestampMs(
      value.claimedAtMs
    ) ||
    !isValidTimestampMs(
      value.leaseExpiresAtMs
    ) ||
    value.leaseExpiresAtMs <=
      value.claimedAtMs
  ) {
    throw new Error(
      'INVALID_MEDIA_TRANSCODE_WORK_CLAIM'
    );
  }

  return {
    claimId:
      value.claimId,
    workId:
      expectedMediaId,
    mediaId:
      expectedMediaId,
    workType:
      MEDIA_TRANSCODE_WORK_TYPE,
    sourceObject:
      value.sourceObject,
    verifiedGeneration:
      value.verifiedGeneration,
    claimedAtMs:
      value.claimedAtMs,
    leaseExpiresAtMs:
      value.leaseExpiresAtMs,
  };
}

function assertAuthoritativePendingMedia(
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
    value.validatedGeneration !==
      value.verifiedGeneration ||
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
    MEDIA_TRANSCODE_PENDING_STATUS
  ) {
    throw new Error(
      'MEDIA_INVALID_TRANSCODE_TRANSITION'
    );
  }
}

function identitiesMatch(
  media: Record<string, unknown>,
  work: MediaTranscodeWork,
  claim: MediaTranscodeWorkClaim,
  input: CompleteMediaTranscodeWorkInput
): boolean {
  return (
    media.sourceObject ===
      input.sourceObject &&
    media.verifiedGeneration ===
      input.verifiedGeneration &&
    work.sourceObject ===
      input.sourceObject &&
    work.verifiedGeneration ===
      input.verifiedGeneration &&
    claim.sourceObject ===
      input.sourceObject &&
    claim.verifiedGeneration ===
      input.verifiedGeneration
  );
}

export async function completeMediaTranscodeWork(
  input: CompleteMediaTranscodeWorkInput
): Promise<MediaTranscodeWorkCompletionResult> {
  assertCompletionInput(
    input
  );

  const mediaRef =
    adminDb
      .collection(MEDIA_COLLECTION)
      .doc(input.mediaId);

  const workRef =
    adminDb
      .collection(
        MEDIA_TRANSCODE_WORK_COLLECTION
      )
      .doc(input.mediaId);

  const claimRef =
    adminDb
      .collection(
        MEDIA_TRANSCODE_WORK_CLAIM_COLLECTION
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
          transaction.get(mediaRef),
          transaction.get(workRef),
          transaction.get(claimRef),
        ]);

      if (!mediaSnapshot.exists) {
        throw new Error(
          'MEDIA_NOT_FOUND'
        );
      }

      if (!workSnapshot.exists) {
        throw new Error(
          'MEDIA_TRANSCODE_WORK_NOT_FOUND'
        );
      }

      if (!claimSnapshot.exists) {
        throw new Error(
          'MEDIA_TRANSCODE_WORK_CLAIM_NOT_FOUND'
        );
      }

      const media =
        mediaSnapshot.data();

      assertAuthoritativePendingMedia(
        media,
        input.mediaId
      );

      const work =
        parseWork(
          workSnapshot.data(),
          input.mediaId
        );

      const claim =
        parseClaim(
          claimSnapshot.data(),
          input.mediaId
        );

      if (
        claim.claimId !==
        input.claimId
      ) {
        throw new Error(
          'MEDIA_TRANSCODE_WORK_CLAIM_MISMATCH'
        );
      }

      if (
        claim.leaseExpiresAtMs <=
        input.nowMs
      ) {
        throw new Error(
          'MEDIA_TRANSCODE_WORK_CLAIM_EXPIRED'
        );
      }

      if (
        !identitiesMatch(
          media,
          work,
          claim,
          input
        )
      ) {
        throw new Error(
          'MEDIA_TRANSCODE_MISMATCH'
        );
      }

      transaction.update(
        mediaRef,
        {
          status:
            MEDIA_TRANSCODING_STATUS,

          transcoderJobName:
            input.transcoderJobName,

          transcodeSubmittedGeneration:
            input.verifiedGeneration,

          transcodeSubmittedAtMs:
            input.nowMs,

          updatedAtMs:
            input.nowMs,

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
          MEDIA_TRANSCODING_STATUS,
        verifiedGeneration:
          input.verifiedGeneration,
        transcoderJobName:
          input.transcoderJobName,
      };
    }
  );
}

export async function releaseMediaTranscodeWorkClaim(
  mediaId: string,
  claimId: string
): Promise<boolean> {
  assertMediaId(
    mediaId,
    'INVALID_MEDIA_TRANSCODE_WORK_RELEASE'
  );

  if (
    !isCanonicalNonEmptyString(
      claimId
    )
  ) {
    throw new Error(
      'INVALID_MEDIA_TRANSCODE_WORK_RELEASE'
    );
  }

  const workRef =
    adminDb
      .collection(
        MEDIA_TRANSCODE_WORK_COLLECTION
      )
      .doc(mediaId);

  const claimRef =
    adminDb
      .collection(
        MEDIA_TRANSCODE_WORK_CLAIM_COLLECTION
      )
      .doc(mediaId);

  return adminDb.runTransaction(
    async (transaction) => {
      const [
        workSnapshot,
        claimSnapshot,
      ] =
        await Promise.all([
          transaction.get(workRef),
          transaction.get(claimRef),
        ]);

      if (
        !workSnapshot.exists ||
        !claimSnapshot.exists
      ) {
        return false;
      }

      const work =
        parseWork(
          workSnapshot.data(),
          mediaId
        );

      const claim =
        parseClaim(
          claimSnapshot.data(),
          mediaId
        );

      if (
        claim.claimId !== claimId ||
        claim.sourceObject !==
          work.sourceObject ||
        claim.verifiedGeneration !==
          work.verifiedGeneration
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
