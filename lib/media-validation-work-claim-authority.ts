import 'server-only';

import {
  randomBytes,
} from 'node:crypto';

import {
  adminDb,
} from '@/lib/firebase-admin';

import {
  MEDIA_VALIDATION_WORK_TYPE,
  type MediaValidationWork,
} from '@/lib/media-validation-work-authority';

const MEDIA_VALIDATION_WORK_COLLECTION =
  'mediaValidationWork';

const MEDIA_VALIDATION_WORK_CLAIM_COLLECTION =
  'mediaValidationWorkClaims';

const MEDIA_VALIDATION_WORK_LEASE_MS =
  2 * 60 * 1000;

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

export type MediaValidationWorkClaim = {
  claimId: string;
  workId: string;
  mediaId: string;
  workType:
    typeof MEDIA_VALIDATION_WORK_TYPE;
  claimedAtMs: number;
  leaseExpiresAtMs: number;
};

function isRecord(
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

function parseMediaValidationWork(
  value: unknown,
  expectedMediaId: string
): MediaValidationWork {
  if (
    !isRecord(value) ||
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

function parseExistingClaim(
  value: unknown,
  expectedMediaId: string
): MediaValidationWorkClaim {
  if (
    !isRecord(value) ||
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

function assertValidNowMs(
  nowMs: number
): void {
  if (
    !Number.isSafeInteger(nowMs) ||
    nowMs < 0
  ) {
    throw new Error(
      'INVALID_MEDIA_VALIDATION_WORK_CLAIM_TIME'
    );
  }
}

function assertValidClaimId(
  claimId: string
): void {
  if (
    typeof claimId !== 'string' ||
    claimId.length === 0
  ) {
    throw new Error(
      'INVALID_MEDIA_VALIDATION_WORK_CLAIM_ID'
    );
  }
}

function createClaimId(): string {
  return randomBytes(32).toString(
    'base64url'
  );
}

export async function claimMediaValidationWork(
  mediaId: string,
  nowMs: number
): Promise<MediaValidationWorkClaim | null> {
  assertValidNowMs(
    nowMs
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

      if (!workSnapshot.exists) {
        return null;
      }

      const work =
        parseMediaValidationWork(
          workSnapshot.data(),
          mediaId
        );

      if (claimSnapshot.exists) {
        const existingClaim =
          parseExistingClaim(
            claimSnapshot.data(),
            mediaId
          );

        if (
          existingClaim.leaseExpiresAtMs >
          nowMs
        ) {
          return null;
        }
      }

      const claim: MediaValidationWorkClaim =
        {
          claimId:
            createClaimId(),

          workId:
            work.workId,

          mediaId:
            work.mediaId,

          workType:
            work.workType,

          claimedAtMs:
            nowMs,

          leaseExpiresAtMs:
            nowMs +
            MEDIA_VALIDATION_WORK_LEASE_MS,
        };

      transaction.set(
        claimRef,
        claim
      );

      return claim;
    }
  );
}

export async function renewMediaValidationWorkClaim(
  mediaId: string,
  claimId: string,
  nowMs: number
): Promise<MediaValidationWorkClaim | null> {
  assertValidClaimId(
    claimId
  );

  assertValidNowMs(
    nowMs
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
        return null;
      }

      const work =
        parseMediaValidationWork(
          workSnapshot.data(),
          mediaId
        );

      const existingClaim =
        parseExistingClaim(
          claimSnapshot.data(),
          mediaId
        );

      if (
        existingClaim.claimId !==
          claimId ||
        existingClaim.workId !==
          work.workId ||
        existingClaim.mediaId !==
          work.mediaId ||
        existingClaim.workType !==
          work.workType ||
        existingClaim.leaseExpiresAtMs <=
          nowMs
      ) {
        return null;
      }

      const renewedClaim:
        MediaValidationWorkClaim = {
          claimId:
            existingClaim.claimId,

          workId:
            existingClaim.workId,

          mediaId:
            existingClaim.mediaId,

          workType:
            existingClaim.workType,

          claimedAtMs:
            existingClaim.claimedAtMs,

          leaseExpiresAtMs:
            nowMs +
            MEDIA_VALIDATION_WORK_LEASE_MS,
        };

      transaction.set(
        claimRef,
        renewedClaim
      );

      return renewedClaim;
    }
  );
}