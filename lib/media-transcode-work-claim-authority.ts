import 'server-only';

import {
  randomUUID,
} from 'node:crypto';

import {
  adminDb,
} from '@/lib/firebase-admin';

import {
  buildMediaTranscodeWork,
  MEDIA_TRANSCODE_WORK_TYPE,
  type MediaTranscodeWork,
} from '@/lib/media-transcode-work-authority';

const MEDIA_TRANSCODE_WORK_COLLECTION =
  'mediaTranscodeWork';

const MEDIA_TRANSCODE_WORK_CLAIM_COLLECTION =
  'mediaTranscodeWorkClaims';

const MEDIA_TRANSCODE_WORK_LEASE_MS =
  120_000;

export type MediaTranscodeWorkClaim = {
  claimId: string;
  workId: string;
  mediaId: string;
  workType: typeof MEDIA_TRANSCODE_WORK_TYPE;
  sourceObject: string;
  verifiedGeneration: string;
  claimedAtMs: number;
  leaseExpiresAtMs: number;
};

function invalidWork(): never {
  throw new Error(
    'INVALID_MEDIA_TRANSCODE_WORK'
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

function isSafeTimestamp(
  value: unknown
): value is number {
  return (
    Number.isSafeInteger(value) &&
    (value as number) >= 0
  );
}

function readAuthoritativeWork(
  mediaId: string,
  value: unknown
): MediaTranscodeWork {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    return invalidWork();
  }

  const candidate =
    value as Record<string, unknown>;

  if (
    candidate.workId !== mediaId ||
    candidate.mediaId !== mediaId ||
    candidate.workType !==
      MEDIA_TRANSCODE_WORK_TYPE ||
    !isCanonicalNonEmptyString(
      candidate.sourceObject
    ) ||
    !isCanonicalNonEmptyString(
      candidate.verifiedGeneration
    )
  ) {
    return invalidWork();
  }

  const work =
    buildMediaTranscodeWork(
      mediaId,
      candidate.sourceObject,
      candidate.verifiedGeneration
    );

  if (
    work.workId !== candidate.workId ||
    work.mediaId !== candidate.mediaId ||
    work.workType !== candidate.workType
  ) {
    return invalidWork();
  }

  return work;
}

function readClaim(
  mediaId: string,
  value: unknown
): MediaTranscodeWorkClaim {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    return invalidWork();
  }

  const candidate =
    value as Record<string, unknown>;

  if (
    !isCanonicalNonEmptyString(
      candidate.claimId
    ) ||
    candidate.workId !== mediaId ||
    candidate.mediaId !== mediaId ||
    candidate.workType !==
      MEDIA_TRANSCODE_WORK_TYPE ||
    !isCanonicalNonEmptyString(
      candidate.sourceObject
    ) ||
    !isCanonicalNonEmptyString(
      candidate.verifiedGeneration
    ) ||
    !isSafeTimestamp(
      candidate.claimedAtMs
    ) ||
    !isSafeTimestamp(
      candidate.leaseExpiresAtMs
    ) ||
    candidate.leaseExpiresAtMs <=
      candidate.claimedAtMs
  ) {
    return invalidWork();
  }

  return candidate as
    MediaTranscodeWorkClaim;
}

function claimMatchesWork(
  claim: MediaTranscodeWorkClaim,
  work: MediaTranscodeWork
): boolean {
  return (
    claim.workId === work.workId &&
    claim.mediaId === work.mediaId &&
    claim.workType === work.workType &&
    claim.sourceObject ===
      work.sourceObject &&
    claim.verifiedGeneration ===
      work.verifiedGeneration
  );
}

function assertNowMs(
  nowMs: number
): void {
  if (
    !isSafeTimestamp(nowMs) ||
    !Number.isSafeInteger(
      nowMs +
        MEDIA_TRANSCODE_WORK_LEASE_MS
    )
  ) {
    throw new Error(
      'INVALID_MEDIA_TRANSCODE_CLAIM_TIME'
    );
  }
}

function createClaim(
  work: MediaTranscodeWork,
  nowMs: number
): MediaTranscodeWorkClaim {
  return {
    claimId:
      randomUUID(),

    workId:
      work.workId,

    mediaId:
      work.mediaId,

    workType:
      work.workType,

    sourceObject:
      work.sourceObject,

    verifiedGeneration:
      work.verifiedGeneration,

    claimedAtMs:
      nowMs,

    leaseExpiresAtMs:
      nowMs +
        MEDIA_TRANSCODE_WORK_LEASE_MS,
  };
}

export async function claimMediaTranscodeWork(
  mediaId: string,
  nowMs: number
): Promise<MediaTranscodeWorkClaim | null> {
  assertNowMs(
    nowMs
  );

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
        await transaction.getAll(
          workRef,
          claimRef
        );

      if (!workSnapshot.exists) {
        return null;
      }

      const work =
        readAuthoritativeWork(
          mediaId,
          workSnapshot.data()
        );

      if (claimSnapshot.exists) {
        const existingClaim =
          readClaim(
            mediaId,
            claimSnapshot.data()
          );

        if (
          existingClaim.leaseExpiresAtMs >
          nowMs
        ) {
          return null;
        }
      }

      const claim =
        createClaim(
          work,
          nowMs
        );

      transaction.set(
        claimRef,
        claim
      );

      return claim;
    }
  );
}

export async function renewMediaTranscodeWorkClaim(
  mediaId: string,
  claimId: string,
  nowMs: number
): Promise<MediaTranscodeWorkClaim | null> {
  assertNowMs(
    nowMs
  );

  if (!isCanonicalNonEmptyString(claimId)) {
    throw new Error(
      'INVALID_MEDIA_TRANSCODE_CLAIM_ID'
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
        await transaction.getAll(
          workRef,
          claimRef
        );

      if (
        !workSnapshot.exists ||
        !claimSnapshot.exists
      ) {
        return null;
      }

      const work =
        readAuthoritativeWork(
          mediaId,
          workSnapshot.data()
        );

      const claim =
        readClaim(
          mediaId,
          claimSnapshot.data()
        );

      if (
        claim.claimId !== claimId ||
        claim.leaseExpiresAtMs <=
          nowMs ||
        !claimMatchesWork(
          claim,
          work
        )
      ) {
        return null;
      }

      const renewedClaim:
        MediaTranscodeWorkClaim = {
          ...claim,

          leaseExpiresAtMs:
            nowMs +
              MEDIA_TRANSCODE_WORK_LEASE_MS,
        };

      transaction.set(
        claimRef,
        renewedClaim
      );

      return renewedClaim;
    }
  );
}
